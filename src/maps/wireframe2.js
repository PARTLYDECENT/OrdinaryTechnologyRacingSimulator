export function loadWireframe2(scene, mapMeshes, mapObservers) {
  // 1. Setup Neon materials
  const cyanMat = new BABYLON.StandardMaterial("wireMatCyan2", scene);
  cyanMat.emissiveColor = new BABYLON.Color3(0.0, 0.8, 1.0); // Electric Cyber Cyan
  cyanMat.disableLighting = true;
  cyanMat.wireframe = true;

  const magentaMat = new BABYLON.StandardMaterial("wireMatMag2", scene);
  magentaMat.emissiveColor = new BABYLON.Color3(1.0, 0.0, 0.75); // Shocking Neon Magenta
  magentaMat.disableLighting = true;
  magentaMat.wireframe = true;

  const solidMat = new BABYLON.StandardMaterial("elevatorMat2", scene);
  solidMat.emissiveColor = new BABYLON.Color3(0.0, 1.0, 0.85); // High-glow solid capsule
  solidMat.disableLighting = true;

  const trafficMat = new BABYLON.StandardMaterial("trafficMat2", scene);
  trafficMat.emissiveColor = new BABYLON.Color3(1.0, 0.8, 0.0); // Orange traffic arrow pulse
  trafficMat.disableLighting = true;

  const billboardGridMat = new BABYLON.StandardMaterial("billboardMat2", scene);
  billboardGridMat.emissiveColor = new BABYLON.Color3(1.0, 0.1, 0.4); // Bright billboard magenta
  billboardGridMat.disableLighting = true;
  billboardGridMat.wireframe = true;

  const koiMat = new BABYLON.StandardMaterial("koiMat2", scene);
  koiMat.emissiveColor = new BABYLON.Color3(0.0, 1.0, 0.85); // Bioluminescent Cyber Cyan fins
  koiMat.disableLighting = true;
  koiMat.wireframe = true;

  // Trackers for micro-animations
  const elevators = [];
  const trafficPulses = [];
  const rotatingCores = [];
  const cranes = [];
  const billboards = [];
  const cyberKoi = { segments: [], parentNode: null };

  // --- 1. PROCEDURAL SWIMMING HOLOGRAPHIC CYBER-KOI ---
  const koiRoot = new BABYLON.TransformNode("cyberKoiRoot", scene);
  koiRoot.position.set(0, 20, 0);

  // Construct a skeletal chain of segments for the fish body
  const numSegments = 6;
  const segmentMeshes = [];
  let prevNode = koiRoot;

  for (let s = 0; s < numSegments; s++) {
    const sizeScale = 1.0 - s * 0.12;
    // Diamond polyhedron represents organic segment shape
    const segment = BABYLON.MeshBuilder.CreatePolyhedron("koiSeg" + s, {
      type: 1, // Octahedron
      size: 1.5 * sizeScale
    }, scene);
    
    // Joint offset chain parenting
    segment.parent = prevNode;
    // Offset along local Z (local backward axis for the fish)
    segment.position.set(0, 0, s === 0 ? 0 : -1.35);
    segment.material = koiMat;
    mapMeshes.push(segment);
    segmentMeshes.push(segment);

    // Parent side fins to chest segments
    if (s === 1) {
      const finL = BABYLON.MeshBuilder.CreateCylinder("finL", { tessellation: 9, height: 0.1, diameterTop: 2.2, diameterBottom: 0.1 }, scene);
      finL.position.set(-1.4, 0, 0);
      finL.rotation.set(0, Math.PI / 4, Math.PI / 3);
      finL.material = koiMat;
      finL.parent = segment;
      mapMeshes.push(finL);

      const finR = BABYLON.MeshBuilder.CreateCylinder("finR", { tessellation: 9, height: 0.1, diameterTop: 2.2, diameterBottom: 0.1 }, scene);
      finR.position.set(1.4, 0, 0);
      finR.rotation.set(0, -Math.PI / 4, -Math.PI / 3);
      finR.material = koiMat;
      finR.parent = segment;
      mapMeshes.push(finR);
    }

    prevNode = segment;
  }

  cyberKoi.segments = segmentMeshes;
  cyberKoi.parentNode = koiRoot;

  // --- 2. LAYERED TOWER SPIDER-CRANES ---
  const towerPositions = [
    { x: -45, z: -15, height: 26, crane: true },
    { x: 38, z: 42, height: 32, crane: false },
    { x: -30, z: -55, height: 28, crane: true },
    { x: 50, z: -35, height: 30, crane: false }
  ];

  towerPositions.forEach((pos, idx) => {
    const parentNode = new BABYLON.TransformNode("tokyoTower" + idx, scene);
    parentNode.position.set(pos.x, 0, pos.z);

    const useMat = idx % 2 === 0 ? cyanMat : magentaMat;

    // Concentric tower blocks
    for (let r = 0; r < 3; r++) {
      const scale = 1.0 - r * 0.2;
      const ring = BABYLON.MeshBuilder.CreateBox("towerRing" + idx + "_" + r, {
        width: 4.0 * scale,
        height: pos.height,
        depth: 4.0 * scale
      }, scene);
      ring.position.y = pos.height / 2;
      ring.rotation.y = (r * Math.PI) / 8;
      ring.material = useMat;
      ring.parent = parentNode;
      mapMeshes.push(ring);
    }

    // Moving Elevator Capsule
    const elevator = BABYLON.MeshBuilder.CreateBox("elevator" + idx, { width: 0.6, height: 1.0, depth: 0.6 }, scene);
    elevator.position.set(2.1, 1.0, 0.0);
    elevator.material = solidMat;
    elevator.parent = parentNode;
    mapMeshes.push(elevator);

    elevators.push({ mesh: elevator, maxHeight: pos.height - 2.5, speed: 0.8 + idx * 0.25 });

    // Top Construction Spider Crane
    if (pos.crane) {
      const craneHub = new BABYLON.TransformNode("craneHub" + idx, scene);
      craneHub.position.set(0, pos.height, 0);
      craneHub.parent = parentNode;

      const arm = BABYLON.MeshBuilder.CreateBox("craneArm" + idx, { width: 0.3, height: 0.3, depth: 3.5 }, scene);
      arm.position.set(0, 0.5, 1.25); // juts outwards
      arm.material = useMat;
      arm.parent = craneHub;
      mapMeshes.push(arm);

      const hoistLine = BABYLON.MeshBuilder.CreateCylinder("hoist" + idx, { tessellation: 9, height: 2.0, diameterTop: 0.02, diameterBottom: 0.02 }, scene);
      hoistLine.position.set(0, -0.6, 2.8);
      hoistLine.material = useMat;
      hoistLine.parent = craneHub;
      mapMeshes.push(hoistLine);

      const cargo = BABYLON.MeshBuilder.CreateBox("cargo" + idx, { width: 0.7, height: 0.7, depth: 0.7 }, scene);
      cargo.position.set(0, -1.85, 2.8);
      cargo.material = solidMat;
      cargo.parent = craneHub;
      mapMeshes.push(cargo);

      cranes.push({ hub: craneHub, cargo: cargo, baseSpeed: 0.4 + idx * 0.2 });
    }
  });

  // --- 3. DUAL-SIDED SCROLLING CYBER BILLBOARDS ---
  const billboardData = [
    { x: 0, y: 18, z: -50, w: 12.0, h: 4.5 },
    { x: -50, y: 20, z: 15, w: 10.0, h: 4.0 }
  ];

  billboardData.forEach((data, idx) => {
    const parentNode = new BABYLON.TransformNode("billboardNode" + idx, scene);
    parentNode.position.set(data.x, data.y, data.z);

    // Support Mast
    const mast = BABYLON.MeshBuilder.CreateCylinder("bbMast" + idx, { tessellation: 12, height: 12.0, diameterTop: 0.2, diameterBottom: 0.8 }, scene);
    mast.position.y = -6.0;
    mast.material = magentaMat;
    mast.parent = parentNode;
    mapMeshes.push(mast);

    // Outer Screen Frame
    const screenFrame = BABYLON.MeshBuilder.CreateBox("bbFrame" + idx, { width: data.w + 0.6, height: data.h + 0.6, depth: 0.6 }, scene);
    screenFrame.material = magentaMat;
    screenFrame.parent = parentNode;
    mapMeshes.push(screenFrame);

    // Inner Scrolling Grid Panel
    const gridPanel = BABYLON.MeshBuilder.CreateBox("bbGrid" + idx, { width: data.w, height: data.h, depth: 0.2 }, scene);
    gridPanel.material = billboardGridMat;
    gridPanel.parent = parentNode;
    mapMeshes.push(gridPanel);

    billboards.push({ mesh: gridPanel, originalScale: new BABYLON.Vector3(1, 1, 1), phase: idx });
  });

  // --- 4. FLOATING RING HIGHWAY & GLIDING PULSES ---
  const highwayContainer = new BABYLON.TransformNode("highwayDec", scene);
  highwayContainer.position.set(0, 10, 0);

  const pathMesh = BABYLON.MeshBuilder.CreateCylinder("highwayRing", { tessellation: 72, height: 0.2, diameterTop: 90, diameterBottom: 90 }, scene);
  pathMesh.material = cyanMat;
  pathMesh.parent = highwayContainer;
  mapMeshes.push(pathMesh);

  for (let i = 0; i < 6; i++) {
    const pulse = BABYLON.MeshBuilder.CreateSphere("traffic" + i, { segments: 12, diameter: 0.5 }, scene);
    pulse.material = trafficMat;
    pulse.parent = highwayContainer;
    mapMeshes.push(pulse);

    trafficPulses.push({
      mesh: pulse,
      offset: (i * Math.PI * 2) / 6,
      radius: 45.0,
      speed: 0.6
    });
  }

  // 3. Register Neo Tokyo animations observer
  const obs = scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001;

    // A. Animate Procedural Cyber-Koi swimming motion!
    const koiSpeed = time * 0.5;
    // Circular orbit path around Neo Tokyo skyline
    const orbitRadius = 55.0;
    cyberKoi.parentNode.position.set(
      Math.cos(koiSpeed) * orbitRadius,
      20.0 + Math.sin(time * 0.8) * 3.5, // gentle bobbing
      Math.sin(koiSpeed) * orbitRadius
    );
    // Align body forward vector tangent to orbit
    cyberKoi.parentNode.rotation.y = -koiSpeed + Math.PI;

    // Apply procedural swimming sine wave through the segment chain
    cyberKoi.segments.forEach((seg, sIdx) => {
      if (sIdx > 0) {
        // Lateral body waggle
        const lateralWag = Math.sin(time * 4.2 - sIdx * 0.85) * 0.18;
        seg.rotation.y = lateralWag;
        
        // Vertical body wave
        const verticalWave = Math.cos(time * 3.0 - sIdx * 0.6) * 0.08;
        seg.rotation.x = verticalWave;
      }
    });

    // B. Glide elevators
    elevators.forEach(el => {
      const heightVal = el.maxHeight / 2 + Math.sin(time * el.speed) * (el.maxHeight / 2);
      el.mesh.position.y = 1.0 + heightVal;
    });

    // C. Rotate cranes and hoist cargo
    cranes.forEach((crane, cIdx) => {
      crane.hub.rotation.y = Math.sin(time * crane.baseSpeed) * 0.6;
      // Cargo blocks bob dynamically
      crane.cargo.position.y = -1.85 + Math.sin(time * 1.5 + cIdx) * 0.45;
    });

    // D. Animate holographic billboards (simulating flickering digital interference)
    billboards.forEach(bb => {
      const flicker = 0.95 + Math.sin(time * 15.0 + bb.phase) * 0.05;
      // Occasional visual signal dropouts
      const signalDrop = Math.random() > 0.98 ? 0.2 : 1.0;
      bb.mesh.scaling.set(1.0, flicker * signalDrop, 1.0);
    });

    // E. Glide highway traffic
    trafficPulses.forEach(p => {
      const angle = time * p.speed + p.offset;
      p.mesh.position.set(Math.cos(angle) * p.radius, 0.1, Math.sin(angle) * p.radius);
    });
  });

  mapObservers.push(obs);
}
