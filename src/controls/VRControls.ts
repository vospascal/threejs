import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import type { VRControllers, AppState } from '../types';
import { PositionManager } from '../utils/PositionManager';

export class VRControls {
  private controllers: VRControllers;
  private appState: AppState;
  private tempMatrix: THREE.Matrix4;
  private startingPosition: THREE.Vector3;
  private positionManager: PositionManager;
  private rotationTriggered: Map<XRInputSource, boolean>;

  constructor(appState: AppState, startingPosition: THREE.Vector3, positionManager: PositionManager) {
    this.appState = appState;
    this.startingPosition = startingPosition;
    this.positionManager = positionManager;
    this.rotationTriggered = new Map();
    this.tempMatrix = new THREE.Matrix4();
    this.controllers = this.setupControllers();
    this.setupVRSession();
  }

  private setupControllers(): VRControllers {
    const factory = new XRControllerModelFactory();
    
    const controller1 = this.appState.renderer.xr.getController(0);
    const controller2 = this.appState.renderer.xr.getController(1);
    
    [controller1, controller2].forEach(controller => {
      this.appState.scene.add(controller);
    });

    const controllerGrip1 = this.appState.renderer.xr.getControllerGrip(0);
    const controllerGrip2 = this.appState.renderer.xr.getControllerGrip(1);
    
    controllerGrip1.add(factory.createControllerModel(controllerGrip1));
    controllerGrip2.add(factory.createControllerModel(controllerGrip2));
    
    this.appState.scene.add(controllerGrip1);
    this.appState.scene.add(controllerGrip2);

    // Add ray visuals
    this.addRayVisuals(controller1);
    this.addRayVisuals(controller2);

    // Setup teleport event listeners
    this.setupTeleportListeners(controller1);
    this.setupTeleportListeners(controller2);

    return {
      controller1,
      controller2,
      controllerGrip1,
      controllerGrip2
    };
  }

