"""Logika inti tool genpass, terpisah dari wiring CLI."""

import secrets
import string


def generate_password(length=16, use_symbols=True):
    pool = string.ascii_letters + string.digits
    if use_symbols:
        pool += string.punctuation
    return "".join(secrets.choice(pool) for _ in range(length))
