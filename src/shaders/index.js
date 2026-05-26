import { carVertexShader } from './car.vert.js';
import { carFragmentShader } from './car.frag.js';
import { groundVertexShader } from './ground.vert.js';
import { groundFragmentShader } from './ground.frag.js';
import { truckFragmentShader } from './truck.frag.js';
import { skyboxVertexShader } from './skybox.vert.js';
import { skyboxFragmentShader } from './skybox.frag.js';

export function registerShaders() {
  if (typeof BABYLON !== 'undefined') {
    BABYLON.Effect.ShadersStore['carVertexShader'] = carVertexShader;
    BABYLON.Effect.ShadersStore['carFragmentShader'] = carFragmentShader;
    BABYLON.Effect.ShadersStore['groundVertexShader'] = groundVertexShader;
    BABYLON.Effect.ShadersStore['groundFragmentShader'] = groundFragmentShader;
    BABYLON.Effect.ShadersStore['truckVertexShader'] = carVertexShader; // Reuses basic vertex shader
    BABYLON.Effect.ShadersStore['truckFragmentShader'] = truckFragmentShader;
    BABYLON.Effect.ShadersStore['skyboxVertexShader'] = skyboxVertexShader;
    BABYLON.Effect.ShadersStore['skyboxFragmentShader'] = skyboxFragmentShader;
  } else {
    console.error('Babylon.js is not loaded. Cannot register shaders.');
  }
}
