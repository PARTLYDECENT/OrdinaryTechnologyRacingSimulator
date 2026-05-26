export const skyboxFragmentShader = `
precision highp float;
varying vec3 vPosition;

uniform float uDayNight;
uniform float uMapTheme; // 1.0 = Outpost, 2.0 = Tokyo, 3.0 = Nebula Space
uniform float time;

// High-fidelity hash for stellar stardust coordinates
float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
}

void main() {
    // Ray direction in local skybox dome space
    vec3 rd = normalize(vPosition);
    
    vec3 finalColor = vec3(0.0);
    
    if (uMapTheme == 2.0) {
        // ==========================================
        // --- MAP 2: NEO TOKYO MIDNIGHT ---
        // ==========================================
        // Deep midnight blue/indigo vertical backdrop gradient
        vec3 bottomCol = vec3(0.008, 0.004, 0.022);
        vec3 topCol = vec3(0.002, 0.001, 0.006);
        vec3 horizonCol = vec3(0.0, 0.22, 0.48); // electric cyan horizon bloom
        
        float horizonFade = smoothstep(-0.25, 0.35, rd.y);
        vec3 grad = mix(bottomCol, topCol, horizonFade);
        
        // Low horizon atmospheric neon glow
        float glow = pow(max(0.0, 1.0 - abs(rd.y)), 10.0);
        finalColor = grad + horizonCol * glow * 0.55;
        
        // --- GIANT HOLOGRAPHIC SCANNING CRESCENT MOON ---
        vec3 moonDir = normalize(vec3(-0.7, 0.45, -0.55));
        float moonRadius = 0.16;
        float distToMoon = length(rd - moonDir);
        // Offset mask to cut out the shadow crescent
        float distToMask = length(rd - (moonDir + vec3(0.045, 0.045, 0.0)));
        
        if (distToMoon < moonRadius && distToMask > moonRadius * 0.8) {
            // Horizontal scrolling digital scanline mask
            float scan = sin(rd.y * 135.0 + time * 3.5);
            if (scan > -0.55) {
                float moonFade = smoothstep(moonRadius, moonRadius - 0.008, distToMoon);
                // Glowing electric cyan core fading to dark cobalt
                vec3 moonCol = mix(vec3(0.0, 1.0, 0.85), vec3(0.0, 0.25, 0.75), distToMoon / moonRadius);
                finalColor = mix(finalColor, moonCol, moonFade * 0.78);
            }
        }
        
        // Horizon vertical city grid lines (simulating skyscraper skylines in distance)
        if (rd.y > 0.0 && rd.y < 0.12) {
            float pillarGrid = sin(atan(rd.z, rd.x) * 90.0);
            float pillarHeight = hash(vec3(floor(atan(rd.z, rd.x) * 15.0), 0.0, 0.0)) * 0.08 + 0.02;
            if (pillarGrid > 0.45 && rd.y < pillarHeight) {
                float bloom = (1.0 - (rd.y / pillarHeight));
                finalColor += vec3(0.0, 0.45, 0.85) * bloom * 0.22;
            }
        }
        
        // Electric stardust stars blinks
        float starGrid = hash(floor(rd * 35.0));
        if (starGrid > 0.985 && rd.y > -0.05) {
            float blink = 0.5 + 0.5 * sin(time * 3.0 + starGrid * 120.0);
            finalColor += vec3(0.0, 0.8, 1.0) * blink * 0.32;
        }
        
    } else if (uMapTheme == 3.0) {
        // ==========================================
        // --- MAP 3: HYPER-SPACE NEBULA ---
        // ==========================================
        // Deep cosmic space indigo/violet backdrop
        vec3 bottomCol = vec3(0.012, 0.004, 0.03);
        vec3 topCol = vec3(0.003, 0.0, 0.008);
        
        float horizonFade = smoothstep(-0.4, 0.4, rd.y);
        vec3 grad = mix(bottomCol, topCol, horizonFade);
        
        // Shifting spatial nebula gases (multi-layered noise)
        float nebula1 = sin(rd.x * 1.8 + time * 0.12) * cos(rd.y * 1.5) * cos(rd.z * 1.2);
        float nebula2 = cos(rd.y * 2.5 - time * 0.09) * sin(rd.z * 2.0);
        float density = max(0.0, nebula1 * 0.5 + nebula2 * 0.5);
        
        vec3 nebulaCol = mix(vec3(0.65, 0.0, 0.88), vec3(1.0, 0.0, 0.58), density);
        finalColor = grad + nebulaCol * density * 0.28;
        
        // --- GIANT SWIRLING ACCRETION GRAVITY SINGULARITY (BLACK HOLE) ---
        // Accretion disk at the top pole of the skybox dome
        if (rd.y > 0.2) {
            // Horizontal radial distance from pole
            float r = length(rd.xz);
            float accretionRadius = 0.42;
            
            if (r < accretionRadius) {
                if (r < 0.075) {
                    // Pure event horizon core: blocks all sky emission underneath
                    finalColor = vec3(0.0);
                } else {
                    // Swirling logarithmic spiral formula for accretion bands
                    float theta = atan(rd.z, rd.x);
                    float spiral = sin(14.0 * log(r) - 3.0 * theta + time * 4.2);
                    
                    // Radial gradient bounds: zero at event horizon edge, peaks, then fades at outer radius
                    float intensity = smoothstep(accretionRadius, 0.14, r) * smoothstep(0.065, 0.09, r);
                    
                    // Accretion disk shifts dynamically between hot magenta and gold core flares
                    vec3 diskCol = mix(vec3(1.0, 0.0, 0.72), vec3(1.0, 0.75, 0.0), spiral * 0.5 + 0.5);
                    finalColor = mix(finalColor, diskCol, intensity * (0.65 + 0.35 * spiral) * 0.88);
                }
            }
        }
        
        // Bright shining stardust clusters
        float starVal = hash(floor(rd * 45.0));
        if (starVal > 0.98 && rd.y > -0.1) {
            float blink = 0.3 + 0.7 * sin(time * 2.2 + starVal * 250.0);
            finalColor += vec3(1.0, 0.7, 1.0) * blink * 0.58;
        }
        
    } else {
        // ==========================================
        // --- MAP 1: CYBERPUNK OUTPOST (Sunset/Ember) ---
        // ==========================================
        if (uDayNight == 1.0) {
            // Golden-sand dusty sunset horizon gradient
            vec3 bottomCol = vec3(1.0, 0.62, 0.32); // dusty sunset orange
            vec3 topCol = vec3(0.32, 0.18, 0.1);    // deep brown sky
            
            float horizonFade = smoothstep(-0.1, 0.5, rd.y);
            finalColor = mix(bottomCol, topCol, horizonFade);
            
            // --- GIANT RETRO SYNTHWAVE SLICED SUN ---
            vec3 sunDir = normalize(vec3(0.9, 0.12, 0.4));
            float sunRadius = 0.22;
            float distToSun = length(rd - sunDir);
            
            if (distToSun < sunRadius) {
                // Retro scanning stripes using y coordinates
                float stripe = sin(rd.y * 85.0);
                // Dynamically widen black stripes near the bottom horizon using linear mix thresholding
                float threshold = mix(-0.8, 0.95, (rd.y - sunDir.y + sunRadius) / (sunRadius * 2.0));
                
                if (stripe > threshold) {
                    float sunFade = smoothstep(sunRadius, sunRadius - 0.008, distToSun);
                    // Glowing volcanic red-orange to hot golden yellow gradient
                    vec3 sunCol = mix(vec3(1.0, 0.15, 0.0), vec3(1.0, 0.88, 0.0), (rd.y - sunDir.y + sunRadius) / (sunRadius * 2.0));
                    finalColor = mix(finalColor, sunCol, sunFade * 0.95);
                }
            }
            
            // Sun atmospheric bloom glow
            float sunGlow = pow(max(0.0, dot(rd, sunDir)), 14.0);
            finalColor += vec3(1.0, 0.78, 0.45) * sunGlow * 0.35;
            
        } else {
            // Night theme: Deep volcanic red horizon glow
            vec3 bottomCol = vec3(0.03, 0.01, 0.01);
            vec3 topCol = vec3(0.005, 0.002, 0.002);
            vec3 glowCol = vec3(1.0, 0.15, 0.0);
            
            float horizonFade = smoothstep(-0.2, 0.45, rd.y);
            vec3 grad = mix(bottomCol, topCol, horizonFade);
            
            float glow = pow(max(0.0, 1.0 - abs(rd.y)), 12.0);
            finalColor = grad + glowCol * glow * 0.52;
            
            // Volcanic ember storms drifting in sky
            float starVal = hash(floor(rd * 40.0));
            if (starVal > 0.985 && rd.y > -0.1) {
                float drift = sin(time * 1.6 + starVal * 60.0);
                finalColor += vec3(1.0, 0.2, 0.0) * (0.25 + 0.75 * max(0.0, drift)) * 0.35;
            }
        }
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
