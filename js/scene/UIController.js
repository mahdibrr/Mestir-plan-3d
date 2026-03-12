export class UIController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    
    // Bind DOM elements
    this.elements = {
      playPauseBtn: document.getElementById('play-pause'),
      resetBtn: document.getElementById('reset'),
      speedSlider: document.getElementById('speed-slider'),
      speedValue: document.getElementById('speed-value'),
      viewBtns: document.querySelectorAll('.view-btn'),
      
      // Telemetry
      speed: document.getElementById('rider-speed'),
      altitude: document.getElementById('rider-altitude'),
      distance: document.getElementById('rider-distance'),
      tension: document.getElementById('cable-tension'),
      gForce: document.getElementById('g-force'),
      
      // Panel
      togglePanelBtn: document.getElementById('toggle-panel'),
      panel: document.querySelector('.controls-panel')
    };
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    if(!this.elements.playPauseBtn) return; // fail safe if UI not loaded
    
    this.elements.playPauseBtn.addEventListener('click', () => {
      const isPlaying = this.sceneManager.rider.isPlaying;
      if (isPlaying) {
        this.sceneManager.rider.pause();
        this.elements.playPauseBtn.textContent = 'Play';
      } else {
        this.sceneManager.rider.play();
        this.elements.playPauseBtn.textContent = 'Pause';
      }
    });
    
    this.elements.resetBtn.addEventListener('click', () => {
      this.sceneManager.rider.reset();
      this.elements.playPauseBtn.textContent = 'Play';
    });
    
    this.elements.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.elements.speedValue.textContent = val.toFixed(1) + 'x';
      // Adjust simulation speed in SceneManager
      this.sceneManager.timeScale = val;
    });
    
    this.elements.viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.sceneManager.setCameraView(view);
      });
    });
    
    // Environment
    const timeSlider = document.getElementById('time-slider');
    const timeDisplay = document.getElementById('time-display');
    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => {
        const hour = parseFloat(e.target.value);
        if(timeDisplay) {
            const displayHour = Math.floor(hour);
            const minutes = Math.floor((hour % 1) * 60);
            timeDisplay.textContent = `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        if(this.sceneManager.environment) {
            this.sceneManager.environment.updateTimeOfDay(hour);
        }
      });
    }
    
    const windSlider = document.getElementById('wind-slider');
    const windDisplay = document.getElementById('wind-value');
    if(windSlider) {
      windSlider.addEventListener('input', (e) => {
        const speed = parseInt(e.target.value);
        if(windDisplay) windDisplay.textContent = speed;
        // Check if environment exists before trying to update it. Some views might not load it immediately.
        if (this.sceneManager && this.sceneManager.environment) {
            this.sceneManager.environment.setWindSpeed(speed);
        }
      });
    }
    
    this.elements.togglePanelBtn.addEventListener('click', () => {
      this.elements.panel.classList.toggle('collapsed');
      this.elements.togglePanelBtn.innerHTML = this.elements.panel.classList.contains('collapsed') ? '+' : '&minus;';
    });
  }
  
  updateTelemetry(data) {
    if(!this.elements.speed) return;
    
    this.elements.speed.textContent = data.speed.toFixed(1) + ' m/s';
    this.elements.altitude.textContent = data.altitude.toFixed(1) + ' m';
    this.elements.distance.textContent = Math.floor(data.distance) + ' m';
    this.elements.tension.textContent = data.tension.toFixed(1) + ' kN';
    this.elements.gForce.textContent = data.gForce.toFixed(2) + ' g';
  }
}
