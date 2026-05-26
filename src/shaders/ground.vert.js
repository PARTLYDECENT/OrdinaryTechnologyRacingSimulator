export const groundVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform mat4 world;

varying vec3 vWorldPos;
varying vec2 vUV;

void main() {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vWorldPos = (world * vec4(position, 1.0)).xyz;
    vUV = uv;
}
`;
