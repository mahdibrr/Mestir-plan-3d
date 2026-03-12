import * as THREE from 'three';

export class OceanSimulation {
  constructor(size, resolution) {
    this.size = size;
    this.resolution = resolution;
    this.time = 0;
    
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waveHeight: { value: 0.8 },
        waveFrequency: { value: 0.05 },
        waterColor: { value: new THREE.Color(0x003366) }, // Deep Mediterranean Blue
        foamColor: { value: new THREE.Color(0xabcdef) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Gerstner-like overlapping sines
          float elevation = sin(pos.x * waveFrequency + time) * waveHeight;
          elevation += cos(pos.y * waveFrequency * 0.7 + time * 1.3) * waveHeight * 0.5;
          elevation += sin((pos.x + pos.y) * waveFrequency * 0.3 + time * 0.8) * waveHeight * 0.3;
          
          pos.z += elevation; // Z is up because plane is rotated
          vElevation = elevation;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vElevation;
        
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        
        void main() {
          // Mix foam color into crests of waves
          float mixStrength = clamp((vElevation + 0.5) * 0.5, 0.0, 1.0);
          vec3 color = mix(waterColor, foamColor, mixStrength * 0.3); // max 30% foam mix
          
          gl_FragColor = vec4(color, 0.85); // 85% opacity
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
    this.mesh = new THREE.Mesh(geometry, this.waterMaterial);
    
    // Rotate to lie flat on XZ plane
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
  }
  
  update(deltaTime) {
    this.time += deltaTime;
    this.waterMaterial.uniforms.time.value = this.time;
  }
}
