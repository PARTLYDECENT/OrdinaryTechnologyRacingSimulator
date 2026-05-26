// Input state containers
export const keys = {
  w: false,
  s: false,
  a: false,
  d: false,
  space: false
};

export const touchState = {
  gas: false,
  brake: false,
  left: false,
  right: false
};

// Initializer to bind events
export function initInput(onInputTriggered, onResetPhysics) {
  // Prevent browser scrolling on navigation controls
  window.addEventListener("keydown", function (e) {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
      e.preventDefault();
    }
  }, { passive: false });

  // Key Down Events
  window.addEventListener("keydown", (e) => {
    let key = e.key.toLowerCase();
    let triggered = false;

    if (key === "arrowup" || key === "w") { keys.w = true; triggered = true; }
    if (key === "arrowdown" || key === "s") { keys.s = true; triggered = true; }
    if (key === "arrowleft" || key === "a") { keys.a = true; triggered = true; }
    if (key === "arrowright" || key === "d") { keys.d = true; triggered = true; }
    if (e.code === "Space") { keys.space = true; triggered = true; }
    
    if (triggered && onInputTriggered) {
      onInputTriggered();
    }

    if (key === "r" && onResetPhysics) {
      onResetPhysics();
      if (onInputTriggered) onInputTriggered();
    }
  });

  // Key Up Events
  window.addEventListener("keyup", (e) => {
    let key = e.key.toLowerCase();
    if (key === "arrowup" || key === "w") keys.w = false;
    if (key === "arrowdown" || key === "s") keys.s = false;
    if (key === "arrowleft" || key === "a") keys.a = false;
    if (key === "arrowright" || key === "d") keys.d = false;
    if (e.code === "Space") keys.space = false;
  });

  // Touch & Pointer Controls helper
  function setupTouchButton(id, stateProp) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const press = () => {
      touchState[stateProp] = true;
      if (onInputTriggered) onInputTriggered();
    };
    
    const release = () => {
      touchState[stateProp] = false;
    };

    btn.addEventListener("touchstart", (e) => { e.preventDefault(); press(); });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); release(); });
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
  }

  // Setup mobile HUD touch events
  setupTouchButton("btnGas", "gas");
  setupTouchButton("btnBrake", "brake");
  setupTouchButton("btnLeft", "left");
  setupTouchButton("btnRight", "right");
}
