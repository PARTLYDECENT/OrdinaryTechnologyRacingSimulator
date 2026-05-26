// Pause menu state
let isPaused = false;
let currentVehicle = "car"; // "car" or "truck"
let currentMap = "map1";    // "map1", "map2", "map3"
let checkerInterval = null;

export function getIsPaused() {
  return isPaused;
}

export function initPauseMenu() {
  // Inject style block for animated checkered flag and custom transitions
  const style = document.createElement("style");
  style.textContent = `
    .checkered-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .checkered-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .checkered-grid {
      position: absolute;
      inset: 0;
      display: grid;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: rgba(8, 2, 2, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 1;
    }
    .checker-box {
      width: 100%;
      height: 100%;
      background-color: #0b0606;
      transition: background-color 0.5s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-style: preserve-3d;
      perspective: 1000px;
    }
    .checker-box.light {
      background-color: #1a0f0f;
    }
    .checker-box.white {
      background-color: #ffffff;
      box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.15);
    }
    .checker-box.orange {
      background-color: #f97316;
      box-shadow: inset 0 0 15px rgba(249, 115, 22, 0.65), 0 0 15px rgba(249, 115, 22, 0.4);
    }
    .checker-box.red {
      background-color: #ef4444;
      box-shadow: inset 0 0 15px rgba(239, 68, 68, 0.65), 0 0 15px rgba(239, 68, 68, 0.4);
    }
    .checker-box.flip {
      transform: rotateY(180deg);
    }
    .pause-card {
      position: relative;
      z-index: 2;
      background: rgba(18, 8, 8, 0.88);
      border: 1px solid rgba(249, 115, 22, 0.3);
      box-shadow: 0 0 40px rgba(249, 115, 22, 0.25), inset 0 0 20px rgba(0,0,0,0.8);
      border-radius: 24px;
      padding: 2.2rem;
      width: 100%;
      max-width: 420px;
      text-align: center;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      backdrop-filter: blur(10px);
    }
    .checkered-overlay.active .pause-card {
      transform: scale(1) translateY(0);
    }
    
    /* Top persistent header */
    .persistent-header {
      transition: all 0.3s ease;
      background: rgba(18, 8, 8, 0.85);
      border: 1px solid rgba(249, 115, 22, 0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .persistent-header:hover {
      border-color: rgba(249, 115, 22, 0.35);
      box-shadow: 0 0 15px rgba(249, 115, 22, 0.15);
    }
  `;
  document.head.appendChild(style);

  // --- CREATE PERSISTENT FLOATING HEADER ---
  const header = document.createElement("div");
  header.id = "persistentGarageHeader";
  header.className = "persistent-header fixed top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full z-[10005] flex items-center gap-3 shadow-lg pointer-events-auto border border-orange-500/20";
  header.innerHTML = `
    <span class="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
    
    <span class="text-gray-400 text-[10px] font-black uppercase tracking-widest font-mono">Bay:</span>
    <select id="persistentGarageSelect" class="bg-transparent border-none text-orange-400 font-extrabold uppercase text-[11px] tracking-wider focus:outline-none cursor-pointer font-mono hover:text-orange-300 transition-colors">
      <option value="car" class="bg-[#120808] text-white">⚡ Sports Car</option>
      <option value="truck" class="bg-[#120808] text-white">🚛 Semitruck</option>
    </select>
    
    <div class="h-4 w-[1px] bg-orange-500/20 mx-1"></div>
    
    <span class="text-gray-400 text-[10px] font-black uppercase tracking-widest font-mono">Sector:</span>
    <select id="persistentMapSelect" class="bg-transparent border-none text-orange-400 font-extrabold uppercase text-[11px] tracking-wider focus:outline-none cursor-pointer font-mono hover:text-orange-300 transition-colors">
      <option value="map1" class="bg-[#120808] text-white">🌋 Outpost</option>
      <option value="map2" class="bg-[#120808] text-white">🏙️ Neo Tokyo</option>
      <option value="map3" class="bg-[#120808] text-white">🌌 Space Nebula</option>
    </select>
    
    <div class="h-4 w-[1px] bg-orange-500/20 mx-1"></div>
    
    <button id="btnPersistentPause" class="text-orange-500/80 hover:text-orange-400 transition-colors duration-300 text-xs font-bold uppercase font-mono tracking-wider focus:outline-none">
      [ Pause ]
    </button>
  `;
  document.body.appendChild(header);

  // --- CREATE CHECKERED FLAG PAUSE OVERLAY ---
  const overlay = document.createElement("div");
  overlay.id = "pauseOverlay";
  overlay.className = "checkered-overlay";
  overlay.innerHTML = `
    <div class="checkered-grid" id="checkeredGrid"></div>
    <div class="pause-card">
      <div class="flex flex-col items-center gap-1 mb-6">
        <h2 class="text-white text-3xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">SYSTEM PAUSED</h2>
        <div class="w-16 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mt-2"></div>
      </div>
      
      <div class="flex flex-col gap-4 text-left">
        <div>
          <label class="text-gray-400 text-[10px] uppercase tracking-widest font-bold font-mono mb-1.5 block">Garage Bay Vehicle Selection</label>
          <div class="relative">
            <select id="garageSelect" class="w-full bg-black/60 border border-orange-500/40 text-white rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-orange-400 transition-colors duration-300 cursor-pointer appearance-none font-mono">
              <option value="car">⚡ SDF Ignis-Drive (Sports Car)</option>
              <option value="truck">🚛 SDF Semitruck (Heavy Rig)</option>
            </select>
            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-orange-500 text-[10px]">
              ▼
            </div>
          </div>
        </div>

        <div>
          <label class="text-gray-400 text-[10px] uppercase tracking-widest font-bold font-mono mb-1.5 block">Simulation Map Sector</label>
          <div class="relative">
            <select id="mapSelect" class="w-full bg-black/60 border border-orange-500/40 text-white rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-orange-400 transition-colors duration-300 cursor-pointer appearance-none font-mono">
              <option value="map1">🌋 Sector 1: Cyberpunk Outpost</option>
              <option value="map2">🏙️ Sector 2: Neo Tokyo Midnight</option>
              <option value="map3">🌌 Sector 3: Hyper-Space Nebula</option>
            </select>
            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-orange-500 text-[10px]">
              ▼
            </div>
          </div>
        </div>

        <button id="btnResume" class="w-full py-4 mt-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-orange-950/20 hover:scale-[1.02] active:scale-[0.98] text-xs font-mono">
          Resume Simulation
        </button>
      </div>

      <div class="mt-8 text-gray-500 text-[9px] uppercase tracking-widest font-mono">
        Press [ESC] or [P] to pause/resume
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // --- DOM SELECTORS ---
  const persistentGarageSelect = document.getElementById("persistentGarageSelect");
  const persistentMapSelect = document.getElementById("persistentMapSelect");
  const mainGarageSelect = document.getElementById("garageSelect");
  const mainMapSelect = document.getElementById("mapSelect");
  const btnResume = document.getElementById("btnResume");
  const btnPersistentPause = document.getElementById("btnPersistentPause");

  // --- REGENERATE CHECKERED GRID ---
  function buildCheckeredGrid() {
    const grid = document.getElementById("checkeredGrid");
    grid.innerHTML = "";
    
    // Calculate cols/rows based on screen sizes
    const tileSize = 64; // size in pixels
    const cols = Math.ceil(window.innerWidth / tileSize);
    const rows = Math.ceil(window.innerHeight / tileSize);
    
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    const totalTiles = cols * rows;
    for (let i = 0; i < totalTiles; i++) {
      const tile = document.createElement("div");
      const colIdx = i % cols;
      const rowIdx = Math.floor(i / cols);
      
      // Traditional alternate checkerboard classes
      const isLight = (colIdx + rowIdx) % 2 === 0;
      tile.className = `checker-box ${isLight ? "light" : ""}`;
      grid.appendChild(tile);
    }
  }

  buildCheckeredGrid();
  window.addEventListener("resize", buildCheckeredGrid);

  // --- RANDOM CHECKERED FLIPPING TRANSITION ---
  function startCheckersAnimation() {
    if (checkerInterval) clearInterval(checkerInterval);
    
    const tiles = document.querySelectorAll(".checker-box");
    if (tiles.length === 0) return;
    
    checkerInterval = setInterval(() => {
      // Pick 5 random tiles to animate
      for (let k = 0; k < 5; k++) {
        const randIdx = Math.floor(Math.random() * tiles.length);
        const tile = tiles[randIdx];
        
        // Randomly assign a class: active white, orange, red, or return to baseline
        const randType = Math.random();
        
        // Strip previous color classifications
        tile.classList.remove("white", "orange", "red", "flip");
        
        if (randType < 0.15) {
          tile.classList.add("white");
        } else if (randType < 0.35) {
          tile.classList.add("orange");
        } else if (randType < 0.45) {
          tile.classList.add("red");
        }
        
        // Randomly flip 3D rotation
        if (Math.random() < 0.5) {
          tile.classList.add("flip");
        }
      }
    }, 45);
  }

  function stopCheckersAnimation() {
    if (checkerInterval) {
      clearInterval(checkerInterval);
      checkerInterval = null;
    }
  }

  // --- SHOW / HIDE PAUSE OVERLAY ---
  function showPauseMenu() {
    isPaused = true;
    overlay.classList.add("active");
    startCheckersAnimation();
  }

  function hidePauseMenu() {
    isPaused = false;
    overlay.classList.remove("active");
    stopCheckersAnimation();
  }

  function togglePause() {
    if (isPaused) {
      hidePauseMenu();
    } else {
      showPauseMenu();
    }
  }

  // --- VEHICLE SWITCHING ENGINE ---
  function setVehicle(vehicle) {
    currentVehicle = vehicle;
    persistentGarageSelect.value = vehicle;
    mainGarageSelect.value = vehicle;
    
    if (window.activeScene && typeof window.activeScene.switchVehicle === "function") {
      window.activeScene.switchVehicle(vehicle);
    }
    
    hidePauseMenu();
  }

  // --- MAP SWITCHING ENGINE ---
  function setMap(mapId) {
    currentMap = mapId;
    persistentMapSelect.value = mapId;
    mainMapSelect.value = mapId;
    
    if (window.activeScene && typeof window.activeScene.switchMap === "function") {
      window.activeScene.switchMap(mapId);
    }
    
    hidePauseMenu();
  }

  // --- EVENT ATTACHMENTS ---
  btnResume.addEventListener("click", hidePauseMenu);
  btnPersistentPause.addEventListener("click", togglePause);
  
  persistentGarageSelect.addEventListener("change", (e) => {
    setVehicle(e.target.value);
  });
  
  mainGarageSelect.addEventListener("change", (e) => {
    setVehicle(e.target.value);
  });

  persistentMapSelect.addEventListener("change", (e) => {
    setMap(e.target.value);
  });
  
  mainMapSelect.addEventListener("change", (e) => {
    setMap(e.target.value);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key.toLowerCase() === "p") {
      togglePause();
    }
  });
}
