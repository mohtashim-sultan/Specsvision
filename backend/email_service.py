"""
Email service — powered by the Resend HTTP API (https://resend.com).

Two transactional email templates:
  • send_otp_email        — 6-digit OTP for account verification
  • send_order_confirmation_email — rich order summary on checkout

Both functions fire-and-forget inside a ThreadPoolExecutor so they never
block the FastAPI event loop. A failed email does NOT abort the calling
request; errors are logged to stderr only.
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


import requests


# ── Shared HTTP helper ─────────────────────────────────────────────────────────

def _post_resend(payload: dict[str, Any]) -> None:
    """Fire a single POST to the Resend /emails endpoint."""
    if not settings.resend_api_key:
        print("[email] RESEND_API_KEY not set — skipping email.", file=sys.stderr)
        return

    try:
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
            print(f"[email] Email sent successfully to {payload.get('to')}: {resp.json().get('id')}")
        else:
            print(f"[email] Resend API error ({resp.status_code}): {resp.text}", file=sys.stderr)
    except Exception as exc:  # noqa: BLE001
        print(f"[email] Failed to send email: {exc}", file=sys.stderr)


def _send_async(payload: dict[str, Any]) -> None:
    """Dispatch email in a daemon thread — never blocks the event loop."""
    threading.Thread(target=_post_resend, args=(payload,), daemon=True).start()


# ── OTP verification email ─────────────────────────────────────────────────────

_OTP_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Verify your SpecsVision account</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
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
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Premium Eyewear — Virtual Try-On
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:44px 40px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">
                Hi {name},
              </p>
              <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">
                Welcome to SpecsVision! Use the verification code below to confirm
                your email address. The code expires in <strong>10 minutes</strong>.
              </p>

              <!-- OTP block -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#f5f3ff;
                                border:2px solid #7c3aed;border-radius:12px;
                                padding:20px 40px;margin:0 auto;">
                      <p style="margin:0;font-size:11px;color:#7c3aed;
                                font-weight:600;letter-spacing:2px;
                                text-transform:uppercase;">Verification Code</p>
                      <p style="margin:8px 0 0;font-size:44px;font-weight:800;
                                letter-spacing:10px;color:#4c1d95;
                                font-family:'Courier New',monospace;">{otp}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you did not create a SpecsVision account, you can safely ignore
                this email. This code will expire automatically.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-radius:0 0 16px 16px;
                       padding:24px 40px;text-align:center;
                       border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © 2025 SpecsVision. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_otp_email(to: str, name: str, otp: str) -> None:
    """Send a 6-digit OTP verification email (non-blocking)."""
    print(f"\n==========================================")
    print(f"  [SpecsVision Auth] OTP CODE FOR {to}: {otp}")
    print(f"==========================================\n")
    display_name = name or to.split("@")[0]
    html = _OTP_HTML.replace("{name}", display_name).replace("{otp}", otp)
    _send_async({
        "from": settings.email_from,
        "to": [to],
        "subject": f"{otp} is your SpecsVision verification code",
        "html": html,
    })


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

    _send_async({
        "from": settings.email_from,
        "to": [to],
        "subject": f"Your SpecsVision order #{order_id} is confirmed 🎉",
        "html": html,
    })
