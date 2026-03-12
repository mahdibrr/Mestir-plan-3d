// DataVisualizer.js

class SpecificationsDashboard {
  constructor() {
    this.state = {
      weight: 80,
      wind: 10,
      temp: 25
    };
    
    this.charts = {};
    this.init();
  }
  
  init() {
    this.bindInputs();
    this.initCharts();
    this.updateCalculations();
  }
  
  bindInputs() {
    const inputs = ['weight', 'wind', 'temp'];
    const map = { weight: 'rider-weight', wind: 'wind-speed', temp: 'temperature' };
    
    inputs.forEach(key => {
      const el = document.getElementById(map[key]);
      const display = document.getElementById(`${key}-val`);
      if (el && display) {
        el.addEventListener('input', (e) => {
          this.state[key] = parseFloat(e.target.value);
          display.textContent = this.state[key];
          this.updateCalculations();
        });
      }
    });
  }
  
  updateCalculations() {
    // Basic dynamic engineering calculations
    const baseTension = 40.0; // kN dead load sag tension
    
    // Live load impacts tension
    const liveTension = (this.state.weight / 100) * 5; 
    
    // Wind impacts tension (lateral load adds to total resultant cable tension)
    const windTension = (this.state.wind / 50) * 3;
    
    // Temp expands/contracts cable (rough estimate: hotter = sag more = less tension)
    const tempTension = (25 - this.state.temp) * 0.1;
    
    const totalTension = baseTension + liveTension + windTension + tempTension;
    
    // Safety Factor = Breaking Strength / Current Tension
    // Let's assume breaking strength is 157 kN
    const breakingStrength = 157.0;
    const safetyFactor = breakingStrength / totalTension;
    
    document.getElementById('calc-tension').textContent = totalTension.toFixed(1) + ' kN';
    const sfEl = document.getElementById('calc-sf');
    sfEl.textContent = safetyFactor.toFixed(2);
    
    if (safetyFactor < 2.5) {
      sfEl.style.color = '#ff4444';
    } else if (safetyFactor < 3.0) {
      sfEl.style.color = '#ffaa00';
    } else {
      sfEl.style.color = '#00D9FF';
    }
    
    // Update charts based on new data
    this.updateCharts(liveTension, windTension);
  }
  
  initCharts() {
    // Global defaults for dark mode Chart.js
    Chart.defaults.color = '#a0a8b5';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    
    // 1. Load Distribution (Bar)
    const ctxLoad = document.getElementById('loadChart').getContext('2d');
    this.charts.load = new Chart(ctxLoad, {
      type: 'bar',
      data: {
        labels: ['Charge Morte', 'Charge Vive', 'Vent', 'Variation Temp.'],
        datasets: [{
          label: 'Force (kN)',
          data: [40.0, 4.0, 0.6, 0.0],
          backgroundColor: ['#4a4a4a', '#00D9FF', '#ffaa00', '#ff4444'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 50 } }
      }
    });
    
    // 2. Wind Profile vs Height (Line)
    const ctxWind = document.getElementById('windChart').getContext('2d');
    this.charts.wind = new Chart(ctxWind, {
      type: 'line',
      data: {
        labels: ['0m', '5m', '10m', '15m', '20m', '25m', '28m'],
        datasets: [{
          label: 'Pression du Vent (Pa)',
          data: [300, 350, 420, 500, 560, 620, 650], // Base data
          borderColor: '#00D9FF',
          backgroundColor: 'rgba(0, 217, 255, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      }
    });

    // 3. Material Specifications (Radar)
    const ctxMat = document.getElementById('materialChart').getContext('2d');
    this.charts.material = new Chart(ctxMat, {
      type: 'radar',
      data: {
        labels: ['Résistance', 'Poids', 'Coût', 'Durabilité', 'Résist. Corrosion'],
        datasets: [{
          label: 'Acier S355J2',
          data: [90, 40, 60, 85, 95],
          backgroundColor: 'rgba(0, 217, 255, 0.2)',
          borderColor: '#00D9FF',
          pointBackgroundColor: '#00D9FF'
        }, {
          label: 'Béton C30',
          data: [40, 90, 30, 95, 80],
          backgroundColor: 'rgba(255, 170, 0, 0.2)',
          borderColor: '#ffaa00',
          pointBackgroundColor: '#ffaa00'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { min: 0, max: 100, ticks: { display: false } } }
      }
    });
  }
  
  updateCharts(liveTension, windTension) {
    if (!this.charts.load) return;
    
    const tempTension = Math.abs((25 - this.state.temp) * 0.1);
    
    // Update Load Bar Chart
    this.charts.load.data.datasets[0].data = [40.0, liveTension, windTension, tempTension];
    this.charts.load.update();
    
    // Update Wind Profile based on base wind speed configuration
    const basePa = (this.state.wind * this.state.wind) * 0.6; // Simplified dynamic pressure
    const newWindProfile = [
      basePa * 0.5,
      basePa * 0.6,
      basePa * 0.75,
      basePa * 0.9,
      basePa * 1.05,
      basePa * 1.15,
      basePa * 1.2
    ];
    this.charts.wind.data.datasets[0].data = newWindProfile;
    this.charts.wind.update();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  new SpecificationsDashboard();
});
