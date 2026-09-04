import { existsSync, readdirSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Satu folder = satu tool (mirip cli.py): tiap folder yang punya index.html
// otomatis jadi halaman build. Tool baru = folder baru + satu <a> di index.html.
const root = import.meta.dirname;
const tools = readdirSync(root).filter((name) =>
  existsSync(`${root}/${name}/index.html`),
);

export default defineConfig({
  // Relative base so dist/ works from any static server subpath.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: `${root}/index.html`,
        ...Object.fromEntries(tools.map((t) => [t, `${root}/${t}/index.html`])),
      },
    },
  },
  optimizeDeps: {
    // ponytail: exclude ini khusus compress-images (jSquash WASM glue rusak
    // kalau di-pre-bundle). Pindah ke config per-tool kalau daftarnya memanjang.
    exclude: ["@jsquash/jpeg", "@jsquash/oxipng"],
  },
  test: {
    environment: "happy-dom",
    include: ["*/tests/**/*.test.ts"],
  },
});
