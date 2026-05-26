import { loadWireframe2 } from './wireframe2.js';

export function loadMap2(scene) {
  // Clear any existing map meshes
  if (!scene.customData.mapMeshes) {
    scene.customData.mapMeshes = [];
  }
  if (!scene.customData.mapObservers) {
    scene.customData.mapObservers = [];
  }

  // 1. Configure environmental sky colors (Midnight obsidian)
  scene.clearColor = new BABYLON.Color4(0.008, 0.004, 0.02, 1.0);

  // 2. Setup Neon Cyber materials for Skyscrapers (Alternate Cyan & Magenta)
  const cyanMat = new BABYLON.StandardMaterial("cyanSkyscraperMat", scene);
  cyanMat.emissiveColor = new BABYLON.Color3(0.0, 0.8, 1.0);
  cyanMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.1);
  cyanMat.disableLighting = true;
  cyanMat.wireframe = true;

  const magentaMat = new BABYLON.StandardMaterial("magentaSkyscraperMat", scene);
  magentaMat.emissiveColor = new BABYLON.Color3(1.0, 0.0, 0.7);
  magentaMat.diffuseColor = new BABYLON.Color3(0.1, 0.05, 0.05);
  magentaMat.disableLighting = true;
  magentaMat.wireframe = true;

  // 3. Generate 30 towering neon skyscrapers
  for (let i = 0; i < 30; i++) {
    const height = 15.0 + Math.random() * 25.0;
    const w = 3.0 + Math.random() * 4.0;
    const d = 3.0 + Math.random() * 4.0;
    
    const building = BABYLON.MeshBuilder.CreateBox("building" + i, {
      width: w,
      height: height,
      depth: d
    }, scene);

    // Disperse into city grid block clusters
    const angle = Math.random() * Math.PI * 2;
    const distance = 30.0 + Math.random() * 90.0;
    building.position.set(Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance);
    building.material = (i % 2 === 0) ? cyanMat : magentaMat;

    scene.customData.mapMeshes.push(building);
  }

  // 4. Create 4 huge glowing neon checkpoint arches to drive through
  const archPositions = [
    new BABYLON.Vector3(0, 0, 20),
    new BABYLON.Vector3(45, 0, -10),
    new BABYLON.Vector3(-40, 0, -45),
    new BABYLON.Vector3(-25, 0, 35)
  ];

  const archDirections = [
    0, // angle in rad
    Math.PI / 4,
    Math.PI / 2,
    -Math.PI / 3
  ];

  const checkpointMat = new BABYLON.StandardMaterial("checkpointMat", scene);
  checkpointMat.emissiveColor = new BABYLON.Color3(0.1, 1.0, 0.2); // Bright radioactive green!
  checkpointMat.disableLighting = true;

  const frameMat = new BABYLON.StandardMaterial("frameMat", scene);
  frameMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
  frameMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

  archPositions.forEach((pos, idx) => {
    // Create an arch compound container
    const archContainer = new BABYLON.TransformNode("archContainer" + idx, scene);
    archContainer.position.copyFrom(pos);
    archContainer.rotation.y = archDirections[idx];

    // Left post
    const leftPost = BABYLON.MeshBuilder.CreateBox("leftPost" + idx, { width: 0.4, height: 3.5, depth: 0.4 }, scene);
    leftPost.position.set(-2.5, 1.75, 0);
    leftPost.material = frameMat;
    leftPost.parent = archContainer;

    // Right post
    const rightPost = BABYLON.MeshBuilder.CreateBox("rightPost" + idx, { width: 0.4, height: 3.5, depth: 0.4 }, scene);
    rightPost.position.set(2.5, 1.75, 0);
    rightPost.material = frameMat;
    rightPost.parent = archContainer;

    // Glowing top lintel gate
    const topLintel = BABYLON.MeshBuilder.CreateBox("topLintel" + idx, { width: 5.4, height: 0.5, depth: 0.6 }, scene);
    topLintel.position.set(0, 3.5, 0);
    topLintel.material = checkpointMat;
    topLintel.parent = archContainer;

    // Push meshes for cleanup
    scene.customData.mapMeshes.push(leftPost, rightPost, topLintel);
  });

  // 5. Load detailed Tokyo wireframe structures
  loadWireframe2(scene, scene.customData.mapMeshes, scene.customData.mapObservers);

  // Save materials for cleanup
  scene.customData.mapMaterials = [cyanMat, magentaMat, checkpointMat, frameMat];

  // Configure custom grid and skybox theme colors
  if (scene.customData.groundMaterial) {
    scene.customData.groundMaterial.setFloat("uMapTheme", 2.0);
  }
  if (scene.customData.skyboxMaterial) {
    scene.customData.skyboxMaterial.setFloat("uMapTheme", 2.0);
  }
}

export function cleanupMap2(scene) {
  if (scene.customData.mapMeshes) {
    scene.customData.mapMeshes.forEach(mesh => mesh.dispose());
    scene.customData.mapMeshes = [];
  }
  if (scene.customData.mapMaterials) {
    scene.customData.mapMaterials.forEach(mat => mat.dispose());
    scene.customData.mapMaterials = [];
  }
  if (scene.customData.mapObservers) {
    scene.customData.mapObservers.forEach(obs => scene.onBeforeRenderObservable.remove(obs));
    scene.customData.mapObservers = [];
  }
}
