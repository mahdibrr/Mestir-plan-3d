import * as THREE from 'three';

export class CableSystem {
  constructor(scene, startPoint, endPoint) {
    this.scene = scene;
    this.start = startPoint;
    this.end = endPoint;
    
    // Physics parameters
    this.diameter = 0.016; // 16mm main cable
    this.tension = 45000; // 45kN
    this.segments = 150;
    
    // Shader Material for advanced visualization
    this.cableMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tensionLevel: { value: 0.5 },
        colorLowTension: { value: new THREE.Color(0x00ff00) },
        colorHighTension: { value: new THREE.Color(0xff0000) }
      },
      vertexShader: `
        varying float vTension;
        uniform float tensionLevel;
        void main() {
          vTension = tensionLevel;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vTension;
        uniform vec3 colorLowTension;
        uniform vec3 colorHighTension;
        void main() {
          vec3 color = mix(colorLowTension, colorHighTension, vTension);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    
    this.mesh = null;
    this.curve = null;
    this.build();
  }
  
  // y = a * cosh(x/a)
  calculateCatenary(riderLoadPoint = null, riderWeight = 0) {
    const points = [];
    
    // Simplified catenary projection onto the 3D distance between towers
    const direction = new THREE.Vector3().subVectors(this.end, this.start);
    const spanLength = direction.length();
    
    // 'a' parameter determines sag
    // Tension T = a * w (w is weight per unit length)
    // simplifying for visual representation mapping roughly 15m sag at midpoint
    const a = 1200; 

    for (let i = 0; i <= this.segments; i++) {
        const t = i / this.segments;
        // Linear interpolation in XZ
        const currentPos = new THREE.Vector3().lerpVectors(this.start, this.end, t);
        
        // Catenary sag in Y
        const x = spanLength * t;
        let sag = a * Math.cosh((x - spanLength/2) / a) - a * Math.cosh(spanLength / (2*a));
        
        // Add additional dynamic sag if rider is present
        if (riderLoadPoint) {
           const distToRider = Math.abs(t - riderLoadPoint);
           // Simple dropoff approximation for rider weight
           sag += Math.max(0, (1 - distToRider * 4)) * (riderWeight * 0.005);
        }
        
        currentPos.y -= sag;
        points.push(currentPos);
    }
    
    return points;
  }
  
  build() {
    const points = this.calculateCatenary();
    this.curve = new THREE.CatmullRomCurve3(points);
    
    const geometry = new THREE.TubeGeometry(
      this.curve,
      this.segments,
      this.diameter,
      8,
      false
    );
    
    this.mesh = new THREE.Mesh(geometry, this.cableMaterial);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
  }
  
  updateWithRider(riderProgress, riderWeight) {
    const points = this.calculateCatenary(riderProgress, riderWeight);
    this.curve.points = points;
    this.curve.updateArcLengths();

    // Dispose old geometry to prevent memory leaks, replace with new
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(
      this.curve,
      this.segments,
      this.diameter,
      8,
      false
    );
    
    // Update tension visualization based on progress
    // Max tension hits when rider is near middle
    const tension = Math.sin(riderProgress * Math.PI);
    this.cableMaterial.uniforms.tensionLevel.value = tension;
    
    return this.curve.getPoint(riderProgress);
  }
}
