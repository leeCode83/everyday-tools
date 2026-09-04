#!/usr/bin/env python3
"""Entry point utama everyday-tools.

Setiap folder di dalam tools/ otomatis terdaftar sebagai subcommand CLI.
"""

import argparse
import importlib
import pkgutil
import sys

import tools


def discover_tools():
    """Scan isi package tools/ dan kembalikan instance Tool dari tiap folder."""
    found = []
    for module_info in pkgutil.iter_modules(tools.__path__):
        if not module_info.ispkg:
            continue
        module = importlib.import_module(f"tools.{module_info.name}")
        tool = getattr(module, "tool", None)
        if tool is None:
            print(
                f"peringatan: tools.{module_info.name} tidak mengekspor 'tool', dilewati",
                file=sys.stderr,
            )
            continue
        found.append(tool)
    return sorted(found, key=lambda t: t.name)


def build_parser(tool_instances):
    parser = argparse.ArgumentParser(
        prog="everyday-tools",
        description="Kumpulan CLI tools untuk keperluan pribadi.",
    )
    subparsers = parser.add_subparsers(dest="tool", required=True, metavar="<tool>")
    for tool in tool_instances:
        sub = subparsers.add_parser(tool.name, help=tool.help, description=tool.help)
        tool.configure_parser(sub)
        sub.set_defaults(_tool=tool)
    return parser


def main(argv=None):
    parser = build_parser(discover_tools())
    args = parser.parse_args(argv)
    args._tool.run(args)


if __name__ == "__main__":
    main()
