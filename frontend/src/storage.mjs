import { TOPICS } from "./learning.mjs";
export const initialState = () => ({
  version: 1,
  profile: { name: "", dailyGoal: 8 },
  sessions: [],
  active: null,
  overrides: {},
});
// Align saved references with the current question-bank version without losing
// manual classifications or repeated-attempt history.
export function hydrateReferences(state, bank) {
  const known = new Map(bank.map((q) => [q.id, q]));
  const translated = new Map();
  const refresh = (r) => {
    const q = known.get(r.id);
    if (!q) return r;
    if (r.key) translated.set(r.key, q.key);
    return { ...r, key: q.key, topic: q.topic, year: q.year };
  };
  const sessions = state.sessions.map((s) => ({
    ...s,
    result: { ...s.result, review: s.result.review.map(refresh) },
  }));
  const active = state.active
    ? { ...state.active, questions: state.active.questions.map(refresh) }
    : null;
  const overrides = Object.fromEntries(
    Object.entries(state.overrides || {}).map(([key, value]) => [
      translated.get(key) || key,
      value,
    ]),
  );
  return { ...state, sessions, active, overrides };
}
let dbPromise;
function database() {
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("archimede-focus", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("state");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  return dbPromise;
}
export async function loadState() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction("state", "readonly");
    const r = t.objectStore("state").get("personal");
    r.onsuccess = () => resolve(r.result || initialState());
    r.onerror = () => reject(r.error);
  });
}
let queue = Promise.resolve();
export function saveState(state) {
  const snapshot = structuredClone(state);
  queue = queue
    .catch(() => {})
    .then(async () => {
      const db = await database();
      return new Promise((resolve, reject) => {
        const t = db.transaction("state", "readwrite");
        t.objectStore("state").put(snapshot, "personal");
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || Error("Salvataggio interrotto"));
      });
    });
  return queue;
}
export function validateBackup(data, bank, exams = []) {
  if (
    data?.version !== 1 ||
    !data.profile ||
    !Array.isArray(data.sessions) ||
    data.sessions.length > 10000
  )
    throw Error("Il file non è un backup Archimede compatibile.");
  const known = new Map(bank.map((q) => [q.id, q]));
  const ids = new Set();
  const sessions = data.sessions.map((s) => {
    if (
      typeof s.id !== "string" ||
      s.id.length > 100 ||
      ids.has(s.id) ||
      typeof s.title !== "string" ||
      !Number.isFinite(s.started) ||
      !Number.isFinite(s.finished) ||
      s.started > s.finished ||
      !s.result ||
      !Array.isArray(s.result.review) ||
      s.result.review.length < 1 ||
      s.result.review.length > 25
    )
      throw Error("Il backup contiene una prova non valida.");
    ids.add(s.id);
    const qids = new Set();
    let correct = 0,
      blank = 0;
    const review = s.result.review.map((r) => {
      const q = known.get(r.id);
      if (
        !q ||
        qids.has(q.id) ||
        ![null, undefined, "A", "B", "C", "D", "E"].includes(r.selected) ||
        !["A", "B", "C", "D", "E"].includes(r.correct)
      )
        throw Error("Il backup contiene risposte o quesiti non validi.");
      qids.add(q.id);
      const ok = r.selected === r.correct;
      if (ok) correct++;
      if (!r.selected) blank++;
      if (
        !Array.isArray(r.images) ||
        r.images.length < 1 ||
        r.images.length > 5 ||
        r.images.some(
          (src) =>
            typeof src !== "string" ||
            !/^\/assets\/[a-zA-Z0-9_.-]+\.png$/.test(src),
        )
      )
        throw Error("Riferimento immagine non valido nel backup.");
      if (typeof r.pdf !== "string")
        throw Error("Fonte originale mancante nel backup.");
      for (const path of [r.pdf, r.solution_pdf].filter(Boolean))
        if (
          typeof path !== "string" ||
          !path.startsWith("/data/originals/") ||
          path.includes("..") ||
          !path.endsWith(".pdf")
        )
          throw Error("Riferimento fonte non valido nel backup.");
      return {
        id: q.id,
        key: q.key,
        topic: q.topic,
        year: q.year,
        images: [...r.images],
        pdf: r.pdf,
        solution_pdf: r.solution_pdf || null,
        number:
          Number.isInteger(r.number) && r.number > 0 && r.number <= 25
            ? r.number
            : 1,
        source_page:
          Number.isInteger(r.source_page) &&
          r.source_page > 0 &&
          r.source_page <= 300
            ? r.source_page
            : 1,
        source_title:
          typeof r.source_title === "string"
            ? r.source_title.slice(0, 160)
            : `Archimede ${q.year || ""}`,
        selected: r.selected || null,
        correct: r.correct,
        ok,
      };
    });
    const notes = Object.fromEntries(
      Object.entries(s.notes || {})
        .filter(([k, v]) => qids.has(k) && typeof v === "string")
        .map(([k, v]) => [k, v.slice(0, 5000)]),
    );
    const times = Object.fromEntries(
      Object.entries(s.times || {}).filter(
        ([k, v]) =>
          qids.has(k) && Number.isFinite(v) && v >= 0 && v <= 10800000,
      ),
    );
    const reflections = Object.fromEntries(
      Object.entries(s.reflections || {}).filter(
        ([id, v]) =>
          qids.has(id) &&
          ["method", "calculation", "reading", "time", "uncertain"].includes(v),
      ),
    );
    const edition = exams.find((e) => e.id === s.exam_id);
    const faithful =
      s.fidelity === "official" &&
      edition &&
      s.minutes === edition.rules?.minutes &&
      review.length === edition.count &&
      review.every((q) => q.id.startsWith(edition.id + "-q"));
    return {
      id: s.id,
      exam_id: edition?.id || null,
      fidelity: faithful ? "official" : "practice",
      minutes:
        Number.isInteger(s.minutes) && s.minutes >= 1 && s.minutes <= 180
          ? s.minutes
          : null,
      rules: faithful ? edition.rules : null,
      title: s.title.slice(0, 120),
      started: s.started,
      finished: s.finished,
      notes,
      times,
      reflections,
      flags: Array.isArray(s.flags) ? s.flags.filter((id) => qids.has(id)) : [],
      result: {
        ...s.result,
        review,
        correct,
        blank,
        wrong: review.length - correct - blank,
        score: correct * 5 + blank,
        max: review.length * 5,
      },
    };
  });
  const previousKeys = new Map(
    data.sessions.flatMap((s) =>
      s.result.review.map((r) => [r.key, known.get(r.id)?.key]),
    ),
  );
  const overrides = Object.fromEntries(
    Object.entries(data.overrides || {})
      .map(([key, topic]) => [previousKeys.get(key) || key, topic])
      .filter(
        ([key, topic]) =>
          bank.some((q) => q.key === key) && TOPICS.includes(topic),
      ),
  );
  const name =
    typeof data.profile.name === "string" ? data.profile.name.slice(0, 40) : "";
  const dailyGoal =
    Number.isInteger(data.profile.dailyGoal) &&
    data.profile.dailyGoal >= 1 &&
    data.profile.dailyGoal <= 50
      ? data.profile.dailyGoal
      : 8;
  return {
    version: 1,
    profile: { name, dailyGoal },
    sessions,
    active: null,
    overrides,
  };
}
export function mergeBackup(current, imported) {
  const sessions = new Map(current.sessions.map((s) => [s.id, s]));
  for (const s of imported.sessions) sessions.set(s.id, s);
  return {
    ...current,
    profile: imported.profile,
    sessions: [...sessions.values()].sort((a, b) => a.started - b.started),
    overrides: { ...current.overrides, ...imported.overrides },
  };
}
