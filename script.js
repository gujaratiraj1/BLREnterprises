document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. Mobile Menu Toggle
  // ==========================================
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  function toggleMenu() {
    mobileToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.classList.toggle('overflow-hidden');
  }

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', toggleMenu);
    
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenu.classList.contains('active')) {
          toggleMenu();
        }
      });
    });
  }

  // ==========================================
  // 2. Services Division Tab Switching
  // ==========================================
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    // Update tab buttons
    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update content panes
    tabContents.forEach(content => {
      if (content.id === `${tabId}-content`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Cross-linking handler (e.g. from Hero or Footer cards to Services section tabs)
  const tabLinks = document.querySelectorAll('[data-target-tab]');
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const tabId = link.getAttribute('data-target-tab');
      switchTab(tabId);
      
      // Allow natural scroll to anchor if href is present, or manually trigger scroll
      const servicesSection = document.getElementById('services');
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
        e.preventDefault();
      }
    });
  });

  // ==========================================
  // 3. Theme Toggle (Light / Dark)
  // ==========================================
  const themeToggle = document.getElementById('theme-toggle');
  
  // Set default theme from localStorage or default to dark
  const storedTheme = localStorage.getItem('blr-theme') || 'dark';
  if (storedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('blr-theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('blr-theme', 'dark');
      }
    });
  }

  // ==========================================
  // 4. Counter Up Animation for Stats
  // ==========================================
  const statNumbers = document.querySelectorAll('.stat-number');
  
  function startCounters() {
    statNumbers.forEach(stat => {
      const target = parseInt(stat.getAttribute('data-target'), 10);
      const count = +stat.innerText;
      
      // Speed factor
      const speed = 100; // lower is slower
      const increment = Math.ceil(target / speed);
      
      const updateCount = () => {
        const currentValue = parseInt(stat.innerText, 10);
        if (currentValue < target) {
          stat.innerText = currentValue + increment > target ? target : currentValue + increment;
          setTimeout(updateCount, 15);
        } else {
          stat.innerText = target;
        }
      };
      
      updateCount();
    });
  }

  // Observe Stats Bar to trigger counter animation
  const statsBar = document.querySelector('.hero-stats-bar');
  if (statsBar) {
    const statsObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startCounters();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    statsObserver.observe(statsBar);
  }

  // ==========================================
  // 5. Scroll Reveal Animation Setup
  // ==========================================
  const revealElements = document.querySelectorAll('.hero-title, .hero-subtitle, .hero-ctas, .hero-cards-grid, .about-text-content, .about-visual, .tab-btn, .tab-contents, .credential-card, .contact-info-pane, .contact-form-pane');
  
  // Wrap all sections & columns in `.reveal` class programmatically for clean HTML
  revealElements.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  // ==========================================
  // 6. Contact Form Validation & Submission
  // ==========================================
  const quoteForm = document.getElementById('quote-form');
  const formStatus = document.getElementById('form-status');

  if (quoteForm && formStatus) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      
      // Visual loading state
      submitBtn.disabled = true;
      submitBtn.innerText = 'Transmitting Query...';
      formStatus.className = 'form-status';
      formStatus.style.display = 'none';

      // Gather input data
      const name = document.getElementById('form-name').value.trim();
      const email = document.getElementById('form-email').value.trim();
      const phone = document.getElementById('form-phone').value.trim();
      const division = document.getElementById('form-division').value;
      const message = document.getElementById('form-message').value.trim();

      // Simple validations
      if (!name || !email || !phone || !division || !message) {
        formStatus.innerText = 'Please complete all required fields.';
        formStatus.classList.add('error');
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        return;
      }

      // Simulate B2B API call (2 seconds latency)
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        
        // Show success confirmation referencing official credentials for compliance trust
        formStatus.innerHTML = `
          <strong>Success! Inquiry Registered.</strong><br>
          Thank you ${name}. Your quote request for the <strong>${division.toUpperCase()}</strong> division has been logged into our customer queue. 
          A representative will email you at <em>${email}</em> or call you at <em>${phone}</em>. <br>
          <small>Transaction ID: BLR-REQ-${Math.floor(100000 + Math.random() * 900000)}</small>
        `;
        formStatus.classList.add('success');
        
        // Clear inputs
        quoteForm.reset();
      }, 1800);
    });
  }

  // Active Navbar links highlights based on scroll position
  const navLinks = document.querySelectorAll('.menu-link');
  const sections = document.querySelectorAll('section');

  window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= (sectionTop - 120)) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').substring(1) === current) {
        link.classList.add('active');
      }
    });
  });
});
