const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    let starts = 0;
    page.on("request", (r) => {
      if (r.url().includes("action=start")) starts++;
    });
    await page.goto("http://127.0.0.1:8787");
    await page
      .getByRole("button", { name: "Allenamento", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Prova ufficiale", exact: true })
      .click();
    for (const [id, minutes, count] of [
      ["2016-gara-1", 110, 20],
      ["2021-online-1", 60, 12],
      ["2025-gara-1", 100, 16],
    ]) {
      if (id !== "2016-gara-1") {
        await page
          .getByRole("button", { name: "Allenamento", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Prova ufficiale", exact: true })
          .click();
      }
      await page.locator(".setup select").first().selectOption(id);
      const duration = page.getByRole("spinbutton", {
        name: "Durata della gara",
        exact: true,
      });
      assert.equal(await duration.inputValue(), String(minutes));
      assert.notEqual(await duration.getAttribute("readonly"), null);
      const before = starts;
      await page
        .getByRole("button", { name: "Inizia la simulazione", exact: false })
        .click();
      await page
        .getByRole("heading", { name: "Prima di iniziare", exact: true })
        .waitFor();
      assert.equal(starts, before);
      assert.match(
        await page.locator(".rule-summary").last().innerText(),
        new RegExp(`${minutes}`),
      );
      const link = await page
        .locator("dialog .rule-summary a")
        .first()
        .getAttribute("href");
      assert.ok(
        link.startsWith("/data/originals/") ||
          link.startsWith("https://olimpiadi.dm.unibo.it/"),
      );
      if (id === "2025-gara-1")
        await page.screenshot({
          path: "test-results/official-rules-desktop.png",
          fullPage: true,
        });
      const response = page.waitForResponse((r) =>
        r.url().includes("action=start"),
      );
      await page
        .getByRole("button", {
          name: `Avvia simulazione · ${minutes} min`,
          exact: false,
        })
        .click();
      const a = await (await response).json();
      assert.equal(a.minutes, minutes);
      assert.equal(a.fidelity, "official");
      assert.equal(a.deadline - a.started, minutes * 60000);
      assert.equal(a.questions.length, count);
      await page.getByRole("heading", { name: /Problema 1/ }).waitFor();
      assert.match(
        await page.locator(".fidelity-label").innerText(),
        /Simulazione/,
      );
      await page
        .getByRole("button", { name: "Termina la prova", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Consegna e correggi", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Ora, capiamo il perché." })
        .waitFor();
      assert.match(
        await page.locator(".result-score").innerText(),
        new RegExp(`^${count}`),
      );
      console.log(
        `${id}: ${minutes} minutes, ${count} questions, rules before timer, correct blank scoring`,
      );
    }
    await page.getByRole("button", { name: "Apri il mio spazio" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Esporta backup", exact: false })
      .click();
    const download = await downloadPromise;
    const backup = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
    assert.equal(backup.sessions.length, 3);
    assert.ok(
      backup.sessions.every(
        (s) => s.fidelity === "official" && s.rules.minutes === s.minutes,
      ),
    );
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "official-backup.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup)),
      });
    await page
      .getByRole("status")
      .filter({ hasText: /Backup importato/ })
      .waitFor();
    const freshDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Esporta backup", exact: false })
      .click();
    const fresh = JSON.parse(
      fs.readFileSync(await (await freshDownload).path(), "utf8"),
    );
    assert.equal(fresh.sessions.length, 3);
    assert.ok(
      fresh.sessions.every(
        (s) => s.fidelity === "official" && s.rules.minutes === s.minutes,
      ),
    );
    console.log(
      "Official fidelity and sourced rules survive backup round-trip.",
    );
  } catch (e) {
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
