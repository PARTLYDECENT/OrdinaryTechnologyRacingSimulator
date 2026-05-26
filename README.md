# 🏎️ SDF Ignis-Drive — Real-time Raymarched Physics Driving Simulator

A high-fidelity, real-time raymarched driving simulator built in **Babylon.js** utilizing custom GLSL shader-based Signed Distance Fields (SDF) to render vehicles inside single bounding box meshes. Experience modular vehicle swapping, custom physics engines, dynamic environmental cycles, and visceral cyberpunk visual effects.

---

## 🌟 Key Features

*   **SDF Raymarched Vehicles**: Vehicles are drawn procedurally in real-time inside single bounding boxes. Featuring customizable low-profile carbon sports splitters, custom side vents, active spoiler systems, and a gorgeous pearl-metallic paint finish.
*   **Dual Vehicle Support**: Switch dynamically between the ultra-sleek **Sports Car (SDF-Ignis)** and the heavy **Freight Truck (SDF-Beast)** with independent physics attributes (wheel rotation, steering angle, and chassis parameters).
*   **High-Fidelity Environments**: Experience three beautifully themed maps:
    *   **Cyberpunk Outpost**: Molten neon glowing pyramids and outpost towers.
    *   **Tokyo Grid**: An infinite procedural highway grid.
    *   **Nebula Space**: An atmospheric celestial racetrack.
*   **Dynamic Day/Night Cycles**: Seamlessly transition from warm golden daylight to a neon-soaked, high-contrast night sky with a custom procedural skybox and atmospheric lighting.
*   **Volumetric Headlight Projection**: Dual independent headlights that dynamically project light cone vectors onto custom multi-textured terrain shaders (with real-time flickering and intensity fluctuation).
*   **Interactive Cyberpunk Dashboard HUD**: Modern glassmorphic panel overlay displaying real-time speed tracking (MPH), dynamic gear mapping, RPM levels, visual toast notifications, and customizable touch controls for mobile.
*   **Tire Drift FX**: Adaptive particle system that emits smoke and dust matched dynamically to vehicle speed, drift coefficients, and current ground terrain coloring.

---

## 🎮 Flight Manual (Controls)

### 💻 Desktop Keyboard
| Key / Input | Action |
| :--- | :--- |
| **W / Up Arrow** | Accelerate |
| **S / Down Arrow** | Reverse / Brake |
| **A / D / Left / Right** | Steer Left / Right |
| **Spacebar** | Engage Handbrake |
| **R** | Reset Physics Coordinates |

### 🖱️ HUD Buttons
*   **Switch to Day / Night Mode**: Instantly lerps solar intensity, sky colors, and headlight projectors.
*   **Autopilot (ON/OFF)**: Toggle intelligent procedural autopilot system. Manually steering or accelerating will automatically release autopilot.

### 📱 Mobile Touch Controls
An adaptive mobile layout provides dual-chassis touch buttons for **Steering (Left ◀ / Right ▶)** and **Pedals (GAS / BRAKE)**.

---

## 🛠️ Tech Stack & Architecture

*   **Core**: HTML5, Vanilla ES Modules, and Custom CSS.
*   **Rendering Engine**: Babylon.js (Core WebGL integration).
*   **UI Overlay**: Tailwind CSS (for modern HUD layout).
*   **Development / Build Tool**: Vite 5.x.
*   **Shaders**: Custom GLSL vertex and fragment shader structures (`src/shaders/`) for procedural skyboxes, SDF raymarching, and terrain projection.

---

## 🚀 Getting Started Locally

To run the project locally on your machine, ensure you have **Node.js** (v18+) installed:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
   *The local server will start, typically at `http://localhost:3000`.*

3. **Build Production Bundle**:
   ```bash
   npm run build
   ```
   *Creates an optimized, production-ready bundle inside the `dist/` directory.*

---

## 🛩️ Continuous Deployment (GitHub Pages)

The project includes a pre-configured automated GitHub Actions pipeline (`.github/workflows/deploy.yml`).

### How to Deploy to GitHub Pages:
1. Push your changes to the `main` branch.
2. Navigate to your repository settings on GitHub: **Settings > Pages**.
3. Under **Build and deployment -> Source**, select **GitHub Actions** from the dropdown menu.
4. The workflow will automatically trigger, compile your assets using relative paths (`base: './'`), and publish the site instantly.
