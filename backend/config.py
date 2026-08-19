from decimal import Decimal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Placeholder secrets that must never be used in production. Startup fails on these when
# environment == "production" (see main.lifespan).
INSECURE_SECRETS: frozenset[str] = frozenset(
    {
        "change-me-in-production-use-openssl-rand-hex-32",
        "change-me-use-openssl-rand-hex-32-in-production",
    }
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SpecsVision API"
    environment: str = "development"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    database_url: str = "postgresql+psycopg://specsvision:specsvision@localhost:5432/specsvision"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Checkout pricing.
    tax_rate: Decimal = Decimal("0.08")
    shipping_fee: Decimal = Decimal("9.99")
    free_shipping_threshold: Decimal = Decimal("100.00")


    supabase_url: str = "https://vgcyusidafgtlscefjch.supabase.co/rest/v1/"
    supabase_service_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnY3l1c2lkYWZndGxzY2VmamNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA0ODA2OCwiZXhwIjoyMTAyNjI0MDY4fQ.6hjBzY-AKxl4Vds0I6WRt2Y2VYK-GY3avGa3KUPpy0E"
    supabase_bucket: str = "glasses"

    # Login rate limiting (attempts allowed per window, in seconds).
    login_max_attempts: int = 10
    login_window_seconds: int = 300

    # Upload limits. 3-D try-on frames carry geometry plus baked textures and routinely
    # exceed the image budget, so they get their own (larger) ceiling.
    max_upload_bytes: int = 5 * 1024 * 1024  # 5 MB — images
    max_model_upload_bytes: int = 32 * 1024 * 1024  # 32 MB — .glb / .gltf

    # Email (Resend API) — used for order confirmation.
    resend_api_key: str = ""
    email_from: str = "SpecsVision <onboarding@resend.dev>"

    # Stripe — test keys go here; swap for live keys in production.
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    @property
    def secret_is_insecure(self) -> bool:
        return self.secret_key in INSECURE_SECRETS


settings = Settings()
