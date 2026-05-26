export const carVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;

varying vec3 vPosition;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
    vec4 worldPos = world * vec4(position, 1.0);
    gl_Position = projection * view * worldPos;
    vPosition = position;
    vWorldPos = worldPos.xyz;
    vNormal = (world * vec4(normal, 0.0)).xyz;
}
`;
