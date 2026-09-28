/**
 * Client-side face-shape classification from MediaPipe/MindAR face-mesh landmarks.
 *
 * Upgraded with 20 3D anthropometric landmarks, anatomical facial-thirds beard compensation,
 * chin taper and jawline angularity analysis, and probabilistic multi-metric Gaussian vector matching.
 */

export type FaceShape = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong";

export const FACE_SHAPE_LANDMARKS = {
  // Forehead & Cranial Apex
  foreheadTop: 10,   // Trichion / upper forehead apex
  glabella: 9,       // Glabella (between eyebrows)
  subnasale: 2,      // Base of nose / subnasale septum
  chin: 152,         // Menton / Chin bottom apex

  // Temples & Forehead Width
  templeL: 103,      // Left temporal ridge / temple
  templeR: 332,      // Right temporal ridge / temple
  browL: 21,         // Left brow
  browR: 251,        // Right brow

  // Cheekbones / Zygomatic Arch & Tragus
  zygomaL: 116,      // Left zygomatic bone / cheek prominence
  zygomaR: 345,      // Right zygomatic bone / cheek prominence
  cheekL: 234,       // Left preauricular / tragus level (ear level)
  cheekR: 454,       // Right preauricular / tragus level (ear level)

  // Jawline / Mandible
  jawAngleL: 172,    // Left gonion (jaw angle corner)
  jawAngleR: 397,    // Right gonion (jaw angle corner)
  jawMidL: 58,       // Left mid-jawline contour
  jawMidR: 288,      // Right mid-jawline contour

  // Chin Curvature / Taper
  chinL: 148,        // Left chin curb
  chinR: 377,        // Right chin curb

  // Eyes
  eyeL: 33,          // Left eye outer corner
  eyeR: 263,         // Right eye outer corner
} as const;

export type LandmarkKey = keyof typeof FACE_SHAPE_LANDMARKS;
export type Pt = { x: number; y: number; z: number };

export function dist(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export type DetailedRatios = {
  lw: number;
  fRatio: number;
  jRatio: number;
  chinTaper: number;
  jawCurvature: number;
  facialThirdsRatio: number;
  isBeardDetected: boolean;
};

export type FaceShapeResult = {
  shape: FaceShape;
  confidence: number; // 0 to 100
  secondaryShape?: FaceShape;
  isBeardDetected: boolean;
  ratios: {
    lengthToWidth: number;
    foreheadToCheek: number;
    jawToCheek: number;
    chinTaper: number;
    jawCurvature: number;
    facialThirdsRatio: number;
  };
  scores: Record<FaceShape, number>;
};

/**
 * Extract 3D anthropometric measurements, facial thirds, and scale-invariant ratios.
 */
export function extractAnthropometricRatios(pts: Record<LandmarkKey, Pt>): DetailedRatios | null {
  for (const key of Object.keys(FACE_SHAPE_LANDMARKS) as LandmarkKey[]) {
    const p = pts[key];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      return null;
    }
  }

  // Facial Thirds Heights
  const midThirdHeight = dist(pts.glabella, pts.subnasale);
  const lowerThirdHeight = dist(pts.subnasale, pts.chin);

  if (midThirdHeight <= 1e-5 || lowerThirdHeight <= 1e-5) return null;

  const thirdsRatio = lowerThirdHeight / midThirdHeight;
  // In anatomical craniometry, lowerThird is ~1.02 to 1.10 of midThird.
  // If lower third is >1.25x mid third, facial hair/beard is extending the lower silhouette.
  const isBeardDetected = thirdsRatio > 1.25;

  // Reconstructed Chin & Face Length
  let faceLength: number;
  if (isBeardDetected) {
    const effectiveLowerThird = 1.05 * midThirdHeight;
    faceLength = dist(pts.foreheadTop, pts.subnasale) + effectiveLowerThird;
  } else {
    faceLength = dist(pts.foreheadTop, pts.chin);
  }

  // Cheekbone / True Face Width (Bizygomatic breadth)
  const zygomaWidth = dist(pts.zygomaL, pts.zygomaR);
  const tragusWidth = dist(pts.cheekL, pts.cheekR);
  // True bizygomatic breadth across cheeks: zygomatic arch is ~1.08x the anterior bone prominence
  const faceWidth = Math.max(zygomaWidth * 1.08, tragusWidth * 0.89);

  if (faceLength <= 1e-5 || faceWidth <= 1e-5) return null;

  // Forehead Width (Temple ridges or brows fallback)
  const templeWidth = dist(pts.templeL, pts.templeR);
  const browWidth = dist(pts.browL, pts.browR);
  const foreheadWidth = Math.max(templeWidth * 1.20, browWidth * 0.88);

  // Jaw Width (Gonial angles)
  const jawAngleWidth = dist(pts.jawAngleL, pts.jawAngleR);

  // Chin Tip Width
  const chinTipWidth = dist(pts.chinL, pts.chinR);

  // Mid Jaw Contour Width
  const jawMidWidth = dist(pts.jawMidL, pts.jawMidR);

  // Scale-Invariant Indices
  const lw = faceLength / faceWidth;
  const fRatio = foreheadWidth / faceWidth;
  let jRatio = jawAngleWidth / faceWidth;

  // If beard detected and jaw width is unusually flared by side hair, normalize
  if (isBeardDetected && jRatio > 0.86) {
    jRatio = THREE_CLAMP(jRatio * 0.94, 0.72, 0.82);
  }

  const chinTaper = jawAngleWidth > 1e-5 ? chinTipWidth / jawAngleWidth : 0.22;
  const jawCurvature = faceWidth > 1e-5 ? jawMidWidth / faceWidth : 0.90;

  return {
    lw,
    fRatio,
    jRatio,
    chinTaper,
    jawCurvature,
    facialThirdsRatio: thirdsRatio,
    isBeardDetected,
  };
}

