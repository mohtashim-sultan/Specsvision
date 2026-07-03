declare module "mind-ar/dist/mindar-face-three.prod.js" {
  import * as THREE from "three";

  interface MindARThreeOptions {
    container: HTMLElement;
    maxTrack?: number;
    shouldFaceUser?: boolean;
    uiLoading?: string;
    uiScanning?: string;
    uiError?: string;
    filterMinCF?: number | null;
    filterBeta?: number | null;
  }

  interface Anchor {
    group: THREE.Group;
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions);
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    video: HTMLVideoElement;
    anchors: Anchor[];
    addAnchor(index: number): Anchor;
    start(): Promise<void>;
    stop(): void;
  }
}
