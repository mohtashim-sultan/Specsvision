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

// ── Component ──────────────────────────────────────────────────────────────────

const TryOnViewer = forwardRef<TryOnViewerHandle, TryOnViewerProps>(
  function TryOnViewer(
    { frameSrc, onStatusChange, onFaceShapeDetect, scaleOffset },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mindarRef = useRef<any>(null);
    const glassesRef = useRef<THREE.Group | null>(null);
    const baseScaleRef = useRef(1);
    const loadIdRef = useRef(0);
    const smoothRef = useRef({ scale: 1, y: -0.065, z: 0.015 });
    const offsetsRef = useRef({ scale: 1.0 });
    const reportedStatusRef = useRef<TryOnStatus>("loading");
    offsetsRef.current = { scale: scaleOffset ?? 1.0 };

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
        const anchor = mindar.anchors?.[0];
        if (!anchor) return;

        // Remove previous glasses from the anchor
        for (const c of [...anchor.group.children]) {
          if (c.userData._glassesMarker) {
            anchor.group.remove(c);
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
        smoothRef.current = { scale: 1, y: -0.065, z: 0.015 };

        if (!src || !isModelSrc(src)) return;

        const loader = new GLTFLoader();
        loader.load(
          src,
          (gltf) => {
            if (loadIdRef.current !== thisLoad) return;
            const glasses = gltf.scene;

            // Ensure depth is correct so glasses render in front of occluder
            glasses.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material.depthTest = true;
                child.material.depthWrite = true;
                child.renderOrder = 10;

                // Clamp lens opacity if transparent
                if (child.material.transparent) {
                  child.material.opacity = Math.min(child.material.opacity, 0.3);
                }
              }
            });

            // Auto-scale to match face width
            glasses.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(glasses);
            const size = box.getSize(new THREE.Vector3());

            const targetFaceWidth = 0.95;
            baseScaleRef.current = targetFaceWidth / size.x;
            glasses.scale.setScalar(baseScaleRef.current);

            // Position on nose bridge (Y=-0.065 places lenses at eye level)
            glasses.position.set(0, -0.065, 0.015);
            glasses.rotation.set(-0.08, 0, 0);
            glasses.userData._glassesMarker = true;
            anchor.group.add(glasses);
            glassesRef.current = glasses;

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

    // ── Snapshot ────────────────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const mindar = mindarRef.current;
        if (!mindar || !mindar.video || mindar.video.readyState < 2) return null;
        const container = containerRef.current;
        if (!container) return null;
        const w = container.clientWidth;
        const h = container.clientHeight;
        const snap = document.createElement("canvas");
        snap.width = w;
        snap.height = h;
        const ctx = snap.getContext("2d");
        if (!ctx) return null;
        const vW = mindar.video.videoWidth || w;
        const vH = mindar.video.videoHeight || h;
        const vAsp = vW / vH;
        const cAsp = w / h;
        let sx = 0, sy = 0, sw = vW, sh = vH;
        if (vAsp > cAsp) { sw = vH * cAsp; sx = (vW - sw) / 2; }
        else { sh = vW / cAsp; sy = (vH - sh) / 2; }
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(mindar.video, sx, sy, sw, sh, 0, 0, w, h);
        ctx.restore();
        const canvas = mindar.renderer?.domElement;
        if (canvas) ctx.drawImage(canvas, 0, 0, w, h);
        return snap.toDataURL("image/png");
      },
    }));

    // ── Init / teardown ────────────────────────────────────────────────────────

    useEffect(() => {
      let cancelled = false;
      let mindarInstance: any = null;

      async function init() {
        try {
          reportStatus("loading", "Starting AR…");

          // Load MindAR via CDN script injection
          const MindARThree = await getMindARThree();

          if (cancelled) return;
          const container = containerRef.current;
          if (!container) return;

          mindarInstance = new MindARThree({
            container,
            maxTrack: 1,
            shouldFaceUser: true,
          });

          mindarRef.current = mindarInstance;

          const { renderer, scene, camera } = mindarInstance;

          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.setSize(container.clientWidth, container.clientHeight);

          // Lighting setup (matches public/ar/main.js)
          scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));
          scene.add(new THREE.AmbientLight(0xffffff, 1.4));
          const dirLight = new THREE.DirectionalLight(0xffffff, 1);
          dirLight.position.set(0, 1, 1);
          scene.add(dirLight);

          // Face anchor at nose bridge
          mindarInstance.addAnchor(168);

          // Face mesh occluder — tracks actual face shape for realistic
          // temple arm hiding (far superior to a static sphere).
          const faceMesh = mindarInstance.addFaceMesh();
          faceMesh.material = new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true,
            depthTest: true,
            side: THREE.DoubleSide,
          });
          faceMesh.renderOrder = 0;
          faceMesh.visible = true;
          mindarInstance.scene.add(faceMesh);

          // Load initial glasses if a model src was provided
          if (frameSrc && isModelSrc(frameSrc)) {
            loadFrame(frameSrc);
          }

          // Start MindAR face tracking
          await mindarInstance.start();

          if (cancelled) return;
          reportStatus("ready");

          // ── Fix element layering ──────────────────────────────────────
          // MindAR sets video z-index to -2 which hides it behind the
          // container's background in a React component tree. Override
          // the stacking so video → canvas → CSS renderer layer correctly.
          const video = mindarInstance.video;
          if (video) {
            video.style.zIndex = "0";
            // Ensure video actually plays (some browsers need explicit play)
            video.play().catch(() => {});
          }
          if (renderer.domElement) {
            renderer.domElement.style.zIndex = "1";
          }
          if (mindarInstance.cssRenderer?.domElement) {
            mindarInstance.cssRenderer.domElement.style.zIndex = "2";
          }

          // Force a resize after start so canvas fills the container
          window.dispatchEvent(new Event("resize"));
          setTimeout(() => window.dispatchEvent(new Event("resize")), 200);
          setTimeout(() => window.dispatchEvent(new Event("resize")), 500);
          setTimeout(() => window.dispatchEvent(new Event("resize")), 1000);

          // Animation loop with smooth tracking (matches main.js logic)
          renderer.setAnimationLoop(() => {
            const anchor = mindarInstance.anchors?.[0];
            const glasses = glassesRef.current;

            if (glasses && anchor?.group?.visible) {
              const faceScale = anchor.group.scale.x;

              // Smooth scale (includes user scaleOffset from Fine-tune slider)
              smoothRef.current.scale = THREE.MathUtils.lerp(
                smoothRef.current.scale,
                baseScaleRef.current * faceScale * offsetsRef.current.scale,
                0.15,
              );
              glasses.scale.setScalar(smoothRef.current.scale);

              // Smooth Y position
              smoothRef.current.y = THREE.MathUtils.lerp(smoothRef.current.y, -0.065, 0.15);
              glasses.position.y = smoothRef.current.y;

              // Smooth Z position (adapts to face distance)
              const targetZ = 0.015 + (faceScale - 1) * 0.008;
              smoothRef.current.z = THREE.MathUtils.lerp(smoothRef.current.z, targetZ, 0.15);
              glasses.position.z = smoothRef.current.z;

              // Rotation is handled entirely by MindAR's anchor matrix —
              // no per-frame corrections needed (they fight head tracking).

              reportStatus("tracking");
            } else if (anchor && !anchor.group.visible) {
              reportStatus("no-face");
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
        if (mindarInstance) {
          try {
            mindarInstance.stop();
          } catch { /* ignore cleanup errors */ }
        }
        mindarRef.current = null;
        glassesRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── React to frameSrc changes ──────────────────────────────────────────────

    useEffect(() => {
      if (frameSrc && isModelSrc(frameSrc) && mindarRef.current) {
        loadFrame(frameSrc);
      }
    }, [frameSrc, loadFrame]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ background: "transparent" }}>
        {overlay.status === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/20 border-t-purple-400" />
                <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-pink-400" style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
              </div>
              <p className="rounded-2xl bg-slate-900/90 px-5 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur-md">
                {overlay.detail ?? "Starting AR..."}
              </p>
            </div>
          </div>
        )}
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
