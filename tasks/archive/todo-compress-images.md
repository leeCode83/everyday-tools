# Todo: Compress Images

## Phase 1: Foundation
- [x] Task 1: tasks/plan.md + todo.md + scaffold Vite + TypeScript
- [x] Task 2: Setup Vitest + happy-dom

### Checkpoint Foundation
- [x] `npm test` hijau, `npm run build` sukses, dev server jalan

## Phase 2: Core logic (TDD)
- [x] Task 3: core/format.ts
- [x] Task 4: core/types.ts + encoders/imageEncoder.ts
- [x] Task 5: encoders/canvasEncoder.ts
- [x] Task 6: core/protocol.ts + worker.ts

### Checkpoint Core Logic
- [x] Semua unit test hijau (35 test), belum ada UI

## Phase 3: UI
- [x] Task 7: main.ts alur dasar satu file
- [x] Task 8: batch multi-file

### Checkpoint UI
- [x] End-to-end terverifikasi di browser: drop 2+ file, statistik, download, nol network request eksternal

## Phase 4: Upgrade + dokumentasi
- [x] Task 9: jSquash encoder MozJPEG/OxiPNG + fallback
- [x] Task 10: README + final pass JSDoc/DRY/KISS/SRP

### Checkpoint Complete
- [x] Semua acceptance criteria terpenuhi, siap review

## Catatan verifikasi E2E (browser nyata, dist/ di-serve lokal)

- Batch 2 file (PNG + JPEG) terproses, statistik before → after + % tampil benar.
- Encoder "small" (MozJPEG) bekerja; bug awal skala kualitas (0–1 vs 0–100)
  ditemukan lewat E2E dan diperbaiki + test diperbarui.
- File non-gambar → pesan error jelas, tidak crash.
- Privasi: semua resource berasal dari origin server lokal; nol request
  eksternal selama kompresi.
- Penghematan MozJPEG vs canvas di sampel sintetis: hampir setara; WebP
  tetap format paling kecil. README ditulis jujur soal ini.
