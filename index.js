import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import spline from './spline.js';
import { EffectComposer } from 'jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'jsm/postprocessing/UnrealBloomPass.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.getElementById('canvasContainer').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// Post-processing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = 3.5;
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Create a tube geometry from the spline
const tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);

// Create edges geometry from the spline with light red color
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMat = new THREE.LineBasicMaterial({ color: 0x00aaff }); // Light red color
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

// Box geometries
const numBoxes = 55;
const size = 0.075;
const boxGeo = new THREE.BoxGeometry(size, size, size);
for (let i = 0; i < numBoxes; i += 1) {
  const boxMat = new THREE.MeshBasicMaterial({
    color: 0xffa0a0, // Light red color
    wireframe: true
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  const p = (i / numBoxes + Math.random() * 0.1) % 1;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;
  box.position.copy(pos);
  const rote = new THREE.Vector3(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  box.rotation.set(rote.x, rote.y, rote.z);
  const edges = new THREE.EdgesGeometry(boxGeo, 0.2);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffa0a0 }); // Light red color
  const boxLines = new THREE.LineSegments(edges, lineMat);
  boxLines.position.copy(pos);
  boxLines.rotation.set(rote.x, rote.y, rote.z);
  scene.add(boxLines);
}

let audio, audioContext, analyser, dataArray, smoothedSpeed;
let isPlaying = false;

function setupAudio() {
  audio = new Audio('./1nonly - Step Back! ft. SXMPRA (Official Lyric Video).mp3');
  audio.crossOrigin = 'anonymous';
  
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  
  smoothedSpeed = 0;

  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  audio.play();
}

function updateCamera() {
  analyser.getByteFrequencyData(dataArray);
  const avgEnergy = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  const tempoFactor = avgEnergy / 128;
  const targetSpeed = Math.max(0.1, tempoFactor);
  smoothedSpeed += (targetSpeed - smoothedSpeed) * 0.2; // Adjusted smoothing for slower beat effect

  const time = audio.currentTime;
  const p = (time / audio.duration) * smoothedSpeed;
  const pos = tubeGeo.parameters.path.getPointAt(p % 1);
  const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);
  camera.position.copy(pos);
  camera.lookAt(lookAt);
}

function animate() {
  if (isPlaying) {
    requestAnimationFrame(animate);
    updateCamera();
    composer.render(scene, camera);
    controls.update();
  }
}

document.getElementById('startButton').addEventListener('click', () => {
  if (!isPlaying) {
    setupAudio();
    isPlaying = true;
    document.querySelector('.main').style.display = 'none'; // Hide the main div
    document.getElementById('canvasContainer').style.display = 'block'; // Show the canvas container
    document.getElementById('exitButton').style.display = 'block'; // Show the exit button
    animate();
  }
});

document.getElementById('exitButton').addEventListener('click', () => {
  if (isPlaying) {
    isPlaying = false;
    document.querySelector('.main').style.display = 'flex'; // Show the main div
    document.getElementById('canvasContainer').style.display = 'none'; // Hide the canvas container
    document.getElementById('exitButton').style.display = 'none'; // Hide the exit button
    audio.pause();
    audio.currentTime = 0;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
