import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { MovementState } from '../types';
import { PositionManager } from '../utils/PositionManager';

export class DesktopControls {
  private controls: PointerLockControls;
  private movementState: MovementState;
  private clock: THREE.Clock;
  private positionManager: PositionManager;
  private teleportationEnabled: boolean;
  private teleportMarker?: THREE.Mesh;
  private raycastCircle?: THREE.Mesh;
  private lastRaycastHit?: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera, positionManager: PositionManager) {
    this.controls = new PointerLockControls(camera, document.body);
    this.clock = new THREE.Clock();
    this.positionManager = positionManager;
    this.teleportationEnabled = true;
    
    this.movementState = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      velocity: new THREE.Vector3(),
      direction: new THREE.Vector3()
    };

    this.createRaycastCircle();
    this.setupPointerLock();
    this.setupKeyboardListeners();
    this.setupMouseListeners();
  }

  private createRaycastCircle(): void {
    // Create a small circle to show raycast hit point
    const geometry = new THREE.CircleGeometry(0.1, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.7 
    });
    this.raycastCircle = new THREE.Mesh(geometry, material);
    this.raycastCircle.visible = false;
  }

  private setupPointerLock(): void {
    const blocker = document.getElementById('blocker');
    if (blocker) {
      blocker.addEventListener('click', () => {
        this.controls.lock();
        blocker.style.display = 'none';
      });

      this.controls.addEventListener('unlock', () => {
        blocker.style.display = 'flex';
      });
    }
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private setupMouseListeners(): void {
    document.addEventListener('click', this.onMouseClick.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    // Only show marker when pointer lock is active and teleportation is enabled
    if (!this.controls.isLocked || !this.teleportationEnabled) return;

    // Use unified position manager for raycast
    const surfacePoint = this.positionManager.raycastFromScreen(
      event.clientX, 
      event.clientY, 
      this.controls.object as THREE.Camera
    );
    
    if (surfacePoint) {
      this.lastRaycastHit = surfacePoint.clone();
      
      // Show teleport marker
      if (this.teleportMarker) {
        this.teleportMarker.position.copy(surfacePoint);
        this.teleportMarker.visible = true;
      }
      
      // Show raycast circle
      if (this.raycastCircle) {
        this.raycastCircle.position.copy(surfacePoint);
        this.raycastCircle.position.y += 0.01; // Slightly above surface
        this.raycastCircle.lookAt(this.controls.object.position);
        this.raycastCircle.visible = true;
      }
    } else {
      this.lastRaycastHit = undefined;
      
      if (this.teleportMarker) {
        this.teleportMarker.visible = false;
      }
      
      if (this.raycastCircle) {
        this.raycastCircle.visible = false;
      }
    }
  }

  private onMouseClick(event: MouseEvent): void {
    // Only allow teleportation when pointer lock is active and teleportation is enabled
    if (!this.controls.isLocked || !this.teleportationEnabled) return;

    // Prevent teleportation on UI elements
    if (event.target !== document.body && event.target !== this.controls.domElement) return;

    // Use unified position manager for raycast
    const surfacePoint = this.positionManager.raycastFromScreen(
      event.clientX, 
      event.clientY, 
      this.controls.object as THREE.Camera
    );
    
    if (surfacePoint) {
      console.log('Desktop detected surface at:', surfacePoint);
      this.teleportTo(surfacePoint);
    }
  }

  private teleportTo(surfacePoint: THREE.Vector3): void {
    // Use unified position manager for teleport calculation (desktop mode)
    const teleportPosition = this.positionManager.calculateTeleportPosition(surfacePoint, false);
    
    // Set the exact teleport position
    this.controls.object.position.copy(teleportPosition);
    
    // Hide markers after teleporting
    if (this.teleportMarker) {
      this.teleportMarker.visible = false;
    }
    if (this.raycastCircle) {
      this.raycastCircle.visible = false;
    }
    
    console.log('Desktop teleporting: Surface:', this.positionManager.formatPosition(surfacePoint), 
                '→ Standing at:', this.positionManager.formatPosition(teleportPosition));
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.movementState.moveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.movementState.moveLeft = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.movementState.moveBackward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.movementState.moveRight = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.movementState.moveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.movementState.moveLeft = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.movementState.moveBackward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.movementState.moveRight = false;
        break;
    }
  }

  public update(renderer: THREE.WebGLRenderer): void {
    const delta = this.clock.getDelta();
    const { velocity, direction } = this.movementState;

    if (this.controls.isLocked && !renderer.xr.isPresenting) {
      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;

      direction.z = Number(this.movementState.moveForward) - Number(this.movementState.moveBackward);
      direction.x = Number(this.movementState.moveRight) - Number(this.movementState.moveLeft);
      direction.normalize();

      if (this.movementState.moveForward || this.movementState.moveBackward) {
        velocity.z -= direction.z * 20.0 * delta;
      }
      if (this.movementState.moveLeft || this.movementState.moveRight) {
        velocity.x -= direction.x * 20.0 * delta;
      }

      this.controls.moveRight(-velocity.x * delta);
      this.controls.moveForward(-velocity.z * delta);

      // Gravity is now handled by VRApp using unified PositionManager
    }
  }



  public unlock(): void {
    this.controls.unlock();
  }

  public getObject(): THREE.Object3D {
    return this.controls.object;
  }

  public setNavigableObjects(objects: THREE.Object3D[]): void {
    // Navigable objects are now managed by PositionManager
    this.positionManager.setNavigableObjects(objects);
  }

  public setTeleportationEnabled(enabled: boolean): void {
    this.teleportationEnabled = enabled;
    if (!enabled) {
      if (this.teleportMarker) {
        this.teleportMarker.visible = false;
      }
      if (this.raycastCircle) {
        this.raycastCircle.visible = false;
      }
    }
  }

  public setTeleportMarker(marker: THREE.Mesh): void {
    this.teleportMarker = marker;
  }

  public getLastRaycastHit(): THREE.Vector3 | undefined {
    return this.lastRaycastHit;
  }

  public getRaycastCircle(): THREE.Mesh | undefined {
    return this.raycastCircle;
  }
} 