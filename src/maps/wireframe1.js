export function loadWireframe1(scene, mapMeshes, mapObservers) {
  // 1. Specialized retro-glow materials
  const wireMat = new BABYLON.StandardMaterial("wireframeMat1", scene);
  wireMat.emissiveColor = new BABYLON.Color3(1.0, 0.35, 0.0); // Neon Outpost Orange
  wireMat.disableLighting = true;
  wireMat.wireframe = true;

  const coreMat = new BABYLON.StandardMaterial("volcanicCoreMat1", scene);
  coreMat.emissiveColor = new BABYLON.Color3(1.0, 0.15, 0.0); // Hot volcanic red core
  coreMat.disableLighting = true;

  const solidOrange = new BABYLON.StandardMaterial("solidOrange1", scene);
  solidOrange.emissiveColor = new BABYLON.Color3(1.0, 0.25, 0.0);
  solidOrange.disableLighting = true;

  const beaconMat = new BABYLON.StandardMaterial("beaconMat1", scene);
  beaconMat.emissiveColor = new BABYLON.Color3(1.0, 0.8, 0.0); // Bright gold beacon lights

  const laserMat = new BABYLON.StandardMaterial("laserMat1", scene);
  laserMat.emissiveColor = new BABYLON.Color3(1.0, 0.0, 0.0); // Dangerous glowing red tracking laser
  laserMat.disableLighting = true;

  // Trackers for micro-animations
  const rotatingElements = [];
  const pulsingElements = [];
  const trackingTurrets = [];
  const turbineRotors = [];

  // --- 1. DYNAMIC VEHICLE-TRACKING LASER TURRETS ---
  const turretPositions = [
    { x: -35, z: 25 },
    { x: 35, z: -40 }
  ];

  turretPositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("laserTurret" + idx, scene);
    parentNode.position.set(pos.x, 0, pos.z);

    // Tripod Base Scaffolding
    const base = BABYLON.MeshBuilder.CreateCylinder("turretBase" + idx, {
      tessellation: 3,
      height: 3.5,
      diameterTop: 0.4,
      diameterBottom: 2.2
    }, scene);
    base.position.y = 1.75;
    base.material = wireMat;
    base.parent = parentNode;
    mapMeshes.push(base);

    // Turret Head Node (holds barrels and swivels)
    const head = BABYLON.MeshBuilder.CreateSphere("turretHead" + idx, { segments: 6, diameter: 1.2 }, scene);
    head.position.y = 3.6;
    head.material = wireMat;
    head.parent = parentNode;
    mapMeshes.push(head);

    // Dual Gun Barrels
    const barrelL = BABYLON.MeshBuilder.CreateCylinder("barrelL" + idx, { tessellation: 4, height: 1.8, diameterTop: 0.12, diameterBottom: 0.12 }, scene);
    barrelL.position.set(-0.35, 0, 0.7);
    barrelL.rotation.x = Math.PI / 2; // points forward
    barrelL.material = wireMat;
    barrelL.parent = head;
    mapMeshes.push(barrelL);

    const barrelR = BABYLON.MeshBuilder.CreateCylinder("barrelR" + idx, { tessellation: 4, height: 1.8, diameterTop: 0.12, diameterBottom: 0.12 }, scene);
    barrelR.position.set(0.35, 0, 0.7);
    barrelR.rotation.x = Math.PI / 2;
    barrelR.material = wireMat;
    barrelR.parent = head;
    mapMeshes.push(barrelR);

    // Dynamic Target Tracking Laser Beam (a stretched cylinder)
    const laser = BABYLON.MeshBuilder.CreateCylinder("trackingLaser" + idx, { tessellation: 3, height: 1.0, diameterTop: 0.04, diameterBottom: 0.04 }, scene);
    laser.material = laserMat;
    laser.parent = head;
    mapMeshes.push(laser);

    trackingTurrets.push({
      headNode: head,
      laserBeam: laser,
      basePos: new BABYLON.Vector3(pos.x, 3.6, pos.z)
    });
  });

  // --- 2. OUTPOST ENERGY WIND TURBINES ---
  const turbinePositions = [
    { x: -50, z: -35, height: 16.0 },
    { x: 45, z: 45, height: 18.0 }
  ];

  turbinePositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("windTurbine" + idx, scene);
    parentNode.position.set(pos.x, 0, pos.z);

    // High support mast
    const mast = BABYLON.MeshBuilder.CreateCylinder("turbineMast" + idx, {
      tessellation: 4,
      height: pos.height,
      diameterTop: 0.3,
      diameterBottom: 1.5
    }, scene);
    mast.position.y = pos.height / 2;
    mast.material = wireMat;
    mast.parent = parentNode;
    mapMeshes.push(mast);

    // Generator Hub Pod
    const pod = BABYLON.MeshBuilder.CreateBox("turbinePod" + idx, { width: 1.0, height: 1.0, depth: 2.2 }, scene);
    pod.position.set(0, pos.height, 0.3);
    pod.material = wireMat;
    pod.parent = parentNode;
    mapMeshes.push(pod);

    // Three-Blade Rotor assembly node
    const rotorHub = new BABYLON.TransformNode("rotorHub" + idx, scene);
    rotorHub.position.set(0, pos.height, 1.5);
    rotorHub.parent = parentNode;

    // 3 Aerodynamic blades spaced at 120-degree intervals
    for (let b = 0; b < 3; b++) {
      const angle = (b * Math.PI * 2) / 3;
      const blade = BABYLON.MeshBuilder.CreateCylinder("blade" + idx + "_" + b, {
        tessellation: 3,
        height: 6.5,
        diameterTop: 0.05,
        diameterBottom: 0.4
      }, scene);
      blade.position.set(Math.cos(angle) * 3.25, Math.sin(angle) * 3.25, 0);
      blade.rotation.z = angle + Math.PI / 2;
      blade.material = wireMat;
      blade.parent = rotorHub;
      mapMeshes.push(blade);
    }

    turbineRotors.push({ node: rotorHub, baseSpeed: 1.0 + idx * 0.4 });
  });

  // --- 3. HIGH-TENSION TRANSMISSION TOWERS WITH SAG LINES ---
  const towerPositions = [
    { x: -20, z: 60, h: 11 },
    { x: 20, z: 60, h: 11 },
    { x: 60, z: -15, h: 11 }
  ];

  const towers = [];

  towerPositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("tensionTower" + idx, scene);
    parentNode.position.set(pos.x, 0, pos.z);

    // Main scaffold body
    const mast = BABYLON.MeshBuilder.CreateCylinder("towerMast" + idx, {
      tessellation: 4,
      subdivisions: 3,
      height: pos.h,
      diameterTop: 0.6,
      diameterBottom: 2.5
    }, scene);
    mast.position.y = pos.h / 2;
    mast.material = wireMat;
    mast.parent = parentNode;
    mapMeshes.push(mast);

    // Multi-level crossarms
    const cross1 = BABYLON.MeshBuilder.CreateBox("cross1_" + idx, { width: 5.5, height: 0.3, depth: 0.3 }, scene);
    cross1.position.y = pos.h - 2.5;
    cross1.material = wireMat;
    cross1.parent = parentNode;
    mapMeshes.push(cross1);

    const cross2 = BABYLON.MeshBuilder.CreateBox("cross2_" + idx, { width: 4.0, height: 0.3, depth: 0.3 }, scene);
    cross2.position.y = pos.h - 0.5;
    cross2.material = wireMat;
    cross2.parent = parentNode;
    mapMeshes.push(cross2);

    // Save attachment point heights in world coordinates
    towers.push({
      p1: new BABYLON.Vector3(pos.x - 2.75, pos.h - 2.5, pos.z),
      p2: new BABYLON.Vector3(pos.x + 2.75, pos.h - 2.5, pos.z),
      p3: new BABYLON.Vector3(pos.x - 2.0, pos.h - 0.5, pos.z),
      p4: new BABYLON.Vector3(pos.x + 2.0, pos.h - 0.5, pos.z)
    });
  });

  // Connect towers with sagging transmission line wireframes!
  if (towers.length >= 2) {
    for (let t = 0; t < towers.length - 1; t++) {
      const tA = towers[t];
      const tB = towers[t+1];

      // Draw two separate dangling power lines
      const sags = [
        { from: tA.p2, to: tB.p1 },
        { from: tA.p4, to: tB.p3 }
      ];

      sags.forEach((ends, sIdx) => {
        const points = [];
        const segments = 12;
        for (let s = 0; s <= segments; s++) {
          const ratio = s / segments;
          const x = BABYLON.Scalar.Lerp(ends.from.x, ends.to.x, ratio);
          const z = BABYLON.Scalar.Lerp(ends.from.z, ends.to.z, ratio);
          // Catenary sag approximation using a quadratic offset curve
          const y = BABYLON.Scalar.Lerp(ends.from.y, ends.to.y, ratio) - Math.sin(ratio * Math.PI) * 2.2;
          points.push(new BABYLON.Vector3(x, y, z));
        }

        const sagLine = BABYLON.MeshBuilder.CreateLines("sagLine_" + t + "_" + sIdx, { points: points }, scene);
        sagLine.color = new BABYLON.Color3(1.0, 0.35, 0.0);
        mapMeshes.push(sagLine);
      });
    }
  }

  // --- 4. GLOWING ENERGY EXTRACTION CORES ---
  const corePositions = [
    { x: 0, z: -60, h: 7 }
  ];

  corePositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("extractionDerrick" + idx, scene);
    parentNode.position.set(pos.x, 0, pos.z);

    const frame = BABYLON.MeshBuilder.CreateCylinder("derrickFrame" + idx, {
      tessellation: 4,
      subdivisions: 2,
      height: pos.h,
      diameterTop: 0.8,
      diameterBottom: 3.5
    }, scene);
    frame.position.y = pos.h / 2;
    frame.material = wireMat;
    frame.parent = parentNode;
    mapMeshes.push(frame);

    const core = BABYLON.MeshBuilder.CreateCylinder("derrickCore" + idx, {
      tessellation: 6,
      height: pos.h - 1.5,
      diameterTop: 0.5,
      diameterBottom: 0.5
    }, scene);
    core.position.y = pos.h / 2;
    core.material = coreMat;
    core.parent = parentNode;
    mapMeshes.push(core);

    pulsingElements.push({ mesh: core, baseScale: new BABYLON.Vector3(1, 1, 1), phase: idx });
  });

  // 2. Register real-time tracking and rotation observer
  const obs = scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001;

    // A. Track player's vehicle dynamically!
    let activeVehicle = null;
    const meshes = scene.meshes;
    for (let i = 0; i < meshes.length; i++) {
      if ((meshes[i].name === "carBox" || meshes[i].name === "truckBox") && meshes[i].isEnabled()) {
        activeVehicle = meshes[i];
        break;
      }
    }

    trackingTurrets.forEach(turret => {
      if (activeVehicle) {
        // Calculate vector from turret muzzle to target
        const targetPos = activeVehicle.position.clone();
        // Target target center height instead of chassis bottom
        targetPos.y += 0.5;

        const direction = targetPos.subtract(turret.basePos);
        
        // Compute 3D yaw and pitch to lock-on to the vehicle
        const yaw = Math.atan2(direction.x, direction.z);
        const horizDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const pitch = -Math.atan2(direction.y, horizDist);

        // Smoothly interpolate rotations to create heavy mechanical tracking friction
        turret.headNode.rotation.y = BABYLON.Scalar.LerpAngle(turret.headNode.rotation.y, yaw, 0.05);
        turret.headNode.rotation.x = BABYLON.Scalar.LerpAngle(turret.headNode.rotation.x, pitch, 0.05);

        // Stretch and align targeting laser pointer
        const dist = direction.length();
        // Since cylinder sits locally along vertical axis, scale Y as length
        turret.laserBeam.scaling.y = dist;
        // Position cylinder exactly halfway between turret center and player target
        turret.laserBeam.position.set(0, 0, dist / 2);
        // Slowly pulse tracking laser intensity
        laserMat.emissiveColor.set(1.0, 0.1 + Math.sin(time * 8.0) * 0.1, 0.1);
      }
    });

    // B. Spin energy wind turbines
    turbineRotors.forEach(r => {
      const gust = 1.0 + Math.sin(time * 0.5) * 0.25; // simulate variable winds
      r.node.rotation.z += r.baseSpeed * gust * 0.012;
    });

    // C. Pulse core extraction nodes
    pulsingElements.forEach(p => {
      const pulse = 0.88 + Math.sin(time * 4.5 + p.phase) * 0.12;
      p.mesh.scaling.set(pulse, 1.0 + Math.sin(time * 2.5 + p.phase) * 0.15, pulse);
    });
  });

  mapObservers.push(obs);
}
