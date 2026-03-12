import * as THREE from 'three';
import { OceanSimulation } from './OceanSimulation.js';

export class TerrainGenerator {
  constructor(scene) {
    this.scene = scene;
    
    // Setup Materials
    this.terrainMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8,
        metalness: 0.1
    });
  }
  
  build() {
    this.buildSea();
    this.buildProceduralTerrain();
  }
  
  buildSea() {
    this.ocean = new OceanSimulation(3000, 128); // Larger ocean to cover the new extent
    this.scene.add(this.ocean.mesh);
  }
  
  update(delta) {
    if (this.ocean) this.ocean.update(delta);
  }
  
  getTerrainData(x, z) {
      let y = -5; // Base underwater depth
      let type = 'water';
      
      // 1. Ruspina Peninsula (East, x > 0)
      let penAxisX = 180 - z * 0.15;
      let distToPen = Math.abs(x - penAxisX);
      let penWidth = 120 + Math.sin(z * 0.02) * 30; 
      
      if (z < 400 && z > -800) { 
          if (distToPen < penWidth) {
              // Parabolic curve for height
              let heightT = 1 - Math.pow(distToPen / penWidth, 2);
              y = 15 * heightT;
              
              // Add noise for organic look
              y += Math.sin(x * 0.05) * 2 + Math.cos(z * 0.07) * 2;
              y += Math.sin((x+z) * 0.01) * 3;
              
              if (y > 0) type = y > 8 ? 'rock' : 'sand';
          }
      }
      
      // 2. Kuriat Island / Detached Tip (North tip off peninsula)
      let distToIsland = Math.hypot(x - 350, z - (-850));
      if (distToIsland < 60) {
          let iy = 10 * (1 - Math.pow(distToIsland / 60, 2)) + Math.sin(x*0.1)*2;
          if (iy > y) {
              y = iy;
              if (y > 0) type = 'sand';
              if (y > 4) type = 'rock';
          }
      }
      
      // 3. Port & Mainland (West, x < 0)
      let mainlandEdgeX = -120 + Math.sin(z * 0.01) * 30;
      if (x < mainlandEdgeX) {
          if (x > mainlandEdgeX - 150 && z > -200 && z < 300) {
              // Flat port / quai area
              let harborDepth = Math.sin(x*0.1)*0.5;
              y = 2 + harborDepth; 
              type = 'concrete';
          } else {
              // City/Mainland sloping up
              y = 2 + (mainlandEdgeX - 150 - x) * 0.08;
              y += Math.sin(z * 0.05) * 2;
              type = 'city'; 
          }
      }
      
      // 4. Breakwaters (Quai N7)
      // Main breakwater extending diagonally
      const dx = -50 - (-150);
      const dz = 200 - 150;
      const l2 = dx*dx + dz*dz;
      const t = Math.max(0, Math.min(1, ((x - (-150)) * dx + (z - 150) * dz) / l2));
      const projX = -150 + t * dx;
      const projZ = 150 + t * dz;
      const distToBreakwater = Math.hypot(x - projX, z - projZ);
      
      if (distToBreakwater < 15) {
          let by = 3 - distToBreakwater * 0.1;
          if (by > y) {
              y = by;
              type = 'concrete';
          }
      }
      
      // Force flatten precise anchor points for towers so they don't clip awkwardly
      let distToDep = Math.hypot(x - 200, z - (-50));
      if(distToDep < 12) {
          y = 10; 
          type = 'concrete';
      }
      let distToArr = Math.hypot(x - -250, z - 150);
      if(distToArr < 12) {
          y = 2; 
          type = 'concrete';
      }
      
      return { y: Math.max(-5, y), type };
  }
  
  buildProceduralTerrain() {
      // 2000x2000 m field, 10m resolution
      const geo = new THREE.PlaneGeometry(2000, 2000, 200, 200);
      geo.rotateX(-Math.PI / 2);
      
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      
      // Color Palettes
      const colorSand = new THREE.Color(0xd2b48c);
      const colorRock = new THREE.Color(0x6b706c);
      const colorCity = new THREE.Color(0x8a99a8);
      const colorConcrete = new THREE.Color(0xa5a5a5);
      const colorWaterBed = new THREE.Color(0x1a334d); 
      
      const rockPositions = [];
      const cityPositions = [];
      
      for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i);
          let z = pos.getZ(i);
          
          let data = this.getTerrainData(x, z);
          pos.setY(i, data.y);
          
          let c = new THREE.Color();
          if (data.type === 'sand') c.copy(colorSand);
          else if (data.type === 'rock') c.copy(colorRock);
          else if (data.type === 'concrete') c.copy(colorConcrete);
          else if (data.type === 'city') c.copy(colorCity);
          else c.copy(colorWaterBed);
          
          // Noise color variation for natural diffuse look
          let noise = (Math.random() - 0.5) * 0.05;
          c.r += noise; c.g += noise; c.b += noise;
          
          colors[i*3] = c.r;
          colors[i*3+1] = c.g;
          colors[i*3+2] = c.b;
          
          // Collect instance positions sparsely based on type
          if (data.type === 'rock' && Math.random() < 0.08) {
              rockPositions.push({x, y: data.y, z});
          }
          if (data.type === 'city' && Math.random() < 0.015) {
              cityPositions.push({x, y: data.y, z});
          }
      }
      
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      
      const mesh = new THREE.Mesh(geo, this.terrainMat);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);
      
      this.buildInstancedRocks(rockPositions);
      this.buildInstancedCity(cityPositions);
  }
  
  buildInstancedRocks(positions) {
      if(positions.length === 0) return;
      
      // Cap max rocks to preserve performance
      const maxRocks = Math.min(positions.length, 3000); 
      
      const rockGeo = new THREE.DodecahedronGeometry(1.5, 1);
      const posAttr = rockGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
          posAttr.setXYZ(i, 
              posAttr.getX(i) * (0.8 + Math.random() * 0.4),
              posAttr.getY(i) * (0.8 + Math.random() * 0.4),
              posAttr.getZ(i) * (0.8 + Math.random() * 0.4)
          );
      }
      rockGeo.computeVertexNormals();

      const rockMat = new THREE.MeshStandardMaterial({
          color: 0x8b7d6b,
          roughness: 0.9,
      });

      const instancedMesh = new THREE.InstancedMesh(rockGeo, rockMat, maxRocks);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      
      for (let i = 0; i < maxRocks; i++) {
          const p = positions[i];
          const scale = 0.5 + Math.random() * 2.5;
          dummy.position.set(p.x, p.y + scale*0.5 - 0.5, p.z); // Embed slightly into the ground
          dummy.scale.set(scale, scale, scale);
          dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
      }

      this.scene.add(instancedMesh);
  }
  
  buildInstancedCity(positions) {
      if(positions.length === 0) return;
      
      const maxBuildings = Math.min(positions.length, 1000);
      
      const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
      buildingGeo.translate(0, 0.5, 0); // Ground anchor
      
      const buildingMat = new THREE.MeshStandardMaterial({
          color: 0xecf0f1,
          roughness: 0.6
      });
      
      const instancedMesh = new THREE.InstancedMesh(buildingGeo, buildingMat, maxBuildings);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      
      const dummy = new THREE.Object3D();
      
      for (let i = 0; i < maxBuildings; i++) {
          const p = positions[i];
          let w = 8 + Math.random() * 20;
          let d = 8 + Math.random() * 20;
          let h = 5 + Math.random() * 30; // 5m to 35m buildings
          
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.set(w, h, d);
          dummy.rotation.y = Math.random() * Math.PI;
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      
      this.scene.add(instancedMesh);
  }
}
