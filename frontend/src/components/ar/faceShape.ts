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

  // Cheekbone / Face Width
  const zygomaWidth = dist(pts.zygomaL, pts.zygomaR);
  const tragusWidth = dist(pts.cheekL, pts.cheekR);
  // Cheek prominence is either at zygoma or slightly wider at ear base
  const faceWidth = Math.max(zygomaWidth, tragusWidth * 0.96);

  if (faceLength <= 1e-5 || faceWidth <= 1e-5) return null;

  // Forehead Width (Temple ridges or brows fallback)
  const templeWidth = dist(pts.templeL, pts.templeR);
  const browWidth = dist(pts.browL, pts.browR);
  const foreheadWidth = Math.max(templeWidth, browWidth * 1.04);

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
  if (isBeardDetected && jRatio > 0.88) {
    jRatio = THREE_CLAMP(jRatio * 0.94, 0.72, 0.85);
  }

  const chinTaper = jawAngleWidth > 1e-5 ? chinTipWidth / jawAngleWidth : 0.42;
  const jawCurvature = faceWidth > 1e-5 ? jawMidWidth / faceWidth : 0.78;

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
    jawCurvature: number;
  };
  weight: {
    lw: number;
    fRatio: number;
    jRatio: number;
    chinTaper: number;
    jawCurvature: number;
  };
};

const ARCHETYPES: Record<FaceShape, Archetype> = {
  Oval: {
    mean: {
      lw: 1.25,
      fRatio: 0.92,
      jRatio: 0.74,
      chinTaper: 0.42,
      jawCurvature: 0.77,
    },
    weight: { lw: 2.8, fRatio: 2.0, jRatio: 2.2, chinTaper: 1.8, jawCurvature: 1.5 },
  },
  Round: {
    mean: {
      lw: 1.08,
      fRatio: 0.91,
      jRatio: 0.76,
      chinTaper: 0.46,
      jawCurvature: 0.82,
    },
    weight: { lw: 3.5, fRatio: 1.8, jRatio: 2.4, chinTaper: 2.0, jawCurvature: 2.5 },
  },
  Square: {
    mean: {
      lw: 1.12,
      fRatio: 0.95,
      jRatio: 0.84,
      chinTaper: 0.54,
      jawCurvature: 0.86,
    },
    weight: { lw: 3.2, fRatio: 2.0, jRatio: 3.5, chinTaper: 2.8, jawCurvature: 2.8 },
  },
  Heart: {
    mean: {
      lw: 1.22,
      fRatio: 0.97,
      jRatio: 0.70,
      chinTaper: 0.32,
      jawCurvature: 0.70,
    },
    weight: { lw: 2.2, fRatio: 3.2, jRatio: 3.0, chinTaper: 3.2, jawCurvature: 2.0 },
  },
  Diamond: {
    mean: {
      lw: 1.24,
      fRatio: 0.86,
      jRatio: 0.69,
      chinTaper: 0.31,
      jawCurvature: 0.69,
    },
    weight: { lw: 2.2, fRatio: 3.5, jRatio: 3.0, chinTaper: 3.2, jawCurvature: 2.2 },
  },
  Oblong: {
    mean: {
      lw: 1.38,
      fRatio: 0.93,
      jRatio: 0.77,
      chinTaper: 0.44,
      jawCurvature: 0.79,
    },
    weight: { lw: 4.2, fRatio: 1.8, jRatio: 2.0, chinTaper: 1.8, jawCurvature: 1.5 },
  },
};

/**
 * Probabilistic classification using multi-dimensional Gaussian distance scoring.
 */
export function classifyDetailed(r: DetailedRatios): FaceShapeResult {
  const shapes: FaceShape[] = ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"];
  const rawScores: Record<FaceShape, number> = {} as any;
  let totalScore = 0;

  for (const s of shapes) {
    const arch = ARCHETYPES[s];
    const dLw = (r.lw - arch.mean.lw) * arch.weight.lw;
    const dF = (r.fRatio - arch.mean.fRatio) * arch.weight.fRatio;
    const dJ = (r.jRatio - arch.mean.jRatio) * arch.weight.jRatio;
    const dChin = (r.chinTaper - arch.mean.chinTaper) * arch.weight.chinTaper;
    const dCurve = (r.jawCurvature - arch.mean.jawCurvature) * arch.weight.jawCurvature;

    const sqDist = dLw * dLw + dF * dF + dJ * dJ + dChin * dChin + dCurve * dCurve;
    // Gaussian likelihood
    const score = Math.exp(-0.5 * sqDist);
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
  const dCurve = (r.jawCurvature - arch.mean.jawCurvature) * arch.weight.jawCurvature;
  const dist = Math.sqrt(dLw * dLw + dF * dF + dJ * dJ + dChin * dChin + dCurve * dCurve);

  // Map Euclidean deviation to realistic 82% - 98% likeness score
  const confidence = Math.min(98, Math.max(80, Math.round(98 - dist * 12)));
  const secondary = sorted[1] && sorted[1].score > 25 ? sorted[1].shape : undefined;

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
    recommend: ["Rectangle", "Wayfarer", "Square", "Cat-Eye"],
    blurb: "Soft, curved features with equal width and length. Angular and rectangular frames add flattering structure.",
    features: "Fuller cheeks, softly rounded chin, equal face length and width.",
  },
  Square: {
    recommend: ["Round", "Oval", "Aviator", "Cat-Eye"],
    blurb: "Strong, well-defined jawline with balanced forehead. Rounded and curved frames soften prominent angles.",
    features: "Prominent angular jaw, broad forehead, equal width at forehead and jaw.",
  },
  Heart: {
    recommend: ["Aviator", "Round", "Cat-Eye", "Rimless"],
    blurb: "Broader forehead that gently tapers to a pointed chin. Frames with wider lower silhouettes balance your look.",
    features: "Broad forehead/temples, high cheekbones, delicate tapered chin.",
  },
  Diamond: {
    recommend: ["Cat-Eye", "Oval", "Round", "Rimless"],
    blurb: "Striking cheekbones with narrower forehead and jawline. Oval and Cat-Eye frames accent your eyes and soften cheekbones.",
    features: "High dramatic cheekbones, narrow forehead, pointed chin.",
  },
  Oblong: {
    recommend: ["Round", "Square", "Aviator", "Wayfarer"],
    blurb: "Gracefully elongated face structure. Taller and deeper frames create balanced horizontal symmetry.",
    features: "Long face aspect, straight cheekline, equal forehead and jaw width.",
  },
};

function normalizeCategory(c: string): string {
  return c.toLowerCase().replace(/[^a-z]/g, "");
}

export function isBestFit(category: string | null | undefined, shape: FaceShape | null): boolean {
  if (!category || !shape) return false;
  const target = normalizeCategory(category);
  return SHAPE_GUIDE[shape].recommend.some((r) => normalizeCategory(r) === target);
}

