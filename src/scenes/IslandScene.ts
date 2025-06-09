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
    // Ambient lighting for general illumination
    const hemisphereLight = new THREE.HemisphereLight(0xa5a5a5, 0x444444, 1.5);
    this.scene.add(hemisphereLight);

    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    
    this.scene.add(directionalLight);

    // Add a fill light to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0x404040, 1);
    fillLight.position.set(-10, 10, -5);
    this.scene.add(fillLight);
  }

  public createTeleportMarker(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8 
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.visible = false;
    this.scene.add(marker);
    return marker;
  }

  public createGroundPlane(): THREE.Mesh {
    // Create a large invisible ground plane for gravity and teleportation
    const geometry = new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x888888,
      transparent: true,
      opacity: 0,
      visible: false // Invisible but still raycast-able
    });
    const groundPlane = new THREE.Mesh(geometry, material);
    groundPlane.position.y = 0; // At ground level
    groundPlane.name = 'groundPlane';
    this.scene.add(groundPlane);
    return groundPlane;
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

  public createReferenceCube(): THREE.LineSegments {
    // Create a 10x10x10 meter reference cube
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
    const edges = new THREE.EdgesGeometry(cubeGeometry);
    const material = new THREE.LineBasicMaterial({ 
      color: 0xff6b35, 
      transparent: true, 
      opacity: 0.5 
    });
    const referenceCube = new THREE.LineSegments(edges, material);
    referenceCube.position.set(0, 5, 0); // Center at ground level
    this.scene.add(referenceCube);
    return referenceCube;
  }

  public createVRStartingPoint(position: THREE.Vector3): THREE.Mesh {
    // Create a visual indicator for the VR starting point
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.7 
    });
    const startingPoint = new THREE.Mesh(geometry, material);
    
    // Position it at the provided starting position
    startingPoint.position.copy(position);
    startingPoint.position.y = 0.05; // Keep platform on ground level
    this.scene.add(startingPoint);
    
    // Add a simple arrow indicator pointing toward the island
    const arrowGeometry = new THREE.ConeGeometry(0.3, 1, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.set(0, 1, 0);
    arrow.rotation.x = Math.PI / 2; // Point forward
    startingPoint.add(arrow);
    
    return startingPoint;
  }
} 