document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. Mobile Menu Toggle
  // ==========================================
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  function toggleMenu() {
    const open = !mobileMenu.classList.contains('active');
    mobileToggle.classList.toggle('active', open);
    mobileMenu.classList.toggle('active', open);
    document.body.classList.toggle('overflow-hidden', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileMenu.inert = !open;
    mobileMenu.setAttribute('aria-hidden', String(!open));
  }

  if (mobileToggle && mobileMenu) {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && mobileMenu.classList.contains('active')) {
        toggleMenu();
        mobileToggle.focus();
      }
    });
    window.matchMedia('(min-width: 992px)').addEventListener('change', event => {
      if (event.matches && mobileMenu.classList.contains('active')) toggleMenu();
    });
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
      const selected = btn.getAttribute('data-tab') === tabId;
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
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
    btn.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const items = [...tabButtons];
      let index = items.indexOf(btn);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = items.length - 1;
      else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      switchTab(items[index].dataset.tab);
      items[index].focus();
    });
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
  let storedTheme = 'dark';
  try { storedTheme = localStorage.getItem('blr-theme') || 'dark'; } catch { /* Storage may be unavailable. */ }
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
        try { localStorage.setItem('blr-theme', 'light'); } catch { /* Keep the current theme for this visit. */ }
      } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        try { localStorage.setItem('blr-theme', 'dark'); } catch { /* Keep the current theme for this visit. */ }
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
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        stat.innerText = target;
        return;
      }
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
  // 6. Contact Form Validation & Submission (Formspree)
  // ==========================================
  const quoteForm = document.getElementById('quote-form');
  const formStatus = document.getElementById('form-status');

  const formId = window.BLR_CONFIG?.formspreeFormId || '';
  const FORMSPREE_ENDPOINT = /^[a-zA-Z0-9]+$/.test(formId)
    ? `https://formspree.io/f/${formId}` : '';

  if (quoteForm && formStatus) {
    const emailDraft = document.getElementById('email-draft');
    document.querySelectorAll('[data-inquiry]').forEach(link => {
      link.addEventListener('click', () => {
        document.getElementById('form-division').value = link.dataset.inquiry;
        emailDraft.hidden = true;
      });
    });
    quoteForm.addEventListener('input', () => { emailDraft.hidden = true; });
    if (!FORMSPREE_ENDPOINT) {
      formStatus.textContent = 'Fill in your details to prepare an email inquiry. You can review and send it from your email app.';
      formStatus.className = 'form-status';
      formStatus.style.display = 'block';
      quoteForm.querySelector('button[type="submit"]').textContent = 'Prepare email inquiry';
    }
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!quoteForm.reportValidity()) return;

      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      if (submitBtn.disabled) return;

      // Gather input data
      const name     = document.getElementById('form-name').value.trim();
      const email    = document.getElementById('form-email').value.trim();
      const phone    = document.getElementById('form-phone').value.trim();
      const division = document.getElementById('form-division').value;
      const message  = document.getElementById('form-message').value.trim();

      // Client-side validation
      if (!name || !email || !phone || !division || !message) {
        formStatus.style.display = 'block';
        formStatus.innerText = 'Please complete all required fields.';
        formStatus.className = 'form-status error';
        return;
      }

      if (!FORMSPREE_ENDPOINT) {
        const subject = `BLR Enterprises – ${division} inquiry`;
        const body = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nDivision: ${division}\n\n${message}`;
        emailDraft.href = `mailto:blrenterprise2026@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        emailDraft.hidden = false;
        formStatus.textContent = 'Your email draft is ready. Open it below, then review and send it in your email app. Nothing has been sent yet.';
        formStatus.style.display = 'block';
        emailDraft.focus();
        return;
      }

      // Visual loading state
      submitBtn.disabled = true;
      submitBtn.innerText = 'Transmitting Query...';
      formStatus.className = 'form-status';
      formStatus.style.display = 'none';

      try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            division,
            message,
            _subject: `BLR Enterprises – New Quote Request from ${name}`,
            _replyto: email
          })
        });

        submitBtn.disabled = false;
        submitBtn.innerText = originalText;

        if (response.ok) {
          formStatus.textContent = `Thank you, ${name}. Your ${division} inquiry has been submitted. Our team will contact you using the details provided.`;
          formStatus.className = 'form-status success';
          formStatus.style.display = 'block';
          quoteForm.reset();
        } else {
          // Formspree returns error details in JSON
          const data = await response.json();
          const errMsg = data.errors ? data.errors.map(err => err.message).join(', ') : 'Submission failed. Please try again.';
          formStatus.innerText = errMsg;
          formStatus.className = 'form-status error';
          formStatus.style.display = 'block';
        }

      } catch (networkError) {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        formStatus.innerText = 'Network error. Please check your connection and try again.';
        formStatus.className = 'form-status error';
        formStatus.style.display = 'block';
      }
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
