import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class DiagramScene {
  constructor(id) {
    this.container = document.getElementById(id);
    this.components = [];
    this.labels = [];
    this.explodeValue = 0;
    this.timer = new THREE.Timer();
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
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
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

  // Material helper
  M(color, metal = 0.3, rough = 0.6, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, ...extra });
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
    const geo = new THREE.PlaneGeometry(500, 500, 60, 60);
    const mat = this.M(0x0a3d5c, 0.1, 0.3, {
      transparent: true, opacity: 0.7, side: THREE.DoubleSide
    });
    const ocean = new THREE.Mesh(geo, mat);
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

  // ===== LATTICE TOWER (28m) =====
  buildLatticeTower() {
    const legMat = this.M(0x00D9FF, 0.85, 0.25);
    const braceMat = this.M(0x0099BB, 0.8, 0.3);
    const ringMat = this.M(0x006688, 0.75, 0.35);
    const towerH = 28;
    const baseW = 4.2;  // half-width at base
    const topW = 1.8;   // half-width at top (taper)
    const levels = 14;  // number of brace sections
    const segH = towerH / levels;
    const yBase = 3.6;

    // Taper function: returns half-width at height fraction t (0=base, 1=top)
    const w = (t) => baseW + (topW - baseW) * t;

    // 4 leg corners
    const corners = [[1,1],[-1,1],[-1,-1],[1,-1]];

    // Build legs as segmented tubes
    corners.forEach((c, ci) => {
      for (let i = 0; i < levels; i++) {
        const t0 = i / levels, t1 = (i + 1) / levels;
        const w0 = w(t0), w1 = w(t1);
        const y0 = yBase + t0 * towerH, y1 = yBase + t1 * towerH;
        const a = new THREE.Vector3(c[0] * w0, y0, c[1] * w0);
        const b = new THREE.Vector3(c[0] * w1, y1, c[1] * w1);
        const seg = this.tube(a, b, 0.28, legMat);
        if (i === 0 && ci === 0) {
          this.add(seg, 'Pieds Principaux (×4)', 'pieds',
            `<b>Acier :</b> S355J2 (355 MPa)<br/><b>Profil :</b> Tube □200×200 ép.10mm<br/><b>Hauteur :</b> 28m<br/><b>Protection :</b> Galva. + époxy<br/><b>Corrosion :</b> Classe C4`,
            new THREE.Vector3(c[0], 0, c[1]).normalize());
        } else {
          seg.userData = { component: 'pieds', explodeDir: new THREE.Vector3(c[0], 0, c[1]).normalize(), basePosition: seg.position.clone() };
          seg.castShadow = true;
          this.components.push(seg);
          this.scene.add(seg);
        }
      }
    });

    // X-bracing on each face
    const faces = [[0,1],[1,2],[2,3],[3,0]];
    let firstBrace = true;
    faces.forEach(([a, b]) => {
      for (let i = 0; i < levels; i++) {
        const t0 = i / levels, t1 = (i + 1) / levels;
        const w0 = w(t0), w1 = w(t1);
        const y0 = yBase + t0 * towerH, y1 = yBase + t1 * towerH;
        const ca = corners[a], cb = corners[b];
        // Diagonal 1
        const p1 = new THREE.Vector3(ca[0] * w0, y0, ca[1] * w0);
        const p2 = new THREE.Vector3(cb[0] * w1, y1, cb[1] * w1);
        const d1 = this.tube(p1, p2, 0.06, braceMat);
        // Diagonal 2
        const p3 = new THREE.Vector3(cb[0] * w0, y0, cb[1] * w0);
        const p4 = new THREE.Vector3(ca[0] * w1, y1, ca[1] * w1);
        const d2 = this.tube(p3, p4, 0.06, braceMat);

        const mid = new THREE.Vector3((ca[0]+cb[0])/2, 0, (ca[1]+cb[1])/2).normalize().multiplyScalar(0.4);
        if (firstBrace) {
          this.add(d1, 'Contreventement en X', 'contreventement',
            `<b>Acier :</b> S275J0<br/><b>Profil :</b> Cornière L60×6mm<br/><b>Disposition :</b> X, ${levels} niveaux × 4 faces<br/><b>Boulons :</b> M24 Gr.8.8<br/><b>Rôle :</b> Stabilité vent + séisme`,
            mid);
          firstBrace = false;
        } else {
          d1.userData = { component: 'contreventement', explodeDir: mid, basePosition: d1.position.clone() };
          d1.castShadow = true; this.components.push(d1); this.scene.add(d1);
        }
        d2.userData = { component: 'contreventement', explodeDir: mid, basePosition: d2.position.clone() };
        d2.castShadow = true; this.components.push(d2); this.scene.add(d2);
      }
    });

    // Horizontal rings at each level
    let firstRing = true;
    for (let i = 0; i <= levels; i++) {
      const t = i / levels;
      const ww = w(t);
      const y = yBase + t * towerH;
      faces.forEach(([a, b]) => {
        const ca = corners[a], cb = corners[b];
        const pa = new THREE.Vector3(ca[0] * ww, y, ca[1] * ww);
        const pb = new THREE.Vector3(cb[0] * ww, y, cb[1] * ww);
        const ring = this.tube(pa, pb, 0.07, ringMat);
        if (firstRing) {
          this.add(ring, 'Anneaux Horizontaux (×15)', 'anneaux',
            `<b>Acier :</b> S275J0<br/><b>Profil :</b> Tube □100×100mm<br/><b>Niveaux :</b> ${levels + 1}<br/><b>Rôle :</b> Raidisseur anti-flambement`,
            new THREE.Vector3(0, 0.2, 0));
          firstRing = false;
        } else {
          ring.userData = { component: 'anneaux', explodeDir: new THREE.Vector3(0, 0.2, 0), basePosition: ring.position.clone() };
          ring.castShadow = true; this.components.push(ring); this.scene.add(ring);
        }
      });
    }
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

    const makeCatenary = (offsetX, r, color, name, comp, specs, store) => {
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
      const mesh = new THREE.Mesh(geo, this.M(color, 0.9, 0.2));
      this.add(mesh, name, comp, specs, new THREE.Vector3(0, 1, 0));
      for (let j = 1; j < 10; j++) {
        const pt = curve.getPoint(j / 10);
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), this.M(0x333333, 0.8, 0.3));
        clamp.position.copy(pt); this.scene.add(clamp);
      }
    };

    makeCatenary(0, 0.14, 0xcccccc, 'Câble Principal Ø16mm', 'cable-principal',
      `<b>Acier :</b> Galvanisé, 19 torons × 7 fils<br/><b>Ø :</b> 16mm<br/><b>Rupture :</b> 157 kN (1770 MPa)<br/><b>Portée :</b> 550m<br/><b>Flèche :</b> 15m<br/><b>Tension max :</b> 45 kN<br/><b>Sécurité :</b> ×3.5<br/><b>Courbe :</b> Caténaire<br/><b>Pinces :</b> Tous les 50m`, true);

    makeCatenary(1.2, 0.09, 0xff4444, 'Câble de Sécurité Ø12mm', 'cable-securite',
      `<b>Acier :</b> Galvanisé Ø12mm<br/><b>Rupture :</b> 90 kN<br/><b>Rôle :</b> Redondance<br/><b>Norme :</b> EN 12927`, false);
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
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.timer.update();
    const t = this.timer.getElapsed();
    const dt = this.timer.getDelta();
    // Ocean waves
    if (this.ocean) {
      const pos = this.ocean.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        pos.setZ(i, Math.sin(x * 0.08 + t) * 0.4 + Math.cos(y * 0.06 + t * 0.7) * 0.3);
      }
      pos.needsUpdate = true;
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
    this.renderer.render(this.scene, this.camera);
  }
}

if (document.getElementById('diagram-container')) {
  new DiagramScene('diagram-container');
}
