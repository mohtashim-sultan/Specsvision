import * as THREE from 'three';
import { MindARThree } from 'mindar-face-three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';

// Create invisible face occluder mesh
function createFaceOccluder() {
  const geometry = new THREE.BoxGeometry(0.15, 0.2, 0.12);

  const material = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
    depthTest: true,
  });

  const occluder = new THREE.Mesh(geometry, material);
  occluder.position.set(0, -0.01, -0.03);
  occluder.renderOrder = 0;

  return occluder;
}

const startAR = async () => {
  const mindarThree = new MindARThree({
    container: document.body,
    maxTrack: 1,
    shouldFaceUser: true,
  });

  const { renderer, scene, camera } = mindarThree;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(0, 1, 1);
  scene.add(dirLight);

  const anchor = mindarThree.addAnchor(168);

  let glasses = null;
  let baseScale = 1;

  const smooth = {
    scale: 1,
    z: 0.015,
  };

  const loader = new GLTFLoader();
  loader.load(
    'glasses.glb',
    (gltf) => {
      glasses = gltf.scene;

      glasses.traverse((child) => {
        if (child.isMesh) {
          child.material.depthTest = true;
          child.material.depthWrite = true;
        }
      });

      glasses.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(glasses);
      const size = box.getSize(new THREE.Vector3());

      const targetFaceWidth = 0.95;
      baseScale = targetFaceWidth / size.x;
      glasses.scale.setScalar(baseScale);

      glasses.position.set(0, -0.040, 0.015);
      glasses.rotation.set(-0.08, 0, 0);

      anchor.group.add(glasses);

      const occluderGeometry = new THREE.SphereGeometry(0.15, 32, 32);
      const occluderMaterial = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      const occluder = new THREE.Mesh(occluderGeometry, occluderMaterial);

      occluder.position.set(0, -0.02, -0.07);
      occluder.scale.set(1.1, 1.3, 0.9);
      occluder.renderOrder = -10;

      anchor.group.add(occluder);

      glasses.traverse((child) => {
        if (child.isMesh) {
          child.renderOrder = 10;
          child.material.depthTest = true;
          child.material.depthWrite = true;

          if (child.material.transparent) {
            child.material.opacity = Math.min(child.material.opacity, 0.3);
          }
        }
      });
    },
    undefined,
    (err) => console.error("GLB Load Error:", err)
  );

  await mindarThree.start();

  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }

  renderer.setAnimationLoop(() => {
    if (glasses && anchor.group.visible) {
      const faceScale = anchor.group.scale.x;

      smooth.scale = THREE.MathUtils.lerp(
        smooth.scale,
        baseScale * faceScale,
        0.15
      );
      glasses.scale.setScalar(smooth.scale);

      const targetZ = 0.015 + (faceScale - 1) * 0.008;
      smooth.z = THREE.MathUtils.lerp(smooth.z, targetZ, 0.15);
      glasses.position.z = smooth.z;

      glasses.rotation.x = THREE.MathUtils.lerp(
        glasses.rotation.x,
        -0.08,
        0.1
      );
      glasses.rotation.z *= 0.95;
    }

    renderer.render(scene, camera);
  });
};

startAR();
