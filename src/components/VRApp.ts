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
import { StartScene } from '../scenes/StartScene';

export class VRApp {
  private appState!: AppState;
  private chosenScene!: IslandScene | StartScene;
  private assetLoader!: GLTFAssetLoader;
  private desktopControls!: DesktopControls;
  private vrControls!: VRControls;
  private teleportMarker!: THREE.Mesh;
  private debugUI!: DebugUI;
  private vrDebugHUD!: VRDebugHUD;
  private positionManager!: PositionManager;
  private sceneChoice!: string;

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
    // this.sceneChoice = "islandScene"
    this.sceneChoice = "startScene" 
    switch (this.sceneChoice) {
      case "islandScene":
        this.chosenScene = new IslandScene(this.appState);
        break
      case "startScene":
        this.chosenScene = new StartScene(this.appState);
        break
      default: 
        this.chosenScene = new IslandScene(this.appState);
        break
    }

    this.teleportMarker = this.chosenScene.createTeleportMarker();
    this.chosenScene.createReferenceCube();
    this.chosenScene.createVRStartingPoint(this.startingPosition);

    // Create ground plane for gravity and teleportation
    const groundPlane = this.chosenScene.createGroundPlane();

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
    // @ts-ignore
    this.loadAssets(this.sceneChoice);

    // Setup window resize handling
    RendererUtils.setupWindowResize(this.appState.camera, this.appState.renderer);

    // Initialize debug UI (HTML overlay for desktop)
    this.debugUI = new DebugUI();

    // Initialize 3D debug HUD (camera-attached overlay for both desktop and VR)
    this.vrDebugHUD = new VRDebugHUD();
    this.appState.camera.add(this.vrDebugHUD);
    this.vrDebugHUD.setVisible(false); // Start hidden, toggle with debug controls
    
    // Setup debug toggle callbacks
    this.setupDebugToggle();

    // Start render loop
    this.appState.renderer.setAnimationLoop(this.render.bind(this));
  }

  private setupDebugToggle(): void {
    // Setup toggle callback for HTML debug UI
    this.debugUI.setToggleCallback((visible: boolean) => {
      // When HTML debug is toggled, also toggle 3D debug HUD
      this.vrDebugHUD.setVisible(visible);
    });

    // Setup VR controller debug toggle callback
    this.vrControls.setDebugToggleCallback(() => {
      // Toggle both debug displays when VR controller button is pressed
      this.debugUI.toggle();
    });
  }

  private setupVRSessionHandling(): void {
    this.appState.renderer.xr.addEventListener('sessionstart', () => {
      // Disable desktop controls when entering VR
      this.desktopControls.unlock();
      this.desktopControls.setTeleportationEnabled(false);

      // Update debug displays
      this.debugUI.updateMode(true);
      // Keep both debug displays visible - the 3D HUD works well in both modes
    });

    this.appState.renderer.xr.addEventListener('sessionend', () => {
      // Re-enable desktop teleportation when exiting VR
      this.desktopControls.setTeleportationEnabled(true);

      // Update debug displays
      this.debugUI.updateMode(false);
      // Keep both debug displays visible
    });
  }

  private async loadAssets(chosenScene: string): Promise<void> {
    console.log(chosenScene,'chosenScene')
    try {
      switch(chosenScene){
         case "islandScene":  
              await this.assetLoader.loadIsland(
              'low_poly_floating_island.glb',
              this.appState.navigable,
              (size: THREE.Vector3) => {
                // Create bounding box when island is loaded
                this.chosenScene.createBoundingBox(size);

                // Update position manager with new navigable objects
                this.positionManager.setNavigableObjects(this.appState.navigable);

                // Update desktop controls with navigable objects and teleport marker
                this.desktopControls.setNavigableObjects(this.appState.navigable);
                this.desktopControls.setTeleportMarker(this.teleportMarker);
              }
            );
            break
         case "startScene":
            await this.assetLoader.loadStartScene(
              'starter-scene.glb',
              this.appState.navigable,
              (size: THREE.Vector3) => {
                // Create bounding box when island is loaded
                this.chosenScene.createBoundingBox(size);

                // Update position manager with new navigable objects
                this.positionManager.setNavigableObjects(this.appState.navigable);

                // Update desktop controls with navigable objects and teleport marker
                this.desktopControls.setNavigableObjects(this.appState.navigable);
                this.desktopControls.setTeleportMarker(this.teleportMarker);
              }
            );
            break
         default: 
         console.log('default')
          await this.assetLoader.loadIsland(
                'low_poly_floating_island.glb',
                this.appState.navigable,
                (size: THREE.Vector3) => {
                  // Create bounding box when island is loaded
                  this.chosenScene.createBoundingBox(size);

                  // Update position manager with new navigable objects
                  this.positionManager.setNavigableObjects(this.appState.navigable);

                  // Update desktop controls with navigable objects and teleport marker
                  this.desktopControls.setNavigableObjects(this.appState.navigable);
                  this.desktopControls.setTeleportMarker(this.teleportMarker);
                }
              );
              break
      }
 





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
    this.vrControls.handleDebugToggle();

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
