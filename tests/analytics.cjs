// Run after VERCEL=1 npm run build, against the local production server.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let requested = false;
    await page.route("**/_vercel/insights/script.js", (route) => {
      requested = true;
      return route.fulfill({
        contentType: "application/javascript",
        body: "window.__analyticsScriptLoaded=true;",
      });
    });
    await page.goto(process.env.APP_URL || "http://127.0.0.1:8787");
    await page
      .getByRole("heading", { name: "Il tuo percorso, in chiaro." })
      .waitFor();
    await page.waitForFunction(() => window.__analyticsScriptLoaded === true);
    assert.equal(requested, true);
    const result = await page.evaluate(() => {
      const queue = window.vaq || [];
      const callback = queue
        .filter(([kind]) => kind === "beforeSend")
        .at(-1)?.[1];
      return {
        sanitized: callback?.({
          type: "pageview",
          url: "https://example.com/dashboard?name=Ada&answer=A#private-note",
        }),
        pageview: queue.filter(([kind]) => kind === "pageview").at(-1)?.[1],
      };
    });
    assert.equal(result.sanitized.url, "https://example.com/dashboard");
    assert.equal(result.pageview.path, "/dashboard");
    await page
      .getByRole("button", { name: "Allenamento", exact: true })
      .click();
    const paths = await page.evaluate(() =>
      (window.vaq || [])
        .filter(([kind]) => kind === "pageview")
        .map(([, args]) => args.path),
    );
    assert.ok(paths.includes("/train"));
    assert.ok(paths.every((p) => /^\/[a-z]+$/.test(p)));
    console.log(
      JSON.stringify(
        {
          analytics: "passed",
          checks: [
            "Vercel production script included",
            "Anonymous SPA pageviews",
            "Query and hash removed",
            "No personal answers or names in view paths",
          ],
          liveCollection:
            "Requires enabling Analytics in the user’s Vercel project after deployment.",
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
