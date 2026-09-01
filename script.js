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

// ===== EXTERNAL LINK & DOWNLOAD HELPERS =====
function openLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function downloadResume() {
  const a = document.createElement('a');
  a.href = 'assets/Manoj_Kumar_V_Resume.pdf';
  a.download = 'Manoj_Kumar_V_Resume.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ===== EMAIL PICKER MODAL =====
const EMAIL_TO      = 'manojkumarvk23@gmail.com';
const EMAIL_SUBJECT = 'Hello Manoj \u2014 Saw Your Portfolio';
const EMAIL_BODY    = 'Hi Manoj,\n\nI came across your portfolio and would love to connect!\n\n';

function openEmailModal() {
  document.getElementById('emailModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function openGmail() {
  const subject = encodeURIComponent(EMAIL_SUBJECT);
  const body    = encodeURIComponent(EMAIL_BODY);
  window.open(
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_TO)}&su=${subject}&body=${body}`,
    '_blank'
  );
  closeEmailModal();
}

function openMailApp() {
  const subject = encodeURIComponent(EMAIL_SUBJECT);
  const body    = encodeURIComponent(EMAIL_BODY);
  window.location.href = `mailto:${EMAIL_TO}?subject=${subject}&body=${body}`;
  closeEmailModal();
}

function closeEmailModal() {
  document.getElementById('emailModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeEmailModal();
    closeProject();
  }
});


// ===== PROJECT DETAIL MODAL =====
// SVG icon map — clean, consistent, accent-coloured
const ICONS = {
  lock:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  user:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  shop:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  star:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  cart:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
  chart:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  store:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  refresh:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
  film:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
  ticket:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 000 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 000-4V7a2 2 0 00-2-2H5z"/></svg>`,
  db:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  globe:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
  layers:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  shield:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  heart:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  cloud:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`,
  bell:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  brush:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L3 14.67V21h6.33L20.84 9.45a5.5 5.5 0 000-7.84z"/><line x1="16" y1="5" x2="19" y2="8"/></svg>`,
  phone:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  sync:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
  grad:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  list:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  key:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  monitor:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  file:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
};

// ===== PROJECT DETAIL MODAL =====
const PROJECTS = {
  pricenova: {
    num: '01',
    title: 'PriceNova',
    badge: '👥 Group Project (2 Members)',
    badgeClass: 'group-badge',
    year: '2024',
    tech: ['PHP', 'MySQL', 'HTML', 'CSS', 'XAMPP'],
    overview: [
      'PriceNova is a full-stack e-commerce website developed as a <strong>group project of two members</strong>, built to give users a simple and convenient platform for browsing and purchasing products online.',
      'The main goal was to understand how an online shopping platform works — how different components such as users, products, sellers, and databases connect into a single, functional system.',
      'The backend was powered by <strong>PHP</strong> with a <strong>MySQL</strong> database managed through <strong>XAMPP</strong>. HTML and CSS were used to design and structure the frontend. Reusable components were implemented throughout to make the application easier to maintain and scale.'
    ],
    modules: [
      { icon: 'lock',    label: 'User Registration & Login' },
      { icon: 'shop',    label: 'Product Browsing' },
      { icon: 'star',    label: 'Featured Products' },
      { icon: 'cart',    label: 'Shopping Cart' },
      { icon: 'chart',   label: 'User Dashboard' },
      { icon: 'store',   label: 'Become a Seller' },
      { icon: 'db',      label: 'Database Management' },
      { icon: 'refresh', label: 'Reusable Components' }
    ],
    learnings: [
      'How a complete web application works behind the scenes — connecting frontend, backend, and database.',
      'Practical experience in PHP programming and MySQL database design for an e-commerce system.',
      'Managing user sessions, authentication, and secure data handling.',
      'Team collaboration and division of responsibilities in a group development project.',
      'Importance of proper database schema design when building relational data-driven apps.'
    ]
  },

  bookmyshow: {
    num: '02',
    title: 'BookMyShow – Movie Ticket Booking',
    badge: '🧑‍💻 Solo Project',
    badgeClass: 'solo-badge',
    year: '2024',
    tech: ['Python', 'Django', 'SQL', 'SQLite'],
    overview: [
      'BookMyShow is a movie ticket booking web application developed individually using the <strong>Django framework</strong> and <strong>SQL</strong>. The project focused on building a structured, database-driven backend with secure user authentication.',
      'The core idea was to understand how web frameworks structure applications and how different types of data — movies, users, bookings — can be stored and retrieved efficiently from a database.',
      'The architecture was designed with scalability in mind, ensuring that additional features such as seat selection, payment, and notifications could be integrated in future iterations.'
    ],
    modules: [
      { icon: 'lock',     label: 'User Authentication' },
      { icon: 'film',     label: 'Movie Data Management' },
      { icon: 'ticket',   label: 'Ticket Booking' },
      { icon: 'db',       label: 'SQL Database' },
      { icon: 'settings', label: 'Django Admin Panel' },
      { icon: 'globe',    label: 'URL Routing & Views' },
      { icon: 'layers',   label: 'Django ORM Models' },
      { icon: 'shield',   label: 'Session Management' }
    ],
    learnings: [
      'Structuring a backend web application using the Django MVT (Model-View-Template) pattern.',
      'Working with Django ORM to interact with SQL databases without writing raw queries.',
      'Implementing secure user login, registration, and session handling in Django.',
      'Connecting URL routes, views, and templates in a full Django project.',
      'How to design a scalable backend so the application can be maintained and extended easily.'
    ]
  },

  bloodapp: {
    num: '03',
    title: 'Blood Donation App',
    badge: '🧑‍💻 Solo Project',
    badgeClass: 'solo-badge',
    year: '2024',
    tech: ['Kotlin', 'Jetpack Compose', 'Firebase', 'Firestore', 'FCM'],
    overview: [
      'The Blood Donation App is an Android application built individually to help connect people willing to donate blood with individuals who need a specific blood group — addressing a real social need through technology.',
      'Developed using <strong>Kotlin</strong> and <strong>Jetpack Compose</strong> for the UI, the app communicates with <strong>Firebase</strong> for its entire backend — including authentication, real-time data storage in Firestore, and push notifications via Firebase Cloud Messaging.',
      'An important aspect of this project was thinking about how an application can be designed around a meaningful, real-world problem rather than built purely as a technical exercise.'
    ],
    modules: [
      { icon: 'lock',  label: 'Firebase Authentication' },
      { icon: 'user',  label: 'Donor Registration' },
      { icon: 'heart', label: 'Blood Group Management' },
      { icon: 'cloud', label: 'Firestore Database' },
      { icon: 'bell',  label: 'Push Notifications (FCM)' },
      { icon: 'brush', label: 'Jetpack Compose UI' },
      { icon: 'phone', label: 'Android Navigation' },
      { icon: 'sync',  label: 'Real-time Data Sync' }
    ],
    learnings: [
      'Building Android UIs declaratively with Jetpack Compose — states, composables, and navigation.',
      'Integrating Firebase Authentication for secure user registration and login on Android.',
      'Storing and retrieving real-time data from Firestore cloud database.',
      'Sending push notifications to users using Firebase Cloud Messaging (FCM).',
      'Designing an app around a meaningful social problem and thinking through real user flows.'
    ]
  },

  schoolms: {
    num: '04',
    title: 'School Management System',
    badge: '🧑‍💻 Solo Project',
    badgeClass: 'solo-badge',
    year: '2023',
    tech: ['.NET', 'C#', 'Visual Studio', 'SQL Server'],
    overview: [
      'The School Management System is a desktop administrative application developed individually using <strong>.NET (C#) and Visual Studio</strong>, integrated with <strong>SQL Server</strong> for data management. It was designed to reduce manual work involved in managing student, staff, and administrative information.',
      'The project went through a full software development lifecycle — requirement analysis, feasibility study (technical, operational, and scheduling), system design, database modeling, UI design, and final implementation. Logical and physical designs were documented before coding began.',
      'The system centralizes school operations digitally, replacing paper-based manual processes with a faster, more accurate, and more secure approach — improving efficiency, accuracy, and data reliability across the institution.'
    ],
    modules: [
      { icon: 'grad',    label: 'Add Student' },
      { icon: 'list',    label: 'Manage Student' },
      { icon: 'user',    label: 'Add Staff' },
      { icon: 'file',    label: 'Manage Staff' },
      { icon: 'key',     label: 'Admin Management' },
      { icon: 'db',      label: 'SQL Server Database' },
      { icon: 'monitor', label: '.NET Desktop UI' },
      { icon: 'chart',   label: 'Reports & Records' }
    ],
    learnings: [
      'Full software development lifecycle — from feasibility study and system analysis to design and implementation.',
      'Building Windows desktop applications using .NET (C#) and Visual Studio.',
      'Designing relational database schemas in SQL Server for institutional data management.',
      'Logical and physical system design, including data flow diagrams and UI wireframes.',
      'How software can reduce operational inefficiency and improve data accuracy in real organisations.'
    ]
  }
};

function openProject(id) {
  const p = PROJECTS[id];
  if (!p) return;

  // Populate modal fields
  document.getElementById('pmNum').textContent   = p.num;
  document.getElementById('pmTitle').textContent = p.title;
  document.getElementById('pmYear').textContent  = p.year;

  const badge = document.getElementById('pmBadge');
  badge.textContent = p.badge;
  badge.className   = 'proj-modal-badge ' + p.badgeClass;

  // Tech tags
  document.getElementById('pmTech').innerHTML =
    p.tech.map(t => `<span>${t}</span>`).join('');

  // Overview paragraphs
  document.getElementById('pmBody').innerHTML =
    p.overview.map(t => `<p>${t}</p>`).join('');

  // Key Modules
  document.getElementById('pmModules').innerHTML = `
    <h4>Key Features &amp; Modules</h4>
    <div class="module-chips">
      ${p.modules.map((m, i) => `
        <div class="module-chip" style="animation-delay:${i * 0.06}s">
          <span class="chip-icon">${ICONS[m.icon] || ''}</span> ${m.label}
        </div>`).join('')}
    </div>`;

  // Learnings
  document.getElementById('pmLearnings').innerHTML = `
    <h4>What I Learned</h4>
    <div class="learning-list">
      ${p.learnings.map((l, i) => `
        <div class="learning-item" style="animation-delay:${i * 0.08}s">${l}</div>`).join('')}
    </div>`;

  // Reset scroll & open modal
  document.querySelector('.proj-modal-scroll').scrollTop = 0;
  document.getElementById('projModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProject() {
  document.getElementById('projModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Keyboard accessibility for project cards
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
});
