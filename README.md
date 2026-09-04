# everyday-tools

Kumpulan tools untuk keperluan pribadi, dua jenis:

1. **CLI tools (Python)** — dijalankan lewat satu entry point: `cli.py`.
   Semua dependency ter-install di dalam venv (`.venv/`), tidak ada yang
   ter-install global.
2. **Web tools (TypeScript)** — satu webapp utama di folder `web/` (Vite,
   multi-page app). `web/index.html` adalah homepage berisi daftar semua tool;
   satu folder di `web/` = satu halaman tool. Semua diproses 100% di browser.

## Struktur

```
everyday-tools/
├── cli.py                  # CLI utama Python (satu-satunya entry point)
├── requirements.txt        # daftar dependency projek Python
├── .venv/                  # virtual environment (semua dependency di sini)
├── tools/                  # kumpulan CLI tool, satu folder = satu tool/service
│   ├── base.py             # kontrak dasar Tool (name, help, configure_parser, run)
│   └── genpass/            # contoh tool — bisa dihapus / dijadikan template
│       ├── __init__.py     # wiring CLI: class Tool + argumen command line
│       └── service.py      # logika inti tool, terpisah dari CLI
└── web/                    # webapp utama (satu project Vite untuk semua web tool)
    ├── index.html          # homepage: daftar semua tool
    ├── vite.config.ts      # auto-discover folder tool yang punya index.html
    └── compress-images/    # halaman tool: kompresor gambar 100% client-side
        ├── index.html      #   UI tool
        ├── src/            #   kode TS + CSS tool
        └── tests/          #   unit test (Vitest)
```

## Setup (sekali saja)

```bash
python -m venv .venv
source .venv/Scripts/activate     # Git Bash
pip install -r requirements.txt
```

## Menjalankan

Selalu jalankan lewat Python dari venv:

```bash
.venv/Scripts/python cli.py --help
.venv/Scripts/python cli.py genpass
.venv/Scripts/python cli.py genpass -l 24 --no-symbols
```

Atau setelah mengaktifkan venv cukup `python cli.py ...`.

### Webapp

```bash
cd web
npm install        # sekali saja
npm run dev        # dev server — buka http://localhost:5173 (homepage)
npm test           # unit test semua tool (Vitest)
npm run build      # produksi → dist/ (statis, multi-page)
npm run preview    # sajikan hasil build secara lokal
```

> Hasil build memakai ES module + Web Worker, jadi sajikan lewat server statis
> (`npm run preview` / `npx serve dist`), bukan langsung `file://`.

## Menambah tool baru

### Tool CLI

1. Buat folder baru di `tools/`, misal `tools/kalkulator/`.
2. Buat `service.py` berisi logika inti tool.
3. Buat `__init__.py` yang mendefinisikan subclass `Tool` dari `tools.base`,
   lalu ekspor instance-nya sebagai variabel `tool`.
4. Selesai — `cli.py` otomatis mendaftarkan folder tersebut sebagai subcommand
   (tidak perlu mengubah `cli.py` sama sekali).

Contoh kerangka `tools/kalkulator/__init__.py`:

```python
from tools.base import Tool
from tools.kalkulator.service import jumlahkan


class KalkulatorTool(Tool):
    name = "kalkulator"
    help = "Menjumlahkan dua angka"

    def configure_parser(self, parser):
        parser.add_argument("a", type=int)
        parser.add_argument("b", type=int)

    def run(self, args):
        print(jumlahkan(args.a, args.b))


tool = KalkulatorTool()
```

Kalau tool butuh dependency baru, tambahkan ke `requirements.txt` lalu jalankan
`.venv/Scripts/pip install -r requirements.txt`.

### Tool web

1. Buat folder baru di `web/` yang punya `index.html` dan `src/`, misal
   `web/kalkulator/` (salin pola dari `web/compress-images/`).
2. Tambahkan satu `<li>` berisi link ke folder itu di `web/index.html`.
3. Selesai — `vite.config.ts` otomatis mendaftarkan halaman itu untuk dev &
   build; dependency tool (kalau ada) tambahkan ke `web/package.json`.
