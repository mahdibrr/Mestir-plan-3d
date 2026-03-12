import { gsap } from 'gsap';

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Background Glass Effect on Scroll
  const nav = document.querySelector('.glass-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(7, 9, 15, 0.85)';
      nav.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
      nav.style.borderBottom = '1px solid rgba(0, 217, 255, 0.2)';
    } else {
      nav.style.background = 'rgba(7, 9, 15, 0.5)';
      nav.style.boxShadow = 'none';
      nav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    }
  });

  // Staggered entry animation for feature cards
  const observerOptions = {
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        gsap.fromTo(entry.target, 
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card').forEach((card) => {
    observer.observe(card);
  });
  
  // Count up animation for stats
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        // Parse current text
        const text = target.innerHTML;
        const matches = text.match(/([0-9.]+)(<span.*span>)/);
        
        if (matches) {
          const endValue = parseFloat(matches[1]);
          const unitHtml = matches[2];
          
          let obj = { val: 0 };
          gsap.to(obj, {
            val: endValue,
            duration: 2,
            ease: "power2.out",
            onUpdate: function() {
              // format properly (1 decimal if needed)
              let displayVal = endValue % 1 === 0 ? Math.floor(obj.val) : obj.val.toFixed(1);
              target.innerHTML = displayVal + unitHtml;
            }
          });
        }
        statsObserver.unobserve(target);
      }
    });
  }, { threshold: 0.5 });
  
  document.querySelectorAll('.stat-value').forEach((stat) => {
    statsObserver.observe(stat);
  });

  console.log("Tyrolienne Monastir - Frontend initialized.");
});
