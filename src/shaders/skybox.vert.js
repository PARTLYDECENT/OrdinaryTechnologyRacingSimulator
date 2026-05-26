export const skyboxVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;

varying vec3 vPosition;

void main() {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vPosition = position;
}
`;
