varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 u_color;
uniform float u_time;
uniform float u_frequency;
uniform float u_hueMix;

// Fresnel effect calculation
float fresnel(vec3 viewDirection, vec3 normal, float power) {
    return pow(1.0 - abs(dot(viewDirection, normal)), power);
}

// RGB to HSV conversion
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    // Calculate view direction for fresnel
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    
    // Base color with fresnel effect
    float fresnelIntensity = fresnel(viewDirection, vNormal, 2.0);
    vec3 baseColor = u_color + fresnelIntensity * 0.5;
    
    // Dynamic color based on audio frequency
    vec3 hsvColor = rgb2hsv(baseColor);
    hsvColor.x += u_time * 0.1 + (u_frequency / 255.0) * 0.2;
    vec3 dynamicColor = hsv2rgb(hsvColor);
    
    // Mix between base and dynamic color based on hueMix
    vec3 finalColor = mix(baseColor, dynamicColor, u_hueMix);
    
    // Add glow based on fresnel
    finalColor += vec3(fresnelIntensity) * 0.3;
    
    // Set alpha based on fresnel for edge transparency
    float alpha = mix(0.6, 1.0, fresnelIntensity);
    
    gl_FragColor = vec4(finalColor, alpha);
}
