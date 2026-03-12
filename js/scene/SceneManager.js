import * as THREE from 'three';
import { CameraController } from './CameraController.js';
import { TowerBuilder } from './TowerBuilder.js';
import { TerrainGenerator } from './TerrainGenerator.js';
import { CableSystem } from './CableSystem.js';
import { RiderAnimation } from './RiderAnimation.js';
import { UIController } from './UIController.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';

export class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cameraController = null;
    
    this.towerBuilder = null;
    this.terrainGenerator = null;
    this.cableSystem = null;
    this.rider = null;
    this.environment = null;
    this.ui = null;
    this.performanceMonitor = null;
    
    this.timeScale = 1.0;
    
    this.clock = new THREE.Clock();
    
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    
    this.environment = new EnvironmentManager(this.scene, this.renderer);
    
    // Procedural Element Instantiation
    this.terrainGenerator = new TerrainGenerator(this.scene);
    this.terrainGenerator.build();
    
    this.towerBuilder = new TowerBuilder(this.scene);
    this.towerBuilder.build();
    
    this.cableSystem = new CableSystem(
      this.scene, 
      this.towerBuilder.getStartPoint(), 
      this.towerBuilder.getEndPoint()
    );
    
    this.rider = new RiderAnimation(this.scene, this.cableSystem);
    
    this.ui = new UIController(this);
    
    this.performanceMonitor = new PerformanceMonitor(this.renderer, 60);
    
    // Set initial custom view
    this.camera.position.set(0, 300, 500);
    this.cameraController.controls.target.set(0, 0, 0);
    this.cameraController.controls.update();
    
    this.addResizeListener();
    this.renderLoop();
    
    console.log("SceneManager Initialized Successfully.");
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // PBR Tonemapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.container.appendChild(this.renderer.domElement);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); 
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.001); 
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
  }

  setCameraView(viewName) {
    this.cameraController.setView(viewName, {
      departurePos: this.towerBuilder.departurePosition,
      arrivalPos: this.towerBuilder.arrivalPosition
    });
  }

  addResizeListener() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  renderLoop() {
    requestAnimationFrame(this.renderLoop.bind(this));
    
    const delta = this.clock.getDelta() * this.timeScale;
    
    if (this.cameraController) this.cameraController.update();
    if (this.environment) this.environment.update(delta);
    if (this.terrainGenerator) this.terrainGenerator.update(delta);
    if (this.performanceMonitor) this.performanceMonitor.update();
    
    if (this.rider) {
      this.rider.update(delta);
      if (this.ui) {
        this.ui.updateTelemetry(this.rider.getTelemetry());
      }
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Auto-initialize if running directly on the scene page
if (document.getElementById('scene-container')) {
  new SceneManager('scene-container');
}
