import { carPhysics } from '../physics.js';

export function createMiniTruck(scene, initialCarPosition) {
  // Create parent bounding box container
  const minitruckBox = BABYLON.MeshBuilder.CreateBox("minitruckBox", { width: 2.2, height: 1.6, depth: 1.2 }, scene);
  minitruckBox.position.copyFrom(initialCarPosition);
  minitruckBox.visibility = 0.0; // Hide the container box; only child skeletal parts render!

  // Standard Shader Material to maintain 100% compatibility with uniform ticks
  const carMaterial = new BABYLON.ShaderMaterial("minitruckShader", scene, {
    vertex: "car",
    fragment: "car",
  }, {
    attributes: ["position", "normal", "uv"],
    uniforms: [
      "world", "view", "projection", "uCameraPos", "uWorldInverse", 
      "uWheelRotation", "uSteeringAngle", "uLightDir", "uDayNight", "time"
    ]
  });
  minitruckBox.material = carMaterial;

  // Add simple soft shadow texture plane directly below chassis
  const shadowPlane = BABYLON.MeshBuilder.CreatePlane("shadowPlane", { width: 2.5, height: 1.6 }, scene);
  shadowPlane.rotation.x = Math.PI / 2;
  shadowPlane.parent = minitruckBox;
  shadowPlane.position.set(0, -0.25, 0);
  
  const shadowTex = new BABYLON.DynamicTexture("shadowTex", 256, scene);
  const ctx = shadowTex.getContext();
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 115);
  grad.addColorStop(0, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.45)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  shadowTex.update();

  const shadowMat = new BABYLON.StandardMaterial("shadowMat", scene);
  shadowMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  shadowMat.specularColor = new BABYLON.Color3(0, 0, 0);
  shadowMat.opacityTexture = shadowTex;
  shadowPlane.material = shadowMat;

  // --- SCI-FI CYBER MATERIALS ---
  const primaryTubeMat = new BABYLON.StandardMaterial("primaryTubeMat", scene);
  primaryTubeMat.diffuseColor = new BABYLON.Color3(1.0, 0.22, 0.0);
  primaryTubeMat.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.0);

  const secondaryTubeMat = new BABYLON.StandardMaterial("secondaryTubeMat", scene);
  secondaryTubeMat.diffuseColor = new BABYLON.Color3(1.0, 0.45, 0.0);
  secondaryTubeMat.emissiveColor = new BABYLON.Color3(0.18, 0.04, 0.0);

  const subframeMat = new BABYLON.StandardMaterial("subframeMat", scene);
  subframeMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.12);
  subframeMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);

  const steelMat = new BABYLON.StandardMaterial("steelMat", scene);
  steelMat.diffuseColor = new BABYLON.Color3(0.65, 0.65, 0.65);
  steelMat.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);

  const blackMat = new BABYLON.StandardMaterial("blackMat", scene);
  blackMat.diffuseColor = new BABYLON.Color3(0.04, 0.04, 0.04);
  blackMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

  const shockMat = new BABYLON.StandardMaterial("shockMat", scene);
  shockMat.diffuseColor = new BABYLON.Color3(0.0, 0.6, 1.0);
  shockMat.emissiveColor = new BABYLON.Color3(0.0, 0.12, 0.25);

  // Exoskeletal Tube Drawer
  function createTube(p1, p2, material, radius) {
    const distance = BABYLON.Vector3.Distance(p1, p2);
    if (distance < 0.01) return null;

    const tube = BABYLON.MeshBuilder.CreateCylinder("chassisTube", {
      height: distance,
      diameterTop: radius * 2,
      diameterBottom: radius * 2,
      tessellation: 8
    }, scene);

    tube.position.copyFrom(BABYLON.Vector3.Lerp(p1, p2, 0.5));
    const v = p2.subtract(p1).normalize();
    const up = new BABYLON.Vector3(0, 1, 0);

    const axis = BABYLON.Vector3.Cross(up, v);
    const angle = Math.acos(BABYLON.Vector3.Dot(up, v));

    if (axis.length() > 0.0001) {
      tube.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis.normalize(), angle);
    } else if (v.y < 0) {
      tube.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
    }

    tube.material = material;
    tube.parent = minitruckBox;
    return tube;
  }

  // --- EXOSKELETAL FRAME NODES ---
  // Math mapping: Three.js (x, y, z) -> Babylon (z, y, x)
  const wS = 0.35;
  const wB = 0.75;
  const wR = 0.50;

  const y0 = 0.12;
  const y1 = 0.38;
  const y2 = 0.90;
  const y3 = 1.48;

  const zN = 1.4;
  const zFA = 1.0;
  const zD = 1.15;
  const zBP = 0.05;
  const zC = -0.45;
  const zRA = -0.95;
  const zT = -1.35;

  const n = {
    l0_n_l: new BABYLON.Vector3(zN, y0, -wS),   l0_n_r: new BABYLON.Vector3(zN, y0, wS),
    l0_fa_l: new BABYLON.Vector3(zFA, y0, -wS), l0_fa_r: new BABYLON.Vector3(zFA, y0, wS),
    l0_bp_l: new BABYLON.Vector3(zBP, y0, -wS), l0_bp_r: new BABYLON.Vector3(zBP, y0, wS),
    l0_ra_l: new BABYLON.Vector3(zRA, y0, -wS), l0_ra_r: new BABYLON.Vector3(zRA, y0, wS),
    l0_t_l: new BABYLON.Vector3(zT, y0, -wS),   l0_t_r: new BABYLON.Vector3(zT, y0, wS),

    l1_n_l: new BABYLON.Vector3(zN, y1, -wS),   l1_n_r: new BABYLON.Vector3(zN, y1, wS),
    l1_fa_l: new BABYLON.Vector3(zFA, y1, -wS), l1_fa_r: new BABYLON.Vector3(zFA, y1, wS),
    l1_d_l: new BABYLON.Vector3(zD, y1, -wS),   l1_d_r: new BABYLON.Vector3(zD, y1, wS),
    l1_bp_l: new BABYLON.Vector3(zBP, y1, -wS), l1_bp_r: new BABYLON.Vector3(zBP, y1, wS),
    l1_c_l: new BABYLON.Vector3(zC, y1, -wS),   l1_c_r: new BABYLON.Vector3(zC, y1, wS),
    l1_ra_l: new BABYLON.Vector3(zRA, y1, -wS), l1_ra_r: new BABYLON.Vector3(zRA, y1, wS),
    l1_t_l: new BABYLON.Vector3(zT, y1, -wS),   l1_t_r: new BABYLON.Vector3(zT, y1, wS),

    l2_n_l: new BABYLON.Vector3(zN-0.1, y2, -wS+0.1), l2_n_r: new BABYLON.Vector3(zN-0.1, y2, wS-0.1),
    l2_d_l: new BABYLON.Vector3(zD, y2, -wB),         l2_d_r: new BABYLON.Vector3(zD, y2, wB),
    l2_bp_l: new BABYLON.Vector3(zBP, y2, -wB),       l2_bp_r: new BABYLON.Vector3(zBP, y2, wB),
    l2_c_l: new BABYLON.Vector3(zC, y2, -wS-0.1),     l2_c_r: new BABYLON.Vector3(zC, y2, wS+0.1),
    l2_t_l: new BABYLON.Vector3(zT, y2, -wS),         l2_t_r: new BABYLON.Vector3(zT, y2, wS),

    l3_f_l: new BABYLON.Vector3(zD, y3, -wR),   l3_f_r: new BABYLON.Vector3(zD, y3, wR),
    l3_r_l: new BABYLON.Vector3(zBP, y3, -wR),  l3_r_r: new BABYLON.Vector3(zBP, y3, wR),
  };

  const thick = 0.032;
  const thin = 0.018;

  // 1. Structural Subframe rails
  const subPairs = [
    ['l0_n_l', 'l0_fa_l'], ['l0_fa_l', 'l0_bp_l'], ['l0_bp_l', 'l0_ra_l'], ['l0_ra_l', 'l0_t_l'],
    ['l0_n_r', 'l0_fa_r'], ['l0_fa_r', 'l0_bp_r'], ['l0_bp_r', 'l0_ra_r'], ['l0_ra_r', 'l0_t_r'],
    ['l1_n_l', 'l1_fa_l'], ['l1_fa_l', 'l1_d_l'],  ['l1_d_l', 'l1_bp_l'],  ['l1_bp_l', 'l1_c_l'], ['l1_c_l', 'l1_ra_l'], ['l1_ra_l', 'l1_t_l'],
    ['l1_n_r', 'l1_fa_r'], ['l1_fa_r', 'l1_d_r'],  ['l1_d_r', 'l1_bp_r'],  ['l1_bp_r', 'l1_c_r'], ['l1_c_r', 'l1_ra_r'], ['l1_ra_r', 'l1_t_r'],
    ['l0_n_l', 'l0_n_r'], ['l0_fa_l', 'l0_fa_r'], ['l0_bp_l', 'l0_bp_r'], ['l0_ra_l', 'l0_ra_r'], ['l0_t_l', 'l0_t_r'],
    ['l1_n_l', 'l1_n_r'], ['l1_d_l', 'l1_d_r'],   ['l1_bp_l', 'l1_bp_r'], ['l1_c_l', 'l1_c_r'],   ['l1_t_l', 'l1_t_r'],
    ['l0_n_l', 'l1_n_l'], ['l0_fa_l', 'l1_fa_l'], ['l0_bp_l', 'l1_bp_l'], ['l0_ra_l', 'l1_ra_l'], ['l0_t_l', 'l1_t_l'],
    ['l0_n_r', 'l1_n_r'], ['l0_fa_r', 'l1_fa_r'], ['l0_bp_r', 'l1_bp_r'], ['l0_ra_r', 'l1_ra_r'], ['l0_t_r', 'l1_t_r'],
  ];
  subPairs.forEach(p => createTube(n[p[0]], n[p[1]], subframeMat, thick));

  // Subframe diagonals
  const subTriPairs = [
    ['l0_fa_l', 'l1_d_l'], ['l0_bp_l', 'l1_c_l'], ['l0_ra_l', 'l1_t_l'],
    ['l0_fa_r', 'l1_d_r'], ['l0_bp_r', 'l1_c_r'], ['l0_ra_r', 'l1_t_r'],
  ];
  subTriPairs.forEach(p => createTube(n[p[0]], n[p[1]], subframeMat, thin));

  // 2. Exoskeletal Roll Cage Upper Structure
  const bodyPairs = [
    ['l2_n_l', 'l2_d_l'], ['l2_d_l', 'l2_bp_l'], ['l2_bp_l', 'l2_c_l'], ['l2_c_l', 'l2_t_l'],
    ['l2_n_r', 'l2_d_r'], ['l2_d_r', 'l2_bp_r'], ['l2_bp_r', 'l2_c_r'], ['l2_c_r', 'l2_t_r'],
    ['l2_n_l', 'l2_n_r'], ['l2_d_l', 'l2_d_r'], ['l2_bp_l', 'l2_bp_r'], ['l2_c_l', 'l2_c_r'], ['l2_t_l', 'l2_t_r'],
    ['l3_f_l', 'l3_r_l'], ['l3_f_r', 'l3_r_r'], ['l3_f_l', 'l3_f_r'], ['l3_r_l', 'l3_r_r'],
    ['l1_n_l', 'l2_n_l'], ['l1_d_l', 'l2_d_l'], ['l1_bp_l', 'l2_bp_l'], ['l1_c_l', 'l2_c_l'], ['l1_t_l', 'l2_t_l'],
    ['l1_n_r', 'l2_n_r'], ['l1_d_r', 'l2_d_r'], ['l1_bp_r', 'l2_bp_r'], ['l1_c_r', 'l2_c_r'], ['l1_t_r', 'l2_t_r'],
    ['l2_d_l', 'l3_f_l'], ['l2_d_r', 'l3_f_r'],
    ['l2_bp_l', 'l3_r_l'], ['l2_bp_r', 'l3_r_r']
  ];
  bodyPairs.forEach(p => createTube(n[p[0]], n[p[1]], primaryTubeMat, thick));

  // Exoskeletal X-Bracing
  const bodyTriPairs = [
    ['l2_n_l', 'l1_n_r'], ['l2_n_r', 'l1_n_l'],
    ['l1_d_l', 'l2_bp_l'], ['l2_d_l', 'l1_bp_l'],
    ['l1_d_r', 'l2_bp_r'], ['l2_d_r', 'l1_bp_r'],
    ['l1_c_l', 'l2_t_l'], ['l2_c_l', 'l1_t_l'],
    ['l1_c_r', 'l2_t_r'], ['l2_c_r', 'l1_t_r'],
    ['l3_f_l', 'l3_r_r'], ['l3_f_r', 'l3_r_l'],
    ['l2_bp_l', 'l1_bp_r']
  ];
  bodyTriPairs.forEach(p => createTube(n[p[0]], n[p[1]], secondaryTubeMat, thin));

  // Windshield V-brace
  createTube(n.l3_f_l, new BABYLON.Vector3(zD, y2, 0), secondaryTubeMat, thin);
  createTube(n.l3_f_r, new BABYLON.Vector3(zD, y2, 0), secondaryTubeMat, thin);

  // --- WHEELS AND DOUBLE A-ARM SUSPENSION ---
  const wheels = [];

  function createSuspensionWheel(z, x, isFront) {
    const wY = 0.28;
    const sign = z > 0 ? 1 : -1;
    const subZ = wS * sign;

    // 1. Steering & Spinning Pivot nodes
    const steerPivot = new BABYLON.TransformNode("steerPivot", scene);
    steerPivot.parent = minitruckBox;
    steerPivot.position.set(x, wY, z);

    const spinNode = new BABYLON.TransformNode("spinNode", scene);
    spinNode.parent = steerPivot;

    // 2. Chunky Off-road Tire Mesh
    const tire = BABYLON.MeshBuilder.CreateCylinder("tire", {
      height: 0.28,
      diameterTop: 0.62,
      diameterBottom: 0.62,
      tessellation: 24
    }, scene);
    tire.rotation.x = Math.PI / 2; // Orient along Z axis
    tire.material = blackMat;
    tire.parent = spinNode;

    // Treads detail
    const hub = BABYLON.MeshBuilder.CreateCylinder("rimHub", {
      height: 0.30,
      diameterTop: 0.36,
      diameterBottom: 0.36,
      tessellation: 12
    }, scene);
    hub.rotation.x = Math.PI / 2;
    hub.material = steelMat;
    hub.parent = spinNode;

    wheels.push({
      pivot: steerPivot,
      mesh: spinNode,
      isFront: isFront
    });

    // 3. Double A-Arm Geometry Linkages
    const wLower = new BABYLON.Vector3(x, wY - 0.1, z - (0.1 * sign));
    const wUpper = new BABYLON.Vector3(x, wY + 0.1, z - (0.1 * sign));

    // Lower A-arm lines
    createTube(wLower, new BABYLON.Vector3(x + 0.15, y0, subZ), steelMat, 0.015);
    createTube(wLower, new BABYLON.Vector3(x - 0.15, y0, subZ), steelMat, 0.015);

    // Upper A-arm lines
    createTube(wUpper, new BABYLON.Vector3(x + 0.12, y1, subZ), steelMat, 0.015);
    createTube(wUpper, new BABYLON.Vector3(x - 0.12, y1, subZ), steelMat, 0.015);

    // 4. Coilover Shock Damper Assembly
    const shockTopZ = sign * (isFront ? wB : wS + 0.05);
    const shockLowerMount = new BABYLON.Vector3(x, wY - 0.05, z - (0.15 * sign));
    const shockUpperMount = new BABYLON.Vector3(x - (isFront ? 0.0 : 0.1), y2, shockTopZ);
    createTube(shockLowerMount, shockUpperMount, shockMat, 0.026);
  }

  // Spawn offroad wheels wide past subframe rails
  createSuspensionWheel(-0.82, zFA, true);  // Front Left
  createSuspensionWheel(0.82, zFA, true);   // Front Right
  createSuspensionWheel(-0.82, zRA, false); // Rear Left
  createSuspensionWheel(0.82, zRA, false);  // Rear Right

  // --- ACCESSORIES, INTERIOR AND V-TWIN MOTOR ---
  // Radiator core in nose
  const rad = BABYLON.MeshBuilder.CreateBox("radiator", { width: 0.05, height: 0.3, depth: 0.5 }, scene);
  rad.position.set(zN - 0.05, y1 + 0.15, 0);
  rad.rotation.z = -0.1;
  rad.material = blackMat;
  rad.parent = minitruckBox;

  // Ergonomic seats
  function createSeat(z) {
    const seatGroup = new BABYLON.TransformNode("seat", scene);
    seatGroup.parent = minitruckBox;
    seatGroup.position.set(zD - 0.65, y1 + 0.04, z);

    const bottom = BABYLON.MeshBuilder.CreateBox("seatBottom", { width: 0.45, height: 0.08, depth: 0.45 }, scene);
    bottom.position.y = 0.04;
    bottom.material = blackMat;
    bottom.parent = seatGroup;

    const back = BABYLON.MeshBuilder.CreateBox("seatBack", { width: 0.08, height: 0.62, depth: 0.45 }, scene);
    back.position.set(-0.15, 0.35, 0);
    back.rotation.z = 0.15;
    back.material = blackMat;
    back.parent = seatGroup;
  }
  createSeat(-0.35); // Left Hand Driver
  createSeat(0.35);  // Right Hand Passenger

  // Futuristic Tilted Steering Column & Assembly
  const swZ = -0.35;
  const swY = y2 + 0.08;
  const swX = zD - 0.45;

  const steerColumnPivot = new BABYLON.TransformNode("steerColumnPivot", scene);
  steerColumnPivot.parent = minitruckBox;
  steerColumnPivot.position.set(swX, swY, swZ);
  steerColumnPivot.rotation.z = -Math.PI / 5; // Tilts steering assembly!

  const steeringWheel = BABYLON.MeshBuilder.CreateTorus("steeringWheel", {
    diameter: 0.28,
    thickness: 0.05,
    tessellation: 16
  }, scene);
  steeringWheel.rotation.x = Math.PI / 2; // Lie flat against tilted column flange
  steeringWheel.material = blackMat;
  steeringWheel.parent = steerColumnPivot;

  // Steering column column shaft
  createTube(
    new BABYLON.Vector3(zD - 0.1, y1 + 0.1, swZ),
    new BABYLON.Vector3(swX + 0.05, swY - 0.02, swZ),
    steelMat,
    0.016
  );

  // --- POWERFUL V-TWIN CHROME ENGINE CRADLE ---
  const engineNode = new BABYLON.TransformNode("engineNode", scene);
  engineNode.parent = minitruckBox;
  engineNode.position.set(-0.85, y1 + 0.1, 0);

  // Crankcase block
  const crank = BABYLON.MeshBuilder.CreateBox("crankcase", { width: 0.35, height: 0.25, depth: 0.4 }, scene);
  crank.material = subframeMat;
  crank.parent = engineNode;

  // Transmission housing
  const trans = BABYLON.MeshBuilder.CreateBox("transmission", { width: 0.3, height: 0.2, depth: 0.3 }, scene);
  trans.position.set(-0.3, -0.02, 0);
  trans.material = subframeMat;
  trans.parent = engineNode;

  // Twin chrome cylinder cylinders
  const cylGeo = { height: 0.24, diameterTop: 0.22, diameterBottom: 0.22, tessellation: 16 };
  const headGeo = { width: 0.26, height: 0.12, depth: 0.26 };

  // Left cylinder
  const cyl1 = new BABYLON.TransformNode("cyl1", scene);
  cyl1.parent = engineNode;
  cyl1.position.set(0.05, 0.1, 0.0);
  cyl1.rotation.z = Math.PI / 7;

  const cyl1Body = BABYLON.MeshBuilder.CreateCylinder("c1Body", cylGeo, scene);
  cyl1Body.position.y = 0.12;
  cyl1Body.material = steelMat;
  cyl1Body.parent = cyl1;

  const cyl1Head = BABYLON.MeshBuilder.CreateBox("c1Head", headGeo, scene);
  cyl1Head.position.y = 0.30;
  cyl1Head.material = subframeMat;
  cyl1Head.parent = cyl1;

  // Right cylinder
  const cyl2 = new BABYLON.TransformNode("cyl2", scene);
  cyl2.parent = engineNode;
  cyl2.position.set(-0.05, 0.1, 0.0);
  cyl2.rotation.z = -Math.PI / 7;

  const cyl2Body = BABYLON.MeshBuilder.CreateCylinder("c2Body", cylGeo, scene);
  cyl2Body.position.y = 0.12;
  cyl2Body.material = steelMat;
  cyl2Body.parent = cyl2;

  const cyl2Head = BABYLON.MeshBuilder.CreateBox("c2Head", headGeo, scene);
  cyl2Head.position.y = 0.30;
  cyl2Head.material = subframeMat;
  cyl2Head.parent = cyl2;

  // Chrome exhausts pipes
  const exhaust1 = BABYLON.MeshBuilder.CreateCylinder("ex1", { height: 0.58, diameterTop: 0.07, diameterBottom: 0.07 }, scene);
  exhaust1.position.set(-0.25, 0.08, 0.15);
  exhaust1.rotation.z = Math.PI / 2;
  exhaust1.material = steelMat;
  exhaust1.parent = engineNode;

  const exhaust2 = BABYLON.MeshBuilder.CreateCylinder("ex2", { height: 0.58, diameterTop: 0.07, diameterBottom: 0.07 }, scene);
  exhaust2.position.set(-0.25, 0.08, -0.15);
  exhaust2.rotation.z = Math.PI / 2;
  exhaust2.material = steelMat;
  exhaust2.parent = engineNode;

  // --- SYSTEM RUN OBSERVER (DYNAMIC WHEELS ROTATION) ---
  scene.onBeforeRenderObservable.add(() => {
    if (!minitruckBox.isEnabled()) return;

    const wheelRot = carPhysics.wheelRotation;
    const steerAngle = carPhysics.steeringAngle;

    wheels.forEach((w) => {
      // Axle roll (rotate around lateral Z axis)
      w.mesh.rotation.z = wheelRot;
      
      // Steering yaw (only front tyres steer around vertical Y axis, inverted to correct turning)
      if (w.isFront) {
        w.pivot.rotation.y = -steerAngle;
      }
    });

    // Spin steering wheel realistically around tilted column axis (local Y)
    steeringWheel.rotation.y = -steerAngle * 4.5;
  });

  return { carBox: minitruckBox, carMaterial };
}
