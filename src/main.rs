use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use rand::seq::SliceRandom;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
#[derive(Clone)]
struct App {
    db: Arc<Mutex<Connection>>,
}
#[derive(Serialize, Deserialize, Clone)]
struct Question {
    id: String,
    number: u32,
    images: Vec<String>,
    text: String,
    topic: String,
    correct: Option<String>,
    source_page: u32,
}
#[derive(Serialize, Deserialize, Clone)]
struct Exam {
    id: String,
    year: u32,
    variant: String,
    kind: String,
    title: String,
    minutes: u32,
    source_url: String,
    pdf: String,
    solution_pdf: Option<String>,
    questions: Vec<Question>,
}
#[derive(Deserialize)]
struct Corpus {
    exams: Vec<Exam>,
    issues: Vec<Value>,
}
type Err = (StatusCode, String);
fn error(s: impl ToString) -> Err {
    (StatusCode::BAD_REQUEST, s.to_string())
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}
fn init() -> Connection {
    let db = Connection::open("data/archimede.sqlite3").expect("database");
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS exams(id TEXT PRIMARY KEY, year INTEGER NOT NULL, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY, exam_id TEXT NOT NULL REFERENCES exams(id), data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, started INTEGER NOT NULL, deadline INTEGER NOT NULL, data TEXT NOT NULL, answers TEXT NOT NULL DEFAULT '{}', notes TEXT NOT NULL DEFAULT '{}', flags TEXT NOT NULL DEFAULT '[]', result TEXT);").unwrap();
    let corpus: Corpus = serde_json::from_str(
        &std::fs::read_to_string("data/corpus.json").expect("Run scripts/prepare.py first"),
    )
    .unwrap();
    assert!(
        corpus.issues.is_empty(),
        "Import blocked: unresolved corpus issues: {:?}",
        corpus.issues
    );
    let tx = db.unchecked_transaction().unwrap();
    for e in corpus.exams {
        assert!(e.questions.iter().all(|q| q.correct.is_some()));
        tx.execute(
            "INSERT OR REPLACE INTO exams VALUES(?1,?2,?3)",
            params![e.id, e.year, serde_json::to_string(&e).unwrap()],
        )
        .unwrap();
        for q in &e.questions {
            tx.execute(
                "INSERT OR REPLACE INTO questions VALUES(?1,?2,?3)",
                params![q.id, e.id, serde_json::to_string(q).unwrap()],
            )
            .unwrap();
        }
    }
    tx.commit().unwrap();
    db
}
async fn catalog(State(a): State<App>) -> Json<Value> {
    let db = a.db.lock().unwrap();
    let mut stmt = db
        .prepare("SELECT data FROM exams ORDER BY year DESC,id")
        .unwrap();
    let exams:Vec<Value>=stmt.query_map([],|r|r.get::<_,String>(0)).unwrap().map(|r|{let e:Exam=serde_json::from_str(&r.unwrap()).unwrap();json!({"id":e.id,"year":e.year,"variant":e.variant,"kind":e.kind,"title":e.title,"minutes":e.minutes,"count":e.questions.len(),"pdf":e.pdf,"source_url":e.source_url})}).collect();
    Json(
        json!({"exams":exams,"questions":db.query_row("SELECT COUNT(*) FROM questions",[],|r|r.get::<_,u32>(0)).unwrap()}),
    )
}
#[derive(Deserialize)]
struct Start {
    exam_id: Option<String>,
    count: Option<usize>,
    minutes: Option<u32>,
    topic: Option<String>,
}
fn public_attempt(
    id: &str,
    started: u64,
    deadline: u64,
    data: &str,
    answers: &str,
    notes: &str,
    flags: &str,
    result: Option<String>,
) -> Value {
    let mut v: Value = serde_json::from_str(data).unwrap();
    if result.is_none() {
        for q in v["questions"].as_array_mut().unwrap() {
            q.as_object_mut().unwrap().remove("correct");
        }
        v.as_object_mut().unwrap().remove("solution_pdf");
    }
    json!({"id":id,"started":started,"deadline":deadline,"server_now":now(),"exam":v,"answers":serde_json::from_str::<Value>(answers).unwrap(),"notes":serde_json::from_str::<Value>(notes).unwrap(),"flags":serde_json::from_str::<Value>(flags).unwrap(),"result":result.map(|s|serde_json::from_str::<Value>(&s).unwrap())})
}
async fn start(State(a): State<App>, Json(input): Json<Start>) -> Result<Json<Value>, Err> {
    let db = a.db.lock().unwrap();
    let mut exam = if let Some(eid) = input.exam_id {
        let s: String = db
            .query_row("SELECT data FROM exams WHERE id=?1", [eid], |r| r.get(0))
            .map_err(error)?;
        serde_json::from_str::<Exam>(&s).map_err(error)?
    } else {
        let mut st = db
            .prepare("SELECT data FROM questions WHERE exam_id LIKE '%-1'")
            .unwrap();
        let mut qs: Vec<Question> = st
            .query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .map(|r| serde_json::from_str(&r.unwrap()).unwrap())
            .filter(|q: &Question| {
                input
                    .topic
                    .as_ref()
                    .is_none_or(|t| t == "Tutti" || &q.topic == t)
            })
            .collect();
        qs.shuffle(&mut rand::rng());
        qs.truncate(input.count.unwrap_or(16).clamp(1, 25));
        if qs.is_empty() {
            return Err(error("Nessun quesito disponibile"));
        }
        Exam {
            id: "mix".into(),
            year: 0,
            variant: "mista".into(),
            kind: "allenamento".into(),
            title: "La tua sfida · Anni misti".into(),
            minutes: 100,
            source_url: "https://olimpiadi.dm.unibo.it/le-gare/giochi-di-archimede/".into(),
            pdf: "".into(),
            solution_pdf: None,
            questions: qs,
        }
    };
    exam.minutes = input.minutes.unwrap_or(exam.minutes).clamp(1, 180);
    let id = format!("{:032x}", rand::random::<u128>());
    let started = now();
    let deadline = started + u64::from(exam.minutes) * 60;
    let data = serde_json::to_string(&exam).unwrap();
    db.execute(
        "INSERT INTO attempts(id,started,deadline,data) VALUES(?1,?2,?3,?4)",
        params![id, started, deadline, data],
    )
    .map_err(error)?;
    Ok(Json(public_attempt(
        &id, started, deadline, &data, "{}", "{}", "[]", None,
    )))
}
async fn attempt(State(a): State<App>, Path(id): Path<String>) -> Result<Json<Value>, Err> {
    let db = a.db.lock().unwrap();
    db.query_row(
        "SELECT started,deadline,data,answers,notes,flags,result FROM attempts WHERE id=?1",
        [&id],
        |r| {
            Ok(public_attempt(
                &id,
                r.get(0)?,
                r.get(1)?,
                &r.get::<_, String>(2)?,
                &r.get::<_, String>(3)?,
                &r.get::<_, String>(4)?,
                &r.get::<_, String>(5)?,
                r.get(6)?,
            ))
        },
    )
    .map(Json)
    .map_err(error)
}
#[derive(Deserialize)]
struct Save {
    answers: HashMap<String, String>,
    notes: HashMap<String, String>,
    flags: Vec<String>,
}
async fn save(
    State(a): State<App>,
    Path(id): Path<String>,
    Json(s): Json<Save>,
) -> Result<Json<Value>, Err> {
    let db = a.db.lock().unwrap();
    let (data, deadline, result): (String, u64, Option<String>) = db
        .query_row(
            "SELECT data,deadline,result FROM attempts WHERE id=?1",
            [&id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(error)?;
    if result.is_some() || now() >= deadline {
        return Err(error("Prova conclusa o tempo scaduto"));
    }
    let e: Exam = serde_json::from_str(&data).unwrap();
    if s.answers.iter().any(|(k, v)| {
        !e.questions.iter().any(|q| &q.id == k) || !["A", "B", "C", "D", "E"].contains(&v.as_str())
    }) {
        return Err(error("Risposta non valida"));
    }
    db.execute(
        "UPDATE attempts SET answers=?2,notes=?3,flags=?4 WHERE id=?1",
        params![
            id,
            serde_json::to_string(&s.answers).unwrap(),
            serde_json::to_string(&s.notes).unwrap(),
            serde_json::to_string(&s.flags).unwrap()
        ],
    )
    .map_err(error)?;
    Ok(Json(json!({"saved":true})))
}
async fn finish(State(a): State<App>, Path(id): Path<String>) -> Result<Json<Value>, Err> {
    {
        let db = a.db.lock().unwrap();
        let (data, answers, old): (String, String, Option<String>) = db
            .query_row(
                "SELECT data,answers,result FROM attempts WHERE id=?1",
                [&id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(error)?;
        if old.is_none() {
            let e: Exam = serde_json::from_str(&data).unwrap();
            let ans: HashMap<String, String> = serde_json::from_str(&answers).unwrap();
            let mut correct = 0;
            let mut blank = 0;
            let mut topics: HashMap<String, [u32; 2]> = HashMap::new();
            let mut review = vec![];
            for q in &e.questions {
                let selected = ans.get(&q.id);
                let ok = selected == q.correct.as_ref();
                if ok {
                    correct += 1;
                } else if selected.is_none() {
                    blank += 1;
                }
                let t = topics.entry(q.topic.clone()).or_default();
                t[1] += 1;
                if ok {
                    t[0] += 1;
                }
                let (pdf, sol, title) = if q.id.starts_with(&e.id) && e.id != "mix" {
                    (e.pdf.clone(), e.solution_pdf.clone(), e.title.clone())
                } else {
                    let s:String=db.query_row("SELECT exams.data FROM exams JOIN questions ON exams.id=questions.exam_id WHERE questions.id=?1",[&q.id],|r|r.get(0)).map_err(error)?;
                    let source: Exam = serde_json::from_str(&s).unwrap();
                    (source.pdf, source.solution_pdf, source.title)
                };
                review.push(json!({"question":q,"selected":selected,"ok":ok,"pdf":pdf,"solution_pdf":sol,"source_title":title}));
            }
            let result = json!({"correct":correct,"blank":blank,"wrong":e.questions.len()-correct-blank,"score":correct*5+blank,"max":e.questions.len()*5,"topics":topics,"review":review,"finished":now()});
            db.execute(
                "UPDATE attempts SET result=?2 WHERE id=?1",
                params![id, result.to_string()],
            )
            .map_err(error)?;
        }
    }
    attempt(State(a), Path(id)).await
}
async fn history(State(a): State<App>) -> Json<Value> {
    let db = a.db.lock().unwrap();
    let mut st=db.prepare("SELECT id,started,data,result FROM attempts WHERE result IS NOT NULL ORDER BY started DESC LIMIT 30").unwrap();
    let rows:Vec<Value>=st.query_map([],|r|{let e:Exam=serde_json::from_str(&r.get::<_,String>(2)?).unwrap();Ok(json!({"id":r.get::<_,String>(0)?,"started":r.get::<_,u64>(1)?,"title":e.title,"result":serde_json::from_str::<Value>(&r.get::<_,String>(3)?).unwrap()}))}).unwrap().map(Result::unwrap).collect();
    Json(json!(rows))
}
#[tokio::main]
async fn main() {
    let a = App {
        db: Arc::new(Mutex::new(init())),
    };
    let app = Router::new()
        .route("/api/catalog", get(catalog))
        .route("/api/start", post(start))
        .route("/api/attempt/{id}", get(attempt).put(save))
        .route("/api/attempt/{id}/finish", post(finish))
        .route("/api/history", get(history))
        .nest_service(
            "/data/originals",
            tower_http::services::ServeDir::new("data/originals"),
        )
        .fallback_service(tower_http::services::ServeDir::new(
            if std::path::Path::new("dist/index.html").exists() {
                "dist"
            } else {
                "web"
            },
        ))
        .with_state(a)
        .merge(archimede::api_router());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8787")
        .await
        .expect("Porta 8787 occupata");
    println!("Archimede pronto: http://127.0.0.1:8787");
    axum::serve(listener, app).await.unwrap();
}
