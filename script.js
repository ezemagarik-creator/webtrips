/**
 * script.js — Ezequiel Magarik Portfolio
 * Preserved features: SPA routing, focus trap, IntersectionObserver carousel,
 * debounced resize, EmailJS form, honeypot, obfuscated email, QR toggle,
 * nav indicator, slider engine, modal system.
 */

// ============================
// 1. UTILS
// ============================
const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

function getFocusable(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.closest('[aria-hidden="true"]'));
}

function trapFocus(modal, e) {
  const focusable = getFocusable(modal);
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

// ============================
// 2. DATA — SERVICIOS
// ============================
const serviciosData = {
  landing: {
    titulo: 'Landing Pages',
    items: [
      'Diseño y desarrollo desde cero, sin plantillas',
      'Optimizada para conversión y velocidad de carga',
      'Responsive: perfecta en mobile, tablet y desktop',
      'Integración de formularios con EmailJS o WhatsApp',
      'Animaciones y micro-interacciones en CSS/JS puro',
      'Entrega en 5–10 días hábiles',
    ]
  },
  sitios: {
    titulo: 'Sitios Web Completos',
    items: [
      'Arquitectura SPA (Single Page Application) sin frameworks',
      'Multi-sección con navegación animada y transiciones fluidas',
      'Galería, carruseles, lightbox y modales personalizados',
      'Sistema de internacionalización (i18n) con JSON',
      'Soporte post-entrega incluido',
      'Código limpio y documentado para fácil mantenimiento',
    ]
  },
  animaciones: {
    titulo: 'Animaciones & UX',
    items: [
      'Carruseles auto-play con drag táctil y swipe',
      'Lightbox con navegación por teclado y foco accesible',
      'Modales con focus trap y transiciones suaves',
      'Indicadores de navegación animados',
      'Efectos parallax y scroll-triggered',
      'Micro-interacciones que mejoran la experiencia del usuario',
    ]
  },
  optimizacion: {
    titulo: 'Optimización',
    items: [
      'Auditoría completa con Lighthouse (Performance, SEO, A11y)',
      'Lazy loading de imágenes y recursos',
      'Reducción de CLS, LCP y FID',
      'Código ARIA semántico y navegación por teclado',
      'Minificación y optimización de assets',
      'Informe detallado con métricas antes/después',
    ]
  }
};

// ============================
// 3. DOM READY
// ============================
document.addEventListener('DOMContentLoaded', () => {

  const header       = $('header');
  const sections     = $$('.section');
  const allSpaLinks  = $$('a[href^="#"], a[data-section]');
  const sectionById  = Object.fromEntries(sections.map(s => [s.id, s]));
  const sectionOrder = ['home', 'sobre-mi', 'servicios', 'proceso', 'contacto'];

  let currentId    = location.hash?.replace('#','') || 'home';
  let isAnimating  = false;

  // --- Nav Indicator ---
  let navIndicator = $('.nav-indicator');
  if (!navIndicator) {
    navIndicator = document.createElement('div');
    navIndicator.classList.add('nav-indicator');
    if ($('nav ul')) $('nav ul').appendChild(navIndicator);
  }

  // ============================
  // 4. EMAIL OBFUSCATED
  // ============================
  const mail = ['ezemagarik', 'gmail.com'].join('@');
  $$('.js-mailto-btn').forEach(el => { el.href = 'mailto:' + mail; });

  // ============================
  // 5. SPA NAVIGATION
  // ============================
  function moverIndicador(el) {
    if (!el || !navIndicator) return;
    navIndicator.style.width = el.offsetWidth + 'px';
    navIndicator.style.left  = el.offsetLeft  + 'px';
  }

  function switchSection(nextId) {
    if (isAnimating || !sectionById[nextId]) return;
    isAnimating = true;

    sections.forEach(s => s.classList.remove('active'));
    sectionById[nextId].classList.add('active');

    allSpaLinks.forEach(link => {
      const target = link.dataset.section || link.getAttribute('href').replace('#','');
      const active = target === nextId;
      link.classList.toggle('active', active);
      if (active && link.closest('nav')) moverIndicador(link);
    });

    currentId = nextId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { isAnimating = false; }, 600);
  }

  allSpaLinks.forEach(link => {
    link.addEventListener('click', e => {
      const href   = link.getAttribute('href') || '';
      const target = link.dataset.section || href.replace('#','');
      if (!target || target === '#' || !sectionById[target]) return;
      if (href.startsWith('mailto') || href.startsWith('http') || href.startsWith('https')) return;
      e.preventDefault();
      history.pushState({ section: target }, '', `#${target}`);
      switchSection(target);
    });
  });

  window.addEventListener('popstate', e => {
    const target = e.state?.section || location.hash.replace('#','') || 'home';
    switchSection(target);
  });

  // ============================
  // 6. CARRUSEL DE PRINCIPIOS
  // IntersectionObserver pausa cuando sale del viewport
  // ============================
  const carouselWrapper = $('#resenasCarousel');
  if (carouselWrapper) {
    const cards = Array.from(carouselWrapper.children);
    const track = document.createElement('div');
    track.classList.add('carousel-track');
    track.style.cssText = 'display:flex;gap:20px;width:max-content;cursor:grab;';

    const cloneSet = list => list.forEach(c => track.appendChild(c.cloneNode(true)));
    cloneSet(cards);
    cloneSet(cards);

    carouselWrapper.style.overflow = 'hidden';
    carouselWrapper.innerHTML = '';
    carouselWrapper.appendChild(track);

    let posX = 0, speed = 0.6, isDragging = false;
    let startX = 0, scrollStart = 0;
    let isVisible = true;
    let isDragHorizontal = null, dragStartY = 0;

    const observer = new IntersectionObserver(entries => {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(carouselWrapper);

    (function animateCarousel() {
      if (isVisible && !isDragging) {
        posX -= speed;
        if (-posX >= track.scrollWidth / 2) posX = 0;
        track.style.transform = `translateX(${posX}px)`;
      }
      requestAnimationFrame(animateCarousel);
    })();

    track.addEventListener('pointerdown', e => {
      isDragging = true;
      isDragHorizontal = null;
      startX = e.clientX;
      dragStartY = e.clientY;
      scrollStart = posX;
      track.setPointerCapture(e.pointerId);
      track.style.cursor = 'grabbing';
    });

    track.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - dragStartY;
      if (isDragHorizontal === null) isDragHorizontal = Math.abs(dx) > Math.abs(dy);
      if (!isDragHorizontal) return;
      e.preventDefault();
      posX = scrollStart + dx;
      const half = track.scrollWidth / 2;
      if (-posX >= half) posX += half;
      if (posX > 0)      posX -= half;
      track.style.transform = `translateX(${posX}px)`;
    }, { passive: false });

    const stopDrag = () => { isDragging = false; isDragHorizontal = null; track.style.cursor = 'grab'; };
    track.addEventListener('pointerup', stopDrag);
    track.addEventListener('pointerleave', stopDrag);
  }

  // ============================
  // 7. MODAL SERVICIOS
  // ============================
  const modal       = $('#servicio-detalle');
  const modalTitulo = $('#servicio-titulo');
  const modalBody   = $('#servicio-body');

  function openServicioModal(key) {
    const data = serviciosData[key];
    if (!data || !modal) return;

    modalTitulo.textContent = data.titulo;
    modalBody.innerHTML = '<ul>' + data.items.map(i => `<li>${i}</li>`).join('') + '</ul>';
    modalBody.classList.add('active');

    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('active');
    header.classList.add('header-hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { $('#volver-btn')?.focus(); }, 100);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    header.classList.remove('header-hidden');
    document.body.style.overflow = '';
  }

  $$('.servicio-card .btn-unificado').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const key = btn.closest('.servicio-card').dataset.servicio;
      openServicioModal(key);
    });
  });

  $('#volver-btn')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  modal?.addEventListener('keydown', e => { if (e.key === 'Tab') trapFocus(modal, e); });

  // ============================
  // 8. GLOBAL KEYDOWN
  // ============================
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) closeModal();
  });

  // ============================
  // 9. QR TOGGLE
  // ============================
  const qrContainer = $('.qr-prolijo');
  const qrImage     = qrContainer?.querySelector('img');
  if (qrContainer && qrImage) {
    qrImage.addEventListener('click', e => {
      e.stopPropagation();
      qrContainer.classList.toggle('qr-active');
    });
    document.addEventListener('click', () => qrContainer.classList.remove('qr-active'));
  }

  // ============================
  // 10. CONTACT FORM
  // ============================
  $('.formulario-final-v3')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const honey = this.querySelector('input[name="_honey"]');
    if (honey && honey.value) return;

    const btn = this.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<span>ENVIANDO...</span>';
    btn.disabled = true;

    emailjs.sendForm('service_v95fe07', 'template_nrxcwun', this)
      .then(() => {
        btn.innerHTML = '<span>✓ ENVIADO</span>';
        this.reset();
        setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 3000);
      })
      .catch(err => {
        console.error('EmailJS error:', err);
        btn.innerHTML = '<span>ERROR — INTENTÁ DE NUEVO</span>';
        setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 3000);
      });
  });

  // ============================
  // 11. SLIDER ENGINE
  // Debounced resize, ARIA dots
  // ============================
  function inicializarSliders() {
    $$('.slider-wrapper').forEach(slider => {
      const track       = slider.querySelector('.slider-track');
      const slides      = slider.querySelectorAll('.slide');
      const dotContainer = slider.querySelector('.slider-dots');

      if (!track || !slides.length || !dotContainer) return;

      let idx = 0;
      let intervalo;
      const TIEMPO = 3800;

      function actualizarPosicion() {
        track.style.transform = `translateX(-${idx * 100}%)`;
        slider.querySelectorAll('.dot').forEach((d, i) => {
          const active = i === idx;
          d.classList.toggle('active', active);
          d.setAttribute('aria-selected', String(active));
        });
      }

      dotContainer.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Slide ${i + 1} de ${slides.length}`);
        dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        dot.setAttribute('tabindex', '0');
        if (i === 0) dot.classList.add('active');
        const go = () => { idx = i; actualizarPosicion(); restart(); };
        dot.addEventListener('click', go);
        dot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(); });
        dotContainer.appendChild(dot);
      });

      const start   = () => { clearInterval(intervalo); intervalo = setInterval(() => { idx = (idx + 1) % slides.length; actualizarPosicion(); }, TIEMPO); };
      const stop    = () => clearInterval(intervalo);
      const restart = () => { stop(); start(); };

      // Touch swipe
      let touchX = 0;
      slider.addEventListener('touchstart', e => { stop(); touchX = e.changedTouches[0].screenX; }, { passive: true });
      slider.addEventListener('touchend', e => {
        const d = touchX - e.changedTouches[0].screenX;
        if (Math.abs(d) > 50) {
          if (d > 0 && idx < slides.length - 1) idx++;
          else if (d < 0 && idx > 0) idx--;
        }
        actualizarPosicion();
        start();
      }, { passive: true });

      // Debounced resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(actualizarPosicion, 100);
      });

      start();
    });
  }

  // ============================
  // 12. INIT
  // ============================
  switchSection(currentId);
  setTimeout(() => {
    const active = $(`nav ul li a[href="#${currentId}"]`);
    if (active) moverIndicador(active);
  }, 400);

  inicializarSliders();

  // Mobile nav scroll hint
  const navList = $('nav ul');
  if (navList && window.innerWidth < 768) {
    setTimeout(() => {
      navList.scrollTo({ left: 30, behavior: 'smooth' });
      setTimeout(() => navList.scrollTo({ left: 0, behavior: 'smooth' }), 500);
    }, 1000);
  }

}); // end DOMContentLoaded