  private addRayVisuals(controller: THREE.XRTargetRaySpace): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    const ray = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
    controller.add(ray);
  }

  private setupTeleportListeners(controller: THREE.XRTargetRaySpace): void {
    const onSelectStart = function(this: THREE.XRTargetRaySpace) {
      this.userData.isSelecting = true;
    };

    const onSelectEnd = () => {
      controller.userData.isSelecting = false;
      if (this.appState.intersection && this.appState.baseReferenceSpace) {
        // Use unified position manager for VR teleportation
        const newReferenceSpace = this.positionManager.createVRTeleportTransform(
          this.appState.intersection,
          this.appState.baseReferenceSpace
        );
        
        if (newReferenceSpace) {
          this.appState.renderer.xr.setReferenceSpace(newReferenceSpace);
          
          const teleportPos = this.positionManager.calculateTeleportPosition(this.appState.intersection, true);
          console.log('VR teleporting: Surface:', this.positionManager.formatPosition(this.appState.intersection), 
                      '→ Standing at:', this.positionManager.formatPosition(teleportPos));
        }
      }
    };

    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
  }

  private setupVRSession(): void {
    this.appState.renderer.xr.addEventListener('sessionstart', () => {
      // Store the original reference space for absolute positioning
      const referenceSpace = this.appState.renderer.xr.getReferenceSpace();
      if (referenceSpace) {
        this.appState.baseReferenceSpace = referenceSpace;
      }
      
      // Set VR starting position
      this.setVRStartingPosition();
      
      const session = this.appState.renderer.xr.getSession();
      
      if (session) {
        this.appState.inputSources.length = 0;
        this.appState.inputSources.push(...session.inputSources);
        
        session.addEventListener('inputsourceschange', () => {
          this.appState.inputSources.length = 0;
          this.appState.inputSources.push(...session.inputSources);
        });
      }
    });
  }

  private setVRStartingPosition(): void {
    if (!this.appState.baseReferenceSpace) return;
    
    // Use the centralized starting position with absolute positioning
    const transform = new XRRigidTransform(
      { 
        x: -this.startingPosition.x, 
        y: -this.startingPosition.y, 
        z: -this.startingPosition.z, 
        w: 1 
      }
    );
    
    // Apply the starting position using the original reference space
    const newReferenceSpace = this.appState.baseReferenceSpace.getOffsetReferenceSpace(transform);
    this.appState.renderer.xr.setReferenceSpace(newReferenceSpace);
    
    console.log('VR starting position set:', this.startingPosition);
  }

  public updateTeleportTargeting(teleportMarker: THREE.Mesh): void {
    this.appState.intersection = undefined;
    
    // Check both controllers for surface targeting
    [this.controllers.controller1, this.controllers.controller2].forEach(controller => {
      if (controller.userData.isSelecting) {
        // Use unified position manager for VR controller raycast
        const surfacePoint = this.positionManager.raycastFromController(controller);
        
        if (surfacePoint) {
          this.appState.intersection = surfacePoint;
          console.log('VR detected surface at:', this.positionManager.formatPosition(surfacePoint));
        }
      }
    });
    
    // Update teleport marker visibility and position
    if (this.appState.intersection) {
      teleportMarker.position.copy(this.appState.intersection);
      teleportMarker.visible = true;
    } else {
      teleportMarker.visible = false;
    }
  }

  public handleSmoothRotation(): void {
    if (!this.appState.baseReferenceSpace) return;
    
    const snapAngle = Math.PI / 6; // 30 degrees
    const deadZone = 0.7; // Higher threshold for snap rotation
    
    this.appState.inputSources.forEach(source => {
      if (!source.gamepad) return;
      
      // Use right thumbstick X-axis for snap rotation
      const thumbstickX = source.gamepad.axes[2] || 0;
      
              // Check if we should trigger a snap rotation
        if (Math.abs(thumbstickX) > deadZone) {
          // Prevent multiple triggers while holding the stick
          if (this.rotationTriggered.get(source)) return;
          this.rotationTriggered.set(source, true);
          
          // Determine rotation direction
          const rotationDirection = thumbstickX > 0 ? 1 : -1;
          const rotationY = rotationDirection * snapAngle;
          
          // Get the current head position to rotate around
          const headPosition = new THREE.Vector3();
          headPosition.setFromMatrixPosition(this.appState.camera.matrixWorld);
          
          // Create rotation quaternion
          const rotationQuaternion = new THREE.Quaternion();
          rotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
          
          // To rotate around the head position:
          // 1. Translate to origin (move head to 0,0,0)
          // 2. Apply rotation
          // 3. Translate back
          
          // Step 1: Translation to move head to origin
          const translateToOrigin = new THREE.Vector3(-headPosition.x, -headPosition.y, -headPosition.z);
          
          // Step 2 & 3: Apply rotation and translate back
          // The rotation happens around origin, then we translate back
          const rotatedTranslation = translateToOrigin.clone().applyQuaternion(rotationQuaternion);
          const finalTranslation = rotatedTranslation.add(headPosition);
          
          // Create the transform
          const transform = new XRRigidTransform(
            { 
              x: finalTranslation.x, 
              y: finalTranslation.y, 
              z: finalTranslation.z, 
              w: 1 
            },
            { 
              x: rotationQuaternion.x, 
              y: rotationQuaternion.y, 
              z: rotationQuaternion.z, 
              w: rotationQuaternion.w 
            }
          );
          
          // Apply the snap rotation
          const currentSpace = this.appState.renderer.xr.getReferenceSpace();
          if (currentSpace) {
            this.appState.renderer.xr.setReferenceSpace(
              currentSpace.getOffsetReferenceSpace(transform)
            );
          }
        } else {
          // Reset trigger when thumbstick returns to center
          this.rotationTriggered.set(source, false);
        }
    });
  }

  public getControllers(): VRControllers {
    return this.controllers;
  }
} 