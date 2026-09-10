"""
Email service — powered by the Resend HTTP API (https://resend.com).

One transactional email template:
  • send_order_confirmation_email — rich order summary on checkout

(An OTP verification email lived here until email verification was removed
from signup.)

It fires and forgets on a daemon thread so it never blocks the FastAPI event
loop. A failed email does NOT abort the calling request; errors are logged to
stderr only.
"""
from __future__ import annotations

import json
import sys
import threading
import urllib.request
from datetime import datetime
from decimal import Decimal
from typing import Any

from config import settings


import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import requests


# ── Delivery helpers ──────────────────────────────────────────────────────────

def _send_smtp(to: str, subject: str, html: str) -> None:
    """Send an email via standard SMTP (e.g. Gmail)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.email_from or settings.smtp_user
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, [to], msg.as_string())
    print(f"[email] SMTP email sent successfully to {to}")


def _send_resend(to: str, subject: str, html: str) -> None:
    """Send an email via the Resend API."""
    payload = {
        "from": settings.email_from,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    resp = requests.post(
        "https://api.resend.com/emails",
        json=payload,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        timeout=10,
    )
    if resp.status_code in (200, 201):
        print(f"[email] Resend email sent successfully to {to}: {resp.json().get('id')}")
    else:
        print(f"[email] Resend API error ({resp.status_code}): {resp.text}", file=sys.stderr)


def _deliver_email(to: str, subject: str, html: str) -> None:
    """Attempt email delivery via SMTP first, then Resend, or fallback to console."""
    if settings.smtp_user and settings.smtp_password:
        try:
            _send_smtp(to, subject, html)
            return
        except Exception as exc:
            print(f"[email] SMTP failed: {exc}", file=sys.stderr)

    if settings.resend_api_key:
        try:
            _send_resend(to, subject, html)
            return
        except Exception as exc:
            print(f"[email] Resend failed: {exc}", file=sys.stderr)

    print(f"[email] No active SMTP/Resend provider configured. Email destined for {to} logged.", file=sys.stderr)


def _send_async(to: str, subject: str, html: str) -> None:
    """Dispatch email in a daemon thread — never blocks the FastAPI event loop."""
    threading.Thread(target=_deliver_email, args=(to, subject, html), daemon=True).start()


# ── Order confirmation email ───────────────────────────────────────────────────

def _fmt_price(value: Decimal | None) -> str:
    if value is None:
        return "$0.00"
    return f"${value:,.2f}"


def _build_items_rows(items: list[dict]) -> str:
    rows = ""
    for item in items:
        name = item.get("product_name", "Item")
        qty = item.get("quantity", 1)
        price = _fmt_price(item.get("unit_price"))
        line_total = _fmt_price(item.get("unit_price", Decimal("0")) * qty)
        color = item.get("color")
        color_badge = (
            f'<span style="display:inline-block;background:#f3e8ff;color:#7c3aed;'
            f'font-size:11px;padding:2px 8px;border-radius:20px;margin-left:6px;">'
            f'{color}</span>'
        ) if color else ""
        rows += f"""
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;
                     font-size:14px;color:#374151;">
            {name}{color_badge}
            <span style="display:block;font-size:12px;color:#9ca3af;">Qty: {qty}</span>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;
                     font-size:14px;color:#374151;text-align:right;
                     white-space:nowrap;">
            {price} × {qty}<br/>
            <strong style="color:#111827;">{line_total}</strong>
          </td>
        </tr>"""
    return rows


def send_order_confirmation_email(
    to: str,
    name: str,
    order_id: int,
    status: str,
    items: list[dict],
    subtotal: Decimal | None,
    discount: Decimal | None,
    tax: Decimal | None,
    shipping_fee: Decimal | None,
    total: Decimal,
    ship_full_name: str | None,
    ship_address: str | None,
    ship_city: str | None,
    ship_state: str | None,
    ship_zip: str | None,
    payment_reference: str | None,
    created_at: datetime | None = None,
) -> None:
    """Send a beautiful order confirmation email (non-blocking)."""
    display_name = name or to.split("@")[0]
    order_date = (created_at or datetime.utcnow()).strftime("%B %d, %Y")
    items_html = _build_items_rows(items)

    discount_row = ""
    if discount and discount > 0:
        discount_row = f"""
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#059669;">Discount</td>
          <td style="padding:6px 0;font-size:14px;color:#059669;text-align:right;">
            −{_fmt_price(discount)}
          </td>
        </tr>"""

    shipping_label = "Free Shipping" if shipping_fee == Decimal("0") else "Shipping"

    address_block = ""
    if ship_full_name or ship_address:
        address_block = f"""
        <tr>
          <td colspan="2" style="padding:24px 0 0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#7c3aed;
                      letter-spacing:1px;text-transform:uppercase;">Shipping To</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
              {ship_full_name or ""}<br/>
              {ship_address or ""}<br/>
              {ship_city or ""}{', ' + ship_state if ship_state else ''} {ship_zip or ""}
            </p>
          </td>
        </tr>"""

    ref_snippet = f'<code style="font-size:11px;color:#9ca3af;">{payment_reference}</code>' if payment_reference else ""

    html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your SpecsVision order #{order_id}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#db2777 100%);
                       border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;
                         letter-spacing:-0.5px;">SpecsVision</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Premium Eyewear — Virtual Try-On
              </p>
            </td>
          </tr>

          <!-- Hero confirmation -->
          <tr>
            <td style="background:#fff;padding:36px 40px 0;text-align:center;">
              <div style="display:inline-block;background:#f0fdf4;
                          border-radius:50%;width:56px;height:56px;
                          line-height:56px;font-size:28px;margin-bottom:16px;">✓</div>
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
                Order Confirmed!
              </h2>
              <p style="margin:0;font-size:15px;color:#6b7280;">
                Hi {display_name}, thanks for shopping with SpecsVision.
              </p>
              <p style="margin:6px 0 24px;font-size:13px;color:#9ca3af;">
                Order&nbsp;#{order_id} &bull; {order_date}
                {'&bull; ' + ref_snippet if ref_snippet else ''}
              </p>
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;" />
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="background:#fff;padding:24px 40px 0;">
              <p style="margin:0 0 16px;font-size:12px;font-weight:600;color:#7c3aed;
                        letter-spacing:1px;text-transform:uppercase;">Your Items</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                {items_html}
              </table>
            </td>
          </tr>

          <!-- Pricing breakdown -->
          <tr>
            <td style="background:#fff;padding:20px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="border-top:2px solid #f3f4f6;padding-top:16px;">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">Subtotal</td>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;
                             text-align:right;">{_fmt_price(subtotal)}</td>
                </tr>
                {discount_row}
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">Tax</td>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;
                             text-align:right;">{_fmt_price(tax)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">
                    {shipping_label}
                  </td>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;
                             text-align:right;">{_fmt_price(shipping_fee)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-size:16px;font-weight:700;
                             color:#111827;border-top:2px solid #e5e7eb;">Total</td>
                  <td style="padding:12px 0 0;font-size:18px;font-weight:800;
                             color:#7c3aed;text-align:right;
                             border-top:2px solid #e5e7eb;">{_fmt_price(total)}</td>
                </tr>
                {address_block}
              </table>
            </td>
          </tr>

          <!-- Delivery note -->
          <tr>
            <td style="background:#f5f3ff;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#5b21b6;font-weight:500;">
                🚚&nbsp; Estimated delivery: <strong>3–7 business days</strong>
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#7c3aed;">
                You'll receive a shipping confirmation with tracking details soon.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-radius:0 0 16px 16px;
                       padding:24px 40px;text-align:center;
                       border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Questions? Reply to this email or contact
                <a href="mailto:mohtashimsultan262@gmail.com"
                   style="color:#7c3aed;text-decoration:none;">support</a>.<br/>
                © 2025 SpecsVision. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    _send_async(
        to=to,
        subject=f"Your SpecsVision order #{order_id} is confirmed 🎉",
        html=html,
    )


# ── Password reset email ───────────────────────────────────────────────────────

def send_password_reset_email(to: str, name: str | None, otp: str) -> None:
    """Send a 6-digit verification code email for password reset."""
    display_name = name or to.split("@")[0]
    print(f"\n[AUTH] Password reset requested for {to}. Verification OTP: {otp}\n", file=sys.stdout)

    html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SpecsVision Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#db2777 100%);
                       padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;
                         letter-spacing:-0.5px;">SpecsVision</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">
                Password Reset Verification Code
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">
                Reset Your Password
              </h2>
              <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
                Hi {display_name}, we received a request to reset your SpecsVision account password.
                Use the verification code below to set a new password. This code will expire in <strong>15 minutes</strong>.
              </p>

              <!-- OTP Code Display Box -->
              <div style="background:#f5f3ff;border:2px dashed #a855f7;border-radius:12px;
                          padding:18px 24px;margin:0 auto 24px;display:inline-block;letter-spacing:8px;">
                <span style="font-size:32px;font-weight:800;color:#7c3aed;font-family:monospace;">
                  {otp}
                </span>
              </div>

              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
                If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized activity.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;
                       border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © 2025 SpecsVision. Premium Virtual Eyewear.<br/>
                Need assistance? Reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    _send_async(
        to=to,
        subject="SpecsVision Password Reset Code 🔑",
        html=html,
    )

