from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
from jose import jwt

from config import settings

Role = Literal["user", "admin"]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject_id: int, *, role: Role) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(subject_id), "role": role, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )
