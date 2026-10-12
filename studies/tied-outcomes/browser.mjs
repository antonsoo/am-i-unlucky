import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { URL, URLSearchParams } from "node:url";
import { chromium, firefox } from "@playwright/test";
import { browserCases } from "./cases.mjs";
const [distArg, output, mode, screenshots] = process.argv.slice(2);
const dist = resolve(distArg);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const served = new Map();
await mkdir(screenshots, { recursive: true });
async function serve() {
  const server = createServer(async (req, res) => {
    const name =
      new URL(req.url, "http://localhost").pathname.replace(
        /^\/am-i-unlucky\//,
        "",
      ) || "index.html";
    const path = resolve(dist, name);
    if (!path.startsWith(dist + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const bytes = await readFile(path);
      served.set(name, { path: name, bytes: bytes.length, sha256: sha(bytes) });
      res
        .writeHead(200, {
          "Content-Type":
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".woff2": "font/woff2",
            }[extname(path)] ?? "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  let closed = false;
  return {
    url: `http://127.0.0.1:${server.address().port}/am-i-unlucky/`,
    async close() {
      if (closed) return;
      closed = true;
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    },
  };
}
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375])
      for (const entry of browserCases) {
        const server = await serve(),
          context = await browser.newContext({
            viewport: { width, height: 950 },
          });
        try {
          const page = await context.newPage(),
            errors = [],
            lateRequests = [];
          let stopped = false;
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("request", (r) => {
            if (stopped && /^https?:/.test(r.url())) lateRequests.push(r.url());
          });
          await page.addInitScript(() => {
            globalThis.cardText = [];
            globalThis.csp = [];
            const native =
              globalThis.CanvasRenderingContext2D.prototype.fillText;
            globalThis.CanvasRenderingContext2D.prototype.fillText = function (
              text,
              ...args
            ) {
              if (this.canvas.id === "luck-card-canvas")
                globalThis.cardText.push(text);
              return native.call(this, text, ...args);
            };
            globalThis.document.addEventListener(
              "securitypolicyviolation",
              (e) => globalThis.csp.push(e.violatedDirective),
            );
          });
          await page.goto(server.url + "?" + new URLSearchParams(entry.query));
          const panel = page
            .locator(`#${entry.query.mode}-results .panel`)
            .first();
          await panel.locator(".luck-verdict-headline").waitFor();
          await page.evaluate(() => globalThis.document.fonts.ready);
          await server.close();
          stopped = true;
          const headline = await panel
            .locator(".luck-verdict-headline")
            .innerText();
          assert.equal(
            headline,
            mode === "baseline" ? "Unlucky" : "About average",
          );
          const stem = `${engine}-${width}-${entry.name}`;
          await page.screenshot({
            path: resolve(screenshots, stem + ".png"),
            fullPage: true,
          });
          const text = await panel.innerText();
          const stats = await panel
            .locator(".stat-tile-value")
            .allTextContents();
          if (mode !== "baseline") {
            const values = await panel
              .locator(".luck-comparison dd")
              .allTextContents();
            assert.deepEqual(
              values,
              [
                entry.expected.earlier,
                entry.expected.tied,
                entry.expected.later,
              ].map((v) => `${100 * v}%`),
            );
          }
          await page.getByRole("button", { name: "Export luck card" }).click();
          const pending = page.waitForEvent("download");
          await page.getByRole("button", { name: "Download PNG" }).click();
          const download = await pending,
            bytes = await readFile(await download.path());
          assert.equal(
            download.suggestedFilename(),
            "am-i-unlucky-luck-card.png",
          );
          assert.equal(
            bytes.subarray(0, 8).toString("hex"),
            "89504e470d0a1a0a",
          );
          assert.equal(bytes.readUInt32BE(16), 1080);
          assert.equal(bytes.readUInt32BE(20), 1350);
          await writeFile(resolve(screenshots, stem + "-card.png"), bytes);
          const cardText = await page.evaluate(() => globalThis.cardText);
          if (mode !== "baseline") {
            for (const [i, label] of [
              "FINISHED SOONER",
              "SAME ATTEMPT",
              "TOOK LONGER",
            ].entries()) {
              const index = cardText.indexOf(label);
              assert.ok(index > 0);
              assert.equal(
                cardText[index - 1],
                `${100 * [entry.expected.earlier, entry.expected.tied, entry.expected.later][i]}%`,
              );
            }
            assert.ok(cardText.includes("COMMON"));
          }
          const csp = await page.evaluate(() => globalThis.csp);
          const overflow = await page.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth -
              globalThis.innerWidth,
          );
          assert.ok(overflow <= 0);
          assert.deepEqual(errors, []);
          if (mode !== "baseline") assert.deepEqual(lateRequests, []);
          assert.deepEqual(csp, []);
          results.push({
            engine,
            version: browser.version(),
            width,
            name: entry.name,
            query: entry.query,
            expected: entry.expected,
            headline,
            text,
            stats,
            cardText,
            cardSha256: sha(bytes),
            serverStoppedBeforeExport: true,
            errors,
            lateRequests,
            csp,
            overflow,
          });
        } finally {
          await context.close();
          await server.close();
        }
      }
  } finally {
    await browser.close();
  }
}
await writeFile(
  output,
  JSON.stringify(
    {
      mode,
      servedAssets: [...served.values()].sort((a, b) =>
        a.path.localeCompare(b.path),
      ),
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${results.length} offline browser/card cases captured (${mode})`);
