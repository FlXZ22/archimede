import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const corpus = JSON.parse(
  readFileSync(resolve(root, "data/corpus.json"), "utf8"),
);
const rules = JSON.parse(
  readFileSync(resolve(root, "data/exam-rules.json"), "utf8"),
);
test("every edition has a sourced rule profile matching duration and question count", () => {
  assert.equal(Object.keys(rules.exams).length, 183);
  assert.equal(Object.keys(rules.evidence).length, 32);
  for (const e of corpus.exams) {
    const r = rules.exams[e.id];
    assert.ok(r.duration_verified);
    assert.equal(r.minutes, e.minutes, e.id);
    assert.equal(r.question_count, e.questions.length, e.id);
    assert.deepEqual(r.scoring, { correct: 5, wrong: 0, blank: 1 });
    assert.ok(rules.evidence[r.evidence_id]);
    assert.ok(r.source_label);
    assert.ok(r.source_href);
    if (r.source_href.startsWith("/"))
      assert.ok(
        existsSync(resolve(root, r.source_href.split("#")[0].slice(1))),
      );
  }
});
test("historic duration changes are explicit including 110 minutes and online 2021 at 60", () => {
  for (const e of corpus.exams) {
    const expected =
      e.year <= 2008
        ? 90
        : e.year <= 2015
          ? 120
          : e.year <= 2019
            ? 110
            : e.year <= 2021
              ? 60
              : 100;
    assert.equal(e.minutes, expected, e.id);
  }
  assert.equal(rules.exams["2020-gara-1"].source_kind, "school_notice");
  assert.equal(rules.exams["2021-online-1"].source_kind, "organizer_notice");
});
test("duration extraction does not confuse time inside a problem with exam instructions", () => {
  const code = `import sys;sys.path.insert(0,'scripts');from audit_rules import extract_duration\nassert extract_duration('Una partita di calcio dura 90 minuti.')[0] is None\nassert extract_duration('La partita dura 90 minuti.\\nIl tempo che hai a disposizione per svolgere la prova è di 110 minuti.')[0] == 110\nassert extract_duration('Il tempo totale che hai a disposizione per svolgere la prova è un’ora e mezza.')[0] == 90\nassert extract_duration('Il tempo totale che hai a disposizione per svolgere la prova è di due ore.')[0] == 120\nassert extract_duration('Hai a tua disposizione 100 minuti.')[0] == 100\nprint('instruction-only extraction verified')`;
  assert.match(
    execFileSync("python3", ["-c", code], { cwd: root, encoding: "utf8" }),
    /verified/,
  );
});
