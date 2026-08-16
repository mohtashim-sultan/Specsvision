"""
Stripe integration service.

Thin wrapper around the Stripe Python SDK so that route handlers
never import `stripe` directly.  All functions are synchronous —
FastAPI runs them in the default thread-pool via normal `def` endpoints.
"""
from __future__ import annotations

import stripe as _stripe

from config import settings

# Configure once at module load — picks up the secret key from settings.
_stripe.api_key = settings.stripe_secret_key


def create_payment_intent(amount_cents: int, currency: str = "usd", metadata: dict | None = None) -> str:
    """
    Create a Stripe PaymentIntent and return its client_secret.

    Args:
        amount_cents: Amount in the smallest currency unit (cents for USD).
        currency: ISO 4217 currency code (default "usd").
        metadata: Optional dict attached to the PaymentIntent (e.g. user_id).

    Returns:
        The ``client_secret`` the frontend needs to confirm the payment.
    """
    intent = _stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        automatic_payment_methods={"enabled": True},
        metadata=metadata or {},
    )
    return intent.client_secret  # type: ignore[return-value]


def retrieve_payment_intent(pi_id: str) -> _stripe.PaymentIntent:
    """Fetch a PaymentIntent from Stripe by its ID (e.g. ``pi_…``)."""
    return _stripe.PaymentIntent.retrieve(pi_id)


def construct_webhook_event(payload: bytes, sig_header: str) -> _stripe.Event:
    """
    Validate the Stripe webhook signature and return the parsed Event.

    Raises ``stripe.error.SignatureVerificationError`` on a bad signature.
    """
    return _stripe.Webhook.construct_event(
        payload,
        sig_header,
        settings.stripe_webhook_secret,
    )
