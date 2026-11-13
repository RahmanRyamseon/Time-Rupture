// Copies Tesseract worker, WASM core and the English + Arabic language models into
// public/ocr so scanning works without any third-party CDN at runtime.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");
const out = join(root, "public", "ocr");
mkdirSync(join(out, "core"), { recursive: true });
mkdirSync(join(out, "lang"), { recursive: true });

cpSync(join(nm, "tesseract.js/dist/worker.min.js"), join(out, "worker.min.js"));
for (const f of [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
]) {
  cpSync(join(nm, "tesseract.js-core", f), join(out, "core", f));
}
for (const lang of ["eng", "ara"]) {
  const src = join(nm, `@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`);
  if (!existsSync(src)) throw new Error(`Missing language data: ${src}`);
  cpSync(src, join(out, "lang", `${lang}.traineddata.gz`));
}
console.log("OCR assets copied to public/ocr");
