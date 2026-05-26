export function createSkybox(scene) {
  // 1. Create a massive Skybox mesh centered around the player
  const skybox = BABYLON.MeshBuilder.CreateBox("skyboxMesh", { size: 1200.0 }, scene);
  
  // Create Custom Shader Material for procedural dynamic sky color blendings
  const skyboxMaterial = new BABYLON.ShaderMaterial("skyboxMaterial", scene, {
    vertex: "skybox",
    fragment: "skybox",
  }, {
    attributes: ["position", "uv"],
    uniforms: ["worldViewProjection", "uDayNight", "uMapTheme", "time"]
  });
  
  // Set material parameters
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.disableDepthWrite = true; // prevents z-fighting at depth bounds
  skybox.material = skyboxMaterial;
  
  // Set baseline themes
  skyboxMaterial.setFloat("uDayNight", 0.0);
  skyboxMaterial.setFloat("uMapTheme", 1.0);
  skyboxMaterial.setFloat("time", 0.0);

  // 2. Add an observer to keep the skybox centered exactly on the tracking camera
  const skyboxObserver = scene.onBeforeRenderObservable.add(() => {
    const data = scene.customData;
    if (data && data.camera) {
      skybox.position.copyFrom(data.camera.position);
    }
  });

  // Save references for map loading/cleanup
  scene.customData.skyboxMesh = skybox;
  scene.customData.skyboxMaterial = skyboxMaterial;
  scene.customData.skyboxObserver = skyboxObserver;

  return { skybox, skyboxMaterial };
}

export function cleanupSkybox(scene) {
  if (scene.customData.skyboxMesh) {
    scene.customData.skyboxMesh.dispose();
    scene.customData.skyboxMesh = null;
  }
  if (scene.customData.skyboxMaterial) {
    scene.customData.skyboxMaterial.dispose();
    scene.customData.skyboxMaterial = null;
  }
  if (scene.customData.skyboxObserver) {
    scene.onBeforeRenderObservable.remove(scene.customData.skyboxObserver);
    scene.customData.skyboxObserver = null;
  }
}
