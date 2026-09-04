# everyday-tools

Kumpulan tools untuk keperluan pribadi, dua jenis:

1. **CLI tools (Python)** — dijalankan lewat satu entry point: `cli.py`.
   Semua dependency ter-install di dalam venv (`.venv/`), tidak ada yang
   ter-install global.
2. **Web tools (TypeScript)** — di folder `web/`, satu folder = satu web app
   statis yang bisa dijalankan lokal. Semua diproses 100% di browser.

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
└── web/                    # kumpulan web tool, satu folder = satu app
    └── compress-images/    # kompresor gambar 100% client-side (lihat README-nya)
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

## Menambah tool baru

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
