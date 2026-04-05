const vertexShader = `
uniform float u_time;
uniform float u_frequency;
uniform float u_dynamism;
uniform float u_roughness;
uniform float u_animationSpeed;

varying vec3 vPosition;
varying vec3 vNormal;
varying float vNoise;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Noise for displacement (nebula clouds)
  float displacementNoise = pnoise(position * u_roughness * 0.5 + u_time * u_animationSpeed * 0.2, vec3(10.0));
  
  // Noise for color/alpha variation (passed to fragment)
  vNoise = pnoise(position * u_roughness + u_time * u_animationSpeed * 0.5, vec3(10.0));

  // Audio-reactive displacement
  float audioDisplacement = (u_frequency / 200.0) * u_dynamism;
  
  // Combine and apply displacement
  float totalDisplacement = displacementNoise * 0.3 + audioDisplacement;
  vec3 newPosition = position + normal * totalDisplacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

export default vertexShader;
