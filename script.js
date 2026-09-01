// ===== LOADER =====
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 2200);
});

// ===== CUSTOM CURSOR =====
const dot = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  dot.style.left = mouseX + 'px';
  dot.style.top = mouseY + 'px';
});

function animateRing() {
  ringX += (mouseX - ringX) * 0.15;
  ringY += (mouseY - ringY) * 0.15;
  ring.style.left = ringX + 'px';
  ring.style.top = ringY + 'px';
  requestAnimationFrame(animateRing);
}
animateRing();

document.querySelectorAll('a, button, .skill-card, .project-card, .cert-item, .stat').forEach(el => {
  el.addEventListener('mouseenter', () => ring.classList.add('hover'));
  el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
});

// ===== NAVBAR SCROLL =====
let lastScroll = 0;
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  const current = window.scrollY;
  if (current > lastScroll && current > 100) {
    navbar.classList.add('hidden');
  } else {
    navbar.classList.remove('hidden');
  }
  lastScroll = current;
});

// ===== MOBILE NAV =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navLinks.classList.toggle('open');
});

function closeNav() {
  navToggle.classList.remove('active');
  navLinks.classList.remove('open');
}

// ===== SCROLL REVEAL =====
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

reveals.forEach(el => revealObserver.observe(el));

// ===== SMOOTH SCROLL FOR NAV LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== TILT EFFECT ON HERO STAGE =====
const heroStage = document.querySelector('.hero-stage');
if (heroStage) {
  heroStage.addEventListener('mousemove', e => {
    const rect = heroStage.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    heroStage.style.transform = `perspective(1000px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
  });
  heroStage.addEventListener('mouseleave', () => {
    heroStage.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
    heroStage.style.transition = 'transform 0.5s ease';
    setTimeout(() => heroStage.style.transition = '', 500);
  });
}

// ===== PARALLAX ON HERO PORTRAIT =====
const portrait = document.querySelector('.hero-portrait');
if (portrait) {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    portrait.style.transform = `translateX(-50%) translateY(${scrolled * 0.15}px)`;
  });
}

// ===== STAT COUNTER ANIMATION =====
const statNumbers = document.querySelectorAll('.stat-number');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const text = el.textContent;
      const num = parseInt(text);
      if (isNaN(num)) return;
      const suffix = text.replace(/[0-9]/g, '');
      let count = 0;
      const step = Math.max(1, Math.floor(num / 30));
      const timer = setInterval(() => {
        count += step;
        if (count >= num) { count = num; clearInterval(timer); }
        el.textContent = count + suffix;
      }, 40);
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach(el => statObserver.observe(el));

// ===== ACTIVE NAV LINK HIGHLIGHT =====
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 200;
    if (window.scrollY >= top) current = section.getAttribute('id');
  });
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.style.color = '';
    if (link.getAttribute('href') === '#' + current) {
      link.style.color = 'var(--accent)';
    }
  });
});

// ===== EMAIL PICKER MODAL =====
const EMAIL_TO      = 'manojkumarvk23@gmail.com';
const EMAIL_SUBJECT = 'Hello Manoj \u2014 Saw Your Portfolio';
const EMAIL_BODY    = 'Hi Manoj,\n\nI came across your portfolio and would love to connect!\n\n';

function openEmailModal() {
  const subject = encodeURIComponent(EMAIL_SUBJECT);
  const body    = encodeURIComponent(EMAIL_BODY);

  // Gmail compose URL — works in any browser without an email client
  document.getElementById('emailGmailBtn').href =
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_TO)}&su=${subject}&body=${body}`;

  // Mailto — opens Outlook / Apple Mail / etc.
  document.getElementById('emailMailtoBtn').href =
    `mailto:${EMAIL_TO}?subject=${subject}&body=${body}`;

  document.getElementById('emailModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEmailModal() {
  document.getElementById('emailModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeEmailModal();
});

