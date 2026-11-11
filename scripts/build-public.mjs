import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
// All canonical question images plus published variants are served by the CDN.
await rm(resolve(root, "frontend/public/assets"), {
  recursive: true,
  force: true,
});
await mkdir(resolve(root, "frontend/public/assets"), { recursive: true });
for (const name of await readdir(resolve(root, "web/assets"))) {
  if (name.endsWith(".png"))
    await cp(
      resolve(root, "web/assets", name),
      resolve(root, "frontend/public/assets", name),
    );
}
await rm(resolve(root, "frontend/public/data/originals"), {
  recursive: true,
  force: true,
});
await mkdir(resolve(root, "frontend/public/data/originals"), {
  recursive: true,
});
const corpus = JSON.parse(
  await (
    await import("node:fs/promises")
  ).readFile(resolve(root, "data/corpus.json"), "utf8"),
);
const paths = new Set(
  corpus.exams.flatMap((e) => [e.pdf, e.solution_pdf]).filter(Boolean),
);
paths.add("/data/originals/supplement-2001/bruni-2001.pdf");
for (const path of paths) {
  const relative = path.replace(/^\//, "");
  await mkdir(resolve(root, "frontend/public", relative, ".."), {
    recursive: true,
  });
  await cp(resolve(root, relative), resolve(root, "frontend/public", relative));
}
console.log(
  `Prepared ${paths.size} source PDFs and question images for the CDN.`,
);
