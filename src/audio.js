let audioCtx = null;
let engineOsc1 = null;
let engineOsc2 = null;
let subOsc = null;
let engineGain = null;
let lpFilter = null;
let isAudioEnabled = false;

/**
 * Initializes the Web Audio API context and cybernetic synthesizer network
 */
export function initEngineSound() {
  if (audioCtx) {
    // If context is suspended (browser autoplay policy), resume it
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isAudioEnabled = true;
    return true;
  }

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Gain node for absolute volume
    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    // Deep lowpass filter to emulate a massive combustion/induction block sound
    lpFilter = audioCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(140, audioCtx.currentTime); // Keep it warm and deep
    lpFilter.Q.setValueAtTime(3.0, audioCtx.currentTime); // Resonant hum!

    // Primary engine cylinder oscillator (sawtooth for aggressive cyber vibe)
    engineOsc1 = audioCtx.createOscillator();
    engineOsc1.type = 'sawtooth';
    engineOsc1.frequency.setValueAtTime(55, audioCtx.currentTime); // 55Hz base idle

    // Secondary cylinder oscillator (offset frequency for pitch beating / thick texture)
    engineOsc2 = audioCtx.createOscillator();
    engineOsc2.type = 'triangle';
    engineOsc2.frequency.setValueAtTime(55.4, audioCtx.currentTime);

    // Sub-bass rumble oscillator (adds massive sub-woofer satisfaction)
    subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(27.5, audioCtx.currentTime);

    // Wire up synthesizer network
    engineOsc1.connect(lpFilter);
    engineOsc2.connect(lpFilter);
    subOsc.connect(lpFilter);
    lpFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);

    // Start oscillators
    engineOsc1.start();
    engineOsc2.start();
    subOsc.start();

    isAudioEnabled = true;
    return true;
  } catch (err) {
    console.error("Failed to initialize Web Audio engine:", err);
    return false;
  }
}

/**
 * Dynamically pitch and amplitude modulate the engine sound based on vehicle dynamics
 */
export function updateEngineSound(rpm, isThrottlePressed, isBraking) {
  if (!audioCtx || !isAudioEnabled || !engineGain) return;

  // Map RPM (1200 - 8000) to pitch base frequency (35Hz - 165Hz)
  const baseFreq = 32.0 + (rpm / 8000) * 128.0;

  // Set target frequencies with smooth linear ramps (emulates mechanical throttle lag)
  engineOsc1.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.08);
  engineOsc2.frequency.setTargetAtTime(baseFreq * 1.015, audioCtx.currentTime, 0.08); // micro detuned offset
  subOsc.frequency.setTargetAtTime(baseFreq * 0.5, audioCtx.currentTime, 0.08); // octave below

  // Dynamically slide lowpass filter cutoff so the engine "screams" slightly more at high RPM
  const filterFreq = 120.0 + (rpm / 8000) * 280.0;
  lpFilter.frequency.setTargetAtTime(filterFreq, audioCtx.currentTime, 0.1);

  // Set gains: louder when hitting throttle, quieter at idle, low hum during heavy braking
  let targetVolume = 0.02; // Base idle volume
  if (isThrottlePressed) {
    targetVolume = 0.095; // Throttle rev loud
  } else if (isBraking) {
    targetVolume = 0.008; // Quiet down during braking friction
  }

  engineGain.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.08);
}

/**
 * Completely silences the synthesizer network
 */
export function muteEngineSound() {
  if (engineGain) {
    engineGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.05);
  }
  isAudioEnabled = false;
}

/**
 * Returns audio activation status
 */
export function getAudioStatus() {
  return isAudioEnabled;
}
