import { carPhysics } from '../physics.js';

let audioCtx = null;
let engineOsc1 = null;
let engineOsc2 = null;
let subOsc = null;
let subGain = null;
let turboOsc = null;
let turboGain = null;
let pistonLfo = null;
let pistonGain = null;
let waveShaper = null;
let pannerNode = null;
let engineGain = null;
let masterGain = null;
let lpFilter = null;
let hpFilter = null;
let isAudioEnabled = false;
let wasThrottlePressed = false;

function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function triggerPop(time, rpm, type) {
  if (!audioCtx || !masterGain) return;

  const intensity = Math.min(1.0, rpm / 8000.0);
  const bufferSize = audioCtx.sampleRate * 0.12; // slightly longer pops
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2.0 - 1.0) * Math.exp(-i * (0.003 + Math.random() * 0.005));
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;

  const popFilter = audioCtx.createBiquadFilter();
  popFilter.type = 'bandpass';

  let popFreq = 80 + Math.random() * 90; // much deeper backfires
  let qVal = 2.5;
  let popVol = 0.8 * intensity;

  if (type === "car_red") {
    popFreq = 120 + Math.random() * 150;
    qVal = 1.5;
    popVol = 1.2 * intensity;
  } else if (type === "truck") {
    popFreq = 40 + Math.random() * 40;
    qVal = 4.0;
    popVol = 0.7 * intensity;
  } else if (type === "minitruck") {
    popFreq = 90 + Math.random() * 80;
    qVal = 2.0;
    popVol = 1.0 * intensity;
  }

  popFilter.frequency.setValueAtTime(popFreq, time);
  popFilter.Q.setValueAtTime(qVal, time);

  const popGain = audioCtx.createGain();
  popGain.gain.setValueAtTime(popVol, time);
  popGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

  noiseSource.connect(popFilter);
  popFilter.connect(popGain);
  popGain.connect(masterGain);

  noiseSource.start(time);
  noiseSource.stop(time + 0.12);
}

export function initEngineSound() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isAudioEnabled = true;
    return true;
  }

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Master output volume — THIS IS THE MAIN LOUDNESS KNOB
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Engine channel gain (modulated per-frame)
    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    // Stereo panner for steering G-force immersion
    pannerNode = audioCtx.createStereoPanner();
    pannerNode.pan.setValueAtTime(0.0, audioCtx.currentTime);

    // WaveShaper distortion for raw cylinder grit
    waveShaper = audioCtx.createWaveShaper();
    waveShaper.curve = makeDistortionCurve(15);
    waveShaper.oversample = '4x';

    // Lowpass — tightly restricted to remove buzzy high-frequency saw screeches
    lpFilter = audioCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(250, audioCtx.currentTime);
    lpFilter.Q.setValueAtTime(3.0, audioCtx.currentTime);

    // Highpass — kept extremely low (10-15 Hz) just to filter DC offset/subsonic rumble
    hpFilter = audioCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(10, audioCtx.currentTime);
    hpFilter.Q.setValueAtTime(0.7, audioCtx.currentTime);

    // Primary oscillator — aggressive sawtooth cylinder tone
    engineOsc1 = audioCtx.createOscillator();
    engineOsc1.type = 'sawtooth';
    engineOsc1.frequency.setValueAtTime(40, audioCtx.currentTime);

    // Secondary oscillator — detuned for thick stereo width
    engineOsc2 = audioCtx.createOscillator();
    engineOsc2.type = 'triangle';
    engineOsc2.frequency.setValueAtTime(40.5, audioCtx.currentTime);

    // Sub-bass — pure sine wave for massive rumble
    subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(20, audioCtx.currentTime);

    subGain = audioCtx.createGain();
    subGain.gain.setValueAtTime(0.4, audioCtx.currentTime);

    // Turbo whine oscillator — bypassed lpFilter but kept low-pitched/subtle
    turboOsc = audioCtx.createOscillator();
    turboOsc.type = 'sine';
    turboOsc.frequency.setValueAtTime(300, audioCtx.currentTime);

    turboGain = audioCtx.createGain();
    turboGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    // Piston firing rate LFO — creates the mechanical throb texture
    pistonLfo = audioCtx.createOscillator();
    pistonLfo.type = 'sawtooth';
    pistonLfo.frequency.setValueAtTime(6.0, audioCtx.currentTime);

    pistonGain = audioCtx.createGain();
    pistonGain.gain.setValueAtTime(12.0, audioCtx.currentTime);

    // LFO modulation → oscillator frequencies
    pistonLfo.connect(pistonGain);
    pistonGain.connect(engineOsc1.frequency);
    pistonGain.connect(engineOsc2.frequency);

    // Main signal chain: oscillators → distortion → LP → HP → panner → engine gain → master
    engineOsc1.connect(waveShaper);
    engineOsc2.connect(waveShaper);
    
    // CRITICAL: Connect subOsc DIRECTLY to subGain and lpFilter, bypassing waveShaper!
    // Passing a clean sub-sine wave through a distortion node squares it and creates high-pitched buzz.
    // Bypassing distortion keeps the sub-bass completely pure, deep, and thundering.
    subOsc.connect(subGain);
    subGain.connect(lpFilter);

    waveShaper.connect(lpFilter);
    lpFilter.connect(hpFilter);
    hpFilter.connect(pannerNode);
    pannerNode.connect(engineGain);
    engineGain.connect(masterGain);

    // Turbo bypass: turbo → turboGain → masterGain
    turboOsc.connect(turboGain);
    turboGain.connect(masterGain);

    // Fire up all oscillators
    engineOsc1.start();
    engineOsc2.start();
    subOsc.start();
    turboOsc.start();
    pistonLfo.start();

    isAudioEnabled = true;
    return true;
  } catch (err) {
    console.error("Failed to initialize engine audio synthesizer:", err);
    return false;
  }
}

