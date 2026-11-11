import React, { useEffect, useState, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { request } from "./api.mjs";
import { sanitizeAnalyticsEvent } from "./privacy.mjs";
import {
  loadState,
  hydrateReferences,
  saveState,
  validateBackup,
  mergeBackup,
  initialState,
} from "./storage.mjs";
import {
  TOPICS,
  TOPIC_GUIDES,
  analyze,
  chooseQuestions,
  recommendations,
  dayKey,
} from "./learning.mjs";
import { TopicChart, TrendChart } from "./Charts.jsx";
import "./styles.css";
const routes = {
  dashboard: "Percorso",
  train: "Allenamento",
  archive: "Archivio",
  history: "Progressi",
  settings: "Il mio spazio",
};
const fmtDate = (t) =>
  new Date(t).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
function Icon({ name, ...props }) {
  const paths = {
    arrow: "M5 12h14m-6-6 6 6-6 6",
    book: "M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4Z",
    target: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5m-5 0 8-8m-4 0h4v4",
    clock: "M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    down: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 4l16 16M20 4 4 20",
    check: "m5 12 4 4 10-10",
    close: "M5 5l14 14M19 5 5 19",
    back: "m14 6-6 6 6 6",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}
function Button({ children, kind = "metal", ...props }) {
  return (
    <button className={`button ${kind}`} {...props}>
      {children}
    </button>
  );
}
function Formula({ topic }) {
  if (topic === "Algebra")
    return (
      <math>
        <msup>
          <mrow>
            <mo>(</mo>
            <mi>a</mi>
            <mo>+</mo>
            <mi>b</mi>
            <mo>)</mo>
          </mrow>
          <mn>2</mn>
        </msup>
        <mo>=</mo>
        <msup>
          <mi>a</mi>
          <mn>2</mn>
        </msup>
        <mo>+</mo>
        <mn>2</mn>
        <mi>a</mi>
        <mi>b</mi>
        <mo>+</mo>
        <msup>
          <mi>b</mi>
          <mn>2</mn>
        </msup>
      </math>
    );
  if (topic === "Geometria")
    return (
      <math>
        <msub>
          <mi>A</mi>
          <mi>△</mi>
        </msub>
        <mo>=</mo>
        <mfrac>
          <mrow>
            <mi>b</mi>
            <mo>·</mo>
            <mi>h</mi>
          </mrow>
          <mn>2</mn>
        </mfrac>
      </math>
    );
  if (topic === "Combinatoria")
    return (
      <math>
        <mi>C</mi>
        <mo>(</mo>
        <mi>n</mi>
        <mo>,</mo>
        <mi>k</mi>
        <mo>)</mo>
        <mo>=</mo>
        <mfrac>
          <mrow>
            <mi>n</mi>
            <mo>!</mo>
          </mrow>
          <mrow>
            <mi>k</mi>
            <mo>!</mo>
            <mo>(</mo>
            <mi>n</mi>
            <mo>−</mo>
            <mi>k</mi>
            <mo>)</mo>
            <mo>!</mo>
          </mrow>
        </mfrac>
      </math>
    );
  if (topic === "Probabilità")
    return (
      <math>
        <mi>P</mi>
        <mo>(</mo>
        <mo>¬</mo>
        <mi>E</mi>
        <mo>)</mo>
        <mo>=</mo>
        <mn>1</mn>
        <mo>−</mo>
        <mi>P</mi>
        <mo>(</mo>
        <mi>E</mi>
        <mo>)</mo>
      </math>
    );
  if (topic === "Logica")
    return (
      <math>
        <mo>¬</mo>
        <mo>(</mo>
        <mi>P</mi>
        <mo>∧</mo>
        <mi>Q</mi>
        <mo>)</mo>
        <mo>≡</mo>
        <mo>¬</mo>
        <mi>P</mi>
        <mo>∨</mo>
        <mo>¬</mo>
        <mi>Q</mi>
      </math>
    );
  return (
    <math>
      <mi>d</mi>
      <mo>(</mo>
      <mi>n</mi>
      <mo>)</mo>
      <mo>=</mo>
      <munderover>
        <mo>∏</mo>
        <mrow>
          <mi>i</mi>
          <mo>=</mo>
          <mn>1</mn>
        </mrow>
        <mi>r</mi>
      </munderover>
      <mo>(</mo>
      <msub>
        <mi>α</mi>
        <mi>i</mi>
      </msub>
      <mo>+</mo>
      <mn>1</mn>
      <mo>)</mo>
    </math>
  );
}
function QuestionImage({ q, onZoom }) {
  return (
    <div className="paper">
      {q.images.map((src, i) => (
        <button
          key={src}
          className="image-zoom"
          onClick={() => onZoom(src)}
          aria-label={`Ingrandisci il quesito ${q.number}, parte ${i + 1}`}
        >
          <img
            src={src}
            alt={`Testo, figure e opzioni del quesito originale ${q.number}`}
            loading="eager"
          />
        </button>
      ))}
      {q.id === "2001-gara-1-q13" && (
        <>
          <div className="supplement-options">
            <span>
              (A){" "}
              <math>
                <mn>2</mn>
                <mo>−</mo>
                <msqrt>
                  <mn>2</mn>
                </msqrt>
              </math>
            </span>
            <span>
              (B){" "}
              <math>
                <msqrt>
                  <mn>3</mn>
                </msqrt>
                <mo>−</mo>
                <msqrt>
                  <mn>2</mn>
                </msqrt>
              </math>
            </span>
            <span>
              (C){" "}
              <math>
                <mfrac>
                  <mn>1</mn>
                  <msqrt>
                    <mn>2</mn>
                  </msqrt>
                </mfrac>
              </math>
            </span>
            <span>(D) 1</span>
            <span>
              (E){" "}
              <math>
                <mfrac>
                  <mrow>
                    <msqrt>
                      <mn>2</mn>
                    </msqrt>
                    <mo>+</mo>
                    <msqrt>
                      <mn>3</mn>
                    </msqrt>
                  </mrow>
                  <mn>2</mn>
                </mfrac>
              </math>
            </span>
          </div>
          <p className="source-note">
            Opzioni recuperate dalla{" "}
            <a
              href="/data/originals/supplement-2001/bruni-2001.pdf#page=2"
              target="_blank"
              rel="noreferrer"
            >
              copia storica dell’Istituto Bruni
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  const dialog = useRef();
  useEffect(() => {
    const d = dialog.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} className="modal">
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Chiudi">
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [data, setData] = useState(null),
    [personal, setPersonal] = useState(initialState),
    [loaded, setLoaded] = useState(false),
    [view, setView] = useState("dashboard"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [fatal, setFatal] = useState(""),
    [saved, setSaved] = useState(true),
    [storageError, setStorageError] = useState(""),
    [resultId, setResultId] = useState(null),
    [zoom, setZoom] = useState(null);
  const finishing = useRef(false),
    stateRef = useRef(personal);
  stateRef.current = personal;
  useEffect(() => {
    Promise.all([request("catalog"), loadState()])
      .then(([c, p]) => {
        setData(c);
        setPersonal(hydrateReferences(p, c.bank));
        setLoaded(true);
      })
      .catch((e) => setFatal(e.message));
  }, []);
  useEffect(() => {
    if (!loaded) return;
    let current = true;
    setSaved(false);
    saveState(personal)
      .then(() => {
        if (current) {
          setSaved(true);
          setStorageError("");
        }
      })
      .catch((e) =>
        setStorageError(
          "Il browser non riesce a salvare i progressi. Esporta un backup e libera spazio prima di continuare.",
        ),
      );
    return () => {
      current = false;
    };
  }, [personal, loaded]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(t);
  }, [message]);
  const stats = useMemo(
    () => analyze(personal.sessions, personal.overrides),
    [personal.sessions, personal.overrides],
  );
  function navigate(v) {
    setView(v);
    setResultId(null);
    window.scrollTo(0, 0);
  }
  async function start(config) {
    if (busy) return;
    if (personal.active) {
      navigate("quiz");
      return;
    }
    try {
      setBusy(true);
      const a = await request("start", config);
      a.clockOffset = a.started - Date.now();
      setPersonal((p) => ({ ...p, active: a }));
      setView("quiz");
      setResultId(null);
      window.scrollTo(0, 0);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function trainPlan(plan) {
    if (plan.disabled) return;
    const qs = chooseQuestions(data.bank, personal.sessions, {
      mode: plan.mode,
      topic: plan.topic,
      count: plan.count,
      overrides: personal.overrides,
    });
    if (!qs.length) {
      setMessage(
        "Non ci sono nuovi quesiti per questo percorso. Puoi scegliere una prova dall’archivio.",
      );
      return;
    }
    start({
      question_ids: qs.map((q) => q.id),
      title: plan.title || `Allenamento · ${plan.topic || "misto"}`,
      minutes: plan.minutes || 25,
    });
  }
  async function finish() {
    if (finishing.current || !stateRef.current.active) return;
    finishing.current = true;
    setBusy(true);
    const a = stateRef.current.active;
    try {
      const result = await request("grade", {
        question_ids: a.questions.map((q) => q.id),
        answers: a.answers,
      });
      const completed = {
        id: a.id,
        title: a.title,
        started: a.started,
        finished: Date.now(),
        notes: a.notes,
        times: a.times,
        flags: a.flags,
        result,
      };
      setPersonal((p) => ({
        ...p,
        active: null,
        sessions: [...p.sessions.filter((s) => s.id !== a.id), completed],
      }));
      setResultId(a.id);
      setView("result");
      window.scrollTo(0, 0);
    } catch (e) {
      setMessage(
        `Correzione non riuscita: ${e.message}. Le risposte restano salvate: riprova.`,
      );
    } finally {
      finishing.current = false;
      setBusy(false);
    }
  }
  const updateActive = (fn) =>
    setPersonal((p) => (p.active ? { ...p, active: fn(p.active) } : p));
  function exportBackup() {
    const backup = {
      ...stateRef.current,
      active: null,
      exportedAt: Date.now(),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `archimede-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Backup esportato. La prova in corso non è inclusa.");
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw Error("Il backup supera il limite di 20 MB.");
      const imported = validateBackup(JSON.parse(await file.text()), data.bank);
      setPersonal((p) => mergeBackup(p, imported));
      setMessage(
        `Backup importato: ${imported.sessions.length} prove, senza duplicati.`,
      );
    } catch (e) {
      setMessage(e.message);
    }
  }
  async function importLegacy() {
    try {
      setBusy(true);
      const response = await fetch("/api/history");
      if (!response.ok)
        throw Error("Il server della versione precedente non è disponibile.");
      const history = await response.json();
      const sessions = [];
      for (const item of history) {
        const attempt = await fetch(
          "/api/attempt/" + encodeURIComponent(item.id),
        ).then((r) => {
          if (!r.ok) throw Error("Impossibile leggere una prova precedente.");
          return r.json();
        });
        const rows = attempt.result.review.map((r) => {
          const known = data.bank.find((q) => q.id === r.question.id);
          if (!known)
            throw Error("Una prova contiene un quesito non più presente.");
          return {
            ...r.question,
            key: known.key,
            topic: known.topic,
            selected: r.selected,
            ok: r.ok,
            pdf: r.pdf,
            solution_pdf: r.solution_pdf,
            source_title: r.source_title,
          };
        });
        sessions.push({
          id: attempt.id,
          title: attempt.exam.title,
          started: attempt.started * 1000,
          finished: attempt.result.finished * 1000,
          notes: attempt.notes || {},
          times: {},
          result: { ...attempt.result, review: rows },
        });
      }
      const imported = validateBackup(
        { ...initialState(), profile: personal.profile, sessions },
        data.bank,
      );
      setPersonal((p) => mergeBackup(p, imported));
      setMessage(
        `${sessions.length} prove precedenti importate, senza duplicati.`,
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (fatal)
    return (
      <div className="boot">
        <h1>Impossibile aprire Archimede</h1>
        <p>{fatal}</p>
        <Button onClick={() => location.reload()}>Riprova</Button>
      </div>
    );
  if (!loaded)
    return (
      <div className="boot" role="status">
        <span className="brand-symbol">a.</span>
        <p>Preparo il tuo percorso…</p>
      </div>
    );
  const active = personal.active,
    focus = view === "quiz" && active;
  const currentResult = personal.sessions.find((s) => s.id === resultId);
  return (
    <>
      <div className={`frame ${focus ? "focus-frame" : ""}`}>
        <div className="dashboard">
          <header className="topbar">
            <button
              className="brand"
              onClick={() => navigate("dashboard")}
              aria-label="Archimede, torna al percorso"
            >
              <span className="brand-symbol">a.</span>
              <span>archimede</span>
            </button>
            {!focus && (
              <nav aria-label="Navigazione principale">
                {Object.entries(routes)
                  .filter(([k]) => k !== "settings")
                  .map(([k, label]) => (
                    <button
                      key={k}
                      className={view === k ? "selected" : ""}
                      onClick={() => navigate(k)}
                      aria-current={view === k ? "page" : undefined}
                    >
                      {label}
                    </button>
                  ))}
              </nav>
            )}
            <button
              className="profile"
              onClick={() => navigate("settings")}
              aria-label="Apri il mio spazio"
            >
              <span className="avatar">
                {personal.profile.name
                  ? personal.profile.name.slice(0, 2).toUpperCase()
                  : "∑"}
              </span>
              <span>{personal.profile.name || "Il mio spazio"}</span>
              <Icon name="settings" />
            </button>
          </header>
          <main>
            {storageError && (
              <div className="alert" role="alert">
                {storageError}{" "}
                <button onClick={exportBackup}>Esporta backup</button>
              </div>
            )}
            {!focus && active && (
              <div className="resume-strip">
                <span>
                  <i className="live-dot" />
                  Una prova ti aspetta. Il timer continua.
                </span>
                <Button kind="ghost" onClick={() => navigate("quiz")}>
                  Riprendi <Icon name="arrow" />
                </Button>
              </div>
            )}
            {view === "dashboard" && (
              <Dashboard
                stats={stats}
                personal={personal}
                bank={data.bank}
                busy={busy}
                onPlan={trainPlan}
                onTrain={(t) => {
                  navigate("train");
                  setTimeout(
                    () => document.querySelector("#train-topic")?.focus(),
                    0,
                  );
                  if (t)
                    setMessage(`Puoi allenarti su ${t} dalla scheda dedicata.`);
                }}
                onGoal={(v) =>
                  setPersonal((p) => ({
                    ...p,
                    profile: { ...p.profile, dailyGoal: v },
                  }))
                }
                onNavigate={navigate}
              />
            )}
            {view === "train" && (
              <Training
                data={data}
                stats={stats}
                personal={personal}
                onStart={start}
                onPlan={trainPlan}
                busy={busy}
              />
            )}
            {view === "archive" && (
              <Archive exams={data.exams} onStart={start} busy={busy} />
            )}
            {view === "quiz" && active && (
              <Quiz
                key={active.id}
                attempt={active}
                update={updateActive}
                finish={finish}
                busy={busy}
                saved={saved}
                onZoom={setZoom}
              />
            )}
            {view === "result" && currentResult && (
              <Results
                session={currentResult}
                overrides={personal.overrides}
                onOverride={(key, topic) =>
                  setPersonal((p) => ({
                    ...p,
                    overrides: { ...p.overrides, [key]: topic },
                  }))
                }
                onReflect={(qid, value) =>
                  setPersonal((p) => ({
                    ...p,
                    sessions: p.sessions.map((s) =>
                      s.id === resultId
                        ? {
                            ...s,
                            reflections: { ...s.reflections, [qid]: value },
                          }
                        : s,
                    ),
                  }))
                }
                onZoom={setZoom}
                onNavigate={navigate}
              />
            )}
            {view === "history" && (
              <History
                sessions={personal.sessions}
                onOpen={(id) => {
                  setResultId(id);
                  setView("result");
                }}
                onNavigate={navigate}
              />
            )}
            {view === "settings" && (
              <Settings
                profile={personal.profile}
                onProfile={(profile) => setPersonal((p) => ({ ...p, profile }))}
                onExport={exportBackup}
                onImport={importBackup}
                total={personal.sessions.length}
                saved={saved}
                onLegacy={importLegacy}
                busy={busy}
              />
            )}
          </main>
          {!focus && (
            <footer>
              <span>Una sfida alla volta.</span>
              <a href={data.source} target="_blank" rel="noreferrer">
                Testi ufficiali UMI · 1996–2025{" "}
                <Icon name="arrow" width="13" height="13" />
              </a>
              <span className="storage-hint">
                Progressi su questo dispositivo
              </span>
            </footer>
          )}
        </div>
      </div>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
      {zoom && (
        <Modal title="Quesito originale" onClose={() => setZoom(null)}>
          <div className="zoom-paper">
            <img src={zoom} alt="Ingrandimento del problema" />
          </div>
        </Modal>
      )}
      {__VERCEL__ && (
        <Analytics
          mode={import.meta.env.PROD ? "production" : "development"}
          route={`/${view}`}
          path={`/${view}`}
          beforeSend={sanitizeAnalyticsEvent}
        />
      )}
    </>
  );
}
function Dashboard({
  stats: s,
  personal,
  bank,
  busy,
  onPlan,
  onTrain,
  onGoal,
  onNavigate,
}) {
  const plans = recommendations(bank, personal.sessions, personal.overrides);
  const date = new Date();
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">
            {date.toLocaleDateString("it-IT", {
              timeZone: "Europe/Rome",
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1>Il tuo percorso, in chiaro.</h1>
          <p className="muted">
            Capisci dove sei. Scegli cosa allenare. Torna sui tuoi errori.
          </p>
        </div>
        <Button onClick={() => onNavigate("train")}>
          Nuovo allenamento <Icon name="arrow" />
        </Button>
      </section>
      <section className="goal-strip" aria-label="Obiettivo di oggi">
        <div className="date-tile">
          <strong>
            {date.toLocaleDateString("it-IT", {
              day: "numeric",
              timeZone: "Europe/Rome",
            })}
          </strong>
          <span>
            {date.toLocaleDateString("it-IT", {
              month: "short",
              timeZone: "Europe/Rome",
            })}
          </span>
        </div>
        <div className="goal-copy">
          <span>Il tuo obiettivo di oggi</span>
          <strong>
            {s.today} <span>/ {personal.profile.dailyGoal} problemi</span>
          </strong>
        </div>
        <progress
          max={personal.profile.dailyGoal}
          value={Math.min(s.today, personal.profile.dailyGoal)}
          aria-label="Problemi completati oggi"
        />
        <label className="goal-edit">
          Obiettivo{" "}
          <select
            aria-label="Obiettivo giornaliero"
            value={personal.profile.dailyGoal}
            onChange={(e) => onGoal(+e.target.value)}
          >
            {[
              5,
              8,
              10,
              12,
              16,
              20,
              ...(![5, 8, 10, 12, 16, 20].includes(personal.profile.dailyGoal)
                ? [personal.profile.dailyGoal]
                : []),
            ].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="widget-grid">
        <article className="metric-card cool-card">
          <span className="metric-icon">
            <Icon name="book" />
          </span>
          <h2>Problemi esplorati</h2>
          <div className="metric-value">
            {s.unique}
            <small>diversi tra loro</small>
          </div>
          <p className="metric-foot">{s.minutes} min di lavoro attivo</p>
        </article>
        <article className="metric-card amber-card">
          <span className="metric-icon">
            <Icon name="target" />
          </span>
          <h2>Accuratezza</h2>
          <div className="metric-value">
            {s.accuracy === null ? "—" : s.accuracy + "%"}
            <small>
              {s.unique ? "sui primi tentativi" : "Inizia dalla prima prova"}
            </small>
          </div>
          <p className="metric-foot">
            {s.streak
              ? `${s.streak} ${s.streak === 1 ? "giorno" : "giorni"} di continuità`
              : "Il tuo percorso inizia qui"}
          </p>
        </article>
        <article className="metric-card trend-card">
          <TrendChart points={s.trend} />
        </article>
      </section>
      <div className="analysis-grid">
        <TopicChart
          topics={s.topics}
          onTrain={(t) =>
            onPlan({
              mode: "topic",
              topic: t,
              count: 6,
              minutes: 25,
              title: `Allenamento · ${t}`,
            })
          }
        />
        <aside className="panel priorities">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">IL PROSSIMO PASSO</p>
              <h2>Allenati con un obiettivo</h2>
            </div>
            <Icon name="target" />
          </div>
          {plans.map((p, i) => (
            <article
              className={`plan ${i === 0 ? "primary-plan" : ""}`}
              key={p.id}
            >
              <span className="plan-label">{p.label}</span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="plan-meta">
                <span>
                  {p.count || "—"} problemi · {p.minutes} min
                </span>
                <button
                  className="round-arrow"
                  onClick={() => onPlan(p)}
                  disabled={busy || p.disabled}
                  aria-label={p.title}
                >
                  <Icon name="arrow" />
                </button>
              </div>
            </article>
          ))}
          <div className="strength-note">
            <span className="legend-dot mint" />
            <div>
              <strong>
                {s.strong[0]
                  ? `Il tuo punto forte: ${s.strong[0].topic}`
                  : "I punti forti emergeranno dai risultati"}
              </strong>
              <p>
                {s.strong[0]
                  ? `${s.strong[0].correct}/${s.strong[0].n} problemi nuovi risolti. Continua a consolidare.`
                  : "Servono almeno 8 problemi diversi e il 75% di risposte corrette."}
              </p>
            </div>
          </div>
        </aside>
      </div>
      <section className="journey-strip">
        <div>
          <span className="step-number">01</span>
          <h3>Prova</h3>
          <p>Risolvi senza consultare gli appunti.</p>
        </div>
        <div>
          <span className="step-number">02</span>
          <h3>Comprendi</h3>
          <p>Rileggi l’errore e confronta la soluzione.</p>
        </div>
        <div>
          <span className="step-number">03</span>
          <h3>Ritrova</h3>
          <p>Ripeti il problema dopo qualche giorno.</p>
        </div>
      </section>
    </>
  );
}
function Training({ data, stats, personal, onStart, onPlan, busy }) {
  const [mode, setMode] = useState("target"),
    [topic, setTopic] = useState(stats.weak[0]?.topic || "Algebra"),
    [count, setCount] = useState(6),
    [minutes, setMinutes] = useState(25),
    [eid, setEid] = useState(data.exams[0].id);
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">IL TUO LABORATORIO</p>
        <h1>Una sfida alla tua misura.</h1>
        <p className="muted">
          Un argomento preciso o una prova completa. Poi, torna sul
          ragionamento.
        </p>
      </section>
      <div className="training-grid">
        <section className="panel setup">
          <div className="segmented" aria-label="Modalità di allenamento">
            {[
              ["target", "Mirato"],
              ["diagnostic", "Diagnosi"],
              ["official", "Prova ufficiale"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => {
                  setMode(v);
                  setMinutes(
                    v === "official"
                      ? data.exams.find((e) => e.id === eid).minutes
                      : v === "diagnostic"
                        ? 40
                        : 25,
                  );
                }}
                className={mode === v ? "selected" : ""}
                aria-pressed={mode === v}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "official" ? (
            <label>
              Edizione
              <select
                value={eid}
                onChange={(e) => {
                  setEid(e.target.value);
                  setMinutes(
                    data.exams.find((x) => x.id === e.target.value).minutes,
                  );
                }}
              >
                {data.exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.year} ·{" "}
                    {e.kind === "online"
                      ? "online"
                      : e.kind === "recupero"
                        ? "recupero"
                        : "gara"}{" "}
                    · v{e.variant} · {e.count} quesiti
                  </option>
                ))}
              </select>
            </label>
          ) : mode === "diagnostic" ? (
            <div className="setup-description">
              <h2>Prima capire, poi migliorare.</h2>
              <p>
                12 problemi nuovi distribuiti sui sei argomenti. Questa è una
                prima fotografia, non una previsione del risultato in gara.
              </p>
            </div>
          ) : (
            <label>
              Argomento
              <select
                id="train-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          <div className="form-row">
            {mode === "target" && (
              <label>
                Problemi
                <select
                  value={count}
                  onChange={(e) => setCount(+e.target.value)}
                >
                  {[3, 5, 6, 10, 16, 20, 25].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Minuti
              <input
                type="number"
                min="1"
                max="180"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </label>
          </div>
          <Button
            disabled={busy || minutes < 1 || minutes > 180}
            onClick={() =>
              mode === "official"
                ? onStart({ exam_id: eid, minutes: +minutes })
                : onPlan({
                    mode: mode === "diagnostic" ? "diagnostic" : "topic",
                    topic: mode === "target" ? topic : null,
                    count: mode === "diagnostic" ? 12 : count,
                    minutes: +minutes,
                    title:
                      mode === "diagnostic"
                        ? "Diagnosi iniziale"
                        : `Allenamento · ${topic}`,
                  })
            }
          >
            Inizia {mode === "diagnostic" ? "la diagnosi" : "l’allenamento"}{" "}
            <Icon name="arrow" />
          </Button>
          <p className="fine-print">
            5 punti corretta · 1 in bianco · 0 errata.
            <br />
            Il timer continua anche se chiudi la pagina. I tempi delle prove
            online storiche possono essere proposti per l’allenamento.
          </p>
        </section>
        <aside className="panel training-note">
          <span className="big-mark">∑</span>
          <h2>Prima il metodo.</h2>
          <p>{TOPIC_GUIDES[topic].method}</p>
          <Formula topic={topic} />
          <p className="muted">{TOPIC_GUIDES[topic].check}</p>
          <div className="rule-note">
            Le ripetizioni ti aiutano a consolidare. Per misurare i tuoi punti
            forti consideriamo solo il primo tentativo su ciascun problema.
          </div>
        </aside>
      </div>
      {stats.queue.length > 0 && (
        <section className="panel review-schedule">
          <div className="panel-heading">
            <h2>Il tuo prossimo ripasso</h2>
            <span className="soft-label">1 → 3 → 7 → 14 giorni</span>
          </div>
          {stats.queue.slice(0, 5).map((q) => (
            <div className="schedule-row" key={q.key}>
              <span className={`legend-dot ${q.ready ? "warm" : ""}`} />
              <span>
                {q.topic}
                <small>
                  Quesito originale n. {q.number} · {q.year}
                </small>
              </span>
              <span>{q.ready ? "Da riprendere oggi" : fmtDate(q.due)}</span>
              <span className="muted">
                {q.streak
                  ? `${q.streak} richiamo/i riusciti`
                  : "Da ricostruire"}
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
function Archive({ exams, onStart, busy }) {
  const [year, setYear] = useState(""),
    [kind, setKind] = useState(""),
    [limit, setLimit] = useState(18);
  const filtered = exams.filter(
    (e) => (!year || e.year === +year) && (!kind || e.kind === kind),
  );
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">TRENT’ANNI DI PROBLEMI</p>
        <h1>L’archivio ufficiale.</h1>
        <p className="muted">
          Testi del triennio raccolti dal sito delle Olimpiadi della Matematica.
          Varianti e recuperi inclusi.
        </p>
      </section>
      <div className="archive-controls">
        <label>
          Anno
          <select
            aria-label="Anno"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setLimit(18);
            }}
          >
            <option value="">Tutti gli anni</option>
            {[...new Set(exams.map((e) => e.year))]
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            aria-label="Tipo di prova"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setLimit(18);
            }}
          >
            <option value="">Tutte le prove</option>
            <option value="gara">Gara</option>
            <option value="recupero">Recupero</option>
            <option value="online">Online</option>
          </select>
        </label>
        <span className="muted">{filtered.length} prove</span>
      </div>
      <div className="archive-list">
        {filtered.slice(0, limit).map((e) => (
          <article key={e.id}>
            <div className="archive-year">{e.year}</div>
            <div className="archive-description">
              <h2>Triennio · versione {e.variant}</h2>
              <p>
                {e.kind === "online"
                  ? "Online"
                  : e.kind === "recupero"
                    ? "Recupero"
                    : "Gara"}{" "}
                · {e.count} problemi · {e.minutes} min
              </p>
            </div>
            <a
              href={encodeURI(e.pdf)}
              target="_blank"
              rel="noreferrer"
              className="subtle-link"
            >
              PDF originale ↗
            </a>
            <Button
              kind="ghost"
              disabled={busy}
              onClick={() => onStart({ exam_id: e.id })}
            >
              Inizia <Icon name="arrow" />
            </Button>
          </article>
        ))}
      </div>
      {filtered.length > limit && (
        <Button kind="ghost" onClick={() => setLimit((n) => n + 18)}>
          Mostra altre prove
        </Button>
      )}
    </>
  );
}
function Quiz({ attempt: a, update, finish, busy, saved, onZoom }) {
  const [index, setIndex] = useState(0),
    [tick, setTick] = useState(Date.now()),
    [confirm, setConfirm] = useState(false);
  const q = a.questions[index],
    currentId = useRef(q.id),
    last = useRef(performance.now()),
    autoSubmitted = useRef(false);
  currentId.current = q.id;
  const remaining = Math.max(
      0,
      Math.ceil((a.deadline - (tick + (a.clockOffset || 0))) / 1000),
    ),
    expired = remaining === 0,
    answered = Object.keys(a.answers).length;
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (expired && !autoSubmitted.current) {
      autoSubmitted.current = true;
      finish();
    }
  }, [expired]);
  useEffect(() => {
    let last = performance.now();
    const flush = () => {
      const now = performance.now(),
        duration = now - last;
      last = now;
      if (document.visibilityState === "visible" && !expired)
        update((p) => ({
          ...p,
          times: {
            ...p.times,
            [q.id]: (p.times[q.id] || 0) + Math.min(duration, 2000),
          },
        }));
    };
    const visible = () => {
      last = performance.now();
    };
    const timer = setInterval(flush, 1000);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      flush();
    };
  }, [q.id, expired]);
  function select(letter) {
    if (expired || busy) return;
    update((p) => ({ ...p, answers: { ...p.answers, [q.id]: letter } }));
  }
  function go(i) {
    setIndex(Math.max(0, Math.min(i, a.questions.length - 1)));
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
        confirm ||
        document.querySelector("dialog[open]")
      )
        return;
      if ("ABCDE".includes(e.key.toUpperCase()) && e.key.length === 1)
        select(e.key.toUpperCase());
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, expired, busy, confirm]);
  return (
    <section className="quiz">
      <div className="quiz-toolbar">
        <div>
          <p>{a.title}</p>
          <span>
            {answered} / {a.questions.length} risposte
          </span>
        </div>
        <div
          className={`timer ${remaining < 300 ? "urgent" : ""}`}
          aria-label="Tempo rimanente"
        >
          <Icon name="clock" />
          <span>
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:
            {String(remaining % 60).padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="quiz-progress">
        <span
          style={{ width: `${((index + 1) / a.questions.length) * 100}%` }}
        />
      </div>
      <div className="question-heading">
        <h1>
          Problema {index + 1}
          <span> / {a.questions.length}</span>
        </h1>
        <button
          className={`flag ${a.flags.includes(q.id) ? "marked" : ""}`}
          onClick={() =>
            update((p) => ({
              ...p,
              flags: p.flags.includes(q.id)
                ? p.flags.filter((x) => x !== q.id)
                : [...p.flags, q.id],
            }))
          }
          aria-pressed={a.flags.includes(q.id)}
        >
          {a.flags.includes(q.id) ? "★ Da rivedere" : "☆ Segna da rivedere"}
        </button>
      </div>
      <QuestionImage q={q} onZoom={onZoom} />
      <p className="answer-caption">
        Scegli la lettera corrispondente alla risposta.
      </p>
      <div
        className="answer-grid"
        role="group"
        aria-label="Risposte al problema"
      >
        {["A", "B", "C", "D", "E"].map((l) => (
          <button
            key={l}
            className={a.answers[q.id] === l ? "selected" : ""}
            aria-pressed={a.answers[q.id] === l}
            disabled={expired || busy}
            onClick={() => select(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="answer-tools">
        <button
          className="text-button"
          disabled={expired || busy || !a.answers[q.id]}
          onClick={() =>
            update((p) => {
              const answers = { ...p.answers };
              delete answers[q.id];
              return { ...p, answers };
            })
          }
        >
          Lascia in bianco
        </button>
        <span>A–E per rispondere · ← → per navigare</span>
      </div>
      <details className="scratch" key={q.id}>
        <summary>Appunti personali</summary>
        <textarea
          aria-label="Appunti sul problema"
          placeholder="Un’idea, un passaggio o un dubbio…"
          maxLength="5000"
          value={a.notes[q.id] || ""}
          disabled={expired}
          onChange={(e) => {
            const value = e.target.value;
            update((p) => ({ ...p, notes: { ...p.notes, [q.id]: value } }));
          }}
        />
      </details>
      <div className="quiz-actions">
        <Button
          kind="ghost"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          <Icon name="back" />
          Precedente
        </Button>
        {index < a.questions.length - 1 ? (
          <Button onClick={() => go(index + 1)}>
            Successivo <Icon name="arrow" />
          </Button>
        ) : (
          <Button onClick={() => setConfirm(true)} disabled={busy || expired}>
            Consegna <Icon name="check" />
          </Button>
        )}
      </div>
      <div className="quiz-bottom">
        <details>
          <summary>Vai a un problema</summary>
          <div className="question-map">
            {a.questions.map((x, i) => (
              <button
                key={x.id}
                className={`${i === index ? "current" : ""} ${a.answers[x.id] ? "answered" : ""} ${a.flags.includes(x.id) ? "flagged" : ""}`}
                onClick={() => go(i)}
                aria-label={`Problema ${i + 1}${a.answers[x.id] ? ", risposta " + a.answers[x.id] : ", in bianco"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </details>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => (expired ? finish() : setConfirm(true))}
        >
          {expired ? "Riprova la correzione" : "Termina la prova"}
        </button>
        <span className="save-state" role="status">
          {saved ? "Salvato su questo dispositivo" : "Salvataggio…"}
        </span>
      </div>
      {expired && (
        <p className="alert">
          Tempo scaduto.{" "}
          {busy
            ? "Correggo le risposte…"
            : "Se la rete non è disponibile, riprova la correzione: le risposte restano salvate."}
        </p>
      )}
      {confirm && (
        <Modal title="Consegna la prova" onClose={() => setConfirm(false)}>
          <p>
            Hai risposto a {answered} problemi su {a.questions.length}.{" "}
            {a.questions.length - answered > 0
              ? `Restano ${a.questions.length - answered} risposte in bianco.`
              : ""}
          </p>
          <p className="muted">
            Dopo la consegna vedrai correzione, appunti e indicazioni per il
            prossimo allenamento.
          </p>
          <div className="modal-actions">
            <Button kind="ghost" onClick={() => setConfirm(false)}>
              Continua a ragionare
            </Button>
            <Button
              onClick={() => {
                setConfirm(false);
                finish();
              }}
              disabled={busy}
            >
              Consegna e correggi
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
function Results({
  session: s,
  overrides,
  onOverride,
  onReflect,
  onZoom,
  onNavigate,
}) {
  const r = s.result;
  const topics = [...new Set(r.review.map((q) => overrides[q.key] || q.topic))];
  const weakTopics = topics.sort(
    (a, b) =>
      r.review.filter((q) => (overrides[q.key] || q.topic) === b && !q.ok)
        .length -
      r.review.filter((q) => (overrides[q.key] || q.topic) === a && !q.ok)
        .length,
  );
  return (
    <>
      <section className="page-heading results-heading">
        <div>
          <p className="eyebrow">UN PASSO AVANTI</p>
          <h1>Ora, capiamo il perché.</h1>
          <p className="muted">
            {s.title} · {fmtDate(s.finished)}
          </p>
        </div>
        <Button onClick={() => onNavigate("dashboard")}>
          Torna al percorso <Icon name="arrow" />
        </Button>
      </section>
      <section className="result-summary panel">
        <div className="result-score">
          {r.score}
          <span> / {r.max}</span>
          <small>punti</small>
        </div>
        <div className="result-count">
          <strong>{r.correct}</strong>
          <span>Corrette</span>
        </div>
        <div className="result-count">
          <strong>{r.wrong}</strong>
          <span>Da rivedere</span>
        </div>
        <div className="result-count">
          <strong>{r.blank}</strong>
          <span>In bianco</span>
        </div>
      </section>
      <div className="result-intro">
        <h2>Il tuo ripasso parte da qui</h2>
        <p className="muted">
          Ricostruisci il ragionamento prima di aprire la soluzione. I problemi
          non risolti torneranno nel ripasso tra un giorno.
        </p>
      </div>
      <div className="guide-grid">
        {weakTopics.slice(0, 3).map((t) => (
          <details className="panel guide" key={t}>
            <summary>
              {t}
              <span>Promemoria di metodo</span>
            </summary>
            <p>{TOPIC_GUIDES[t].method}</p>
            <Formula topic={t} />
            <p className="muted">{TOPIC_GUIDES[t].check}</p>
            {t === "Teoria dei numeri" && (
              <p className="fine-print">
                Per n positivo e pᵢ primi distinti, αᵢ sono gli esponenti della
                fattorizzazione e d(n) il numero di divisori positivi.
              </p>
            )}
          </details>
        ))}
      </div>
      <div className="panel-heading correction-heading">
        <h2>Un problema alla volta</h2>
        <button className="text-button" onClick={() => window.print()}>
          Stampa il riepilogo
        </button>
      </div>
      {r.review.map((q, i) => (
        <details className="correction" key={q.id}>
          <summary>
            <span>
              Problema {i + 1}
              {s.flags?.includes(q.id) ? " ★" : ""}
              <small>{overrides[q.key] || q.topic}</small>
            </span>
            <span className={q.ok ? "status-success" : "status-warm"}>
              {q.ok ? "Corretta" : q.selected ? "Da rivedere" : "In bianco"}
              <Icon name={q.ok ? "check" : "arrow"} />
            </span>
          </summary>
          <div className="correction-body">
            <QuestionImage q={q} onZoom={onZoom} />
            <p className="answer-comparison">
              La tua risposta: <strong>{q.selected || "in bianco"}</strong> ·
              Corretta: <strong>{q.correct}</strong>
            </p>
            {s.notes?.[q.id] && (
              <blockquote>
                <span>Il tuo ragionamento</span>
                {s.notes[q.id]}
              </blockquote>
            )}
            <label className="reflection-label">
              Cosa vuoi migliorare?
              <select
                value={s.reflections?.[q.id] || ""}
                onChange={(e) => onReflect(q.id, e.target.value)}
              >
                <option value="">Scegli il motivo dell’errore</option>
                <option value="method">Non conoscevo il metodo</option>
                <option value="calculation">Errore di calcolo</option>
                <option value="reading">Ho letto male un vincolo</option>
                <option value="time">Non ho gestito il tempo</option>
                <option value="uncertain">Non so ancora perché</option>
              </select>
            </label>
            <div className="source-actions">
              <a
                href={encodeURI(q.pdf) + `#page=${q.source_page}`}
                target="_blank"
                rel="noreferrer"
                className="button ghost"
              >
                Testo ufficiale ↗
              </a>
              {q.solution_pdf ? (
                <a
                  className="button ghost"
                  href={encodeURI(q.solution_pdf)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Soluzione commentata ↗
                </a>
              ) : (
                <span className="muted">
                  Questa edizione non include svolgimenti commentati.
                </span>
              )}
            </div>
            {q.solution_pdf && (
              <p className="fine-print">
                Le soluzioni possono riferirsi alla versione base. Cerca il
                problema dal testo: {q.source_title}, quesito originale{" "}
                {q.number}.
              </p>
            )}
            <details className="topic-correction">
              <summary>Argomento non corretto?</summary>
              <label>
                Assegna l’argomento
                <select
                  aria-label={`Argomento del problema ${i + 1}`}
                  value={overrides[q.key] || q.topic}
                  onChange={(e) => onOverride(q.key, e.target.value)}
                >
                  {TOPICS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                La modifica aggiorna la tua mappa e i prossimi allenamenti su
                questo dispositivo.
              </p>
            </details>
          </div>
        </details>
      ))}
    </>
  );
}
function History({ sessions, onOpen, onNavigate }) {
  const sorted = [...sessions].sort((a, b) => b.finished - a.finished);
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">IL TUO PERCORSO, PROVA DOPO PROVA</p>
        <h1>Ogni tentativo conta.</h1>
        <p className="muted">
          Risultati, ragionamenti e correzioni. Tutto rimane qui, su questo
          dispositivo.
        </p>
      </section>
      {!sorted.length ? (
        <section className="empty-state panel">
          <Icon name="book" width="38" height="38" />
          <h2>Il primo punto sul grafico manca ancora.</h2>
          <p>Completa una prova per iniziare a vedere i tuoi progressi.</p>
          <Button onClick={() => onNavigate("train")}>
            Inizia un allenamento <Icon name="arrow" />
          </Button>
        </section>
      ) : (
        <section className="history-list">
          {sorted.map((s) => (
            <button key={s.id} onClick={() => onOpen(s.id)}>
              <span className="history-date">{fmtDate(s.finished)}</span>
              <span className="history-title">
                {s.title}
                <small>
                  {s.result.correct}/{s.result.review.length} corrette ·{" "}
                  {s.result.blank} in bianco
                </small>
              </span>
              <span className="history-score">
                {s.result.score}
                <small> / {s.result.max}</small>
              </span>
              <Icon name="arrow" />
            </button>
          ))}
        </section>
      )}
    </>
  );
}
function Settings({
  profile,
  onProfile,
  onExport,
  onImport,
  total,
  saved,
  onLegacy,
  busy,
}) {
  const file = useRef();
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">SENZA ACCOUNT, SENZA DISTRAZIONI</p>
        <h1>Il tuo spazio.</h1>
        <p className="muted">
          I tuoi dati restano nel browser. Un backup li porta con te.
        </p>
      </section>
      <div className="settings-grid">
        <section className="panel">
          <h2>Il tuo ritmo</h2>
          <label>
            Come vuoi essere chiamato?
            <input
              maxLength="40"
              placeholder="Il tuo nome (facoltativo)"
              value={profile.name}
              onChange={(e) => onProfile({ ...profile, name: e.target.value })}
            />
          </label>
          <label>
            Obiettivo giornaliero
            <input
              type="number"
              min="1"
              max="50"
              value={profile.dailyGoal}
              onChange={(e) => {
                const value = +e.target.value;
                if (Number.isInteger(value) && value >= 1 && value <= 50)
                  onProfile({ ...profile, dailyGoal: value });
              }}
            />
          </label>
          <p className="fine-print">
            Un obiettivo di problemi, non una gara con il tempo.{" "}
            {saved ? "Preferenze salvate." : "Salvataggio…"}
          </p>
        </section>
        <section className="panel">
          <h2>Porta con te i tuoi progressi</h2>
          <p>
            {total} {total === 1 ? "prova salvata" : "prove salvate"} su questo
            browser.
          </p>
          <p className="muted">
            La cancellazione dei dati del browser elimina anche i progressi.
            Esporta un backup per conservarli o importarli su un altro
            dispositivo. Le prove in corso non sono incluse.
          </p>
          <div className="backup-actions">
            <Button onClick={onExport}>
              <Icon name="down" />
              Esporta backup
            </Button>
            <Button kind="ghost" onClick={() => file.current.click()}>
              Importa backup
            </Button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                onImport(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </div>
          <p className="fine-print">
            L’importazione unisce le prove senza duplicarle. Non sostituisce la
            prova in corso.
          </p>
        </section>
      </div>
      {["localhost", "127.0.0.1"].includes(location.hostname) && (
        <section className="panel legacy-import">
          <h2>Prove della versione precedente</h2>
          <p className="muted">
            Puoi trasferire nel browser lo storico conservato dal server Rust
            locale. Le prove già presenti non vengono duplicate.
          </p>
          <Button kind="ghost" onClick={onLegacy} disabled={busy}>
            Importa lo storico locale
          </Button>
        </section>
      )}
      <section className="privacy-note">
        <h2>Dati e trasparenza</h2>
        <p>
          La banca dati dei problemi e la correzione sono gestite dal backend
          Rust. Statistiche, appunti e preferenze sono conservati in IndexedDB
          su questo dispositivo. Non vengono inviati a un archivio personale
          online.
        </p>
        <p>
          Su Vercel è integrato Web Analytics per le visite al sito. Risposte,
          appunti, nome e contenuti dei backup non vengono inviati agli
          Analytics. Le statistiche di abilità sono indicative e dipendono dai
          problemi affrontati.
        </p>
      </section>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
