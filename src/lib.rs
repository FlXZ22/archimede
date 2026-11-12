use axum::{extract::Query, http::StatusCode, routing::get, Json, Router};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    sync::{Mutex, OnceLock},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Question {
    pub id: String,
    pub number: u32,
    pub images: Vec<String>,
    pub text: String,
    pub topic: String,
    pub correct: Option<String>,
    pub source_page: u32,
}
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Exam {
    pub id: String,
    pub year: u32,
    pub variant: String,
    pub kind: String,
    pub title: String,
    pub minutes: u32,
    pub source_url: String,
    pub pdf: String,
    pub solution_pdf: Option<String>,
    pub questions: Vec<Question>,
}
#[derive(Deserialize)]
struct Corpus {
    exams: Vec<Exam>,
    issues: Vec<Value>,
}
static DB: OnceLock<Mutex<Connection>> = OnceLock::new();
fn db() -> &'static Mutex<Connection> {
    DB.get_or_init(|| {
        let connection = Connection::open_in_memory().expect("question database");
        connection.execute_batch(
            "CREATE TABLE exams(id TEXT PRIMARY KEY, data TEXT NOT NULL);
             CREATE TABLE questions(id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, data TEXT NOT NULL);"
        ).expect("question database schema");
        let corpus: Corpus = serde_json::from_str(include_str!("../data/corpus.json")).expect("embedded corpus");
        assert!(corpus.issues.is_empty(), "Unresolved corpus issues");
        let transaction = connection.unchecked_transaction().unwrap();
        for mut exam in corpus.exams {
            let rule = exam_rules(&exam.id);
            assert_eq!(u64::from(exam.minutes), rule["minutes"].as_u64().unwrap(), "Corpus duration differs from verified rules");
            assert_eq!(exam.questions.len() as u64, rule["question_count"].as_u64().unwrap());
            for question in &mut exam.questions {
                assert!(question.correct.as_deref().is_some_and(|answer| ["A", "B", "C", "D", "E"].contains(&answer)), "Invalid answer key");
                question.topic = topic(question);
                transaction.execute("INSERT INTO questions VALUES(?1,?2,?3)", params![question.id, exam.id, serde_json::to_string(question).unwrap()]).unwrap();
            }
            transaction.execute("INSERT INTO exams VALUES(?1,?2)", params![exam.id, serde_json::to_string(&exam).unwrap()]).unwrap();
        }
        transaction.commit().unwrap();
        Mutex::new(connection)
    })
}
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}
fn topic(q: &Question) -> String {
    if q.id.starts_with("2025-gara-1-") {
        let labels = [
            "Algebra",
            "Algebra",
            "Teoria dei numeri",
            "Combinatoria",
            "Algebra",
            "Logica",
            "Geometria",
            "Combinatoria",
            "Algebra",
            "Geometria",
            "Teoria dei numeri",
            "Combinatoria",
            "Combinatoria",
            "Geometria",
            "Combinatoria",
            "Geometria",
        ];
        if let Some(t) = labels.get(q.number.saturating_sub(1) as usize) {
            return t.to_string();
        }
    }
    let t = q.text.to_lowercase();
    if t.contains("probabil") || t.contains("equiprobab") {
        return "Probabilità".into();
    }
    if t.contains("cavalier") || t.contains("furfant") || t.contains("bugiard") {
        return "Logica".into();
    }
    if [
        "triangol",
        "circonfer",
        "rettangol",
        "geometr",
        "angol",
        "quadrilater",
        "raggio",
        "pentagon",
        "esagon",
        "poligon",
        "perimetro",
        "cm2",
        "cm²",
        "m2",
        "sfera",
        "quadrato ab",
        "lati del quadrato",
        "cubo",
    ]
    .iter()
    .any(|w| t.contains(w))
    {
        return "Geometria".into();
    }
    if [
        "modi",
        "anagramm",
        "permutaz",
        "combinaz",
        "caramell",
        "configuraz",
    ]
    .iter()
    .any(|w| t.contains(w))
    {
        return "Combinatoria".into();
    }
    if [
        "divisib",
        "divisor",
        "primi",
        "numero primo",
        "cifra",
        "numeri interi",
        "quadrati perfetti",
        "resto della",
    ]
    .iter()
    .any(|w| t.contains(w))
    {
        return "Teoria dei numeri".into();
    }
    match q.topic.as_str() {
        "Combinatoria e probabilità" => "Combinatoria".into(),
        "Algebra" | "Geometria" | "Teoria dei numeri" | "Logica" => q.topic.clone(),
        _ => "Algebra".into(),
    }
}
pub fn key(q: &Question) -> String {
    let before = q.text.split("(A)").next().unwrap_or(&q.text);
    let stem = before
        .split_once(|c: char| c == '.' || c == ')')
        .map(|(_, s)| s)
        .unwrap_or(before);
    let normalized: String = stem
        .chars()
        .filter(|c| !c.is_whitespace() && !c.is_control())
        .map(|c| if c == '−' { '-' } else { c })
        .flat_map(char::to_lowercase)
        .collect();
    let hash = Sha256::digest(normalized.as_bytes());
    format!("{:x}", hash)[..24].to_string()
}
fn all_exams() -> Vec<Exam> {
    let c = db().lock().unwrap();
    let mut st = c
        .prepare("SELECT data FROM exams ORDER BY id DESC")
        .unwrap();
    st.query_map([], |r| r.get::<_, String>(0))
        .unwrap()
        .map(|r| serde_json::from_str(&r.unwrap()).unwrap())
        .collect()
}
fn safe_question(q: &Question, e: &Exam) -> Value {
    json!({"id":q.id,"number":q.number,"images":q.images,"topic":q.topic,"key":key(q),"source_page":q.source_page,"pdf":e.pdf,"year":e.year,"source_title":e.title})
}
fn exam_rules(exam_id: &str) -> Value {
    static RULES: OnceLock<HashMap<String, Value>> = OnceLock::new();
    RULES
        .get_or_init(|| {
            let manifest: Value = serde_json::from_str(include_str!("../data/exam-rules.json"))
                .expect("verified edition rules");
            serde_json::from_value(manifest["exams"].clone()).expect("edition rule map")
        })
        .get(exam_id)
        .expect("every archived edition needs sourced rules")
        .clone()
}
fn catalog() -> Value {
    let es = all_exams();
    let exams:Vec<Value>=es.iter().map(|e|json!({"id":e.id,"year":e.year,"variant":e.variant,"kind":e.kind,"title":e.title,"minutes":e.minutes,"count":e.questions.len(),"pdf":e.pdf,"rules":exam_rules(&e.id)})).collect();
    let bank:Vec<Value>=es.iter().flat_map(|e|e.questions.iter().map(|q|json!({"id":q.id,"key":key(q),"topic":q.topic,"year":e.year,"canonical":e.id.ends_with("-1")}))).collect();
    json!({"exams":exams,"bank":bank,"total":bank.len(),"topics":["Algebra","Geometria","Teoria dei numeri","Combinatoria","Probabilità","Logica"],"source":"https://olimpiadi.dm.unibo.it/le-gare/giochi-di-archimede/"})
}
#[derive(Deserialize, Default)]
pub struct StartInput {
    pub exam_id: Option<String>,
    pub question_ids: Option<Vec<String>>,
    pub minutes: Option<u32>,
    pub title: Option<String>,
    pub practice: Option<bool>,
}
fn start(input: StartInput) -> Result<Value, String> {
    let exam_id = input.exam_id.clone();
    let es = all_exams();
    let (title, minutes, selected, rules, fidelity) = if let Some(eid) = input.exam_id {
        let e = es.iter().find(|e| e.id == eid).ok_or("Prova non trovata")?;
        let rules = exam_rules(&e.id);
        let official_minutes = rules["minutes"].as_u64().unwrap() as u32;
        let practice = input.practice.unwrap_or(false);
        if !practice
            && input
                .minutes
                .is_some_and(|minutes| minutes != official_minutes)
        {
            return Err(format!("Questa edizione prevede {official_minutes} minuti. Per un tempo diverso usa la modalità allenamento."));
        }
        (
            e.title.clone(),
            if practice {
                input.minutes.unwrap_or(official_minutes)
            } else {
                official_minutes
            },
            e.questions
                .iter()
                .map(|q| safe_question(q, e))
                .collect::<Vec<_>>(),
            rules,
            if practice { "practice" } else { "official" },
        )
    } else {
        let ids = input.question_ids.ok_or("Scegli almeno un quesito")?;
        if ids.is_empty() || ids.len() > 25 {
            return Err("Sono ammessi da 1 a 25 quesiti".into());
        }
        let mut seen = HashSet::new();
        let mut selected = Vec::new();
        for id in ids {
            if !seen.insert(id.clone()) {
                return Err("Quesito duplicato".into());
            }
            let (q, e) = es
                .iter()
                .find_map(|e| e.questions.iter().find(|q| q.id == id).map(|q| (q, e)))
                .ok_or("Quesito non trovato")?;
            selected.push(safe_question(q, e));
        }
        (
            input
                .title
                .unwrap_or_else(|| "Allenamento mirato".into())
                .chars()
                .take(120)
                .collect(),
            input.minutes.unwrap_or(25),
            selected,
            Value::Null,
            "practice",
        )
    };
    if !(1..=180).contains(&minutes) {
        return Err("La durata deve essere tra 1 e 180 minuti".into());
    }
    let started = now();
    Ok(
        json!({"id":format!("{:032x}",rand::random::<u128>()),"title":title,"exam_id":exam_id,"started":started,"deadline":started+u64::from(minutes)*60000,"minutes":minutes,"rules":rules,"fidelity":fidelity,"questions":selected,"answers":{},"notes":{},"times":{},"flags":[]}),
    )
}
#[derive(Deserialize, Default)]
pub struct GradeInput {
    pub question_ids: Vec<String>,
    pub answers: HashMap<String, String>,
}
fn grade(input: GradeInput) -> Result<Value, String> {
    if input.question_ids.is_empty() || input.question_ids.len() > 25 {
        return Err("Prova non valida".into());
    }
    let ids: HashSet<_> = input.question_ids.iter().collect();
    if ids.len() != input.question_ids.len() {
        return Err("Quesito duplicato".into());
    }
    if input
        .answers
        .iter()
        .any(|(id, v)| !ids.contains(id) || !["A", "B", "C", "D", "E"].contains(&v.as_str()))
    {
        return Err("Risposta non valida".into());
    }
    let es = all_exams();
    let mut review = Vec::new();
    let (mut correct, mut blank, mut score, mut maximum) = (0, 0, 0_u64, 0_u64);
    for id in input.question_ids {
        let (q, e) = es
            .iter()
            .find_map(|e| e.questions.iter().find(|q| q.id == id).map(|q| (q, e)))
            .ok_or("Quesito non trovato")?;
        let selected = input.answers.get(&id);
        let ok = selected == q.correct.as_ref();
        if ok {
            correct += 1
        } else if selected.is_none() {
            blank += 1
        };
        let scoring = exam_rules(&e.id)["scoring"].clone();
        maximum += scoring["correct"].as_u64().unwrap();
        score += scoring[if ok {
            "correct"
        } else if selected.is_none() {
            "blank"
        } else {
            "wrong"
        }]
        .as_u64()
        .unwrap();
        let mut r = safe_question(q, e);
        r["selected"] = json!(selected);
        r["correct"] = json!(q.correct);
        r["ok"] = json!(ok);
        r["solution_pdf"] = json!(e.solution_pdf);
        review.push(r);
    }
    Ok(
        json!({"correct":correct,"blank":blank,"wrong":review.len()-correct-blank,"score":score,"max":maximum,"review":review}),
    )
}
#[derive(Deserialize)]
struct Action {
    action: Option<String>,
}
async fn get_api(Query(q): Query<Action>) -> Result<Json<Value>, (StatusCode, String)> {
    match q.action.as_deref().unwrap_or("catalog") {
        "catalog" => Ok(Json(catalog())),
        _ => Err((StatusCode::NOT_FOUND, "Endpoint non trovato".into())),
    }
}
async fn post_api(
    Query(q): Query<Action>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let result = match q.action.as_deref() {
        Some("start") => serde_json::from_value(body)
            .map_err(|e| e.to_string())
            .and_then(start),
        Some("grade") => serde_json::from_value(body)
            .map_err(|e| e.to_string())
            .and_then(grade),
        _ => Err("Operazione non disponibile".into()),
    };
    result.map(Json).map_err(|e| (StatusCode::BAD_REQUEST, e))
}
pub fn api_router() -> Router {
    Router::new()
        .route("/api/v2", get(get_api).post(post_api))
        .route("/api/index", get(get_api).post(post_api))
        .layer(axum::extract::DefaultBodyLimit::max(64 * 1024))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn complete_catalog_no_answers() {
        let c = catalog();
        assert_eq!(c["total"], 2632);
        assert_eq!(c["exams"].as_array().unwrap().len(), 183);
        assert!(c["bank"]
            .as_array()
            .unwrap()
            .iter()
            .all(|q| q.get("correct").is_none()));
    }
    #[test]
    fn start_and_grade_validated() {
        let a = start(StartInput {
            exam_id: Some("2025-gara-1".into()),
            ..Default::default()
        })
        .unwrap();
        assert_eq!(a["questions"].as_array().unwrap().len(), 16);
        assert!(a["questions"]
            .as_array()
            .unwrap()
            .iter()
            .all(|q| q.get("correct").is_none()));
        let ids: Vec<String> = vec![
            "2025-gara-1-q1".into(),
            "2025-gara-1-q2".into(),
            "2025-gara-1-q3".into(),
        ];
        let mut ans = HashMap::new();
        ans.insert(ids[0].clone(), "C".into());
        ans.insert(ids[1].clone(), "A".into());
        let g = grade(GradeInput {
            question_ids: ids,
            answers: ans,
        })
        .unwrap();
        assert_eq!(g["score"], 6);
        assert_eq!(g["correct"], 1);
        assert_eq!(g["blank"], 1);
    }
    #[test]
    fn rejects_duplicates_and_foreign_answers() {
        assert!(grade(GradeInput {
            question_ids: vec!["x".into(), "x".into()],
            ..Default::default()
        })
        .is_err());
        let mut a = HashMap::new();
        a.insert("foreign".into(), "A".into());
        assert!(grade(GradeInput {
            question_ids: vec!["2025-gara-1-q1".into()],
            answers: a
        })
        .is_err());
    }
    #[test]
    fn classification_and_variant_dedup() {
        let es = all_exams();
        let base = es.iter().find(|e| e.id == "2016-gara-1").unwrap();
        let var = es.iter().find(|e| e.id == "2016-gara-2").unwrap();
        assert_eq!(key(&base.questions[1]), key(&var.questions[0]));
        let recent = es.iter().find(|e| e.id == "2025-gara-1").unwrap();
        assert_eq!(recent.questions[2].topic, "Teoria dei numeri");
    }
    #[test]
    fn distinct_math_operators_do_not_merge_questions() {
        let mut a = all_exams()[0].questions[0].clone();
        a.text = "1. Sia x = 2 + 3. Quanto vale x? (A) 5".into();
        let mut b = a.clone();
        b.text = "7. Sia x = 2 - 3. Quanto vale x? (A) 5".into();
        assert_ne!(key(&a), key(&b));
        b.text = "7. Sia x = 2 + 3. Quanto vale x? (A) 5".into();
        assert_eq!(key(&a), key(&b));
    }
    #[test]
    fn official_durations_are_locked_and_practice_is_explicit() {
        for (id, expected) in [
            ("2004-gara-1", 90),
            ("2009-gara-1", 120),
            ("2016-gara-1", 110),
            ("2019-gara-1", 110),
            ("2021-online-1", 60),
            ("2025-gara-1", 100),
        ] {
            let result = start(StartInput {
                exam_id: Some(id.into()),
                ..Default::default()
            })
            .unwrap();
            assert_eq!(result["minutes"], expected);
            assert_eq!(result["fidelity"], "official");
            assert_eq!(
                result["deadline"].as_u64().unwrap() - result["started"].as_u64().unwrap(),
                expected * 60000
            );
            assert!(result["rules"]["duration_verified"].as_bool().unwrap());
        }
        assert!(start(StartInput {
            exam_id: Some("2019-gara-1".into()),
            minutes: Some(25),
            ..Default::default()
        })
        .is_err());
        let practice = start(StartInput {
            exam_id: Some("2019-gara-1".into()),
            minutes: Some(25),
            practice: Some(true),
            ..Default::default()
        })
        .unwrap();
        assert_eq!(practice["minutes"], 25);
        assert_eq!(practice["fidelity"], "practice");
    }
}
