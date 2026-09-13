import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import {
  FACE_SHAPE_LANDMARKS,
  FaceShapeStabilizer,
  SHAPE_FIT,
  extractAnthropometricRatios,
  type FaceShape,
  type FaceShapeResult,
  type DetailedRatios,
} from "./faceShape";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TryOnStatus = "loading" | "ready" | "tracking" | "no-face" | "out-of-frame" | "error";

export type ScanState = "idle" | "aligning" | "scanning" | "completed" | "failed";

export type ScanProgressEvent = {
  state: ScanState;
  progress: number; // 0 to 100
  message: string;
  result?: FaceShapeResult;
};

export type TryOnViewerHandle = {
  captureSnapshot: () => string | null;
  startFaceScan: () => void;
  cancelFaceScan: () => void;
  resumeTryOn: () => void;
  isScanning: () => boolean;
  manualSetShape: (shape: FaceShape) => FaceShapeResult;
};

type TryOnViewerProps = {
  frameSrc?: string | null;
  onStatusChange?: (status: TryOnStatus, detail?: string) => void;
  onFaceShapeDetect?: (faceShape: string | null) => void;
  onFaceShapeResult?: (result: FaceShapeResult | null) => void;
  onScanProgress?: (event: ScanProgressEvent) => void;
  scaleOffset?: number;
  templeLength?: number;
  faceStretch?: number;
  cameraZoom?: number;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isModelSrc(src: string): boolean {
  return /\.(glb|gltf)(\?|$)/i.test(src);
}

/** Dynamic import of the MindAR npm package (ES module). */
async function getMindARThree(): Promise<any> {
  const mod = await import("mind-ar/dist/mindar-face-three.prod.js");
  return mod.MindARThree;
}

/**
 * Camera "enhance" look — a light contrast/saturation/brightness lift applied to
 * the webcam feed so the whole try-on reads crisp and premium instead of flat.
 * Kept subtle so skin tones stay natural.
 */
const CAMERA_FILTER = "none";

// ── AR placement tuning ─────────────────────────────────────────────────────────
// Placement is driven by a landmark head-pose basis (eyes → right, forehead↔chin → up),
// not MindAR's single-anchor rotation, so the frame tracks pitch/roll/yaw and sticks on
// tilt. These constants are the knobs to dial from screenshots — all are fractions of the
// inter-eye-corner distance (so they're distance-invariant) unless noted.
const AR = {
  SCALE_K: 1.95,     // frame width ÷ eye-corner distance (bigger = larger glasses)
  SEAT_DOWN: 0.03,   // seat relative to nose bridge anchor (+ = down toward nose)
  SEAT_FWD: 0.08,    // push forward off the face so lenses clear the brow (+ = toward camera)
  FWD_SIGN: 1,       // flip to -1 if the glasses render facing away from the camera
  // Clamp range for the auto arm-length stretch. The lower bound used to be 0.6, which
  // was BINDING on a typical model — the arm length was being set by the clamp rather
  // than by the solve, so it only looked right by coincidence.
  TEMPLE_MIN: 0.3,
  TEMPLE_MAX: 3.2,
  // How far outside the head the temple arms sit, in world cm. Enough to clear the skin
  // plus landmark jitter without the arms visibly standing off the head.
  // 0.3 cm (3mm) provides a natural snug fit along the temples.
  TEMPLE_CLEARANCE: 0.3,
  // Maximum outward angle at the hinge, in degrees. Real eyewear temples splay roughly
  // 5-8 degrees, keeping the arms hugging the temples without flaring open.
  TEMPLE_SPLAY_MAX_DEG: 8.0,
  // Depth over which the rotation eases in, as a fraction of the model. Kept short: it
  // is the hinge, not a bend. Long enough only to avoid tearing a mesh whose triangles
  // straddle the joint.
  TEMPLE_HINGE_FILLET: 0.05,
  // Strength of the outward flare (0..1).
  TEMPLE_SPLAY_STRENGTH: 0.75,
  // Cap on outward bend, as a fraction of the model's own half-width, so a bad head
  // measurement can never splay the arms into a wishbone.
  TEMPLE_SPLAY_MAX: 0.45,
  // The hinge is DETECTED from the model's own geometry, not assumed. These only control
  // the detector: a depth slice counts as arm once its narrowest vertex sits beyond this
  // fraction of the model's half-width (the frame front always has geometry near the
  // centre line — bridge, lenses — while an arm is two separate rails), and the bend then
  // ramps across the whole arm, so it starts at the hinge rather than snapping on.
  TEMPLE_RAIL_FRACTION: 0.35,
  // How far below the ear landmark the arm tip is aimed, in world cm. A hooked temple tip
  // sits about a centimetre below where the ear meets the head, so aiming AT the landmark
  // pulls the tip up and flattens the arm's own designed downward angle.
  TEMPLE_EAR_DROP: 1.0,
  // Cap on the vertical aim, in world cm. The model already knows what angle its own arms
  // run at; this only corrects for ears sitting unusually high or low.
  TEMPLE_AIM_MAX: 0,
  // Arms are solved to reach the ear, then extended by this factor so they carry past it
  // and hook down behind, as real temples do, instead of stopping level with it.
  // Set to 1.02 so temples snug the ears without overshooting into empty air.
  TEMPLE_REACH_K: 1.02,
  SMOOTH: 30,        // general-purpose smoothing rate for derived quantities

  // Placement smoothing rates, as exponential time constants (lag = 1000/rate ms).
  //
  // These replace a deadband-plus-adaptive-rate scheme whose thresholds sat exactly at
  // the landmark noise floor: 1% landmark noise produces 0.57 degrees of basis rotation,
  // against a 0.40 degree freeze threshold and a 0.46 degree rate switch. The frame held
  // still, then snapped at rate 30 the instant noise crossed the line, converting smooth
  // noise into visible steps. A deadband set at the noise floor is the worst place for
  // one -- it does not remove jitter, it makes it discrete.
  //
  // Plain exponential smoothing at a lower rate rejects far more: rate 12 attenuates
  // noise 3.2x against rate 30's 2.0x. The cost is lag, which is why rotation and scale
  // -- noisiest and most visible as shimmer -- are damped hardest, while position, where
  // lag reads as the frame sliding off the face, is kept quicker.
  // Smoothing rate is not fixed: it rises with how fast the head is actually moving.
  //
  // A constant rate cannot satisfy both requirements. Low enough to stop a still head
  // shimmering is too slow to keep up with a moving one -- which is exactly the swap
  // that was made when the deadbands came out: the shimmer went and the frame started
  // trailing the face, covering only 70% of a movement in 100ms where it had covered
  // 95%. Letting the rate follow speed removes the trade instead of picking a side,
  // and is the same principle One Euro uses one layer below this.
  //
  // MIN applies at rest, where nothing but noise is moving. SLOPE converts measured
  // speed into extra rate. MAX caps it so a tracking glitch cannot make the frame snap.
  ADAPT_POS_MIN: 18.0,     // Snappy base position tracking (prevents lag on face tilts)
  ADAPT_POS_SLOPE: 1.5,    // Gentle acceleration on movement
  ADAPT_ROT_MIN: 16.0,     // Tight head-turn rotation rate (sticks cleanly on tilt)
  ADAPT_ROT_SLOPE: 8.0,    // Smoothly tracks head turns without angular lag
  ADAPT_SCALE_MIN: 8.0,    // Stable scale damping
  ADAPT_SCALE_SLOPE: 10.0, // Scale follows natural depth changes
  ADAPT_POS_MAX: 30.0,     // Upper bound prevents sudden vibration snaps
  ADAPT_ROT_MAX: 28.0,     // Upper bound prevents angular jitter during head turns
  ADAPT_SCALE_MAX: 18.0,   // Upper bound for scale
  ADAPT_SPEED_SMOOTH: 8.0, // Stable velocity smoothing
  SMOOTH_SLIDER: 40, // while a slider is being dragged, respond immediately
  // cos of the maximum head turn whose landmarks are trusted for face-shape sampling.
  // 0.90 is about 25 degrees of yaw.
  SHAPE_MIN_FRONTALITY: 0.90,
  // Frames without a face after which the face-shape lock is released, on the assumption
  // that whoever comes back may be someone else. ~4s at 30fps.
  SHAPE_RELEASE_FRAMES: 120,
};

// Landmark indices used to build the head-pose basis (MediaPipe FaceMesh 468 topology).
const POSE_LANDMARKS = { eyeL: 33, eyeR: 263, foreheadTop: 10, chin: 152 } as const;

// ── Component ──────────────────────────────────────────────────────────────────

const TryOnViewer = forwardRef<TryOnViewerHandle, TryOnViewerProps>(
  function TryOnViewer(
    {
      frameSrc,
      onStatusChange,
      onFaceShapeDetect,
      onFaceShapeResult,
      onScanProgress,
      scaleOffset,
      templeLength,
      faceStretch,
      cameraZoom,
      positionX,
      positionY,
      positionZ,
      rotationX,
      rotationY,
      rotationZ,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mindarRef = useRef<any>(null);
    const glassesRef = useRef<THREE.Group | null>(null);
    const baseScaleRef = useRef(1);
    /** Native depth (Z size) of the loaded frame — used to auto-fit temple length to the ears. */
    const rawDepthRef = useRef(0);
    /** Native width (X size) of the loaded frame — used to scale frame width to the eyes. */
    const rawWidthRef = useRef(1);
    /** Read-only landmark anchors (eyes/forehead/chin) that drive the head-pose basis. */
    const poseAnchorsRef = useRef<Record<string, any> | null>(null);
    /** Smoothed temple-length Z multiplier held across frames. */
    const templeZRef = useRef(1.0);
    /** Smoothed face-size multiplier: corrects glasses scale for individual face widths. */
    const faceSizeMultRef = useRef(1.0);
    /** Ref tracking whether face pose was active in the previous frame (for instant snap). */
    const wasTrackingRef = useRef(false);
    /** Scanner state refs */
    const scanStateRef = useRef<ScanState>("idle");
    const scanSamplesRef = useRef<DetailedRatios[]>([]);
    const scanAlignFramesRef = useRef<number>(0);
    const lastResultRef = useRef<FaceShapeResult | null>(null);
    /** Total number of faces detected in the camera stream (for multi-face rejection). */
    const detectedFaceCountRef = useRef<number>(0);
    /** Ref tracking previous adjustments state to detect user slider interactions. */
    const lastAdjRef = useRef<any>(null);
    /** Previous frame's TARGET pose, for measuring how fast the head is really moving. */
    const prevTargetPosRef = useRef(new THREE.Vector3());
    const prevTargetQuatRef = useRef(new THREE.Quaternion());
    const prevTargetScaleRef = useRef(0);
    /** Smoothed speeds driving the adaptive rates. */
    const posSpeedRef = useRef(0);
    const rotSpeedRef = useRef(0);
    const scaleSpeedRef = useRef(0);
    /** Loop time at the last pose CHANGE, so speed is measured over the real interval. */
    const lastPoseChangeRef = useRef(0);
    /** Counter of frames to bypass deadband when user moves a slider. */
    const adjChangeCountRef = useRef(0);
    /**
     * Temple-splay state. Holds each arm mesh's untouched vertex positions plus a
     * per-vertex bend weight, so the outward bend can be re-applied from the original
     * geometry instead of accumulating drift across updates.
     */
    const splayRef = useRef<{
      parts: Array<{
        geom: THREE.BufferGeometry;
        attr: THREE.BufferAttribute;
        orig: Float32Array;
        /** Per-vertex X and Y in model-root space, centred on the frame. */
        rootX: Float32Array;
        /** Per-vertex Z in model-root space, for rotating about the hinge. */
        rootZ: Float32Array;
        /** Per-vertex hinge weight: 0 through the frame front, 1 along the arm. */
        w: Float32Array;
        /** Model-root +X, +Y and +Z expressed in this mesh's own local space. */
        dirX: THREE.Vector3;
        dirY: THREE.Vector3;
        dirZ: THREE.Vector3;
      }>;
      halfWidth: number;
      /** Root-space Z of the hinge line, the axis the arms rotate about. */
      hingeZ: number;
      /** Root-space |X| of the arm at the hinge — each arm turns about its OWN joint. */
      hingeX: number;
      /** Mean root-space Y of the arm tips, centred — the reference for aiming at the ear. */
      tipY: number;
      /** Mean backward distance from hinge to arm tip, in model units. */
      armReach: number;
      appliedAngle: number;
      appliedX: number;
      appliedY: number;
    }>({
      parts: [], halfWidth: 1, hingeZ: 0, hingeX: 0, tipY: 0, armReach: 1,
      appliedAngle: -1e9, appliedX: -1e9, appliedY: -1e9,
    });
    /** Mesh occluder for the back of the head/skull, preventing temple tips from floating. */
    const headOccluderRef = useRef<THREE.Mesh | null>(null);
    /** Real-time frameSrc ref to prevent closure race condition on initial route mount. */
    const frameSrcRef = useRef<string | null | undefined>(frameSrc);
    const loadIdRef = useRef(0);
    /**
     * Re-runs the cover-fit layout. Owned by the init effect; called from prop-change
     * effects and the ResizeObserver. Null until AR has started.
     */
    const applyFitRef = useRef<(() => void) | null>(null);
    /**
     * The rect (in container CSS px) that BOTH the video and the WebGL canvas occupy.
     * Snapshot compositing reads this so the saved PNG matches what's on screen.
     */
    const fitRectRef = useRef({ left: 0, top: 0, width: 0, height: 0 });

    // Face-shape detection: extra read-only landmark anchors + a stabilization buffer so we
    // only surface a shape once it's held steady across many frames (avoids flicker).
    const shapeAnchorsRef = useRef<Record<string, any> | null>(null);
    const shapeStabilizerRef = useRef(new FaceShapeStabilizer());
    const lastShapeRef = useRef<FaceShape | null>(null);
    /** Smoothed per-shape fit refinement, lerped in so a first lock isn't a visible jump. */
    const shapeWidthRef = useRef(1);
    const shapeSeatRef = useRef(0);
    /** Consecutive frames without a face — a long gap means a different person may be next. */
    const lostFramesRef = useRef(0);

    // Current smoothed values (for lerping user-adjustment changes only).
    // These are NOT used to smooth face-tracking — tracking is instant.
    const smoothRef = useRef({
      scale: 1,
      templeLength: 1.0,
      x: 0,
      y: -0.080,
      z: 0.018,
      rx: 0,
      ry: 0,
      rz: 0,
    });

    // Target adjustment values set by React props (updated via useEffect).
    // The animation loop reads these via ref to avoid stale closures.
    const adjustmentsRef = useRef({
      scale: 0.90,
      templeLength: 1.65,
      faceStretch: 1.0,
      cameraZoom: 1.0,
      positionX: 0.0,
      positionY: -0.080,
      positionZ: 0.018,
      rotationX: 0.0,
      rotationY: 0.0,
      rotationZ: 0.0,
    });
    const reportedStatusRef = useRef<TryOnStatus>("loading");
    /** Ref tracking whether the user's face is currently cut off / outside the screen box */
    const isFaceCutRef = useRef(false);

    // Sync cameraZoom & faceStretch synchronously so applyFit always reads fresh values
    adjustmentsRef.current.cameraZoom = cameraZoom ?? 1.0;
    adjustmentsRef.current.faceStretch = faceStretch ?? 1.0;

    useEffect(() => {
      adjustmentsRef.current = {
        scale: scaleOffset ?? 0.90,
        templeLength: templeLength ?? 1.65,
        faceStretch: faceStretch ?? 1.0,
        cameraZoom: cameraZoom ?? 1.0,
        positionX: positionX ?? 0.0,
        positionY: positionY ?? -0.080,
        positionZ: positionZ ?? 0.018,
        rotationX: rotationX !== undefined ? (rotationX * Math.PI) / 180 : 0.0,
        rotationY: rotationY !== undefined ? (rotationY * Math.PI) / 180 : 0.0,
        rotationZ: rotationZ !== undefined ? (rotationZ * Math.PI) / 180 : 0.0,
      };
    }, [scaleOffset, templeLength, faceStretch, cameraZoom, positionX, positionY, positionZ, rotationX, rotationY, rotationZ]);

    const [overlay, setOverlay] = useState<{ status: TryOnStatus; detail?: string }>({ status: "loading" });

    // ── Status reporting ───────────────────────────────────────────────────────

    const reportStatus = useCallback(
      (next: TryOnStatus, detail?: string) => {
        if (reportedStatusRef.current === next && next !== "loading") return;
        reportedStatusRef.current = next;
        setOverlay({ status: next, detail });
        onStatusChange?.(next, detail);
      },
      [onStatusChange],
    );

    // ── Load / swap glasses model ──────────────────────────────────────────────

    const loadFrame = useCallback(
      (src: string | null | undefined) => {
        const mindar = mindarRef.current;
        if (!mindar) return;
        const thisLoad = ++loadIdRef.current;
        const scene = mindar.scene;
        if (!scene) return;

        // Remove previous glasses from the scene
        for (const c of [...scene.children]) {
          if (c.userData._glassesMarker) {
            scene.remove(c);
            c.traverse((child: THREE.Object3D) => {
              if (child instanceof THREE.Mesh) {
                child.geometry?.dispose();
                (Array.isArray(child.material) ? child.material : [child.material]).forEach(
                  (m: THREE.Material) => m?.dispose(),
                );
              }
            });
          }
        }
        glassesRef.current = null;
        smoothRef.current = {
          scale: baseScaleRef.current * (adjustmentsRef.current.scale),
          templeLength: adjustmentsRef.current.templeLength,
          x: adjustmentsRef.current.positionX,
          y: adjustmentsRef.current.positionY,
          z: adjustmentsRef.current.positionZ,
          rx: adjustmentsRef.current.rotationX,
          ry: adjustmentsRef.current.rotationY,
          rz: adjustmentsRef.current.rotationZ,
        };

        if (!src || !isModelSrc(src)) return;

        const loader = new GLTFLoader();
        loader.load(
          src,
          (gltf) => {
            if (loadIdRef.current !== thisLoad) return;
            const model = gltf.scene;

            // Ensure depth and sRGB texture encoding are set so 3D materials reflect lighting correctly
            model.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat: any) => {
                  mat.depthTest = true;
                  mat.depthWrite = true;
                  child.renderOrder = 10;

                  // Preserve the GLB's authored opacity — do not override it.
                  // Clamping to ≥0.6 was turning lightly-tinted lenses into
                  // opaque milky glass and washing out the material's color.

                  if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
                  if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                  mat.needsUpdate = true;
                });
              }
            });

            // ── PIVOT CENTERING ──────────────────────────────────────────
            // Wrap the raw model in a parent Group. We shift the model
            // inside this group so that the center-front of the frame
            // (the nose bridge) sits at (0,0,0) in the group's local
            // coordinate system. This means all position/rotation
            // adjustments pivot exactly at the nose bridge — so when the
            // user tilts or turns their head, the glasses stay locked to
            // the nose instead of orbiting around an arbitrary point.
            const glassesGroup = new THREE.Group();
            glassesGroup.userData._glassesMarker = true;

            // Compute the bounding box of the raw model
            model.updateMatrixWorld(true);
            // precise=true walks the actual vertices. The default transforms each geometry's
            // LOCAL axis-aligned box and unions the results, which for a mesh sitting on a
            // ROTATED node is bigger than the true bounds and lopsided about the centre. The
            // catalogue has both kinds: a model whose node transforms are axis-aligned measures
            // identically either way, while one exported with rotations came out 7.7% too wide,
            // 14.9% too deep, and with its centre 1.0 units off - which lands as a frame sitting
            // 5.5mm to one side of the nose and rendering 7.7% small, because every downstream
            // number (centring, scale, the temple depth solve) is derived from this box.
            const rawBox = new THREE.Box3().setFromObject(model, true);
            const rawSize = rawBox.getSize(new THREE.Vector3());
            const rawCenter = rawBox.getCenter(new THREE.Vector3());

            // Analyse the temple arms.
            //
            // Everything here is derived from the model's own geometry rather than assumed,
            // because every frame is modelled differently — a rimless, a chunky acetate and a
            // thin-temple aviator put their hinge in completely different places. A previous
            // version hard-coded the hinge at 30% of the model's depth; on the first frame
            // actually measured it sits at 10%, so two thirds of the arm received no bend at
            // all and stayed inside the head. Detecting it costs one pass over the vertices at
            // load and is then free.
            //
            // The detector: walk depth slices from the lens plane backwards and find the first
            // slice whose NARROWEST vertex is far from the centre line. A frame front always
            // has geometry near the centre (bridge, nose pads, inner lens edges); an arm is two
            // separate rails with nothing between them. That transition is the hinge.
            //
            // Work is done in model-ROOT space and written back through each mesh's own inverse
            // transform, so a model exported with a net node rotation bends along the same axis
            // as one exported without.
            {
              const meshes: THREE.Mesh[] = [];
              model.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry?.attributes?.position) meshes.push(child);
              });

              const depth = rawSize.z || 1;
              const backZ = rawBox.max.z;
              const _v = new THREE.Vector3();

              // Root-space positions per mesh.
              const rootPos = meshes.map((child) => {
                const attr = child.geometry.attributes.position as THREE.BufferAttribute;
                const out = new Float32Array(attr.count * 3);
                for (let i = 0; i < attr.count; i++) {
                  _v.fromBufferAttribute(attr, i).applyMatrix4(child.matrixWorld);
                  out[i * 3] = _v.x - rawCenter.x;
                  out[i * 3 + 1] = _v.y - rawCenter.y;
                  out[i * 3 + 2] = _v.z;
                }
                return out;
              });

              let halfWidth = 1e-6;
              for (const arr of rootPos) {
                for (let i = 0; i < arr.length; i += 3) halfWidth = Math.max(halfWidth, Math.abs(arr[i]));
              }

              const BINS = 24;
              /** A slice needs this many vertices before it can be judged solid or rails. */
              const MIN_BIN_VERTS = 8;
              const narrowest = new Array<number>(BINS).fill(Number.POSITIVE_INFINITY);
              const binCount = new Array<number>(BINS).fill(0);
              for (const arr of rootPos) {
                for (let i = 0; i < arr.length; i += 3) {
                  const t = THREE.MathUtils.clamp((backZ - arr[i + 2]) / depth, 0, 1);
                  const bin = Math.min(BINS - 1, Math.floor(t * BINS));
                  const ax = Math.abs(arr[i]);
                  if (ax < narrowest[bin]) narrowest[bin] = ax;
                  binCount[bin]++;
                }
              }

              let hinge = -1;
              for (let bin = 0; bin < BINS; bin++) {
                // Skip empty slices. A model can have gaps along its depth, and an empty bin
                // leaves narrowest[] at Infinity, which compares as "two rails" and stops the
                // scan on a slice containing no geometry at all. On the second catalogue model
                // that reported the hinge at t=0.08 when it is really at t=0.21.
                if (binCount[bin] < MIN_BIN_VERTS) continue;
                if (narrowest[bin] > AR.TEMPLE_RAIL_FRACTION * halfWidth) {
                  hinge = bin / BINS;
                  break;
                }
              }

              if (hinge < 0) {
                // No identifiable arms (a lens-only or single-piece model). Bending guesswork
                // into it would deform the product, so leave the geometry alone.
                splayRef.current = {
                  parts: [], halfWidth, hingeZ: 0, hingeX: 0, tipY: 0, armReach: 1,
                  appliedX: -1e9, appliedY: -1e9, appliedAngle: -1e9,
                };
              } else {
                const hingeZ = backZ - hinge * depth;
                const filletEnd = Math.min(1, hinge + AR.TEMPLE_HINGE_FILLET);
                const parts: (typeof splayRef.current)["parts"] = [];
                let tipSum = 0;
                let tipN = 0;
                let reachSum = 0;
                let hingeXSum = 0;
                let hingeXN = 0;

                meshes.forEach((child, mi) => {
                  const attr = child.geometry.attributes.position as THREE.BufferAttribute;
                  const arr = rootPos[mi];
                  const w = new Float32Array(attr.count);
                  const rootX = new Float32Array(attr.count);
                  const rootZ = new Float32Array(attr.count);
                  let touched = false;
                  for (let i = 0; i < attr.count; i++) {
                    const t = THREE.MathUtils.clamp((backZ - arr[i * 3 + 2]) / depth, 0, 1);
                    // Ramps across the ENTIRE arm, not just past the hinge. Saturating early
                    // threw the arm 1.4cm outward within a tenth of its length, which reads as
                    // a sharp elbow - a frame that looks bent rather than worn. A real temple
                    // flares gradually from hinge to tip, and that also tracks how the skull
                    // widens toward the ear, so it clears by more rather than less.
                    // Short fillet, then a constant 1 along the whole arm: the rotation is
                    // applied rigidly, so the arm cannot curve.
                    w[i] = THREE.MathUtils.smoothstep(t, hinge, filletEnd);
                    rootX[i] = arr[i * 3];
                    rootZ[i] = arr[i * 3 + 2];
                    if (w[i] > 1e-3) touched = true;
                    if (t > 0.92) {
                      tipSum += arr[i * 3 + 1];
                      reachSum += hingeZ - arr[i * 3 + 2];
                      tipN++;
                    }
                    // Where the arm sits laterally as it leaves the joint.
                    if (t >= hinge && t <= filletEnd) {
                      hingeXSum += Math.abs(arr[i * 3]);
                      hingeXN++;
                    }
                  }
                  if (!touched) return; // a pure frame-front mesh never moves

                  // Root +X and +Y in this mesh's local space. Not normalised on purpose: the
                  // inverse already carries the scale, so multiplying by a root-space distance
                  // produces exactly that displacement in root space.
                  const m3 = new THREE.Matrix3().setFromMatrix4(child.matrixWorld).invert();
                  parts.push({
                    geom: child.geometry as THREE.BufferGeometry,
                    attr,
                    orig: new Float32Array(attr.array as ArrayLike<number>),
                    rootX,
                    w,
                    rootZ,
                    dirX: new THREE.Vector3(1, 0, 0).applyMatrix3(m3),
                    dirY: new THREE.Vector3(0, 1, 0).applyMatrix3(m3),
                    dirZ: new THREE.Vector3(0, 0, 1).applyMatrix3(m3),
                  });
                });

                splayRef.current = {
                  parts,
                  halfWidth,
                  hingeZ,
                  hingeX: hingeXN > 0 ? hingeXSum / hingeXN : halfWidth,
                  tipY: tipN > 0 ? tipSum / tipN : 0,
                  armReach: tipN > 0 ? Math.max(1e-6, reachSum / tipN) : 1,
                  appliedX: -1e9,
                  appliedY: -1e9,
                  appliedAngle: -1e9,
                };
              }
            }

            // Shift model so that:
            //   X: center of frame width → nose bridge center
            //   Y: center of frame height → eye level
            //   Z: front-most surface (lens plane) → at z=0
            // This way the glassesGroup origin IS the nose bridge.
            model.position.set(-rawCenter.x, -rawCenter.y, -rawBox.max.z);
            glassesGroup.add(model);

            // Scale the wrapper so the frame width matches the target
            // face width in MindAR's coordinate system (~0.95 units).
            const targetFaceWidth = 0.95;
            baseScaleRef.current = targetFaceWidth / rawSize.x;
            // Native frame width & depth: the loop scales width to the eyes and stretches
            // depth (arm length) to reach the ears.
            rawWidthRef.current = rawSize.x || 1;
            rawDepthRef.current = rawSize.z;

            // Apply initial transforms from current adjustments
            const adj = adjustmentsRef.current;
            glassesGroup.scale.set(
              baseScaleRef.current * adj.scale,
              baseScaleRef.current * adj.scale,
              baseScaleRef.current * adj.scale * adj.templeLength
            );
            glassesGroup.position.set(adj.positionX, adj.positionY, adj.positionZ);
            glassesGroup.rotation.set(adj.rotationX, adj.rotationY, adj.rotationZ);

            // Sync smoothRef so lerp doesn't animate from stale values
            smoothRef.current = {
              scale: baseScaleRef.current * adj.scale,
              templeLength: adj.templeLength,
              x: adj.positionX,
              y: adj.positionY,
              z: adj.positionZ,
              rx: adj.rotationX,
              ry: adj.rotationY,
              rz: adj.rotationZ,
            };

            // Parent to the scene (not the nose anchor): the animation loop drives its
            // world position/orientation/scale from the landmark head-pose basis.
            glassesGroup.matrixAutoUpdate = true;
            glassesGroup.visible = false; // Start hidden until a face is detected
            scene.add(glassesGroup);
            glassesRef.current = glassesGroup;
          },
          undefined,
          (err) => {
            console.error("GLB load error", err);
            reportStatus("error", "Could not load frame model");
          },
        );
      },
      [reportStatus],
    );

    // Zoom / stretch are baked into the fit rect, so a re-fit is all that's needed.
    // (No projection change — the camera intrinsics are unaffected.)
    useEffect(() => {
      applyFitRef.current?.();
    }, [faceStretch, cameraZoom]);

    const takeSnapshotNow = () => {
      const mindar = mindarRef.current;
      if (!mindar || !mindar.video || mindar.video.readyState < 2) return null;
      const container = containerRef.current;
      if (!container) return null;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return null;

      const snap = document.createElement("canvas");
      snap.width = Math.floor(w);
      snap.height = Math.floor(h);
      const ctx = snap.getContext("2d");
      if (!ctx) return null;

      // Composite exactly what's on screen: both layers occupy the same fit rect
      const { left, top, width, height } = fitRectRef.current;
      if (width <= 0 || height <= 0) return null;

      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, snap.width, snap.height);

      // 1. Draw camera video feed with matching filters and mirroring
      ctx.save();
      ctx.translate(left + width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(left + width / 2), 0);
      try {
        ctx.filter = CAMERA_FILTER; // match the on-screen enhanced feed
      } catch {
        // ignore filter if unsupported by browser context
      }
      ctx.drawImage(mindar.video, left, top, width, height);
      ctx.restore(); // resets filter to none so 3D frames draw unfiltered

      // 2. Synchronously re-render Three.js scene so WebGL buffer is fresh & populated
      if (mindar.renderer && mindar.scene && mindar.camera) {
        try {
          mindar.renderer.render(mindar.scene, mindar.camera);
        } catch {
          // fallback
        }
      }

      // 3. Draw 3D glasses frame WebGL canvas
      const canvas = mindar.renderer?.domElement;
      if (canvas) {
        try {
          ctx.drawImage(canvas, left, top, width, height);
        } catch {
          // fallback
        }
      }

      try {
        return snap.toDataURL("image/png");
      } catch (err) {
        console.error("Failed to generate snapshot data URL:", err);
        return null;
      }
    };

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => takeSnapshotNow(),
      startFaceScan: () => {
        scanStateRef.current = "aligning";
        scanSamplesRef.current = [];
        scanAlignFramesRef.current = 0;
        if (glassesRef.current) {
          glassesRef.current.visible = false;
        }
        onScanProgress?.({
          state: "aligning",
          progress: 0,
          message: "Center your face in the oval and look straight ahead",
        });
      },
      cancelFaceScan: () => {
        scanStateRef.current = "idle";
        scanSamplesRef.current = [];
        scanAlignFramesRef.current = 0;
        if (glassesRef.current && wasTrackingRef.current) {
          glassesRef.current.visible = true;
        }
        onScanProgress?.({
          state: "idle",
          progress: 0,
          message: "",
        });
      },
      resumeTryOn: () => {
        scanStateRef.current = "idle";
        if (glassesRef.current && wasTrackingRef.current) {
          glassesRef.current.visible = true;
        }
      },
      isScanning: () => scanStateRef.current === "aligning" || scanStateRef.current === "scanning",
      manualSetShape: (shape: FaceShape) => {
        const res = shapeStabilizerRef.current.lockShape(shape);
        lastShapeRef.current = shape;
        lastResultRef.current = res;
        onFaceShapeDetect?.(shape);
        onFaceShapeResult?.(res);
        return res;
      },
    }));

    // ── Init / teardown ────────────────────────────────────────────────────────

    useEffect(() => {
      let cancelled = false;
      let mindarInstance: any = null;
      const cleanupFns: Array<() => void> = [];

      async function init() {
        try {
          reportStatus("loading", "Starting AR…");

          // Load MindAR face-tracking module
          const MindARThree = await getMindARThree();

          if (cancelled) return;
          const container = containerRef.current;
          if (!container) return;

          // ── MindAR init with One-Euro filter for smoother tracking ──
          // filterMinCF: minimum cutoff frequency (lower = smoother/calmer when still)
          // filterBeta: speed coefficient (higher = snappier but jitterier while moving)
          // beta:1000 (previous) let raw landmark jitter straight through during motion,
          // so the frames shook. beta:10 keeps a smooth, glued-on feel with only a hair
          // of lag on fast head turns — the sweet spot for eyewear try-on.
          //
          // Construction happens with window.addEventListener temporarily stubbed, because
          // MindAR's constructor registers `window.addEventListener("resize", this._resize.bind(this))`
          // — binding the PROTOTYPE method. Any later override of `_resize` is invisible to
          // that listener, so every real resize (mobile address bar, rotate, keyboard) ran
          // MindAR's original sizing, which repositions the <video> but never touches the
          // WebGL canvas's transform. The two then held different geometry and the glasses
          // rendered offset from the face. We drop that listener and own resize ourselves.
          const nativeAddEventListener = window.addEventListener;
          window.addEventListener = function patchedAdd(this: Window, type: string, ...rest: any[]) {
            if (type === "resize") return; // drop MindAR's internal listener
            return (nativeAddEventListener as any).call(this, type, ...rest);
          } as typeof window.addEventListener;
          try {
            mindarInstance = new MindARThree({
              container,
              maxTrack: 1,
              shouldFaceUser: true,
              filterMinCF: 0.0005,   // was 0.001 — let raw landmarks through faster
              // Raised from 8 to 12. More responsive to speed changes so the frame
              // sticks during fast head turns instead of trailing behind.
              filterBeta: 12,
              // Suppress MindAR's stock loading/scanning/error overlays — this component
              // renders its own status chrome, and MindAR's injected its own absolutely
              // positioned layers into the same container.
              uiLoading: "no",
              uiScanning: "no",
              uiError: "no",
            });
          } finally {
            window.addEventListener = nativeAddEventListener;
          }

          mindarRef.current = mindarInstance;

          const { renderer, scene, camera } = mindarInstance;

          // Phones are fill-rate bound and also run MediaPipe on the same thread, so cap the
          // device pixel ratio harder there. 1.0 on mobile eliminates GPU bottleneck and overheating.
          const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.0 : 1.75));
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.LinearToneMapping;    // pass-through: no color curve, GLB material colors render exactly as authored (blue stays blue)
          renderer.toneMappingExposure = 1.0;               // neutral exposure — NeutralToneMapping doesn't need the ACES compensation boost

          // Studio environment reflection map — gives PBR metal/acetate materials glossy 3D reflections
          try {
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();
            const roomEnv = new RoomEnvironment();
            const envTexture = pmremGenerator.fromScene(roomEnv).texture;
            scene.environment = envTexture;
            roomEnv.dispose();
            pmremGenerator.dispose();
          } catch (e) {
            console.warn("Failed to generate scene environment map:", e);
          }

          // MindAR's own _resize handles the camera projection (fov/aspect from the tracker's
          // intrinsics) and the drawing-buffer size. We keep that, but strip its DOM geometry
          // work by re-applying our own layout immediately afterwards.
          const originalResize = mindarInstance._resize.bind(mindarInstance);

          /**
           * Single source of truth for on-screen layout.
           *
           * Computes one cover-fit rect for the container and applies the IDENTICAL
           * left/top/width/height to both the camera <video> and the WebGL canvas, so the
           * two can never disagree. Zoom is applied to this rect (a crop) rather than as a
           * CSS transform on the composited layers — a transform shrank the whole feed and
           * was the mechanism by which the two elements drifted apart.
           */
          const applyFit = () => {
            const video = mindarInstance?.video;
            const canvas = mindarInstance?.renderer?.domElement;
            const el = containerRef.current;
            if (!video || !canvas || !el) return;

            const cw = el.clientWidth;
            const ch = el.clientHeight;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (cw <= 0 || ch <= 0 || vw <= 0 || vh <= 0) return;

            const vAsp = vw / vh;
            const cAsp = cw / ch;
            let w: number;
            let h: number;

            // Use cover-fit across all devices (mobile & desktop) so the video feed
            // completely fills the container with ZERO black letterbox bars.
            if (vAsp > cAsp) {
              h = ch;
              w = ch * vAsp;
            } else {
              w = cw;
              h = cw / vAsp;
            }

            // Allow zooming out (< 1) down to 0.4 for wider FOV or in for tighter crop
            const zoom = Math.max(0.4, adjustmentsRef.current.cameraZoom ?? 1);
            const stretch = adjustmentsRef.current.faceStretch ?? 1;
            w *= zoom;
            h *= zoom * stretch;

            const left = (cw - w) / 2;
            const top = (ch - h) / 2;
            fitRectRef.current = { left, top, width: w, height: h };

            // Centering is expressed as left/top 50% + translate(-50%,-50%) rather than
            // computed pixel offsets. Percentages resolve against the containing block at
            // PAINT time, so the feed stays centred even if the width/height below are a
            // frame stale — a computed `left` silently anchors the feed to one edge the
            // moment the container size it was derived from stops being current.
            const mirrored = mindarInstance.shouldFaceUser && !mindarInstance.disableFaceMirror;
            for (const node of [video, canvas] as HTMLElement[]) {
              node.style.position = "absolute";
              node.style.left = "50%";
              node.style.top = "50%";
              node.style.right = "auto";
              node.style.bottom = "auto";
              node.style.margin = "0";
              node.style.maxWidth = "none";
              node.style.maxHeight = "none";
              node.style.width = `${w}px`;
              node.style.height = `${h}px`;
              node.style.transformOrigin = "center center";
            }
            // The box is already the video's exact aspect (times faceStretch), so the feed
            // must FILL it. Leaving the `cover` fallback active would make the video crop
            // while the canvas stretched whenever faceStretch != 1 — desyncing them again.
            video.style.objectFit = "fill";

            // Only the video is mirrored; MindAR already mirrors the tracking math for the
            // 3D scene (controller.setup(mirror)), so mirroring the canvas would double it.
            video.style.transform = `translate(-50%, -50%)${mirrored ? " scaleX(-1)" : ""}`;
            canvas.style.transform = "translate(-50%, -50%)";

            // Keep the CSS3D layer on the same rect. It scales from its top-left, so it
            // needs the equivalent centring expressed as a leading translate.
            const cssCanvas = mindarInstance.cssRenderer?.domElement as HTMLElement | undefined;
            if (cssCanvas) {
              cssCanvas.style.position = "absolute";
              cssCanvas.style.left = "50%";
              cssCanvas.style.top = "50%";
              cssCanvas.style.transformOrigin = "top left";
              cssCanvas.style.transform =
                `translate(${-w / 2}px, ${-h / 2}px) scale(${w / (vw || 1)}, ${h / (vh || 1)})`;
            }

            // Dev-only: verify the feed actually landed centred on the container. Fits only
            // run on resize, so this can't spam. If the feed is ever visibly off to one side,
            // this reports which measurement disagreed instead of leaving it to guesswork.
            if (process.env.NODE_ENV !== "production") {
              const cRect = el.getBoundingClientRect();
              const vRect = video.getBoundingClientRect();
              const drift = Math.round((vRect.left + vRect.width / 2) - (cRect.left + cRect.width / 2));
              const log = Math.abs(drift) > 1 ? console.warn : console.debug;
              log(
                `[TryOn fit] container ${cw}x${ch} · stream ${vw}x${vh} (${vAsp > 1 ? "landscape" : "portrait"}) ` +
                `· feed ${Math.round(w)}x${Math.round(h)} · zoom ${zoom} · horizontal drift ${drift}px` +
                (Math.abs(drift) > 1 ? " ← FEED IS NOT CENTRED" : ""),
              );
            }
          };
          applyFitRef.current = applyFit;

          // Replace _resize wholesale: projection/buffer from MindAR, geometry from us.
          mindarInstance._resize = () => {
            try {
              originalResize();
            } catch (e) {
              console.warn("MindAR internal resize failed", e);
            }
            applyFit();
          };

          // Softer studio lighting — environment map handles PBR reflections;
          // direct lights only define soft depth/shadow. Total ≈1.75 units
          // prevents white-light flooding that was bleaching coloured materials.
          scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.4));
          scene.add(new THREE.AmbientLight(0xffffff, 0.2)); // kept low so 3D depth stays crisp

          const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
          keyLight.position.set(1, 2, 2);
          scene.add(keyLight);

          const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
          fillLight.position.set(-1, 0.5, 1.5);
          scene.add(fillLight);

          const topLight = new THREE.DirectionalLight(0xffffff, 0.25);
          topLight.position.set(0, 3, 0);
          scene.add(topLight);

          // Face anchor at nose bridge — the glasses parent (anchors[0]).
          mindarInstance.addAnchor(168);
          // Top-of-ear landmarks (where the ear meets the head — the exact point
          // real glasses arms rest on). No meshes attached; we only read their
          // tracked positions each frame to aim the temple tips there.
          // 127 = top of left ear, 356 = top of right ear. (The tragion points
          // 234/454 sit lower/forward at ear-canal level, so the tips landed
          // below the resting point.) anchors[1]=left, anchors[2]=right.
          mindarInstance.addAnchor(127);
          mindarInstance.addAnchor(356);

          // Pose anchors (eyes/forehead/chin) — read each frame to build the head-pose basis
          // that drives glasses placement. Created unconditionally.
          {
            const poseAnchors: Record<string, any> = {};
            for (const [key, idx] of Object.entries(POSE_LANDMARKS)) {
              poseAnchors[key] = mindarInstance.addAnchor(idx);
            }
            poseAnchorsRef.current = poseAnchors;
          }

          // Read-only anchors used to sample landmark positions for face-shape
          // classification and face-size auto-fit (no meshes attached).
          {
            const shapeAnchors: Record<string, any> = {};
            for (const [key, idx] of Object.entries(FACE_SHAPE_LANDMARKS)) {
              shapeAnchors[key] = mindarInstance.addAnchor(idx);
            }
            shapeAnchorsRef.current = shapeAnchors;
          }

          // Face mesh occluder — hides the temple arms where they pass behind the head.
          //
          // The offset used to be factor -1, units -4. Both signs were wrong for the stated
          // intent: polygon offset is ADDED to depth, so negative values pull the occluder
          // TOWARD the camera and make it occlude more, not less. Worse, `factor` multiplies
          // the depth SLOPE, which is at its maximum exactly at the head silhouette — where
          // the temple arms run. The occluder was inflating there and eating arms that were
          // genuinely outside the head, which no amount of splay could fix because the bias
          // scales with viewing angle rather than distance.
          // Now: no slope term at all, and a small constant push AWAY from the camera, which
          // is what protects the lens edges from z-fighting without swallowing anything.
          const faceMesh = mindarInstance.addFaceMesh();
          faceMesh.material = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true,
            depthTest: true,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 0,
            polygonOffsetUnits: 4,
          });
          faceMesh.renderOrder = 0;
          faceMesh.visible = true;
          mindarInstance.scene.add(faceMesh);

          // Head / skull depth occluder — prevents temple arm tips behind the ears
          // from rendering in empty air beyond the edge of MindAR's face mesh.
          const headOccluderGeom = new THREE.CylinderGeometry(0.85, 0.85, 2.0, 24);
          headOccluderGeom.translate(0, -0.1, -1.1);
          const headOccluderMat = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true,
            depthTest: true,
          });
          const headOccluder = new THREE.Mesh(headOccluderGeom, headOccluderMat);
          headOccluder.renderOrder = 0;
          headOccluder.visible = false;
          mindarInstance.scene.add(headOccluder);
          headOccluderRef.current = headOccluder;

          // Load initial glasses if a model src was provided
          if (frameSrc && isModelSrc(frameSrc)) {
            loadFrame(frameSrc);
          }

          // ── Start tracking with a container-shaped, mobile-friendly camera stream ──
          // MindAR builds its getUserMedia constraints internally and requests no resolution
          // at all, so phones hand back 720p/1080p LANDSCAPE. Cover-fitting a landscape stream
          // into a portrait container crops away most of the width, which is why the face was
          // squeezed into a sliver. We request a stream whose orientation matches the container
          // (portrait on phones) at a modest resolution — this both fills the screen properly
          // and roughly halves per-frame tracking cost.
          const isCompact = window.innerWidth < 768;
          const portrait = container.clientHeight >= container.clientWidth;
          // Performance-optimized resolutions: 480x640 portrait on mobile runs at 60fps with zero lag,
          // matching MediaPipe FaceMesh's internal network perfectly without CPU downsampling overhead.
          const idealWidth = isCompact ? (portrait ? 480 : 640) : (portrait ? 720 : 1280);
          const idealHeight = isCompact ? (portrait ? 640 : 480) : (portrait ? 1280 : 720);
          const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
            if (!constraints?.video || typeof constraints.video !== "object") {
              return nativeGetUserMedia(constraints);
            }
            try {
              return await nativeGetUserMedia({
                ...constraints,
                video: {
                  ...constraints.video,
                  facingMode: "user",
                  width: { ideal: idealWidth },
                  height: { ideal: idealHeight },
                  aspectRatio: { ideal: portrait ? 0.75 : 1.333 },
                  frameRate: { ideal: 30, max: 30 },
                  advanced: [{ zoom: 1 } as any],
                },
              });
            } catch (e) {
              console.warn("Constrained camera request failed; falling back to defaults", e);
              return nativeGetUserMedia(constraints);
            }
          };
          try {
            await mindarInstance.start();
          } finally {
            navigator.mediaDevices.getUserMedia = nativeGetUserMedia;
          }

          if (cancelled) return;
          reportStatus("ready");

          // Hook multi-face detection to detect if 2 or more faces are in view
          try {
            const fmh = (mindarInstance as any).controller?.faceMeshHelper;
            if (fmh) {
              if (fmh.faceLandmarker?.setOptions) {
                fmh.faceLandmarker.setOptions({ numFaces: 2 });
              }
              const origDetect = fmh.detect.bind(fmh);
              fmh.detect = async (input: any) => {
                const res = await origDetect(input);
                if (res?.faceLandmarks) {
                  detectedFaceCountRef.current = res.faceLandmarks.length;
                } else {
                  detectedFaceCountRef.current = 0;
                }
                return res;
              };
            }
          } catch (e) {
            console.warn("Multi-face detector hook failed:", e);
          }

          // Load initial glasses using fresh frameSrcRef (prevents closure race condition on route navigation)
          const initialSrc = frameSrcRef.current;
          if (initialSrc && isModelSrc(initialSrc)) {
            loadFrame(initialSrc);
          }

          // ── Fix element layering ──────────────────────────────────────
          const video = mindarInstance.video;
          if (video) {
            video.style.zIndex = "0";
            video.style.filter = CAMERA_FILTER; // crisp "enhance" look on the feed
            // Safety net: if applyFit ever bails before the stream reports its dimensions,
            // the browser still cover-crops the feed instead of leaving a raw, oversized
            // element pinned to a corner. Once applyFit sizes the box to the video's exact
            // aspect this is a no-op.
            video.style.objectFit = "cover";
            video.play().catch(() => {});
          }
          if (renderer.domElement) {
            renderer.domElement.style.zIndex = "1";
          }
          if (mindarInstance.cssRenderer?.domElement) {
            mindarInstance.cssRenderer.domElement.style.zIndex = "2";
          }

          // ── Keep the fit correct for the life of the session ───────────────────
          // A window "resize" is NOT emitted when the container changes size for layout
          // reasons — the frame carousel populating, the adjustment drawer opening, the
          // studio reflowing. Previously the fit was only nudged by a few setTimeouts in
          // the first second and then frozen forever against a stale container size.
          // A ResizeObserver on the container covers every case, layout or viewport.
          mindarInstance._resize();

          const scheduleFit = () => {
            if (cancelled) return;
            requestAnimationFrame(() => {
              if (!cancelled) applyFit();
            });
          };

          const resizeObserver = new ResizeObserver(scheduleFit);
          resizeObserver.observe(container);
          cleanupFns.push(() => resizeObserver.disconnect());

          // The projection/buffer must be recomputed when the STREAM's dimensions change
          // (orientation change on mobile re-negotiates the track), not just the container.
          // `loadedmetadata` is what makes videoWidth/videoHeight readable at all — without
          // it, a fit attempted before metadata arrives bails out and never retries.
          const onVideoResize = () => { if (!cancelled) mindarInstance._resize(); };
          const videoElement = mindarInstance.video;
          if (videoElement) {
            for (const evt of ["resize", "loadedmetadata", "playing"]) {
              videoElement.addEventListener(evt, onVideoResize);
              cleanupFns.push(() => videoElement.removeEventListener(evt, onVideoResize));
            }
          }

          window.addEventListener("orientationchange", scheduleFit);
          cleanupFns.push(() => window.removeEventListener("orientationchange", scheduleFit));
          window.addEventListener("resize", scheduleFit);
          cleanupFns.push(() => window.removeEventListener("resize", scheduleFit));

          // Three.js clock to compute delta time for frame-rate independence
          const clock = new THREE.Clock();
          /** Monotonic loop time in seconds, accumulated from dt so it cannot skip on a stall.
              Head speed is measured against this rather than against frame counts. */
          let loopTime = 0;
          // Scratch vectors reused each frame for the ear auto-fit (no per-frame allocation).
          const _earL = new THREE.Vector3();
          const _earR = new THREE.Vector3();
          const _cheekL = new THREE.Vector3();
          const _cheekR = new THREE.Vector3();
          const _shapeVec = new THREE.Vector3();
          // Scratch objects for the head-pose placement (no per-frame allocation).
          const _eyeL = new THREE.Vector3();
          const _eyeR = new THREE.Vector3();
          const _fore = new THREE.Vector3();
          const _chin = new THREE.Vector3();
          const _right = new THREE.Vector3();
          const _up = new THREE.Vector3();
          const _fwd = new THREE.Vector3();
          const _earMid = new THREE.Vector3();
          const _tmp = new THREE.Vector3();
          const _pos = new THREE.Vector3();
          const _faceCenter = new THREE.Vector3();
          const _projPos = new THREE.Vector3();
          const _projFore = new THREE.Vector3();
          const _projChin = new THREE.Vector3();
          const _projEyeL = new THREE.Vector3();
          const _projEyeR = new THREE.Vector3();
          const _projCheekL = new THREE.Vector3();
          const _projCheekR = new THREE.Vector3();
          const _projEarL = new THREE.Vector3();
          const _projEarR = new THREE.Vector3();
          const _basis = new THREE.Matrix4();
          const _qTarget = new THREE.Quaternion();
          const _qUser = new THREE.Quaternion();
          const _euler = new THREE.Euler();

          // Sample the shape landmarks every few frames, classify, and continuously emit
          // the current best shape so the UI stays live — not just on first detection.
          /**
           * Sample the face proportions and feed the stabiliser.
           *
           * Only near-frontal frames are used. The ratios themselves are rotation-invariant
           * (they come from 3D metric landmarks), but MediaPipe's landmark ACCURACY falls off
           * sharply once a face turns, and the silhouette points this reads — cheek, jaw, brow —
           * are exactly the ones that degrade first. Feeding those in is how a stable measure
           * gets polluted by geometry that was never in question.
           */
          const sampleFaceShapeDetailed = (frontality: number): DetailedRatios | null => {
            const sa = shapeAnchorsRef.current;
            if (!sa) return null;
            if (frontality < AR.SHAPE_MIN_FRONTALITY) return null;

            const pts: Record<string, { x: number; y: number; z: number }> = {};
            for (const key of Object.keys(FACE_SHAPE_LANDMARKS)) {
              const g = sa[key]?.group;
              if (!g || !g.visible) return null; // a needed landmark isn't tracked right now
              g.getWorldPosition(_shapeVec);
              pts[key] = { x: _shapeVec.x, y: _shapeVec.y, z: _shapeVec.z };
            }

            return extractAnthropometricRatios(pts as any);
          };

          // ── Animation loop ─────────────────────────────────────────────
          // Face tracking is handled entirely by MindAR which sets the
          // anchor.group.matrix directly each frame. That provides the
          // position + rotation + scale relative to the face.
          //
          // We calculate delta time to ensure our interpolation is
          // frame-rate independent, allowing butter-smooth updates on both
          // standard 30-60Hz mobile screens and premium 90-120Hz displays.
          renderer.setAnimationLoop(() => {
            const glasses = glassesRef.current;

            const pose = poseAnchorsRef.current;
            const eyeLg = pose?.eyeL?.group;
            const eyeRg = pose?.eyeR?.group;
            const foreg = pose?.foreheadTop?.group;
            const ching = pose?.chin?.group;
            const faceLandmarksVisible =
              !!eyeLg?.visible && !!eyeRg?.visible && !!foreg?.visible && !!ching?.visible;
            const poseReady = !!glasses && faceLandmarksVisible;

            // Read once per frame, tracking or not. Reading it only inside the tracking
            // branch let the delta accumulate across a no-face gap, so the first frame after
            // re-acquisition saw an inflated dt and the smoothing jumped.
            const clampedDt = Math.min(clock.getDelta(), 0.1);
            loopTime += clampedDt;

            if (poseReady) {
              const adj = adjustmentsRef.current;
              const k = 1.0 - Math.exp(-AR.SMOOTH * clampedDt);

              // ── Head-pose basis from tracked landmark POSITIONS ──────────
              // Positions are what MediaPipe/MindAR track most reliably (far more than a
              // single anchor's rotation), so a basis built from them locks the frame to
              // the face through pitch/roll/yaw — fixing the "floats down on tilt".
              eyeLg.getWorldPosition(_eyeL);
              eyeRg.getWorldPosition(_eyeR);
              foreg.getWorldPosition(_fore);
              ching.getWorldPosition(_chin);

              _right.subVectors(_eyeR, _eyeL).normalize();        // ear-to-ear (X)
              _up.subVectors(_fore, _chin).normalize();           // chin-to-forehead (Y)
              _fwd.crossVectors(_right, _up).normalize().multiplyScalar(AR.FWD_SIGN); // face normal (Z)
              _up.crossVectors(_fwd, _right).normalize();         // re-orthonormalize
              _basis.makeBasis(_right, _up, _fwd);
              _qTarget.setFromRotationMatrix(_basis);
              // User rotation nudges (Tilt/Yaw/Roll sliders) applied in head-local space.
              _qUser.setFromEuler(_euler.set(adj.rotationX, adj.rotationY, adj.rotationZ, "XYZ"));
              _qTarget.multiply(_qUser);

              const eyeDist = _eyeL.distanceTo(_eyeR);
              lostFramesRef.current = 0;

              // ── Face Size Auto-Fit ───────────────────────────────────────
              // Cheek landmarks 234/454 are registered as shape anchors ("cheekL"/"cheekR").
              // We measure real cheekbone width in world space vs eye separation to auto-adapt
              // glasses size for wider or narrower faces.
              // Measured off MindAR's canonical-face-model.obj: |234-454| / |33-263|
              // = 15.328cm / 8.892cm. At 1.65 an average face resolved to a multiplier of
              // 1.045 rather than 1.0 — a standing +4.5% oversize on every user.
              const REFERENCE_FACE_RATIO = 1.7239; // canonical cheekWidth / eyeDist
              const sa = shapeAnchorsRef.current;
              const cheekLg = sa?.cheekL?.group;
              const cheekRg = sa?.cheekR?.group;

              let faceSizeMultiplier = faceSizeMultRef.current;
              if (cheekLg?.visible && cheekRg?.visible) {
                cheekLg.getWorldPosition(_cheekL);
                cheekRg.getWorldPosition(_cheekR);
                const cheekWidth = _cheekL.distanceTo(_cheekR);
                if (cheekWidth > 1e-6 && eyeDist > 1e-6) {
                  const rawRatio = cheekWidth / eyeDist;
                  const rawMult = rawRatio / REFERENCE_FACE_RATIO;
                  // Wider clamp (0.75–1.40 vs previous 0.80–1.30) gives more headroom
                  // to auto-adapt across the wide variety of Android selfie camera FOVs.
                  const targetMult = THREE.MathUtils.clamp(rawMult, 0.75, 1.40);
                  // Smooth slowly (k * 0.10) so scale changes are rock-solid without shimmer
                  faceSizeMultRef.current = THREE.MathUtils.lerp(faceSizeMultRef.current, targetMult, k * 0.10);
                  faceSizeMultiplier = faceSizeMultRef.current;
                }
              }

              // ── Frontality ───────────────────────────────────────────────
              // 1 when facing the camera, falling toward 0 as the head turns. Used to gate
              // face-shape sampling — NOT to scale the frame.
              //
              // There used to be a yaw scale compensation here, dividing scale by this same
              // factor to undo the "perspective foreshortening of eyeDist". eyeDist is not
              // foreshortened: it is the 3D distance between two metric world landmarks, and
              // an anchor's world position is R*t + tvec, so the separation reduces to
              // |t1 - t2| — invariant to head rotation. The correction was undoing something
              // that never happened, and inflated the frame by up to 35% the moment the user
              // turned their head: a 142mm frame rendered at 181mm at a 35 degree turn.
              const frontality = Math.sqrt(Math.max(0, 1.0 - _right.z * _right.z));

              // ── Face-Shape Scanning & Background Sampling ─────────────
              const isScanActive = scanStateRef.current === "aligning" || scanStateRef.current === "scanning";

              if (isScanActive) {
                // 1. Multi-face rejection: if two or more faces are detected in view, block scan completely
                if (detectedFaceCountRef.current >= 2) {
                  scanAlignFramesRef.current = 0;
                  scanSamplesRef.current = [];
                  onScanProgress?.({
                    state: "aligning",
                    progress: 0,
                    message: "Multiple faces detected — please keep only one face in view",
                  });
                } else {
                  // 2. Circle / Reticle containment check
                  _faceCenter.addVectors(_eyeL, _eyeR).multiplyScalar(0.5);
                  _projPos.copy(_faceCenter).project(camera);
                  _projFore.copy(_fore).project(camera);
                  _projChin.copy(_chin).project(camera);

                  const faceCenterX = _projPos.x;
                  const faceCenterY = _projPos.y;
                  const faceHeight = _projFore.y - _projChin.y; // distance from chin to forehead in NDC

                  const isTooFar = faceHeight < 0.35;
                  const isTooClose = faceHeight > 0.96;
                  const isOffCenterHoriz = Math.abs(faceCenterX) > 0.24;
                  const isOffCenterVert = Math.abs(faceCenterY - 0.08) > 0.24;
                  const isFaceInsideCircle = !isTooFar && !isTooClose && !isOffCenterHoriz && !isOffCenterVert;

                  if (!isFaceInsideCircle) {
                    scanAlignFramesRef.current = 0;
                    let alignMsg = "Please position your face inside the circle";
                    if (isTooFar) alignMsg = "Move closer to the circle";
                    else if (isTooClose) alignMsg = "Move back slightly from the circle";
                    else if (isOffCenterHoriz || isOffCenterVert) alignMsg = "Center your face inside the circle";

                    onScanProgress?.({
                      state: "aligning",
                      progress: Math.min(100, Math.round((scanSamplesRef.current.length / 25) * 100)),
                      message: alignMsg,
                    });
                  } else if (frontality < 0.92) {
                    scanAlignFramesRef.current = 0;
                    onScanProgress?.({
                      state: "aligning",
                      progress: Math.min(100, Math.round((scanSamplesRef.current.length / 25) * 100)),
                      message: "Please look straight ahead at the camera",
                    });
                  } else {
                    scanAlignFramesRef.current++;
                    if (scanAlignFramesRef.current >= 3) {
                      scanStateRef.current = "scanning";
                      const sample = sampleFaceShapeDetailed(frontality);
                      if (sample) {
                        scanSamplesRef.current.push(sample);
                        const pct = Math.min(100, Math.round((scanSamplesRef.current.length / 25) * 100));
                        onScanProgress?.({
                          state: "scanning",
                          progress: pct,
                          message: pct < 100 ? `Analyzing 3D facial proportions… ${pct}%` : "Calculating best match…",
                        });

                        if (scanSamplesRef.current.length >= 25) {
                          scanStateRef.current = "completed";
                          const res = shapeStabilizerRef.current.solveFromScan(scanSamplesRef.current);
                          if (res) {
                            lastShapeRef.current = res.shape;
                            lastResultRef.current = res;
                            onFaceShapeDetect?.(res.shape);
                            onFaceShapeResult?.(res);
                            onScanProgress?.({
                              state: "completed",
                              progress: 100,
                              message: "Face shape identified!",
                              result: res,
                            });
                          }
                        }
                      }
                    }
                  }
                }
              }

              // ── Detect User Slider Adjustments ────────────────────────────
              if (lastAdjRef.current) {
                const diffX = Math.abs(adj.positionX - lastAdjRef.current.positionX);
                const diffY = Math.abs(adj.positionY - lastAdjRef.current.positionY);
                const diffZ = Math.abs(adj.positionZ - lastAdjRef.current.positionZ);
                const diffRotX = Math.abs(adj.rotationX - lastAdjRef.current.rotationX);
                const diffRotY = Math.abs(adj.rotationY - lastAdjRef.current.rotationY);
                const diffRotZ = Math.abs(adj.rotationZ - lastAdjRef.current.rotationZ);
                const diffScale = Math.abs(adj.scale - lastAdjRef.current.scale);
                if (diffX > 1e-4 || diffY > 1e-4 || diffZ > 1e-4 || diffRotX > 1e-4 || diffRotY > 1e-4 || diffRotZ > 1e-4 || diffScale > 1e-4) {
                  adjChangeCountRef.current = 6; // Track the slider at full speed for 6 frames
                }
              }
              lastAdjRef.current = { ...adj };
              const isSliderActive = adjChangeCountRef.current > 0;
              if (isSliderActive) adjChangeCountRef.current--;

              // ── Shape-driven fit refinement ──────────────────────────────
              // Width is driven by the MEASURED face width above; shape only refines it.
              // Lerped so the moment the stabiliser locks isn't a visible pop.
              const fit = lastShapeRef.current ? SHAPE_FIT[lastShapeRef.current] : null;
              shapeWidthRef.current = THREE.MathUtils.lerp(
                shapeWidthRef.current, fit ? fit.widthScale : 1, k * 0.05,
              );
              shapeSeatRef.current = THREE.MathUtils.lerp(
                shapeSeatRef.current, fit ? fit.seatOffset : 0, k * 0.05,
              );

              const rawTargetScale =
                (eyeDist * AR.SCALE_K / rawWidthRef.current) *
                adj.scale * faceSizeMultiplier * shapeWidthRef.current;

              // Smoothed below rather than deadbanded. A 1.5% threshold against ~1% eyeDist
              // noise meant size held still and then jumped, which reads as the frame
              // pulsing on the face.
              const targetScale = rawTargetScale;


              // ── Position Base: Nose Bridge Landmark + EyeDist Scaled User Offsets ──
              const noseAnchor = mindarInstance.anchors?.[0]?.group;
              if (noseAnchor?.visible) {
                noseAnchor.getWorldPosition(_pos);
              } else {
                _pos.addVectors(_eyeL, _eyeR).multiplyScalar(0.5); // fallback
              }

              // Position offsets scale proportionally with eyeDist so sliders respond predictably
              const userY = adj.positionY * eyeDist * 2.5;
              const userZ = adj.positionZ * eyeDist * 2.5;
              const userX = adj.positionX * eyeDist * 2.5;

              _pos.addScaledVector(_up, -((AR.SEAT_DOWN + shapeSeatRef.current) * eyeDist) + userY);
              _pos.addScaledVector(_fwd, AR.SEAT_FWD * eyeDist + userZ);
              _pos.addScaledVector(_right, userX);

              // ── Fit the temples to the ears ──────────────────────────────
              // The arm spans from the LENS PLANE back to the ear, and the lens plane is
              // `_pos` — pushed forward of the nose bridge by SEAT_FWD. Measuring from the eye
              // midpoint instead, as this did, under-asks by half: on the canonical face the
              // true span is 7.95cm and eyeMid→earMid is only 5.18cm. The solve then produced
              // 0.40 and was rescued by the 0.6 lower clamp, landing near the right answer by
              // luck rather than by measurement. Projecting onto the face normal is also what
              // the Z scale physically does, so the two now agree.
              const earLg = mindarInstance.anchors?.[1]?.group;
              const earRg = mindarInstance.anchors?.[2]?.group;
              if (earLg?.visible && earRg?.visible && rawDepthRef.current > 1e-6 && targetScale > 1e-6) {
                earLg.getWorldPosition(_earL);
                earRg.getWorldPosition(_earR);
                _earMid.addVectors(_earL, _earR).multiplyScalar(0.5);

                const reach = _tmp.subVectors(_pos, _earMid).dot(_fwd) * AR.TEMPLE_REACH_K;
                const nativeArm = rawDepthRef.current * targetScale;
                if (nativeArm > 1e-6 && reach > 0) {
                  const solved = THREE.MathUtils.clamp(reach / nativeArm, AR.TEMPLE_MIN, AR.TEMPLE_MAX);
                  // Driven by the ear landmarks, which are among the noisiest on the mesh,
                  // and arm length changing frame to frame reads as the temples breathing.
                  templeZRef.current = THREE.MathUtils.lerp(
                    templeZRef.current,
                    solved,
                    1.0 - Math.exp(-AR.ADAPT_SCALE_MIN * clampedDt),
                  );
                }

                // ── Sit the arms on the ears ──────────────────────────────
                // Two corrections, both measured from the wearer:
                //
                //  Angle — rotate each arm outward about its hinge so it clears the skull.
                //      An arm at its modelled width runs inside the head for its last 40%,
                //      where the occluder correctly hides it, which reads as the temple being
                //      too short. This is a RIGID rotation: every vertex keeps its position
                //      relative to every other, so a straight temple stays straight and only
                //      its direction changes. An earlier version displaced vertices sideways
                //      by a varying amount, which bent the arm and made the frame look broken.
                //  Y — shift the arm so its TIP lands on the ear landmark, since the model's
                //      own angle knows nothing about where this wearer's ears sit.
                const splay = splayRef.current;
                if (splay.parts.length > 0 && targetScale > 1e-6) {
                  const sa2 = shapeAnchorsRef.current;
                  const cl = sa2?.cheekL?.group;
                  const cr = sa2?.cheekR?.group;

                  // Measure skull half-width projected strictly along the glasses frame's transverse (_right) axis.
                  // Using raw 3D Euclidean distance caused artificial widening whenever the head
                  // pitched, rolled, or tilted due to Z-depth disparity between the ear landmarks.
                  const earLat = Math.abs(_tmp.subVectors(_earL, _earR).dot(_right)) * 0.5;
                  let headHalf = earLat;
                  if (cl?.visible && cr?.visible) {
                    cl.getWorldPosition(_cheekL);
                    cr.getWorldPosition(_cheekR);
                    const cheekLat = Math.abs(_tmp.subVectors(_cheekL, _cheekR).dot(_right)) * 0.5;
                    headHalf = Math.max(headHalf, cheekLat);
                  }
                  // Anatomical clamp: head temple half-width is strictly 1.05x to 1.35x of inter-eye distance
                  headHalf = THREE.MathUtils.clamp(headHalf, eyeDist * 1.05, eyeDist * 1.35);

                  // Calculate required hinge angle:
                  // 1. Arm reach in model units accounts for user templeLength stretch.
                  //    A longer arm needs a SMALLER angle to clear the same lateral offset (sin θ = ΔX / L).
                  // 2. Realistic 3mm clearance avoids floating gap in thin air.
                  let targetAngle = 0;
                  if (AR.TEMPLE_SPLAY_STRENGTH > 0) {
                    const effectiveArmReach = Math.max(1e-6, splay.armReach * Math.max(0.5, adj.templeLength));
                    const hingeX = splay.hingeX > 0 ? splay.hingeX : splay.halfWidth;
                    const needModel = Math.max(0, (headHalf + AR.TEMPLE_CLEARANCE) / targetScale - hingeX);
                    const maxRad = THREE.MathUtils.degToRad(AR.TEMPLE_SPLAY_MAX_DEG);
                    const sin = THREE.MathUtils.clamp(needModel / effectiveArmReach, 0, Math.sin(maxRad));
                    targetAngle = Math.min(Math.asin(sin), maxRad) * AR.TEMPLE_SPLAY_STRENGTH;
                  }

                  // Temporal smoothing on splay angle prevents sudden flaring or fluttering during head movement
                  let angle = targetAngle;
                  if (splay.appliedAngle < -100) {
                    splay.appliedAngle = targetAngle;
                    angle = targetAngle;
                  } else {
                    angle = THREE.MathUtils.lerp(
                      splay.appliedAngle,
                      targetAngle,
                      1.0 - Math.exp(-12.0 * clampedDt),
                    );
                  }

                  // Where the ear sits vertically relative to the frame, in model units.
                  const earUp = _tmp.subVectors(_earMid, _pos).dot(_up) - AR.TEMPLE_EAR_DROP;
                  const aimCap = AR.TEMPLE_AIM_MAX / targetScale;
                  const wantTipY = THREE.MathUtils.clamp(
                    earUp / targetScale - splay.tipY,
                    -aimCap,
                    aimCap,
                  );

                  // Rewriting the arm vertices is cheap but not free, and neither target moves
                  // much once a face is tracked. Only rebuild on a change worth seeing.
                  if (
                    splay.appliedX < -100 ||
                    Math.abs(angle - splay.appliedAngle) > 0.006 ||
                    Math.abs(wantTipY - splay.appliedY) > splay.halfWidth * 0.015
                  ) {
                    splay.appliedAngle = angle;
                    splay.appliedY = wantTipY;
                    splay.appliedX = 0;
                    for (const part of splay.parts) {
                      const arr = part.attr.array as Float32Array;
                      for (let i = 0; i < part.attr.count; i++) {
                        const w = part.w[i];
                        const x = part.rootX[i];
                        // Signed so each arm turns away from the head, not both the same way.
                        const a = -Math.sign(x) * angle * w;
                        const cos = Math.cos(a);
                        const sin = Math.sin(a);
                        // Rotate about the vertical axis through THIS arm's own joint.
                        // Using the model centre line instead put the pivot half a frame
                        // away, so the arm root swung backward off the front and the whole
                        // temple travelled on a long lever — the arm appeared detached and
                        // flung outward rather than hinged.
                        const rx = x - Math.sign(x) * splay.hingeX;
                        const rz = part.rootZ[i] - splay.hingeZ;
                        const dx = rx * cos + rz * sin - rx;
                        const ddz = -rx * sin + rz * cos - rz;
                        const py = wantTipY * w;
                        arr[i * 3] =
                          part.orig[i * 3] + part.dirX.x * dx + part.dirY.x * py + part.dirZ.x * ddz;
                        arr[i * 3 + 1] =
                          part.orig[i * 3 + 1] + part.dirX.y * dx + part.dirY.y * py + part.dirZ.y * ddz;
                        arr[i * 3 + 2] =
                          part.orig[i * 3 + 2] + part.dirX.z * dx + part.dirY.z * py + part.dirZ.z * ddz;
                      }
                      part.attr.needsUpdate = true;
                      // The bounds moved with the vertices; a stale sphere frustum-culls the
                      // arms at the edge of frame.
                      part.geom.computeBoundingSphere();
                    }
                  }
                }
              }
              const templeZ = templeZRef.current * adj.templeLength;

              // ── 2. Placement smoothing, adaptive to head speed ──────────────
              // Measured from the TARGET rather than the rendered pose, so the rate reacts
              // to the head moving rather than to the frame catching up with it.
              // Speed is measured across POSE CHANGES, not rendered frames.
              //
              // MindAR detects on its own loop at roughly 25Hz while this renders at the
              // display's rate, so most frames replay an unchanged pose. Dividing by the
              // render dt made 83% of frames at 144Hz report the head as stationary --
              // dragging the smoothed speed to zero and pinning the adaptive rate at its
              // minimum, i.e. maximum lag -- while the one frame that did move reported 5.8x
              // the real speed. The faster the display, the worse it got, which is why
              // stickiness differed between 60Hz and 144Hz panels.
              const posDelta = prevTargetPosRef.current.distanceTo(_pos);
              const rotDelta = prevTargetQuatRef.current.angleTo(_qTarget);
              const poseMoved = posDelta > 0.0006 || rotDelta > 0.004;

              if (poseMoved) {
                const since = Math.max(1e-3, loopTime - lastPoseChangeRef.current);
                const invDt = 1 / since;
                const rawPosSpeed = posDelta * invDt;
                const rawRotSpeed = rotDelta * invDt;
                const rawScaleSpeed =
                  prevTargetScaleRef.current > 1e-9
                    ? (Math.abs(targetScale - prevTargetScaleRef.current) / prevTargetScaleRef.current) * invDt
                    : 0;

                // Smoothed over the same interval, so the decay is wall-clock based and does
                // not depend on how many frames happened to fall between detections either.
                const kSpeed = 1.0 - Math.exp(-AR.ADAPT_SPEED_SMOOTH * since);
                // First tracked frame has no previous pose; seeding from it would read as a
                // huge jump and snap the rates to maximum.
                if (wasTrackingRef.current) {
                  posSpeedRef.current = THREE.MathUtils.lerp(posSpeedRef.current, rawPosSpeed, kSpeed);
                  rotSpeedRef.current = THREE.MathUtils.lerp(rotSpeedRef.current, rawRotSpeed, kSpeed);
                  scaleSpeedRef.current = THREE.MathUtils.lerp(scaleSpeedRef.current, rawScaleSpeed, kSpeed);
                }
                prevTargetPosRef.current.copy(_pos);
                prevTargetQuatRef.current.copy(_qTarget);
                prevTargetScaleRef.current = targetScale;
                lastPoseChangeRef.current = loopTime;
              } else if (loopTime - lastPoseChangeRef.current > 0.25) {
                // Genuinely still for a quarter second: let the rates fall back to their
                // resting values rather than holding the last movement's speed forever.
                const kDecay = 1.0 - Math.exp(-AR.ADAPT_SPEED_SMOOTH * clampedDt);
                posSpeedRef.current = THREE.MathUtils.lerp(posSpeedRef.current, 0, kDecay);
                rotSpeedRef.current = THREE.MathUtils.lerp(rotSpeedRef.current, 0, kDecay);
                scaleSpeedRef.current = THREE.MathUtils.lerp(scaleSpeedRef.current, 0, kDecay);
              }

              const kPos = 1.0 - Math.exp(
                -(isSliderActive
                  ? AR.SMOOTH_SLIDER
                  : Math.min(AR.ADAPT_POS_MAX, AR.ADAPT_POS_MIN + AR.ADAPT_POS_SLOPE * posSpeedRef.current)) * clampedDt,
              );
              const kRot = 1.0 - Math.exp(
                -(isSliderActive
                  ? AR.SMOOTH_SLIDER
                  : Math.min(AR.ADAPT_ROT_MAX, AR.ADAPT_ROT_MIN + AR.ADAPT_ROT_SLOPE * rotSpeedRef.current)) * clampedDt,
              );
              const kScale = 1.0 - Math.exp(
                -(isSliderActive
                  ? AR.SMOOTH_SLIDER
                  : Math.min(AR.ADAPT_SCALE_MAX, AR.ADAPT_SCALE_MIN + AR.ADAPT_SCALE_SLOPE * scaleSpeedRef.current)) * clampedDt,
              );

              // The frame is scaled UNIFORMLY. A previous 'aspect correction' stretched every
              // model vertically toward a fixed 0.38 height:width, by up to +/-35% — which
              // erased the genuine difference between a tall aviator and a shallow rectangle,
              // i.e. exactly what distinguishes the products being sold. Lens height is a real
              // measured dimension of a real object; it is not ours to normalise.

              // ── 3. First-Frame Instant Snap ────────────────────────────────
              if (!wasTrackingRef.current) {
                glasses.position.copy(_pos);
                glasses.quaternion.copy(_qTarget);
                glasses.scale.set(targetScale, targetScale, targetScale * templeZ);
                wasTrackingRef.current = true;
              } else {
                glasses.position.lerp(_pos, kPos);
                glasses.quaternion.slerp(_qTarget, kRot);
                const s = THREE.MathUtils.lerp(glasses.scale.x, targetScale, kScale);
                glasses.scale.set(s, s, s * templeZ);
              }
              // ── Check if face is cut from the screen / box ────────────────
              _projFore.copy(_fore).project(camera);
              _projChin.copy(_chin).project(camera);
              _projEyeL.copy(_eyeL).project(camera);
              _projEyeR.copy(_eyeR).project(camera);
              _projPos.copy(_pos).project(camera);

              let faceMinX = Math.min(_projEyeL.x, _projEyeR.x);
              let faceMaxX = Math.max(_projEyeL.x, _projEyeR.x);

              if (cheekLg?.visible && cheekRg?.visible) {
                _projCheekL.copy(_cheekL).project(camera);
                _projCheekR.copy(_cheekR).project(camera);
                faceMinX = Math.min(faceMinX, _projCheekL.x, _projCheekR.x);
                faceMaxX = Math.max(faceMaxX, _projCheekL.x, _projCheekR.x);
              }
              if (earLg?.visible && earRg?.visible) {
                _projEarL.copy(_earL).project(camera);
                _projEarR.copy(_earR).project(camera);
                faceMinX = Math.min(faceMinX, _projEarL.x, _projEarR.x);
                faceMaxX = Math.max(faceMaxX, _projEarL.x, _projEarR.x);
              }

              const faceMaxY = _projFore.y;
              const faceMinY = _projChin.y;

              const containerEl = containerRef.current;
              const cw = containerEl?.clientWidth || 640;
              const ch = containerEl?.clientHeight || 480;
              const layoutRect = fitRectRef.current;
              const fw = layoutRect && layoutRect.width > 0 ? layoutRect.width : cw;
              const fh = layoutRect && layoutRect.height > 0 ? layoutRect.height : ch;

              // Effective visible limits in NDC (accounting for container cropping)
              const visibleLimitX = Math.min(1.0, cw / fw);
              const visibleLimitY = Math.min(1.0, ch / fh);

              // Boundary limits (proportional margin from true visible edges on any screen size)
              const boundX = Math.min(0.94, visibleLimitX * 0.94);
              const boundY = Math.min(0.94, visibleLimitY * 0.94);

              // Hysteresis: require moving comfortably inside before un-cutting to prevent edge flutter
              const wasCut = isFaceCutRef.current;
              const trigX = wasCut ? boundX * 0.94 : boundX;
              const trigY = wasCut ? boundY * 0.94 : boundY;

              const isFaceCut =
                faceMinX < -trigX ||
                faceMaxX > trigX ||
                faceMaxY > trigY ||
                faceMinY < -trigY ||
                Math.abs(_projPos.x) > trigX;

              isFaceCutRef.current = isFaceCut;

              // Hide glasses when face is cut from screen or during face scanning
              const isGlassesVisible = scanStateRef.current === "idle" && !isFaceCut;
              glasses.visible = isGlassesVisible;
              if (headOccluderRef.current) {
                const ho = headOccluderRef.current;
                ho.visible = isGlassesVisible;
                ho.position.copy(_pos);
                ho.quaternion.copy(_qTarget);
                ho.scale.set(eyeDist, eyeDist, eyeDist);
              }
              if (isFaceCut) {
                reportStatus("out-of-frame", "Be in box");
              } else {
                reportStatus("tracking");
              }
            } else {
              isFaceCutRef.current = false;
              wasTrackingRef.current = false;
              if (headOccluderRef.current) {
                headOccluderRef.current.visible = false;
              }
              // Re-seed the speed clock, or the gap counts as elapsed time and the first
              // movement after re-acquiring reads as almost stationary.
              lastPoseChangeRef.current = loopTime;
              posSpeedRef.current = 0;
              rotSpeedRef.current = 0;
              scaleSpeedRef.current = 0;
              // A brief drop-out is the same person blinking or stepping out of frame; a long
              // one may be somebody else sitting down. Only the latter releases the lock.
              lostFramesRef.current++;
              if (lostFramesRef.current === AR.SHAPE_RELEASE_FRAMES) {
                shapeStabilizerRef.current.reset();
                lastShapeRef.current = null;
                onFaceShapeDetect?.(null);
                onFaceShapeResult?.(null);
              }
              if (scanStateRef.current === "aligning" || scanStateRef.current === "scanning") {
                scanAlignFramesRef.current = 0;
                scanSamplesRef.current = [];
                onScanProgress?.({
                  state: "aligning",
                  progress: 0,
                  message: "No face in circle — please position your face in the circle",
                });
              }
              if (glasses) {
                glasses.visible = false; // Hide glasses completely when no face is detected
              }
              // Only report "no-face" if glasses ARE loaded but face landmarks are missing.
              // If glasses model is null (still fetching API or GLB), keep status as "loading" / "ready".
              if (glasses && !faceLandmarksVisible) {
                reportStatus("no-face");
              }
            }

            renderer.render(scene, camera);
          });
        } catch (err) {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : "AR failed to start";
          console.error("AR init error:", err);
          reportStatus("error", msg);
        }
      }

      init();

      return () => {
        cancelled = true;
        for (const fn of cleanupFns) {
          try { fn(); } catch { /* ignore cleanup errors */ }
        }
        cleanupFns.length = 0;
        if (mindarInstance) {
          try {
            mindarInstance.renderer?.setAnimationLoop(null);
            mindarInstance.stop();
          } catch { /* ignore cleanup errors */ }
        }
        applyFitRef.current = null;
        mindarRef.current = null;
        glassesRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── React to frameSrc changes ──────────────────────────────────────────────

    useEffect(() => {
      frameSrcRef.current = frameSrc;
      if (frameSrc && isModelSrc(frameSrc) && mindarRef.current) {
        loadFrame(frameSrc);
      }
    }, [frameSrc, loadFrame]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ background: "transparent" }}>
        {overlay.status === "error" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-6 text-center">
            <div className="max-w-sm rounded-2xl border border-red-500/20 bg-slate-900/95 px-6 py-5 shadow-2xl">
              <div className="mb-3 inline-flex rounded-full bg-red-500/10 p-3 text-red-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" /></svg>
              </div>
              <p className="font-semibold text-white">Camera required</p>
              <p className="mt-1 text-sm text-slate-400">{overlay.detail ?? "Allow camera access in your browser settings and reload the page."}</p>
            </div>
          </div>
        )}
        {overlay.status === "no-face" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
            <p className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
              Position your face in frame
            </p>
          </div>
        )}
        {overlay.status === "out-of-frame" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-4">
            {/* Dashed guide box indicating the safe area */}
            <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-amber-400/60 rounded-3xl animate-pulse shadow-[inset_0_0_30px_rgba(245,158,11,0.2)]" />
            {/* Center warning pill */}
            <div className="relative flex items-center gap-2.5 rounded-full bg-slate-950/90 border border-amber-500/70 px-5 py-2.5 backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.45)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
              </span>
              <span className="text-xs sm:text-sm font-bold text-amber-200 tracking-wider uppercase">
                Be in box
              </span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default TryOnViewer;
