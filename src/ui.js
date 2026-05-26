// Day / Night state variables
export let targetDayNight = 0.0; // 0.0 is night, 1.0 is day
export let currentDayNight = 0.0;
export let autopilot = true;

// Initialize UI event handlers
export function initUI(onAutopilotToggle, onDayNightToggle) {
  // Day/Night switch button handler
  const btnDayNight = document.getElementById("btnDayNight");
  if (btnDayNight) {
    btnDayNight.addEventListener("click", () => {
      if (targetDayNight === 0.0) {
        targetDayNight = 1.0;
        btnDayNight.innerHTML = "Switch to Night Mode";
        btnDayNight.classList.add("bg-red-500/20", "text-red-400", "border-red-500/50");
        btnDayNight.classList.remove("bg-orange-500/20", "text-orange-400", "border-orange-500/50");
      } else {
        targetDayNight = 0.0;
        btnDayNight.innerHTML = "Switch to Day Mode";
        btnDayNight.classList.remove("bg-red-500/20", "text-red-400", "border-red-500/50");
        btnDayNight.classList.add("bg-orange-500/20", "text-orange-400", "border-orange-500/50");
      }
      if (onDayNightToggle) onDayNightToggle(targetDayNight);
    });
  }

  // Autopilot switch button handler
  const btnAutopilot = document.getElementById("btnAutopilot");
  if (btnAutopilot) {
    btnAutopilot.addEventListener("click", () => {
      autopilot = !autopilot;
      syncAutopilotUI(onAutopilotToggle);
    });
  }
}

// Sync autopilot UI status
function syncAutopilotUI(onAutopilotToggle) {
  const btn = document.getElementById("btnAutopilot");
  if (!btn) return;
  
  if (autopilot) {
    btn.innerHTML = "Autopilot: ON";
    btn.classList.add("neon-shadow-orange");
  } else {
    btn.innerHTML = "Autopilot: OFF";
    btn.classList.remove("neon-shadow-orange");
  }
  
  if (onAutopilotToggle) onAutopilotToggle(autopilot);
}

// Set autopilot state programmatically
export function setAutopilot(state, onAutopilotToggle) {
  if (autopilot !== state) {
    autopilot = state;
    syncAutopilotUI(onAutopilotToggle);
  }
}

// Handle override toast and sync button state
export function breakAutopilotUI(onAutopilotToggle) {
  if (autopilot) {
    autopilot = false;
    syncAutopilotUI(onAutopilotToggle);

    // Show Manual Override Notification briefly
    const toast = document.getElementById("manualOverrideToast");
    if (toast) {
      toast.style.opacity = "1";
      setTimeout(() => { toast.style.opacity = "0"; }, 2000);
    }
  }
}

// Update UI dashboard and interpolate day/night transitions
export function updateUI(dt, velocity) {
  // Smooth LERP for day/night target
  if (typeof BABYLON !== 'undefined') {
    currentDayNight = BABYLON.Scalar.Lerp(currentDayNight, targetDayNight, 4.0 * dt);
  } else {
    currentDayNight = currentDayNight + (targetDayNight - currentDayNight) * (4.0 * dt);
  }

  // Speedometer metrics
  const roundedSpeed = Math.floor(Math.abs(velocity) * 5.8);
  const speedEl = document.getElementById("speedValue");
  if (speedEl) speedEl.innerText = roundedSpeed;

  const rpm = Math.floor(1200 + (roundedSpeed % 35) * 140);
  const rpmEl = document.getElementById("rpmValue");
  if (rpmEl) rpmEl.innerText = rpm;

  // Simple simulated gearing calculations
  let gear = "D";
  if (velocity < -0.1) {
    gear = "R";
  } else if (roundedSpeed === 0) {
    gear = "P";
  } else if (roundedSpeed > 60) {
    gear = "5";
  } else if (roundedSpeed > 45) {
    gear = "4";
  } else if (roundedSpeed > 30) {
    gear = "3";
  } else if (roundedSpeed > 15) {
    gear = "2";
  } else {
    gear = "1";
  }
  
  const gearEl = document.getElementById("gearValue");
  if (gearEl) gearEl.innerText = "GEAR: " + gear;

  return currentDayNight;
}
