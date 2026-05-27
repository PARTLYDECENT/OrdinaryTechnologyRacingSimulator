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
        
        // --- GLITCHY HOLOGRAPHIC SCANNING CRESCENT MOON ---
        vec3 moonDir = normalize(vec3(-0.7, 0.45, -0.55));
        float moonRadius = 0.16;
        
        // Procedural digital glitch displacement offsets
        float glitchPhase = sin(time * 32.0) * cos(time * 8.0);
        float activeGlitch = step(0.975, hash(vec3(floor(time * 9.0), 12.0, 3.0)));
        vec3 moonOffset = vec3(activeGlitch * 0.018 * glitchPhase, 0.0, 0.0);
        
        vec3 shiftedMoonDir = normalize(moonDir + moonOffset);
        float distToMoon = length(rd - shiftedMoonDir);
        float distToMask = length(rd - (shiftedMoonDir + vec3(0.045, 0.045, 0.0)));
        
        if (distToMoon < moonRadius && distToMask > moonRadius * 0.8) {
            // Horizontal scrolling digital scanline mask
            float scan = sin(rd.y * 145.0 + time * 7.0);
            if (scan > -0.58) {
                float moonFade = smoothstep(moonRadius, moonRadius - 0.008, distToMoon);
                // Glowing electric cyan core fading to dark cobalt
                vec3 moonCol = mix(vec3(0.0, 1.0, 0.85), vec3(0.0, 0.25, 0.75), distToMoon / moonRadius);
                
                // Cybernetic concentric grid circular ring overlays inside moon
                float rings = step(0.25, sin(distToMoon * 170.0 - time * 5.0));
                moonCol = mix(moonCol, vec3(1.0, 0.0, 0.6), rings * 0.35);
                
                // Holographic color flicker
                float flicker = 0.82 + 0.18 * sin(time * 45.0);
                finalColor = mix(finalColor, moonCol, moonFade * 0.78 * flicker);
            }
        }
        
        // --- CYBERNETIC AURORA BOREALIS NEON RIBBONS ---
        if (rd.y > 0.0) {
            float auroraWave1 = sin(rd.x * 2.2 + time * 0.35) * cos(rd.z * 1.8 + time * 0.25);
            float auroraWave2 = cos(rd.x * 1.4 - time * 0.2) * sin(rd.z * 3.2 + time * 0.45);
            float auroraDensity = smoothstep(0.12, 0.58, rd.y) * smoothstep(0.85, 0.4, rd.y) * max(0.0, auroraWave1 * 0.5 + auroraWave2 * 0.5);
            vec3 auroraCol = mix(vec3(0.0, 1.0, 0.4), vec3(0.0, 0.7, 1.0), auroraWave1 * 0.5 + 0.5);
            finalColor += auroraCol * auroraDensity * 0.38;
        }
        
        // Horizon vertical city grid lines (skyscraper skylines in distance) with flickering windows!
        if (rd.y > 0.0 && rd.y < 0.12) {
            float pillarGrid = sin(atan(rd.z, rd.x) * 90.0);
            float pillarHeight = hash(vec3(floor(atan(rd.z, rd.x) * 15.0), 0.0, 0.0)) * 0.08 + 0.02;
            if (pillarGrid > 0.45 && rd.y < pillarHeight) {
                float bloom = (1.0 - (rd.y / pillarHeight));
                vec3 buildingCol = vec3(0.0, 0.45, 0.85);
                
                // Animated flickering digital windows inside skyscraper facades
                float winGrid = step(0.68, sin(rd.y * 360.0)) * step(0.68, sin(atan(rd.z, rd.x) * 480.0));
                float winSwitch = hash(vec3(floor(atan(rd.z, rd.x) * 85.0), floor(rd.y * 90.0), floor(time * 0.4)));
                if (winGrid > 0.1 && winSwitch > 0.42) {
                    buildingCol = (winSwitch > 0.85) ? vec3(1.0, 0.1, 0.65) : vec3(0.0, 0.95, 1.0); // magenta & cyan windows
                }
                
                finalColor = mix(finalColor, buildingCol, bloom * 0.4);
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
        
        // Shifting spatial nebula gases flowing coordinate mapping
        vec3 gasFlow = rd;
        gasFlow.xy += vec2(sin(rd.z * 1.6 + time * 0.1), cos(rd.x * 1.4 - time * 0.08)) * 0.06;
        
        float nebula1 = sin(gasFlow.x * 1.8 + time * 0.15) * cos(gasFlow.y * 1.5 - time * 0.1) * cos(gasFlow.z * 1.2);
        float nebula2 = cos(gasFlow.y * 2.5 - time * 0.12) * sin(gasFlow.z * 2.0 + time * 0.1);
        float density = max(0.0, nebula1 * 0.5 + nebula2 * 0.5);
        
        vec3 nebulaCol = mix(vec3(0.65, 0.0, 0.88), vec3(1.0, 0.0, 0.58), density);
        finalColor = grad + nebulaCol * density * 0.32;
        
        // --- GIANT SWIRLING ACCRETION GRAVITY SINGULARITY (BLACK HOLE) ---
        // Accretion disk at the top pole of the skybox dome
        if (rd.y > 0.18) {
            float r = length(rd.xz);
            float accretionRadius = 0.45;
            
            if (r < accretionRadius) {
                if (r < 0.075) {
                    // Pure event horizon core: blocks all sky emission underneath
                    finalColor = vec3(0.0);
                } else {
                    // Swirling logarithmic spiral formula for accretion bands
                    float theta = atan(rd.z, rd.x);
                    float spiral = sin(15.0 * log(r) - 3.5 * theta + time * 5.2);
                    
                    // Radial gradient bounds with dynamic corona flares
                    float intensity = smoothstep(accretionRadius, 0.14, r) * smoothstep(0.065, 0.09, r);
                    float flares = 1.0 + 0.12 * sin(theta * 9.0 + time * 2.5) * cos(theta * 5.0 - time * 1.8);
                    intensity *= flares;
                    
                    // Accretion disk shifts dynamically between hot magenta, gold, and crimson core flares
                    vec3 diskCol = mix(vec3(1.0, 0.0, 0.6), vec3(1.0, 0.72, 0.0), spiral * 0.5 + 0.5);
                    finalColor = mix(finalColor, diskCol, intensity * (0.65 + 0.35 * spiral) * 0.92);
                }
            }
        }
        
        // --- RELATIVISTIC PLASMA JETS ---
        // Beams of intense fuchsia energy blasting vertically from the singularity core poles
        float jetDistance = length(rd.xz);
        if (rd.y > 0.04 && jetDistance < 0.062) {
            float jetSpike = smoothstep(0.062, 0.0, jetDistance) * smoothstep(0.0, 0.85, rd.y);
            float jetPulse = 0.78 + 0.22 * sin(time * 28.0);
            vec3 jetCol = mix(vec3(0.55, 0.0, 1.0), vec3(1.0, 0.0, 0.55), rd.y);
            finalColor += jetCol * jetSpike * jetPulse * 0.95;
        }
        
        // --- COSMIC LIGHTNING ELECTRICAL STORM SHEET FLARES ---
        float lightningFlash = step(0.985, hash(vec3(floor(time * 3.8), 22.0, 5.0))) * max(0.0, sin(time * 78.0));
        finalColor += vec3(0.45, 0.72, 1.0) * lightningFlash * 0.38;
        
        // Bright shining stardust clusters
        float starVal = hash(floor(rd * 45.0));
    } else if (uMapTheme == 4.0) {
        // ==========================================
        // --- MAP 4: RACE 1 (CYBER GRID TRACK) ---
        // ==========================================
        // Deep cyber forest green/midnight vertical backdrop gradient
        vec3 bottomCol = vec3(0.0, 0.015, 0.008);
        vec3 topCol = vec3(0.0, 0.003, 0.0015);
        vec3 horizonCol = vec3(0.0, 1.0, 0.45); // vibrant racing green horizon bloom
        
        float horizonFade = smoothstep(-0.25, 0.35, rd.y);
        vec3 grad = mix(bottomCol, topCol, horizonFade);
        
        // Low horizon atmospheric neon glow
        float glow = pow(max(0.0, 1.0 - abs(rd.y)), 10.0);
        finalColor = grad + horizonCol * glow * 0.48;
        
        // --- FLOATING DIGITAL BINARY DATA RAIN / STREAM CODES ---
        if (rd.y > -0.05) {
            float streamGrid = hash(floor(rd * vec3(120.0, 15.0, 120.0)));
            if (streamGrid > 0.965) {
                // Scroll down over time
                float scroll = fract(-time * 1.8 + streamGrid * 100.0);
                float alpha = smoothstep(0.0, 0.15, scroll) * smoothstep(1.0, 0.6, scroll);
                finalColor += vec3(0.0, 1.0, 0.4) * alpha * 0.28;
            }
        }
        
        // --- 3D PERSPECTIVE VERTICAL CYBER GRID LINES ---
        if (rd.y > 0.0 && rd.y < 0.25) {
            // Draw neat vertical cyan/green data pillars on the horizon
            float pillars = sin(atan(rd.z, rd.x) * 60.0);
            float pHeight = hash(vec3(floor(atan(rd.z, rd.x) * 12.0), 44.0, 0.0)) * 0.14 + 0.02;
            if (pillars > 0.65 && rd.y < pHeight) {
                float intensity = (1.0 - (rd.y / pHeight));
                vec3 pillarCol = vec3(0.0, 0.95, 0.35);
                finalColor = mix(finalColor, pillarCol, intensity * 0.35);
            }
        }
        
        // Vibrant neon green digital blinks
        float starGrid = hash(floor(rd * 40.0));
        if (starGrid > 0.985 && rd.y > -0.05) {
            float blink = 0.5 + 0.5 * sin(time * 4.5 + starGrid * 150.0);
            finalColor += vec3(0.0, 1.0, 0.4) * blink * 0.42;
        }
        
    } else {
        // ==========================================
        // --- MAP 1: CYBERPUNK OUTPOST (Sunset/Ember) ---
        // ==========================================
        // Apply horizontal volumetric heat shimmers sizzling near the horizon
        vec3 warpedRd = rd;
        if (rd.y > -0.06 && rd.y < 0.24) {
            float heatWave = sin(rd.x * 80.0 + time * 7.5) * cos(rd.z * 65.0 - time * 5.5);
            float heatStrength = 0.007 * (1.0 - (rd.y / 0.24));
            warpedRd.x += heatWave * heatStrength;
            warpedRd.z += heatWave * heatStrength;
            warpedRd = normalize(warpedRd);
        }

        if (uDayNight == 1.0) {
            // Golden-sand dusty sunset horizon gradient
            vec3 bottomCol = vec3(1.0, 0.62, 0.32); // dusty sunset orange
            vec3 topCol = vec3(0.32, 0.18, 0.1);    // deep brown sky
            
            float horizonFade = smoothstep(-0.1, 0.5, warpedRd.y);
            finalColor = mix(bottomCol, topCol, horizonFade);
            
            // --- GIANT RETRO SYNTHWAVE HOVERING SUN ---
            // Sun slowly hover sways up and down over time
            float sunYHover = 0.015 * sin(time * 0.45);
            vec3 sunDir = normalize(vec3(0.9, 0.12 + sunYHover, 0.4));
            float sunRadius = 0.22;
            float distToSun = length(warpedRd - sunDir);
            
            if (distToSun < sunRadius) {
                // Retro scanning stripes using y coordinates
                float stripe = sin(warpedRd.y * 85.0);
                // Dynamically widen black stripes near the bottom horizon using linear mix thresholding
                float threshold = mix(-0.8, 0.95, (warpedRd.y - sunDir.y + sunRadius) / (sunRadius * 2.0));
                
                if (stripe > threshold) {
                    float sunFade = smoothstep(sunRadius, sunRadius - 0.008, distToSun);
                    // Glowing volcanic red-orange to hot golden yellow gradient
                    vec3 sunCol = mix(vec3(1.0, 0.15, 0.0), vec3(1.0, 0.88, 0.0), (warpedRd.y - sunDir.y + sunRadius) / (sunRadius * 2.0));
                    finalColor = mix(finalColor, sunCol, sunFade * 0.95);
                }
            }
            
            // Sun atmospheric bloom corona beams
            float thetaSun = atan(warpedRd.y - sunDir.y, warpedRd.x - sunDir.x);
            float sunBeams = sin(thetaSun * 12.0 + time * 1.6) * cos(thetaSun * 6.0 - time * 0.9);
            float sunGlow = pow(max(0.0, dot(warpedRd, sunDir)), 14.0);
            finalColor += vec3(1.0, 0.72, 0.42) * sunGlow * (0.35 + 0.15 * sunBeams);
            
        } else {
            // Night theme: Deep volcanic red horizon glow
            vec3 bottomCol = vec3(0.03, 0.01, 0.01);
            vec3 topCol = vec3(0.005, 0.002, 0.002);
            vec3 glowCol = vec3(1.0, 0.15, 0.0);
            
            float horizonFade = smoothstep(-0.2, 0.45, warpedRd.y);
            vec3 grad = mix(bottomCol, topCol, horizonFade);
            
            float glow = pow(max(0.0, 1.0 - abs(warpedRd.y)), 12.0);
            finalColor = grad + glowCol * glow * 0.52;
            
            // --- DRIFTING RISING LAVA EMBERS ---
            // Floating ashes drift upwards and sway laterally
            vec3 emberCoords = warpedRd;
            emberCoords.y -= time * 0.032;
            emberCoords.x += sin(time * 0.7 + emberCoords.z * 6.0) * 0.02;
            
            float starVal = hash(floor(emberCoords * 40.0));
            if (starVal > 0.982 && warpedRd.y > -0.1) {
                float drift = sin(time * 2.0 + starVal * 70.0);
                finalColor += vec3(1.0, 0.28, 0.0) * (0.2 + 0.8 * max(0.0, drift)) * 0.45;
            }
        }
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
