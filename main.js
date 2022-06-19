
import * as THREE from 'three';

import { FirstPersonControls } from './three.js-master/examples/jsm/controls/FirstPersonControls.js';
import { GLTFLoader } from './three.js-master/examples/jsm/loaders/GLTFLoader.js';
import { Water } from './three.js-master/examples/jsm/objects/Water.js';
import { Reflector } from './three.js-master/examples/jsm/objects/Reflector.js';

const SHADOW_MAP_WIDTH = 4096, SHADOW_MAP_HEIGHT = 4096;

let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;
const FLOOR = - 250;

let camera, controls, scene, renderer;
let container, stats;

const NEAR = 1, FAR = 30000;

let light, water;

const clock = new THREE.Clock();

var projectiles = [];

init();
animate();

function launchProjectile() {
    const geo = new THREE.SphereGeometry(50);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xFF0000 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    mesh.position.set(camera.position.x, camera.position.y, camera.position.z);
    scene.add(mesh);

    let dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    let toAdd = [mesh, dir, 0];
    projectiles.push(toAdd);
}

function onKeyDown(key) {
    if (key.code == "Space") {
        launchProjectile();
    }
}

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(50, SCREEN_WIDTH / SCREEN_HEIGHT, NEAR, FAR);
    camera.position.set(0, 60, 190);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const ambient = new THREE.AmbientLight(0x444444);
    scene.add(ambient);

    light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 5, 0.3);
    light.position.set(0, 1500, 1000);
    light.target.position.set(0, 0, 0);

    light.castShadow = true;
    light.shadow.camera.near = 1200;
    light.shadow.camera.far = 2500;
    light.shadow.bias = 0.0001;

    light.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    light.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    scene.add(light);

    createScene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container.appendChild(renderer.domElement);

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.autoClear = false;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    controls = new FirstPersonControls(camera, renderer.domElement);

    controls.lookSpeed = 0.0125;
    controls.movementSpeed = 500;
    controls.noFly = false;
    controls.lookVertical = true;

    controls.lookAt(scene.position);

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);

}

function onWindowResize() {

    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

    controls.handleResize();

}

function createScene() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const ground = new THREE.Mesh(geometry, planeMaterial);

    ground.position.set(0, FLOOR, 0);
    ground.rotation.x = - Math.PI / 2;
    ground.scale.set(100, 100, 100);

    ground.castShadow = true;
    ground.receiveShadow = true;

    scene.add(ground);

    const gltfloader = new GLTFLoader();
    gltfloader.load('resources/vase/scene.gltf', function (gltf) {
        gltf.scene.traverse(function (node) {
            if (node.isMesh) { node.castShadow = true; }
        });
        gltf.scene.castShadow = true;
        gltf.scene.position.set(0, -170, -100);
        gltf.scene.scale.set(0.5, 0.5, 0.5);
        scene.add(gltf.scene);
    });

    gltfloader.load('resources/monk/scene.gltf', function (gltf) {
        gltf.scene.traverse(function (node) {
            if (node.isMesh) { node.castShadow = true; }
        })
        gltf.scene.scale.set(300, 300, 300);
        gltf.scene.position.y = -400;
        gltf.scene.position.z = 200;
        gltf.scene.rotation.y = Math.PI;
        camera.add(gltf.scene);
    });

    const waterGeometry = new THREE.CircleGeometry(100, 32);

    water = new Water(
        waterGeometry,
        {
            textureWidth: 128,
            textureHeight: 128,
            waterNormals: new THREE.TextureLoader().load('./three.js-master/examples/textures/waternormals.jpg', function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0xaaaaff,
            distortionScale: 0.1,
            fog: scene.fog !== undefined
        }
    );

    water.position.set(0, -95, -100);
    water.rotation.x = - Math.PI / 2;

    scene.add(water);

    let mirror = new Reflector(geometry, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: 0x777777
    });
    mirror.position.z = -400;
    mirror.scale.set(5, 10, 1);
    scene.add(mirror);

    scene.add(camera);
}

function animate() {

    requestAnimationFrame(animate);

    render();
}

function render() {

    const delta = clock.getDelta();

    projectiles.forEach((proj) => {
        let mesh = proj[0];
        mesh.position.addScaledVector(proj[1], 1000 * delta);
        proj[2] = proj[2] + delta;

        if (proj[2] > 5) {
            let p = projectiles.shift();
            scene.remove(p[0]);
        }


    });

    controls.update(delta);
    water.material.uniforms['time'].value += 1.0 / 60.0;

    renderer.clear();
    renderer.render(scene, camera);
}

