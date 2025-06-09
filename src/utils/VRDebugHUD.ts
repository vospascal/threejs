import * as THREE from 'three';

export class VRDebugHUD {
  private hudGroup: THREE.Group;
  private textMeshes: { [key: string]: THREE.Mesh };
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.hudGroup = new THREE.Group();
    this.textMeshes = {};
    
    // Create canvas for text rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.context = this.canvas.getContext('2d')!;
    
    // Create texture from canvas
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;
    
    this.createHUD();
    scene.add(this.hudGroup);
  }

  private createHUD(): void {
    // Create a plane for the debug text
    const geometry = new THREE.PlaneGeometry(1, 0.5);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const hudMesh = new THREE.Mesh(geometry, material);
    
    // Position HUD in top-left of view
    hudMesh.position.set(-0.8, 0.6, -2);
    
    this.hudGroup.add(hudMesh);
    this.textMeshes['main'] = hudMesh;
  }

  public updateDebugInfo(
    currentPosition: THREE.Vector3,
    raycastHit: THREE.Vector3 | null,
    teleportPosition: THREE.Vector3 | null,
    isVR: boolean
  ): void {
    // Clear canvas
    this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set text style
    this.context.fillStyle = 'white';
    this.context.font = '16px monospace';
    
    // Draw debug information
    let y = 30;
    const lineHeight = 20;
    
    this.context.fillText('=== DEBUG INFO ===', 10, y);
    y += lineHeight * 1.5;
    
    // Current position
    const posStr = this.formatVector(currentPosition);
    this.context.fillText(`Position: ${posStr}`, 10, y);
    y += lineHeight;
    
    // Raycast hit
    if (raycastHit) {
      const rayStr = this.formatVector(raycastHit);
      this.context.fillText(`Raycast: ${rayStr}`, 10, y);
    } else {
      this.context.fillText('Raycast: No hit', 10, y);
    }
    y += lineHeight;
    
    // Teleport position
    if (teleportPosition) {
      const teleStr = this.formatVector(teleportPosition);
      this.context.fillText(`Teleport: ${teleStr}`, 10, y);
    } else {
      this.context.fillText('Teleport: None', 10, y);
    }
    y += lineHeight;
    
    // Mode
    this.context.fillText(`Mode: ${isVR ? 'VR' : 'Desktop'}`, 10, y);
    
    // Update texture
    this.texture.needsUpdate = true;
  }

  private formatVector(vector: THREE.Vector3): string {
    return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
  }

  public update(): void {
    // Make HUD always face the camera
    this.hudGroup.lookAt(this.camera.position);
    
    // In VR, position relative to camera
    if (this.camera.parent) {
      // VR mode - position relative to headset
      this.hudGroup.position.copy(this.camera.position);
      this.hudGroup.position.add(new THREE.Vector3(-0.5, 0.3, -1));
    }
  }

  public setVisible(visible: boolean): void {
    this.hudGroup.visible = visible;
  }

  public dispose(): void {
    this.texture.dispose();
    this.hudGroup.parent?.remove(this.hudGroup);
  }
} 