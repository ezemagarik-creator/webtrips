/**
 * ARCHIVO: script.js
 * FIXES APLICADOS:
 *  - Modal usa solo classList (sin inline display) — fix reopen bug
 *  - Focus trap en ambos modales (Tab / Shift+Tab)
 *  - rAF del carrusel pausa con IntersectionObserver cuando está fuera del viewport
 *  - Clones del carrusel reciben traducción al cambiar idioma
 *  - popstate usa location.hash como fallback correcto
 *  - Resize de sliders debounced (100ms)
 *  - Date input recibe min = hoy dinámicamente
 *  - Email obfuscado via JS (no expuesto en HTML)
 *  - Honeypot: bloquea submit si el campo oculto tiene valor
 *  - Un solo keydown handler global para Escape / flechas
 *  - Drag horizontal del carrusel no interfiere con scroll vertical
 *  - Dots de sliders con role, aria-label y aria-selected
 *  - inicializarSliders() movido dentro de DOMContentLoaded
 */

// ============================
// 1. ATAJOS Y UTILIDADES
// ============================
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// Devuelve todos los elementos focusables dentro de un contenedor
function getFocusable(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.closest('[aria-hidden="true"]'));
}

// Trap de foco dentro de un modal
function trapFocus(modal, e) {
  const focusable = getFocusable(modal);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // --- Referencias Principales ---
  const header = $('header');
  const sections = $$('.section');
  const allSpaLinks = $$('a[href^="#"]');
  const sectionById = Object.fromEntries(sections.map(s => [s.id, s]));
  const sectionOrder = ['home', 'destinos', 'resenas', 'surf-trips', 'contacto'];

  // --- Estados Globales ---
  let currentId = location.hash?.replace('#', '') || 'home';
  let isAnimating = false;
  let destinosData = {};
  let translations = {};
  let currentLang = localStorage.getItem('lang') || 'es';

  // --- UI: Indicador Nav ---
  let navIndicator = $('.nav-indicator');
  if (!navIndicator) {
    navIndicator = document.createElement('div');
    navIndicator.classList.add('nav-indicator');
    if ($('nav ul')) $('nav ul').appendChild(navIndicator);
  }

  // ============================
  // 2. EMAIL OBFUSCADO
  // FIX: email no expuesto en HTML, armado por JS
  // ============================
  const mail = ['ezemagarik', 'gmail.com'].join('@');
  $$('.js-mailto').forEach(el => { el.href = 'mailto:' + mail; });
  $$('.js-mailto-btn').forEach(el => { el.href = 'mailto:' + mail; });

  // ============================
  // 3. DATE MIN — evita fechas pasadas
  // ============================
  const dateInput = $('#user_date');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  // ============================
  // 4. NAVEGACIÓN SPA
  // ============================

  function moverIndicador(elementoActivo) {
    if (!elementoActivo || !navIndicator) return;
    navIndicator.style.width = `${elementoActivo.offsetWidth}px`;
    navIndicator.style.left = `${elementoActivo.offsetLeft}px`;
  }

  function switchSection(nextId) {
    if (isAnimating || !sectionById[nextId]) return;
    isAnimating = true;

    sections.forEach(s => s.classList.remove('active', 'prev', 'next'));

    sectionOrder.forEach((id, i) => {
      const sec = sectionById[id];
      if (!sec) return;
      if (id === nextId) {
        sec.classList.add('active');
      } else {
        sec.classList.add(i < sectionOrder.indexOf(nextId) ? 'prev' : 'next');
      }
    });

    allSpaLinks.forEach(link => {
      const linkTarget = link.dataset.section || link.getAttribute('href').replace('#', '');
      const isActive = linkTarget === nextId;
      link.classList.toggle('active', isActive);
      if (isActive && link.closest('nav')) moverIndicador(link);
    });

    currentId = nextId;
    setTimeout(() => { isAnimating = false; }, 600);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  allSpaLinks.forEach(link => {
    link.addEventListener('click', e => {
      const target = link.dataset.section || link.getAttribute('href').replace('#', '');
      if (!target || target === '#' || !sectionById[target]) return; // let mailto / external links go
      e.preventDefault();
      history.pushState({ section: target }, '', `#${target}`);
      switchSection(target);
    });
  });

  // FIX: fallback usa location.hash no 'home' ciego
  window.addEventListener('popstate', e => {
    const target = e.state?.section || location.hash.replace('#', '') || 'home';
    switchSection(target);
  });

  // ============================
  // 5. TRADUCCIONES
  // ============================

  function applyTranslations(scope = document) {
    $$(  '[data-i18n]', scope).forEach(el => {
      const key = el.dataset.i18n;
      if (translations[currentLang]?.[key]) el.innerHTML = translations[currentLang][key];
    });
    $$('[data-i18n-placeholder]', scope).forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (translations[currentLang]?.[key]) el.placeholder = translations[currentLang][key];
    });
  }

  fetch('i18n.json')
    .then(res => res.json())
    .then(data => {
      translations = data;
      navIndicator.style.transition = 'none';
      applyTranslations();
      const activo = $('nav ul li a.active');
      if (activo) moverIndicador(activo);
      void navIndicator.offsetWidth;
      navIndicator.style.transition = '';
    })
    .catch(err => console.error("Error cargando traducciones:", err));

  $$('.flag-btn').forEach(btn => btn.addEventListener('click', () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem('lang', currentLang);
    navIndicator.style.transition = 'none';
    // FIX: traducir también el carrusel clonado pasando su track como scope
    applyTranslations();
    const carouselTrack = $('#resenasCarousel .carousel-track');
    if (carouselTrack) applyTranslations(carouselTrack);
    const activo = $('nav ul li a.active');
    if (activo) moverIndicador(activo);
    void navIndicator.offsetWidth;
    navIndicator.style.transition = '';
  }));

  // ============================
  // 6. CARRUSEL DE RESEÑAS
  // FIX: rAF pausa con IntersectionObserver; clones también se traducen
  // ============================

  const carouselWrapper = $('#resenasCarousel');
  if (carouselWrapper) {
    const cards = Array.from(carouselWrapper.children);
    const track = document.createElement('div');
    track.classList.add('carousel-track');
    track.style.cssText = 'display:flex;gap:20px;width:max-content;cursor:grab;';

    // Clonamos y aplicamos traducciones a los clones al crearlos
    const cloneSet = (list) => list.forEach(c => {
      const clone = c.cloneNode(true);
      track.appendChild(clone);
    });
    cloneSet(cards);
    cloneSet(cards);

    carouselWrapper.style.overflow = 'hidden';
    carouselWrapper.innerHTML = '';
    carouselWrapper.appendChild(track);

    // Traducir los clones recién insertados
    if (Object.keys(translations).length) applyTranslations(track);

    let posX = 0, speed = 0.7, isDragging = false, startX = 0, scrollStart = 0;
    let isVisible = true; // controlado por IntersectionObserver
    let rafId = null;

    function animateCarousel() {
      if (isVisible && !isDragging) {
        posX -= speed;
        if (-posX >= track.scrollWidth / 2) posX = 0;
        track.style.transform = `translateX(${posX}px)`;
      }
      rafId = requestAnimationFrame(animateCarousel);
    }

    // FIX: pausar el loop cuando el carrusel sale del viewport
    const observer = new IntersectionObserver(entries => {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(carouselWrapper);

    animateCarousel();

    // FIX: drag horizontal no interfiere con scroll vertical
    let dragStartY = 0;
    let isDragHorizontal = null;

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
      if (isDragHorizontal === null) {
        isDragHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!isDragHorizontal) return;
      e.preventDefault();
      posX = scrollStart + dx;
      const half = track.scrollWidth / 2;
      if (-posX >= half) posX += half;
      if (posX > 0) posX -= half;
      track.style.transform = `translateX(${posX}px)`;
    }, { passive: false });

    const stopDragging = () => { isDragging = false; isDragHorizontal = null; track.style.cursor = 'grab'; };
    track.addEventListener('pointerup', stopDragging);
    track.addEventListener('pointerleave', stopDragging);
  }

  // ============================
  // 7. LIGHTBOX GALERÍA
  // ============================

  const lb = $('#lightbox'), lbImg = $('#lightbox-img'), surfImgs = $$('.surf-card img');
  let lbIdx = 0, tStartX = 0;

  function moveLb(dir) {
    const outX = dir === 'next' ? '-100%' : '100%';
    const inX  = dir === 'next' ? '100%'  : '-100%';
    lbImg.style.transition = 'transform 0.25s ease, opacity 0.2s';
    lbImg.style.transform = `translateX(${outX})`;
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbIdx = dir === 'next'
        ? (lbIdx + 1) % surfImgs.length
        : (lbIdx - 1 + surfImgs.length) % surfImgs.length;
      lbImg.src = surfImgs[lbIdx].src;
      lbImg.alt = surfImgs[lbIdx].alt;
      // FIX: actualizar aria-label del lightbox con imagen actual
      lb.setAttribute('aria-label', `Visor de imágenes — ${lbImg.alt}`);
      lbImg.style.transition = 'none';
      lbImg.style.transform = `translateX(${inX})`;
      requestAnimationFrame(() => {
        setTimeout(() => {
          lbImg.style.transition = 'transform 0.4s cubic-bezier(0.17, 0.84, 0.44, 1), opacity 0.3s ease';
          lbImg.style.transform = 'translateX(0)';
          lbImg.style.opacity = '1';
        }, 10);
      });
    }, 200);
  }

  const closeLb = () => {
    lb.classList.remove('active');
    lb.setAttribute('aria-hidden', 'true');
    header.classList.remove('header-hidden');
    document.body.style.overflow = '';
    setTimeout(() => { if (lbImg) lbImg.src = ''; }, 300);
  };

  surfImgs.forEach((img, idx) => img.addEventListener('click', () => {
    lbIdx = idx;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lb.setAttribute('aria-label', `Visor de imágenes — ${img.alt}`);
    lb.classList.add('active');
    lb.setAttribute('aria-hidden', 'false');
    header.classList.add('header-hidden');
    document.body.style.overflow = 'hidden';
    lbImg.style.transform = 'scale(1) translateX(0)';
    lbImg.style.opacity = '1';
    // Foco al primer elemento focusable del lightbox
    setTimeout(() => { $('#next-img')?.focus(); }, 50);
  }));

  $('#next-img')?.addEventListener('click', e => { e.stopPropagation(); moveLb('next'); });
  $('#prev-img')?.addEventListener('click', e => { e.stopPropagation(); moveLb('prev'); });
  $('.close-lightbox')?.addEventListener('click', closeLb);
  lb?.addEventListener('click', e => { if (e.target === lb) closeLb(); });

  // Swipe táctil en lightbox
  lb?.addEventListener('touchstart', e => { tStartX = e.changedTouches[0].screenX; }, { passive: true });
  lb?.addEventListener('touchend', e => {
    const d = tStartX - e.changedTouches[0].screenX;
    if (Math.abs(d) > 60) moveLb(d > 0 ? 'next' : 'prev');
  }, { passive: true });

  // ============================
  // 8. MODAL DESTINOS
  // FIX: display controlado solo por CSS (sin inline style); focus trap incluido
  // ============================

  fetch('destinos.json')
    .then(res => res.json())
    .then(data => {
      destinosData = data;
      const modal = $('#destino-detalle'), detalleInner = $('.detalle-inner');
      const tabButtons = $$('.tab-btn[data-tab]'), tabContents = $$('.tab-content');

      function updateModalContent(destinoInfo) {
        tabContents.forEach(tc => { tc.classList.remove('active'); tc.style.opacity = '0'; });
        tabButtons.forEach(tb => tb.classList.remove('active'));

        ['hospedaje', 'tours', 'transfers'].forEach((tabId, i) => {
          const el = document.getElementById(tabId);
          if (el && destinoInfo[tabId]) {
            el.innerHTML = destinoInfo[tabId][currentLang] || '';
            if (i === 0) {
              tabButtons[0]?.classList.add('active');
              el.classList.add('active');
              setTimeout(() => { el.style.opacity = '1'; }, 50);
            }
          }
        });
      }

      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.tab;
          const newContent = document.getElementById(targetId);
          if (!newContent || newContent.classList.contains('active')) return;

          const oldHeight = detalleInner.offsetHeight;
          tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
          tabContents.forEach(c => { c.classList.remove('active'); c.style.opacity = '0'; });

          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          newContent.classList.add('active');

          const newHeight = detalleInner.scrollHeight;
          detalleInner.style.height = oldHeight + 'px';
          detalleInner.offsetHeight; // force reflow
          detalleInner.style.height = newHeight + 'px';

          setTimeout(() => {
            newContent.style.opacity = '1';
            setTimeout(() => { detalleInner.style.height = 'auto'; }, 400);
          }, 50);
        });
      });

      $$('.tour-card .btn-unificado').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const dName = btn.closest('.tour-card').dataset.destino;
          if (destinosData[dName]) {
            $('#detalle-titulo').innerText = dName;
            updateModalContent(destinosData[dName]);
            // FIX: solo classList, sin inline display
            modal.setAttribute('aria-hidden', 'false');
            header.classList.add('header-hidden');
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => modal.classList.add('active'));
            setTimeout(() => { $('#volver-btn')?.focus(); }, 100);
          }
        });
      });

      const closeDestino = () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        header.classList.remove('header-hidden');
        document.body.style.overflow = '';
      };

      $('#volver-btn')?.addEventListener('click', closeDestino);
      modal.addEventListener('click', e => { if (e.target === modal) closeDestino(); });

      // FIX: Focus trap en modal destinos
      modal.addEventListener('keydown', e => {
        if (e.key === 'Tab') trapFocus(modal, e);
      });
    })
    .catch(err => console.error('Error cargando destinos:', err));

  // ============================
  // 9. KEYDOWN GLOBAL UNIFICADO
  // FIX: un solo listener que detecta qué overlay está activo
  // ============================
  document.addEventListener('keydown', e => {
    const lbOpen = lb?.classList.contains('active');
    const modalOpen = $('#destino-detalle')?.classList.contains('active');

    if (e.key === 'Escape') {
      if (lbOpen) closeLb();
      else if (modalOpen) $('#volver-btn')?.click();
    }

    if (lbOpen) {
      if (e.key === 'ArrowRight') moveLb('next');
      if (e.key === 'ArrowLeft')  moveLb('prev');
    }

    // FIX: focus trap en lightbox
    if (lbOpen && e.key === 'Tab') trapFocus(lb, e);
  });

  // ============================
  // 10. QR INTERACTIVO WHATSAPP
  // ============================

  const qrContainer = $('.qr-prolijo');
  const qrImage = qrContainer?.querySelector('img');

  if (qrContainer && qrImage) {
    qrImage.addEventListener('click', e => {
      e.stopPropagation();
      qrContainer.classList.toggle('qr-active');
    });
    document.addEventListener('click', () => {
      qrContainer.classList.remove('qr-active');
    });
  }

  // ============================
  // 11. FORMULARIO DE CONTACTO
  // FIX: honeypot check antes de enviar
  // ============================

  $('.formulario-final-v3')?.addEventListener('submit', function(e) {
    e.preventDefault();

    // Honeypot: si tiene valor, es un bot — silenciosamente ignorar
    const honey = this.querySelector('input[name="_honey"]');
    if (honey && honey.value) return;

    const btn = this.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>ENVIANDO...</span>';
    btn.disabled = true;

    emailjs.sendForm('service_v95fe07', 'template_nrxcwun', this)
      .then(() => {
        btn.innerHTML = '<span>✓ ENVIADO</span>';
        this.reset();
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 3000);
      })
      .catch(err => {
        console.error('EmailJS error:', err);
        btn.innerHTML = '<span>ERROR — INTENTÁ DE NUEVO</span>';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 3000);
      });
  });

  // ============================
  // 12. INICIALIZACIÓN
  // ============================

  switchSection(currentId);
  setTimeout(() => {
    const active = $(`nav ul li a[href="#${currentId}"]`);
    if (active) moverIndicador(active);
  }, 500);

  // Hint de scroll en móvil
  const navList = $('nav ul');
  if (navList && window.innerWidth < 768) {
    setTimeout(() => {
      navList.scrollTo({ left: 30, behavior: 'smooth' });
      setTimeout(() => navList.scrollTo({ left: 0, behavior: 'smooth' }), 500);
    }, 1000);
  }

  // ============================
  // 13. MOTOR DE SLIDERS (movido aquí dentro de DOMContentLoaded)
  // FIX: resize debounced; dots con aria correcto
  // ============================
  function inicializarSliders() {
    const todosLosSliders = document.querySelectorAll('.slider-wrapper, .slider-mini');

    todosLosSliders.forEach(slider => {
      const track = slider.querySelector('.slider-track');
      const slides = slider.querySelectorAll('.slide, .slide-content');
      const dotContainer = slider.querySelector('.slider-dots, .dots-internos');

      if (!track || !slides.length || !dotContainer) return;

      let indiceActual = 0;
      let intervalo;
      let touchStartX = 0;
      let touchEndX = 0;
      const tiempo = slider.classList.contains('slider-mini') ? 5000 : 3500;
      const isMini = slider.classList.contains('slider-mini');

      function actualizarPosicion() {
        track.style.transform = `translateX(-${indiceActual * 100}%)`;
        const todosLosDots = slider.querySelectorAll('.dot, .dot-mini');
        todosLosDots.forEach((dot, i) => {
          const isActive = i === indiceActual;
          dot.classList.toggle('active', isActive);
          // FIX: aria-selected en dots
          dot.setAttribute('aria-selected', String(isActive));
        });
      }

      slider.addEventListener('touchstart', e => {
        detener();
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      slider.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0 && indiceActual < slides.length - 1) indiceActual++;
          else if (diff < 0 && indiceActual > 0) indiceActual--;
        }
        actualizarPosicion();
        iniciar();
      }, { passive: true });

      dotContainer.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('div');
        // FIX: role, aria-label y aria-selected en cada dot
        dot.classList.add(isMini ? 'dot-mini' : 'dot');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Slide ${i + 1} de ${slides.length}`);
        dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        dot.setAttribute('tabindex', '0');
        if (i === 0) dot.classList.add('active');
        const goTo = () => { indiceActual = i; actualizarPosicion(); reiniciarAutoplay(); };
        dot.addEventListener('click', goTo);
        dot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') goTo(); });
        dotContainer.appendChild(dot);
      });

      const iniciar = () => {
        clearInterval(intervalo);
        intervalo = setInterval(() => {
          indiceActual = (indiceActual + 1) % slides.length;
          actualizarPosicion();
        }, tiempo);
      };
      const detener = () => clearInterval(intervalo);
      const reiniciarAutoplay = () => { detener(); iniciar(); };

      // FIX: resize debounced
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(actualizarPosicion, 100);
      });

      iniciar();
    });
  }

  inicializarSliders();

}); // end DOMContentLoaded
