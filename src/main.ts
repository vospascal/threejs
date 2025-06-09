import * as THREE from 'three';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, raycaster;
let controller1, controller2, controllerGrip1, controllerGrip2;
let floor, marker, baseReferenceSpace;
const tempMatrix = new THREE.Matrix4();
let INTERSECTION;

// desktop pointer‑lock helpers
let controls, blocker, instructions;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const move = { f: false, b: false, l: false, r: false };

// thumb‑stick rotation helpers
let inputSources = [];
let yawOffset = 0; // cumulative yaw in radians

init();

function init() {
  blocker = document.getElementById('blocker');
  instructions = document.getElementById('instructions');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
  camera.position.set(0, 1.6, 3);

  // Desktop pointer‑lock controls
  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());

  instructions.addEventListener('click', () => {
    controls.lock();
  });
  controls.addEventListener('lock', () => (blocker.style.display = 'none'));
  controls.addEventListener('unlock', () => (blocker.style.display = 'flex'));

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Environment
  scene.add(new THREE.HemisphereLight(0xa5a5a5, 0x898989, 3));
  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(1, 1, 1).normalize();
  scene.add(dirLight);

  const room = new THREE.LineSegments(
    new BoxLineGeometry(6, 6, 6, 10, 10, 10).translate(0, 3, 0),
    new THREE.LineBasicMaterial({ color: 0xbcbcbc })
  );
  scene.add(room);

  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 4.8).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xbcbcbc, transparent: true, opacity: 0.25 })
  );
  scene.add(floor);

  marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
  );
  scene.add(marker);

  // Load GLB island
  const loader = new GLTFLoader();
  loader.load('low_poly_floating_island.glb', (gltf) => {
    const model = gltf.scene;
    model.position.set(0, 0, -2);
    model.scale.setScalar(0.5);
    scene.add(model);
  });

  raycaster = new THREE.Raycaster();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // WebXR session setup
  renderer.xr.addEventListener('sessionstart', () => {
    baseReferenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    inputSources = session.inputSources;
    session.addEventListener('inputsourceschange', () => (inputSources = session.inputSources));
  });

  // Controllers
  setupControllers();

  window.addEventListener('resize', onWindowResize);
  renderer.setAnimationLoop(animate);
}

function setupControllers() {
  function buildController(data) {
    if (data.targetRayMode === 'tracked-pointer') {
      const geometry = new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      const material = new THREE.LineBasicMaterial({ color: 0xffffff });
      return new THREE.Line(geometry, material);
    } else if (data.targetRayMode === 'gaze') {
      return new THREE.Mesh(
        new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1),
        new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true })
      );
    }
  }

  function onSelectStart() {
    this.userData.isSelecting = true;
  }
  function onSelectEnd() {
    this.userData.isSelecting = false;
    if (INTERSECTION && baseReferenceSpace) {
      const offsetPosition = { x: -INTERSECTION.x, y: -INTERSECTION.y, z: -INTERSECTION.z, w: 1 };
      const transform = new XRRigidTransform(offsetPosition, new THREE.Quaternion());
      const teleportSpace = baseReferenceSpace.getOffsetReferenceSpace(transform);
      renderer.xr.setReferenceSpace(teleportSpace);
    }
  }

  controller1 = renderer.xr.getController(0);
  controller2 = renderer.xr.getController(1);
  [controller1, controller2].forEach((c) => {
    c.addEventListener('selectstart', onSelectStart);
    c.addEventListener('selectend', onSelectEnd);
    c.addEventListener('connected', (e) => c.add(buildController(e.data)));
    c.addEventListener('disconnected', () => c.remove(c.children[0]));
    scene.add(c);
  });

  const factory = new XRControllerModelFactory();
  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip1.add(factory.createControllerModel(controllerGrip1));
  controllerGrip2.add(factory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip1);
  scene.add(controllerGrip2);
}

// Desktop key handling
function onKeyDown(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      move.f = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      move.l = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      move.b = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      move.r = true;
      break;
  }
}
function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      move.f = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      move.l = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      move.b = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      move.r = false;
      break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // --- Desktop movement
  if (!renderer.xr.isPresenting) {
    const delta = 0.1;
    velocity.set(0, 0, 0);
    direction.z = Number(move.f) - Number(move.b);
    direction.x = Number(move.r) - Number(move.l);
    direction.normalize();
    if (move.f || move.b) velocity.z -= direction.z * delta;
    if (move.l || move.r) velocity.x -= direction.x * delta;
    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);
  }

  // --- VR intersection for teleport
  INTERSECTION = undefined;
  [controller1, controller2].forEach((c) => {
    if (c && c.userData.isSelecting) {
      tempMatrix.identity().extractRotation(c.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      const hit = raycaster.intersectObjects([floor]);
      if (hit.length) INTERSECTION = hit[0].point;
    }
  });
  if (INTERSECTION) marker.position.copy(INTERSECTION);
  marker.visible = INTERSECTION !== undefined;

  // --- VR thumb‑stick rotation
  handleSmoothRotation();

  renderer.render(scene, camera);
}

function handleSmoothRotation() {
  if (!baseReferenceSpace || !renderer.xr.isPresenting) return;
  const speed = 0.03; // radians per frame
  let rotated = false;
  inputSources.forEach((src) => {
    if (!src.gamepad) return;
    const x = src.gamepad.axes[2] || 0;
    if (Math.abs(x) > 0.2) {
      yawOffset += -x * speed;
      rotated = true;
    }
  });
  if (!rotated) return;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawOffset);
  const transform = new XRRigidTransform({}, { x: q.x, y: q.y, z: q.z, w: q.w });
  const space = baseReferenceSpace.getOffsetReferenceSpace(transform);
  renderer.xr.setReferenceSpace(space);
}



