import { registerShaders } from './shaders/index.js';
import { initInput, keys, touchState } from './input.js';
import { carPhysics, initPhysics, resetPhysics, updatePhysics } from './physics.js';
import { autopilot, targetDayNight, initUI, breakAutopilotUI, updateUI, setAutopilot } from './ui.js';
import { createScene, uLightDirValue } from './scene.js';
import { initPauseMenu, getIsPaused } from './pause_menu.js';
import { updateHeadlights } from './garage/headlights.js';
import { updateMapInteractions } from './maps/interactions.js';
import { initEngineSound, updateEngineSound, muteEngineSound, getAudioStatus } from './audio.js';



window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById("renderCanvas");
  if (!canvas) return;

  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  let scene;
  let timeElapsed = 0.0;

  // 1. Register Shaders in BABYLON Store
  registerShaders();

  // 2. Initialize Physics state
  initPhysics();

  // Helper to trigger audio initialization on any user interaction (keyboard/mouse/pedal)
  const tryStartAudioOnUserInteraction = () => {
    if (!getAudioStatus()) {
      initEngineSound();
      const btnAudio = document.getElementById("btnAudio");
      if (btnAudio && getAudioStatus()) {
        btnAudio.innerHTML = "🔊 Synth Sound: ON";
        btnAudio.classList.add("neon-shadow-orange");
        btnAudio.classList.remove("bg-cyan-500/20", "text-cyan-400", "border-cyan-500/50");
      }
    }
  };

  // Helper callbacks
  const onInputTriggered = () => {
    tryStartAudioOnUserInteraction();
    breakAutopilotUI((state) => {
      // Sync local autopilot status
    });
  };


  const onResetPhysics = () => {
    resetPhysics();
    if (scene && scene.customData && scene.customData.carBox) {
      scene.customData.carBox.position.copyFrom(carPhysics.position);
      scene.customData.carBox.rotation.set(0, -carPhysics.heading, 0);
    }
  };

  // 3. Initialize Input bindings
  initInput(onInputTriggered, onResetPhysics);

  // Initialize Pause Menu
  initPauseMenu();

  // 4. Initialize UI Action listeners
  initUI(
    (newAutopilotState) => {
      // Handle autopilot toggle changes manually
    },
    (newTargetDayNight) => {
      // Handle Day/Night target changes manually
    }
  );

  // 4.1. Initialize Audio UI toggle button click listeners
  const btnAudio = document.getElementById("btnAudio");
  if (btnAudio) {
    btnAudio.addEventListener("click", () => {
      const active = getAudioStatus();
      if (active) {
        muteEngineSound();
        btnAudio.innerHTML = "🔊 Synth Sound: OFF";
        btnAudio.classList.remove("neon-shadow-orange");
        btnAudio.classList.add("bg-cyan-500/20", "text-cyan-400", "border-cyan-500/50");
      } else {
        initEngineSound();
        btnAudio.innerHTML = "🔊 Synth Sound: ON";
        btnAudio.classList.add("neon-shadow-orange");
        btnAudio.classList.remove("bg-cyan-500/20", "text-cyan-400", "border-cyan-500/50");
      }
    });
  }


  // 5. Create Scene composition
  scene = createScene(engine, canvas, carPhysics.position);
  window.activeScene = scene;

  // 6. Frame tick listener
  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000.0;
    if (dt > 0.1) return; // Prevent massive frame jumps

    // Freeze update frame logic if paused
    if (getIsPaused()) return;

    timeElapsed += dt;

    const data = scene.customData;
    const isAutopilot = autopilot; // Import live binding from ui.js

    // --- DAY/NIGHT TRANSITION LERP ---
    const currentDayNightVal = updateUI(dt, carPhysics.velocity);
    
    // Update shader uniforms
    data.carMaterial.setFloat("uDayNight", currentDayNightVal);
    data.groundMaterial.setFloat("uDayNight", currentDayNightVal);
    
    // Update skybox material uniforms if present
    if (data.skyboxMaterial) {
      data.skyboxMaterial.setFloat("uDayNight", currentDayNightVal);
      data.skyboxMaterial.setFloat("time", timeElapsed);
    }
    
    // Update live warm headlights and random flicker states
    updateHeadlights(currentDayNightVal);
    
    // Update headlights projection vectors on ground material
    if (data.groundMaterial) {
      if (data.headlightL && data.headlightR && data.carBox) {
        const worldMatrix = data.carBox.getWorldMatrix();
        
        // Compute absolute world positions using the car's world matrix
        const worldPosL = BABYLON.Vector3.TransformCoordinates(data.headlightL.position, worldMatrix);
        const worldPosR = BABYLON.Vector3.TransformCoordinates(data.headlightR.position, worldMatrix);
        
        // Compute world direction of headlights (using +X forward, lowered trajectory)
        const localDir = new BABYLON.Vector3(1, -0.22, 0).normalize();
        const worldDir = BABYLON.Vector3.TransformNormal(localDir, worldMatrix).normalize();
        
        data.groundMaterial.setVector3("uHeadlightPosL", worldPosL);
        data.groundMaterial.setVector3("uHeadlightPosR", worldPosR);
        data.groundMaterial.setVector3("uHeadlightDir", worldDir);
        
        // Expose independent flickering intensities
        data.groundMaterial.setFloat("uHeadlightLIntensity", data.headlightL.intensity);
        data.groundMaterial.setFloat("uHeadlightRIntensity", data.headlightR.intensity);
      } else {
        data.groundMaterial.setFloat("uHeadlightLIntensity", 0.0);
        data.groundMaterial.setFloat("uHeadlightRIntensity", 0.0);
      }
    }
    
    // Smoothly color ambient clearColor matches
    scene.clearColor.r = BABYLON.Scalar.Lerp(0.04, 0.92, currentDayNightVal);
    scene.clearColor.g = BABYLON.Scalar.Lerp(0.015, 0.88, currentDayNightVal);
    scene.clearColor.b = BABYLON.Scalar.Lerp(0.015, 0.84, currentDayNightVal);

    // Morph horizon Pyramids neon color to clean light gold during the day (Map 1 only)
    if (data.synthMat) {
      const pColor = BABYLON.Color3.Lerp(new BABYLON.Color3(1.0, 0.2, 0.0), new BABYLON.Color3(0.5, 0.4, 0.3), currentDayNightVal);
      data.synthMat.emissiveColor.copyFrom(pColor);
    }

    // Modulate ambient and light parameters
    data.sunLight.intensity = BABYLON.Scalar.Lerp(0.1, 1.3, currentDayNightVal);
    const dynamicSunDir = BABYLON.Vector3.Lerp(new BABYLON.Vector3(0, -1, 0), uLightDirValue, currentDayNightVal).normalize();
    data.sunLight.direction.copyFrom(dynamicSunDir);

    // --- VEHICLE DYNAMICS UPDATES ---
    updatePhysics(dt, keys, touchState, isAutopilot, timeElapsed, data.carBox);

    // --- DYNAMIC INTERACTIVE MAP ELEMENTS (Boost pads, obstacles, checkpoints, wormholes) ---
    updateMapInteractions(scene, dt, timeElapsed);

    // --- AUDIO SYNTHESIS DYNAMIC REV CONTROLLER ---
    const throttlePressed = keys.w || touchState.gas || (isAutopilot && Math.abs(carPhysics.velocity) < carPhysics.maxSpeed);
    const brakingPressed = keys.s || touchState.brake || keys.space;
    const rpmValue = parseInt(document.getElementById("rpmValue")?.innerText || "1200", 10);
    updateEngineSound(rpmValue, throttlePressed, brakingPressed);



    // Sync engine calculation output to SDF matrix parameters
    data.carBox.computeWorldMatrix(true);
    const worldInverse = data.carBox.getWorldMatrix().clone().invert();

    data.carMaterial.setMatrix("uWorldInverse", worldInverse);
    data.carMaterial.setVector3("uCameraPos", data.camera.position);
    data.carMaterial.setFloat("uWheelRotation", carPhysics.wheelRotation);
    data.carMaterial.setFloat("uSteeringAngle", carPhysics.steeringAngle);
    data.carMaterial.setVector3("uLightDir", dynamicSunDir);
    data.carMaterial.setFloat("time", timeElapsed);

    // --- PARTICLES DRIFT FX CONTROLLER ---
    const slip = Math.abs(carPhysics.steeringAngle) * (Math.abs(carPhysics.velocity) / carPhysics.maxSpeed);
    if (Math.abs(carPhysics.velocity) > 1.5) {
      data.driftParticles.emitRate = Math.floor(10 + slip * 85);
      // Match particle tone to ground grid theme color dynamics
      if (targetDayNight === 1.0) {
        data.driftParticles.color1 = new BABYLON.Color4(0.85, 0.72, 0.60, 0.25);
        data.driftParticles.color2 = new BABYLON.Color4(0.9, 0.78, 0.65, 0.1);
      } else {
        data.driftParticles.color1 = new BABYLON.Color4(1.0, 0.35, 0.0, 0.4);
        data.driftParticles.color2 = new BABYLON.Color4(1.0, 0.15, 0.0, 0.15);
      }
    } else {
      data.driftParticles.emitRate = 0;
    }

    // --- CINEMATIC SMOOTH CAMERA CONTROLLER ---
    const backVec = data.carBox.getDirection(new BABYLON.Vector3(-1, 0, 0));
    backVec.y = 0.28; // Look down from slightly above
    backVec.normalize();

    const idealPos = carPhysics.position.add(backVec.scale(2.9)); // Stay back distance
    idealPos.y += 0.82; // Adjust vertical height level

    data.camera.position = BABYLON.Vector3.Lerp(data.camera.position, idealPos, 4.5 * dt);

    // Target center point slightly forward of cockpit for immersive tracking
    const focusFront = data.carBox.getDirection(new BABYLON.Vector3(1, 0, 0)).scale(0.45);
    data.camera.setTarget(carPhysics.position.add(focusFront));
  });

  // 7. Start render loop
  engine.runRenderLoop(() => {
    if (scene) scene.render();
  });

  // 8. Handle browser resizing gracefully
  window.addEventListener("resize", () => {
    engine.resize();
  });
});
