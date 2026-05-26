import { loadWireframe3 } from './wireframe3.js';

export function loadMap3(scene) {
  // Clear any existing map meshes
  if (!scene.customData.mapMeshes) {
    scene.customData.mapMeshes = [];
  }
  if (!scene.customData.mapObservers) {
    scene.customData.mapObservers = [];
  }

  // 1. Configure environmental sky colors (Space Indigo/Violet Void)
  scene.clearColor = new BABYLON.Color4(0.012, 0.004, 0.03, 1.0);

  // 2. Setup Glowing geometric crystal materials (faceted space glass)
  const crystalMat = new BABYLON.StandardMaterial("spaceCrystalMat", scene);
  crystalMat.diffuseColor = new BABYLON.Color3(0.1, 0.0, 0.25);
  crystalMat.emissiveColor = new BABYLON.Color3(0.65, 0.0, 0.9);
  crystalMat.specularColor = new BABYLON.Color3(0.8, 0.3, 1.0);
  crystalMat.disableLighting = false; // allow specular shine highlights from sun
  crystalMat.wireframe = true;

  const goldShardMat = new BABYLON.StandardMaterial("goldShardMat", scene);
  goldShardMat.diffuseColor = new BABYLON.Color3(0.2, 0.15, 0.0);
  goldShardMat.emissiveColor = new BABYLON.Color3(0.9, 0.5, 0.0);
  goldShardMat.specularColor = new BABYLON.Color3(1.0, 0.8, 0.2);
  goldShardMat.wireframe = false;
  // Make low-poly faces stand out elegantly
  goldShardMat.flatShading = true;

  // 3. Generate 40 floating space crystals with custom shapes
  const crystals = [];
  for (let i = 0; i < 40; i++) {
    const isGold = (i % 3 === 0);
    const radius = 0.6 + Math.random() * 1.6;
    
    let crystal;
    if (isGold) {
      // Hexagonal low-poly faceted sphere for asteroid shapes
      crystal = BABYLON.MeshBuilder.CreateIcoSphere("shard" + i, {
        subdivisions: 1,
        radius: radius
      }, scene);
      crystal.material = goldShardMat;
    } else {
      // Faceted crystals
      crystal = BABYLON.MeshBuilder.CreateIcoSphere("crystal" + i, {
        subdivisions: 1,
        radius: radius
      }, scene);
      crystal.material = crystalMat;
    }

    // Position floating at varied heights inside background boundaries
    const angle = Math.random() * Math.PI * 2;
    const distance = 25.0 + Math.random() * 80.0;
    const height = 1.0 + Math.random() * 8.0;
    
    crystal.position.set(Math.cos(angle) * distance, height, Math.sin(angle) * distance);
    crystals.push(crystal);
    
    scene.customData.mapMeshes.push(crystal);
  }

  // 4. Register a live render observable to animate floating hover waves and slow spin rotations
  const animObserver = scene.onBeforeRenderObservable.add(() => {
    const t = Date.now() * 0.001;
    crystals.forEach((c, idx) => {
      // Rotation spin over two axes
      c.rotation.y += 0.008 * (idx % 2 === 0 ? 1 : -1);
      c.rotation.x += 0.005 * (idx % 3 === 0 ? 1 : -1);
      
      // Floating hover wave oscillation
      c.position.y += Math.sin(t * 1.5 + idx) * 0.004;
    });
  });

  scene.customData.mapObservers.push(animObserver);

  // 5. Load detailed space gates and anomalies
  loadWireframe3(scene, scene.customData.mapMeshes, scene.customData.mapObservers);

  scene.customData.mapMaterials = [crystalMat, goldShardMat];

  // Configure custom grid and skybox theme colors
  if (scene.customData.groundMaterial) {
    scene.customData.groundMaterial.setFloat("uMapTheme", 3.0);
  }
  if (scene.customData.skyboxMaterial) {
    scene.customData.skyboxMaterial.setFloat("uMapTheme", 3.0);
  }
}

export function cleanupMap3(scene) {
  if (scene.customData.mapMeshes) {
    scene.customData.mapMeshes.forEach(mesh => mesh.dispose());
    scene.customData.mapMeshes = [];
  }
  if (scene.customData.mapMaterials) {
    scene.customData.mapMaterials.forEach(mat => mat.dispose());
    scene.customData.mapMaterials = [];
  }
  if (scene.customData.mapObservers) {
    scene.customData.mapObservers.forEach(obs => {
      scene.onBeforeRenderObservable.remove(obs);
    });
    scene.customData.mapObservers = [];
  }
}
