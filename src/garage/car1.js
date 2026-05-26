export function createCar(scene, initialCarPosition) {
  // Create the SDF Car Bounding Box container
  const carBox = BABYLON.MeshBuilder.CreateBox("carBox", { width: 2.2, height: 1.0, depth: 1.2 }, scene);
  carBox.position.copyFrom(initialCarPosition);
  
  const carMaterial = new BABYLON.ShaderMaterial("carShader", scene, {
    vertex: "car",
    fragment: "car",
  }, {
    attributes: ["position", "normal", "uv"],
    uniforms: [
      "world", "view", "projection", "uCameraPos", "uWorldInverse", 
      "uWheelRotation", "uSteeringAngle", "uLightDir", "uDayNight", "time"
    ]
  });
  
  carMaterial.backFaceCulling = true;
  carBox.material = carMaterial;

  // Add simple soft shadow texture plane directly below chassis
  const shadowPlane = BABYLON.MeshBuilder.CreatePlane("shadowPlane", { width: 2.4, height: 1.4 }, scene);
  shadowPlane.rotation.x = Math.PI / 2;
  shadowPlane.parent = carBox;
  shadowPlane.position.set(0, -0.25, 0); // Position exactly level with tire floors
  
  // Programmatically draw gradient oval shadow map inside dynamic canvas texture
  const shadowTex = new BABYLON.DynamicTexture("shadowTex", 256, scene);
  const ctx = shadowTex.getContext();
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 115);
  grad.addColorStop(0, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.45)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  shadowTex.update();

  const shadowMat = new BABYLON.StandardMaterial("shadowMat", scene);
  shadowMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  shadowMat.specularColor = new BABYLON.Color3(0, 0, 0);
  shadowMat.opacityTexture = shadowTex;
  shadowPlane.material = shadowMat;

  return { carBox, carMaterial };
}
