import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import (
    admin_router,
    auth_router,
    cart_router,
    checkout_router,
    products_router,
    stripe_router,
    wishlist_router,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Refuse to boot in production with a known placeholder JWT secret — anyone who knows the
    # default can forge admin tokens. In development we only warn so local setup stays frictionless.
    if settings.secret_is_insecure:
        message = (
            "SECRET_KEY is set to a public placeholder value. Generate one with "
            "`openssl rand -hex 32` and set it in the environment."
        )
    # Ensure all tables exist on startup (idempotent: does not touch or alter existing tables)
    try:
        from models import Base
        from db import engine
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logger.warning("Could not run create_all on startup: %s", exc)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(cart_router, prefix="/api")
app.include_router(checkout_router, prefix="/api")
app.include_router(stripe_router, prefix="/api")
app.include_router(wishlist_router, prefix="/api")
app.include_router(admin_router, prefix="/api")



@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "specsvision-fastapi"}
