let leftLight = null;
let rightLight = null;
let flickerTimer = 0;
const baselineIntensity = 5.625; // Adjusted to exactly 75% of the previous peak for optimal contrast

export function initHeadlights(scene) {
  // 1. Create Left and Right spotlights pointing forward along the local +X axis with a narrower cone
  leftLight = new BABYLON.SpotLight(
    "headlightL", 
    BABYLON.Vector3.Zero(), 
    new BABYLON.Vector3(1, -0.2, 0), // Local forward +X, angled downwards
    Math.PI / 5.5, // Narrower cone angle (about 32 degrees)
    10, // exponent falloff (gives beautiful punchy spotlight profile)
    scene
  );
  
  rightLight = new BABYLON.SpotLight(
    "headlightR", 
    BABYLON.Vector3.Zero(), 
    new BABYLON.Vector3(1, -0.2, 0), 
    Math.PI / 5.5, 
    10, 
    scene
  );

  // Configure realistic warm halogen/xenon colors and ranges
  const diffuseColor = new BABYLON.Color3(1.0, 0.96, 0.82); // bright halogen warm white
  
  leftLight.diffuse = diffuseColor;
  leftLight.specular = new BABYLON.Color3(1, 1, 1);
  leftLight.range = 90; // project lights up to 90 units
  
  rightLight.diffuse = diffuseColor;
  rightLight.specular = new BABYLON.Color3(1, 1, 1);
  rightLight.range = 90;

  leftLight.intensity = 0.0;
  rightLight.intensity = 0.0;

  // Store in scene.customData so other scripts can access them
  scene.customData.headlightL = leftLight;
  scene.customData.headlightR = rightLight;
}

export function attachHeadlights(mesh, type) {
  if (!leftLight || !rightLight) return;

  // Parent lights directly to the active vehicle mesh so they follow steering and movement
  leftLight.parent = mesh;
  rightLight.parent = mesh;

  if (type === "truck") {
    // Custom offsets for Semitruck bumper dimensions (local +X forward, Z left/right spacing)
    leftLight.position.set(2.15, -0.3, -0.68);
    rightLight.position.set(2.15, -0.3, 0.68);
    
    // Lowered the trajectory a hair: angled downwards Y = -0.25 (was -0.15)
    leftLight.direction.set(1, -0.25, 0).normalize();
    rightLight.direction.set(1, -0.25, 0).normalize();
  } else if (type === "minitruck") {
    // Custom offsets for Hantu-Raya buggy exoskeletal nose bumper
    leftLight.position.set(1.4, 0.12, -0.35);
    rightLight.position.set(1.4, 0.12, 0.35);
    
    leftLight.direction.set(1, -0.22, 0).normalize();
    rightLight.direction.set(1, -0.22, 0).normalize();
  } else {
    // Custom offsets for low-slung Sports Car dimensions (local +X forward, Z left/right spacing)
    leftLight.position.set(1.35, -0.14, -0.44);
    rightLight.position.set(1.35, -0.14, 0.44);
    
    // Lowered the trajectory a hair: angled downwards Y = -0.20 (was -0.1)
    leftLight.direction.set(1, -0.20, 0).normalize();
    rightLight.direction.set(1, -0.20, 0).normalize();
  }
}

export function updateHeadlights(dayNightVal) {
  if (!leftLight || !rightLight) return;

  // dayNightVal ranges from 0.0 (Night) to 1.0 (Day).
  // Headlights are fully active at night, and shut off during the bright daylight hours.
  const nightFactor = 1.0 - dayNightVal; // 1.0 at night, 0.0 at day
  const targetIntensity = baselineIntensity * nightFactor;

  if (targetIntensity > 0.08) {
    if (flickerTimer > 0) {
      flickerTimer--;
      
      // Perform independent flickering logic
      const lFlicker = Math.random() < 0.18 ? 0.0 : (0.3 + Math.random() * 0.8);
      const rFlicker = Math.random() < 0.18 ? 0.0 : (0.3 + Math.random() * 0.8);
      
      leftLight.intensity = targetIntensity * lFlicker;
      rightLight.intensity = targetIntensity * rFlicker;
    } else {
      // 0.4% chance per frame to trigger a cybernetic flicker sequence (lasts 6 to 18 frames)
      if (Math.random() < 0.004) {
        flickerTimer = 6 + Math.floor(Math.random() * 12);
      }
      leftLight.intensity = targetIntensity;
      rightLight.intensity = targetIntensity;
    }
  } else {
    leftLight.intensity = 0.0;
    rightLight.intensity = 0.0;
  }
}
