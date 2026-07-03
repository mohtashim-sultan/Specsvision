/** Base URL for FastAPI (no trailing slash). */
export const API_BASE = (process.env.REACT_APP_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
