export function createTruck(scene, initialPosition) {
  // Create the SDF Truck Bounding Box container (larger to contain truck's length and height)
  const truckBox = BABYLON.MeshBuilder.CreateBox("truckBox", { width: 4.5, height: 2.0, depth: 1.5 }, scene);
  
  // Set initial Y center position so tires touch the ground perfectly
  const adjustedPos = initialPosition.clone();
  adjustedPos.y = 0.62; // Center offset to land wheels on ground
  truckBox.position.copyFrom(adjustedPos);
  
  const truckMaterial = new BABYLON.ShaderMaterial("truckShader", scene, {
    vertex: "truck",
    fragment: "truck",
  }, {
    attributes: ["position", "normal", "uv"],
    uniforms: [
      "world", "view", "projection", "uCameraPos", "uWorldInverse", 
      "uWheelRotation", "uSteeringAngle", "uLightDir", "uDayNight", "time"
    ]
  });
  
  truckMaterial.backFaceCulling = true;
  truckBox.material = truckMaterial;

  // Add elongated soft shadow texture plane directly below truck frame
  const shadowPlane = BABYLON.MeshBuilder.CreatePlane("shadowPlane", { width: 4.8, height: 2.0 }, scene);
  shadowPlane.rotation.x = Math.PI / 2;
  shadowPlane.parent = truckBox;
  shadowPlane.position.set(-0.25, -0.61, 0); // Position exactly level with tire bottoms
  
  // Programmatically draw gradient shadow map inside dynamic canvas texture
  const shadowTex = new BABYLON.DynamicTexture("shadowTex", 512, scene);
  const ctx = shadowTex.getContext();
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 230);
  grad.addColorStop(0, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.6, "rgba(0,0,0,0.45)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  shadowTex.update();

  const shadowMat = new BABYLON.StandardMaterial("shadowMat", scene);
  shadowMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  shadowMat.specularColor = new BABYLON.Color3(0, 0, 0);
  shadowMat.opacityTexture = shadowTex;
  shadowPlane.material = shadowMat;

  // Return formatted object matching vehicle API contracts
  return { carBox: truckBox, carMaterial: truckMaterial };
}
