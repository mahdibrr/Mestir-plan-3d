export class PerformanceMonitor {
  constructor(renderer, targetFPS = 60) {
    this.renderer = renderer;
    this.targetFPS = targetFPS;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.currentFPS = 60;
  }
  
  update() {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= this.lastTime + 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // Adjust quality based on FPS
      if (this.currentFPS < this.targetFPS * 0.8) {
        this.reduceQuality();
      } else if (this.currentFPS > this.targetFPS * 0.95) {
        this.increaseQuality();
      }
    }
  }
  
  reduceQuality() {
    const currentPixelRatio = this.renderer.getPixelRatio();
    // Don't drop too low (minimum 0.5 for legibility)
    if (currentPixelRatio > 0.5) {
      this.renderer.setPixelRatio(currentPixelRatio * 0.9);
      console.log('Performance Drop: Reduced pixel ratio to', currentPixelRatio * 0.9);
    }
  }
  
  increaseQuality() {
    const currentPixelRatio = this.renderer.getPixelRatio();
    const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
    if (currentPixelRatio < maxPixelRatio) {
      this.renderer.setPixelRatio(Math.min(currentPixelRatio * 1.1, maxPixelRatio));
    }
  }
  
  getFPS() {
    return this.currentFPS;
  }
}
