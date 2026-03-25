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
        
      case 'tower1':
      case 'tower':
        // Close up on departure tower (Tower 1)
        targetPos = new THREE.Vector3(
          sceneData.departurePos.x + 40, 
          sceneData.departurePos.y + 20, 
          sceneData.departurePos.z + 40
        );
        targetLookAt = new THREE.Vector3(
          sceneData.departurePos.x, 
          sceneData.departurePos.y + 15, 
          sceneData.departurePos.z
        );
        break;
        
      case 'tower2':
        // Close up on arrival tower (Tower 2)
        targetPos = new THREE.Vector3(
          sceneData.arrivalPos.x - 30, 
          sceneData.arrivalPos.y + 15, 
          sceneData.arrivalPos.z - 30
        );
        targetLookAt = new THREE.Vector3(
          sceneData.arrivalPos.x, 
          sceneData.arrivalPos.y + 5, 
          sceneData.arrivalPos.z
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
        
      case 'plan':
        // Top-down plan view
        const midX = (sceneData.departurePos.x + sceneData.arrivalPos.x) / 2;
        const midZ = (sceneData.departurePos.z + sceneData.arrivalPos.z) / 2;
        targetPos = new THREE.Vector3(midX, 500, midZ);
        targetLookAt = new THREE.Vector3(midX, 0, midZ);
        break;
        
      case 'side':
        // Side view showing cable profile
        const midPoint = new THREE.Vector3(
          (sceneData.departurePos.x + sceneData.arrivalPos.x) / 2,
          (sceneData.departurePos.y + sceneData.arrivalPos.y) / 2,
          (sceneData.departurePos.z + sceneData.arrivalPos.z) / 2
        );
        targetPos = new THREE.Vector3(
          midPoint.x,
          midPoint.y + 50,
          midPoint.z + 400
        );
        targetLookAt = midPoint;
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
