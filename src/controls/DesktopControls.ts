import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { MovementState } from '../types';

export class DesktopControls {
  private controls: PointerLockControls;
  private movementState: MovementState;
  private clock: THREE.Clock;

  constructor(camera: THREE.PerspectiveCamera) {
    this.controls = new PointerLockControls(camera, document.body);
    this.clock = new THREE.Clock();
    
    this.movementState = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      velocity: new THREE.Vector3(),
      direction: new THREE.Vector3()
    };

    this.setupPointerLock();
    this.setupKeyboardListeners();
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
    }
  }

  public unlock(): void {
    this.controls.unlock();
  }

  public getObject(): THREE.Object3D {
    return this.controls.getObject();
  }
} 