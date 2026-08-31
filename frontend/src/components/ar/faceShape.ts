/**
 * Client-side face-shape classification from MediaPipe/MindAR face-mesh landmarks.
 *
 * We read a handful of tracked landmark positions (fed in as 3D points) and derive
 * scale-invariant ratios: face length vs width, forehead/jaw vs cheekbone width. A rule
 * set maps those ratios to one of six common face shapes. Ratios (not absolute sizes) make
 * this independent of camera distance and tracking scale.
 *
 * Landmark indices (MediaPipe FaceMesh 468 topology):
 *   foreheadTop 10 · chin 152 · cheekL 234 · cheekR 454 · jawL 172 · jawR 397 · browL 21 · browR 251
 */

export type FaceShape = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong";

export const FACE_SHAPE_LANDMARKS = {
  foreheadTop: 10,
  chin: 152,
  cheekL: 234,
  cheekR: 454,
  jawL: 172,
  jawR: 397,
  browL: 21,
  browR: 251,
} as const;

export type LandmarkKey = keyof typeof FACE_SHAPE_LANDMARKS;
type Pt = { x: number; y: number; z: number };

function dist(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Classification cuts, calibrated against MindAR's canonical-face-model.obj — the
 * statistically average face — which measures lw 1.1525, fRatio 0.9248, jRatio 0.7751.
 *
 * These sit roughly half to one population standard deviation from canonical. Two earlier
 * sets both failed, in opposite directions.
 *
 * The first was uncalibrated: the average face missed the Round cut by 0.22% (lw 1.1525
 * against 1.15), so at only ±0.5% landmark noise the label flipped on a third of consecutive
 * samples, and Heart required `jRatio <= 0.82` which an average jaw of 0.7751 already
 * satisfies — so Heart hinged on brow width alone.
 *
 * The second over-corrected. Every cut was pushed one-and-a-half to three deviations out to
 * survive ±1% landmark noise, and Oval then swallowed everyone: fRatio and jRatio could move
 * by ANY amount without leaving Oval on their own, because Diamond, Heart and Square each
 * require two or three ratios to be far from average SIMULTANEOUSLY. Only lw still decided
 * anything, across a 21%-wide Oval corridor. Simulated over 200k faces, 86% classified Oval
 * at ±5% population spread and 98% at ±3%.
 *
 * Widening the cuts was the wrong defence, because FaceShapeStabilizer below had already
 * removed that noise in the same change — it classifies the MEDIAN of up to 60 samples,
 * which attenuates ±1% landmark noise by roughly 8x. The noise was defended against twice,
 * and the second defence cost all of the discriminating power. The stabiliser is what keeps
 * the label still; these cuts only have to separate real faces.
 *
 * Note W is measured at 234/454, which sit at ear level rather than on the cheekbone, so
 * these ratios read lower than published anthropometric ones. They are internally
 * consistent, not comparable to outside tables.
 */
export const SHAPE_CUTS = {
  oblongLw: 1.215, // +5.4% longer than average
  diamondF: 0.906, // -2.0% narrower brow
  diamondJ: 0.762, // -1.7% narrower jaw
  diamondLw: 1.13, // -2.0%: cheekbones lead only on a face that is not short
  heartF: 0.944, // +2.1% wider brow
  heartJ: 0.762, // -1.7% narrower jaw
  roundLw: 1.098, // -4.7% shorter than average
  roundSquareJ: 0.79, // +1.9%: splits a short face into Square (strong jaw) or Round
  squareJ: 0.8, // +3.2% wider jaw
  squareF: 0.93, // +0.6% wider brow
} as const;

export type Ratios = { lw: number; fRatio: number; jRatio: number };

/** Scale-invariant proportions, or null if the geometry is degenerate. */
export function faceRatios(pts: Record<LandmarkKey, Pt>): Ratios | null {
  const L = dist(pts.foreheadTop, pts.chin); // face length
  const W = dist(pts.cheekL, pts.cheekR); // cheekbone width (usually widest)
  const J = dist(pts.jawL, pts.jawR); // jaw width
  const F = dist(pts.browL, pts.browR); // forehead width

  if (![L, W, J, F].every((v) => Number.isFinite(v) && v > 1e-6)) return null;
  return { lw: L / W, fRatio: F / W, jRatio: J / W };
}

function decide({ lw, fRatio, jRatio }: Ratios): FaceShape {
  if (lw >= SHAPE_CUTS.oblongLw) return "Oblong";

  // Cheekbones clearly the widest, forehead AND jaw both narrower → Diamond.
  if (fRatio <= SHAPE_CUTS.diamondF && jRatio <= SHAPE_CUTS.diamondJ && lw >= SHAPE_CUTS.diamondLw) {
    return "Diamond";
  }

  // Forehead widest with a distinctly tapered jaw → Heart.
  if (fRatio >= SHAPE_CUTS.heartF && jRatio <= SHAPE_CUTS.heartJ) return "Heart";

  // Roughly as wide as it is long → Round (soft jaw) or Square (strong jaw).
  if (lw <= SHAPE_CUTS.roundLw) return jRatio >= SHAPE_CUTS.roundSquareJ ? "Square" : "Round";

  // Balanced but slightly long: a strong, wide jaw reads Square, otherwise the
  // versatile Oval.
  if (jRatio >= SHAPE_CUTS.squareJ && fRatio >= SHAPE_CUTS.squareF) return "Square";
  return "Oval";
}

/**
 * Classify a face shape from the 8 landmark points, or return null if the geometry is
 * degenerate (face turned too far, a point not yet tracked, etc.).
 */
export function classifyFaceShape(pts: Record<LandmarkKey, Pt>): FaceShape | null {
  const r = faceRatios(pts);
  return r === null ? null : decide(r);
}

// ── Stabilisation ──────────────────────────────────────────────────────────────

/** Samples held in the rolling window. At ~10Hz sampling this is a few seconds of face. */
const WINDOW = 60;
/** Enough to show the user something without waiting. */
const MIN_SAMPLES = 12;
/** Enough to commit to an answer for the rest of the session. */
const LOCK_SAMPLES = 45;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Turns a stream of noisy per-frame ratios into one answer that holds still.
 *
 * Two decisions matter here. First, it accumulates RATIOS and classifies the median, rather
 * than classifying every frame and voting on the labels. Near any boundary a label vote is
 * maximally unstable — the thing being averaged has already been through a step function —
 * whereas the median of the underlying continuous measurements is not, and the median in
 * particular ignores the outliers a momentary bad landmark fit produces.
 *
 * Second, it LOCKS. A person's face shape does not change while they browse frames, so once
 * enough good samples have accumulated the answer is fixed for the session. Without this the
 * label keeps drifting as expression and head angle shift, which reads as the feature being
 * broken even when each individual reading is defensible.
 */
export class FaceShapeStabilizer {
  private samples: Ratios[] = [];
  private locked: FaceShape | null = null;

  /** True once the answer is committed and will no longer change. */
  get isLocked(): boolean {
    return this.locked !== null;
  }

  /** How close the answer is to being committed, 0–1. */
  get confidence(): number {
    return this.locked !== null ? 1 : Math.min(1, this.samples.length / LOCK_SAMPLES);
  }

  /**
   * Feed one observation.
   * @returns the current best answer, or null while there is not yet enough to say.
   */
  add(r: Ratios): FaceShape | null {
    if (this.locked !== null) return this.locked;

    this.samples.push(r);
    if (this.samples.length > WINDOW) this.samples.shift();
    if (this.samples.length < MIN_SAMPLES) return null;

    const shape = decide({
      lw: median(this.samples.map((s) => s.lw)),
      fRatio: median(this.samples.map((s) => s.fRatio)),
      jRatio: median(this.samples.map((s) => s.jRatio)),
    });

    if (this.samples.length >= LOCK_SAMPLES) this.locked = shape;
    return shape;
  }

  /** Start over — a different person is in front of the camera. */
  reset(): void {
    this.samples = [];
    this.locked = null;
  }
}

// ── Shape-driven fit refinement ────────────────────────────────────────────────

export type ShapeFit = {
  /** Multiplier on frame width. Deliberately tiny — width is driven by MEASURED face width. */
  widthScale: number;
  /**
   * Nudge to how high the frame sits, as a fraction of eye distance.
   * Positive seats it lower on the nose, negative higher toward the brow.
   */
  seatOffset: number;
};

/**
 * Per-shape refinements applied on top of the measured fit.
 *
 * NEUTRAL for every shape, deliberately. Face shape drives the label and the frame
 * recommendations; it does not move the rendered frame.
 *
 * Shape describes a length-to-width proportion and says nothing about absolute head size, so
 * two people who are both "Oval" can need frames 20mm apart. Sizing therefore comes entirely
 * from the measured cheek/eye signal, which is the signal that actually varies per person.
 *
 * These entries were non-neutral while the cuts above were classifying ~98% of users as
 * Oval, so in practice they never fired. Recalibrating those cuts would have woken them up
 * and silently moved the frame by up to 2% for the majority of users — a rendering change
 * arriving as a side effect of a classification fix. Zeroed instead, so the recalibration is
 * provably label-only.
 *
 * The table is kept, rather than deleted along with its call sites in TryOnViewer, so that
 * re-enabling a nudge is a change to these numbers alone. Previous values are noted per
 * line. If you re-enable one, keep it under 2% on width and 0.6% of eye distance on seating:
 * enough to see, not enough to override a real measurement.
 */
export const SHAPE_FIT: Record<FaceShape, ShapeFit> = {
  // Reference shape — the baseline everything else was expressed against.
  Oval: { widthScale: 1.0, seatOffset: 0.0 },
  // Short and wide: a fractionally wider frame adds definition. (was widthScale 1.02)
  Round: { widthScale: 1.0, seatOffset: 0.0 },
  // Strong jaw already carries width; the frame stays honest either way.
  Square: { widthScale: 1.0, seatOffset: 0.0 },
  // Broad brow, narrow chin: narrower and seated higher balances the top.
  // (was widthScale 0.985, seatOffset -0.004)
  Heart: { widthScale: 1.0, seatOffset: 0.0 },
  // Widest at the cheekbones: the frame's job is to soften mid-face. (was widthScale 0.995)
  Diamond: { widthScale: 1.0, seatOffset: 0.0 },
  // Long face: seating lower shortens the apparent length. (was seatOffset 0.006)
  Oblong: { widthScale: 1.0, seatOffset: 0.0 },
};

export type ShapeGuide = {
  /** Frame categories (matching Product.category values) that flatter this shape. */
  recommend: string[];
  blurb: string;
};

// Recommended frame categories per face shape. Category strings are compared
// case-insensitively (and cat-eye/cateye are normalized) in isBestFit().
export const SHAPE_GUIDE: Record<FaceShape, ShapeGuide> = {
  Oval: {
    recommend: ["Wayfarer", "Rectangle", "Aviator", "Round", "Cat-Eye"],
    blurb: "Balanced proportions — almost every style suits you. Play with bold shapes.",
  },
  Round: {
    recommend: ["Rectangle", "Wayfarer", "Square", "Cat-Eye"],
    blurb: "Angular frames add definition and make your face look longer and slimmer.",
  },
  Square: {
    recommend: ["Round", "Oval", "Aviator", "Cat-Eye"],
    blurb: "Round and curved frames soften a strong jaw and balance your angles.",
  },
  Heart: {
    recommend: ["Aviator", "Round", "Cat-Eye", "Rimless"],
    blurb: "Frames wider at the bottom balance a broader forehead and narrow chin.",
  },
  Diamond: {
    recommend: ["Cat-Eye", "Oval", "Round", "Rimless"],
    blurb: "Frames that highlight the eyes and soften cheekbones flatter your shape.",
  },
  Oblong: {
    recommend: ["Round", "Square", "Aviator", "Wayfarer"],
    blurb: "Taller, deeper frames shorten a longer face and add pleasing width.",
  },
};

function normalizeCategory(c: string): string {
  return c.toLowerCase().replace(/[^a-z]/g, ""); // "Cat-Eye" -> "cateye"
}

/** True if a product category is a recommended fit for the detected face shape. */
export function isBestFit(category: string | null | undefined, shape: FaceShape | null): boolean {
  if (!category || !shape) return false;
  const target = normalizeCategory(category);
  return SHAPE_GUIDE[shape].recommend.some((r) => normalizeCategory(r) === target);
}
