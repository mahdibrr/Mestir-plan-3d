import * as THREE from 'three';

export class RiderAnimation {
  constructor(scene, cableSystem) {
    this.scene = scene;
    this.cable = cableSystem;
    
    // Rider Properties
    this.weight = 80; // kg
    
    // Animation State
    this.duration = 45; // seconds
    this.progress = 0; // 0.0 to 1.0
    this.speed = 0; // m/s
    this.isPlaying = false;
    
    this.position = new THREE.Vector3();
    this.meshGroup = null;
    
    this.build();
  }
  
  build() {
    this.meshGroup = new THREE.Group();
    
    // Simplified Rider geometry for Phase 2/3
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -1; // hanging below cable
    body.castShadow = true;
    
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffff00 }); // Yellow helmet
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = -0.2;
    head.castShadow = true;
    
    // Pulley connection
    const connectionGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4);
    const connectionMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const connection = new THREE.Mesh(connectionGeo, connectionMat);
    connection.position.y = -0.4;
    
    this.meshGroup.add(body);
    this.meshGroup.add(head);
    this.meshGroup.add(connection);
    
    this.scene.add(this.meshGroup);
    
    // Initial position
    this.updatePosition();
  }
  
  play() {
    this.isPlaying = true;
  }
  
  pause() {
    this.isPlaying = false;
  }
  
  reset() {
    this.progress = 0;
    this.speed = 0;
    this.isPlaying = false;
    this.updatePosition();
  }
  
  update(deltaTime) {
    if (!this.isPlaying) return;
    
    // Advance progress based on duration
    this.progress += deltaTime / this.duration;
    
    if (this.progress > 1) {
      this.progress = 1;
      this.isPlaying = false;
      this.speed = 0;
    } else {
      // Calculate speed profile
      // Acceleration: 0 to 10%
      // Constant: 10% to 90%
      // Deceleration: 90% to 100%
      const maxSpeed = 15; // 15 m/s
      
      if (this.progress < 0.1) {
        this.speed = (this.progress / 0.1) * maxSpeed;
      } else if (this.progress < 0.9) {
        this.speed = maxSpeed;
      } else {
        this.speed = ((1 - this.progress) / 0.1) * maxSpeed;
      }
    }
    
    this.updatePosition();
  }
  
  updatePosition() {
    // Get updated point from cable catenary
    const newPos = this.cable.updateWithRider(this.progress, this.weight);
    this.position.copy(newPos);
    
    // Apply pendulum swing based on progression and speed
    const swingAngle = Math.sin(this.progress * Math.PI * 8) * (this.speed / 15) * 0.2;
    
    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.z = swingAngle; // Rotate along Z to simulate lateral swing
    
    // Point rider along the cable tangent
    if(this.progress < 1) {
       const nextPos = this.cable.curve.getPoint(Math.min(1, this.progress + 0.01));
       this.meshGroup.lookAt(nextPos);
    }
  }

  getTelemetry() {
    return {
      speed: this.speed,
      distance: this.progress * 550, // total length ~550m
      altitude: this.position.y,
      tension: 45 + Math.sin(this.progress * Math.PI) * 15, // fake tension varying
      gForce: 1 + Math.abs(Math.sin(this.progress * Math.PI * 4)) * 0.15
    };
  }
}
