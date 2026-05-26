export function loadWireframe3(scene, mapMeshes, mapObservers) {
  // 1. Setup Cosmic glowing materials
  const goldMat = new BABYLON.StandardMaterial("wireMatGold3", scene);
  goldMat.emissiveColor = new BABYLON.Color3(1.0, 0.72, 0.05); // Shimmering Gold
  goldMat.disableLighting = true;
  goldMat.wireframe = true;

  const magentaMat = new BABYLON.StandardMaterial("wireMatMag3", scene);
  magentaMat.emissiveColor = new BABYLON.Color3(1.0, 0.05, 0.95); // Deep Magenta-Pink
  magentaMat.disableLighting = true;
  magentaMat.wireframe = true;

  const plasmaMat = new BABYLON.StandardMaterial("plasmaCoreMat3", scene);
  plasmaMat.emissiveColor = new BABYLON.Color3(1.0, 0.35, 0.85); // Soft Violet-Hot Emissive Core
  plasmaMat.disableLighting = true;

  const beamMat = new BABYLON.StandardMaterial("beamMat3", scene);
  beamMat.emissiveColor = new BABYLON.Color3(0.5, 0.0, 1.0); // Translucent purple energy harvester ray
  beamMat.alpha = 0.45;
  beamMat.disableLighting = true;

  // Trackers for animations
  const rotatingRings = [];
  const pulsingCores = [];
  const tesseracts = [];
  const miningLasers = [];

  // --- 1. GIGANTIC NESTED GYROSCOPIC STAR GATES ---
  const gatePositions = [
    { x: 0, y: 15, z: 80, size: 10.0 }, // Main gate looming straight ahead
    { x: -70, y: 12, z: -40, size: 8.0 }
  ];

  gatePositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("starGate" + idx, scene);
    parentNode.position.set(pos.x, pos.y, pos.z);

    // Ring 1 (Outer, Gold, spin on Y)
    const ringOut = BABYLON.MeshBuilder.CreateCylinder("ringOut" + idx, {
      tessellation: 16,
      height: 0.4,
      diameterTop: pos.size * 2,
      diameterBottom: pos.size * 2
    }, scene);
    ringOut.rotation.x = Math.PI / 2;
    ringOut.material = goldMat;
    ringOut.parent = parentNode;
    mapMeshes.push(ringOut);

    // Ring 2 (Middle, Magenta, spin on X)
    const ringMid = BABYLON.MeshBuilder.CreateCylinder("ringMid" + idx, {
      tessellation: 14,
      height: 0.3,
      diameterTop: pos.size * 1.6,
      diameterBottom: pos.size * 1.6
    }, scene);
    ringMid.rotation.y = Math.PI / 2;
    ringMid.material = magentaMat;
    ringMid.parent = parentNode;
    mapMeshes.push(ringMid);

    // Ring 3 (Inner, Gold, spin on Z)
    const ringInn = BABYLON.MeshBuilder.CreateCylinder("ringInn" + idx, {
      tessellation: 12,
      height: 0.2,
      diameterTop: pos.size * 1.2,
      diameterBottom: pos.size * 1.2
    }, scene);
    ringInn.rotation.z = Math.PI / 2;
    ringInn.material = goldMat;
    ringInn.parent = parentNode;
    mapMeshes.push(ringInn);

    // Central Plasma Sphere
    const plasma = BABYLON.MeshBuilder.CreateSphere("plasma" + idx, { segments: 6, diameter: pos.size * 0.5 }, scene);
    plasma.material = plasmaMat;
    plasma.parent = parentNode;
    mapMeshes.push(plasma);

    rotatingRings.push(
      { mesh: ringOut, axis: "y", speed: 0.8 },
      { mesh: ringMid, axis: "x", speed: -1.2 },
      { mesh: ringInn, axis: "z", speed: 1.6 }
    );
    pulsingCores.push({ mesh: plasma, phase: idx * Math.PI });
  });

  // --- 2. HYPERDIMENSIONAL TESSERACT ANOMALIES ---
  const tessPositions = [
    { x: -45, y: 12, z: 40, size: 4.0 },
    { x: 55, y: 15, z: -20, size: 4.0 }
  ];

  tessPositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("tesseract" + idx, scene);
    parentNode.position.set(pos.x, pos.y, pos.z);

    // Outer Cube (Gold, spins one way)
    const outerCube = BABYLON.MeshBuilder.CreateBox("bbOuter" + idx, { size: pos.size }, scene);
    outerCube.material = goldMat;
    outerCube.parent = parentNode;
    mapMeshes.push(outerCube);

    // Inner Cube (Magenta, spins other way & breathes in size)
    const innerCube = BABYLON.MeshBuilder.CreateBox("bbInner" + idx, { size: pos.size * 0.5 }, scene);
    innerCube.material = magentaMat;
    innerCube.parent = parentNode;
    mapMeshes.push(innerCube);

    // 8 Connecting rods connecting outer corners and inner corners!
    const rods = [];
    const corners = [
      new BABYLON.Vector3(-1, -1, -1),
      new BABYLON.Vector3( 1, -1, -1),
      new BABYLON.Vector3(-1,  1, -1),
      new BABYLON.Vector3( 1,  1, -1),
      new BABYLON.Vector3(-1, -1,  1),
      new BABYLON.Vector3( 1, -1,  1),
      new BABYLON.Vector3(-1,  1,  1),
      new BABYLON.Vector3( 1,  1,  1)
    ];

    corners.forEach((corner, cIdx) => {
      const rod = BABYLON.MeshBuilder.CreateCylinder("rod_" + idx + "_" + cIdx, {
        tessellation: 3,
        height: 1.0,
        diameterTop: 0.08,
        diameterBottom: 0.08
      }, scene);
      rod.material = goldMat;
      rod.parent = parentNode;
      mapMeshes.push(rod);
      rods.push({ mesh: rod, corner: corner });
    });

    tesseracts.push({
      parent: parentNode,
      outer: outerCube,
      inner: innerCube,
      rods: rods,
      originalSize: pos.size,
      phase: idx
    });
  });

  // --- 3. SPACE MINING LASER STATION (PLANETARY HARVESTER) ---
  const laserPositions = [
    { x: 35, y: 35, z: 50, size: 5.0 }
  ];

  laserPositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("harvesterStation" + idx, scene);
    parentNode.position.set(pos.x, pos.y, pos.z);

    // Harvester Satellite Ring
    const hubRing = BABYLON.MeshBuilder.CreateCylinder("hubRing" + idx, {
      tessellation: 12,
      height: 1.2,
      diameterTop: pos.size * 1.5,
      diameterBottom: pos.size * 1.5
    }, scene);
    hubRing.material = goldMat;
    hubRing.parent = parentNode;
    mapMeshes.push(hubRing);

    // Harvester Core Generator
    const generator = BABYLON.MeshBuilder.CreateBox("generator" + idx, {
      width: pos.size * 0.6,
      height: pos.size * 0.6,
      depth: pos.size * 0.6
    }, scene);
    generator.material = magentaMat;
    generator.parent = parentNode;
    mapMeshes.push(generator);

    // Volumetric Harvester Laser Beam (Cylinder shooting down to the infinite road floor!)
    const beam = BABYLON.MeshBuilder.CreateCylinder("harvesterBeam" + idx, {
      tessellation: 8,
      height: 100.0, // long beam stretching down
      diameterTop: 1.8,
      diameterBottom: 4.5 // flares out at contact pool!
    }, scene);
    // Align vertically and shift center downwards
    beam.position.y = -50.0;
    beam.material = beamMat;
    beam.parent = parentNode;
    mapMeshes.push(beam);

    rotatingRings.push(
      { mesh: hubRing, axis: "y", speed: 0.4 },
      { mesh: generator, axis: "x", speed: 0.8 }
    );
    miningLasers.push({ beam: beam, phase: idx });
  });

  // --- 4. SPACE STATION WITH ROTATING SOLAR ARRAY ---
  const stationParent = new BABYLON.TransformNode("spaceStation", scene);
  stationParent.position.set(-20, 16, -70);

  const hub = BABYLON.MeshBuilder.CreateCylinder("stationHub", { tessellation: 8, height: 8.0, diameterBottom: 2.0, diameterTop: 2.0 }, scene);
  hub.rotation.x = Math.PI / 2;
  hub.material = goldMat;
  hub.parent = stationParent;
  mapMeshes.push(hub);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const wing = BABYLON.MeshBuilder.CreateBox("wing" + i, { width: 6.0, height: 1.5, depth: 0.08 }, scene);
    wing.position.set(Math.cos(angle) * 4.5, Math.sin(angle) * 4.5, 0);
    wing.rotation.z = angle;
    wing.material = magentaMat;
    wing.parent = stationParent;
    mapMeshes.push(wing);
  }

  rotatingRings.push({ mesh: stationParent, axis: "z", speed: 0.3 });

  // 2. Register cosmic orbits animation observer
  const obs = scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001;

    // A. Spin standard gyroscopes and asteroid orbital components
    rotatingRings.forEach(item => {
      if (item.axis === "y") {
        item.mesh.rotation.y += item.speed * 0.01;
      } else if (item.axis === "x") {
        item.mesh.rotation.x += item.speed * 0.01;
      } else if (item.axis === "z") {
        item.mesh.rotation.z += item.speed * 0.01;
      }
    });

    // B. Expand and contract stardust energy plasma cores
    pulsingCores.forEach(item => {
      const scale = 0.9 + Math.sin(time * 4.0 + item.phase) * 0.2;
      item.mesh.scaling.set(scale, scale, scale);
    });

    // C. Animate 4D Tesseract breathing corners dynamically!
    tesseracts.forEach(tess => {
      // Rotate inner and outer cubes in opposite directions
      tess.outer.rotation.y += 0.006;
      tess.outer.rotation.x += 0.004;

      tess.inner.rotation.y -= 0.012;
      tess.inner.rotation.z += 0.008;

      // Pulse inner cube scale
      const breatheScale = 0.45 + Math.sin(time * 2.8 + tess.phase) * 0.15;
      tess.inner.scaling.set(breatheScale, breatheScale, breatheScale);

      // Force-stretch all 8 connecting rods to bridge the rotated corners of inner and outer cubes!
      tess.rods.forEach(rod => {
        // Calculate corner local coords
        const innerCoord = rod.corner.scale(tess.originalSize * 0.5 * breatheScale);
        const outerCoord = rod.corner.scale(tess.originalSize);

        // Transform local coordinates into rotated space matrices
        const pInner = BABYLON.Vector3.TransformCoordinates(innerCoord, tess.inner.getWorldMatrix());
        const pOuter = BABYLON.Vector3.TransformCoordinates(outerCoord, tess.outer.getWorldMatrix());

        // Vector between corners in local space of parent
        const direction = pOuter.subtract(pInner);
        const length = direction.length();

        // Position rod halfway
        rod.mesh.position.copyFrom(pInner.add(direction.scale(0.5)).subtract(tess.parent.position));
        // Scale rod vertical Y height to match distance
        rod.mesh.scaling.y = length;

        // Swivel rod to point directly from inner corner to outer corner
        const yaw = Math.atan2(direction.x, direction.z);
        const horizDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const pitch = -Math.atan2(direction.y, horizDist);

        rod.mesh.rotation.y = yaw;
        rod.mesh.rotation.x = pitch + Math.PI / 2; // cylinder offset
      });
    });

    // D. Pulse harvester energy mining beams
    miningLasers.forEach(laser => {
      const beamScale = 0.9 + Math.sin(time * 12.0) * 0.1; // extreme rapid electric vibration
      laser.beam.scaling.x = beamScale;
      laser.beam.scaling.z = beamScale;
      // Oscillate beam transparency
      beamMat.alpha = 0.38 + Math.sin(time * 6.0) * 0.08;
    });
  });

  mapObservers.push(obs);
}
