import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AppState } from '../types';

export class GLTFAssetLoader {
  private loader: GLTFLoader;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  constructor(appState: AppState) {
    this.loader = new GLTFLoader();
    this.scene = appState.scene;
    this.camera = appState.camera;
  }

  public async loadIsland(
    path: string, 
    navigable: THREE.Object3D[],
    onBoundingBoxCreated?: (size: THREE.Vector3) => void
  ): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf: GLTF) => {
          const island = gltf.scene;
          
          // Compute bounding box BEFORE centering
          const rawBox = new THREE.Box3().setFromObject(island);
          const rawSize = rawBox.getSize(new THREE.Vector3());
          const rawCenter = rawBox.getCenter(new THREE.Vector3());

          // Recenter & move bottom to y=0
          island.position.sub(rawCenter);
          island.position.y -= rawBox.min.y;

          const SCALE = 3;
          island.scale.setScalar(SCALE);
          this.scene.add(island);
          navigable.push(island);

          // Calculate final size after scaling
          const size = rawSize.clone().multiplyScalar(SCALE);
          
          // Position camera so island is in front
          const radius = Math.max(size.x, size.z) * 1.5;
          this.camera.position.set(0, size.y * 1.2, radius);
          this.camera.lookAt(new THREE.Vector3(0, size.y / 2, 0));

          // Callback for bounding box creation
          if (onBoundingBoxCreated) {
            onBoundingBoxCreated(size);
          }

          console.log('Island loaded', size);
          resolve(island);
        },
        undefined,
        (error: any) => {
          console.error('Failed to load GLB model:', error);
          reject(error);
        }
      );
    });
  }
} 