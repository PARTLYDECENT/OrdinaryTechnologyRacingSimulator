import { keys, touchState } from './input.js';

// Day / Night state variables
export let targetDayNight = 0.0; // 0.0 is night, 1.0 is day
export let currentDayNight = 0.0;
export let autopilot = true;

// ⚙️ Transmission State Object
export const transmissionState = {
  type: "AUTO", // "AUTO" or "MANUAL"
  gear: 1       // 1-6, "R", "P"
};

// 🪙 Coins Currency & Shop upgrades state
export let coins = 0;
export const boughtUpgrades = {
  turbo: false,
  exhaust: false,
  weight: false,
  cams: false
};

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

  // ⚙️ Transmission switch button handler
  const btnTransmission = document.getElementById("btnTransmission");
  if (btnTransmission) {
    btnTransmission.addEventListener("click", () => {
      if (transmissionState.type === "AUTO") {
        transmissionState.type = "MANUAL";
        transmissionState.gear = 1;
        btnTransmission.innerHTML = "⚙️ Trans: MANUAL";
        btnTransmission.classList.add("bg-indigo-500/20", "text-indigo-400", "border-indigo-500/50");
        btnTransmission.classList.remove("bg-emerald-500/20", "text-emerald-400", "border-emerald-500/50");
        showToast("⚙️ MANUAL TRANSMISSION ENABLED. USE E/Q KEYS TO SHIFT!");
      } else {
        transmissionState.type = "AUTO";
        btnTransmission.innerHTML = "⚙️ Trans: AUTO";
        btnTransmission.classList.remove("bg-indigo-500/20", "text-indigo-400", "border-indigo-500/50");
        btnTransmission.classList.add("bg-emerald-500/20", "text-emerald-400", "border-emerald-500/50");
        showToast("⚙️ AUTOMATIC TRANSMISSION ENGAGED");
      }
    });
  }

  // 🛒 Upgrades Shop Toggle panel
  const btnShop = document.getElementById("btnShop");
  const shopPanel = document.getElementById("shopPanel");
  if (btnShop && shopPanel) {
    btnShop.addEventListener("click", (e) => {
      e.stopPropagation();
      shopPanel.classList.toggle("hidden");
    });
    // Close shop on clicking outside
    document.addEventListener("click", (e) => {
      if (shopPanel && !shopPanel.contains(e.target) && e.target !== btnShop) {
        shopPanel.classList.add("hidden");
      }
    });
  }

  // Upgrades purchase listeners
  setupUpgradeButton("btnBuyTurbo", 50, "turbo", "Stage 1 Turbo (+20% Acceleration)", () => {
    // Stage 1 Turbo bought
    showToast("🚀 STAGE 1 TURBO INSTALLED! ACCEL +20%", "success");
  });

  setupUpgradeButton("btnBuyExhaust", 80, "exhaust", "Racing Exhaust (Exhaust Backfires)", () => {
    window.racingExhaustBought = true;
    showToast("🔥 RACING EXHAUST INSTALLED! POP POP BACKFIRES+", "success");
  });

  setupUpgradeButton("btnBuyWeight", 120, "weight", "Weight Reduction (+15% Max Speed)", () => {
    showToast("🏎️ WEIGHT REDUCTION COMPLETE! SPEED +15%", "success");
  });

  setupUpgradeButton("btnBuyCams", 200, "cams", "High-Lift Cams (Deep Mechanical Pitch)", () => {
    window.highLiftCamsBought = true;
    showToast("🛠️ HIGH-LIFT CAMS INSTALLED! AGGRESSIVE ENGINE GRIND+", "success");
  });

  // Global helper to add coins procedurally from collision pickups
  window.addCoins = (amount) => {
    coins += amount;
    const coinEl = document.getElementById("coinCount");
    if (coinEl) coinEl.innerText = coins;
    if (window.playCoinSFX) window.playCoinSFX();
    syncUpgradeButtonsAvailability();
  };

  // Keyboard shifting keydown handler (E to shift up, Q to shift down)
  window.addEventListener("keydown", (e) => {
    if (transmissionState.type === "MANUAL") {
      let shifted = false;
      const key = e.key.toLowerCase();
      if (key === 'e') { // shift up
        if (transmissionState.gear === "R") {
          transmissionState.gear = 1;
          shifted = true;
        } else if (transmissionState.gear === "P") {
          transmissionState.gear = 1;
          shifted = true;
        } else if (typeof transmissionState.gear === 'number' && transmissionState.gear < 6) {
          transmissionState.gear++;
          shifted = true;
        }
      } else if (key === 'q') { // shift down
        if (transmissionState.gear === 1) {
          transmissionState.gear = "P";
          shifted = true;
        } else if (transmissionState.gear === "P") {
          transmissionState.gear = "R";
          shifted = true;
        } else if (typeof transmissionState.gear === 'number' && transmissionState.gear > 1) {
          transmissionState.gear--;
          shifted = true;
        }
      }
      if (shifted) {
        showToast(`⚙️ SHIFTED TO GEAR ${transmissionState.gear}`, "boost");
        // Play dynamic retro shifting mechanical sound
        if (window.audioCtx) {
          const ctx = window.audioCtx;
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(12, now + 0.05);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          osc.connect(window.masterGain || ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
        }
      }
    }
  });
}

