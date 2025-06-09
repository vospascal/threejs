import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AppState } from '../types';

export class GLTFAssetLoader {
  private loader: GLTFLoader;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private startingPosition: THREE.Vector3;

  constructor(appState: AppState, startingPosition: THREE.Vector3) {
    this.loader = new GLTFLoader();
    this.scene = appState.scene;
    this.camera = appState.camera;
    this.startingPosition = startingPosition;
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
          
          // Ensure all materials are properly set up for solid rendering
          island.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Ensure the mesh has proper material properties
              if (child.material) {
                // Make sure materials are not transparent unless intended
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.transparent = false;
                    mat.opacity = 1;
                    mat.side = THREE.FrontSide;
                  });
                } else {
                  child.material.transparent = false;
                  child.material.opacity = 1;
                  child.material.side = THREE.FrontSide;
                }
              }
              
              // Ensure the mesh casts and receives shadows
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
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
          
          // Position camera at the centralized starting position
          this.camera.position.copy(this.startingPosition);
          this.camera.lookAt(new THREE.Vector3(0, size.y / 2, 0)); // Look at island center

          // Callback for bounding box creation
          if (onBoundingBoxCreated) {
            onBoundingBoxCreated(size);
          }

          console.log('model loaded', size);
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

  
  public async loadStartScene(
    path: string, 
    navigable: THREE.Object3D[],
    onBoundingBoxCreated?: (size: THREE.Vector3) => void
  ): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf: GLTF) => {
          const startScene = gltf.scene;
          
          // Ensure all materials are properly set up for solid rendering
          startScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Ensure the mesh has proper material properties
              if (child.material) {
                // Make sure materials are not transparent unless intended
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.transparent = false;
                    mat.opacity = 1;
                    mat.side = THREE.FrontSide;
                  });
                } else {
                  child.material.transparent = false;
                  child.material.opacity = 1;
                  child.material.side = THREE.FrontSide;
                }
              }
              
              // Ensure the mesh casts and receives shadows
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          // Compute bounding box BEFORE centering
          const rawBox = new THREE.Box3().setFromObject(startScene);
          const rawSize = rawBox.getSize(new THREE.Vector3());
          const rawCenter = rawBox.getCenter(new THREE.Vector3());

          // Recenter & move bottom to y=0
          startScene.position.sub(rawCenter);
          startScene.position.y -= rawBox.min.y;

          const SCALE = 3;
          startScene.scale.setScalar(SCALE);
          this.scene.add(startScene);
          navigable.push(startScene);

          // Calculate final size after scaling
          const size = rawSize.clone().multiplyScalar(SCALE);
          
          // Position camera at the centralized starting position
          this.camera.position.copy(this.startingPosition);
          this.camera.lookAt(new THREE.Vector3(0, size.y / 2, 0)); // Look at island center

          // Callback for bounding box creation
          if (onBoundingBoxCreated) {
            onBoundingBoxCreated(size);
          }

          console.log('Island loaded', size);
          resolve(startScene);
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