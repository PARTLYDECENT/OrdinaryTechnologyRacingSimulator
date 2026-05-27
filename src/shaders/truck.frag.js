export const truckFragmentShader = `
precision highp float;

// --- COSMIC NOISE HELPERS ---
float chash(float n) { return fract(sin(n) * 43758.5453123); }
vec3 chash33(vec3 p) {
    p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return fract(sin(p) * 43758.5453123);
}
float cnoise3D(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    return mix(mix(mix(chash(n), chash(n+1.0), f.x), mix(chash(n+157.0), chash(n+158.0), f.x), f.y),
               mix(mix(chash(n+113.0), chash(n+114.0), f.x), mix(chash(n+270.0), chash(n+271.0), f.x), f.y), f.z);
}
float cfbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * cnoise3D(p); p = p * 2.0 + vec3(100.0); a *= 0.5; }
    return v;
}
float cstarField(vec3 p, float density) {
    vec3 cell = floor(p * density); vec3 local = fract(p * density) - 0.5;
    vec3 rnd = chash33(cell); float dist = length(local - (rnd - 0.5));
    float brightness = smoothstep(0.08, 0.0, dist);
    float twinkle = sin(time * (3.0 + rnd.x * 12.0) + rnd.y * 6.28) * 0.5 + 0.5;
    return brightness * twinkle * step(0.82, rnd.z);
}
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

const float MAX_DIST = 10.0;
const float SURF_DIST = 0.001;
const int MAX_STEPS = 64;

// --- SDF PRIMITIVES ---
float sdRoundBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdCylinderZ(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xy), p.z)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdCylinderY(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdCylinderX(vec3 p, float r, float h) {
    vec2 d = abs(vec2(length(p.yz), p.x)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

vec2 opUnion(vec2 d1, vec2 d2) {
    return (d1.x < d2.x) ? d1 : d2;
}

// --- SCENE MAP ---
vec2 map(vec3 p) {
    vec2 res = vec2(1e10, 0.0);

    // Subtle engine idle shake
    vec3 pTruck = p;
    float engineVibe = sin(time * 45.0) * 0.0035;
    pTruck.y += engineVibe;

    // --- 1. CHASSIS FRAME ---
    float dChassis = sdRoundBox(pTruck - vec3(-0.25, -0.22, 0.0), vec3(1.75, 0.06, 0.35), 0.02);
    res = opUnion(res, vec2(dChassis, 8.0));

    // Rear chassis details
    float dFifthWheel = sdRoundBox(pTruck - vec3(-1.0, -0.12, 0.0), vec3(0.18, 0.04, 0.22), 0.01);
    res = opUnion(res, vec2(dFifthWheel, 8.0));

    // --- 2. MAIN BODY (Paint) ---
    // Cabin & Sleeper combined
    float dCab = sdRoundBox(pTruck - vec3(-0.15, 0.38, 0.0), vec3(0.52, 0.48, 0.43), 0.04);
    // Hood / Engine Bay
    float dHood = sdRoundBox(pTruck - vec3(0.72, 0.14, 0.0), vec3(0.38, 0.24, 0.42), 0.03);
    
    // Merge Cab and Hood
    float dBody = min(dCab, dHood);

    // Front wheel arches
    float dArchF = sdCylinderZ(pTruck - vec3(0.78, -0.3, 0.0), 0.38, 0.5);
    dBody = max(dBody, -dArchF);

    // Rear wheel mudguards (fenders)
    float dMudguards = sdRoundBox(pTruck - vec3(-1.0, -0.06, 0.0), vec3(0.85, 0.15, 0.45), 0.02);
    // Carve out double rear wheels arches
    float dArchR1 = sdCylinderZ(pTruck - vec3(-0.55, -0.3, 0.0), 0.38, 0.5);
    float dArchR2 = sdCylinderZ(pTruck - vec3(-1.35, -0.3, 0.0), 0.38, 0.5);
    dMudguards = max(dMudguards, -dArchR1);
    dMudguards = max(dMudguards, -dArchR2);
    dBody = min(dBody, dMudguards);

    res = opUnion(res, vec2(dBody, 1.0));

    // --- 3. CHROME PARTS ---
    // Massive front bumper
    float dBumper = sdRoundBox(pTruck - vec3(1.15, -0.25, 0.0), vec3(0.06, 0.08, 0.48), 0.02);
    // Front Radiator Grille
    float dGrill = sdRoundBox(pTruck - vec3(1.10, 0.14, 0.0), vec3(0.02, 0.20, 0.32), 0.015);
    // Smokestacks
    float dSmokeL = sdCylinderY(pTruck - vec3(0.32, 0.62, 0.48), 0.04, 0.65);
    float dSmokeR = sdCylinderY(pTruck - vec3(0.32, 0.62, -0.48), 0.04, 0.65);
    
    // Curved tips
    float dExhaustTipL = sdCylinderZ(pTruck - vec3(0.30, 1.27, 0.48), 0.04, 0.04);
    float dExhaustTipR = sdCylinderZ(pTruck - vec3(0.30, 1.27, -0.48), 0.04, 0.04);

    // Fuel Tanks
    float dTankL = sdCylinderX(pTruck - vec3(-0.15, -0.22, 0.48), 0.16, 0.42);
    float dTankR = sdCylinderX(pTruck - vec3(-0.15, -0.22, -0.48), 0.16, 0.42);

    float dChrome = min(dBumper, min(dGrill, min(dSmokeL, min(dSmokeR, min(dExhaustTipL, min(dExhaustTipR, min(dTankL, dTankR)))))));
    res = opUnion(res, vec2(dChrome, 2.0));

    // --- 4. WHEELS (Rubber + Chrome Rims with active physics steer/spin!) ---
    float dWheels = 1e10;
    float dRims = 1e10;

    // Define wheel center offsets
    vec3 wOffsets[6];
    wOffsets[0] = vec3(0.78, -0.32, 0.44);   // Front Left
    wOffsets[1] = vec3(0.78, -0.32, -0.44);  // Front Right
    wOffsets[2] = vec3(-0.55, -0.32, 0.43);  // Rear 1 Left
    wOffsets[3] = vec3(-0.55, -0.32, -0.43); // Rear 1 Right
    wOffsets[4] = vec3(-1.35, -0.32, 0.43);  // Rear 2 Left
    wOffsets[5] = vec3(-1.35, -0.32, -0.43); // Rear 2 Right

    for (int i = 0; i < 6; i++) {
        vec3 pW = pTruck - wOffsets[i];
        bool isFront = (i < 2);
        
        if (isFront) {
            // Apply steering angle
            float steerSign = (wOffsets[i].z > 0.0) ? 1.0 : -1.0;
            float sSteer = sin(uSteeringAngle * steerSign);
            float cSteer = cos(uSteeringAngle * steerSign);
            mat2 rotSteer = mat2(cSteer, -sSteer, sSteer, cSteer);
            pW.xz = rotSteer * pW.xz;
        }

        // Apply continuous rolling spin
        float sSpin = sin(uWheelRotation);
        float cSpin = cos(uWheelRotation);
        mat2 rotSpin = mat2(cSpin, -sSpin, sSpin, cSpin);
        pW.xy = rotSpin * pW.xy;

        float tyreH = isFront ? 0.09 : 0.12;
        float rimH = isFront ? 0.10 : 0.13;

        float dTyre = sdCylinderZ(pW, 0.30, tyreH);
        float dRim = sdCylinderZ(pW, 0.18, rimH);

        dWheels = min(dWheels, dTyre);
        dRims = min(dRims, dRim);
    }

    res = opUnion(res, vec2(dWheels, 3.0));
    res = opUnion(res, vec2(dRims, 2.0));

    // --- 5. WINDOW GLASS ---
    float dWindshield = sdRoundBox(pTruck - vec3(0.42, 0.58, 0.0), vec3(0.04, 0.16, 0.36), 0.015);
    float dWinSideL = sdRoundBox(pTruck - vec3(0.08, 0.58, 0.42), vec3(0.22, 0.16, 0.03), 0.015);
    float dWinSideR = sdRoundBox(pTruck - vec3(0.08, 0.58, -0.42), vec3(0.22, 0.16, 0.03), 0.015);

    float dGlass = min(dWindshield, min(dWinSideL, dWinSideR));
    res = opUnion(res, vec2(dGlass, 4.0));

    // --- 6. LIGHTS & DETAILS ---
    // Headlights
    float dLightL = sdCylinderX(pTruck - vec3(1.11, -0.12, 0.38), 0.06, 0.03);
    float dLightR = sdCylinderX(pTruck - vec3(1.11, -0.12, -0.38), 0.06, 0.03);
    float dLights = min(dLightL, dLightR);
    res = opUnion(res, vec2(dLights, 6.0));

    // Rooftop marker lights
    float dAmber1 = sdRoundBox(pTruck - vec3(0.32, 0.88, 0.22), vec3(0.04, 0.02, 0.02), 0.01);
    float dAmber2 = sdRoundBox(pTruck - vec3(0.32, 0.88, -0.22), vec3(0.04, 0.02, 0.02), 0.01);
    float dAmber3 = sdRoundBox(pTruck - vec3(0.32, 0.88, 0.0), vec3(0.04, 0.02, 0.02), 0.01);
    float dAmbers = min(dAmber1, min(dAmber2, dAmber3));
    res = opUnion(res, vec2(dAmbers, 7.0));

    return res;
}

// --- SHADOW PROPAGATION ---
float shadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 20; i++) {
        float h = map(ro + rd * t).x;
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += clamp(h, 0.01, 0.15);
        if (t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}

// --- AMBIENT OCCLUSION ---
float calcAO(in vec3 pos, in vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor).x;
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// --- SURFACE NORMAL ESTIMATION ---
vec3 calcNormal(vec3 p) {
    const float h = 0.0005;
    const vec2 k = vec2(1.0, -1.0);
    return normalize(k.xyy * map(p + k.xyy * h).x +
                     k.yyx * map(p + k.yyx * h).x +
                     k.yxy * map(p + k.yxy * h).x +
                     k.xxx * map(p + k.xxx * h).x);
}

// --- SHADING ENGINE ---
vec3 shade(vec3 p, vec3 normal, vec3 rd, float id) {
    vec3 color = vec3(0.5);
    float roughness = 0.5;
    float metallic = 0.0;
    float spec = 0.0;
    float emission = 0.0;

    if (id == 1.0) { // COSMIC PAINT
        // Cosmic paint computation
        float nd = max(dot(normal, -rd), 0.0);
        float fr = pow(1.0 - nd, 3.0);
        vec3 uvw = p * 1.5;
        float t2 = time;

        // Nebula layers
        vec3 wp = vec3(uvw.x + sin(t2*0.3)*0.5*cnoise3D(uvw*1.5+t2*0.1), uvw.y + cos(t2*0.25)*0.5*cnoise3D(uvw*1.3-t2*0.15), uvw.z);
        float neb1 = cfbm(wp * 1.2 + vec3(t2*0.05, 0.0, t2*0.03));
        float neb2 = cfbm(wp * 0.8 - vec3(0.0, t2*0.04, t2*0.06));

        // Galaxy spiral
        float angle = atan(uvw.z, uvw.x);
        float rad = length(uvw.xz);
        float spiral = (sin(angle*3.0 - rad*4.0 + t2*0.4)*0.5+0.5) * smoothstep(0.0,1.5,rad) * smoothstep(4.0,1.0,rad);

        // Stars & pulses
        float stars = cstarField(p, 35.0)*1.5 + cstarField(p+vec3(7.3,3.1,11.7), 55.0)*0.8;
        float pulse = pow((sin(p.x*8.0-t2*3.5)*0.5+0.5)*(sin(length(p.xz)*12.0-t2*4.0)*0.5+0.5), 3.0)*0.5;

        // Iridescence
        float iriShift = fr*6.283 + p.x*2.0 + p.z*1.5;
        vec3 iri = vec3(sin(iriShift)*0.5+0.5, sin(iriShift+2.094)*0.5+0.5, sin(iriShift+4.189)*0.5+0.5);

        // Aurora rim
        float aurora = pow(fr, 2.0) * (sin(p.x*6.0+p.z*4.0+t2*2.0)*0.5+0.5) * (sin(p.z*8.0-t2*1.5)*0.5+0.5);

        // Compose: deep crimson cosmos for truck
        vec3 deep = vec3(0.03, 0.0, 0.01);
        color = deep;
        color = mix(color, vec3(0.75, 0.02, 0.08), neb1 * 0.55);
        color = mix(color, vec3(0.5, 0.0, 0.6), neb2 * 0.4);
        color = mix(color, vec3(1.0, 0.2, 0.4) * 0.6, spiral * 0.3);
        color = mix(color, iri * 0.5, fr * 0.35);
        color += vec3(1.0, 0.9, 0.8) * stars;
        color += vec3(1.0, 0.15, 0.2) * pulse * 0.3;
        color += vec3(1.0, 0.3, 0.6) * aurora * 1.0;
        // Metallic flakes
        float flake = pow(fract(sin(dot(p.xy*1200.0, vec2(12.9898,78.233)))*43758.5453), 22.0)*0.5;
        color += vec3(1.0, 0.9, 0.8) * flake * (0.5 + fr*0.5);
        color = mix(deep*0.5, color, nd*0.75+0.25);

        roughness = 0.06;
        metallic = 0.95;
        spec = 1.0;
        emission = 0.12;
    } else if (id == 2.0) { // Polished Chrome
        color = vec3(0.95, 0.95, 0.98);
        roughness = 0.02;
        metallic = 0.95;
        spec = 1.5;
    } else if (id == 3.0) { // Tires / Rubber
        color = vec3(0.08, 0.08, 0.09);
        roughness = 0.8;
        spec = 0.1;
    } else if (id == 4.0) { // Window Glass
        color = vec3(0.04, 0.05, 0.08);
        roughness = 0.01;
        metallic = 0.95;
        spec = 1.2;
    } else if (id == 6.0) { // Headlights
        color = uDayNight == 1.0 ? vec3(0.95, 0.85, 0.75) : vec3(1.8, 1.6, 1.4);
        emission = uDayNight == 1.0 ? 0.3 : 2.0;
        roughness = 0.1;
    } else if (id == 7.0) { // Amber marker lights
        color = uDayNight == 1.0 ? vec3(0.8, 0.35, 0.05) : vec3(1.8, 0.8, 0.1);
        emission = uDayNight == 1.0 ? 0.3 : 2.2;
        roughness = 0.1;
    } else if (id == 8.0) { // Chassis Frame
        color = vec3(0.14, 0.14, 0.16);
        roughness = 0.6;
        spec = 0.3;
    }

    // Light setups in local coordinate space
    vec3 lightDirLocal = normalize((uWorldInverse * vec4(uLightDir, 0.0)).xyz);
    vec3 viewDir = -rd;
    vec3 halfDir = normalize(lightDirLocal + viewDir);

    // Ambient light
    vec3 ambient = color * (uDayNight == 1.0 ? 0.32 : 0.04);

    // Diffuse with local soft-shadowing
    float diff = max(dot(normal, lightDirLocal), 0.0);
    float sh = 1.0;
    if (diff > 0.01) {
        sh = shadow(p + normal * 0.01, lightDirLocal, 0.02, 1.5, 12.0);
    }
    vec3 diffuse = color * diff * sh * (uDayNight == 1.0 ? 0.95 : 0.15);

    // Specular reflections
    float specPower = pow(max(dot(normal, halfDir), 0.0), mix(128.0, 16.0, roughness));
    vec3 specular = vec3(spec * specPower * sh) * (metallic * 0.8 + 0.2) * (uDayNight == 1.0 ? 1.0 : 0.25);

    // Simulated environment sky reflections
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

    // Raymarch starting from boundaries inside bounding box
    vec3 marchStart = vPosition;

    float t = 0.0;
    float dMax = 5.0; // slightly wider bounds for the truck length
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
        discard;
    }

    // Shading execution
    vec3 p = marchStart + rd * t;
    vec3 normal = calcNormal(p);
    vec3 finalColor = shade(p, normal, rd, res.y);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
