import * as THREE from 'three';

export class PositionManager {
  // Unified constants for the entire application
  public static readonly DESKTOP_STANDING_HEIGHT = 0.25; // meters above surface for desktop (eye level)
  public static readonly VR_STANDING_HEIGHT = 0.1; // meters above surface for VR (just step up, headset is already at eye level)
  public static readonly GROUND_LEVEL = 0; // Y coordinate of ground plane
  public static readonly RAYCAST_DISTANCE = 1000; // max raycast distance
  public static readonly POSITION_PRECISION = 2; // decimal places for display

  private raycaster: THREE.Raycaster;
  private tempVector: THREE.Vector3;
  private navigableObjects: THREE.Object3D[];

  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.tempVector = new THREE.Vector3();
    this.navigableObjects = [];
    
    // Set raycaster parameters
    this.raycaster.far = PositionManager.RAYCAST_DISTANCE;
  }

  /**
   * Set the objects that can be used for navigation/teleportation
   */
  public setNavigableObjects(objects: THREE.Object3D[]): void {
    this.navigableObjects = objects;
  }

  /**
   * Cast ray from camera through screen coordinates (desktop)
   */
  public raycastFromScreen(
    screenX: number, 
    screenY: number, 
    camera: THREE.Camera
  ): THREE.Vector3 | null {
    // Convert screen coordinates to normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (screenX / window.innerWidth) * 2 - 1;
    mouse.y = -(screenY / window.innerHeight) * 2 + 1;

    // Cast ray from camera
    this.raycaster.setFromCamera(mouse, camera);
    return this.performRaycast();
  }

  /**
   * Cast ray from camera through screen coordinates with surface normal (desktop)
   */
  public raycastFromScreenWithNormal(
    screenX: number, 
    screenY: number, 
    camera: THREE.Camera
  ): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    // Convert screen coordinates to normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (screenX / window.innerWidth) * 2 - 1;
    mouse.y = -(screenY / window.innerHeight) * 2 + 1;

    // Cast ray from camera
    this.raycaster.setFromCamera(mouse, camera);
    return this.performRaycastWithNormal();
  }

  /**
   * Cast ray from VR controller
   */
  public raycastFromController(controller: THREE.Object3D): THREE.Vector3 | null {
    // Extract controller position and rotation
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    return this.performRaycast();
  }

  /**
   * Cast ray from VR controller with surface normal
   */
  public raycastFromControllerWithNormal(controller: THREE.Object3D): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    // Extract controller position and rotation
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    return this.performRaycastWithNormal();
  }

  /**
   * Cast ray downward for gravity detection
   */
  public raycastForGravity(position: THREE.Vector3): THREE.Vector3 | null {
    this.raycaster.set(position, new THREE.Vector3(0, -1, 0));
    return this.performRaycast();
  }

  /**
   * Perform the actual raycast and return intersection point
   */
  private performRaycast(): THREE.Vector3 | null {
    const intersects = this.raycaster.intersectObjects(this.navigableObjects, true);
    return intersects.length > 0 ? intersects[0].point.clone() : null;
  }

  /**
   * Perform raycast and return both intersection point and normal
   */
  private performRaycastWithNormal(): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    const intersects = this.raycaster.intersectObjects(this.navigableObjects, true);
    if (intersects.length > 0) {
      const intersection = intersects[0];
      return {
        point: intersection.point.clone(),
        normal: intersection.face ? intersection.face.normal.clone() : new THREE.Vector3(0, 1, 0)
      };
    }
    return null;
  }

  /**
   * Calculate teleport position (surface + standing height)
   */
  public calculateTeleportPosition(surfacePoint: THREE.Vector3, isVR: boolean = false): THREE.Vector3 {
    const standingHeight = isVR ? PositionManager.VR_STANDING_HEIGHT : PositionManager.DESKTOP_STANDING_HEIGHT;
    return new THREE.Vector3(
      surfacePoint.x,
      surfacePoint.y + standingHeight,
      surfacePoint.z
    );
  }

  /**
   * Apply gravity to keep position above surfaces
   */
  public applyGravity(currentPosition: THREE.Vector3, isVR: boolean = false): THREE.Vector3 {
    const standingHeight = isVR ? PositionManager.VR_STANDING_HEIGHT : PositionManager.DESKTOP_STANDING_HEIGHT;
    const groundHit = this.raycastForGravity(currentPosition);
    const newPosition = currentPosition.clone();
    
    if (groundHit) {
      const requiredHeight = groundHit.y + standingHeight;
      if (newPosition.y < requiredHeight) {
        newPosition.y = requiredHeight;
      }
    } else {
      // No ground found, ensure minimum height
      const minimumHeight = PositionManager.GROUND_LEVEL + standingHeight;
      if (newPosition.y < minimumHeight) {
        newPosition.y = minimumHeight;
      }
    }
    
    return newPosition;
  }

  /**
   * Create VR transform for teleportation
   */
  public createVRTeleportTransform(
    surfacePoint: THREE.Vector3,
    baseReferenceSpace: XRReferenceSpace
  ): XRReferenceSpace | null {
    const teleportPos = this.calculateTeleportPosition(surfacePoint, true); // VR mode
    
    const offsetPosition = {
      x: -teleportPos.x,
      y: -teleportPos.y,
      z: -teleportPos.z,
      w: 1
    };
    
    const offsetRotation = new THREE.Quaternion(); // No rotation change
    const transform = new XRRigidTransform(offsetPosition, offsetRotation);
    
    // Always use fresh reference space for absolute positioning
    const originalReferenceSpace = baseReferenceSpace;
    return originalReferenceSpace.getOffsetReferenceSpace(transform);
  }

  /**
   * Format position for display
   */
  public formatPosition(position: THREE.Vector3): string {
    return `${position.x.toFixed(PositionManager.POSITION_PRECISION)}, ${position.y.toFixed(PositionManager.POSITION_PRECISION)}, ${position.z.toFixed(PositionManager.POSITION_PRECISION)}`;
  }

  /**
   * Get the raycaster instance for external use
   */
  public getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }
} 
