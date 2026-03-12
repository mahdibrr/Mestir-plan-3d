import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
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
    this.composer = null;
    this.godRaysParams = null;
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
    try {
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupPostProcessing();
      
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
    } catch (error) {
      this.showWebGLError(error);
    }
  }

  setupRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch (error) {
      throw new Error('WebGL is not available in your browser. Please enable hardware acceleration or try a different browser.');
    }
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // PBR Tonemapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.container.appendChild(this.renderer.domElement);
  }

  setupPostProcessing() {
    this.setupGodRays();

    const renderScene = new RenderPass(this.scene, this.camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5, // strength
      0.4, // radius
      0.85 // threshold
    );

    const outputPass = new OutputPass();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    if (this.godRaysPass) this.composer.addPass(this.godRaysPass);
    this.composer.addPass(outputPass);
  }

  setupGodRays() {
    this.godRaysParams = {
      enabled: true,
      exposure: 0.6,
      decay: 0.95,
      density: 0.8,
      weight: 0.4,
      samples: 100
    };

    // Sun for God Rays
    const sunGeometry = new THREE.SphereGeometry(20, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMesh.position.set(500, 300, -500);
    this.scene.add(this.sunMesh);

    // Implementation of Volumetric God Rays Pass
    this.godRaysPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
        exposure: { value: 0.15 },
        decay: { value: 0.95 },
        density: { value: 0.8 },
        weight: { value: 0.4 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec2 lightPosition;
        uniform float exposure;
        uniform float decay;
        uniform float density;
        uniform float weight;

        const int SAMPLES = 64;

        void main() {
          vec2 deltaTexCoord = (vUv - lightPosition);
          deltaTexCoord *= 1.0 / float(SAMPLES) * density;
          vec4 color = texture2D(tDiffuse, vUv);
          float illuminationDecay = 1.0;
          vec2 coord = vUv;

          for (int i = 0; i < SAMPLES; i++) {
            coord -= deltaTexCoord;
            vec4 texSample = texture2D(tDiffuse, coord);
            texSample *= illuminationDecay * weight;
            color += texSample;
            illuminationDecay *= decay;
          }

          gl_FragColor = color * exposure;
        }
      `
    });
  }

  showWebGLError(error) {
    console.error('WebGL initialization failed:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      text-align: center;
      font-family: Arial, sans-serif;
      z-index: 1000;
    `;
    
    errorDiv.innerHTML = `
      <h2 style="margin-top: 0; color: #ff6b6b;">WebGL Not Available</h2>
      <p style="margin: 15px 0;">This 3D visualization requires WebGL, which is currently unavailable in your browser.</p>
      <p style="margin: 15px 0; font-size: 14px; color: #ccc;">
        <strong>Possible solutions:</strong><br>
        • Enable hardware acceleration in your browser settings<br>
        • Update your graphics drivers<br>
        • Try a different browser (Chrome, Firefox, Edge)<br>
        • Check if WebGL is blocked by browser extensions
      </p>
      <p style="margin: 15px 0; font-size: 12px; color: #888;">
        Error: ${error.message}
      </p>
    `;
    
    this.container.appendChild(errorDiv);
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
      if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  renderLoop() {
    requestAnimationFrame(this.renderLoop.bind(this));
    
    if (this.sunMesh && this.environment && this.environment.sunLight) {
        this.sunMesh.position.copy(this.environment.sunLight.position).normalize().multiplyScalar(1000);

        if (this.godRaysPass) {
          const screenPos = this.sunMesh.position.clone().project(this.camera);
          this.godRaysPass.uniforms.lightPosition.value.set(
            (screenPos.x + 1) / 2,
            (screenPos.y + 1) / 2
          );
        }
    }

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
    
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Auto-initialize if running directly on the scene page
if (document.getElementById('scene-container')) {
  new SceneManager('scene-container');
}
