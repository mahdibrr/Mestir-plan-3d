import * as THREE from 'three';

export class TowerBuilder {
  constructor(scene) {
    this.scene = scene;
    
    // Specifications
    this.departureTowerHeight = 28;
    this.platformHeight = 25;
    this.baseWidth = 5;
    this.topWidth = 2;
    this.levels = 6;
    
    this.arrivalPostHeight = 6;
    
    // Positions matching map logic: Departure on Peninsula (East), Arrival on Port (West)
    // Map dist = 494m. Our coordinates: dx=450, dz=200 -> ~492m distance.
    this.departurePosition = new THREE.Vector3(200, 10, -50); 
    this.arrivalPosition = new THREE.Vector3(-250, 2, 150);
    
    // Enhanced PBR Materials
    const textureLoader = new THREE.TextureLoader();

    this.steelMaterial = new THREE.MeshStandardMaterial({
      color: 0xB8C5D0,
      roughness: 0.15,
      metalness: 1.0,
      envMapIntensity: 1.5
    });
    
    this.concreteMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B8680,
      roughness: 0.9,
      metalness: 0.0,
      envMapIntensity: 0.5
    });
    
    // Using MeshPhysicalMaterial for the wood to add some clearcoat (varnished look)
    this.woodMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8B7355,
      roughness: 0.6,
      metalness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.0
    });
  }
  
  build() {
    this.buildDepartureTower();
    this.buildArrivalPost();
  }
  
  buildDepartureTower() {
    this.departureGroup = new THREE.Group();
    this.departureGroup.position.copy(this.departurePosition);
    
    // Create Foundation
    const foundationGeo = new THREE.BoxGeometry(6, 2, 6);
    const foundation = new THREE.Mesh(foundationGeo, this.concreteMaterial);
    foundation.position.y = 1;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    this.departureGroup.add(foundation);
    
    // Create Main Legs
    for (let i = 0; i < 4; i++) {
      const leg = this.createLeg(i);
      this.departureGroup.add(leg);
    }
    
    // Create Platform at 25m
    const platformGeo = new THREE.BoxGeometry(4.2, 0.2, 4.2);
    const platform = new THREE.Mesh(platformGeo, this.woodMaterial);
    platform.position.y = this.platformHeight + 1; // Foundation offset
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.departureGroup.add(platform);
    
    // Simple Cross Bracing Shell for now
    // A wireframe box to visually represent the lattice structure before detailing
    const latticeGeo = new THREE.CylinderGeometry(
      this.topWidth * Math.SQRT1_2, 
      this.baseWidth * Math.SQRT1_2, 
      this.departureTowerHeight, 
      4, 
      this.levels
    );
    const latticeMat = new THREE.MeshBasicMaterial({ color: 0xB8C5D0, wireframe: true, transparent: true, opacity: 0.3 });
    const lattice = new THREE.Mesh(latticeGeo, latticeMat);
    lattice.position.y = this.departureTowerHeight / 2 + 1;
    lattice.rotation.y = Math.PI / 4;
    this.departureGroup.add(lattice);
    
    this.scene.add(this.departureGroup);
  }
  
  createLeg(corner) {
    const geometry = new THREE.BoxGeometry(0.2, this.departureTowerHeight, 0.2);
    const leg = new THREE.Mesh(geometry, this.steelMaterial);
    leg.castShadow = true;
    
    // Position based on corner
    const angle = (corner * Math.PI) / 2;
    // Simplify taper for now: lean them slightly or just straight. 
    // We'll make them straight for Phase 2 basic scaffolding, or use a custom geometry for actual taper.
    // Let's position them at the base width
    const radius = (this.baseWidth / 2) - 0.2;
    leg.position.x = Math.cos(angle + Math.PI/4) * radius;
    leg.position.z = Math.sin(angle + Math.PI/4) * radius;
    leg.position.y = (this.departureTowerHeight / 2) + 1; // On top of foundation
    
    return leg;
  }
  
  buildArrivalPost() {
    this.arrivalGroup = new THREE.Group();
    this.arrivalGroup.position.copy(this.arrivalPosition);
    
    // Concrete base
    const baseGeo = new THREE.BoxGeometry(2, 1, 2);
    const base = new THREE.Mesh(baseGeo, this.concreteMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    this.arrivalGroup.add(base);
    
    // Single robust steel pole
    const poleGeo = new THREE.CylinderGeometry(0.2, 0.4, this.arrivalPostHeight, 16);
    const pole = new THREE.Mesh(poleGeo, this.steelMaterial);
    pole.position.y = (this.arrivalPostHeight / 2) + 1;
    pole.castShadow = true;
    pole.receiveShadow = true;
    this.arrivalGroup.add(pole);
    
    this.scene.add(this.arrivalGroup);
  }
  
  getStartPoint() {
    // Return precise attachment point on departure tower
    return new THREE.Vector3(
      this.departurePosition.x,
      this.departurePosition.y + this.platformHeight + 1.5, // slightly above platform
      this.departurePosition.z
    );
  }
  
  getEndPoint() {
    // Return attachment point on arrival post
    return new THREE.Vector3(
      this.arrivalPosition.x,
      this.arrivalPosition.y + this.arrivalPostHeight + 0.5,
      this.arrivalPosition.z
    );
  }
}
