import * as THREE from 'three';

export class OceanSimulation {
  constructor(size, resolution) {
    this.size = size;
    this.resolution = resolution;
    this.time = 0;
    
    // Load water normal map texture for realistic water surface
    const textureLoader = new THREE.TextureLoader();
    this.waterNormalMap = textureLoader.load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    );
    
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waveHeight: { value: 1.2 },
        waveFrequency: { value: 0.04 },
        waterColor: { value: new THREE.Color(0x001e3c) },
        foamColor: { value: new THREE.Color(0xffffff) },
        normalMap: { value: this.waterNormalMap },
        normalScale: { value: 0.5 },
        sunDirection: { value: new THREE.Vector3(0.7, 0.7, 0.1).normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        
        void main() {
          vUv = uv * 8.0; // Tile the texture
          vec3 pos = position;
          
          // Multiple wave layers for realistic ocean
          float wave1 = sin(pos.x * waveFrequency + time * 0.8) * waveHeight;
          float wave2 = cos(pos.y * waveFrequency * 0.7 + time * 1.2) * waveHeight * 0.6;
          float wave3 = sin((pos.x + pos.y) * waveFrequency * 0.5 + time * 0.5) * waveHeight * 0.4;
          float wave4 = cos((pos.x - pos.y) * waveFrequency * 0.3 + time * 0.9) * waveHeight * 0.3;
          
          float elevation = wave1 + wave2 + wave3 + wave4;
          pos.z += elevation;
          
          vElevation = elevation;
          vPosition = pos;
          vNormal = normal;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        uniform sampler2D normalMap;
        uniform float normalScale;
        uniform float time;
        uniform vec3 sunDirection;
        
        void main() {
          // Animated normal map for surface detail
          vec2 uv1 = vUv + vec2(time * 0.02, time * 0.015);
          vec2 uv2 = vUv * 0.7 - vec2(time * 0.015, time * 0.02);
          
          vec3 normal1 = texture2D(normalMap, uv1).rgb * 2.0 - 1.0;
          vec3 normal2 = texture2D(normalMap, uv2).rgb * 2.0 - 1.0;
          vec3 normal = normalize(normal1 + normal2) * normalScale;
          
          // Fresnel effect for realistic water reflection
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 3.0);
          
          // Specular highlights from sun
          vec3 reflectDir = reflect(-sunDirection, normal);
          float specular = pow(max(dot(viewDirection, reflectDir), 0.0), 32.0);
          
          // Wave crest foam
          float foamMix = smoothstep(0.5, 1.5, vElevation) * 0.4;
          
          // Combine effects
          vec3 deepWater = waterColor * 0.8;
          vec3 shallowWater = mix(waterColor, vec3(0.0, 0.4, 0.6), 0.3);
          vec3 color = mix(deepWater, shallowWater, fresnel * 0.5);
          
          // Add foam to wave crests
          color = mix(color, foamColor, foamMix);
          
          // Add sun specular
          color += vec3(1.0) * specular * 0.8;
          
          // Slight transparency with depth-based opacity
          float opacity = mix(0.85, 0.95, fresnel);
          
          gl_FragColor = vec4(color, opacity);
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
