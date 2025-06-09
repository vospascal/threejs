import * as THREE from 'three';
import type { AppState } from '../types';
import { IslandScene } from '../scenes/IslandScene';
import { GLTFAssetLoader } from '../loaders/GLTFAssetLoader';
import { DesktopControls } from '../controls/DesktopControls';
import { VRControls } from '../controls/VRControls';
import { RendererUtils } from '../utils/RendererUtils';

export class VRApp {
  private appState!: AppState;
  private islandScene!: IslandScene;
  private assetLoader!: GLTFAssetLoader;
  private desktopControls!: DesktopControls;
  private vrControls!: VRControls;

  // Centralized starting position for all components
  private readonly startingPosition = new THREE.Vector3(-5, 18, 5);

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // Initialize basic Three.js components
    this.appState = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200),
      renderer: RendererUtils.createRenderer(),
      raycaster: new THREE.Raycaster(),
      navigable: [],
      inputSources: []
    };

    // Set initial camera position to starting position
    this.appState.camera.position.copy(this.startingPosition);

    // Initialize scene
    this.islandScene = new IslandScene(this.appState);
    this.islandScene.createTeleportMarker();
    this.islandScene.createReferenceCube();
    this.islandScene.createVRStartingPoint(this.startingPosition);

    // Initialize controls
    this.desktopControls = new DesktopControls(this.appState.camera);
    this.appState.scene.add(this.desktopControls.getObject());

    // Initialize VR controls
    this.vrControls = new VRControls(this.appState, this.startingPosition);

    // Setup VR session handling
    this.setupVRSessionHandling();

    // Initialize asset loader and load assets
    this.assetLoader = new GLTFAssetLoader(this.appState, this.startingPosition);
    this.loadAssets();

    // Setup window resize handling
    RendererUtils.setupWindowResize(this.appState.camera, this.appState.renderer);

    // Start render loop
    this.appState.renderer.setAnimationLoop(this.render.bind(this));
  }

  private setupVRSessionHandling(): void {
    this.appState.renderer.xr.addEventListener('sessionstart', () => {
      // Unlock desktop controls when entering VR
      this.desktopControls.unlock();
    });
  }

  private async loadAssets(): Promise<void> {
    try {
      await this.assetLoader.loadIsland(
        'low_poly_floating_island.glb',
        this.appState.navigable,
        (size: THREE.Vector3) => {
          // Create bounding box when island is loaded
          this.islandScene.createBoundingBox(size);
        }
      );
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }

  private render(): void {
    // Update desktop controls
    this.desktopControls.update(this.appState.renderer);

    // Update VR controls
    this.vrControls.updateTeleportTargeting();
    this.vrControls.handleSmoothRotation();

    // Render the scene
    this.appState.renderer.render(this.appState.scene, this.appState.camera);
  }

  // Public API for external access if needed
  public getAppState(): AppState {
    return this.appState;
  }

  public getScene(): THREE.Scene {
    return this.appState.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.appState.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.appState.renderer;
  }
} 