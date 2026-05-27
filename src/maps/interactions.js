import { showToast } from '../ui.js';
import { carPhysics } from '../physics.js';

/**
 * Initializes all active interactive meshes and trackers for the specified map environment
 */
export function initMapInteractions(scene, mapId) {
  // Cleanup any active interactions first
  cleanupInteractions(scene);
  
  const state = {
    mapId: mapId,
    boostPads: [],
    hazards: [],
    checkpoints: [],
    passedCheckpoints: [false, false, false, false],
    wormhole: null,
    screenFlash: 0.0,
    boostTimer: 0.0
  };
  scene.customData.interactionsState = state;
  
  if (mapId === "map1") {
    // 1. Spawning 3 glowing Neon Cyan Boost Pads
    const boostPos = [
      new BABYLON.Vector3(15, 0.02, 20),
      new BABYLON.Vector3(-30, 0.02, -35),
      new BABYLON.Vector3(40, 0.02, 45)
    ];
    
    const boostMat = new BABYLON.StandardMaterial("boostPadMat", scene);
    boostMat.emissiveColor = new BABYLON.Color3(0.0, 0.8, 1.0); // Neon Cyan
    boostMat.disableLighting = true;
    
    boostPos.forEach((pos, idx) => {
      const pad = BABYLON.MeshBuilder.CreateBox("boostPad_" + idx, { width: 3.5, height: 0.04, depth: 4.5 }, scene);
      pad.position.copyFrom(pos);
      pad.material = boostMat;
      state.boostPads.push(pad);
      scene.customData.mapMeshes.push(pad);
    });
    
    // 2. Spawning 2 glowing Hazard Wireframe barricades
    const hazardPos = [
      new BABYLON.Vector3(5, 0.5, 35),
      new BABYLON.Vector3(-20, 0.5, 15)
    ];
    
    const hazardMat = new BABYLON.StandardMaterial("hazardMat", scene);
    hazardMat.emissiveColor = new BABYLON.Color3(1.0, 0.1, 0.0); // Warning Red
    hazardMat.wireframe = true;
    hazardMat.disableLighting = true;
    
    hazardPos.forEach((pos, idx) => {
      const barricade = BABYLON.MeshBuilder.CreateBox("hazard_" + idx, { width: 4.5, height: 1.0, depth: 0.6 }, scene);
      barricade.position.copyFrom(pos);
      barricade.material = hazardMat;
      state.hazards.push(barricade);
      scene.customData.mapMeshes.push(barricade);
    });
    
  } else if (mapId === "map2") {
    // Checkpoint gate vectors in Tokyo grid
    state.checkpoints = [
      new BABYLON.Vector3(0, 0, 20),
      new BABYLON.Vector3(45, 0, -10),
      new BABYLON.Vector3(-40, 0, -45),
      new BABYLON.Vector3(-25, 0, 35)
    ];
    
  } else if (mapId === "map3") {
    // Spawning a massive rotating space wormhole portal at center (0, 1.2, -25)
    const portalCenter = new BABYLON.Vector3(0, 1.2, -25);
    
    const portalContainer = new BABYLON.TransformNode("portalContainer", scene);
    portalContainer.position.copyFrom(portalCenter);
    
    const outerRingMat = new BABYLON.StandardMaterial("outerRingMat", scene);
    outerRingMat.emissiveColor = new BABYLON.Color3(0.65, 0.0, 0.9); // Deep space purple
    outerRingMat.wireframe = true;
    outerRingMat.disableLighting = true;
    
    const outerRing = BABYLON.MeshBuilder.CreateCylinder("outerRing", {
      tessellation: 12,
      height: 0.5,
      diameterTop: 6.0,
      diameterBottom: 6.0
    }, scene);
    outerRing.rotation.x = Math.PI / 2; // Orient forward
    outerRing.material = outerRingMat;
    outerRing.parent = portalContainer;
    
    const innerCoreMat = new BABYLON.StandardMaterial("innerCoreMat", scene);
    innerCoreMat.emissiveColor = new BABYLON.Color3(1.0, 0.8, 0.0); // Liquid gold core
    innerCoreMat.wireframe = true;
    innerCoreMat.disableLighting = true;
    
    const innerCore = BABYLON.MeshBuilder.CreateSphere("innerCore", { segments: 6, diameter: 2.2 }, scene);
    innerCore.material = innerCoreMat;
    innerCore.parent = portalContainer;
    
    state.wormhole = {
      container: portalContainer,
      outerRing: outerRing,
      innerCore: innerCore,
      position: portalCenter
    };
    
    scene.customData.mapMeshes.push(outerRing, innerCore);
  } else if (mapId === "race1") {
    // Generate the exact same spline curve coordinates
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

    // 1. Spawning 4 glowing Neon Green Boost Pads exactly along the track center
    const boostIndices = [
      Math.floor(path.length * 0.125),
      Math.floor(path.length * 0.375),
      Math.floor(path.length * 0.625),
      Math.floor(path.length * 0.875)
    ];

    const boostMat = new BABYLON.StandardMaterial("boostPadMatRace", scene);
    boostMat.emissiveColor = new BABYLON.Color3(0.0, 1.0, 0.45); // Neon Green
    boostMat.disableLighting = true;

    boostIndices.forEach((pathIdx, idx) => {
      const pos = path[pathIdx];
      const nextPos = path[(pathIdx + 1) % path.length];
      const tangent = nextPos.subtract(pos).normalize();
      const angle = Math.atan2(tangent.x, tangent.z);

      const pad = BABYLON.MeshBuilder.CreateBox("boostPad_" + idx, { width: 4.5, height: 0.04, depth: 3.5 }, scene);
      pad.position.copyFrom(pos);
      pad.position.y = 0.06; // sit slightly above ribbon pavement
      pad.rotation.y = angle;
      pad.material = boostMat;
      state.boostPads.push(pad);
      scene.customData.mapMeshes.push(pad);
    });

    // 2. Setup the 4 checkpoint detection triggers matching visual gates
    const archIndices = [
      0,
      Math.floor(path.length * 0.25),
      Math.floor(path.length * 0.50),
      Math.floor(path.length * 0.75)
    ];

    state.checkpoints = archIndices.map(pathIdx => path[pathIdx]);
  }

  // ───── 🪙 procedurally Spawn golden spinning coins ─────
  state.coins = [];
  const coinMat = new BABYLON.StandardMaterial("coinMat", scene);
  coinMat.emissiveColor = new BABYLON.Color3(1.0, 0.82, 0.0); // Gold glow
  coinMat.disableLighting = true;

  const coinPositions = [];
  if (mapId === "race1") {
    // Spawn 15 coins evenly distributed along the Catmull-Rom spline track path
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
    const trackPath = catmullRom.getPoints();

    for (let i = 0; i < 15; i++) {
      const stepIdx = Math.floor((trackPath.length / 15) * i) % trackPath.length;
      const pos = trackPath[stepIdx].clone();
      pos.y = 0.45; // float slightly above pavement
      coinPositions.push(pos);
    }
  } else {
    // Scatter 15 coins randomly centered on free-drive grids (Tokyo/Outpost/Nebula)
    for (let i = 0; i < 15; i++) {
      const rx = (Math.random() - 0.5) * 110;
      const rz = (Math.random() - 0.5) * 110;
      coinPositions.push(new BABYLON.Vector3(rx, 0.45, rz));
    }
  }

  // Create Babylon cylinder thin cylinders to represent flat coins
  coinPositions.forEach((pos, idx) => {
    const coin = BABYLON.MeshBuilder.CreateCylinder("coin_" + idx, { height: 0.05, diameter: 0.75 }, scene);
    coin.position.copyFrom(pos);
    coin.rotation.x = Math.PI / 2; // vertical disc
    coin.material = coinMat;
    state.coins.push(coin);
    scene.customData.mapMeshes.push(coin); // autosweeps during switchMap
  });
}

