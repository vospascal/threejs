import * as THREE from 'three';

export class VRDebugHUD extends THREE.Group {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private material: THREE.MeshBasicMaterial;
  private plane: THREE.Mesh;

  constructor() {
    super();
    
    // Create canvas for text rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
    
    this.context = this.canvas.getContext('2d')!;
    
    // Create texture from canvas
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;
    
    this.createHUD();
    this.setupPosition();
  }

  private createHUD(): void {
    // Create a plane for the debug text (larger for better readability)
    const geometry = new THREE.PlaneGeometry(2, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false, // Always render on top
      side: THREE.DoubleSide
    });
    
    this.plane = new THREE.Mesh(geometry, this.material);
    this.add(this.plane);
  }

  private setupPosition(): void {
    // Position relative to camera view (HUD overlay)
    // Top-left corner of the view
    this.position.set(0,0, -5);
    
    // Face forward relative to camera
    this.rotation.y = 0;
  }

  public updateDebugInfo(
    currentPosition: THREE.Vector3,
    raycastHit: THREE.Vector3 | null,
    teleportPosition: THREE.Vector3 | null,
    isVR: boolean
  ): void {
    // Clear canvas with semi-transparent background
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set text style
    this.context.fillStyle = '#00ff00'; // Bright green for visibility
    this.context.font = 'bold 18px monospace';
    this.context.textAlign = 'left';
    
    // Draw debug information
    let y = 30;
    const lineHeight = 25;
    const leftMargin = 15;
    
    this.context.fillText('=== DEBUG INFO ===', leftMargin, y);
    y += lineHeight * 1.2;
    
    // Current position
    const posStr = this.formatVector(currentPosition);
    this.context.fillText(`Position: ${posStr}`, leftMargin, y);
    y += lineHeight;
    
    // Raycast hit
    if (raycastHit) {
      const rayStr = this.formatVector(raycastHit);
      this.context.fillText(`Raycast: ${rayStr}`, leftMargin, y);
    } else {
      this.context.fillText('Raycast: No hit', leftMargin, y);
    }
    y += lineHeight;
    
    // Teleport position
    if (teleportPosition) {
      const teleStr = this.formatVector(teleportPosition);
      this.context.fillText(`Teleport: ${teleStr}`, leftMargin, y);
    } else {
      this.context.fillText('Teleport: None', leftMargin, y);
    }
    y += lineHeight;
    
    // Mode
    const modeColor = isVR ? '#ff6600' : '#0066ff'; // Orange for VR, Blue for Desktop
    this.context.fillStyle = modeColor;
    this.context.fillText(`Mode: ${isVR ? 'VR' : 'Desktop'}`, leftMargin, y);
    
    // Update texture
    this.texture.needsUpdate = true;
  }

  private formatVector(vector: THREE.Vector3): string {
    return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
  }

  public dispose(): void {
    this.texture.dispose();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.parent?.remove(this);
  }
} 