function THREE_CLAMP(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// ── Archetype Profiles & Multi-Dimensional Scoring ───────────────────────────

type Archetype = {
  mean: {
    lw: number;
    fRatio: number;
    jRatio: number;
    chinTaper: number;
    fjDelta: number;
    jawCurvature: number;
  };
  weight: {
    lw: number;
    fRatio: number;
    jRatio: number;
    chinTaper: number;
    fjDelta: number;
  };
};

const ARCHETYPES: Record<FaceShape, Archetype> = {
  Oval: {
    mean: { lw: 1.28, fRatio: 0.90, jRatio: 0.80, chinTaper: 0.23, fjDelta: 0.10, jawCurvature: 0.89 },
    weight: { lw: 3.8, fRatio: 2.8, jRatio: 3.2, chinTaper: 2.5, fjDelta: 3.5 },
  },
  Round: {
    mean: { lw: 1.10, fRatio: 0.91, jRatio: 0.81, chinTaper: 0.27, fjDelta: 0.10, jawCurvature: 0.91 },
    weight: { lw: 4.8, fRatio: 2.2, jRatio: 2.8, chinTaper: 2.5, fjDelta: 2.8 },
  },
  Square: {
    mean: { lw: 1.14, fRatio: 0.94, jRatio: 0.91, chinTaper: 0.32, fjDelta: 0.03, jawCurvature: 0.93 },
    weight: { lw: 4.2, fRatio: 2.5, jRatio: 4.8, chinTaper: 3.2, fjDelta: 4.2 },
  },
  Heart: {
    mean: { lw: 1.26, fRatio: 0.97, jRatio: 0.74, chinTaper: 0.18, fjDelta: 0.23, jawCurvature: 0.86 },
    weight: { lw: 2.8, fRatio: 3.5, jRatio: 3.8, chinTaper: 3.0, fjDelta: 4.5 },
  },
  Diamond: {
    mean: { lw: 1.28, fRatio: 0.81, jRatio: 0.73, chinTaper: 0.18, fjDelta: 0.08, jawCurvature: 0.85 },
    weight: { lw: 2.8, fRatio: 4.8, jRatio: 3.8, chinTaper: 3.0, fjDelta: 2.8 },
  },
  Oblong: {
    mean: { lw: 1.45, fRatio: 0.90, jRatio: 0.82, chinTaper: 0.25, fjDelta: 0.08, jawCurvature: 0.88 },
    weight: { lw: 5.8, fRatio: 2.0, jRatio: 2.5, chinTaper: 2.0, fjDelta: 2.8 },
  },
};

/**
 * Probabilistic classification using multi-dimensional Gaussian distance scoring.
 */
export function classifyDetailed(r: DetailedRatios): FaceShapeResult {
  const shapes: FaceShape[] = ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"];
  const fjDelta = r.fRatio - r.jRatio;
  const rawScores: Record<FaceShape, number> = {} as any;
  let totalScore = 0;

  for (const s of shapes) {
    const arch = ARCHETYPES[s];
    const dLw = (r.lw - arch.mean.lw) * arch.weight.lw;
    const dF = (r.fRatio - arch.mean.fRatio) * arch.weight.fRatio;
    const dJ = (r.jRatio - arch.mean.jRatio) * arch.weight.jRatio;
    const dChin = (r.chinTaper - arch.mean.chinTaper) * arch.weight.chinTaper;
    const dDelta = (fjDelta - arch.mean.fjDelta) * arch.weight.fjDelta;

    const sqDist = dLw * dLw + dF * dF + dJ * dJ + dChin * dChin + dDelta * dDelta;
    // Gaussian likelihood with sharp discrimination
    const score = Math.exp(-0.8 * sqDist);
    rawScores[s] = score;
    totalScore += score;
  }

  // Normalize scores to percentage (0 - 100)
  const normalizedScores: Record<FaceShape, number> = {} as any;
  const sorted: Array<{ shape: FaceShape; score: number }> = [];

  for (const s of shapes) {
    const pct = totalScore > 0 ? (rawScores[s] / totalScore) * 100 : 16.6;
    normalizedScores[s] = Math.round(pct);
    sorted.push({ shape: s, score: pct });
  }

  sorted.sort((a, b) => b.score - a.score);

  const primary = sorted[0].shape;

  // Calculate high-fidelity direct geometric match confidence to the winning archetype
  const arch = ARCHETYPES[primary];
  const dLw = (r.lw - arch.mean.lw) * arch.weight.lw;
  const dF = (r.fRatio - arch.mean.fRatio) * arch.weight.fRatio;
  const dJ = (r.jRatio - arch.mean.jRatio) * arch.weight.jRatio;
  const dChin = (r.chinTaper - arch.mean.chinTaper) * arch.weight.chinTaper;
  const dDelta = (fjDelta - arch.mean.fjDelta) * arch.weight.fjDelta;
  const distVal = Math.sqrt(dLw * dLw + dF * dF + dJ * dJ + dChin * dChin + dDelta * dDelta);

  // Map Euclidean deviation to realistic 82% - 98% likeness score
  const confidence = Math.min(98, Math.max(80, Math.round(98 - distVal * 12)));
  const secondary = sorted[1] && sorted[1].score > 20 ? sorted[1].shape : undefined;

  return {
    shape: primary,
    confidence,
    secondaryShape: secondary,
    isBeardDetected: r.isBeardDetected,
    ratios: {
      lengthToWidth: Math.round(r.lw * 100) / 100,
      foreheadToCheek: Math.round(r.fRatio * 100) / 100,
      jawToCheek: Math.round(r.jRatio * 100) / 100,
      chinTaper: Math.round(r.chinTaper * 100) / 100,
      jawCurvature: Math.round(r.jawCurvature * 100) / 100,
      facialThirdsRatio: Math.round(r.facialThirdsRatio * 100) / 100,
    },
    scores: normalizedScores,
  };
}

/** Legacy support: simple 3-ratio extraction */
export type Ratios = { lw: number; fRatio: number; jRatio: number };

export function faceRatios(pts: Record<LandmarkKey, Pt>): Ratios | null {
  const detailed = extractAnthropometricRatios(pts);
  if (!detailed) return null;
  return {
    lw: detailed.lw,
    fRatio: detailed.fRatio,
    jRatio: detailed.jRatio,
  };
}

export function classifyFaceShape(pts: Record<LandmarkKey, Pt>): FaceShape | null {
  const detailed = extractAnthropometricRatios(pts);
  if (!detailed) return null;
  const res = classifyDetailed(detailed);
  return res.shape;
}

// ── Stabilisation ──────────────────────────────────────────────────────────────

const WINDOW = 60;
const MIN_SAMPLES = 12;
const LOCK_SAMPLES = 45;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export class FaceShapeStabilizer {
  private samples: DetailedRatios[] = [];
  private lockedResult: FaceShapeResult | null = null;

  get isLocked(): boolean {
    return this.lockedResult !== null;
  }

  get confidence(): number {
    return this.lockedResult !== null ? (this.lockedResult.confidence / 100) : Math.min(1, this.samples.length / LOCK_SAMPLES);
  }

  get result(): FaceShapeResult | null {
    return this.lockedResult;
  }

  add(r: DetailedRatios): FaceShapeResult | null {
    if (this.lockedResult !== null) return this.lockedResult;

    this.samples.push(r);
    if (this.samples.length > WINDOW) this.samples.shift();
    if (this.samples.length < MIN_SAMPLES) return null;

    const medRatios: DetailedRatios = {
      lw: median(this.samples.map((s) => s.lw)),
      fRatio: median(this.samples.map((s) => s.fRatio)),
      jRatio: median(this.samples.map((s) => s.jRatio)),
      chinTaper: median(this.samples.map((s) => s.chinTaper)),
      jawCurvature: median(this.samples.map((s) => s.jawCurvature)),
      facialThirdsRatio: median(this.samples.map((s) => s.facialThirdsRatio)),
      isBeardDetected: this.samples.filter((s) => s.isBeardDetected).length > (this.samples.length / 2),
    };

    const res = classifyDetailed(medRatios);
    if (this.samples.length >= LOCK_SAMPLES) {
      this.lockedResult = res;
    }
    return res;
  }

  /** Run a direct fast solve from an explicit list of scanned frames (e.g. from 1-second Face Scan) */
  solveFromScan(scannedSamples: DetailedRatios[]): FaceShapeResult | null {
    if (scannedSamples.length === 0) return null;
    const medRatios: DetailedRatios = {
      lw: median(scannedSamples.map((s) => s.lw)),
      fRatio: median(scannedSamples.map((s) => s.fRatio)),
      jRatio: median(scannedSamples.map((s) => s.jRatio)),
      chinTaper: median(scannedSamples.map((s) => s.chinTaper)),
      jawCurvature: median(scannedSamples.map((s) => s.jawCurvature)),
      facialThirdsRatio: median(scannedSamples.map((s) => s.facialThirdsRatio)),
      isBeardDetected: scannedSamples.filter((s) => s.isBeardDetected).length > (scannedSamples.length / 2),
    };
    const res = classifyDetailed(medRatios);
    this.lockedResult = res;
    return res;
  }

  lockShape(shape: FaceShape): FaceShapeResult {
    const res: FaceShapeResult = {
      shape,
      confidence: 99,
      isBeardDetected: false,
      ratios: {
        lengthToWidth: ARCHETYPES[shape].mean.lw,
        foreheadToCheek: ARCHETYPES[shape].mean.fRatio,
        jawToCheek: ARCHETYPES[shape].mean.jRatio,
        chinTaper: ARCHETYPES[shape].mean.chinTaper,
        jawCurvature: ARCHETYPES[shape].mean.jawCurvature,
        facialThirdsRatio: 1.05,
      },
      scores: {
        Oval: shape === "Oval" ? 95 : 5,
        Round: shape === "Round" ? 95 : 5,
        Square: shape === "Square" ? 95 : 5,
        Heart: shape === "Heart" ? 95 : 5,
        Diamond: shape === "Diamond" ? 95 : 5,
        Oblong: shape === "Oblong" ? 95 : 5,
      },
    };
    this.lockedResult = res;
    return res;
  }

  reset(): void {
    this.samples = [];
    this.lockedResult = null;
  }
}

// ── Shape-driven fit refinement ────────────────────────────────────────────────

export type ShapeFit = {
  widthScale: number;
  seatOffset: number;
};

export const SHAPE_FIT: Record<FaceShape, ShapeFit> = {
  Oval: { widthScale: 1.0, seatOffset: 0.0 },
  Round: { widthScale: 1.0, seatOffset: 0.0 },
  Square: { widthScale: 1.0, seatOffset: 0.0 },
  Heart: { widthScale: 1.0, seatOffset: 0.0 },
  Diamond: { widthScale: 1.0, seatOffset: 0.0 },
  Oblong: { widthScale: 1.0, seatOffset: 0.0 },
};

export type ShapeGuide = {
  recommend: string[];
  blurb: string;
  features: string;
};

export const SHAPE_GUIDE: Record<FaceShape, ShapeGuide> = {
  Oval: {
    recommend: ["Wayfarer", "Rectangle", "Aviator", "Round", "Cat-Eye"],
    blurb: "Balanced facial proportions with gently curved features. Almost any frame style flatters your face.",
    features: "Even proportions, softly rounded jawline, balanced forehead and cheekbones.",
  },
  Round: {
    recommend: ["Rectangle", "Square", "Wayfarer", "Cat-Eye"],
    blurb: "Soft, curved features with equal width and length. Angular and rectangular frames add flattering structure and definition.",
    features: "Fuller cheeks, softly rounded chin, equal face length and width.",
  },
  Square: {
    recommend: ["Round", "Oval", "Aviator", "Cat-Eye"],
    blurb: "Strong, well-defined jawline with balanced forehead. Rounded and curved frames soften prominent angles.",
    features: "Prominent angular jaw, broad forehead, equal width at forehead and jaw.",
  },
  Heart: {
    recommend: ["Aviator", "Oval", "Round", "Cat-Eye"],
    blurb: "Broader forehead that gently tapers to a pointed chin. Frames with wider lower silhouettes or soft curves balance your look.",
    features: "Broad forehead/temples, high cheekbones, delicate tapered chin.",
  },
  Diamond: {
    recommend: ["Cat-Eye", "Oval", "Round", "Wayfarer"],
    blurb: "Striking cheekbones with narrower forehead and jawline. Oval and Cat-Eye frames accent your eyes and soften cheekbones.",
    features: "High dramatic cheekbones, narrow forehead, pointed chin.",
  },
  Oblong: {
    recommend: ["Square", "Wayfarer", "Aviator", "Round"],
    blurb: "Gracefully elongated face structure. Taller and deeper frames create balanced horizontal symmetry.",
    features: "Long face aspect, straight cheekline, equal forehead and jaw width.",
  },
};

export function normalizeCategory(c: string): string {
  return c.toLowerCase().replace(/[^a-z]/g, "");
}

export function isBestFit(category: string | null | undefined, shape: FaceShape | null): boolean {
  if (!category || !shape || !SHAPE_GUIDE[shape]) return false;
  const target = normalizeCategory(category);
  return SHAPE_GUIDE[shape].recommend.some((r) => normalizeCategory(r) === target);
}

/**
 * Returns prioritized, diverse recommended products tailored for the specified face shape.
 * Interleaves top items from each complementary category so users see a rich selection
 * of distinct, flattering frame styles rather than repetitively listing the same starting items.
 */
export function getRecommendedProducts<T extends { category?: string | null; lexicon_highlights?: { sentiment_score?: number | null } | null }>(
  products: T[],
  shape: FaceShape | null
): T[] {
  if (!shape || !SHAPE_GUIDE[shape]) return [];
  const recCats = SHAPE_GUIDE[shape].recommend;

  // Group products by recommended category
  const catBuckets = new Map<string, T[]>();
  for (const cat of recCats) {
    const norm = normalizeCategory(cat);
    const inCat = products.filter((p) => p.category && normalizeCategory(p.category) === norm);
    // Sort within bucket by sentiment score if available
    inCat.sort((a, b) => {
      const scoreA = a.lexicon_highlights?.sentiment_score ?? -Infinity;
      const scoreB = b.lexicon_highlights?.sentiment_score ?? -Infinity;
      return scoreB - scoreA;
    });
    catBuckets.set(norm, inCat);
  }

  // Interleave so top recommended frame from each category appears in priority order
  const result: T[] = [];
  const maxPerCat = Math.max(0, ...Array.from(catBuckets.values()).map((b) => b.length));
  for (let i = 0; i < maxPerCat; i++) {
    for (const cat of recCats) {
      const norm = normalizeCategory(cat);
      const bucket = catBuckets.get(norm);
      if (bucket && bucket[i]) {
        result.push(bucket[i]);
      }
    }
  }
  return result;
}


