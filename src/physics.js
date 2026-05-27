import { boughtUpgrades, transmissionState } from './ui.js';

// Vehicle physics state
export const carPhysics = {
  position: null, // Initialized dynamically in initPhysics
  velocity: 0.0,
  heading: 0.0,
  steeringAngle: 0.0,
  wheelRotation: 0.0,
  maxSpeed: 21.0,
  acceleration: 12.0,
  friction: 3.5,
  braking: 22.0,
  maxSteering: 0.45,
  steeringSpeed: 5.0,
  radius: 0.14
};

// Initialize car physics position
export function initPhysics() {
  if (typeof BABYLON !== 'undefined') {
    carPhysics.position = new BABYLON.Vector3(0, 0.26, 0);
  } else {
    carPhysics.position = { x: 0, y: 0.26, z: 0, set: function(x,y,z) { this.x = x; this.y = y; this.z = z; } };
  }
  carPhysics.velocity = 0.0;
  carPhysics.heading = 0.0;
  carPhysics.steeringAngle = 0.0;
  carPhysics.wheelRotation = 0.0;
}

// Reset physics
export function resetPhysics() {
  if (carPhysics.position && typeof carPhysics.position.set === 'function') {
    carPhysics.position.set(0, 0.26, 0);
  } else {
    carPhysics.position = { x: 0, y: 0.26, z: 0 };
  }
  carPhysics.velocity = 0;
  carPhysics.heading = 0;
  carPhysics.steeringAngle = 0;
}

// Update physics loop
export function updatePhysics(dt, keys, touchState, autopilot, timeElapsed, carBox) {
  let accelInput = 0.0;
  let steerInput = 0.0;

  if (autopilot) {
    // Generate organic figure-8 driving path vectors during autopilot
    const slowTime = timeElapsed * 1.0;
    accelInput = 0.6 + Math.sin(slowTime * 0.4) * 0.1;
    steerInput = Math.sin(slowTime * 0.95) * 0.65 + Math.cos(slowTime * 0.3) * 0.15;
  } else {
    // Collect combined keyboard & touch controls inputs
    if (keys.w || touchState.gas) accelInput += 1.0;
    if (keys.s || touchState.brake) accelInput -= 1.0;
    if (keys.a || touchState.left) steerInput += 1.0;
    if (keys.d || touchState.right) steerInput -= 1.0;
    if (keys.space) accelInput = 0.0; // Handbrake priority
  }

  // 🛠️ Dynamic performance upgrade multipliers
  let activeAcceleration = carPhysics.acceleration;
  if (boughtUpgrades.turbo) {
    activeAcceleration *= 1.20; // Stage 1 Turbo: +20% Acceleration
  }

  let activeMaxSpeed = carPhysics.maxSpeed;
  if (boughtUpgrades.weight) {
    activeMaxSpeed *= 1.15; // Weight Reduction: +15% Top Speed
  }

  // Process forward speed
  if (accelInput > 0.1) {
    carPhysics.velocity += activeAcceleration * accelInput * dt;
  } else if (accelInput < -0.1) {
    carPhysics.velocity += activeAcceleration * accelInput * dt;
  } else {
    // Apply rolling friction drag
    const drag = carPhysics.velocity * carPhysics.friction * dt;
    carPhysics.velocity -= drag;
  }

  // Apply handbrake
  if (keys.space) {
    const brakeFactor = carPhysics.velocity * carPhysics.braking * dt;
    carPhysics.velocity -= brakeFactor;
  }

  // ⚙️ Calculate manual gear physical velocity limit
  let maxForwardSpeed = activeMaxSpeed;
  if (transmissionState.type === "MANUAL") {
    const gear = transmissionState.gear;
    if (gear === "R") {
      maxForwardSpeed = activeMaxSpeed * 0.4;
    } else if (gear === "P") {
      maxForwardSpeed = 0.0;
    } else {
      // Manual Gear limits in MPH: 1: 22, 2: 44, 3: 68, 4: 92, 5: 114, 6: 130
      // Velocity equivalent: MPH / 5.8
      const speedLimits = { 1: 22, 2: 44, 3: 68, 4: 92, 5: 114, 6: 130 };
      const gearLimitMph = speedLimits[gear] || 130;
      maxForwardSpeed = Math.min(activeMaxSpeed, gearLimitMph / 5.8);
    }
  }

  // Clamp final speeds
  if (typeof BABYLON !== 'undefined') {
    carPhysics.velocity = BABYLON.Scalar.Clamp(carPhysics.velocity, -activeMaxSpeed * 0.4, maxForwardSpeed);
  } else {
    carPhysics.velocity = Math.max(-activeMaxSpeed * 0.4, Math.min(maxForwardSpeed, carPhysics.velocity));
  }

  // Process steering mechanics
  let targetSteer = steerInput * carPhysics.maxSteering;
  if (typeof BABYLON !== 'undefined') {
    carPhysics.steeringAngle = BABYLON.Scalar.Clamp(BABYLON.Scalar.Lerp(carPhysics.steeringAngle, targetSteer, carPhysics.steeringSpeed * dt), -carPhysics.maxSteering, carPhysics.maxSteering);
  } else {
    carPhysics.steeringAngle = carPhysics.steeringAngle + (targetSteer - carPhysics.steeringAngle) * (carPhysics.steeringSpeed * dt);
  }

  // Heading adjustments depends heavily on speed
  if (Math.abs(carPhysics.velocity) > 0.1) {
    const directionMultiplier = carPhysics.velocity > 0 ? 1.0 : -0.5;
    carPhysics.heading += carPhysics.steeringAngle * (carPhysics.velocity / 6.0) * directionMultiplier * dt;
  }

  // Update physical positioning from Heading & Velocity
  if (typeof BABYLON !== 'undefined' && carBox) {
    const forwardVec = carBox.getDirection(new BABYLON.Vector3(1, 0, 0));
    carPhysics.position.addInPlace(forwardVec.scale(carPhysics.velocity * dt));

    // Anchor physics to transform updates
    carBox.position.copyFrom(carPhysics.position);
    carBox.rotation.set(0, -carPhysics.heading, 0); // Correct rotation axes mapping
  }

  // Track total spin of the wheels
  carPhysics.wheelRotation += (carPhysics.velocity / carPhysics.radius) * dt;
}
