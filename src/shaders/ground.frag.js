export const groundFragmentShader = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 vWorldPos;
varying vec2 vUV;

uniform vec3 vEyePosition;
uniform float uDayNight;
uniform float uMapTheme; // 1.0 = Cyberpunk Outpost, 2.0 = Neo Tokyo, 3.0 = Nebula Space

// Headlight Projection Uniforms
uniform vec3 uHeadlightPosL;
uniform vec3 uHeadlightPosR;
uniform vec3 uHeadlightDir;
uniform float uHeadlightLIntensity;
uniform float uHeadlightRIntensity;

// Seamless Tiled Texture Samplers
uniform sampler2D uOutpostTex;
uniform sampler2D uTokyoTex;
uniform sampler2D uNebulaTex;

void main() {
    // Draw clean anti-aliased grid lines using standard derivatives
    vec2 grid = abs(fract(vWorldPos.xz / 2.0 - 0.5) - 0.5) / fwidth(vWorldPos.xz / 2.0);
    float line = min(grid.x, grid.y);
    float color = 1.0 - min(line, 1.0);
    
    vec2 majorGrid = abs(fract(vWorldPos.xz / 10.0 - 0.5) - 0.5) / fwidth(vWorldPos.xz / 10.0);
    float majorLine = min(majorGrid.x, majorGrid.y);
    float majorColor = 1.0 - min(majorLine, 1.0);
    
    float finalGrid = max(color * 0.15, majorColor * 0.45);
    
    // Radial fade grid lines into distance
    float dist = length(vWorldPos.xz - vEyePosition.xz);
    float fade = smoothstep(180.0, 10.0, dist);
    
    vec3 gridColor;
    vec3 bgColor;
    
    if (uMapTheme == 2.0) {
        // Neo Tokyo midnight grid theme: Electric cyan / neon blue
        bgColor = vec3(0.01, 0.005, 0.02);
        gridColor = vec3(0.0, 0.8, 1.0) * finalGrid * 0.95 + vec3(0.0, 0.3, 0.75) * finalGrid * 0.3;
    } else if (uMapTheme == 3.0) {
        // Space nebula theme: deep indigo sky / hot magenta-pink grid
        bgColor = vec3(0.02, 0.005, 0.04);
        gridColor = vec3(1.0, 0.0, 0.8) * finalGrid * 0.95 + vec3(0.5, 0.0, 0.8) * finalGrid * 0.35;
    } else {
        // Baseline Cyberpunk Outpost theme
        if (uDayNight == 1.0) {
            bgColor = vec3(0.92, 0.88, 0.84);
            gridColor = vec3(1.0, 0.4, 0.0) * finalGrid * 0.45 + vec3(0.55) * finalGrid * 0.3;
        } else {
            bgColor = vec3(0.04, 0.015, 0.015);
            gridColor = vec3(1.0, 0.25, 0.0) * finalGrid * 0.95 + vec3(1.0, 0.0, 0.0) * finalGrid * 0.35;
        }
    }

    // Sample high-detail seamless tiled ground texture
    vec2 tileUV = vWorldPos.xz * 0.08; // elegant repeating scale
    vec3 texColor = vec3(0.0);
    
    if (uMapTheme == 2.0) {
        texColor = texture2D(uTokyoTex, tileUV).rgb;
    } else if (uMapTheme == 3.0) {
        texColor = texture2D(uNebulaTex, tileUV).rgb;
    } else {
        texColor = texture2D(uOutpostTex, tileUV).rgb;
    }
    
    // Mix textures with background color based on distance fog fade
    vec3 baseFloor = mix(bgColor, texColor, fade);
    
    // Overlay the digital neon grids on top of the pavement texture
    vec3 floorWithGrid = baseFloor + gridColor * fade * 0.85;
    
    // --- HEADLIGHT CONE LIGHTING PROJECTION ---
    float factorL = 0.0;
    
    // Left Headlight
    vec3 toLightL = vWorldPos - uHeadlightPosL;
    float distL = length(toLightL);
    if (distL < 80.0) {
        vec3 dirL = toLightL / distL;
        float cosAngleL = dot(dirL, uHeadlightDir);
        // Extremely narrow and sharp spotlight profile (cos of half-angle ~0.96)
        float spotEffectL = smoothstep(0.958, 0.985, cosAngleL);
        float attenuationL = 1.0 / (1.0 + 0.05 * distL + 0.004 * distL * distL);
        factorL = spotEffectL * attenuationL * (uHeadlightLIntensity / 5.625);
    }
    
    // Right Headlight
    vec3 toLightR = vWorldPos - uHeadlightPosR;
    float distR = length(toLightR);
    float factorR = 0.0;
    if (distR < 80.0) {
        vec3 dirR = toLightR / distR;
        float cosAngleR = dot(dirR, uHeadlightDir);
        float spotEffectR = smoothstep(0.958, 0.985, cosAngleR);
        float attenuationR = 1.0 / (1.0 + 0.05 * distR + 0.004 * distR * distR);
        factorR = spotEffectR * attenuationR * (uHeadlightRIntensity / 5.625);
    }
    
    // Combine light pool factors safely
    float totalFactor = clamp(factorL + factorR, 0.0, 1.0);
    
    // Blend warm halogen color over floor instead of adding, keeping grid visible underneath
    float blendVal = totalFactor * 0.75 * fade;
    vec3 warmLightCol = vec3(1.0, 0.94, 0.82);
    
    vec3 finalColor = mix(floorWithGrid, warmLightCol, blendVal);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
