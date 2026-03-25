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
    // Fail safe if UI elements not loaded
    if(!this.elements.playPauseBtn && !document.getElementById('demo-btn')) return;
    
    // Check if we're on the diagram page (scene-3d.html) or main scene page
    const demoBtn = document.getElementById('demo-btn');
    if (demoBtn) {
      // We're on the diagram page - use different controls
      this.initDiagramControls();
      this.initKeyboardShortcuts();
      return;
    }
    
    // Original controls for main scene page
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
    
    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', () => {
        this.sceneManager.rider.reset();
        this.elements.playPauseBtn.textContent = 'Play';
      });
    }
    
    if (this.elements.speedSlider) {
      this.elements.speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.elements.speedValue.textContent = val.toFixed(1) + 'x';
        this.sceneManager.timeScale = val;
      });
    }
    
    if (this.elements.viewBtns) {
      this.elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const view = e.target.dataset.view;
          this.sceneManager.setCameraView(view);
          
          // Update active state
          this.elements.viewBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
        });
      });
    }
    
    // Navigation buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    if (navBtns) {
      navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const view = e.target.dataset.view;
          this.sceneManager.setCameraView(view);
          
          // Update active state
          navBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
        });
      });
    }
    
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
        if (this.sceneManager && this.sceneManager.environment) {
            this.sceneManager.environment.setWindSpeed(speed);
        }
      });
    }
    
    if (this.elements.togglePanelBtn) {
      this.elements.togglePanelBtn.addEventListener('click', () => {
        this.elements.panel.classList.toggle('collapsed');
        this.elements.togglePanelBtn.innerHTML = this.elements.panel.classList.contains('collapsed') ? '+' : '&minus;';
      });
    }
    
    this.initKeyboardShortcuts();
  }
  
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      let view = null;
      
      switch(key) {
        case '1':
          view = 'tower1';
          break;
        case '2':
          view = 'tower2';
          break;
        case '0':
        case 'o':
          view = 'overview';
          break;
        case 'p':
          view = 'plan';
          break;
        case 'c':
          view = 'cable';
          break;
        case 's':
          view = 'side';
          break;
        case ' ':
          e.preventDefault();
          // Toggle play/pause
          const demoBtn = document.getElementById('demo-btn');
          if (demoBtn) {
            demoBtn.click();
          } else if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.click();
          }
          return;
      }
      
      if (view) {
        e.preventDefault();
        this.sceneManager.setCameraView(view);
        
        // Update active button state
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
          if (btn.dataset.view === view) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    });
  }
  
  initDiagramControls() {
    // Controls for scene-3d.html (diagram page)
    const demoBtn = document.getElementById('demo-btn');
    const explodeSlider = document.getElementById('explode-slider');
    const explodeVal = document.getElementById('explode-val');
    const rotationSpeed = document.getElementById('rotation-speed');
    const rotateVal = document.getElementById('rotate-val');
    
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        const isPlaying = this.sceneManager.rider.isPlaying;
        if (isPlaying) {
          this.sceneManager.rider.pause();
          demoBtn.innerHTML = '<span class="demo-icon">▶</span> Lancer la Démo';
        } else {
          this.sceneManager.rider.play();
          demoBtn.innerHTML = '<span class="demo-icon">⏸</span> Pause';
        }
      });
    }
    
    if (explodeSlider && explodeVal) {
      explodeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        explodeVal.textContent = Math.round(val * 100) + '%';
        // TODO: Implement exploded view
      });
    }
    
    if (rotationSpeed && rotateVal) {
      rotationSpeed.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        rotateVal.textContent = Math.round(val * 100) + '%';
        // TODO: Implement auto-rotation
      });
    }
  }
  
  updateTelemetry(data) {
    // Only update if telemetry elements exist
    if(!this.elements.speed || !this.elements.speed.textContent === undefined) return;
    
    if (this.elements.speed) this.elements.speed.textContent = data.speed.toFixed(1) + ' m/s';
    if (this.elements.altitude) this.elements.altitude.textContent = data.altitude.toFixed(1) + ' m';
    if (this.elements.distance) this.elements.distance.textContent = Math.floor(data.distance) + ' m';
    if (this.elements.tension) this.elements.tension.textContent = data.tension.toFixed(1) + ' kN';
    if (this.elements.gForce) this.elements.gForce.textContent = data.gForce.toFixed(2) + ' g';
  }
}
