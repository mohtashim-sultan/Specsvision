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
  faceRatios,
  type FaceShape,
} from "./faceShape";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TryOnStatus = "loading" | "ready" | "tracking" | "no-face" | "error";

export type TryOnViewerHandle = {
  captureSnapshot: () => string | null;
};

type TryOnViewerProps = {
  frameSrc?: string | null;
  onStatusChange?: (status: TryOnStatus, detail?: string) => void;
  onFaceShapeDetect?: (faceShape: string | null) => void;
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
const CAMERA_FILTER = "contrast(1.08) saturate(1.14) brightness(1.03)";

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
  // plus landmark jitter without the arms visibly standing off the head. Raising this to
  // ~1.5 would also clear thick hair, at the cost of arms floating on a short-haired user
  // — there is no hair geometry to measure, so it is one constant either way.
  TEMPLE_CLEARANCE: 0.6,
  // Strength of the outward flare, 0 = off.
  //
  // It is off. The flare existed to keep the arms out of the face-mesh occluder, but that
  // was only necessary because the occluder was inflating at the silhouette (its polygon
  // offset had the wrong sign, see addFaceMesh below). With that fixed, the occluder cuts
  // exactly at the skin, and an undeformed arm at its natural width shows for roughly the
  // first 60% of its length before the widening skull swallows it -- which is what a real
  // pair does, and what every reference try-on shows. Bending the product to avoid a bug
  // in the occluder made frames look broken for the sake of a problem that no longer
  // exists. Left as a tunable because a head far wider than the frame is the one case
  // where some flare would still help.
  TEMPLE_SPLAY_STRENGTH: 0,
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
  TEMPLE_AIM_MAX: 0.5,
  // Arms are solved to reach the ear, then extended by this factor so they carry past it
  // and hook down behind, as real temples do, instead of stopping level with it.
  //
  // Capped at 1.05 rather than more: MindAR's face mesh ends at the ears, so there is no
  // occluder behind them. An arm extended much further re-emerges past the mesh as a
  // floating fragment behind the head, disconnected from the part the skull is hiding.
  // With the flare off the arm is hidden from ~60% of its length anyway, so apparent
  // length now comes from occluding it correctly rather than from stretching it.
  TEMPLE_REACH_K: 1.05,
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
  SMOOTH_POS: 16,    // 63ms
  SMOOTH_ROT: 12,    // 83ms
  SMOOTH_SCALE: 8,   // 125ms; real scale barely changes, so this can be very slow
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
    /** Ref tracking previous adjustments state to detect user slider interactions. */
    const lastAdjRef = useRef<any>(null);
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
        /** Per-vertex hinge weight: 0 through the frame front, 1 along the arm. */
        w: Float32Array;
        /** Model-root +X and +Y expressed in this mesh's own local space. */
        dirX: THREE.Vector3;
        dirY: THREE.Vector3;
      }>;
      halfWidth: number;
      /** Mean root-space Y of the arm tips, centred — the reference for aiming at the ear. */
      tipY: number;
      appliedX: number;
      appliedY: number;
    }>({ parts: [], halfWidth: 1, tipY: 0, appliedX: -1e9, appliedY: -1e9 });
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
    const shapeFrameRef = useRef(0);
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
      scale: 1.0,
      templeLength: 1.0,
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

    useEffect(() => {
      adjustmentsRef.current = {
        scale: scaleOffset ?? 1.0,
        templeLength: templeLength ?? 1.0,
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
            const rawBox = new THREE.Box3().setFromObject(model);
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
                splayRef.current = { parts: [], halfWidth, tipY: 0, appliedX: -1e9, appliedY: -1e9 };
              } else {
                const parts: (typeof splayRef.current)["parts"] = [];
                let tipSum = 0;
                let tipN = 0;

                meshes.forEach((child, mi) => {
                  const attr = child.geometry.attributes.position as THREE.BufferAttribute;
                  const arr = rootPos[mi];
                  const w = new Float32Array(attr.count);
                  const rootX = new Float32Array(attr.count);
                  let touched = false;
                  for (let i = 0; i < attr.count; i++) {
                    const t = THREE.MathUtils.clamp((backZ - arr[i * 3 + 2]) / depth, 0, 1);
                    // Ramps across the ENTIRE arm, not just past the hinge. Saturating early
                    // threw the arm 1.4cm outward within a tenth of its length, which reads as
                    // a sharp elbow - a frame that looks bent rather than worn. A real temple
                    // flares gradually from hinge to tip, and that also tracks how the skull
                    // widens toward the ear, so it clears by more rather than less.
                    w[i] = THREE.MathUtils.smoothstep(t, hinge, 1.0);
                    rootX[i] = arr[i * 3];
                    if (w[i] > 1e-3) touched = true;
                    if (t > 0.92) {
                      tipSum += arr[i * 3 + 1];
                      tipN++;
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
                    dirX: new THREE.Vector3(1, 0, 0).applyMatrix3(m3),
                    dirY: new THREE.Vector3(0, 1, 0).applyMatrix3(m3),
                  });
                });

                splayRef.current = {
                  parts,
                  halfWidth,
                  tipY: tipN > 0 ? tipSum / tipN : 0,
                  appliedX: -1e9,
                  appliedY: -1e9,
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
              filterMinCF: 0.001,   // calm, jitter-free when the head is still
              // One Euro raises its cutoff in proportion to the measured derivative, and
              // landmark NOISE registers as derivative. At beta 10 the filter reads its own
              // jitter as motion and stops smoothing exactly when it should not. 4 keeps the
              // response honest while holding the noise down.
              filterBeta: 4,
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
          // device pixel ratio harder there. MindAR sizes the drawing buffer to the video's
          // native resolution, so this is what actually bounds per-frame GPU cost.
          const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.5 : 2));
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

            // Cover-fit: the smallest rect with the video's aspect that fully covers the container.
            const vAsp = vw / vh;
            const cAsp = cw / ch;
            let w: number;
            let h: number;
            if (vAsp > cAsp) { h = ch; w = ch * vAsp; }
            else { w = cw; h = cw / vAsp; }

            // zoom is clamped to >= 1 so the feed always covers — no black bars, ever.
            const zoom = Math.max(1, adjustmentsRef.current.cameraZoom ?? 1);
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
          const portrait = container.clientHeight >= container.clientWidth;
          // Higher resolution = wider sensor crop area = face naturally smaller in frame
          // on Android selfie cameras, which alleviates the "face too big" problem.
          const idealLong = 1280;
          const idealShort = 960;
          const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
            if (!constraints?.video || typeof constraints.video !== "object") {
              return nativeGetUserMedia(constraints);
            }
            // Everything added here is an `ideal` (soft) constraint, so a device that
            // can't match still returns its best effort rather than throwing. The retry
            // guards against drivers that reject the request outright anyway.
            try {
              return await nativeGetUserMedia({
                ...constraints,
                video: {
                  ...constraints.video,
                  facingMode: "user",
                  width: { ideal: portrait ? idealShort : idealLong },
                  height: { ideal: portrait ? idealLong : idealShort },
                  frameRate: { ideal: 30 },
                  // Request minimum hardware zoom on Android (zoom:1 = widest FOV).
                  // This is an "advanced" constraint — browsers that don't support it
                  // silently ignore it, so there's no risk of a request failure.
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
          const sampleFaceShape = (frontality: number) => {
            const sa = shapeAnchorsRef.current;
            if (!onFaceShapeDetect || !sa) return;
            if (frontality < AR.SHAPE_MIN_FRONTALITY) return;

            const pts: Record<string, { x: number; y: number; z: number }> = {};
            for (const key of Object.keys(FACE_SHAPE_LANDMARKS)) {
              const g = sa[key]?.group;
              if (!g || !g.visible) return; // a needed landmark isn't tracked right now
              g.getWorldPosition(_shapeVec);
              pts[key] = { x: _shapeVec.x, y: _shapeVec.y, z: _shapeVec.z };
            }

            const r = faceRatios(pts as any);
            if (!r) return;

            const shape = shapeStabilizerRef.current.add(r);
            if (shape && shape !== lastShapeRef.current) {
              lastShapeRef.current = shape;
              onFaceShapeDetect(shape);
            }
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

            if (poseReady) {
              const adj = adjustmentsRef.current;

              // Frame-rate-independent smoothing factor.
              const clampedDt = Math.min(clock.getDelta(), 0.1);
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

              // Face-shape sampling. Every 6th frame is ample: the stabiliser wants a few
              // seconds of independent looks, not the same face 120 times a second.
              shapeFrameRef.current++;
              if (shapeFrameRef.current % 6 === 0) sampleFaceShape(frontality);

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
                    1.0 - Math.exp(-AR.SMOOTH_SCALE * clampedDt),
                  );
                }

                // ── Sit the arms on the ears ──────────────────────────────
                // Two independent corrections, both measured from the wearer, both fading in
                // from zero at the hinge so the frame's own width and shape never change:
                //
                //  X — push each arm vertex out to at least the widest measured half-width of
                //      the head. The maximum is an upper bound at every depth, so no part of
                //      the arm is left inside the occluder to be sliced.
                //  Y — shift the arm so its TIP lands on the ear landmark. Previously the arm
                //      only had its LENGTH solved; where it pointed was whatever the model
                //      happened to draw, so it ran past the ear rather than onto it.
                const splay = splayRef.current;
                if (splay.parts.length > 0 && targetScale > 1e-6) {
                  const sa2 = shapeAnchorsRef.current;
                  const cl = sa2?.cheekL?.group;
                  const cr = sa2?.cheekR?.group;
                  let headHalf = _earL.distanceTo(_earR) * 0.5;
                  if (cl?.visible && cr?.visible) {
                    cl.getWorldPosition(_cheekL);
                    cr.getWorldPosition(_cheekR);
                    headHalf = Math.max(headHalf, _cheekL.distanceTo(_cheekR) * 0.5);
                  }

                  // Zeroing the target rather than the push keeps the deadband below stable,
                  // so a disabled flare never triggers a vertex rewrite at all.
                  const targetHalf =
                    AR.TEMPLE_SPLAY_STRENGTH > 0
                      ? Math.min(
                          (headHalf + AR.TEMPLE_CLEARANCE) / targetScale,
                          splay.halfWidth * (1 + AR.TEMPLE_SPLAY_MAX),
                        )
                      : 0;

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
                  const eps = splay.halfWidth * 0.01;
                  if (
                    Math.abs(targetHalf - splay.appliedX) > eps ||
                    Math.abs(wantTipY - splay.appliedY) > eps
                  ) {
                    splay.appliedX = targetHalf;
                    splay.appliedY = wantTipY;
                    for (const part of splay.parts) {
                      const arr = part.attr.array as Float32Array;
                      for (let i = 0; i < part.attr.count; i++) {
                        const w = part.w[i];
                        const x = part.rootX[i];
                        const px =
                          Math.sign(x) *
                          Math.max(0, targetHalf - Math.abs(x)) *
                          w *
                          AR.TEMPLE_SPLAY_STRENGTH;
                        const py = wantTipY * w;
                        arr[i * 3] = part.orig[i * 3] + part.dirX.x * px + part.dirY.x * py;
                        arr[i * 3 + 1] = part.orig[i * 3 + 1] + part.dirX.y * px + part.dirY.y * py;
                        arr[i * 3 + 2] = part.orig[i * 3 + 2] + part.dirX.z * px + part.dirY.z * py;
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

              // ── 2. Placement smoothing ─────────────────────────────────────
              // One rate each, applied every frame. No thresholds: the frame is always
              // moving toward the target, so there is nothing to accumulate and release.
              const kPos = 1.0 - Math.exp(
                -(isSliderActive ? AR.SMOOTH_SLIDER : AR.SMOOTH_POS) * clampedDt,
              );
              const kRot = 1.0 - Math.exp(
                -(isSliderActive ? AR.SMOOTH_SLIDER : AR.SMOOTH_ROT) * clampedDt,
              );
              const kScale = 1.0 - Math.exp(
                -(isSliderActive ? AR.SMOOTH_SLIDER : AR.SMOOTH_SCALE) * clampedDt,
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

              glasses.visible = true; // Show glasses when face pose is tracked
              reportStatus("tracking");
            } else {
              wasTrackingRef.current = false;
              // A brief drop-out is the same person blinking or stepping out of frame; a long
              // one may be somebody else sitting down. Only the latter releases the lock.
              lostFramesRef.current++;
              if (lostFramesRef.current === AR.SHAPE_RELEASE_FRAMES) {
                shapeStabilizerRef.current.reset();
                lastShapeRef.current = null;
                onFaceShapeDetect?.(null);
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
      </div>
    );
  },
);

export default TryOnViewer;
