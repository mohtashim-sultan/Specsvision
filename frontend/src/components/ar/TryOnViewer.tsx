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
import { FACE_SHAPE_LANDMARKS, classifyFaceShape, type FaceShape } from "./faceShape";

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
  SCALE_K: 2.15,     // frame width ÷ eye-corner distance (bigger = larger glasses)
  SEAT_DOWN: 0.03,   // seat relative to nose bridge anchor (+ = down toward nose)
  SEAT_FWD: 0.08,    // push forward off the face so lenses clear the brow (+ = toward camera)
  FWD_SIGN: 1,       // flip to -1 if the glasses render facing away from the camera
  TEMPLE_MIN: 0.6,   // clamp range for the auto arm-length stretch
  TEMPLE_MAX: 3.2,
  SMOOTH: 30,        // pose smoothing (calm, stable pose tracking)
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
    /** Measured Y/X aspect ratio of the 3D model geometry. */
    const rawAspectRef = useRef(0.38);
    /** Read-only landmark anchors (eyes/forehead/chin) that drive the head-pose basis. */
    const poseAnchorsRef = useRef<Record<string, any> | null>(null);
    /** Smoothed temple-length Z multiplier held across frames. */
    const templeZRef = useRef(1.0);
    /** Smoothed face-size multiplier: corrects glasses scale for individual face widths. */
    const faceSizeMultRef = useRef(1.0);
    /** Smoothed yaw scale compensation multiplier. */
    const yawCompRef = useRef(1.0);
    /** Ref tracking whether face pose was active in the previous frame (for instant snap). */
    const wasTrackingRef = useRef(false);
    /** Stable scale threshold reference to eliminate 1-pixel scale shimmer. */
    const lastStableScaleRef = useRef(0);
    /** Ref tracking previous adjustments state to detect user slider interactions. */
    const lastAdjRef = useRef<any>(null);
    /** Counter of frames to bypass deadband when user moves a slider. */
    const adjChangeCountRef = useRef(0);
    /** Temple-tip reference (group space, pre-scale): height & depth of the arm ends. */
    const armTipYRef = useRef(0);
    const armTipZRef = useRef(-1);
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
    const shapeSamplesRef = useRef<FaceShape[]>([]);
    const lastShapeRef = useRef<string | null>(null);
    const shapeFrameRef = useRef(0);

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

            // Capture the temple-tip reference (average of the back-most 20% of the
            // model) so the animation loop can AIM the arms straight at the ears —
            // correcting the arm's vertical angle, not just its length. Done here
            // while matrices are still in raw model space (pre-recenter).
            {
              const backZ = rawBox.min.z + rawSize.z * 0.20;
              const _p = new THREE.Vector3();
              let tipYSum = 0, tipZSum = 0, tipN = 0;
              model.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry?.attributes?.position) {
                  const posAttr = child.geometry.attributes.position as THREE.BufferAttribute;
                  for (let i = 0; i < posAttr.count; i++) {
                    _p.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
                    if (_p.z <= backZ) { tipYSum += _p.y; tipZSum += _p.z; tipN++; }
                  }
                }
              });
              if (tipN > 0) {
                armTipYRef.current = tipYSum / tipN - rawCenter.y;      // height vs. bridge
                armTipZRef.current = tipZSum / tipN - rawBox.max.z;     // depth (negative = behind)
              } else {
                armTipYRef.current = 0;
                armTipZRef.current = -rawSize.z;
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
            const measuredAspect = (rawSize.y > 0 && rawSize.x > 0) ? (rawSize.y / rawSize.x) : 0.38;
            rawAspectRef.current = measuredAspect;

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
              filterBeta: 10,       // smooth, vibration-free movement tracking
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
          // Negative polygonOffset pushes its depth value BEHIND the face surface, preventing
          // it from clipping front-facing frame & lens edges at the nose/cheek sides on turns.
          const faceMesh = mindarInstance.addFaceMesh();
          faceMesh.material = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true,
            depthTest: true,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4,
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
          const idealLong = 960;
          const idealShort = 720;
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
                  width: { ideal: portrait ? idealShort : idealLong },
                  height: { ideal: portrait ? idealLong : idealShort },
                  frameRate: { ideal: 30 },
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
          const _eyeMid = new THREE.Vector3();
          const _earMid = new THREE.Vector3();
          const _pos = new THREE.Vector3();
          const _basis = new THREE.Matrix4();
          const _qTarget = new THREE.Quaternion();
          const _qUser = new THREE.Quaternion();
          const _euler = new THREE.Euler();

          // Sample the shape landmarks every few frames, classify, and continuously emit
          // the current best shape so the UI stays live — not just on first detection.
          const sampleFaceShape = () => {
            const sa = shapeAnchorsRef.current;
            if (!onFaceShapeDetect || !sa) return;
            const pts: Record<string, { x: number; y: number; z: number }> = {};
            for (const key of Object.keys(FACE_SHAPE_LANDMARKS)) {
              const g = sa[key]?.group;
              if (!g || !g.visible) return; // a needed landmark isn't tracked right now
              g.getWorldPosition(_shapeVec);
              pts[key] = { x: _shapeVec.x, y: _shapeVec.y, z: _shapeVec.z };
            }
            const shape = classifyFaceShape(pts as any);
            if (!shape) return;
            const buf = shapeSamplesRef.current;
            buf.push(shape);
            // Smaller rolling window (20) → faster initial lock (~0.6 s at 30 fps × 3rd-frame sampling).
            if (buf.length > 20) buf.shift();
            // Start deciding once we have 10 samples (was 20) so the card appears quickly.
            if (buf.length < 10) return;
            const counts = new Map<string, number>();
            let best: string | null = null;
            let bestN = 0;
            for (const s of buf) {
              const n = (counts.get(s) ?? 0) + 1;
              counts.set(s, n);
              if (n > bestN) { bestN = n; best = s; }
            }
            // Emit whenever a stable majority is found — no change-only gate — so the
            // shape card updates live as the face angle or expression shifts.
            if (best && bestN / buf.length >= 0.55) {
              lastShapeRef.current = best;
              onFaceShapeDetect(best as FaceShape);
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
            const anchor = mindarInstance.anchors?.[0];
            const glasses = glassesRef.current;

            // Face-shape sampling runs every 3rd frame (was every 6th) for faster live updates.
            if (anchor?.group?.visible) {
              shapeFrameRef.current++;
              if (shapeFrameRef.current % 3 === 0) sampleFaceShape();
            }

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

              // ── Face Size Auto-Fit ───────────────────────────────────────
              // Cheek landmarks 234/454 are registered as shape anchors ("cheekL"/"cheekR").
              // We measure real cheekbone width in world space vs eye separation to auto-adapt
              // glasses size for wider or narrower faces.
              const REFERENCE_FACE_RATIO = 1.65; // avg cheekWidth / eyeDist
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
                  const targetMult = THREE.MathUtils.clamp(rawMult, 0.80, 1.30);
                  // Smooth slowly (k * 0.10) so scale changes are rock-solid without shimmer
                  faceSizeMultRef.current = THREE.MathUtils.lerp(faceSizeMultRef.current, targetMult, k * 0.10);
                  faceSizeMultiplier = faceSizeMultRef.current;
                }
              }

              // ── Yaw-Aware Scale Compensation ─────────────────────────────
              // Compensates perspective foreshortening of eyeDist when head turns 45°.
              // Lerped (k * 0.15) to prevent scale vibration from raw _right.z noise.
              const yawFactor = Math.sqrt(Math.max(0, 1.0 - _right.z * _right.z));
              const rawYawComp = THREE.MathUtils.clamp(1.0 / Math.max(yawFactor, 0.6), 1.0, 1.35);
              yawCompRef.current = THREE.MathUtils.lerp(yawCompRef.current, rawYawComp, k * 0.15);
              const yawComp = yawCompRef.current;

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
                  adjChangeCountRef.current = 6; // Bypass deadband for 6 frames on slider interaction
                }
              }
              lastAdjRef.current = { ...adj };
              const isSliderActive = adjChangeCountRef.current > 0;
              if (isSliderActive) adjChangeCountRef.current--;

              const rawTargetScale = (eyeDist * AR.SCALE_K / rawWidthRef.current) * adj.scale * faceSizeMultiplier * yawComp;

              // ── 1. Scale Deadband (Zero Shimmer) ──────────────────────────
              if (lastStableScaleRef.current === 0) {
                lastStableScaleRef.current = rawTargetScale;
              } else {
                const scaleDeltaRatio = Math.abs(rawTargetScale - lastStableScaleRef.current) / lastStableScaleRef.current;
                if (scaleDeltaRatio > 0.015 || isSliderActive) {
                  lastStableScaleRef.current = rawTargetScale;
                }
              }
              const targetScale = lastStableScaleRef.current;

              // ── Auto-stretch temple length to reach the ears ─────────────
              const earLg = mindarInstance.anchors?.[1]?.group;
              const earRg = mindarInstance.anchors?.[2]?.group;
              if (earLg?.visible && earRg?.visible && rawDepthRef.current > 1e-6 && targetScale > 1e-6) {
                earLg.getWorldPosition(_earL);
                earRg.getWorldPosition(_earR);
                _earMid.addVectors(_earL, _earR).multiplyScalar(0.5);
                _eyeMid.addVectors(_eyeL, _eyeR).multiplyScalar(0.5);
                const reach = _earMid.distanceTo(_eyeMid);          // world distance front→ear
                const nativeArm = rawDepthRef.current * targetScale; // world arm length at scale 1×Z
                if (nativeArm > 1e-6) {
                  const solved = THREE.MathUtils.clamp(reach / nativeArm, AR.TEMPLE_MIN, AR.TEMPLE_MAX);
                  templeZRef.current = THREE.MathUtils.lerp(templeZRef.current, solved, k);
                }
              }
              const templeZ = templeZRef.current * adj.templeLength;

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

              _pos.addScaledVector(_up, -(AR.SEAT_DOWN * eyeDist) + userY);
              _pos.addScaledVector(_fwd, AR.SEAT_FWD * eyeDist + userZ);
              _pos.addScaledVector(_right, userX);

              // ── 2. Positional & Rotational Deadband + Adaptive Lerp ────────
              const posDelta = glasses.position.distanceTo(_pos);
              const rotDelta = glasses.quaternion.angleTo(_qTarget);

              const kPosRate = posDelta < 0.002 && !isSliderActive ? 6 : 30;
              const kRotRate = rotDelta < 0.008 && !isSliderActive ? 6 : 30;

              const kPos = 1.0 - Math.exp(-kPosRate * clampedDt);
              const kRot = 1.0 - Math.exp(-kRotRate * clampedDt);

              const TARGET_FRAME_ASPECT = 0.38;
              const currentAspect = rawAspectRef.current > 0 ? rawAspectRef.current : TARGET_FRAME_ASPECT;
              const aspectCorrection = TARGET_FRAME_ASPECT / Math.min(currentAspect, 1.0);

              // ── 3. First-Frame Instant Snap ────────────────────────────────
              if (!wasTrackingRef.current) {
                glasses.position.copy(_pos);
                glasses.quaternion.copy(_qTarget);
                glasses.scale.set(targetScale, targetScale * aspectCorrection, targetScale * templeZ);
                wasTrackingRef.current = true;
              } else {
                if (posDelta > 0.0012 || isSliderActive) {
                  glasses.position.lerp(_pos, kPos);
                }
                if (rotDelta > 0.007 || isSliderActive) {
                  glasses.quaternion.slerp(_qTarget, kRot);
                }
                const sPrev = glasses.scale.x;
                const s = THREE.MathUtils.lerp(sPrev, targetScale, kPos);
                const sy = s * THREE.MathUtils.clamp(aspectCorrection, 0.70, 1.35);
                glasses.scale.set(s, sy, s * templeZ);
              }

              glasses.visible = true; // Show glasses when face pose is tracked
              reportStatus("tracking");
            } else {
              wasTrackingRef.current = false;
              lastStableScaleRef.current = 0;
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
