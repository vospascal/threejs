import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import type { VRControllers, AppState } from '../types';

export class VRControls {
  private controllers: VRControllers;
  private appState: AppState;
  private tempMatrix: THREE.Matrix4;

  constructor(appState: AppState) {
    this.appState = appState;
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
    
    const speed = 0.02; // rad/frame
    
    this.appState.inputSources.forEach(source => {
      if (!source.gamepad) return;
      
      const x = source.gamepad.axes[2] || 0;
      if (Math.abs(x) < 0.2) return; // dead-zone
      
      const angle = -x * speed;

      // Current head position
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(this.appState.camera.matrixWorld);

      // Y-axis rotation quaternion
      const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const inverse = new THREE.Matrix4().makeRotationFromQuaternion(quaternion).invert();
      const offsetPosition = position.clone().applyMatrix4(inverse).negate();

      const transform = new XRRigidTransform(
        { x: offsetPosition.x, y: offsetPosition.y, z: offsetPosition.z, w: 1 },
        { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
      );
      
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