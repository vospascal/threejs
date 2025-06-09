import * as THREE from 'three';

export interface VRControllers {
  controller1: THREE.XRTargetRaySpace;
  controller2: THREE.XRTargetRaySpace;
  controllerGrip1: THREE.XRGripSpace;
  controllerGrip2: THREE.XRGripSpace;
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
}

export interface MovementState {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  velocity: THREE.Vector3;
  direction: THREE.Vector3;
} 