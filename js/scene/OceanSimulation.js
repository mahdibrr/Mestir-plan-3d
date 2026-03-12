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
        varying vec3 vWorldPosition;
        
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        
        void main() {
          vUv = uv * 20.0; // Higher tiling for more detail
          vec3 pos = position;
          
          // Gerstner Waves approximation for sharper crests
          float wave1 = sin(pos.x * waveFrequency + time * 0.8) * waveHeight;
          float wave2 = cos(pos.y * waveFrequency * 0.7 + time * 1.2) * waveHeight * 0.6;
          float wave3 = sin((pos.x + pos.y) * waveFrequency * 1.2 + time * 1.5) * waveHeight * 0.3;
          
          float elevation = wave1 + wave2 + wave3;
          pos.z += elevation;
          
          vElevation = elevation;
          vPosition = pos;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          vNormal = normal;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        
        uniform vec3 waterColor;
        uniform vec3 foamColor;
        uniform sampler2D normalMap;
        uniform float normalScale;
        uniform float time;
        uniform vec3 sunDirection;
        
        void main() {
          // Animated normal map for surface detail
          vec2 uv1 = vUv + vec2(time * 0.05, time * 0.03);
          vec2 uv2 = vUv * 0.5 - vec2(time * 0.04, time * 0.06);
          
          vec3 normal1 = texture2D(normalMap, uv1).rgb * 2.0 - 1.0;
          vec3 normal2 = texture2D(normalMap, uv2).rgb * 2.0 - 1.0;
          vec3 surfaceNormal = normalize(normal1 + normal2);
          
          // Fresnel effect for realistic water reflection
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(viewDirection, vec3(0.0, 1.0, 0.0)), 0.0), 5.0);
          
          // Specular highlights from sun
          vec3 reflectDir = reflect(-sunDirection, surfaceNormal);
          float specular = pow(max(dot(viewDirection, reflectDir), 0.0), 128.0);
          
          // Wave crest foam
          float foamMix = smoothstep(0.8, 1.8, vElevation) * 0.6;
          
          // Combine effects
          vec3 deepColor = vec3(0.005, 0.05, 0.1);
          vec3 shallowColor = vec3(0.1, 0.4, 0.5);

          // Dynamic water color based on elevation and view angle
          vec3 color = mix(deepColor, shallowColor, vElevation * 0.2 + 0.5);
          color = mix(color, shallowColor * 1.5, fresnel);
          
          // Add foam to wave crests
          color = mix(color, foamColor, foamMix);
          
          // Add sun specular
          color += vec3(1.0, 0.9, 0.7) * specular * 2.0;
          
          // Opacity
          float opacity = 0.92;
          
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