// Set up purchase buttons logic
function setupUpgradeButton(btnId, cost, upgradeKey, label, onSuccess) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (boughtUpgrades[upgradeKey]) return;
    
    if (coins >= cost) {
      coins -= cost;
      boughtUpgrades[upgradeKey] = true;
      const coinEl = document.getElementById("coinCount");
      if (coinEl) coinEl.innerText = coins;
      
      btn.innerText = "OWNED";
      btn.classList.add("bg-green-500/20", "text-green-400", "border-green-500/50");
      btn.classList.remove("bg-yellow-500/20", "text-yellow-400", "border-yellow-500/50");
      btn.disabled = true;
      
      if (onSuccess) onSuccess();
      syncUpgradeButtonsAvailability();
    } else {
      showToast(`⚠️ INSUFFICIENT COINS! Need 🪙 ${cost} for ${label}`, "hazard");
    }
  });
}

// Sync buttons styling if coin count matches cost
function syncUpgradeButtonsAvailability() {
  const upgrades = [
    { id: "btnBuyTurbo", cost: 50, key: "turbo" },
    { id: "btnBuyExhaust", cost: 80, key: "exhaust" },
    { id: "btnBuyWeight", cost: 120, key: "weight" },
    { id: "btnBuyCams", cost: 200, key: "cams" }
  ];
  
  upgrades.forEach(up => {
    const btn = document.getElementById(up.id);
    if (!btn || boughtUpgrades[up.key]) return;
    
    if (coins >= up.cost) {
      btn.classList.add("bg-yellow-500/40", "border-yellow-400");
    } else {
      btn.classList.remove("bg-yellow-500/40", "border-yellow-400");
    }
  });
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
    showToast("⚡ MANUAL SYSTEM ENGAGED");
  }
}

