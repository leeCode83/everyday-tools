# Implementation Plan: Compress Video (client-side, privacy-first)

## Overview

Web tool kompresi video 100% client-side di `web/compress-video/` dalam monorepo
`everyday-tools`. Video dikompres di browser via **mediabunny** (WebCodecs,
hardware-accelerated) — tidak ada byte video yang keluar device. Tool ini
terpisah total dari `compress-images` (folder sendiri, dependency sendiri, nol
import bersama). Dikembangkan dengan TDD, JSDoc, prinsip DRY/KISS/SRP, dan
commit kecil per task di branch `feat/compress-video`.

## Architecture Decisions

1. **mediabunny (WebCodecs), bukan ffmpeg.wasm.** Hardware-accelerated (10x
   lebih cepat dari WASM software encoding), bundle kecil (~50kB vs core 31MB),
   tanpa header COOP/COEP. API `Conversion` menangani demux → encode → mux
   sekaligus. Browser modern saja (Chrome 94+, Safari 16.4+, Firefox 130+);
   feature-detect `VideoEncoder` → pesan error jelas.
2. **Isolasi penuh dari compress-images.** Satu folder = satu tool (konvensi
   repo); Vite otomatis mendaftarkan halaman baru. Verifikasi grep di final gate.
3. **Logika murni di `src/core/` (SRP + testability).** Preset kualitas,
   hitungan bitrate target, kontrak worker — semuanya pure dan diuji di Node
   via Vitest (happy-dom). Bagian yang butuh WebCodecs diisolasi di wrapper
   tipis `videoCompressor.ts`.
4. **Worker bridge + DIP.** Interface `VideoCompressor` di-inject ke
   `handleCompressionRequest` → protocol diuji dengan fake compressor, worker
   tinggal pemasang kabel.
5. **Output MP4** (codec dipilih mediabunny otomatis, default AVC), audio
   dipertahankan dengan kualitas mengikuti mode.
6. **Kontrol kompresi (KISS):** mode *Kualitas* (preset High/Balanced/Small)
   atau *Target ukuran* (MB) — bitrate dihitung dari durasi:
   `(targetBytes × 8 × 0.95 / durasi) − budgetAudio(128 kbps)`, clamp minimum,
   error bila mustahil.

## API mediabunny yang dipakai (terverifikasi via context7)

`Input({formats: ALL_FORMATS, source: new BlobSource(file)})`,
`input.computeDuration()`, `input.getPrimaryVideoTrack()`/`getPrimaryAudioTrack()`,
`Output({format: new Mp4OutputFormat(), target: new BufferTarget()})`,
`Conversion.init({input, output, video: {quality}, audio: {quality}})`,
`new Quality('high' | 'medium' | 'low')` / `new Quality({bitrate})`,
`conversion.isValid` / `conversion.discardedTracks`, `conversion.onProgress`,
`conversion.cancel()`, `await conversion.execute()`, `output.target.buffer`.

## Struktur target

```
web/compress-video/
├── index.html                  → satu halaman tool (copy Bahasa Indonesia)
├── README.md                   → cara pakai, dukungan browser, batasan
├── src/
│   ├── main.ts                 → UI: drop zone, mode, progress, download
│   ├── style.css               → CSS milik tool ini
│   ├── worker.ts               → bridge tipis: request → compressor → postMessage
│   ├── videoCompressor.ts      → wrapper mediabunny (probe + compress)
│   └── core/
│       ├── types.ts            → domain types (metadata, request, result)
│       ├── settings.ts         → preset kualitas + hitung bitrate target
│       ├── protocol.ts         → union pesan worker + handleCompressionRequest
│       └── format.ts           → formatBytes, formatDuration, savingsPercent
└── tests/                      → *.test.ts (Vitest, happy-dom)
```

## Task List

### Phase 0: Foundation
- Task 1: Arsipkan plan lama (tasks/archive/) + tulis plan/todo baru.
- Task 2: ESLint 9 flat config + typescript-eslint project-wide, scripts
  `lint` + `typecheck`, bereskan pelanggaran existing.

### Phase 1: Core logic (TDD, tanpa DOM)
- Task 3: core/format.ts — formatBytes, formatDuration, savingsPercent.
- Task 4: core/types.ts + core/settings.ts — QUALITY_PRESETS,
  resolveVideoQuality, computeTargetBitrate (safety 0.95, budget audio
  128 kbps, clamp minimum, TargetTooSmallError).
- Task 5: core/protocol.ts — union pesan + handleCompressionRequest
  (compressor di-inject).

### Phase 2: Encoding integration
- Task 6: install mediabunny + videoCompressor.ts (probeVideoFile,
  compressVideo, buildConversionOptions pure).
- Task 7: worker.ts — bridge tipis + feature-detect WebCodecs.
- Task 8: UI — index.html + style.css + main.ts (drop, mode, progress,
  batal, hasil before→after, download, error Bahasa Indonesia).

### Phase 3: Integration + dokumentasi
- Task 9: Kartu tool di web/index.html + README compress-video.
- Task 10: Final gate — grep isolasi, lint/typecheck/test/build, preview dist.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| WebCodecs tidak ada di browser lama | Med | Feature-detect `VideoEncoder` → pesan error jelas; didokumentasikan di README |
| typescript-eslint vs TypeScript 7 | Low | Umumnya warning versi saja; bila hard-fail, selaraskan versi |
| Video besar → memori browser | Med | mediabunny streaming; batasan ~2GB didokumentasikan jujur |
| happy-dom tak punya WebCodecs | Med | Logika murni pindah ke core/ (teruji); wrapper+worker tipis, E2E manual |
| Target size mustahil untuk video panjang | Low | TargetTooSmallError + clamp + safety factor, diuji unit |

## Out of scope (v1)

Fallback ffmpeg.wasm, pilihan resolusi, hapus audio, trim/crop, PWA, CI
workflow, chunking video besar.
