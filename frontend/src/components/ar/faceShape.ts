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
 * Classify a face shape from the 8 landmark points, or return null if the geometry is
 * degenerate (face turned too far, a point not yet tracked, etc.).
 */
export function classifyFaceShape(pts: Record<LandmarkKey, Pt>): FaceShape | null {
  const L = dist(pts.foreheadTop, pts.chin); // face length
  const W = dist(pts.cheekL, pts.cheekR); // cheekbone width (usually widest)
  const J = dist(pts.jawL, pts.jawR); // jaw width
  const F = dist(pts.browL, pts.browR); // forehead width

  if (![L, W, J, F].every((v) => Number.isFinite(v) && v > 1e-6)) return null;

  const lw = L / W; // length-to-width
  const fRatio = F / W; // forehead vs cheekbone
  const jRatio = J / W; // jaw vs cheekbone

  // Long face → Oblong (soft) or squared-off long face reads as Oblong here too.
  if (lw >= 1.5) return "Oblong";

  // Cheekbones clearly the widest, forehead & jaw both narrower → Diamond.
  if (fRatio <= 0.9 && jRatio <= 0.92 && lw >= 1.08) return "Diamond";

  // Forehead widest with a narrow, tapered jaw → Heart.
  if (fRatio >= 0.95 && jRatio <= 0.82) return "Heart";

  // Roughly as long as wide → Round (soft jaw) or Square (strong jaw).
  if (lw <= 1.15) return jRatio >= 0.9 ? "Square" : "Round";

  // Balanced but slightly long: a strong, wide jaw reads Square, otherwise the
  // versatile Oval.
  if (jRatio >= 0.92 && fRatio >= 0.92) return "Square";
  return "Oval";
}

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