// Dynamically trigger styled toast notifications on the dashboard
export function showToast(message, colorStyle = null) {
  const toast = document.getElementById("manualOverrideToast");
  if (toast) {
    toast.innerHTML = message;
    
    // Reset styles
    toast.className = "self-center glass-panel px-4 py-2 rounded-full text-xs font-semibold border transition-opacity duration-500 shadow-lg pointer-events-none";
    
    if (colorStyle === "boost") {
      toast.classList.add("text-cyan-400", "border-cyan-500/50", "bg-cyan-500/10");
    } else if (colorStyle === "hazard") {
      toast.classList.add("text-red-400", "border-red-500/50", "bg-red-500/10");
    } else if (colorStyle === "success") {
      toast.classList.add("text-yellow-400", "border-yellow-500/50", "bg-yellow-500/10");
    } else if (colorStyle === "warp") {
      toast.classList.add("text-fuchsia-400", "border-fuchsia-500/50", "bg-fuchsia-500/10");
    } else {
      toast.classList.add("text-orange-400", "border-orange-500/30");
    }

    toast.style.opacity = "1";
    
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
    }, 2500);
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

  // Check if gas pedal is pressed
  const isThrottlePressed = keys.w || touchState.gas || (autopilot && roundedSpeed < 120);

  let gear = 1;
  let rpm = 1200;

  if (transmissionState.type === "AUTO") {
    // ───── AUTOMATIC GEARBOX SIMULATION ─────
    if (velocity < -0.1) {
      gear = "R";
      const revSpeed = Math.abs(roundedSpeed);
      rpm = Math.floor(1200 + (revSpeed / 48) * 7800); // Reverse revs up to 9000
    } else if (roundedSpeed === 0) {
      gear = "P";
      rpm = isThrottlePressed ? 3500 : 1200;
    } else {
      // 6-speed sequential forward gears
      if (roundedSpeed < 22) {
        gear = 1;
        const ratio = roundedSpeed / 22;
        rpm = Math.floor(1200 + ratio * 8799); // 1200 to 9999
      } else if (roundedSpeed < 44) {
        gear = 2;
        const ratio = (roundedSpeed - 22) / (44 - 22);
        rpm = Math.floor(4500 + ratio * 5499); // 4500 to 9999
      } else if (roundedSpeed < 68) {
        gear = 3;
        const ratio = (roundedSpeed - 44) / (68 - 44);
        rpm = Math.floor(5000 + ratio * 4999); // 5000 to 9999
      } else if (roundedSpeed < 92) {
        gear = 4;
        const ratio = (roundedSpeed - 68) / (92 - 68);
        rpm = Math.floor(5500 + ratio * 4499); // 5500 to 9999
      } else if (roundedSpeed < 114) {
        gear = 5;
        const ratio = (roundedSpeed - 92) / (114 - 92);
        rpm = Math.floor(6000 + ratio * 3999); // 6000 to 9999
      } else {
        gear = 6;
        const ratio = Math.min(1.0, (roundedSpeed - 114) / 15);
        rpm = Math.floor(6500 + ratio * 3499); // 6500 to 9999
      }
    }
  } else {
    // ───── MANUAL GEARBOX SIMULATION ─────
    gear = transmissionState.gear;
    if (gear === "R") {
      const revSpeed = Math.abs(roundedSpeed);
      rpm = Math.min(9999, Math.floor(1200 + (revSpeed / 12) * 8799));
    } else if (gear === "P") {
      rpm = isThrottlePressed ? 3500 : 1200;
    } else {
      // 6-speed manual bounds
      const bounds = {
        1: { minSpeed: 0, maxSpeed: 22, minRpm: 1200, maxRpm: 9999 },
        2: { minSpeed: 20, maxSpeed: 44, minRpm: 4500, maxRpm: 9999 },
        3: { minSpeed: 40, maxSpeed: 68, minRpm: 5000, maxRpm: 9999 },
        4: { minSpeed: 65, maxSpeed: 92, minRpm: 5500, maxRpm: 9999 },
        5: { minSpeed: 88, maxSpeed: 114, minRpm: 6000, maxRpm: 9999 },
        6: { minSpeed: 110, maxSpeed: 130, minRpm: 6500, maxRpm: 9999 }
      };
      const b = bounds[gear] || bounds[6];

      if (roundedSpeed < b.minSpeed) {
        const lugRatio = b.minSpeed > 0 ? (roundedSpeed / b.minSpeed) : 0.0;
        rpm = Math.floor(1000 + lugRatio * (b.minRpm - 1000));
      } else {
        const ratio = Math.min(1.0, (roundedSpeed - b.minSpeed) / (b.maxSpeed - b.minSpeed));
        rpm = Math.floor(b.minRpm + ratio * (b.maxRpm - b.minRpm));
      }
      
      // If pressing gas and speed is at the gear limit, bounce RPM off rev limiter
      if (isThrottlePressed && roundedSpeed >= b.maxSpeed) {
        rpm = 9950 + Math.floor(Math.random() * 49);
      }
    }
  }

  const rpmEl = document.getElementById("rpmValue");
  if (rpmEl) rpmEl.innerText = rpm;

  const gearEl = document.getElementById("gearValue");
  if (gearEl) gearEl.innerText = "GEAR: " + gear;

  return currentDayNight;
}
