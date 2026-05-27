import { createCar } from '../garage/car1.js';

const tokyoGroundImg = new URL('../../assets/images/tokyo_ground.png', import.meta.url).href;

export function loadRace1(scene) {
  // Clear any existing map meshes
  if (!scene.customData.mapMeshes) {
    scene.customData.mapMeshes = [];
  }
  if (!scene.customData.mapObservers) {
    scene.customData.mapObservers = [];
  }

  // 1. Configure environmental sky colors (Midnight Obsidian Emerald)
  scene.clearColor = new BABYLON.Color4(0.0, 0.02, 0.01, 1.0);

  // 2. Setup Neon Cyber racing materials
  const greenWireMat = new BABYLON.StandardMaterial("greenWireMat", scene);
  greenWireMat.emissiveColor = new BABYLON.Color3(0.0, 1.0, 0.45); // Electric Neon Green
  greenWireMat.disableLighting = true;
  greenWireMat.wireframe = false; // solid tubes for borders

  const goldWireMat = new BABYLON.StandardMaterial("goldWireMat", scene);
  goldWireMat.emissiveColor = new BABYLON.Color3(1.0, 0.75, 0.0); // Neon Gold
  goldWireMat.disableLighting = true;
  goldWireMat.wireframe = true;

  const frameMat = new BABYLON.StandardMaterial("raceFrameMat", scene);
  frameMat.diffuseColor = new BABYLON.Color3(0.05, 0.1, 0.08);
  frameMat.specularColor = new BABYLON.Color3(0.4, 0.8, 0.5);

  const checkpointMat = new BABYLON.StandardMaterial("raceCheckpointMat", scene);
  checkpointMat.emissiveColor = new BABYLON.Color3(1.0, 0.15, 0.0); // Starts red
  checkpointMat.disableLighting = true;

  // 3. Procedurally generate the winding loop racing circuit path
  const trackPoints = [
    new BABYLON.Vector3(0, 0.05, 45),
    new BABYLON.Vector3(35, 0.05, 35),
    new BABYLON.Vector3(65, 0.05, -10),
    new BABYLON.Vector3(40, 0.05, -55),
    new BABYLON.Vector3(0, 0.05, -68),
    new BABYLON.Vector3(-45, 0.05, -55),
    new BABYLON.Vector3(-65, 0.05, -10),
    new BABYLON.Vector3(-35, 0.05, 35)
  ];

  const catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(trackPoints, 24, true);
  const path = catmullRom.getPoints();

  const leftPath = [];
  const rightPath = [];
  const trackWidth = 8.5;

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const pNext = path[(i + 1) % path.length];
    const tangent = pNext.subtract(p).normalize();
    const normal = new BABYLON.Vector3(-tangent.z, 0, tangent.x);

    leftPath.push(p.add(normal.scale(-trackWidth / 2)));
    rightPath.push(p.add(normal.scale(trackWidth / 2)));
  }

  // Draw smooth solid racetrack ribbon pavement
  const trackRibbon = BABYLON.MeshBuilder.CreateRibbon("trackRibbon", { 
    pathArray: [leftPath, rightPath], 
    closeArray: true 
  }, scene);

  const trackTex = new BABYLON.Texture(tokyoGroundImg, scene);
  trackTex.uScale = 1.0;
  trackTex.vScale = 30.0; // repeat along track loop length
  
  const trackMat = new BABYLON.StandardMaterial("trackMat", scene);
  trackMat.diffuseTexture = trackTex;
  trackMat.emissiveTexture = trackTex;
  trackMat.emissiveColor = new BABYLON.Color3(0.12, 0.82, 0.38); // brilliant glowing electric emerald!
  trackMat.disableLighting = true; // fully self-lit, no shadow darkness!
  trackMat.alpha = 0.96;
  trackMat.backFaceCulling = false;
  trackRibbon.material = trackMat;
  scene.customData.mapMeshes.push(trackRibbon);

  // Draw glowing laser boundaries along both borders of the track
  const leftEdgeTube = BABYLON.MeshBuilder.CreateTube("leftEdgeTube", { 
    path: leftPath, 
    radius: 0.12, 
    tessellation: 6, 
    cap: BABYLON.Mesh.NO_CAP 
  }, scene);
  leftEdgeTube.material = greenWireMat;
  scene.customData.mapMeshes.push(leftEdgeTube);

  const rightEdgeTube = BABYLON.MeshBuilder.CreateTube("rightEdgeTube", { 
    path: rightPath, 
    radius: 0.12, 
    tessellation: 6, 
    cap: BABYLON.Mesh.NO_CAP 
  }, scene);
  rightEdgeTube.material = greenWireMat;
  scene.customData.mapMeshes.push(rightEdgeTube);

  // 4. Create 4 huge glowing neon checkpoint arches aligned perfectly perpendicular to the track spline
  const archIndices = [
    0,
    Math.floor(path.length * 0.25),
    Math.floor(path.length * 0.50),
    Math.floor(path.length * 0.75)
  ];

  archIndices.forEach((pathIdx, idx) => {
    const pos = path[pathIdx];
    const nextPos = path[(pathIdx + 1) % path.length];
    const tangent = nextPos.subtract(pos).normalize();
    const angle = Math.atan2(tangent.x, tangent.z);

    const archContainer = new BABYLON.TransformNode("archContainer" + idx, scene);
    archContainer.position.copyFrom(pos);
    archContainer.rotation.y = angle; // align perfectly perpendicular across the road!

    // Left support pylon
    const leftPost = BABYLON.MeshBuilder.CreateBox("leftPost" + idx, { width: 0.4, height: 4.0, depth: 0.4 }, scene);
    leftPost.position.set(-trackWidth / 2 - 0.25, 2.0, 0);
    leftPost.material = frameMat;
    leftPost.parent = archContainer;

    // Right support pylon
    const rightPost = BABYLON.MeshBuilder.CreateBox("rightPost" + idx, { width: 0.4, height: 4.0, depth: 0.4 }, scene);
    rightPost.position.set(trackWidth / 2 + 0.25, 2.0, 0);
    rightPost.material = frameMat;
    rightPost.parent = archContainer;

    // Glowing top neon banner
    const topLintel = BABYLON.MeshBuilder.CreateBox("topLintel" + idx, { width: trackWidth + 1.2, height: 0.6, depth: 0.8 }, scene);
    topLintel.position.set(0, 4.0, 0);
    topLintel.material = checkpointMat;
    topLintel.parent = archContainer;

    scene.customData.mapMeshes.push(leftPost, rightPost, topLintel);
  });

  // 5. Generate decorative stadium floating searchlight pylons
  const pylons = [];
  for (let i = 0; i < 25; i++) {
    const height = 12.0 + Math.random() * 8.0;
    const baseWidth = 1.2;
    const pylon = BABYLON.MeshBuilder.CreateCylinder("pylon" + i, {
      tessellation: 12,
      height: height,
      diameterTop: 0.2,
      diameterBottom: baseWidth
    }, scene);

    const angle = Math.random() * Math.PI * 2;
    const distance = 35.0 + Math.random() * 70.0;
    pylon.position.set(Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance);
    pylon.material = (i % 2 === 0) ? greenWireMat : goldWireMat;

    scene.customData.mapMeshes.push(pylon);
    pylons.push(pylon);
  }

  // 6. Spawn gorgeous raymarched cyber-opponent NPC supercar (a beautiful carbon-gold variant of your actual car!)
  const npcContainer = new BABYLON.TransformNode("npcContainer", scene);
  
  const { carBox: npcCar, carMaterial: npcCarMaterial } = createCar(scene, new BABYLON.Vector3(0, 0, 0));
  npcCar.rotation.y = -Math.PI / 2; // align local X mesh orientation to Z
  npcCar.parent = npcContainer;

  // Activate the Gold/Orange Cyber stealth livery on the NPC!
  if (npcCarMaterial && typeof npcCarMaterial.setFloat === 'function') {
    npcCarMaterial.setFloat("uCarRedAce", 2.0);
  }

  scene.customData.mapMeshes.push(npcCar);

  // 7. Register a live render observable to animate searchlights and drive the NPC
  let npcProgress = 6.0; // spawn slightly ahead of player on starting grid
  const npcBaseSpeed = 15.5; // units per second

  const animObserver = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() * 0.001;
    if (dt <= 0.0 || dt > 0.1) return; // ignore frame glitches
    
    const t = Date.now() * 0.001;
    
    // Rotate pylons
    pylons.forEach((p, idx) => {
      p.rotation.y += 0.01 * (idx % 2 === 0 ? 1 : -1);
      p.rotation.x = Math.sin(t * 1.2 + idx) * 0.08;
    });

    // Drive NPC along track path
    if (path.length > 0) {
      // Dynamic rubber-banding speed adjustment
      const playerPos = scene.customData.carBox ? scene.customData.carBox.position : null;
      let targetSpeed = npcBaseSpeed;
      
      if (playerPos) {
        const dist = BABYLON.Vector3.Distance(npcContainer.position, playerPos);
        const playerSpeed = scene.customData.carPhysics ? Math.abs(scene.customData.carPhysics.velocity) : 15.0;
        
        // Find player's closest spline path index
        let playerIdx = 0;
        let minD = 1e9;
        for (let i = 0; i < path.length; i++) {
          let dSq = BABYLON.Vector3.DistanceSquared(playerPos, path[i]);
          if (dSq < minD) {
            minD = dSq;
            playerIdx = i;
          }
        }
        
        // Compare progression index to see who is ahead in loop direction
        const npcIdx = Math.floor(npcProgress) % path.length;
        const diff = (playerIdx - npcIdx + path.length) % path.length;
        const npcAhead = (diff >= path.length / 2);

        // Scale NPC speed based on player distance and relative lead
        if (dist > 18.0) {
          if (npcAhead) {
            targetSpeed = playerSpeed * 0.82; // slow down slightly to keep race tight
          } else {
            targetSpeed = Math.max(npcBaseSpeed * 1.35, playerSpeed * 1.15); // catch up!
          }
        }
      }

      npcProgress = (npcProgress + (targetSpeed / 1.93) * dt) % path.length;
      const index = Math.floor(npcProgress) % path.length;
      const nextIndex = (index + 1) % path.length;
      const fract = npcProgress % 1.0;

      const pos = BABYLON.Vector3.Lerp(path[index], path[nextIndex], fract);
      npcContainer.position.copyFrom(pos);
      npcContainer.position.y = 0.38; // float exactly above ribbon pavement
      
      const dir = path[nextIndex].subtract(path[index]).normalize();
      npcContainer.lookAt(pos.add(dir));
      
      // Update custom time, wheel spin, and lighting uniforms on the NPC material
      if (npcCarMaterial && typeof npcCarMaterial.setFloat === 'function') {
        npcCarMaterial.setFloat("time", t);
        npcCarMaterial.setFloat("uWheelRotation", t * 15.0); // spin wheels continuously
        npcCarMaterial.setFloat("uSteeringAngle", 0.0);

        // Fetch cached lighting/environment uniforms safely from customData
        const dn = scene.customData.dayNightVal;
        npcCarMaterial.setFloat("uDayNight", typeof dn === 'number' ? dn : 0.0);

        const ld = scene.customData.lightDir;
        if (ld) {
          npcCarMaterial.setVector3("uLightDir", ld);
        }
      }
    }
  });

  scene.customData.mapObservers.push(animObserver);
  scene.customData.mapMaterials = [greenWireMat, goldWireMat, frameMat, checkpointMat, trackMat, npcCarMaterial];

  // Configure custom grid and skybox theme colors for uMapTheme = 4.0
  if (scene.customData.groundMaterial) {
    scene.customData.groundMaterial.setFloat("uMapTheme", 4.0);
  }
  if (scene.customData.skyboxMaterial) {
    scene.customData.skyboxMaterial.setFloat("uMapTheme", 4.0);
  }
}

export function cleanupRace1(scene) {
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
