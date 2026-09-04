"""Contoh tool: generator password acak. Bisa dihapus atau dijadikan template."""

from tools.base import Tool
from tools.genpass.service import generate_password


class GenpassTool(Tool):
    name = "genpass"
    help = "Generate password acak yang aman"

    def configure_parser(self, parser):
        parser.add_argument(
            "-l",
            "--length",
            type=int,
            default=16,
            help="panjang password (default: 16)",
        )
        parser.add_argument(
            "--no-symbols",
            action="store_true",
            help="hilangkan simbol dari password",
        )

    def run(self, args):
        print(generate_password(length=args.length, use_symbols=not args.no_symbols))


tool = GenpassTool()
