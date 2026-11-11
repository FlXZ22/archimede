export const TOPICS = [
  "Algebra",
  "Geometria",
  "Teoria dei numeri",
  "Combinatoria",
  "Probabilità",
  "Logica",
];
export const TOPIC_SHORT = {
  Algebra: "Algebra",
  Geometria: "Geometria",
  "Teoria dei numeri": "Numeri",
  Combinatoria: "Combinatoria",
  Probabilità: "Probabilità",
  Logica: "Logica",
};
export const TOPIC_GUIDES = {
  Algebra: {
    method:
      "Definisci le incognite, traduci i vincoli in equazioni e verifica il risultato nel testo.",
    check:
      "Controlla segni, denominatori e valori esclusi. Prima di calcolare, cerca fattorizzazioni e simmetrie.",
    formula: "(a + b)² = a² + 2ab + b²",
  },
  Geometria: {
    method:
      "Ridisegna la figura e segna lunghezze, angoli e rapporti. Cerca triangoli simili prima di introdurre incognite.",
    check:
      "Le figure non sono necessariamente in scala. Nei triangoli simili le aree variano con il quadrato del rapporto dei lati.",
    formula: "A triangolo = base × altezza / 2",
  },
  "Teoria dei numeri": {
    method:
      "Scomponi in fattori primi. Per divisibilità, resti e ultime cifre, cerca congruenze e cicli.",
    check:
      "Un quadrato perfetto ha esponenti pari nella fattorizzazione. Distingui interi positivi e interi relativi.",
    formula: "n = p₁^α₁ · … · pᵣ^αᵣ → d(n) = (α₁ + 1) · … · (αᵣ + 1)",
  },
  Combinatoria: {
    method:
      "Chiarisci se l’ordine conta. Dividi il problema in casi disgiunti, poi somma i conteggi.",
    check:
      "Cerca duplicati e casi esclusi. Prova prima una versione più piccola del problema.",
    formula: "C(n, k) = n! / [k! (n − k)!]",
  },
  Probabilità: {
    method:
      "Definisci lo spazio degli esiti e verifica che siano equiprobabili. Se conviene, calcola l’evento complementare.",
    check:
      "Non moltiplicare probabilità senza verificare l’indipendenza. Tieni conto delle estrazioni senza reinserimento.",
    formula: "P(non E) = 1 − P(E)",
  },
  Logica: {
    method:
      "Esplicita le ipotesi e separa i casi. Per cavalieri e furfanti verifica tutte le affermazioni nello stesso scenario.",
    check:
      "Un esempio può smentire un’affermazione universale, ma non dimostrarla. Controlla le contraddizioni.",
    formula: "¬(P ∧ Q) ≡ ¬P ∨ ¬Q",
  },
};
export function dayKey(time = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(time));
}
export function previousDay(day) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
export function wilson(correct, total) {
  if (!total) return [0, 1];
  const z = 1.96,
    p = correct / total,
    den = 1 + (z * z) / total,
    center = (p + (z * z) / (2 * total)) / den,
    spread =
      (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
      den;
  return [Math.max(0, center - spread), Math.min(1, center + spread)];
}
export function observations(sessions, overrides = {}) {
  return [...sessions]
    .filter((s) => s.result?.review)
    .sort((a, b) => a.started - b.started || a.id.localeCompare(b.id))
    .flatMap((s) =>
      s.result.review.map((r) => ({
        ...r,
        topic: overrides[r.key] || r.topic,
        at: s.finished,
        sessionId: s.id,
        duration: s.times?.[r.id] || 0,
      })),
    )
    .filter((r) => TOPICS.includes(r.topic));
}
export function firstObservations(sessions, overrides = {}) {
  const seen = new Set();
  return observations(sessions, overrides).filter((r) => {
    if (seen.has(r.key)) return false;
    seen.add(r.key);
    return true;
  });
}
export function reviewQueue(sessions, overrides = {}, now = Date.now()) {
  const grouped = new Map();
  for (const r of observations(sessions, overrides)) {
    const list = grouped.get(r.key) || [];
    list.push(r);
    grouped.set(r.key, list);
  }
  const queue = [];
  for (const [key, list] of grouped) {
    if (!list.some((r) => !r.ok)) continue;
    let streak = 0;
    for (let i = list.length - 1; i >= 0 && list[i].ok; i--) streak++;
    const last = list.at(-1);
    const days =
      streak === 0 ? 1 : Math.min(30, [1, 3, 7, 14, 30][Math.min(streak, 4)]);
    const due = last.at + days * 86400000;
    queue.push({
      ...last,
      key,
      streak,
      due,
      ready: now >= due,
      attempts: list.length,
    });
  }
  return queue.sort((a, b) => a.due - b.due);
}
export function analyze(sessions, overrides = {}, now = Date.now()) {
  const rows = firstObservations(sessions, overrides);
  const all = observations(sessions, overrides);
  const topics = TOPICS.map((topic) => {
    const samples = rows.filter((r) => r.topic === topic);
    const n = samples.length,
      c = samples.filter((r) => r.ok).length;
    const accuracy = n ? Math.round((100 * c) / n) : null;
    const [low, high] = wilson(c, n);
    const status =
      n < 5
        ? "da esplorare"
        : accuracy < 60
          ? "da allenare"
          : n >= 8 && accuracy >= 75
            ? "punto forte"
            : "in crescita";
    return {
      topic,
      n,
      correct: c,
      accuracy,
      low: Math.round(low * 100),
      high: Math.round(high * 100),
      status,
    };
  });
  const weak = topics
    .filter((t) => t.n >= 5 && t.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy || b.n - a.n);
  const strong = topics
    .filter((t) => t.n >= 8 && t.accuracy >= 75)
    .sort((a, b) => b.accuracy - a.accuracy || b.n - a.n);
  const unexplored = topics.filter((t) => t.n < 5).sort((a, b) => a.n - b.n);
  const completedDays = new Set(
    sessions.filter((s) => s.finished).map((s) => dayKey(s.finished)),
  );
  let cursor = dayKey(now),
    streak = 0;
  if (!completedDays.has(cursor)) cursor = previousDay(cursor);
  while (completedDays.has(cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }
  const today = all.filter((r) => dayKey(r.at) === dayKey(now));
  return {
    topics,
    weak,
    strong,
    unexplored,
    unique: rows.length,
    accuracy: rows.length
      ? Math.round((100 * rows.filter((r) => r.ok).length) / rows.length)
      : null,
    streak,
    today: today.length,
    minutes: Math.round(
      sessions.reduce(
        (n, s) => n + Object.values(s.times || {}).reduce((a, b) => a + b, 0),
        0,
      ) / 60000,
    ),
    queue: reviewQueue(sessions, overrides, now),
    trend: [...sessions]
      .filter((s) => s.result)
      .sort((a, b) => a.finished - b.finished)
      .slice(-8)
      .map((s) => ({
        id: s.id,
        title: s.title,
        at: s.finished,
        correct: s.result.correct,
        total: s.result.review.length,
        accuracy: Math.round((s.result.correct / s.result.review.length) * 100),
      })),
  };
}
function seededOrder(bank, seed) {
  return [...bank]
    .map((q) => ({
      q,
      v:
        [...q.id].reduce(
          (h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619),
          seed,
        ) >>> 0,
    }))
    .sort((a, b) => a.v - b.v)
    .map((x) => x.q);
}
export function chooseQuestions(
  bank,
  sessions,
  {
    mode = "adaptive",
    topic = null,
    count = 6,
    now = Date.now(),
    overrides = {},
    seed = now % 2147483647,
  } = {},
) {
  const stats = analyze(sessions, overrides, now),
    seen = new Set(firstObservations(sessions, overrides).map((r) => r.key)),
    unique = new Map();
  for (const q of seededOrder(
    bank.filter((q) => q.canonical),
    seed,
  )) {
    const effective = { ...q, topic: overrides[q.key] || q.topic };
    if (!unique.has(q.key)) unique.set(q.key, effective);
  }
  let pool = [...unique.values()];
  if (topic) pool = pool.filter((q) => q.topic === topic);
  if (mode === "review") {
    const due = stats.queue.filter(
      (q) => q.ready && (!topic || q.topic === topic),
    );
    return due
      .slice(0, count)
      .map(
        (r) =>
          pool.find((q) => q.key === r.key) ||
          bank.find((q) => q.key === r.key),
      )
      .filter(Boolean);
  }
  if (mode === "diagnostic") {
    const selected = [];
    for (let pass = 0; pass < Math.ceil(count / TOPICS.length); pass++)
      for (const t of TOPICS) {
        const q = pool.find(
          (q) =>
            q.topic === t &&
            !seen.has(q.key) &&
            !selected.some((s) => s.key === q.key),
        );
        if (q && selected.length < count) selected.push(q);
      }
    return selected;
  }
  const target =
    topic ||
    stats.weak[0]?.topic ||
    stats.unexplored[0]?.topic ||
    stats.topics.slice().sort((a, b) => a.accuracy - b.accuracy)[0]?.topic;
  if (mode === "adaptive" && !topic)
    pool = pool.filter((q) => q.topic === target);
  return pool
    .sort((a, b) => Number(seen.has(a.key)) - Number(seen.has(b.key)))
    .slice(0, count);
}
export function recommendations(
  bank,
  sessions,
  overrides = {},
  now = Date.now(),
) {
  const s = analyze(sessions, overrides, now),
    due = s.queue.filter((q) => q.ready).length;
  const plans = [];
  if (!s.unique)
    plans.push({
      id: "diagnostic",
      mode: "diagnostic",
      title: "Parti da una diagnosi",
      description: "12 problemi bilanciati per capire da dove iniziare.",
      count: 12,
      minutes: 40,
      label: "Primo passo",
    });
  else if (s.weak.length)
    plans.push({
      id: "weak",
      mode: "adaptive",
      topic: s.weak[0].topic,
      title: `Lavora su ${s.weak[0].topic.toLowerCase()}`,
      description: `${s.weak[0].correct} risposte corrette su ${s.weak[0].n} problemi nuovi. Riparti dal metodo.`,
      count: 6,
      minutes: 25,
      label: "La tua priorità",
    });
  else if (s.unexplored.length)
    plans.push({
      id: "explore",
      mode: "topic",
      topic: s.unexplored[0].topic,
      title: `Esplora ${s.unexplored[0].topic.toLowerCase()}`,
      description: "Servono almeno 5 problemi nuovi per una prima indicazione.",
      count: 5,
      minutes: 20,
      label: "Completa il quadro",
    });
  else
    plans.push({
      id: "consolidate",
      mode: "adaptive",
      title: "Consolida il tuo percorso",
      description:
        "Nuovi problemi sull’argomento con il maggior margine di miglioramento.",
      count: 6,
      minutes: 25,
      label: "Prossimo passo",
    });
  plans.push({
    id: "review",
    mode: "review",
    title: "Ritrova gli errori, con calma",
    description: due
      ? `${due} problemi da riprendere oggi, prima di guardare la soluzione.`
      : "Il ripasso si attiva un giorno dopo il primo errore.",
    count: Math.min(5, due),
    minutes: 20,
    label: "Ripasso distanziato",
    disabled: !due,
  });
  return plans;
}
