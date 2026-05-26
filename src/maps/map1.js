import { loadWireframe1 } from './wireframe1.js';

export function loadMap1(scene) {
  // Clear any existing map meshes
  if (!scene.customData.mapMeshes) {
    scene.customData.mapMeshes = [];
  }
  if (!scene.customData.mapObservers) {
    scene.customData.mapObservers = [];
  }

  // 1. Configure environmental sky colors (Sunset / Volcanic Red)
  scene.clearColor = new BABYLON.Color4(0.04, 0.015, 0.015, 1.0);

  // 2. Setup standard wireframe material for background pyramids
  const synthMat = new BABYLON.StandardMaterial("synthMat1", scene);
  synthMat.emissiveColor = new BABYLON.Color3(1.0, 0.2, 0.0);
  synthMat.disableLighting = true;
  synthMat.wireframe = true;

  // 3. Generate decorative floating sunset pyramids
  for (let i = 0; i < 45; i++) {
    const height = 2.0 + Math.random() * 4.0;
    const baseWidth = 1.0 + Math.random() * 2.5;
    const pyramid = BABYLON.MeshBuilder.CreateCylinder("pyramid" + i, {
      tessellation: 4,
      subdivisions: 1,
      height: height,
      diameterTop: 0,
      diameterBottom: baseWidth
    }, scene);
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 25.0 + Math.random() * 85.0;
    pyramid.position.set(Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance);
    pyramid.material = synthMat;
    
    scene.customData.mapMeshes.push(pyramid);
  }

  // 4. Load detailed custom wireframe outpost models
  loadWireframe1(scene, scene.customData.mapMeshes, scene.customData.mapObservers);

  // Save references for dynamic transitions
  scene.customData.synthMat = synthMat;

  // Configure custom grid and skybox theme coloring parameters
  if (scene.customData.groundMaterial) {
    scene.customData.groundMaterial.setFloat("uDayNight", 0.0);
    scene.customData.groundMaterial.setFloat("uMapTheme", 1.0);
  }
  if (scene.customData.skyboxMaterial) {
    scene.customData.skyboxMaterial.setFloat("uMapTheme", 1.0);
  }
}

export function cleanupMap1(scene) {
  if (scene.customData.mapMeshes) {
    scene.customData.mapMeshes.forEach(mesh => mesh.dispose());
    scene.customData.mapMeshes = [];
  }
  if (scene.customData.synthMat) {
    scene.customData.synthMat.dispose();
  }
  if (scene.customData.mapObservers) {
    scene.customData.mapObservers.forEach(obs => scene.onBeforeRenderObservable.remove(obs));
    scene.customData.mapObservers = [];
  }
}
