import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';

export interface VRControllers {
  controller1: THREE.XRTargetRaySpace;
  controller2: THREE.XRTargetRaySpace;
  controllerGrip1: THREE.XRGripSpace;
  controllerGrip2: THREE.XRGripSpace;
}

export interface BokehSettings {
  enabled: boolean;
  focus: number;
  aperture: number;
  maxblur: number;
  nearFocusDistance: number;
  showFocus: boolean;
  manualdof: boolean;
  vignetting: boolean;
  depthblur: boolean;
  threshold: number;
  gain: number;
  bias: number;
  fringe: number;
  focalLength: number;
  noise: boolean;
  pentagon: boolean;
  dithering: number;
}

export interface LUTSettings {
  enabled: boolean;
  lut: string;
  intensity: number;
}

export interface PostProcessingState {
  composer: EffectComposer;
  bokehPass: BokehPass;
  lutPass: LUTPass;
  enabled: boolean;
  bokehEnabled: boolean;
  lutEnabled: boolean;
}

export interface AppState {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  raycaster: THREE.Raycaster;
  baseReferenceSpace?: XRReferenceSpace;
  intersection?: THREE.Vector3;
  navigable: THREE.Object3D[];
  inputSources: XRInputSource[];
  postProcessing?: PostProcessingState;
}

export interface MovementState {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  velocity: THREE.Vector3;
  direction: THREE.Vector3;
} 