export function updateEngineSound(rpm, isThrottlePressed, isBraking) {
  if (!audioCtx || !isAudioEnabled || !engineGain || !subGain) return;

  // Read active vehicle type from scene data
  const type = (window.activeScene && window.activeScene.customData)
    ? (window.activeScene.customData.activeVehicleType || "car")
    : "car";

  const steerAngle = carPhysics.steeringAngle || 0.0;
  const rpmNorm = Math.min(1.0, rpm / 8000.0); // normalized 0–1

  // ===================================================================
  //  VEHICLE-SPECIFIC LOW ENGINE RUMBLE PROFILES
  // ===================================================================
  let baseFreq, detuning, osc1Type, osc2Type;
  let pistonRate, modDepth;
  let tFreq, tMaxVol;
  let lpCutoff, lpQ, hpCutoff;
  let distortion;
  let idleVol, throttleVol, brakeVol;
  let subVolume;

  if (type === "car_red") {
    // ───── 🏎️ RED ACE: AGGRESSIVE RACING V10 RUMBLE ─────
    baseFreq = 38 + rpmNorm * 90;         // deep, beastly V10 growl (38 Hz to 128 Hz)
    detuning = 1.035;
    osc1Type = 'sawtooth';
    osc2Type = 'sawtooth';                // thick double-saw growl

    pistonRate = 8 + rpmNorm * 25;        // fast cylinder pulsing
    modDepth = 15 + rpmNorm * 35;

    tFreq = 400 + rpmNorm * 1200;         // subtle lower-pitched turbo whistle
    tMaxVol = 0.025;

    lpCutoff = 160 + rpmNorm * 480 + (isThrottlePressed ? 150 : 0); // highly rolled off
    lpQ = 2.0 + Math.abs(steerAngle) * 2.0;
    hpCutoff = 14;

    distortion = 22;

    idleVol = 0.28;
    throttleVol = 0.95;                   // extremely loud V10 rumbling presence
    brakeVol = 0.12;
    subVolume = 0.45 + rpmNorm * 0.45;

  } else if (type === "truck") {
    // ───── 🚛 SEMITRUCK: ULTRALOW VISCERAL DIESEL THROB ─────
    baseFreq = 18 + rpmNorm * 32;         // throat-rattling low thrum (18 Hz to 50 Hz)
    detuning = 0.985;
    osc1Type = 'sawtooth';
    osc2Type = 'sine';                    // sub-harmonic overlay

    pistonRate = 1.8 + rpmNorm * 6.0;     // heavy mechanical thuds
    modDepth = 35 + rpmNorm * 45;

    tFreq = 180 + rpmNorm * 450;
    tMaxVol = 0.035;                      // low industrial turbine throb

    lpCutoff = 65 + rpmNorm * 130 + (isThrottlePressed ? 30 : 0); // cuts out all high buzz
    lpQ = 5.0 + Math.abs(steerAngle) * 5.0;
    hpCutoff = 8;                         // full bass pass

    distortion = 6;                       // soft saturation warmth

    idleVol = 0.45;                       // massive loud idling presence
    throttleVol = 0.95;
    brakeVol = 0.18;
    subVolume = 0.6 + rpmNorm * 0.5;

  } else if (type === "minitruck") {
    // ───── 🛻 HANTU-RAYA: THROBBING OFFROAD V-TWIN ─────
    baseFreq = 26 + rpmNorm * 65;         // heavy low V-Twin (26 Hz to 91 Hz)
    detuning = 1.05;                      // heavily detuned uneven firing rhythm
    osc1Type = 'triangle';                // raw steel frame resonant ring
    osc2Type = 'sawtooth';                // low pipe exhaust grind

    pistonRate = 3.5 + rpmNorm * 15.0;    // slower uneven combustion pulses
    modDepth = 22 + rpmNorm * 30;

    tFreq = 250 + rpmNorm * 800;
    tMaxVol = 0.012;                      // barely audible turbo on buggy

    lpCutoff = 110 + rpmNorm * 340 + (isThrottlePressed ? 80 : 0); // pure warm rumble
    lpQ = 3.0 + Math.abs(steerAngle) * 4.0;
    hpCutoff = 10;

    distortion = 20;

    idleVol = 0.26;
    throttleVol = 0.85;
    brakeVol = 0.10;
    subVolume = 0.45 + rpmNorm * 0.45;

  } else {
    // ───── ⚡ SPORTS CAR: DEEP THICK CYBER V8 RUMBLE ─────
    baseFreq = 34 + rpmNorm * 75;         // classic low V8 rumble (34 Hz to 109 Hz)
    detuning = 1.02;
    osc1Type = 'sawtooth';
    osc2Type = 'triangle';

    pistonRate = 5.0 + rpmNorm * 20.0;
    modDepth = 12 + rpmNorm * 25;

    tFreq = 350 + rpmNorm * 1100;
    tMaxVol = 0.02;

    lpCutoff = 130 + rpmNorm * 380 + (isThrottlePressed ? 100 : 0);
    lpQ = 3.0 + Math.abs(steerAngle) * 3.0;
    hpCutoff = 12;

    distortion = 12;

    idleVol = 0.22;
    throttleVol = 0.75;
    brakeVol = 0.08;
    subVolume = 0.35 + rpmNorm * 0.45;
  }

  // ===================================================================
  //  APPLY ALL PARAMETERS WITH SMOOTH RAMPS
  // ===================================================================

  // Set waveform shapes
  if (engineOsc1.type !== osc1Type) engineOsc1.type = osc1Type;
  if (engineOsc2.type !== osc2Type) engineOsc2.type = osc2Type;

  // Update distortion intensity dynamically
  waveShaper.curve = makeDistortionCurve(distortion);

  // Ramp low engine oscillator frequencies
  engineOsc1.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.04);
  engineOsc2.frequency.setTargetAtTime(baseFreq * detuning, audioCtx.currentTime, 0.04);
  subOsc.frequency.setTargetAtTime(baseFreq * 0.5, audioCtx.currentTime, 0.05);

  // Set clean sub-bass volume
  subGain.gain.setTargetAtTime(subVolume, audioCtx.currentTime, 0.04);

  // Piston firing rate LFO throb
  pistonLfo.frequency.setTargetAtTime(pistonRate, audioCtx.currentTime, 0.04);
  pistonGain.gain.setTargetAtTime(modDepth, audioCtx.currentTime, 0.04);

  // Turbocharger whistle
  turboOsc.frequency.setTargetAtTime(tFreq, audioCtx.currentTime, 0.05);
  let targetTurboVol = isThrottlePressed ? (0.001 + rpmNorm * tMaxVol) : 0.0;
  turboGain.gain.setTargetAtTime(targetTurboVol, audioCtx.currentTime, 0.07);

  // Aggressive lowpass filters sweeps
  lpFilter.frequency.setTargetAtTime(lpCutoff, audioCtx.currentTime, 0.06);
  lpFilter.Q.setTargetAtTime(lpQ, audioCtx.currentTime, 0.06);
  hpFilter.frequency.setTargetAtTime(hpCutoff, audioCtx.currentTime, 0.08);

  // ===================================================================
  //  VOLUME CONTROLLER (LOUD AND PUNCHY)
  // ===================================================================
  let targetVol = idleVol;
  if (isThrottlePressed) {
    targetVol = throttleVol;
  } else if (isBraking) {
    targetVol = brakeVol;
  }
  engineGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.04);

  // ===================================================================
  //  STEERING G-FORCE STEREO PANNING
  // ===================================================================
  const targetPan = Math.max(-0.8, Math.min(0.8, steerAngle * 0.7));
  pannerNode.pan.setTargetAtTime(targetPan, audioCtx.currentTime, 0.08);

  // ===================================================================
  //  EXHAUST DEEP BACKFIRES ON THROTTLE LIFT-OFF
  // ===================================================================
  if (wasThrottlePressed && !isThrottlePressed && rpm > 3200) {
    const maxPops = type === "car_red" ? 7 : (type === "truck" ? 3 : 5);
    const numPops = 1 + Math.floor(Math.random() * maxPops);
    for (let i = 0; i < numPops; i++) {
      const delay = i * (0.04 + Math.random() * 0.08);
      triggerPop(audioCtx.currentTime + delay, rpm, type);
    }
  }

  wasThrottlePressed = isThrottlePressed;
}

export function muteEngineSound() {
  if (engineGain) {
    engineGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.04);
  }
  if (turboGain) {
    turboGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.04);
  }
  isAudioEnabled = false;
}

export function getAudioStatus() {
  return isAudioEnabled;
}
