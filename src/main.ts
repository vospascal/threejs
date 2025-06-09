import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm//webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';


let camera, scene, renderer, raycaster;
let controller1, controller2, controllerGrip1, controllerGrip2;
let baseReferenceSpace, INTERSECTION;
const tempMatrix = new THREE.Matrix4();
const navigable = []; // objects that we can teleport onto
const inputSources = [];

// Pointer‑lock movement vars
let controls, moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 4);

  // Lights
  scene.add(new THREE.HemisphereLight(0xa5a5a5, 0x444444, 2));
  const dir = new THREE.DirectionalLight(0xffffff, 4);
  dir.position.set(5, 10, 2);
  scene.add(dir);

  // Pointer‑lock controls (desktop)
  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());
  const blocker = document.getElementById('blocker');
  blocker.addEventListener('click', () => { controls.lock(); blocker.style.display = 'none'; });
  controls.addEventListener('unlock', () => { blocker.style.display = 'flex'; });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Load island
  const loader = new GLTFLoader();
  loader.load('low_poly_floating_island.glb', (gltf) => {
    const island = gltf.scene;

    // compute bounding box BEFORE centering
    const rawBox = new THREE.Box3().setFromObject(island);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const rawCenter = rawBox.getCenter(new THREE.Vector3());

    // recentre & move bottom to y=0
    island.position.sub(rawCenter);
    island.position.y -= rawBox.min.y;

    const SCALE = 3;
    island.scale.setScalar(SCALE); // enlarge for presence
    scene.add(island);
    navigable.push(island);

    // ---- Boxed outline around island ----
    const size = rawSize.clone().multiplyScalar(SCALE);
    const lineGeo = new BoxLineGeometry(size.x, size.y, size.z).translate(0, size.y / 1, 0);
    const bboxMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const bbox = new THREE.LineSegments(lineGeo, bboxMat);
    scene.add(bbox);
    // --------------------------------------

    // Position camera so island is in front
    const radius = Math.max(size.x, size.z) * 1.5;
    camera.position.set(0, size.y * 1.2, radius);
    camera.lookAt(new THREE.Vector3(0, size.y / 2, 0));
    console.log('Island loaded', size);
  }, undefined, (err) => {
    console.error('Failed to load GLB model:', err);
  });

  // Teleport marker
  const marker = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
  marker.visible = false;
  scene.add(marker);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Raycaster for teleport
  raycaster = new THREE.Raycaster();

  renderer.xr.addEventListener('sessionstart', () => {
    baseReferenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    inputSources.length = 0;
    inputSources.push(...session.inputSources);
    session.addEventListener('inputsourceschange', () => {
      inputSources.length = 0;
      inputSources.push(...session.inputSources);
    });
    controls.unlock(); // disable pointer‑lock once in VR
  });

  // Controllers
  const factory = new XRControllerModelFactory();
  controller1 = renderer.xr.getController(0);
  controller2 = renderer.xr.getController(1);
  [controller1, controller2].forEach(c => scene.add(c));

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip1.add(factory.createControllerModel(controllerGrip1));
  controllerGrip2.add(factory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip1);
  scene.add(controllerGrip2);

  function onSelectStart() { this.userData.isSelecting = true; }
  function onSelectEnd() {
    this.userData.isSelecting = false;
    if (INTERSECTION) {
      const transform = new XRRigidTransform({ x: -INTERSECTION.x, y: -INTERSECTION.y, z: -INTERSECTION.z, w: 1 });
      renderer.xr.setReferenceSpace(baseReferenceSpace.getOffsetReferenceSpace(transform));
    }
  }
  [controller1, controller2].forEach(c => {
    c.addEventListener('selectstart', onSelectStart);
    c.addEventListener('selectend', onSelectEnd);
  });

  // Simple laser pointer visuals
  const buildRay = () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
  };
  controller1.add(buildRay());
  controller2.add(buildRay());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(render);
}

function onKeyDown(e) {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = true; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = true; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = true; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = true; break;
  }
}
function onKeyUp(e) {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = false; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = false; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = false; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = false; break;
  }
}

function render() {
  const delta = clock.getDelta();

  // Desktop WASD controls
  if (controls.isLocked && !renderer.xr.isPresenting) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    if (moveForward || moveBackward) velocity.z -= direction.z * 20.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 20.0 * delta;
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }

  // Teleport targeting
  INTERSECTION = undefined;
  [controller1, controller2].forEach(ctrl => {
    if (ctrl.userData.isSelecting) {
      tempMatrix.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      const hits = raycaster.intersectObjects(navigable, true);
      if (hits.length > 0) INTERSECTION = hits[0].point;
    }
  });

  handleSmoothRotation();
  renderer.render(scene, camera);
}

function handleSmoothRotation() {
  if (!baseReferenceSpace) return;
  const speed = 0.02; // rad/frame
  inputSources.forEach(src => {
    if (!src.gamepad) return;
    const x = src.gamepad.axes[2] || 0;
    if (Math.abs(x) < 0.2) return; // dead‑zone
    const angle = -x * speed;

    // Current head position
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(camera.matrixWorld);

    // Y‑axis rotation quaternion
    const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const inverse = new THREE.Matrix4().makeRotationFromQuaternion(quaternion).invert();
    const offsetPosition = position.clone().applyMatrix4(inverse).negate();

    const transform = new XRRigidTransform(
      { x: offsetPosition.x, y: offsetPosition.y, z: offsetPosition.z, w: 1 },
      { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
    );
    renderer.xr.setReferenceSpace(baseReferenceSpace.getOffsetReferenceSpace(transform));
  });
}