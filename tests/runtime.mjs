import assert from "node:assert/strict";
const base = process.env.RUNTIME_URL || "http://127.0.0.1:8790/api/index";
let catalog;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const r = await fetch(base + "?action=catalog");
    assert.equal(r.ok, true);
    catalog = await r.json();
    break;
  } catch (error) {
    if (attempt === 29) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
assert.equal(catalog.total, 2632);
assert.equal(catalog.exams.length, 183);
const response = await fetch(base + "?action=start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ exam_id: "2025-gara-1" }),
});
assert.equal(response.ok, true);
const session = await response.json();
assert.equal(session.questions.length, 16);
assert.ok(session.questions.every((q) => !("correct" in q)));
const graded = await fetch(base + "?action=grade", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question_ids: ["2025-gara-1-q1", "2025-gara-1-q2"],
    answers: { "2025-gara-1-q1": "C" },
  }),
});
assert.equal(graded.ok, true);
const score = await graded.json();
assert.equal(score.correct, 1);
assert.equal(score.blank, 1);
assert.equal(score.score, 6);
console.log(
  JSON.stringify(
    {
      runtime: "Vercel Rust entrypoint",
      catalog: catalog.total,
      start: "passed",
      grade: "passed",
    },
    null,
    2,
  ),
);
