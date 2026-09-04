# Implementation Plan: Compress Images (client-side, privacy-first)

## Overview

Web app kompresi gambar 100% client-side di `web/compress-images/` dalam monorepo `everyday-tools`. Semua proses (decode, encode, download) jalan di browser — tidak ada byte gambar yang keluar device. Stack: TypeScript + Vite, vanilla (tanpa framework), Web Worker untuk encode, Vitest untuk unit test. Fase akhir upgrade encoder ke jSquash (MozJPEG/OxiPNG) di belakang interface yang sama.

Notasi dokumentasi kode: **JSDoc** (deskripsi, `@param`, `@returns`, `@throws` untuk semua export).

## Architecture Decisions

1. **Vanilla TS, tanpa framework (KISS).** UI satu halaman sederhana: drop file, slider kualitas, tombol download.
2. **Logika murni dipisah dari DOM (SRP + testability).** Fungsi non-UI murni di `src/core/` — diuji di Node tanpa browser nyata. `happy-dom`/`jsdom` tidak punya canvas encoder sungguhan, jadi bagian yang menyentuh canvas diisolasi di balik interface.
3. **Interface `ImageEncoder` (DIP/DRY).** Kontrak tunggal `encode(imageData, options): Promise<Blob>`. Implementasi: `CanvasEncoder` (MVP), `MozJpegEncoder`/`OxiPngEncoder` (jSquash, fase akhir). Penambahan codec tidak menyentuh worker/UI.
4. **Web Worker sejak awal.** `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` (pola resmi Vite). UI tidak freeze saat batch encode.
5. **Privasi terverifikasi.** Nol dependency runtime di MVP. Hasil `dist/` murni statis, dijalankan via `npx serve dist` — nol network call saat dipakai.
6. **Pengujian: TDD (red–green–refactor).** Tiap task dimulai dari test gagal. Fungsi canvas-dependent diuji lewat fake/injectable.
7. **Dokumentasi kode: JSDoc** di semua fungsi/interface yang di-export.

## Struktur target

```
web/compress-images/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts          (+ konfigurasi test Vitest)
├── src/
│   ├── main.ts             → UI: drag-drop, slider, render hasil
│   ├── worker.ts           → terima EncodeRequest, panggil encoder, balas EncodeResponse
│   ├── core/
│   │   ├── types.ts        → EncodeOptions, EncodeRequest/Response, CompressionResult
│   │   ├── format.ts       → formatBytes, savingsPercent, buildOutputFilename
│   │   └── protocol.ts     → handleEncodeRequest (murni, encoder di-inject)
│   ├── encoders/
│   │   ├── imageEncoder.ts → interface ImageEncoder
│   │   └── canvasEncoder.ts→ implementasi via OffscreenCanvas/canvas.toBlob
│   └── style.css
└── tests/                  → *.test.ts (Vitest, environment happy-dom)
```

## Task List

### Phase 1: Foundation
- [ ] Task 1: tasks/plan.md + tasks/todo.md + scaffold Vite + TypeScript
- [ ] Task 2: Setup Vitest + happy-dom

### Checkpoint Foundation: `npm test` hijau, `npm run build` sukses, dev server jalan.

### Phase 2: Core logic (TDD, tanpa DOM)
- [ ] Task 3: core/format.ts — formatBytes, savingsPercent, buildOutputFilename
- [ ] Task 4: core/types.ts + encoders/imageEncoder.ts — kontrak + clampQuality
- [ ] Task 5: encoders/canvasEncoder.ts — encoder MVP (dependensi injectable)
- [ ] Task 6: core/protocol.ts + worker.ts — handler murni, worker tipis

### Checkpoint Core Logic: semua unit test hijau, cakupan core tinggi, belum ada UI.

### Phase 3: UI (integrasi vertikal)
- [ ] Task 7: main.ts — alur dasar satu file (drop, slider, encode, download)
- [ ] Task 8: batch multi-file + status per file + download semua

### Checkpoint UI: alur end-to-end jalan via `npm run dev` dan `npx serve dist`.

### Phase 4: Upgrade encoder + dokumentasi
- [ ] Task 9: jSquash encoder (MozJPEG, OxiPNG) di balik interface sama + fallback
- [ ] Task 10: README + final pass JSDoc/DRY/KISS/SRP

### Checkpoint Complete: semua acceptance criteria terpenuhi, siap review.

## Yang sengaja tidak ada di v1 (KISS)

ZIP batch download (JSZip), PWA/service worker offline, resize/crop, AVIF, background removal. Bisa ditambah belakangan tanpa ubah arsitektur.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| happy-dom/jsdom tidak punya encoder canvas asli | High | Logic murni di core/ diuji penuh di Node; jalur canvas diisolasi di balik `ImageEncoder` + dependensi injectable |
| WASM jSquash ribet di-bundle Vite | Medium | Fase terakhir, terpisah; CanvasEncoder fallback |
| ES module build tidak jalan via `file://` | Low | Dokumentasikan `npx serve dist`; `base: './'` |
| PNG via canvas hasil besar (tanpa optimasi) | Low | OxiPNG di Task 9; dokumentasikan WebP sebagai default |
| Windows: perintah npm di Git Bash | Low | `npm run ...` standar |
