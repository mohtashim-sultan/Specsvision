"""
Supabase Storage service.

Provides two functions used by the admin upload route:
  upload_to_supabase  — streams bytes into the configured bucket and returns the public CDN URL
  delete_from_supabase — removes a file from the bucket by its storage path

The Supabase URL stored in settings may include a trailing path such as /rest/v1/
(added by some dashboard copy-paste flows).  We normalise it here so the Storage SDK
always receives just the bare project origin (https://<ref>.supabase.co).
"""
from __future__ import annotations

import sys
from urllib.parse import urlparse

from supabase import create_client, Client

from config import settings


def _base_url() -> str:
    url = settings.supabase_url.strip().rstrip("/")
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def _client() -> Client:
    return create_client(_base_url(), settings.supabase_service_key)


def upload_to_supabase(file_bytes: bytes, storage_path: str, content_type: str) -> str:
    bucket = settings.supabase_bucket
    client = _client()
    try:
        client.storage.from_(bucket).upload(
            storage_path,
            file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    except Exception as exc:
        print(f"[storage] Supabase upload failed for {storage_path}: {exc}", file=sys.stderr)
        raise RuntimeError(f"Supabase upload failed: {exc}") from exc

    public_url = f"{_base_url()}/storage/v1/object/public/{bucket}/{storage_path}"
    return public_url


def delete_from_supabase(storage_path: str) -> None:
    bucket = settings.supabase_bucket
    try:
        _client().storage.from_(bucket).remove([storage_path])
    except Exception as exc:
        print(f"[storage] Supabase delete failed for {storage_path}: {exc}", file=sys.stderr)
