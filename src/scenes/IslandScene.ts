import * as THREE from 'three';
import type { AppState } from '../types';

export class IslandScene {
  private scene: THREE.Scene;

  constructor(appState: AppState) {
    this.scene = appState.scene;
    this.setupScene();
  }

  private setupScene(): void {
    // Background
    this.scene.background = new THREE.Color(0x505050);

    // Lighting
    this.setupLighting();
  }

  private setupLighting(): void {
    // Ambient lighting
    const hemisphereLight = new THREE.HemisphereLight(0xa5a5a5, 0x444444, 2);
    this.scene.add(hemisphereLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
    directionalLight.position.set(5, 10, 2);
    this.scene.add(directionalLight);
  }

  public createTeleportMarker(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const marker = new THREE.Mesh(geometry, material);
    marker.visible = false;
    this.scene.add(marker);
    return marker;
  }

  public createBoundingBox(size: THREE.Vector3): THREE.LineSegments {
    // Create a simple box geometry for the bounding box
    const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const bbox = new THREE.LineSegments(edges, material);
    bbox.position.set(0, size.y / 2, 0);
    this.scene.add(bbox);
    return bbox;
  }
} 