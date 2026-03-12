# Technical Implementation Details

## Physical Models
### Catenary Cable Mapping
Our cable utilizes traditional catenary equations:
`y = a * cosh((x - L/2) / a)`

Where `L` equates to horizontal span length. A dynamic variable is subtracted at the vertex point where the rider connects via pulley to emulate live load weight deflection.

### Kinematics
Rider animation interpolates continuously tracking position via length mapping along the calculated Three.js `CatmullRomCurve3`. Speed progresses from a calculated constant acceleration metric of $1.5 m/s^2$ maxing out at a 15 m/s terminal velocity.

## Optimizations
1. **InstancedMesh (Performance)**: We utilize `THREE.InstancedMesh` traversing a single draw call to scatter rocks dynamically across the Ruspina peninsula without bogging down rendering.
2. **Adaptive Frame Rate Resolution**: `PerformanceMonitor.js` interrogates frame render loop elapsed time and aggressively decays the internal WebGL rendering `devicePixelRatio` to throttle GPU pipeline stress when missing 16.6ms frame targets on under-powered devices.
3. **Gerstner Ocean Simulation**: The water runs purely on the GPU using a ShaderMaterial implementing mathematical sine/cosine summation to compute normals avoiding CPU vertex manipulation constraints.

## Next Steps / Extensibility 
Given the modular scope inside `js/scene`, features like dynamic LOD mapping for building complexes inside the port segment, or pulling live weather API data to sync the environment, simply require passing parameters downward to `EnvironmentManager.js`.
