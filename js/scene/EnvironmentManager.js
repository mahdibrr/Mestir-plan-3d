import * as THREE from 'three';

export class EnvironmentManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    
    this.sunLight = null;
    this.hemiLight = null;
    this.fillLight = null;
    
    // Wind particles
    this.particleSystem = null;
    
    this.timeOfDay = 12; // 0 to 24
    this.windSpeed = 10;
    
    this.setupLighting();
    this.setupParticles();
  }
  
  setupLighting() {
    // Main directional sunlight
    this.sunLight = new THREE.DirectionalLight(0xFFFFE0, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 1500;
    
    const d = 500;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    
    this.scene.add(this.sunLight);

    // Ambient Hemisphere
    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7D6B, 0.4);
    this.scene.add(this.hemiLight);
    
    // Fill light to alleviate harsh shadows
    this.fillLight = new THREE.DirectionalLight(0xFFFFFF, 0.2);
    this.scene.add(this.fillLight);
    
    this.updateTimeOfDay(this.timeOfDay);
  }
  
  setupParticles() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 1000;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.5,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }
  
  updateTimeOfDay(hour) {
    this.timeOfDay = hour;
    
    // Convert hour to angle (0 to PI)
    // 6 AM = 0, 12 PM = PI/2, 6 PM = PI
    const angle = ((hour - 6) / 12) * Math.PI;
    
    // Night time handled via clamping and tinting
    if (hour < 5 || hour > 19) {
      this.sunLight.intensity = 0.1;
      this.hemiLight.intensity = 0.1;
      this.hemiLight.color.setHex(0x0a0a1a);
      this.scene.background.setHex(0x020205);
      this.scene.fog.color.setHex(0x020205);
    } else {
      // Day time
      this.sunLight.intensity = Math.sin(angle) * 1.5;
      
      this.sunLight.position.x = Math.cos(angle) * 500;
      this.sunLight.position.y = Math.sin(angle) * 500;
      this.sunLight.position.z = Math.cos(angle) * 200;
      
      this.fillLight.position.set(-this.sunLight.position.x, 50, -this.sunLight.position.z);
      
      // Color shifts
      if (hour >= 5 && hour < 8) {
        // Sunrise
        this.sunLight.color.setHex(0xffaa55);
        this.scene.background.setHex(0xffaa55);
        this.scene.fog.color.setHex(0xffaa55);
      } else if (hour >= 17 && hour <= 19) {
        // Sunset
        this.sunLight.color.setHex(0xff7733);
        this.scene.background.setHex(0xff7733);
        this.scene.fog.color.setHex(0xff7733);
      } else {
        // Midday
        this.sunLight.color.setHex(0xffffe0);
        this.scene.background.setHex(0x87CEEB);
        this.scene.fog.color.setHex(0x87CEEB);
      }
    }
  }
  
  setWindSpeed(speed) {
    this.windSpeed = speed;
  }
  
  update(delta) {
    if(!this.particleSystem) return;
    
    // Move particles based on wind
    const positions = this.particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += this.windSpeed * delta * 2; // move X
      if (positions[i] > 500) {
        positions[i] = -500;
      }
    }
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
  }
}
