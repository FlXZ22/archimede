import test from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  reviewQueue,
  chooseQuestions,
  recommendations,
  TOPICS,
  dayKey,
  wilson,
} from "../frontend/src/learning.mjs";
import {
  validateBackup,
  mergeBackup,
  initialState,
} from "../frontend/src/storage.mjs";
const now = Date.UTC(2026, 10, 11, 12);
const row = (key, ok, topic = "Algebra") => ({
  id: key,
  key,
  ok,
  topic,
  selected: ok ? "A" : "B",
  correct: "A",
  images: ["/assets/q.png"],
  pdf: "/data/originals/exam/q.pdf",
});
const session = (id, review, at = now) => ({
  id,
  title: id,
  started: at - 60000,
  finished: at,
  times: {},
  notes: {},
  result: { review },
});
const bank = TOPICS.flatMap((topic, t) =>
  Array.from({ length: 12 }, (_, i) => ({
    id: `q${t}-${i}`,
    key: `k${t}-${i}`,
    topic,
    canonical: true,
  })),
);
test("no invented strengths, graph values or weaknesses before evidence", () => {
  const a = analyze([]);
  assert.equal(a.accuracy, null);
  assert.deepEqual(a.weak, []);
  assert.deepEqual(a.strong, []);
  assert.equal(
    a.topics.every((t) => t.accuracy === null),
    true,
  );
  assert.equal(recommendations(bank, [])[0].mode, "diagnostic");
});
test("deduplicates variants/repeated questions for strength evidence", () => {
  const s = [
    session("a", [row("same", false)]),
    session("b", [row("same", true)], now + 1000),
  ];
  const a = analyze(s);
  assert.equal(a.unique, 1);
  assert.equal(a.topics[0].accuracy, 0);
  assert.equal(a.weak.length, 0);
});
test("separates weak/strong/low sample groups", () => {
  const s = [
    session("a", [
      ...Array.from({ length: 8 }, (_, i) => row("a" + i, i < 2)),
      ...Array.from({ length: 8 }, (_, i) => row("g" + i, i < 7, "Geometria")),
    ]),
  ];
  const a = analyze(s);
  assert.equal(a.weak[0].topic, "Algebra");
  assert.equal(a.strong[0].topic, "Geometria");
  assert.equal(a.unexplored.length, 4);
});
test("spaced review becomes due after 1 day and expands after correct recall", () => {
  const a = session("a", [row("x", false)], now);
  assert.equal(reviewQueue([a], {}, now + 3600000)[0].ready, false);
  assert.equal(reviewQueue([a], {}, now + 86400001)[0].ready, true);
  const b = session("b", [row("x", true)], now + 86400000);
  const q = reviewQueue([a, b], {}, now + 2 * 86400000)[0];
  assert.equal(q.streak, 1);
  assert.equal(q.due, b.finished + 3 * 86400000);
});
test("diagnosis balanced, adaptive targets weaknesses and avoids variants", () => {
  const diagnosis = chooseQuestions(bank, [], {
    mode: "diagnostic",
    count: 12,
    seed: 4,
  });
  assert.equal(new Set(diagnosis.map((q) => q.key)).size, 12);
  for (const t of TOPICS)
    assert.equal(diagnosis.filter((q) => q.topic === t).length, 2);
  const sessions = [
    session(
      "a",
      Array.from({ length: 6 }, (_, i) => row(`k0-${i}`, false)),
    ),
  ];
  const chosen = chooseQuestions(bank, sessions, { count: 6, seed: 4 });
  assert.equal(
    chosen.every(
      (q) =>
        q.topic === "Algebra" &&
        !sessions[0].result.review.some((r) => r.key === q.key),
    ),
    true,
  );
});
test("topic correction propagates into statistics", () => {
  const a = analyze([session("a", [row("x", false)])], { x: "Geometria" });
  assert.equal(a.topics.find((t) => t.topic === "Geometria").n, 1);
  assert.equal(a.topics[0].n, 0);
});
test("calendar uses Rome and streak includes yesterday", () => {
  assert.equal(dayKey(Date.UTC(2026, 10, 10, 23, 30)), "2026-11-11");
  const a = analyze([session("a", [row("x", true)], now - 86400000)], {}, now);
  assert.equal(a.streak, 1);
  const [l, h] = wilson(5, 10);
  assert.ok(l < 0.5 && h > 0.5);
});
test("backup validates shapes and merges without duplicate attempts", () => {
  const s = initialState();
  s.sessions = [session("a", [{ ...row(bank[0].id, true), key: bank[0].key }])];
  const validated = validateBackup(s, bank);
  assert.equal(mergeBackup(s, validated).sessions.length, 1);
  assert.throws(() => validateBackup({ ...s, version: 0 }, bank));
  assert.throws(() =>
    validateBackup(
      { ...s, sessions: [session("bad", [row("nonexistent", true)])] },
      bank,
    ),
  );
});

test("saved references and category corrections follow a bank-key update", async () => {
  const { hydrateReferences } = await import("../frontend/src/storage.mjs");
  const p = initialState();
  p.sessions = [session("a", [{ ...row("q0-0", true), key: "old-key" }])];
  p.overrides = { "old-key": "Geometria" };
  const hydrated = hydrateReferences(p, bank);
  assert.equal(hydrated.sessions[0].result.review[0].key, "k0-0");
  assert.equal(hydrated.overrides["k0-0"], "Geometria");
  const restored = validateBackup(p, bank);
  assert.equal(restored.overrides["k0-0"], "Geometria");
});

test("backup cannot introduce external resources or active links", () => {
  const p = initialState();
  p.sessions = [
    session("a", [
      { ...row("q0-0", true), key: "k0-0", pdf: "javascript:alert(1)" },
    ]),
  ];
  assert.throws(() => validateBackup(p, bank), /fonte/);
  p.sessions[0].result.review[0].pdf = "/data/originals/exam/q.pdf";
  p.sessions[0].result.review[0].images = ["https://example.com/tracker.png"];
  assert.throws(() => validateBackup(p, bank), /immagine/);
});
