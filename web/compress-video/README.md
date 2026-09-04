# Compress Video

Kompresor video **100% client-side** — semua proses (demux, encode, mux)
jalan di browser Anda. Video **tidak pernah dikirim ke server mana pun**.
Gratis, tanpa akun.

## Jaminan privasi (dan cara verifikasinya)

- Encoding memakai WebCodecs, API bawaan browser — bukan upload ke server.
- Setelah `npm run build`, folder `dist/` berisi file statis murni — tidak ada
  analytics, tidak ada font/CDN eksternal.
- Verifikasi sendiri: buka DevTools → tab Network, lalu kompres video.
  Tidak ada satu request pun yang terkirim selama proses berjalan.

## Cara kerja singkat

- Mesin: [mediabunny](https://mediabunny.dev) di atas **WebCodecs** — encoder
  hardware-accelerated bawaan browser (jauh lebih cepat daripada ffmpeg.wasm).
- Input: format apapun yang bisa dibaca browser (MP4, WebM, MOV, MKV, …).
- Output: **MP4 (H.264/AVC)**, audio dipertahankan.
- Proses berjalan di Web Worker dengan progress bar dan tombol batal.

## Fitur

- **Mode Kualitas** — tiga preset: High / Balanced / Small.
- **Mode Target ukuran** — tentukan ukuran akhir (MB); bitrate video dihitung
  otomatis dari durasi (faktor pengaman 5%, budget audio 128 kbps
  dikurangkan lebih dulu). Target yang mustahil dicapai ditolak sebelum
  kompresi dimulai.
- Statistik sebelum → sesudah + persentase penghematan (jujur: ditandai juga
  bila hasilnya justru lebih besar).
- Progress bar + batal di tengah proses.
- Metadata file (ukuran, durasi, resolusi, ada/tidaknya audio) tampil sebelum
  kompresi.

## Dukungan browser

Butuh browser dengan **WebCodecs**:

| Browser | Versi minimum |
| --- | --- |
| Chrome / Edge | 94+ |
| Safari | 16.4+ |
| Firefox | 130+ |

Di browser lain, halaman menampilkan pesan bahwa tool tidak bisa berjalan.
*(Sengaja tidak ada fallback ffmpeg.wasm — KISS; lihat "Out of scope" di
`tasks/plan.md`.)*

## Batasan

- Video dengan durasi/resolusi ekstrem dibatasi memori browser (praktisnya
  beberapa GB file input; WebCodecs mem-stream frame sehingga jauh lebih
  ringan daripada pendekatan in-memory).
- Encoder browser mendekati target bitrate secara VBR: untuk konten yang
  mudah dikompres, hasil bisa **lebih kecil** dari target — bukan kekurangan.
- Tidak ada pilihan resolusi, hapus audio, atau trim (v1 sengaja minimal).

## Menjalankan

Tool ini adalah satu halaman dari webapp utama `web/` (bukan project npm
tersendiri). Semua perintah dijalankan dari `web/`:

```bash
cd web
npm install

npm run dev        # dev server → buka http://localhost:5173/compress-video/
npm test           # unit test (Vitest)
npm run lint       # ESLint (seluruh web/)
npm run typecheck  # tsc --noEmit
npm run build      # produksi → dist/ (beserta halaman tool lain)
npm run preview    # sajikan hasil build secara lokal
```

> Catatan: hasil build adalah ES module + Web Worker, jadi buka via server
> statis (`npm run preview`), bukan langsung `file://`.

## Arsitektur singkat

```
index.html + src/main.ts   UI: drop, mode, progress, hasil (tidak ada logika encode)
src/worker.ts              Jembatan pesan ⇄ compressor + kanal batal (tipis)
src/videoCompressor.ts     Wrapper mediabunny: probe + compress (satu-satunya
                           modul yang menyentuh WebCodecs)
src/core/                  Logika murni tanpa DOM — unit test penuh di Node
  ├─ types.ts              Domain types, kontrak VideoCompressor (DIP)
  ├─ settings.ts           Preset kualitas + hitung bitrate target
  ├─ protocol.ts           handleCompressionRequest: compressor di-inject
  └─ format.ts             formatBytes, formatDuration, savingsPercent
tests/                     Unit test Vitest (happy-dom)
```

Mengganti mesin encoding = satu object `implements VideoCompressor` — UI,
protokol, dan worker tidak berubah.

## Konvensi kode

- **JSDoc** di semua fungsi/interface yang di-export (deskripsi, `@param`,
  `@returns`, `@throws` bila relevan).
- **SRP**: UI, orkestrasi worker, logika murni, dan wrapper codec dipisah
  modul; hanya `videoCompressor.ts` yang tahu mediabunny.
- **DRY**: estimasi target di UI memakai `computeTargetBitrate` yang sama
  dengan jalur kompresi; format tampilan lewat `format.ts`.
- **KISS**: vanilla TS tanpa framework; tidak ada abstraksi yang tidak
  dipakai.
- **TDD**: fitur core dikembangkan test-first (red → green → refactor).
  Logika murni diuji di Node; wrapper WebCodecs dijaga tipis dan
  diverifikasi E2E di browser (happy-dom tidak punya WebCodecs).
