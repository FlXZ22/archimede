const { chromium } = require("@playwright/test");
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const base = process.env.APP_URL || "http://127.0.0.1:8787";
const root = path.resolve(__dirname, "..");
async function api(action, data) {
  const r = await fetch(base + "/api/v2?action=" + action, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  assert.equal(r.ok, true, await r.clone().text());
  return r.json();
}
async function readState(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("archimede-focus", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("state", "readonly");
          const q = tx.objectStore("state").get("personal");
          q.onsuccess = () => resolve(q.result);
          q.onerror = () => reject(q.error);
        };
      }),
  );
}
async function writeState(page, value) {
  await page.evaluate(
    (value) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("archimede-focus", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("state", "readwrite");
          tx.objectStore("state").put(value, "personal");
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        };
      }),
    value,
  );
}
async function saveReady(page) {
  await page.waitForTimeout(200);
  await page
    .getByRole("status")
    .filter({ hasText: "Salvato su questo dispositivo" })
    .waitFor();
}
(async () => {
  fs.mkdirSync(path.join(root, "test-results"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const corpus = JSON.parse(
    fs.readFileSync(path.join(root, "data/corpus.json")),
  );
  const correct = new Map(
    corpus.exams.flatMap((e) => e.questions.map((q) => [q.id, q.correct])),
  );
  const cat = await api("catalog");
  assert.equal(cat.total, 2632);
  assert.equal(cat.exams.length, 183);
  try {
    await page.goto(base);
    await page
      .getByRole("heading", { name: "Il tuo percorso, in chiaro." })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Parti da una diagnosi", exact: true })
        .isEnabled(),
      true,
    );
    assert.equal(await page.locator(".skill-row").count(), 6);
    assert.equal(
      await page.locator(".skill-value").first().innerText(),
      "—\n0 problemi",
    );
    checks.push("Empty state shows no invented accuracy or weaknesses");
    const startResponse = page.waitForResponse((r) =>
      r.url().includes("action=start"),
    );
    await page
      .getByRole("button", { name: "Parti da una diagnosi", exact: true })
      .click();
    const attempt = await (await startResponse).json();
    assert.equal(attempt.questions.length, 12);
    assert.ok(attempt.questions.every((q) => !("correct" in q)));
    assert.equal(new Set(attempt.questions.map((q) => q.topic)).size, 6);
    const first = attempt.questions[0];
    await page
      .getByRole("button", { name: correct.get(first.id), exact: true })
      .click();
    await page.getByRole("button", { name: "☆ Segna da rivedere" }).click();
    await page.locator(".scratch summary").click();
    await page
      .getByRole("textbox", { name: "Appunti sul problema" })
      .fill("Controllo i vincoli e ricostruisco il passaggio.");
    await saveReady(page);
    const originalDeadline = (await readState(page)).active.deadline;
    await page.reload();
    await page.getByRole("button", { name: /Riprendi/ }).click();
    await page
      .getByRole("button", { name: correct.get(first.id), exact: true })
      .filter({ has: page.locator('[aria-pressed="true"]') })
      .count();
    assert.equal(
      await page
        .getByRole("button", { name: correct.get(first.id), exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.locator(".scratch summary").click();
    assert.equal(
      await page
        .getByRole("textbox", { name: "Appunti sul problema" })
        .inputValue(),
      "Controllo i vincoli e ricostruisco il passaggio.",
    );
    assert.equal((await readState(page)).active.deadline, originalDeadline);
    assert.equal(
      await page
        .getByRole("button", { name: "★ Da rivedere" })
        .getAttribute("aria-pressed"),
      "true",
    );
    checks.push(
      "Balanced diagnosis; hidden answers; answers, notes, flags and deadline survive reload",
    );
    await page
      .getByRole("button", { name: "Successivo", exact: false })
      .click();
    await page.getByRole("heading", { name: /Problema 2/ }).click();
    await page.keyboard.press(
      correct.get(attempt.questions[1].id).toLowerCase(),
    );
    await saveReady(page);
    await page
      .getByRole("button", { name: "Termina la prova", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Consegna e correggi", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Ora, capiamo il perché." })
      .waitFor();
    const result = (await readState(page)).sessions[0];
    assert.equal(result.result.correct, 2);
    assert.equal(result.result.blank, 10);
    assert.equal(result.result.score, 20);
    assert.equal(result.notes[first.id].startsWith("Controllo"), true);
    checks.push(
      "Keyboard answers and authoritative Rust scoring including blank responses",
    );
    await page.locator(".correction summary").first().click();
    await page
      .getByLabel("Cosa vuoi migliorare?")
      .first()
      .selectOption("reading");
    await page.locator(".topic-correction summary").first().click();
    const newTopic = first.topic === "Geometria" ? "Algebra" : "Geometria";
    await page
      .getByLabel("Argomento del problema 1", { exact: true })
      .selectOption(newTopic);
    await page.waitForTimeout(200);
    let updated = await readState(page);
    assert.equal(updated.overrides[first.key], newTopic);
    assert.equal(updated.sessions[0].reflections[first.id], "reading");
    checks.push(
      "Mistake journal and corrected topic persist and affect the study model",
    );
    await page.getByRole("button", { name: "Apri il mio spazio" }).click();
    await page.getByPlaceholder("Il tuo nome (facoltativo)").fill("Ada");
    await page.getByLabel("Obiettivo giornaliero", { exact: true }).fill("10");
    await page.waitForTimeout(250);
    const dl = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Esporta backup", exact: false })
      .click();
    const download = await dl;
    const exported = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
    assert.equal(exported.sessions.length, 1);
    assert.equal(exported.profile.name, "Ada");
    assert.equal(exported.sessions[0].reflections[first.id], "reading");
    assert.equal(exported.active, null);
    await page.locator("input[type=file]").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page
      .getByRole("status")
      .filter({ hasText: /Backup importato/ })
      .waitFor();
    assert.equal((await readState(page)).sessions.length, 1);
    await page.locator("input[type=file]").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
    await page
      .getByRole("status")
      .filter({ hasText: /compatibile/ })
      .waitFor();
    assert.equal((await readState(page)).sessions.length, 1);
    checks.push(
      "Backup export/import preserves reflections, deduplicates history and rejects incompatible data",
    );
    const legacy = {
      id: "legacy-fixture",
      exam: { title: "Prova precedente di verifica" },
      started: Math.floor(exported.sessions[0].started / 1000),
      notes: exported.sessions[0].notes,
      result: {
        ...exported.sessions[0].result,
        finished: Math.ceil(exported.sessions[0].finished / 1000),
        review: exported.sessions[0].result.review.map((q) => ({
          question: q,
          selected: q.selected,
          ok: q.ok,
          pdf: q.pdf,
          solution_pdf: q.solution_pdf,
          source_title: q.source_title,
        })),
      },
    };
    await page.route("**/api/history", (r) =>
      r.fulfill({ json: [{ id: legacy.id }] }),
    );
    await page.route("**/api/attempt/legacy-fixture", (r) =>
      r.fulfill({ json: legacy }),
    );
    await page
      .getByRole("button", { name: "Importa lo storico locale", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: /prove precedenti importate/ })
      .waitFor();
    assert.equal((await readState(page)).sessions.length, 2);
    await page
      .getByRole("button", { name: "Importa lo storico locale", exact: true })
      .click();
    await page.waitForTimeout(300);
    assert.equal((await readState(page)).sessions.length, 2);
    await page.unroute("**/api/history");
    await page.unroute("**/api/attempt/legacy-fixture");
    checks.push(
      "Legacy SQLite history maps into browser storage without duplicating sessions",
    );
    // Isolated test fixture with actual question metadata and Rust-graded answers.
    const state = {
      version: 1,
      profile: { name: "Ada", dailyGoal: 8 },
      active: null,
      sessions: [],
      overrides: {},
    };
    const seen = new Set();
    const now = Date.now();
    for (let group = 0; group < 3; group++) {
      const topics = cat.topics.slice(group * 2, group * 2 + 2),
        rows = [];
      for (const topic of topics) {
        for (const q of cat.bank.filter(
          (q) => q.canonical && q.topic === topic,
        )) {
          if (seen.has(q.key)) continue;
          seen.add(q.key);
          rows.push(q);
          if (rows.filter((q) => q.topic === topic).length === 8) break;
        }
      }
      const answers = {};
      for (const topic of topics) {
        const target = topic === "Geometria" ? 7 : topic === "Algebra" ? 2 : 5;
        rows
          .filter((q) => q.topic === topic)
          .forEach(
            (q, i) =>
              (answers[q.id] =
                i < target
                  ? correct.get(q.id)
                  : "ABCDE".split("").find((x) => x !== correct.get(q.id))),
          );
      }
      const graded = await api("grade", {
        question_ids: rows.map((q) => q.id),
        answers,
      });
      state.sessions.push({
        id: "fixture-" + group,
        title: "Prova di verifica " + (group + 1),
        started: now - (4 - group) * 86400000 - 1200000,
        finished: now - (4 - group) * 86400000,
        notes: {},
        times: Object.fromEntries(rows.map((q) => [q.id, 90000])),
        result: graded,
      });
    }
    await writeState(page, state);
    await page.reload();
    await page
      .getByRole("heading", { name: "La mappa delle tue abilità" })
      .waitFor();
    assert.equal(
      await page
        .locator(".skill-row")
        .filter({ hasText: "Algebra" })
        .getAttribute("aria-label")
        .then((t) => t.includes("25%")),
      true,
    );
    assert.equal(
      await page
        .locator(".skill-row")
        .filter({ hasText: "Geometria" })
        .getAttribute("aria-label")
        .then((t) => t.includes("88%") && t.includes("punto forte")),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Lavora su algebra", exact: true })
        .isEnabled(),
      true,
    );
    assert.equal(await page.locator(".trend-chart svg").count(), 1);
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: path.join(root, "test-results/dashboard-desktop.png"),
      fullPage: true,
    });
    checks.push(
      "Populated dashboard computes 25% algebra weakness, 88% geometry strength and charts from real graded records",
    );
    const targetedResponse = page.waitForResponse((r) =>
      r.url().includes("action=start"),
    );
    await page
      .getByRole("button", { name: "Lavora su algebra", exact: true })
      .click();
    const targeted = await (await targetedResponse).json();
    assert.ok(targeted.questions.every((q) => q.topic === "Algebra"));
    assert.ok(targeted.questions.every((q) => !seen.has(q.key)));
    await saveReady(page);
    await page.screenshot({
      path: path.join(root, "test-results/problem-desktop.png"),
      fullPage: true,
    });
    let a = await readState(page);
    a.active.deadline = Date.now() - 2000;
    a.active.clockOffset = 0;
    await writeState(page, a);
    await page.reload();
    await page.getByRole("button", { name: /Riprendi/ }).click();
    await page
      .getByRole("heading", { name: "Ora, capiamo il perché." })
      .waitFor();
    const expired = (await readState(page)).sessions.at(-1);
    assert.equal(expired.result.blank, 6);
    assert.equal(expired.result.score, 6);
    checks.push(
      "Adaptive training selects new weak-topic problems; expired timers submit saved answers",
    );
    await page.getByRole("button", { name: "Archivio", exact: true }).click();
    await page.getByLabel("Anno", { exact: true }).selectOption("1996");
    assert.equal(await page.locator(".archive-list article").count(), 1);
    const pdf = await page.locator(".archive-list a").getAttribute("href");
    const pdfResponse = await page.request.get(base + pdf);
    assert.equal(pdfResponse.status(), 200);
    assert.match(pdfResponse.headers()["content-type"], /pdf/);
    checks.push("Archive filters and original PDF delivery");
    await page.getByRole("button", { name: "Percorso", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Ritrova gli errori, con calma",
        exact: true,
      })
      .click();
    await page.getByRole("heading", { name: /Problema 1/ }).waitFor();
    const review = (await readState(page)).active;
    assert.ok(review.questions.every((q) => seen.has(q.key)));
    checks.push("Spaced repetition selects prior errors due today");
    for (const width of [320, 390, 768, 1100]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `quiz overflow ${width}`,
      );
      if (width === 390)
        await page.screenshot({
          path: path.join(root, "test-results/problem-mobile.png"),
          fullPage: true,
        });
    }
    await page
      .getByRole("button", { name: "Archimede, torna al percorso" })
      .click();
    for (const width of [320, 390, 768, 1100]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `dashboard overflow ${width}`,
      );
      if (width === 390)
        await page.screenshot({
          path: path.join(root, "test-results/dashboard-mobile.png"),
          fullPage: true,
        });
    }
    checks.push(
      "Dashboard and focused exam fit 320, 390, 768 and 1100 px screens",
    );
    assert.deepEqual(errors, []);
    checks.push("No browser JavaScript errors");
    const report = { passed: checks.length, checks };
    fs.writeFileSync(
      path.join(root, "test-results/browser-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await page.screenshot({
      path: path.join(root, "test-results/failure.png"),
      fullPage: true,
    });
    fs.writeFileSync(
      path.join(root, "test-results/failure.html"),
      await page.content(),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
