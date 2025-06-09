import * as THREE from 'three';
import type { AppState } from '../types';
import { IslandScene } from '../scenes/IslandScene';
import { GLTFAssetLoader } from '../loaders/GLTFAssetLoader';
import { DesktopControls } from '../controls/DesktopControls';
import { VRControls } from '../controls/VRControls';
import { RendererUtils } from '../utils/RendererUtils';
import { DebugUI } from '../utils/DebugUI';
import { PositionManager } from '../utils/PositionManager';
import { VRDebugHUD } from '../utils/VRDebugHUD';

export class VRApp {
  private appState!: AppState;
  private islandScene!: IslandScene;
  private assetLoader!: GLTFAssetLoader;
  private desktopControls!: DesktopControls;
  private vrControls!: VRControls;
  private teleportMarker!: THREE.Mesh;
  private debugUI!: DebugUI;
  private vrDebugHUD!: VRDebugHUD;
  private positionManager!: PositionManager;

  // Centralized starting position for all components
  private readonly startingPosition = new THREE.Vector3(-5, 18, 5);

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // Initialize position manager first (unified coordinate system)
    this.positionManager = new PositionManager();

    // Initialize basic Three.js components
    this.appState = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200),
      renderer: RendererUtils.createRenderer(),
      raycaster: this.positionManager.getRaycaster(), // Use unified raycaster
      navigable: [],
      inputSources: []
    };

    // Set initial camera position to starting position with gravity applied (desktop mode)
    const gravityAdjustedPosition = this.positionManager.applyGravity(this.startingPosition, false);
    this.appState.camera.position.copy(gravityAdjustedPosition);

    // Initialize scene
    this.islandScene = new IslandScene(this.appState);
    this.teleportMarker = this.islandScene.createTeleportMarker();
    this.islandScene.createReferenceCube();
    this.islandScene.createVRStartingPoint(this.startingPosition);
    
    // Create ground plane for gravity and teleportation
    const groundPlane = this.islandScene.createGroundPlane();
    this.appState.navigable.push(groundPlane);

    // Update position manager with navigable objects
    this.positionManager.setNavigableObjects(this.appState.navigable);

    // Initialize controls
    this.desktopControls = new DesktopControls(this.appState.camera, this.positionManager);
    this.appState.scene.add(this.desktopControls.getObject());
    
    // Add raycast circle to scene
    const raycastCircle = this.desktopControls.getRaycastCircle();
    if (raycastCircle) {
      this.appState.scene.add(raycastCircle);
    }

    // Initialize VR controls
    this.vrControls = new VRControls(this.appState, this.startingPosition, this.positionManager);

    // Setup VR session handling
    this.setupVRSessionHandling();

    // Initialize asset loader and load assets
    this.assetLoader = new GLTFAssetLoader(this.appState, this.startingPosition);
    this.loadAssets();

    // Setup window resize handling
    RendererUtils.setupWindowResize(this.appState.camera, this.appState.renderer);

    // Initialize debug UI (HTML overlay for desktop)
    this.debugUI = new DebugUI();

    // Initialize VR debug HUD (3D overlay for VR)
    this.vrDebugHUD = new VRDebugHUD(this.appState.camera, this.appState.scene);
    this.vrDebugHUD.setVisible(false); // Start hidden

    // Start render loop
    this.appState.renderer.setAnimationLoop(this.render.bind(this));
  }

  private setupVRSessionHandling(): void {
    this.appState.renderer.xr.addEventListener('sessionstart', () => {
      // Disable desktop controls when entering VR
      this.desktopControls.unlock();
      this.desktopControls.setTeleportationEnabled(false);
      
      // Switch debug displays
      this.debugUI.updateMode(true);
      this.debugUI.setVisible(false); // Hide HTML overlay
      this.vrDebugHUD.setVisible(true); // Show 3D HUD
    });

    this.appState.renderer.xr.addEventListener('sessionend', () => {
      // Re-enable desktop teleportation when exiting VR
      this.desktopControls.setTeleportationEnabled(true);
      
      // Switch debug displays back
      this.debugUI.updateMode(false);
      this.debugUI.setVisible(true); // Show HTML overlay
      this.vrDebugHUD.setVisible(false); // Hide 3D HUD
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
          
          // Update position manager with new navigable objects
          this.positionManager.setNavigableObjects(this.appState.navigable);
          
          // Update desktop controls with navigable objects and teleport marker
          this.desktopControls.setNavigableObjects(this.appState.navigable);
          this.desktopControls.setTeleportMarker(this.teleportMarker);
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
    this.vrControls.updateTeleportTargeting(this.teleportMarker);
    this.vrControls.handleSmoothRotation();

    // Get intersection data using unified system
    const isVR = this.appState.renderer.xr.isPresenting;

    // Get current position and apply gravity
    const currentPosition = this.appState.camera.position;
    const gravityAdjustedPosition = this.positionManager.applyGravity(currentPosition, isVR);
    
    // Only update position if gravity adjustment is needed
    if (gravityAdjustedPosition.distanceTo(currentPosition) > 0.01) {
      this.appState.camera.position.copy(gravityAdjustedPosition);
    }
    const intersection = isVR 
      ? this.appState.intersection 
      : this.desktopControls.getLastRaycastHit();

    // Update debug displays
    this.debugUI.updateCurrentPosition(this.appState.camera.position);
    this.debugUI.updateRaycastHit(intersection || null);
    this.debugUI.updateTeleportPosition(intersection || null);

    // Update VR debug HUD
    this.vrDebugHUD.updateDebugInfo(
      this.appState.camera.position,
      intersection || null,
      intersection ? this.positionManager.calculateTeleportPosition(intersection, isVR) : null,
      isVR
    );
    this.vrDebugHUD.update();

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