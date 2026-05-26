import { createCar } from './garage/car1.js';
import { createTruck } from './garage/truck1.js';
import { carPhysics } from './physics.js';
import { loadMap1, cleanupMap1 } from './maps/map1.js';
import { loadMap2, cleanupMap2 } from './maps/map2.js';
import { loadMap3, cleanupMap3 } from './maps/map3.js';
import { createSkybox } from './maps/dynamicsky.js';
import { initHeadlights, attachHeadlights } from './garage/headlights.js';

// Import seamless ground images for our high-fidelity map texture floors
const outpostGroundImg = new URL('../assets/images/outpost_ground.png', import.meta.url).href;
const tokyoGroundImg = new URL('../assets/images/tokyo_ground.png', import.meta.url).href;
const nebulaGroundImg = new URL('../assets/images/nebula_ground.png', import.meta.url).href;

export const uLightDirValue = new BABYLON.Vector3(1.0, 1.2, 0.8).normalize();

export function createScene(engine, canvas, initialCarPosition) {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.04, 0.015, 0.015, 1.0);

  // Setup Action Camera
  const camera = new BABYLON.TargetCamera("Camera", new BABYLON.Vector3(0, 2, -5), scene);
  camera.rotation.set(0.2, 0, 0);

  // Environmental Sunlight / Moonlight direction source
  const sunLight = new BABYLON.DirectionalLight("sunLight", uLightDirValue, scene);
  sunLight.intensity = 1.0;

  // Ambient light
  const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  ambientLight.intensity = 0.5;

  // Create Ground Floor Grid
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, scene);
  
  // Load high-fidelity seamless ground textures with WRAP repeat parameters
  const outpostTex = new BABYLON.Texture(outpostGroundImg, scene);
  outpostTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  outpostTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  
  const tokyoTex = new BABYLON.Texture(tokyoGroundImg, scene);
  tokyoTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  tokyoTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  
  const nebulaTex = new BABYLON.Texture(nebulaGroundImg, scene);
  nebulaTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  nebulaTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

  const groundMaterial = new BABYLON.ShaderMaterial("groundShader", scene, {
    vertex: "ground",
    fragment: "ground",
  }, {
    attributes: ["position", "uv"],
    uniforms: [
      "worldViewProjection", "world", "vEyePosition", "uDayNight", "uMapTheme",
      "uHeadlightPosL", "uHeadlightPosR", "uHeadlightDir", "uHeadlightLIntensity", "uHeadlightRIntensity"
    ],
    samplers: ["uOutpostTex", "uTokyoTex", "uNebulaTex"]
  });
  
  groundMaterial.setFloat("uDayNight", 0.0);
  groundMaterial.setFloat("uMapTheme", 1.0);
  groundMaterial.setVector3("uHeadlightPosL", BABYLON.Vector3.Zero());
  groundMaterial.setVector3("uHeadlightPosR", BABYLON.Vector3.Zero());
  groundMaterial.setVector3("uHeadlightDir", new BABYLON.Vector3(0, -0.1, 1));
  groundMaterial.setFloat("uHeadlightLIntensity", 0.0);
  groundMaterial.setFloat("uHeadlightRIntensity", 0.0);
  
  // Bind textures to the custom shader material samplers
  groundMaterial.setTexture("uOutpostTex", outpostTex);
  groundMaterial.setTexture("uTokyoTex", tokyoTex);
  groundMaterial.setTexture("uNebulaTex", nebulaTex);
  
  ground.material = groundMaterial;

  // Create the SDF Car using the refactored module
  const { carBox, carMaterial } = createCar(scene, initialCarPosition);

  // Create the SDF Truck using the refactored module (starts disabled)
  const { carBox: truckBox, carMaterial: truckMaterial } = createTruck(scene, initialCarPosition);
  truckBox.setEnabled(false);

  // Initialize scene.customData structure first so the map loaders can populate it
  scene.customData = {
    carBox,
    carMaterial,
    groundMaterial,
    synthMat: null,
    sunLight,
    driftParticles: null,
    camera,
    carMesh: carBox,
    carMat: carMaterial,
    truckMesh: truckBox,
    truckMat: truckMaterial,
    mapMeshes: [],
    skyboxMesh: null,
    skyboxMaterial: null,
    skyboxObserver: null
  };

  // Instantiate the custom dynamic procedural skybox
  createSkybox(scene);

  // Load baseline Cyberpunk Outpost map
  loadMap1(scene);

  // Instantiate dynamic headlights and attach to initial vehicle (Sports Car)
  initHeadlights(scene);
  attachHeadlights(carBox, "car");

  // Programmatically draw standard circular puff gradient texture for tyre particles
  const particleCanvas = document.createElement("canvas");
  particleCanvas.width = 32;
  particleCanvas.height = 32;
  const pCtx = particleCanvas.getContext("2d");
  const pGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  pGrad.addColorStop(0, "rgba(255,255,255,0.45)");
  pGrad.addColorStop(1, "rgba(255,255,255,0)");
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 32, 32);
  
  const pTexture = new BABYLON.DynamicTexture("pTex", particleCanvas, scene);

  // Setup tyre particle drift emitter
  const driftParticles = new BABYLON.ParticleSystem("driftParticles", 100, scene);
  driftParticles.particleTexture = pTexture;
  driftParticles.emitter = carBox;
  // Emit strictly around back wheel locations
  driftParticles.minEmitBox = new BABYLON.Vector3(-0.55, -0.2, -0.32);
  driftParticles.maxEmitBox = new BABYLON.Vector3(-0.45, -0.2, 0.32);
  
  driftParticles.color1 = new BABYLON.Color4(1.0, 0.35, 0.0, 0.4);
  driftParticles.color2 = new BABYLON.Color4(1.0, 0.15, 0.0, 0.15);
  driftParticles.colorDead = new BABYLON.Color4(0.4, 0.2, 0.1, 0.0);
  driftParticles.minSize = 0.05;
  driftParticles.maxSize = 0.35;
  driftParticles.minLifeTime = 0.2;
  driftParticles.maxLifeTime = 0.65;
  driftParticles.gravity = new BABYLON.Vector3(0, 0.4, 0);
  driftParticles.minEmitPower = 0.1;
  driftParticles.maxEmitPower = 0.4;
  driftParticles.emitRate = 0;
  driftParticles.start();

  // Link driftParticles back into scene.customData
  scene.customData.driftParticles = driftParticles;

  // Helper to switch active drivable vehicle between car and truck
  scene.switchVehicle = (type) => {
    const data = scene.customData;
    if (!data.carMesh || !data.truckMesh) return;

    let src = (type === "truck") ? data.carMesh : data.truckMesh;
    let dst = (type === "truck") ? data.truckMesh : data.carMesh;
    let dstMat = (type === "truck") ? data.truckMat : data.carMat;

    // Transfer transform coordinates
    dst.position.copyFrom(src.position);
    if (type === "truck") {
      carPhysics.position.y = 0.62;
      carPhysics.radius = 0.30;
      data.driftParticles.minEmitBox.z = -0.44;
      data.driftParticles.maxEmitBox.z = 0.44;
    } else {
      carPhysics.position.y = 0.26;
      carPhysics.radius = 0.14;
      data.driftParticles.minEmitBox.z = -0.32;
      data.driftParticles.maxEmitBox.z = 0.32;
    }
    dst.rotation.copyFrom(src.rotation);

    // Swap visibility state
    src.setEnabled(false);
    dst.setEnabled(true);

    // Re-parent and adjust spatial offsets for the headlights on the new mesh
    attachHeadlights(dst, type);

    // Update active references for game loops
    data.carBox = dst;
    data.carMaterial = dstMat;
    data.driftParticles.emitter = dst;
  };

  // Helper to switch active map environment procedurally
  scene.switchMap = (mapId) => {
    // 1. Cleanup all maps
    cleanupMap1(scene);
    cleanupMap2(scene);
    cleanupMap3(scene);

    // 2. Load the target map
    if (mapId === "map2") {
      loadMap2(scene);
    } else if (mapId === "map3") {
      loadMap3(scene);
    } else {
      loadMap1(scene);
    }
  };

  return scene;
}
