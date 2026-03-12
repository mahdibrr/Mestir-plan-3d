import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class DiagramScene {
  constructor(id) {
    this.container = document.getElementById(id);
    this.components = [];
    this.labels = [];
    this.explodeValue = 0;
    this.clock = new THREE.Clock();
    this.cableCurve = null;
    this.riderGroup = null;
    this.riderT = 0;
    this.demoRunning = false;
    this.demoSpeed = 0;
    this.init();
  }

  init() {
    try {
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupPostProcessing();
      this.setupControls();
      this.buildAll();
      this.setupRaycaster();
      this.bindUI();
      window.addEventListener('resize', () => this.onResize());
      this.animate();
    } catch (error) {
      this.showWebGLError(error);
    }
  }

  setupRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (error) {
      throw new Error('WebGL is not available in your browser. Please enable hardware acceleration or try a different browser.');
    }
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  setupPostProcessing() {
    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    // Innovative Feature: Volumetric God Rays (Radial Blur)
    this.setupGodRays();

    this.composer.addPass(new OutputPass());
  }

  setupGodRays() {
    const godRaysShader = {
      uniforms: {
        tDiffuse: { value: null },
        uSunPosition: { value: new THREE.Vector2(0.5, 0.5) },
        uStrength: { value: 0.008 },
        uSamples: { value: 40 }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse;
        uniform vec2 uSunPosition;
        uniform float uStrength;
        uniform int uSamples;
        in vec2 vUv;
        out vec4 pc_fragColor;

        void main() {
          vec2 delta = (vUv - uSunPosition);
          float distanceToSun = length(delta);
          vec2 dir = delta / float(uSamples) * uStrength;

          // Initial color sample
          vec4 color = texture(tDiffuse, vUv);
          vec2 uv = vUv;

          // Radial blur with distance-based falloff
          for(int i = 0; i < 40; i++) {
            uv -= dir;
            color += texture(tDiffuse, uv);
          }

          vec4 radialColor = color / float(uSamples);

          // Masking: Only apply God Rays where the scene is bright (bloom-like)
          // and add a distance falloff from the sun source
          float brightness = dot(radialColor.rgb, vec3(0.299, 0.587, 0.114));
          float mask = smoothstep(0.1, 0.8, brightness);
          float falloff = smoothstep(0.8, 0.0, distanceToSun);

          pc_fragColor = mix(texture(tDiffuse, vUv), radialColor, mask * falloff * 0.5);
        }
      `
    };

    this.godRaysPass = new ShaderPass(godRaysShader);
    this.godRaysPass.material.glslVersion = THREE.GLSL3;
    this.composer.addPass(this.godRaysPass);
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
    this.scene.background = new THREE.Color(0x060a14);
    this.scene.fog = new THREE.FogExp2(0x060a14, 0.0018);

    // Load HDR Environment
    new RGBELoader()
      .load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/equirectangular/blouberg_sunrise_2_1k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
        // Optionally set as background if it looks good, otherwise keep dark color
        // this.scene.background = texture;
      });

    // Subtle grid
    const grid = new THREE.GridHelper(400, 80, 0x003355, 0x0a1a2a);
    grid.position.y = -0.5;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    this.scene.add(grid);

    // Lights
    this.scene.add(new THREE.AmbientLight(0x223344, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 2.0);
    sun.position.set(100, 150, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -150;
    sc.right = sc.top = 150;
    sc.far = 500;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x4488ff, 0.35);
    fill.position.set(-80, 60, -60);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0x00D9FF, 0.6, 300);
    rim.position.set(0, 50, -80);
    this.scene.add(rim);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(110, 65, 130);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 14, 30);
    this.controls.minDistance = 30;
    this.controls.maxDistance = 400;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;
  }

  // Material helper (PBR Upgrade)
  M(color, metal = 0.3, rough = 0.6, extra = {}) {
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: metal,
      roughness: rough,
      envMapIntensity: 1.0,
      clearcoat: extra.clearcoat || 0,
      clearcoatRoughness: extra.clearcoatRoughness || 0,
      ...extra
    });
  }

  // Add component
  add(mesh, name, component, specs, explodeDir) {
    mesh.userData = { name, component, specs, explodeDir, basePosition: mesh.position.clone() };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.components.push(mesh);
    this.scene.add(mesh);
    return mesh;
  }

  // Create tube between two points
  tube(a, b, radius, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).add(dir.clone().multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  buildAll() {
    this.buildOcean();
    this.buildTerrain();
    this.buildFoundation();
    this.buildLatticeTower();
    this.buildPlatform();
    this.buildStaircase();
    this.buildGuyWires();
    this.buildAnchors();
    this.buildCables();
    this.buildPulley();
    this.buildArrivalPost();
    this.buildBrake();
    this.buildDimensionLines();
  }

  // ===== OCEAN =====
  buildOcean() {
    const geo = new THREE.PlaneGeometry(1000, 1000, 128, 128);

    this.oceanMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x0a3d5c) },
        uDeepColor: { value: new THREE.Color(0x02101a) },
        uHorizonColor: { value: new THREE.Color(0x1e5b8a) }
      },
      vertexShader: `
        out vec2 vUv;
        out float vHeight;
        uniform float uTime;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Gerstner Wave approximation
          float h = sin(pos.x * 0.05 + uTime * 1.2) * 0.8;
          h += cos(pos.y * 0.04 + uTime * 0.8) * 0.6;
          h += sin((pos.x + pos.y) * 0.02 + uTime * 1.5) * 0.4;

          pos.z += h;
          vHeight = h;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        in vec2 vUv;
        in float vHeight;
        out vec4 pc_fragColor;
        uniform vec3 uColor;
        uniform vec3 uDeepColor;
        uniform vec3 uHorizonColor;

        void main() {
          float mixHeight = (vHeight + 1.5) / 3.0;
          vec3 color = mix(uDeepColor, uColor, mixHeight);

          // Subtle Fresnel/Horizon mix
          float edge = 1.0 - pow(vUv.y, 3.0);
          color = mix(color, uHorizonColor, edge * 0.3);

          pc_fragColor = vec4(color, 0.85);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    const ocean = new THREE.Mesh(geo, this.oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -4, 55);
    ocean.userData = { isOcean: true };
    this.scene.add(ocean);
    this.ocean = ocean;
  }

  // ===== TERRAIN =====
  buildTerrain() {
    // Departure cliff
    const cliffGeo = new THREE.CylinderGeometry(18, 24, 8, 6, 1, false);
    const cliff = new THREE.Mesh(cliffGeo, this.M(0x6b5d52, 0.05, 0.95, { flatShading: true }));
    cliff.position.set(0, -1, 0);
    this.add(cliff, 'Terrain — Péninsule de Ruspina', 'terrain',
      `<b>Géologie :</b> Roche calcaire côtière<br/><b>Altitude :</b> +12m / mer<br/><b>Sol :</b> Portance > 250 kPa`, 
      new THREE.Vector3(0, -1, 0));

    // Arrival quay
    const quay = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 16), this.M(0x555555, 0.1, 0.9, { flatShading: true }));
    quay.position.set(0, -3, 115);
    this.add(quay, 'Quai d\'Arrivée — Port de Monastir', 'terrain',
      `<b>Type :</b> Quai portuaire en béton<br/><b>Altitude :</b> +2m / mer`, 
      new THREE.Vector3(0, -1, 0));
  }

  // ===== FONDATION =====
  buildFoundation() {
    const geo = new THREE.BoxGeometry(11, 3.2, 11);
    const mesh = new THREE.Mesh(geo, this.M(0x888888, 0.05, 0.92));
    mesh.position.set(0, 2, 0);
    this.add(mesh, 'Fondation Béton Armé', 'fondation',
      `<b>Dim. :</b> 5×5×1.6m<br/><b>Béton :</b> C30/37<br/><b>Armatures :</b> HA16 esp.150mm<br/><b>Boulons :</b> 16× M36 Gr.8.8<br/><b>Poids :</b> ~96 t`, 
      new THREE.Vector3(0, -1, 0));

    // Bolt heads on top (4 per corner = 16 total)
    const boltMat = this.M(0x444444, 0.9, 0.2);
    const boltGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 6);
    for (let cx of [-3.5, 3.5]) {
      for (let cz of [-3.5, 3.5]) {
        for (let dx of [-0.5, 0.5]) {
          for (let dz of [-0.5, 0.5]) {
            const b = new THREE.Mesh(boltGeo, boltMat);
            b.position.set(cx + dx, 3.75, cz + dz);
            this.scene.add(b);
          }
        }
      }
    }
  }

  // ===== LATTICE TOWER (28m) - Optimized with InstancedMesh =====
  buildLatticeTower() {
    const legMat = this.M(0x00D9FF, 0.9, 0.15, { clearcoat: 1.0, clearcoatRoughness: 0.1 });
    const braceMat = this.M(0x0099BB, 0.85, 0.2, { clearcoat: 0.5 });
    const ringMat = this.M(0x006688, 0.8, 0.25);
    const towerH = 28, baseW = 4.2, topW = 1.8, levels = 14, yBase = 3.6;
    const w = (t) => baseW + (topW - baseW) * t;
    const corners = [[1,1],[-1,1],[-1,-1],[1,-1]];
    const faces = [[0,1],[1,2],[2,3],[3,0]];

    // Geometries
    const legGeo = new THREE.CylinderGeometry(0.28, 0.28, 1, 6);
    const braceGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 6);
    const ringGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 6);

    // Instances counts
    const legCount = 4 * levels;
    const braceCount = 4 * levels * 2;
    const ringCount = 4 * (levels + 1);

    const legIM = new THREE.InstancedMesh(legGeo, legMat, legCount);
    const braceIM = new THREE.InstancedMesh(braceGeo, braceMat, braceCount);
    const ringIM = new THREE.InstancedMesh(ringGeo, ringMat, ringCount);

    let legIdx = 0, braceIdx = 0, ringIdx = 0;
    const dummy = new THREE.Object3D();

    // Legs
    corners.forEach((c) => {
      for (let i = 0; i < levels; i++) {
        const t0 = i / levels, t1 = (i + 1) / levels;
        const w0 = w(t0), w1 = w(t1);
        const y0 = yBase + t0 * towerH, y1 = yBase + t1 * towerH;
        const a = new THREE.Vector3(c[0] * w0, y0, c[1] * w0);
        const b = new THREE.Vector3(c[0] * w1, y1, c[1] * w1);
        this.setInstanceFromPoints(legIM, legIdx++, a, b, dummy);
      }
    });

    // Braces
    faces.forEach(([a, b]) => {
      for (let i = 0; i < levels; i++) {
        const t0 = i / levels, t1 = (i + 1) / levels;
        const w0 = w(t0), w1 = w(t1);
        const y0 = yBase + t0 * towerH, y1 = yBase + t1 * towerH;
        const ca = corners[a], cb = corners[b];
        this.setInstanceFromPoints(braceIM, braceIdx++, new THREE.Vector3(ca[0]*w0, y0, ca[1]*w0), new THREE.Vector3(cb[0]*w1, y1, cb[1]*w1), dummy);
        this.setInstanceFromPoints(braceIM, braceIdx++, new THREE.Vector3(cb[0]*w0, y0, cb[1]*w0), new THREE.Vector3(ca[0]*w1, y1, ca[1]*w1), dummy);
      }
    });

    // Rings
    for (let i = 0; i <= levels; i++) {
      const t = i / levels, ww = w(t), y = yBase + t * towerH;
      faces.forEach(([a, b]) => {
        const ca = corners[a], cb = corners[b];
        this.setInstanceFromPoints(ringIM, ringIdx++, new THREE.Vector3(ca[0]*ww, y, ca[1]*ww), new THREE.Vector3(cb[0]*ww, y, cb[1]*ww), dummy);
      });
    }

    [legIM, braceIM, ringIM].forEach(im => {
      im.castShadow = true;
      im.receiveShadow = true;
      this.scene.add(im);
    });

    // Add metadata for UI
    this.add(new THREE.Mesh(new THREE.BoxGeometry(baseW*2, towerH, baseW*2), new THREE.MeshBasicMaterial({visible:false})),
      'Pylône en Treillis (Optimisé)', 'pieds',
      `<b>Optimisation :</b> InstancedMesh (3 draw calls)<br/><b>Acier :</b> S355J2<br/><b>Hauteur :</b> 28m<br/><b>Poids total :</b> ~12.5 t`,
      new THREE.Vector3(0, 0, 0));
  }

  setInstanceFromPoints(im, idx, a, b, dummy) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    dummy.position.copy(a).add(dir.clone().multiplyScalar(0.5));
    dummy.scale.set(1, len, 1);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    dummy.updateMatrix();
    im.setMatrixAt(idx, dummy.matrix);
  }

  // ===== STAIRCASE =====
  buildStaircase() {
    const stairMat = this.M(0x888800, 0.6, 0.4);
    const steps = 56;
    const totalH = 24;
    const radius = 2.5;
    let first = true;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 6; // 3 full turns
      const y = 3.6 + (i / steps) * totalH;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.35), stairMat);
      step.position.set(x, y, z);
      step.rotation.y = -angle;
      if (first) {
        this.add(step, 'Escalier en Colimaçon', 'escalier',
          `<b>Type :</b> Hélicoïdal, 3 tours<br/><b>Marches :</b> 56 caillebotis acier<br/><b>Largeur :</b> 0.8m<br/><b>Main courante :</b> Tube Ø42mm<br/><b>Norme :</b> NF E85-015`,
          new THREE.Vector3(-1, 0, 0));
        first = false;
      } else {
        step.userData = { component: 'escalier', explodeDir: new THREE.Vector3(-1, 0, 0), basePosition: step.position.clone() };
        this.components.push(step); this.scene.add(step);
      }
    }
  }

  // ===== PLATFORM =====
  buildPlatform() {
    const yP = 28;
    // Main deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(9, 0.35, 9), this.M(0xffaa00, 0.15, 0.7));
    deck.position.set(0, yP, 0);
    this.add(deck, 'Plateforme d\'Embarquement', 'plateforme',
      `<b>Dim. :</b> 4×4m<br/><b>Sol :</b> Bois antidérapant<br/><b>Structure :</b> Profilés alu soudés<br/><b>Capacité :</b> 6 pers.<br/><b>Hauteur :</b> 25m`,
      new THREE.Vector3(0, 1, 0));

    // Plank lines
    for (let i = -4; i <= 4; i += 0.6) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.02, 0.04), this.M(0x664422, 0.1, 0.9));
      l.position.set(0, yP + 0.19, i); this.scene.add(l);
    }

    // Guardrails
    const rMat = this.M(0xFFcc44, 0.7, 0.3);
    for (let side of [-4.6, 4.6]) {
      // Top rail
      const rail = this.tube(new THREE.Vector3(side, yP + 1.1, -4.6), new THREE.Vector3(side, yP + 1.1, 4.6), 0.05, rMat);
      this.scene.add(rail);
      const rail2 = this.tube(new THREE.Vector3(-4.6, yP + 1.1, side), new THREE.Vector3(4.6, yP + 1.1, side), 0.05, rMat);
      this.scene.add(rail2);
      // Posts
      for (let p = -4.6; p <= 4.6; p += 1.5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1), rMat);
        post.position.set(side, yP + 0.55, p); this.scene.add(post);
        const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1), rMat);
        post2.position.set(p, yP + 0.55, side); this.scene.add(post2);
      }
    }
    // First rail as named component
    const gr = this.tube(new THREE.Vector3(-4.6, yP + 0.6, -4.6), new THREE.Vector3(-4.6, yP + 0.6, 4.6), 0.04, rMat);
    this.add(gr, 'Garde-Corps', 'garde-corps',
      `<b>Tube :</b> Acier galva. Ø42mm<br/><b>H :</b> 1.1m<br/><b>Norme :</b> NF P01-012<br/><b>Barreaux :</b> Esp. 110mm max`,
      new THREE.Vector3(-1, 0.5, 0).normalize());
  }

  // ===== GUY WIRES =====
  buildGuyWires() {
    const mat = this.M(0xFFD700, 0.6, 0.4);
    const dist = 35;
    const levels = [10, 20, 28];
    const angles = [0, 2.094, 4.189]; // 0°, 120°, 240°
    let first = true;

    levels.forEach((h, li) => {
      angles.forEach((a, ai) => {
        const ex = Math.cos(a) * dist, ez = Math.sin(a) * dist;
        // Taper: adjust attach point
        const t = (h - 3.6) / 28;
        const ww = 4.2 + (1.8 - 4.2) * t;
        const ax = Math.cos(a) * ww, az = Math.sin(a) * ww;
        const wire = this.tube(
          new THREE.Vector3(ax, 3.6 + t * 28, az),
          new THREE.Vector3(ex, 0, ez), 0.05, mat
        );
        if (first) {
          this.add(wire, 'Haubans (×9)', 'haubans',
            `<b>Câble :</b> Acier galva. Ø12mm<br/><b>Rupture :</b> 120 kN<br/><b>Niveaux :</b> 3 (10m, 20m, 28m)<br/><b>Tendeur :</b> Ridoir M20<br/><b>Rôle :</b> Stabilité latérale vent`,
            new THREE.Vector3(ex, 0, ez).normalize().multiplyScalar(0.5));
          first = false;
        } else {
          wire.userData = { component: 'haubans', explodeDir: new THREE.Vector3(ex, 0, ez).normalize().multiplyScalar(0.5), basePosition: wire.position.clone() };
          wire.castShadow = true; this.components.push(wire); this.scene.add(wire);
        }
      });
    });
  }

  // ===== GROUND ANCHORS =====
  buildAnchors() {
    const mat = this.M(0x996633, 0.4, 0.8);
    const angles = [0, 2.094, 4.189];
    let first = true;
    angles.forEach((a, i) => {
      const x = Math.cos(a) * 35, z = Math.sin(a) * 35;
      const anc = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 3.5), mat);
      anc.position.set(x, 0, z);
      if (first) {
        this.add(anc, 'Ancrages au Sol (×3)', 'ancrage',
          `<b>Type :</b> Massif béton enterré<br/><b>Dim. :</b> 2×2×1.5m<br/><b>Tirants :</b> HA25<br/><b>Arrachement :</b> >200 kN<br/><b>Poids :</b> ~14 t`,
          new THREE.Vector3(x, -0.5, z).normalize());
        first = false;
      } else {
        anc.userData = { component: 'ancrage', explodeDir: new THREE.Vector3(x, -0.5, z).normalize(), basePosition: anc.position.clone() };
        anc.castShadow = true; this.components.push(anc); this.scene.add(anc);
      }
    });
  }

  // ===== CABLES (catenary) =====
  buildCables() {
    // Tower top: yBase(3.6) + towerH(28) = 31.6
    // Arrival post top: center(2.5) + halfHeight(3.5) = 6.0
    const span = 115;
    const startY = 31.6;  // exact tower summit
    const endY = 6.0;     // exact arrival post top
    const sag = 6;        // realistic sag for 550m span

    const makeCatenary = (offsetX, r, color, name, comp, specs, store, extraMat = {}) => {
      const pts = [];
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const z = t * span;
        const linearY = startY + (endY - startY) * t;
        const sagY = -sag * 4 * t * (1 - t);
        pts.push(new THREE.Vector3(offsetX, linearY + sagY, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      if (store) this.cableCurve = curve;
      const geo = new THREE.TubeGeometry(curve, 150, r, 8, false);
      const mesh = new THREE.Mesh(geo, this.M(color, 0.9, 0.2, extraMat));
      this.add(mesh, name, comp, specs, new THREE.Vector3(0, 1, 0));
      for (let j = 1; j < 10; j++) {
        const pt = curve.getPoint(j / 10);
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), this.M(0x333333, 0.8, 0.3));
        clamp.position.copy(pt); this.scene.add(clamp);
      }
    };

    makeCatenary(0, 0.14, 0xcccccc, 'Câble Principal Ø16mm', 'cable-principal',
      `<b>Acier :</b> Galvanisé, 19 torons × 7 fils<br/><b>Ø :</b> 16mm<br/><b>Rupture :</b> 157 kN (1770 MPa)<br/><b>Portée :</b> 550m<br/><b>Flèche :</b> 15m<br/><b>Tension max :</b> 45 kN<br/><b>Sécurité :</b> ×3.5<br/><b>Courbe :</b> Caténaire<br/><b>Pinces :</b> Tous les 50m`, true,
      { metalness: 1.0, roughness: 0.1, clearcoat: 1.0 });

    makeCatenary(1.2, 0.09, 0xff4444, 'Câble de Sécurité Ø12mm', 'cable-securite',
      `<b>Acier :</b> Galvanisé Ø12mm<br/><b>Rupture :</b> 90 kN<br/><b>Rôle :</b> Redondance<br/><b>Norme :</b> EN 12927`, false,
      { metalness: 0.8, roughness: 0.3 });
  }

  // ===== PULLEY, HARNESS & RIDER =====
  buildPulley() {
    const g = new THREE.Group();
    const skin = this.M(0xdebb9b, 0.05, 0.65);
    const suit = this.M(0x1a3a6a, 0.1, 0.7);
    const gear = this.M(0x333333, 0.9, 0.2);

    // Pulley housing
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.8), this.M(0x00FFaa, 0.7, 0.3));
    g.add(housing);
    // Wheels
    const wGeo = new THREE.TorusGeometry(0.35, 0.1, 8, 20);
    const w1 = new THREE.Mesh(wGeo, gear); w1.position.set(-0.5, 0, 0); w1.rotation.y = Math.PI/2; g.add(w1);
    const w2 = new THREE.Mesh(wGeo, gear); w2.position.set(0.5, 0, 0); w2.rotation.y = Math.PI/2; g.add(w2);
    // Carabiners
    const carGeo = new THREE.TorusGeometry(0.12, 0.025, 6, 12);
    const car1 = new THREE.Mesh(carGeo, this.M(0xcccccc, 0.85, 0.2)); car1.position.set(-0.2, -0.5, 0); g.add(car1);
    const car2 = new THREE.Mesh(carGeo, this.M(0xcccccc, 0.85, 0.2)); car2.position.set(0.2, -0.5, 0); g.add(car2);
    // Straps
    const strapMat = this.M(0xff5500, 0.1, 0.8);
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.12), strapMat); s1.position.set(-0.2, -1.35, 0); g.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.12), strapMat); s2.position.set(0.2, -1.35, 0); g.add(s2);

    // === PERSON ===
    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.45), suit);
    torso.position.set(0, -2.7, 0); g.add(torso);
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skin);
    head.position.set(0, -1.85, 0); g.add(head);
    // Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI*2, 0, Math.PI*0.55), this.M(0xee2200, 0.3, 0.5));
    helmet.position.set(0, -1.78, 0); g.add(helmet);
    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), skin);
    neck.position.set(0, -2.05, 0); g.add(neck);
    // Arms
    const armMat = suit.clone();
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.9, 4, 8);
    const armL = new THREE.Mesh(armGeo, armMat); armL.position.set(-0.55, -2.4, 0); armL.rotation.z = 0.4; g.add(armL);
    const armR = new THREE.Mesh(armGeo, armMat); armR.position.set(0.55, -2.4, 0); armR.rotation.z = -0.4; g.add(armR);
    // Hands
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), skin); handL.position.set(-0.85, -1.95, 0); g.add(handL);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), skin); handR.position.set(0.85, -1.95, 0); g.add(handR);
    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.12, 1.1, 4, 8);
    const legL = new THREE.Mesh(legGeo, this.M(0x222244, 0.1, 0.7)); legL.position.set(-0.2, -3.9, 0); g.add(legL);
    const legR = new THREE.Mesh(legGeo, this.M(0x222244, 0.1, 0.7)); legR.position.set(0.2, -3.9, 0); g.add(legR);
    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.35);
    const shoeMat = this.M(0x111111, 0.3, 0.7);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat); shoeL.position.set(-0.2, -4.55, 0.05); g.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat); shoeR.position.set(0.2, -4.55, 0.05); g.add(shoeR);

    // Place at start of cable
    this.riderGroup = g;
    this.riderT = 0.02;
    this.scene.add(g);
    this.positionRiderOnCable(this.riderT);

    this.add(g, 'Poulie, Harnais & Passager', 'poulie',
      `<b>Poulie :</b> Double galet acier trempé<br/><b>Capacité :</b> 250 kg<br/><b>Mousquetons :</b> 2× verrouillage auto, 45 kN<br/><b>Harnais :</b> Intégral EN 361<br/><b>EPI :</b> Casque, gants, lunettes<br/><b>Longe :</b> Absorbeur d'énergie`,
      new THREE.Vector3(-1, 1, 0).normalize());
  }

  positionRiderOnCable(t) {
    if (!this.cableCurve || !this.riderGroup) return;
    const pt = this.cableCurve.getPoint(t);
    const tangent = this.cableCurve.getTangent(t);
    this.riderGroup.position.copy(pt);
    // Face movement direction
    const lookTarget = pt.clone().add(tangent);
    this.riderGroup.lookAt(lookTarget);
    this.riderGroup.rotation.x = 0;
    this.riderGroup.rotation.z = 0;
  }

  startDemo() {
    if (this.demoRunning) return;
    this.demoRunning = true;
    this.riderT = 0.02;
    this.demoSpeed = 0;
    const btn = document.getElementById('demo-btn');
    if (btn) { btn.textContent = '⏳ En cours...'; btn.disabled = true; }
    const tel = document.getElementById('telemetry');
    if (tel) tel.style.display = 'block';
  }

  stopDemo() {
    this.demoRunning = false;
    const btn = document.getElementById('demo-btn');
    if (btn) { btn.textContent = '▶ Lancer la Démo'; btn.disabled = false; }
  }

  // ===== ARRIVAL POST =====
  buildArrivalPost() {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 12), this.M(0xff8800, 0.75, 0.35));
    pole.position.set(0, 2.5, 115);
    this.add(pole, 'Poteau d\'Arrivée', 'poteau-arrivee',
      `<b>Tube :</b> Acier Ø400mm ép.12mm<br/><b>H :</b> 6m<br/><b>Base :</b> Béton 2×2×1m<br/><b>Fixation :</b> 8× M30<br/><b>Rôle :</b> Ancrage câble côté arrivée`,
      new THREE.Vector3(0, 0, 1));
    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 5), this.M(0x707070, 0.05, 0.9));
    base.position.set(0, -1.5, 115);
    this.add(base, 'Fondation Poteau d\'Arrivée', 'poteau-arrivee',
      `Béton C30/37, 2×2×1m`, new THREE.Vector3(0, -1, 1).normalize());
  }

  // ===== BRAKING SYSTEM =====
  buildBrake() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 3.5), this.M(0xff0044, 0.6, 0.35));
    body.position.set(0, 7, 113);
    this.add(body, 'Système de Freinage', 'freinage',
      `<b>Type :</b> Frein magnétique ZipStop<br/><b>Décélération :</b> Progressive<br/><b>G-max :</b> <2g<br/><b>Dist. freinage :</b> 15-20m<br/><b>Capacité :</b> 150 kg @ 120 km/h<br/><b>Secours :</b> Frein mécanique redondant`,
      new THREE.Vector3(1, 0.5, 0).normalize());
    // Pads
    [-1.5, 1.5].forEach(s => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.8, 3.2), this.M(0x222222, 0.5, 0.8));
      pad.position.set(s, 7, 113); this.scene.add(pad);
    });
  }

  // ===== DIMENSION LINES =====
  buildDimensionLines() {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00D9FF, transparent: true, opacity: 0.5 });
    // Tower height line
    const hPts = [new THREE.Vector3(8, 3.6, -6), new THREE.Vector3(8, 31.6, -6)];
    const hLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hPts), lineMat);
    this.scene.add(hLine);
    // Tick marks
    [3.6, 31.6].forEach(y => {
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(7, y, -6), new THREE.Vector3(9, y, -6)]), lineMat);
      this.scene.add(tick);
    });

    // Cable span line
    const sPts = [new THREE.Vector3(-8, -3, 0), new THREE.Vector3(-8, -3, 115)];
    const sLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sPts), lineMat);
    this.scene.add(sLine);
    [0, 115].forEach(z => {
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9, -3, z), new THREE.Vector3(-7, -3, z)]), lineMat);
      this.scene.add(tick);
    });
  }

  // ===== RAYCASTER =====
  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hovered = null;

    this.container.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycast();
    });
    this.container.addEventListener('click', () => {
      if (this.hovered?.userData?.name) this.showDetail(this.hovered.userData);
    });
  }

  raycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.components, true);
    const el = document.getElementById('component-data');

    // Reset emissive
    this.components.forEach(c => { if (c.material) c.material.emissiveIntensity = 0; });

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && !obj.userData.name && obj.parent !== this.scene) obj = obj.parent;
      if (obj.userData.name) {
        this.hovered = obj;
        document.body.style.cursor = 'pointer';
        if (obj.material) { obj.material.emissive = new THREE.Color(0x00D9FF); obj.material.emissiveIntensity = 0.4; }
        el.innerHTML = `<div class="detail-title">${obj.userData.name}</div><div class="detail-specs">${obj.userData.specs}</div>`;
        return;
      }
    }
    this.hovered = null;
    document.body.style.cursor = 'default';
  }

  showDetail(d) {
    document.getElementById('component-data').innerHTML =
      `<div class="detail-title">${d.name}</div><div class="detail-specs">${d.specs}</div>`;
  }

  // ===== UI BINDINGS =====
  bindUI() {
    document.getElementById('explode-slider')?.addEventListener('input', e => {
      this.explodeValue = parseFloat(e.target.value);
      this.updateExplosion();
      const v = document.getElementById('explode-val');
      if (v) v.textContent = Math.round(this.explodeValue * 100) + '%';
    });
    document.getElementById('rotation-speed')?.addEventListener('input', e => {
      this.controls.autoRotateSpeed = parseFloat(e.target.value) * 2;
      const v = document.getElementById('rotate-val');
      if (v) v.textContent = Math.round(parseFloat(e.target.value) * 100) + '%';
    });
    document.getElementById('demo-btn')?.addEventListener('click', () => this.startDemo());
    // Legend hover
    document.querySelectorAll('.legend-item').forEach(item => {
      const comp = item.dataset.component;
      item.addEventListener('mouseenter', () => {
        this.components.forEach(c => {
          if (c.material && c.userData.component === comp) {
            c.material.emissive = new THREE.Color(0x00D9FF);
            c.material.emissiveIntensity = 0.5;
          }
        });
      });
      item.addEventListener('mouseleave', () => {
        this.components.forEach(c => { if (c.material) c.material.emissiveIntensity = 0; });
      });
      item.addEventListener('click', () => {
        const m = this.components.find(c => c.userData.component === comp && c.userData.name);
        if (m) this.showDetail(m.userData);
      });
    });
  }

  updateExplosion() {
    const scale = 30;
    this.components.forEach(m => {
      const d = m.userData.explodeDir, b = m.userData.basePosition;
      if (d && b) m.position.copy(b).add(d.clone().multiplyScalar(this.explodeValue * scale));
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
      requestAnimationFrame(() => this.animate());

      // Update Sun Position for God Rays
      if (this.godRaysPass) {
        const sunPos = new THREE.Vector3(100, 150, 80);
        sunPos.project(this.camera);
        this.godRaysPass.uniforms.uSunPosition.value.set(
          (sunPos.x + 1) / 2,
          (sunPos.y + 1) / 2
        );
      }

      const dt = this.clock.getDelta();
      const t = this.clock.getElapsedTime();

      // Ocean waves (GPU)
      if (this.oceanMaterial) {
        this.oceanMaterial.uniforms.uTime.value = t;
      }
      // Rider demo animation
      if (this.demoRunning && this.cableCurve) {
        // Acceleration phase (0-0.15), cruise (0.15-0.75), braking (0.75-1.0)
        if (this.riderT < 0.15) {
          this.demoSpeed = Math.min(this.demoSpeed + 0.0003, 0.004);
        } else if (this.riderT < 0.75) {
          this.demoSpeed = 0.004;
        } else {
          this.demoSpeed = Math.max(this.demoSpeed - 0.0002, 0.0003);
        }
        this.riderT += this.demoSpeed;
        if (this.riderT >= 0.98) {
          this.riderT = 0.98;
          this.stopDemo();
        }
        this.positionRiderOnCable(this.riderT);
        // Max real speed ~55 km/h at cruise (demoSpeed=0.004)
        const speedKmh = ((this.demoSpeed / 0.004) * 55).toFixed(0);
        const dist = (this.riderT * 550).toFixed(0);
        const alt = this.cableCurve.getPoint(this.riderT).y.toFixed(1);
        const es = document.getElementById('tel-speed');
        const ed = document.getElementById('tel-dist');
        const ea = document.getElementById('tel-alt');
        if (es) es.textContent = speedKmh + ' km/h';
        if (ed) ed.textContent = dist + ' m';
        if (ea) ea.textContent = alt + ' m';
      }
      this.controls.update();
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
}

if (document.getElementById('diagram-container')) {
  new DiagramScene('diagram-container');
}
