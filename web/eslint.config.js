import globals from "globals";
import tseslint from "typescript-eslint";

// Flat config untuk seluruh web/ — semua tool (folder) di-lint dengan aturan
// yang sama. Tool-level config tidak perlu; cukup daftarkan globals tambahan
// di sini bila sebuah tool butuh environment khusus.
export default tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Prefix `_` = parameter/variabel sengaja tak dipakai (mis. placeholder
      // signature interface di test).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tool pages: UI di jendela utama (browser) dan kode Web Worker.
    files: ["**/src/**/*.ts", "**/tests/**/*.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
  {
    // Config build dijalankan Node saat dev/build.
    files: ["vite.config.ts", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
);
