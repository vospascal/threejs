import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import type { VRControllers, AppState } from '../types';

export class VRControls {
  private controllers: VRControllers;
  private appState: AppState;
  private tempMatrix: THREE.Matrix4;
  private startingPosition: THREE.Vector3;

  constructor(appState: AppState, startingPosition: THREE.Vector3) {
    this.appState = appState;
    this.startingPosition = startingPosition;
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
        const intersection = this.appState.intersection;
        const transform = new XRRigidTransform(
          { x: -intersection.x, y: -intersection.y, z: -intersection.z, w: 1 }
        );
        this.appState.renderer.xr.setReferenceSpace(
          this.appState.baseReferenceSpace.getOffsetReferenceSpace(transform)
        );
      }
    };

    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
  }

  private setupVRSession(): void {
    this.appState.renderer.xr.addEventListener('sessionstart', () => {
      const referenceSpace = this.appState.renderer.xr.getReferenceSpace();
      if (referenceSpace) {
        this.appState.baseReferenceSpace = referenceSpace;
        
        // Set VR starting position
        this.setVRStartingPosition();
      }
      
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
    
    // Use the centralized starting position
    
    // Create transform to move to starting position
    const transform = new XRRigidTransform(
      { 
        x: -this.startingPosition.x, 
        y: -this.startingPosition.y, 
        z: -this.startingPosition.z, 
        w: 1 
      }
    );
    
    // Apply the starting position and update the base reference space
    const newReferenceSpace = this.appState.baseReferenceSpace.getOffsetReferenceSpace(transform);
    this.appState.renderer.xr.setReferenceSpace(newReferenceSpace);
    
    // Update the base reference space so all future transforms are relative to this new position
    this.appState.baseReferenceSpace = newReferenceSpace;
    
    console.log('VR starting position set:', this.startingPosition);
  }

  public updateTeleportTargeting(): void {
    this.appState.intersection = undefined;
    
    [this.controllers.controller1, this.controllers.controller2].forEach(controller => {
      if (controller.userData.isSelecting) {
        this.tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.appState.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.appState.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
        
        const hits = this.appState.raycaster.intersectObjects(this.appState.navigable, true);
        if (hits.length > 0) {
          this.appState.intersection = hits[0].point;
        }
      }
    });
  }

  public handleSmoothRotation(): void {
    if (!this.appState.baseReferenceSpace) return;
    
    // Much slower rotation speed
    const rotationSpeed = 0.005; // Reduced from 0.02
    const deadZone = 0.3; // Increased dead zone for better control
    
    this.appState.inputSources.forEach(source => {
      if (!source.gamepad) return;
      
      // Use right thumbstick X-axis for rotation
      const thumbstickX = source.gamepad.axes[2] || 0;
      
      // Apply dead zone
      if (Math.abs(thumbstickX) < deadZone) return;
      
      // Smooth the input with easing
      const normalizedInput = (Math.abs(thumbstickX) - deadZone) / (1 - deadZone);
      const easedInput = normalizedInput * normalizedInput; // Quadratic easing
      const rotationAmount = Math.sign(thumbstickX) * easedInput * rotationSpeed;
      
      // Create rotation around Y-axis (vertical axis)
      const rotationY = -rotationAmount; // Negative for natural direction
      
      // Get current position to rotate around
      const headPosition = new THREE.Vector3();
      headPosition.setFromMatrixPosition(this.appState.camera.matrixWorld);
      
      // Create rotation quaternion
      const rotationQuaternion = new THREE.Quaternion();
      rotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
      
      // Calculate the offset needed to rotate around the head position
      const translationToOrigin = new THREE.Vector3(-headPosition.x, 0, -headPosition.z);
      const translationBack = new THREE.Vector3(headPosition.x, 0, headPosition.z);
      
      // Apply rotation to the translation
      const rotatedTranslation = translationToOrigin.clone().applyQuaternion(rotationQuaternion);
      const finalTranslation = rotatedTranslation.add(translationBack);
      
      // Create the transform
      const transform = new XRRigidTransform(
        { 
          x: finalTranslation.x, 
          y: 0, // Don't change Y position
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
      
      // Apply the transform
      if (this.appState.baseReferenceSpace) {
        this.appState.renderer.xr.setReferenceSpace(
          this.appState.baseReferenceSpace.getOffsetReferenceSpace(transform)
        );
      }
    });
  }

  public getControllers(): VRControllers {
    return this.controllers;
  }
} 