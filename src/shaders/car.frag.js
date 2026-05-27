export const carFragmentShader = `
precision highp float;
varying vec3 vPosition;
varying vec3 vWorldPos;
varying vec3 vNormal;

uniform mat4 world;
uniform mat4 uWorldInverse;
uniform vec3 uCameraPos;

uniform float uWheelRotation;
uniform float uSteeringAngle;
uniform vec3 uLightDir;
uniform float uDayNight;
uniform float time;
uniform float uCarRedAce;

// --- SDF PRIMITIVES ---
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float sdRoundBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}
float sdCylinderZ(vec3 p, float h, float r) {
    vec2 d = abs(vec2(length(p.xy), p.z)) - vec2(r, h);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

// Helper unions
vec2 opUnion(vec2 d1, vec2 d2) {
    return (d1.x < d2.x) ? d1 : d2;
}

// Polynomial smooth minimum for organic shape blending
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// ============================================================
// COSMIC NOISE SYSTEM
// ============================================================
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 hash33(vec3 p) {
    p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return fract(sin(p) * 43758.5453123);
}

float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    return mix(mix(mix(hash(n), hash(n+1.0), f.x),
                   mix(hash(n+157.0), hash(n+158.0), f.x), f.y),
               mix(mix(hash(n+113.0), hash(n+114.0), f.x),
                   mix(hash(n+270.0), hash(n+271.0), f.x), f.y), f.z);
}

float fbm(vec3 p, int octaves) {
    float v = 0.0, a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        v += a * noise3D(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// Swirling warp domain distortion for galaxy arms
vec3 cosmicWarp(vec3 p, float t) {
    float s = sin(t * 0.3) * 0.5;
    float c = cos(t * 0.25) * 0.5;
    return vec3(
        p.x + s * noise3D(p * 1.5 + t * 0.1),
        p.y + c * noise3D(p * 1.3 - t * 0.15),
        p.z + s * c * noise3D(p * 1.7 + t * 0.08)
    );
}

// Star sparkle field
float starField(vec3 p, float density) {
    vec3 cell = floor(p * density);
    vec3 local = fract(p * density) - 0.5;
    vec3 rnd = hash33(cell);
    vec3 starPos = rnd - 0.5;
    float dist = length(local - starPos);
    float brightness = smoothstep(0.08, 0.0, dist);
    float twinkle = sin(time * (3.0 + rnd.x * 12.0) + rnd.y * 6.28) * 0.5 + 0.5;
    return brightness * twinkle * step(0.82, rnd.z);
}

// ============================================================
// SCENE MAP FUNCTION (unchanged geometry)
// ============================================================
vec2 map(vec3 p) {
    vec2 res = vec2(1e10, 0.0);
    
    // Idle engine structural noise
    vec3 pBody = p;
    pBody.y -= sin(time * 60.0) * 0.0008;
    
    // Aerodynamic wedge shape taper
    float taperX = 1.0 - (pBody.x + 0.85) * 0.16;
    vec3 pTaper = pBody;
    pTaper.z /= taperX;
    
    // Main lower body shell
    float bodyLower = sdRoundBox(pTaper - vec3(0.0, 0.04, 0.0), vec3(0.79, 0.03, 0.33), 0.14) * taperX;
    
    // Active Front Splitter
    float splitter = sdRoundBox(pBody - vec3(0.88, -0.06, 0.0), vec3(0.08, 0.015, 0.43), 0.02);
    bodyLower = min(bodyLower, splitter);
    
    // Side intakes
    float sideVent = sdBox(pBody - vec3(-0.15, 0.05, 0.40), vec3(0.18, 0.06, 0.06));
    bodyLower = max(bodyLower, -sideVent);
    
    // Cockpit Canopy
    vec3 pCabin = pBody - vec3(-0.05, 0.20, 0.0);
    pCabin.x += pCabin.y * 0.65;
    float cabin = sdRoundBox(pCabin, vec3(0.32, 0.06, 0.22), 0.10);
    
    float bodyCombined = smin(bodyLower, cabin, 0.12);
    
    // Wheel wells
    vec3 pWheelF = p; 
    pWheelF.x = abs(pWheelF.x) - 0.52;
    pWheelF.z = abs(pWheelF.z) - 0.32;
    vec3 pW = pWheelF - vec3(0.0, -0.04, 0.0);
    
    float wheelScale = 0.7;
    vec3 pW_scaled = pW / wheelScale;
    
    float wheelWell = sdCylinderZ(pW_scaled, 0.15, 0.25) * wheelScale;
    bodyCombined = max(bodyCombined, -wheelWell);
    
    res = vec2(bodyCombined, 1.0); // ID 1: Cosmic Paint
    
    // Rear diffuser
    float diffuser = sdBox(pBody - vec3(-0.75, -0.06, 0.0), vec3(0.15, 0.04, 0.36));
    res = opUnion(res, vec2(diffuser, 7.0));
    
    // Wheels
    vec3 pW_steered = pW_scaled;
    bool isFront = (p.x > 0.0);
    float steerSign = (p.z > 0.0) ? 1.0 : -1.0;
    
    if (isFront) {
        float s = sin(uSteeringAngle * steerSign);
        float c = cos(uSteeringAngle * steerSign);
        mat2 rotY = mat2(c, -s, s, c);
        pW_steered.xz = rotY * pW_steered.xz;
    }
    
    float sSp = sin(uWheelRotation);
    float cSp = cos(uWheelRotation);
    mat2 rotZ = mat2(cSp, -sSp, sSp, cSp);
    vec3 pW_spinned = pW_steered;
    pW_spinned.xy = rotZ * pW_spinned.xy;
    
    // Tire
    float tireTread = sdCylinderZ(pW_spinned, 0.12, 0.21) * wheelScale;
    res = opUnion(res, vec2(tireTread, 2.0));
    
    // Rim
    float rimHub = sdCylinderZ(pW_spinned, 0.13, 0.15) * wheelScale;
    res = opUnion(res, vec2(rimHub, 6.0));
    
    // Spokes
    float spokes = 1e10;
    for (int i = 0; i < 7; i++) {
        float ang = float(i) * 0.89759;
        float s = sin(ang), c = cos(ang);
        vec2 rPos = mat2(c, -s, s, c) * pW_spinned.xy;
        float spoke = sdBox(vec3(rPos, pW_spinned.z), vec3(0.015, 0.15, 0.12)) * wheelScale;
        spokes = min(spokes, spoke);
    }
    spokes = max(spokes, sdCylinderZ(pW_spinned, 0.125, 0.195) * wheelScale);
    res = opUnion(res, vec2(spokes, 6.0));
    
    // Windows
    float winBox = sdRoundBox(pCabin - vec3(0.0, 0.01, 0.0), vec3(0.30, 0.05, 0.20), 0.09);
    float winFeature = max(winBox, cabin + 0.003);
    res = opUnion(res, vec2(winFeature, 3.0));
    
    // Headlights
    float hlL = length(pBody - vec3(0.90, 0.04, 0.24)) - 0.04;
    float hlR = length(pBody - vec3(0.90, 0.04, -0.24)) - 0.04;
    res = opUnion(res, vec2(min(hlL, hlR), 4.0));
    
    // Taillights
    float tailBar = sdBox(pBody - vec3(-0.92, 0.07, 0.0), vec3(0.01, 0.018, 0.32));
    res = opUnion(res, vec2(tailBar, 5.0));
    
    // Rear wing
    float wingLeft = sdBox(pBody - vec3(-0.78, 0.22, 0.32), vec3(0.02, 0.08, 0.02));
    float wingRight = sdBox(pBody - vec3(-0.78, 0.22, -0.32), vec3(0.02, 0.08, 0.02));
    float wingTop = sdBox(pBody - vec3(-0.84, 0.30, 0.0), vec3(0.05, 0.012, 0.44));
    float endplateL = sdBox(pBody - vec3(-0.84, 0.30, 0.44), vec3(0.06, 0.05, 0.01));
    float endplateR = sdBox(pBody - vec3(-0.84, 0.30, -0.44), vec3(0.06, 0.05, 0.01));
    float spoiler = min(min(min(min(wingLeft, wingRight), wingTop), endplateL), endplateR);
    res = opUnion(res, vec2(spoiler, 7.0));
    
    return res;
}

// Shadow propagation
float shadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 24; i++) {
        float h = map(ro + rd * t).x;
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += clamp(h, 0.01, 0.15);
        if (t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}

// Surface normal estimation
vec3 calcNormal(vec3 p) {
    const float h = 0.0005;
    const vec2 k = vec2(1.0, -1.0);
    return normalize(k.xyy * map(p + k.xyy * h).x +
                     k.yyx * map(p + k.yyx * h).x +
                     k.yxy * map(p + k.yxy * h).x +
                     k.xxx * map(p + k.xxx * h).x);
}

// ============================================================
// COSMIC PAINT SYSTEM
// ============================================================
vec3 getCosmicPaintColor(vec3 p, vec3 n, vec3 rd) {
    float nd = max(dot(n, -rd), 0.0);
    float fr = pow(1.0 - nd, 3.0); // Fresnel

    // UV-like coordinates across body surface
    vec3 uvw = p * 2.5;
    float t = time;

    // === LAYER 1: Deep space base with animated nebula ===
    vec3 warpedP = cosmicWarp(uvw, t);
    float nebula1 = fbm(warpedP * 1.2 + vec3(t * 0.05, 0.0, t * 0.03), 5);
    float nebula2 = fbm(warpedP * 0.8 - vec3(0.0, t * 0.04, t * 0.06), 4);
    float nebula3 = fbm(uvw * 1.5 + vec3(t * 0.08, t * 0.02, 0.0), 3);

    // === LAYER 2: Galaxy spiral arms ===
    float angle = atan(uvw.z, uvw.x);
    float radius = length(uvw.xz);
    float spiral = sin(angle * 3.0 - radius * 4.0 + t * 0.4) * 0.5 + 0.5;
    spiral *= smoothstep(0.0, 1.5, radius) * smoothstep(4.0, 1.0, radius);
    float spiralDetail = fbm(vec3(angle * 2.0, radius * 3.0, t * 0.1), 3);
    spiral = spiral * 0.7 + spiralDetail * 0.3;

    // === LAYER 3: Star field sparkles ===
    float stars1 = starField(p, 40.0);
    float stars2 = starField(p + vec3(7.3, 3.1, 11.7), 65.0);
    float stars3 = starField(p + vec3(23.1, 17.5, 5.3), 100.0);
    float totalStars = stars1 * 1.5 + stars2 * 0.8 + stars3 * 0.4;

    // === LAYER 4: Energy pulse waves ===
    float pulse1 = sin(p.x * 8.0 - t * 3.5) * 0.5 + 0.5;
    float pulse2 = sin(length(p.xz) * 12.0 - t * 4.0) * 0.5 + 0.5;
    float pulseWave = pow(pulse1 * pulse2, 3.0) * 0.6;

    // === LAYER 5: Aurora rim effect at grazing angles ===
    float aurora = pow(fr, 2.0);
    float auroraWave = sin(p.x * 6.0 + p.z * 4.0 + t * 2.0) * 0.5 + 0.5;
    auroraWave *= sin(p.z * 8.0 - t * 1.5) * 0.5 + 0.5;
    aurora *= auroraWave;

    // === COLOR PALETTES PER LIVERY ===
    vec3 deepSpace, nebColor1, nebColor2, spiralColor, starColor, pulseColor, auroraColor, stripeColor;
    float stripeIntensity = 0.0;

    // Dual racing stripes
    float centerStripe = smoothstep(0.035, 0.045, abs(abs(p.z) - 0.07)) - smoothstep(0.0, 0.01, abs(abs(p.z) - 0.07));
    float hoodFocus = smoothstep(-0.8, 0.8, p.x) * smoothstep(0.0, 0.35, p.y);

    if (uCarRedAce == 1.0) {
        // RED ACE: Crimson cosmos — red/magenta nebula with platinum stars
        deepSpace = vec3(0.04, 0.0, 0.02);
        nebColor1 = vec3(0.9, 0.05, 0.15);
        nebColor2 = vec3(0.6, 0.0, 0.4);
        spiralColor = vec3(1.0, 0.3, 0.5);
        starColor = vec3(1.0, 0.95, 0.9);
        pulseColor = vec3(1.0, 0.2, 0.3);
        auroraColor = vec3(1.0, 0.4, 0.7);
        stripeColor = vec3(0.98, 0.95, 1.0);
        stripeIntensity = centerStripe * hoodFocus * 0.9;
    } else if (uCarRedAce == 2.0) {
        // NPC: Dark void cosmos — gold/cyan nebula on deep black
        deepSpace = vec3(0.01, 0.01, 0.02);
        nebColor1 = vec3(0.0, 0.6, 0.8);
        nebColor2 = vec3(1.0, 0.65, 0.0);
        spiralColor = vec3(0.0, 0.8, 1.0);
        starColor = vec3(1.0, 0.85, 0.5);
        pulseColor = vec3(0.0, 0.7, 1.0);
        auroraColor = vec3(0.0, 1.0, 0.8);
        stripeColor = vec3(1.0, 0.72, 0.0);
        stripeIntensity = centerStripe * hoodFocus * 0.8;
    } else {
        // DEFAULT: Deep violet/blue cosmos with orange/gold energy
        deepSpace = vec3(0.02, 0.005, 0.04);
        nebColor1 = vec3(0.8, 0.2, 0.0);
        nebColor2 = vec3(0.3, 0.0, 0.8);
        spiralColor = vec3(1.0, 0.5, 0.0);
        starColor = vec3(1.0, 0.9, 0.7);
        pulseColor = vec3(1.0, 0.4, 0.0);
        auroraColor = vec3(0.5, 0.0, 1.0);
        stripeColor = vec3(1.0, 0.6, 0.0);
        stripeIntensity = centerStripe * hoodFocus * 0.7;
    }

    // === COMPOSITE ALL LAYERS ===
    // Base: deep space void
    vec3 paintColor = deepSpace;

    // Nebula clouds
    paintColor = mix(paintColor, nebColor1, nebula1 * 0.55);
    paintColor = mix(paintColor, nebColor2, nebula2 * 0.45);
    paintColor += nebColor1 * nebula3 * 0.15;

    // Galaxy spiral arms
    paintColor = mix(paintColor, spiralColor * 0.6, spiral * 0.35);

    // Chromatic iridescence shift based on viewing angle
    float iriShift = fr * 3.14159 * 2.0 + p.x * 2.0 + p.z * 1.5;
    vec3 iridescence = vec3(
        sin(iriShift) * 0.5 + 0.5,
        sin(iriShift + 2.094) * 0.5 + 0.5,
        sin(iriShift + 4.189) * 0.5 + 0.5
    );
    paintColor = mix(paintColor, iridescence * 0.5, fr * 0.4);

    // Star sparkles
    paintColor += starColor * totalStars;

    // Energy pulses
    paintColor += pulseColor * pulseWave * 0.3;

    // Aurora rim glow
    paintColor += auroraColor * aurora * 1.2;

    // Racing stripes with cosmic glow
    float stripeGlow = sin(p.x * 20.0 - t * 5.0) * 0.5 + 0.5;
    paintColor = mix(paintColor, stripeColor * (1.0 + stripeGlow * 0.5), stripeIntensity);

    // Metallic micro-flake sparkles in the clear coat
    float flake = fract(sin(dot(p.xy * 1200.0, vec2(12.9898, 78.233))) * 43758.5453);
    float flakeIntensity = pow(flake, 22.0) * 0.6;
    paintColor += starColor * flakeIntensity * (0.5 + fr * 0.5);

    // Shadow boundary darkening
    paintColor = mix(deepSpace * 0.5, paintColor, nd * 0.75 + 0.25);

    return paintColor;
}

// Shader Material shade model
vec3 shade(vec3 p, vec3 normal, vec3 rd, float id) {
    vec3 color = vec3(0.5);
    float roughness = 0.5;
    float metallic = 0.0;
    float emission = 0.0;
    
    if (id == 1.0) { // COSMIC PAINT
        color = getCosmicPaintColor(p, normal, rd);
        roughness = 0.06;
        metallic = 0.97;
        emission = 0.15; // Subtle self-illumination for nebula glow
    } else if (id == 2.0) { // Tires
        color = vec3(0.12);
        roughness = 0.90;
        metallic = 0.0;
    } else if (id == 3.0) { // Glass
        color = vec3(0.08, 0.03, 0.03);
        roughness = 0.05;
        metallic = 0.95;
    } else if (id == 4.0) { // Headlights
        color = uDayNight == 1.0 ? vec3(0.95, 0.85, 0.75) : vec3(1.8, 1.4, 0.9);
        roughness = 0.1;
        emission = uDayNight == 1.0 ? 0.3 : 2.0;
    } else if (id == 5.0) { // Taillights
        color = uDayNight == 1.0 ? vec3(0.8, 0.05, 0.05) : vec3(2.2, 0.05, 0.05);
        roughness = 0.1;
        emission = uDayNight == 1.0 ? 0.3 : 2.2;
    } else if (id == 6.0) { // Rims
        color = vec3(0.88, 0.85, 0.82);
        roughness = 0.22;
        metallic = 0.95;
    } else if (id == 7.0) { // Carbon Trim / Splitters / Spoilers
        color = vec3(0.05);
        roughness = 0.80;
        metallic = 0.15;
    }
    
    // Relighting in local space coordinates
    vec3 lightDirLocal = normalize((uWorldInverse * vec4(uLightDir, 0.0)).xyz);
    vec3 viewDir = -rd;
    vec3 halfDir = normalize(lightDirLocal + viewDir);
    
    // Ambient light
    vec3 ambient = color * (uDayNight == 1.0 ? 0.32 : 0.04);
    
    // Diffuse reflection with soft-shadowing
    float diff = max(dot(normal, lightDirLocal), 0.0);
    float sh = 1.0;
    if (diff > 0.01) {
        sh = shadow(p + normal * 0.01, lightDirLocal, 0.02, 1.5, 12.0);
    }
    vec3 diffuse = color * diff * sh * (uDayNight == 1.0 ? 0.95 : 0.15);
    
    // Specular Highlights
    float spec = pow(max(dot(normal, halfDir), 0.0), mix(128.0, 16.0, roughness));
    vec3 specular = vec3(0.4) * spec * sh * (metallic * 0.8 + 0.2) * (uDayNight == 1.0 ? 1.0 : 0.25);
    
    // Environment sky reflection
    vec3 reflectDir = reflect(rd, normal);
    vec3 reflectDirWorld = (world * vec4(reflectDir, 0.0)).xyz;
    vec3 skyReflectColor = vec3(0.0);
    if (uDayNight == 1.0) {
        skyReflectColor = mix(vec3(0.4, 0.6, 0.95), vec3(1.0, 0.85, 0.7), max(0.0, reflectDirWorld.y)) * 0.25;
    } else {
        skyReflectColor = mix(vec3(0.05, 0.01, 0.01), vec3(0.20, 0.04, 0.02), max(0.0, reflectDirWorld.y)) * 0.08;
    }
    float fresnel = pow(clamp(1.0 - max(dot(normal, viewDir), 0.0), 0.0, 1.0), 5.0);
    vec3 reflection = skyReflectColor * (fresnel * 0.85 + 0.15) * (1.0 - roughness);
    
    return ambient + diffuse + specular + reflection + color * emission;
}

void main() {
    // Extract origin & ray trajectory in local matrix coordinate space
    vec3 ro_world = uCameraPos;
    vec3 ro = (uWorldInverse * vec4(ro_world, 1.0)).xyz;
    vec3 rd = normalize(vPosition - ro);
    
    // Raymarch starting from entry boundaries inside bounding mesh
    vec3 marchStart = vPosition;
    
    float t = 0.0;
    float dMax = 3.5;
    vec2 res = vec2(-1.0);
    bool hit = false;
    
    for (int i = 0; i < 64; i++) {
        vec3 p = marchStart + rd * t;
        res = map(p);
        if (res.x < 0.001) {
            hit = true;
            break;
        }
        t += res.x;
        if (t > dMax) break;
    }
    
    if (!hit) {
        discard; // Cull fragment rendering outside actual SDF volume limits
    }
    
    // Shading execution
    vec3 p = marchStart + rd * t;
    vec3 normal = calcNormal(p);
    vec3 finalColor = shade(p, normal, rd, res.y);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
