import * as THREE from 'three';
import { PositionManager } from './PositionManager';

export class DebugUI {
  private currentPosElement: HTMLElement;
  private raycastPosElement: HTMLElement;
  private teleportPosElement: HTMLElement;
  private currentModeElement: HTMLElement;
  private debugContainer: HTMLElement;
  private toggleButton: HTMLElement;
  private isVisible: boolean = false;
  private onToggle?: (visible: boolean) => void;

  constructor() {
    this.currentPosElement = document.getElementById('currentPos')!;
    this.raycastPosElement = document.getElementById('raycastPos')!;
    this.teleportPosElement = document.getElementById('teleportPos')!;
    this.currentModeElement = document.getElementById('currentMode')!;
    this.debugContainer = document.getElementById('debug')!;
    this.toggleButton = document.getElementById('debugToggle')!;
    
    // Setup toggle functionality
    this.setupToggle();
    
    // Start hidden
    this.setVisible(false);
  }

  public updateCurrentPosition(position: THREE.Vector3): void {
    const x = position.x.toFixed(2);
    const y = position.y.toFixed(2);
    const z = position.z.toFixed(2);
    this.currentPosElement.textContent = `${x}, ${y}, ${z}`;
  }

  public updateRaycastHit(position: THREE.Vector3 | null): void {
    if (position) {
      const x = position.x.toFixed(2);
      const y = position.y.toFixed(2);
      const z = position.z.toFixed(2);
      this.raycastPosElement.textContent = `${x}, ${y}, ${z}`;
    } else {
      this.raycastPosElement.textContent = 'No hit';
    }
  }

  public updateTeleportPosition(surfacePos: THREE.Vector3 | null): void {
    if (surfacePos) {
      const teleportPos = new THREE.Vector3(
        surfacePos.x,
        surfacePos.y + PositionManager.DESKTOP_STANDING_HEIGHT,
        surfacePos.z
      );
      this.teleportPosElement.textContent = this.formatVector3(teleportPos);
    } else {
      this.teleportPosElement.textContent = 'None';
    }
  }

  public updateMode(isVR: boolean): void {
    this.currentModeElement.textContent = isVR ? 'VR' : 'Desktop';
  }

  public formatVector3(vector: THREE.Vector3): string {
    return `${vector.x.toFixed(PositionManager.POSITION_PRECISION)}, ${vector.y.toFixed(PositionManager.POSITION_PRECISION)}, ${vector.z.toFixed(PositionManager.POSITION_PRECISION)}`;
  }

  private setupToggle(): void {
    this.toggleButton.addEventListener('click', () => {
      this.toggle();
    });
  }

  public toggle(): void {
    this.setVisible(!this.isVisible);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.debugContainer.style.display = visible ? 'block' : 'none';
    
    // Update button appearance
    this.toggleButton.style.background = visible ? 'rgba(0,255,0,0.2)' : 'rgba(0,0,0,0.8)';
    this.toggleButton.textContent = visible ? 'HIDE DEBUG' : 'SHOW DEBUG';
    
    // Notify parent component
    if (this.onToggle) {
      this.onToggle(visible);
    }
  }

  public setToggleCallback(callback: (visible: boolean) => void): void {
    this.onToggle = callback;
  }
} 