/**
 * Checks for player interactions and ticks dynamic visual overlays / boosts
 */
export function updateMapInteractions(scene, dt, timeElapsed) {
  const state = scene.customData.interactionsState;
  if (!state) return;
  
  const carBox = scene.customData.carBox;
  if (!carBox) return;
  
  const carPos = carBox.position;
  
  // --- 1. HANDLE SCREEN FLASH DECAY ---
  if (state.screenFlash > 0.01) {
    state.screenFlash -= dt * 2.0; // Fade quickly
    const flashColor = new BABYLON.Color4(1.0, 0.15, 0.8, 1.0); // Vibrant Pink Flash
    scene.clearColor = BABYLON.Color4.Lerp(scene.clearColor, flashColor, state.screenFlash);
  }
  
  // --- 2. BOOST DECAY CONTROLLER ---
  if (state.boostTimer > 0.01) {
    state.boostTimer -= dt;
    if (state.boostTimer <= 0.01) {
      // Revert tail drift smoke color scheme back to theme defaults
      const p = scene.customData.driftParticles;
      if (p) {
        p.color1 = new BABYLON.Color4(1.0, 0.35, 0.0, 0.4);
        p.color2 = new BABYLON.Color4(1.0, 0.15, 0.0, 0.15);
      }
    }
  }
  
  if (state.mapId === "map1" || state.mapId === "race1") {
    // A. TEST BOOST PAD TRIGGER
    state.boostPads.forEach((pad, idx) => {
      const dist = BABYLON.Vector3.Distance(carPos, pad.position);
      if (dist < 2.2 && state.boostTimer <= 0.01) {
        carPhysics.velocity = carPhysics.maxSpeed * 1.62; // Hyper drive thrust force
        state.boostTimer = 2.0; // Speed duration seconds
        showToast("🚀 BOOST SECTOR ENGAGED! +160% THRUST", "boost");
        
        // Morph tire smoke particles to brilliant neon blue/green!
        const p = scene.customData.driftParticles;
        if (p) {
          if (state.mapId === "race1") {
            p.color1 = new BABYLON.Color4(0.0, 1.0, 0.45, 0.85); // Neon green boost smoke
            p.color2 = new BABYLON.Color4(0.0, 0.5, 0.2, 0.4);
          } else {
            p.color1 = new BABYLON.Color4(0.0, 0.85, 1.0, 0.85);
            p.color2 = new BABYLON.Color4(0.0, 0.45, 1.0, 0.4);
          }
          p.emitRate = 220;
        }
      }
    });
    
    // B. TEST HAZARD BARRICADES COLLISION (Only on map1)
    if (state.mapId === "map1") {
      state.hazards.forEach((haz, idx) => {
        const dist = BABYLON.Vector3.Distance(carPos, haz.position);
        if (dist < 2.0) {
          // Reverse vector bounceback recoil
          carPhysics.velocity = -carPhysics.velocity * 0.45;
          carPhysics.heading += 0.4 * (Math.random() > 0.5 ? 1.0 : -1.0);
          
          // Displacement nudge to prevent intersection traps
          const pushDirection = carPos.subtract(haz.position).normalize().scale(0.85);
          carPhysics.position.addInPlace(pushDirection);
          
          state.screenFlash = 0.55; // Screen pulse
          showToast("⚠️ STRUCTURAL COLLISION! CHASSIS RECOIL", "hazard");
        }
      });
    }
    
  } else if (state.mapId === "map2" || state.mapId === "race1") {
    // A. TEST ARCH CHECKPOINT ENCOUNTERS
    state.checkpoints.forEach((pos, idx) => {
      if (state.passedCheckpoints[idx]) return;
      
      const dist = BABYLON.Vector3.Distance(carPos, pos);
      if (dist < 3.2) {
        state.passedCheckpoints[idx] = true;
        
        // Visually toggle active gate neon colors to cyber cyan/green
        const lintel = scene.getMeshByName("topLintel" + idx);
        if (lintel) {
          const activeMat = new BABYLON.StandardMaterial("activeLintelMat_" + idx, scene);
          activeMat.emissiveColor = state.mapId === "race1" ? new BABYLON.Color3(0.0, 1.0, 0.45) : new BABYLON.Color3(0.0, 0.85, 1.0);
          activeMat.disableLighting = true;
          lintel.material = activeMat;
          state.checkpoints[idx] = activeMat; // Track for disposal
        }
        
        const passedCount = state.passedCheckpoints.filter(Boolean).length;
        if (passedCount === 4) {
          showToast(state.mapId === "race1" ? "🏆 RACE 1 COMPLETE! SYSTEM OVERCLOCKED" : "🏆 GRID RUN COMPLETE! SYSTEM CALIBRATED", "success");
          state.screenFlash = 0.5;
        } else {
          showToast(`✨ CHECKPOINT ${passedCount}/4 COMPLETED!`, "success");
        }
      }
    });
    
  } else if (state.mapId === "map3" && state.wormhole) {
    // A. SPIN WORMHOLE RINGS CONTROLLER
    state.wormhole.outerRing.rotation.y += 0.025;
    state.wormhole.innerCore.rotation.z += 0.04;
    
    // B. TEST HYPER-WORMHOLE FLUX WARP
    const dist = BABYLON.Vector3.Distance(carPos, state.wormhole.position);
    if (dist < 2.5) {
      // Warp to a randomized coordinate coordinate offset
      const warpX = (Math.random() > 0.5 ? 1.0 : -1.0) * (20.0 + Math.random() * 30.0);
      const warpZ = (Math.random() > 0.5 ? 1.0 : -1.0) * (20.0 + Math.random() * 30.0);
      
      carPhysics.position.set(warpX, carPhysics.position.y, warpZ);
      carPhysics.velocity *= 0.35; // decelerate slightly on warp
      
      state.screenFlash = 0.9; // Massive violet warp flash
      showToast("🌀 WARP DRIVE DETECTED: HYPER-SPACE DISPLACEMENT", "warp");
    }
  }

  // --- 3. SPIN AND PICK UP COLLISION COINS ---
  if (state.coins) {
    state.coins.forEach((coin, idx) => {
      if (coin.isCollected) return;

      // Spin the gold coin around its local vertical axis
      coin.rotation.y += dt * 3.2;

      // Float up and down slightly using a smooth sine wave
      const floatOffset = Math.sin(timeElapsed * 4.5 + idx * 0.55) * 0.08;
      coin.position.y = 0.45 + floatOffset;

      // Measure distance to player car position
      const dist = BABYLON.Vector3.Distance(carPos, coin.position);
      if (dist < 1.7) {
        coin.isCollected = true;
        coin.setEnabled(false); // Make invisible and inactive

        // Award 10 coins through global helper
        if (window.addCoins) {
          window.addCoins(10);
        }
      }
    });
  }
}

/**
 * Safely disposes all active interactive materials, assemblies, and resources
 */
export function cleanupInteractions(scene) {
  if (scene.customData && scene.customData.interactionsState) {
    const state = scene.customData.interactionsState;
    if (state.checkpoints) {
      state.checkpoints.forEach(ref => {
        if (ref instanceof BABYLON.StandardMaterial) {
          ref.dispose();
        }
      });
    }
    if (state.wormhole && state.wormhole.container) {
      state.wormhole.container.dispose();
    }
    scene.customData.interactionsState = null;
  }
}
