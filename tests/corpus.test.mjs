import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { sanitizeAnalyticsEvent } from "../frontend/src/privacy.mjs";
const root = resolve(import.meta.dirname, "..");
test("all 183 editions and 2632 questions have answer keys, images and source PDFs", () => {
  const corpus = JSON.parse(
    readFileSync(resolve(root, "data/corpus.json"), "utf8"),
  );
  assert.deepEqual(corpus.issues, []);
  assert.equal(corpus.exams.length, 183);
  assert.equal(new Set(corpus.exams.map((e) => e.year)).size, 30);
  const ids = new Set();
  let total = 0;
  for (const e of corpus.exams) {
    assert.ok([12, 16, 20, 25].includes(e.questions.length), e.id);
    assert.ok(existsSync(resolve(root, e.pdf.slice(1))), e.pdf);
    if (e.solution_pdf)
      assert.ok(existsSync(resolve(root, e.solution_pdf.slice(1))));
    for (const q of e.questions) {
      assert.ok(!ids.has(q.id), q.id);
      ids.add(q.id);
      assert.match(q.correct, /^[A-E]$/);
      assert.ok(q.images.length > 0, q.id);
      for (const image of q.images)
        assert.ok(existsSync(resolve(root, "web", image.slice(1))), image);
      total++;
    }
  }
  assert.equal(total, 2632);
});
test("analytics removes query parameters and fragments and rejects invalid URLs", () => {
  assert.deepEqual(
    sanitizeAnalyticsEvent({
      type: "pageview",
      url: "https://archimede.example/train?name=Ada&answer=C#note",
    }),
    { type: "pageview", url: "https://archimede.example/train" },
  );
  assert.equal(
    sanitizeAnalyticsEvent({ type: "pageview", url: "invalid" }),
    null,
  );
});
