import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    
    // Configuration
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 1500;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    
    // Track target for smooth transitions
    this.currentTarget = new THREE.Vector3(0, 0, 0);
  }
  
  update() {
    this.controls.update();
  }
  
  // Transition to a specific view
  setView(viewName, sceneData) {
    let targetPos, targetLookAt;
    
    switch (viewName) {
      case 'overview':
        // High angle viewing whole scene
        targetPos = new THREE.Vector3(0, 400, 600);
        targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
        
      case 'tower':
        // Close up on departure tower
        // Assume tower is at sceneData.departurePos
        targetPos = new THREE.Vector3(
          sceneData.departurePos.x + 30, 
          sceneData.departurePos.y + 25, 
          sceneData.departurePos.z + 30
        );
        targetLookAt = new THREE.Vector3(
          sceneData.departurePos.x, 
          sceneData.departurePos.y + 15, 
          sceneData.departurePos.z
        );
        break;
        
      case 'cable':
        // Looking down the cable
        targetPos = new THREE.Vector3(
          sceneData.departurePos.x - 10,
          sceneData.departurePos.y + 30,
          sceneData.departurePos.z - 10
        );
        targetLookAt = sceneData.arrivalPos;
        break;
        
      default:
        return;
    }
    
    this.animateTo(targetPos, targetLookAt);
  }
  
  animateTo(position, lookAt) {
    // Animate Camera Position
    gsap.to(this.camera.position, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration: 1.5,
      ease: "power2.inOut"
    });
    
    // Animate Controls Target
    gsap.to(this.controls.target, {
      x: lookAt.x,
      y: lookAt.y,
      z: lookAt.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        this.controls.update();
      }
    });
  }
}
