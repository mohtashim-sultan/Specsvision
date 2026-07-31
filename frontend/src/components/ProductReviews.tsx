import React, { useEffect, useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Minus, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { fetchReviews, submitReview, deleteReview } from "../api/reviewApi";
import { useAuth } from "../context/AuthContext";
import type { ReviewList, ReviewSummary, Review } from "../types/api";

const SENTIMENT_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  positive: { label: "Positive", color: "#22c55e", bg: "rgba(34,197,94,0.1)", Icon: ThumbsUp },
  neutral: { label: "Neutral", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", Icon: Minus },
  negative: { label: "Negative", color: "#ef4444", bg: "rgba(239,68,68,0.1)", Icon: ThumbsDown },
};

function Stars({ value, size = 16, onSelect }: { value: number; size?: number; onSelect?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onSelect}
          onClick={() => onSelect?.(n)}
          className={onSelect ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            className="fill-current"
            style={{ width: size, height: size, color: n <= Math.round(value) ? "#facc15" : "var(--border-color)" }}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({
  productId,
  onSummaryChange,
}: {
  productId: number;
  onSummaryChange?: (s: ReviewSummary) => void;
}) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<ReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    try {
      const res = await fetchReviews(productId);
      setData(res);
      onSummaryChange?.(res.summary);
      if (res.my_review) {
        setRating(res.my_review.rating);
        setTitle(res.my_review.title ?? "");
        setBody(res.my_review.body ?? "");
      }
    } catch {
      /* leave empty state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitReview(productId, { rating, title: title.trim() || null, body: body.trim() || null });
      toast.success(data?.my_review ? "Review updated" : "Thanks for your review!");
      setEditing(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteReview(productId);
      setRating(5);
      setTitle("");
      setBody("");
      toast.success("Review removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: "var(--surface-bg-secondary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  };

  const summary = data?.summary;
  const myReview = data?.my_review ?? null;
  const showForm = isAuthenticated && (!myReview || editing);

  return (
    <section className="mt-16 pt-12" style={{ borderTop: "1px solid var(--border-color)" }}>
      <h2 className="text-2xl font-bold sm:text-3xl mb-6" style={{ color: "var(--text-primary)" }}>
        Ratings &amp; Reviews
      </h2>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading reviews…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Summary + write form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
              {summary && summary.review_count > 0 ? (
                <>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                      {summary.avg_rating?.toFixed(1)}
                    </span>
                    <div className="pb-1">
                      <Stars value={summary.avg_rating ?? 0} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {summary.review_count} review{summary.review_count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Rating breakdown bars */}
                  <div className="mt-4 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = summary.rating_breakdown[String(star)] ?? 0;
                      const pct = summary.review_count ? (count / summary.review_count) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span style={{ color: "var(--text-muted)", width: 30 }}>{star}★</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-bg-secondary)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#facc15" }} />
                          </div>
                          <span style={{ color: "var(--text-muted)", width: 20 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sentiment breakdown */}
                  <div className="mt-4 flex flex-wrap gap-2 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                    {(["positive", "neutral", "negative"] as const).map((key) => {
                      const meta = SENTIMENT_META[key];
                      const count = summary.sentiment_breakdown[key] ?? 0;
                      if (!count) return null;
                      return (
                        <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
                          <meta.Icon className="w-3 h-3" />
                          {meta.label} · {count}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>No reviews yet — be the first to review this frame.</p>
              )}
            </div>

            {/* Write / edit form */}
            {!isAuthenticated && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Log in to write a review.</p>
            )}
            {isAuthenticated && myReview && !editing && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "rgba(147,51,234,0.08)", color: "var(--text-accent)", border: "1px solid var(--border-color)" }}>
                  <Pencil className="w-3.5 h-3.5" /> Edit your review
                </button>
                <button onClick={handleDelete} disabled={submitting} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
            {showForm && (
              <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{myReview ? "Edit your review" : "Write a review"}</h3>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Your rating</label>
                  <Stars value={rating} size={24} onSelect={setRating} />
                </div>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} placeholder="Title (optional)"
                  className="w-full rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/30" style={inputStyle} />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={4} placeholder="Share your experience (optional)"
                  className="w-full rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/30 resize-y" style={inputStyle} />
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 px-5 rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all">
                    {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
                  </button>
                  {myReview && (
                    <button type="button" onClick={() => setEditing(false)} className="py-2.5 px-4 rounded-xl font-semibold text-sm" style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Review list */}
          <div className="lg:col-span-7 space-y-4">
            {data && data.items.length > 0 ? (
              data.items.map((r: Review) => {
                const meta = SENTIMENT_META[r.sentiment] ?? SENTIMENT_META.neutral;
                return (
                  <article key={r.id} className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                          {r.author_name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {r.author_name}{r.is_mine && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(147,51,234,0.1)", color: "var(--text-accent)" }}>You</span>}
                          </p>
                          <Stars value={r.rating} size={13} />
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
                        <meta.Icon className="w-3 h-3" /> {meta.label}
                      </span>
                    </div>
                    {r.title && <p className="mt-3 font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{r.title}</p>}
                    {r.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.body}</p>}
                    <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{new Date(r.created_at).toLocaleDateString()}</p>
                  </article>
                );
              })
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No written reviews yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
