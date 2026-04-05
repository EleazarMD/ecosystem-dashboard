varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform float u_time;
uniform float u_frequency;
uniform float u_dynamism;
uniform float u_roughness;
uniform float u_animationSpeed;

// Perlin noise function
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    return mix(mix(mix(fract(sin(n + 0.0) * 43758.5453123),
                      fract(sin(n + 1.0) * 43758.5453123), f.x),
                  mix(fract(sin(n + 157.0) * 43758.5453123),
                      fract(sin(n + 158.0) * 43758.5453123), f.x), f.y),
              mix(mix(fract(sin(n + 113.0) * 43758.5453123),
                      fract(sin(n + 114.0) * 43758.5453123), f.x),
                  mix(fract(sin(n + 270.0) * 43758.5453123),
                      fract(sin(n + 271.0) * 43758.5453123), f.x), f.y), f.z);
}

void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    
    // Calculate displacement based on noise and audio frequency
    float displacement = noise(normal * u_roughness + u_time * u_animationSpeed) * u_dynamism;
    displacement += (u_frequency / 255.0) * 2.0; // Audio reactivity
    
    // Apply displacement along normal
    vec3 newPosition = position + normal * displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
