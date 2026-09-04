# Compress Images

Kompresor gambar **100% client-side** — semua proses (decode, encode, download)
jalan di browser Anda. Gambar **tidak pernah dikirim ke server mana pun**.
Gratis, tanpa akun, tanpa batas ukuran.

## Jaminan privasi (dan cara verifikasinya)

- Nol dependency runtime untuk jalur default (Canvas API bawaan browser).
- Setelah `npm run build`, folder `dist/` berisi file statis murni — tidak ada
  analytics, tidak ada font/CDN eksternal.
- Verifikasi sendiri: buka DevTools → tab Network, lalu kompres gambar.
  Tidak ada satu request pun yang terkirim selama proses berjalan.
- Bonus: hasil kompresi otomatis **tanpa EXIF** (lokasi GPS, info device)
  karena re-encode hanya membawa pixel, bukan metadata.

## Menjalankan

Tool ini adalah satu halaman dari webapp utama `web/` (bukan project npm
tersendiri). Semua perintah dijalankan dari `web/`:

```bash
cd web
npm install

npm run dev        # dev server → buka http://localhost:5173/compress-images/
npm test           # unit test (Vitest)
npm run build      # produksi → dist/ (beserta halaman tool lain)
npm run preview    # sajikan hasil build secara lokal
```

> Catatan: hasil build adalah ES module + Web Worker, jadi buka via server
> statis (`npm run preview`), bukan langsung `file://`.

## Fitur

- Drag & drop banyak file sekaligus (batch, diproses lewat Web Worker — UI
  tidak pernah freeze)
- Format keluaran: **WebP** (paling kecil), JPEG, PNG (lossless)
- Slider kualitas + lebar maksimum opsional (tidak pernah upscale)
- Dua strategi encoder:
  - **Cepat (browser)** — Canvas API native, nol dependensi
  - **Kecil (MozJPEG / OxiPNG)** — WASM dari [jSquash](https://github.com/jamsinclair/jSquash)
- Catatan penghematan encoder (diuji langsung): **WebP hampir selalu paling
  kecil** — jadi ini default. Untuk JPEG, MozJPEG biasanya unggul di foto asli
  pada kualitas 80–95; pada gambar sintetis/grain berat hasilnya mirip encoder
  browser. Bandingkan sendiri lewat statistik per file yang tampil di UI.
- Statistik ukuran sebelum/sesudah + persentase penghematan per file
- Download per file atau semuanya sekaligus

## Arsitektur singkat

```
index.html + src/main.ts   UI: drop, kontrol, render hasil (tidak ada logika codec)
src/worker.ts              Jembatan pesan ⇄ encoder (tipis, tanpa logika)
src/core/                  Logika murni tanpa DOM — unit test penuh di Node
  ├─ types.ts              EncodeOptions, EncodeRequest/Response, clampQuality
  ├─ format.ts             formatBytes, savingsPercent, buildOutputFilename
  └─ protocol.ts           handleEncodeRequest: encoder di-inject, selalu resolve
src/encoders/
  ├─ imageEncoder.ts       Kontrak ImageEncoder (DIP — strategi bisa ditukar)
  ├─ canvasEncoder.ts      Encoder cepat berbasis OffscreenCanvas
  └─ wasmEncoders.ts       MozJpegEncoder + OxiPngEncoder (jSquash WASM)
```

Menambah codec baru = satu class `implements ImageEncoder` + satu cabang di
`worker.ts` — UI dan protokol tidak berubah.

## Konvensi kode

- **JSDoc** di semua fungsi/interface yang di-export (deskripsi, `@param`,
  `@returns`, `@throws` bila relevan).
- **SRP**: UI, orkestrasi worker, logika murni, dan codec dipisah modul.
- **DRY**: ukuran output dihitung lewat `fittedSize` yang sama di semua encoder;
  format tampilan lewat `format.ts`.
- **KISS**: vanilla TS tanpa framework; tidak ada abstraksi yang tidak dipakai.
- **TDD**: fitur core dikembangkan test-first (red → green → refactor) dengan
  Vitest. Bagian yang menyentuh canvas diuji lewat dependensi injectable,
  karena environment test tidak punya encoder canvas sungguhan.
