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

// --- SCENE MAP FUNCTION ---
vec2 map(vec3 p) {
    vec2 res = vec2(1e10, 0.0);
    
    // Idle engine structural noise
    vec3 pBody = p;
    pBody.y -= sin(time * 60.0) * 0.0008;
    
    // Aerodynamic wedge shape taper (Sleeker chassis)
    float taperX = 1.0 - (pBody.x + 0.85) * 0.16;
    vec3 pTaper = pBody;
    pTaper.z /= taperX;
    
    // Main lower body shell (Low profile, aerodynamic wedge)
    float bodyLower = sdRoundBox(pTaper - vec3(0.0, 0.04, 0.0), vec3(0.85, 0.08, 0.39), 0.08) * taperX;
    
    // Active Front Splitter (Sporty carbon lip)
    float splitter = sdRoundBox(pBody - vec3(0.88, -0.06, 0.0), vec3(0.08, 0.015, 0.43), 0.02);
    bodyLower = min(bodyLower, splitter);
    
    // Sleek side intakes (Supercar styling details)
    float sideVent = sdBox(pBody - vec3(-0.15, 0.05, 0.40), vec3(0.18, 0.06, 0.06));
    bodyLower = max(bodyLower, -sideVent);
    
    // Low-slung Cockpit Canopy (Highly aerodynamic windshield rake)
    vec3 pCabin = pBody - vec3(-0.05, 0.20, 0.0);
    pCabin.x += pCabin.y * 0.65; // Aggressively slanted back
    float cabin = sdRoundBox(pCabin, vec3(0.38, 0.11, 0.28), 0.05);
    
    float bodyCombined = min(bodyLower, cabin);
    
    // Wheel axle parameters: Front=0.52, Rear=-0.52, Z=0.32 (moved closer by 0.1), Wheel center Y=-0.04
    vec3 pWheelF = p; 
    pWheelF.x = abs(pWheelF.x) - 0.52;
    pWheelF.z = abs(pWheelF.z) - 0.32;
    vec3 pW = pWheelF - vec3(0.0, -0.04, 0.0);
    
    // Scale wheels to be 0.3 smaller (0.7 scale factor)
    float wheelScale = 0.7;
    vec3 pW_scaled = pW / wheelScale;
    
    // Cut out wheel wells from body shell
    float wheelWell = sdCylinderZ(pW_scaled, 0.15, 0.25) * wheelScale;
    bodyCombined = max(bodyCombined, -wheelWell);
    
    res = vec2(bodyCombined, 1.0); // ID 1: Fire/Molten Sports Paint
    
    // Rear carbon diffuser & undercarriage trim
    float diffuser = sdBox(pBody - vec3(-0.75, -0.06, 0.0), vec3(0.15, 0.04, 0.36));
    res = opUnion(res, vec2(diffuser, 7.0)); // ID 7: Trim details
    
    // Wheel transformation logic (separating front steer from back wheels)
    vec3 pW_steered = pW_scaled;
    bool isFront = (p.x > 0.0);
    float steerSign = (p.z > 0.0) ? 1.0 : -1.0;
    
    if (isFront) {
        float s = sin(uSteeringAngle * steerSign);
        float c = cos(uSteeringAngle * steerSign);
        mat2 rotY = mat2(c, -s, s, c);
        pW_steered.xz = rotY * pW_steered.xz;
    }
    
    // Apply continuous rolling rotation around axle
    float sSp = sin(uWheelRotation);
    float cSp = cos(uWheelRotation);
    mat2 rotZ = mat2(cSp, -sSp, sSp, cSp);
    vec3 pW_spinned = pW_steered;
    pW_spinned.xy = rotZ * pW_spinned.xy;
    
    // Low-Profile Sport Tire
    float tireTread = sdCylinderZ(pW_spinned, 0.12, 0.21) * wheelScale;
    res = opUnion(res, vec2(tireTread, 2.0)); // ID 2: Tire Rubber
    
    // Deep-dish sport rim outer barrel
    float rimHub = sdCylinderZ(pW_spinned, 0.13, 0.15) * wheelScale;
    res = opUnion(res, vec2(rimHub, 6.0)); // ID 6: Metallic Rims
    
    // 7-Spoke Performance Radial Pattern
    float spokes = 1e10;
    for (int i = 0; i < 7; i++) {
        float ang = float(i) * 0.89759; // 2 * PI / 7
        float s = sin(ang), c = cos(ang);
        vec2 rPos = mat2(c, -s, s, c) * pW_spinned.xy;
        float spoke = sdBox(vec3(rPos, pW_spinned.z), vec3(0.015, 0.15, 0.12)) * wheelScale;
        spokes = min(spokes, spoke);
    }
    spokes = max(spokes, sdCylinderZ(pW_spinned, 0.125, 0.195) * wheelScale);
    res = opUnion(res, vec2(spokes, 6.0));
    
    // Sleek aerodynamic window panels (re-project canopy shape slightly smaller)
    float winBox = sdRoundBox(pCabin - vec3(0.0, 0.01, 0.0), vec3(0.35, 0.10, 0.29), 0.04);
    float winFeature = max(winBox, cabin + 0.003);
    res = opUnion(res, vec2(winFeature, 3.0)); // ID 3: Glass Windows
    
    // Aggressive laser headlights
    float hlL = length(pBody - vec3(0.90, 0.04, 0.24)) - 0.04;
    float hlR = length(pBody - vec3(0.90, 0.04, -0.24)) - 0.04;
    res = opUnion(res, vec2(min(hlL, hlR), 4.0)); // ID 4: Headlights
    
    // Cohesive glowing rear taillight bar
    float tailBar = sdBox(pBody - vec3(-0.92, 0.07, 0.0), vec3(0.01, 0.018, 0.32));
    res = opUnion(res, vec2(tailBar, 5.0)); // ID 5: Taillights
    
    // Integrated sports rear wing with curved endplates
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

// Evolved Red & Orange Fire-Slick paint shader
vec3 getFirePaintColor(vec3 p, vec3 n, vec3 rd) {
    float nd = max(dot(n, -rd), 0.0);
    float fr = pow(1.0 - nd, 2.5); // Fresnel coefficient
    
    // Deep rich cherry candy red at direct angles, morphing to bright liquid orange & golden reflections at angles
    vec3 baseRed = vec3(0.85, 0.0, 0.02);
    vec3 midOrange = vec3(1.0, 0.28, 0.0);
    vec3 edgeGold = vec3(1.0, 0.65, 0.0);
    
    vec3 paintColor = mix(baseRed, midOrange, fr);
    paintColor = mix(paintColor, edgeGold, pow(fr, 2.0));
    
    // Dark velvet undertones in shadow boundaries
    paintColor = mix(vec3(0.12, 0.0, 0.0), paintColor, nd * 0.8 + 0.2);
    
    // Procedural metallic flake micro-sparkles
    float flake = fract(sin(dot(p.xy * 950.0, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 flakeSparkle = vec3(pow(flake, 18.0) * 0.45) * edgeGold;
    
    // Integrated flowing cyber-energy traces (racing pinstripes)
    float stripes = abs(sin(p.z * 18.0)) * abs(sin(p.x * 2.0 - time * 3.0));
    float lineIntensity = smoothstep(0.96, 0.99, stripes);
    
    // Dual central racing stripes over the hood and canopy
    float centerStripe = smoothstep(0.035, 0.045, abs(abs(p.z) - 0.07)) - smoothstep(0.0, 0.01, abs(abs(p.z) - 0.07));
    float hoodFocus = smoothstep(-0.8, 0.8, p.x) * smoothstep(0.0, 0.35, p.y);
    
    vec3 neonGlow = vec3(1.0, 0.35, 0.0) * lineIntensity * 1.5 + vec3(1.0, 0.12, 0.0) * centerStripe * hoodFocus * 1.3;
    
    return paintColor + flakeSparkle + neonGlow;
}

// Shader Material shade model
vec3 shade(vec3 p, vec3 normal, vec3 rd, float id) {
    vec3 color = vec3(0.5);
    float roughness = 0.5;
    float metallic = 0.0;
    float emission = 0.0;
    
    if (id == 1.0) { // EVOLVED FIRE PAINT
        color = getFirePaintColor(p, normal, rd);
        roughness = 0.08;
        metallic = 0.95;
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
    
    // Simulated environment sky reflection mapping
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
