"""Kontrak dasar untuk semua tool."""


class Tool:
    """Satu tool CLI.

    Setiap folder di tools/ mendefinisikan satu subclass Tool dan menaruh
    instance-nya di variabel `tool` pada __init__.py agar terdaftar otomatis
    oleh cli.py.
    """

    name: str = ""
    help: str = ""

    def configure_parser(self, parser):
        """Daftarkan argumen/flag khusus tool ini (opsional)."""

    def run(self, args):
        """Jalankan tool. `args` berisi hasil parse argparse."""
        raise NotImplementedError
