const fragmentShader = `
uniform vec3 u_color;
uniform float u_time;
uniform float u_frequency;
uniform float u_hueMix;

varying vec3 vPosition;
varying vec3 vNormal;
varying float vNoise;

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  // Base noise for nebula clouds
  float nebulaNoise = vNoise * 0.5 + 0.5;

  // Fresnel for soft edge glow
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - dot(normalize(vNormal), viewDirection);
  fresnel = pow(fresnel, 2.0);

  // Dynamic hue from audio and time
  float hue = fract(u_time * 0.05 + u_frequency * 0.001);
  vec3 dynamicHsv = vec3(hue, 0.7, 0.9);
  vec3 dynamicColor = hsv2rgb(dynamicHsv);

  // Mix base color with dynamic hue
  vec3 mixedColor = mix(u_color, dynamicColor, u_hueMix);

  // Nebula cloud effect
  vec3 nebulaColor = mixedColor * nebulaNoise;

  // Starfield effect
  float starNoise = pnoise(vPosition * 40.0, vec3(10.0));
  float stars = smoothstep(0.95, 1.0, starNoise);

  // Core glow effect
  float coreGlow = 1.0 - length(vPosition) / 3.0; // Brightest at the center
  coreGlow = pow(coreGlow, 3.0);
  vec3 coreColor = mixedColor * 1.5;

  // Combine effects
  vec3 finalColor = nebulaColor + stars * 0.8 + coreColor * coreGlow * 0.5;

  // Alpha for a soft, friendly, and gaseous feel
  float alpha = (nebulaNoise * 0.3 + fresnel * 0.7) * (1.0 - coreGlow * 0.6);
  alpha = smoothstep(0.0, 0.7, alpha); // Softer falloff

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export default fragmentShader;
