/**
 * ARCHIVO: script.js
 * ESTADO: Corregido — bugs de scope, EmailJS duplicado, observer innecesario y form class arreglados.
 */

// ============================
// 1. ATAJOS Y UTILIDADES
// ============================
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

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
  // 2. NAVEGACIÓN SPA
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
      e.preventDefault();
      const target = link.dataset.section || link.getAttribute('href').replace('#', '');
      history.pushState({ section: target }, '', `#${target}`);
      switchSection(target);
    });
  });

  window.addEventListener('popstate', e => {
    switchSection(e.state?.section || 'home');
  });

  // ============================
  // 3. TRADUCCIONES
  // ============================

  function applyTranslations() {
    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (translations[currentLang]?.[key]) el.innerHTML = translations[currentLang][key];
    });
    $$('[data-i18n-placeholder]').forEach(el => {
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
    applyTranslations();
    const activo = $('nav ul li a.active');
    if (activo) moverIndicador(activo);
    void navIndicator.offsetWidth;
    navIndicator.style.transition = '';
  }));

  // ============================
  // 4. CARRUSEL DE RESEÑAS
  // ============================

  const carouselWrapper = $('#resenasCarousel');
  if (carouselWrapper) {
    const cards = Array.from(carouselWrapper.children);
    const track = document.createElement('div');
    track.style.display = 'flex';
    track.style.gap = '20px';
    track.style.width = 'max-content';
    track.style.cursor = 'grab';

    cards.forEach(c => track.appendChild(c.cloneNode(true)));
    cards.forEach(c => track.appendChild(c.cloneNode(true)));

    carouselWrapper.style.overflow = 'hidden';
    carouselWrapper.innerHTML = '';
    carouselWrapper.appendChild(track);

    let posX = 0, speed = 0.7, isDragging = false, startX = 0, scrollStart = 0;

    function animateCarousel() {
      if (!isDragging) {
        posX -= speed;
        if (-posX >= track.scrollWidth / 2) posX = 0;
        track.style.transform = `translateX(${posX}px)`;
      }
      requestAnimationFrame(animateCarousel);
    }
    animateCarousel();

    track.addEventListener('pointerdown', e => {
      isDragging = true;
      startX = e.clientX;
      scrollStart = posX;
      track.setPointerCapture(e.pointerId);
      track.style.cursor = 'grabbing';
    });

    track.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const delta = e.clientX - startX;
      posX = scrollStart + delta;
      if (-posX >= track.scrollWidth / 2) posX += track.scrollWidth / 2;
      if (posX > 0) posX -= track.scrollWidth / 2;
      track.style.transform = `translateX(${posX}px)`;
    });

    const stopDragging = () => { isDragging = false; track.style.cursor = 'grab'; };
    track.addEventListener('pointerup', stopDragging);
    track.addEventListener('pointerleave', stopDragging);
  }

  // ============================
  // 5. LIGHTBOX GALERÍA
  // ============================

  const lb = $('#lightbox'), lbImg = $('#lightbox-img'), surfImgs = $$('.surf-card img');
  let lbIdx = 0, tStartX = 0;

  function moveLb(dir) {
    const outX = dir === 'next' ? '-100%' : '100%';
    const inX = dir === 'next' ? '100%' : '-100%';
    lbImg.style.transition = 'transform 0.25s ease, opacity 0.2s';
    lbImg.style.transform = `translateX(${outX})`;
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbIdx = dir === 'next'
        ? (lbIdx + 1) % surfImgs.length
        : (lbIdx - 1 + surfImgs.length) % surfImgs.length;
      lbImg.src = surfImgs[lbIdx].src;
      lbImg.alt = surfImgs[lbIdx].alt;
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
    setTimeout(() => { if (lbImg) lbImg.src = ""; }, 300);
  };

  surfImgs.forEach((img, idx) => img.addEventListener('click', () => {
    lbIdx = idx;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lb.classList.add('active');
    lb.setAttribute('aria-hidden', 'false');
    header.classList.add('header-hidden');
    document.body.style.overflow = 'hidden';
    lbImg.style.transform = 'scale(1) translateX(0)';
    lbImg.style.opacity = '1';
  }));

  $('#next-img')?.addEventListener('click', e => { e.stopPropagation(); moveLb('next'); });
  $('#prev-img')?.addEventListener('click', e => { e.stopPropagation(); moveLb('prev'); });
  $('.close-lightbox')?.addEventListener('click', closeLb);
  lb?.addEventListener('click', e => { if (e.target === lb) closeLb(); });

  // Teclado: Escape cierra, flechas navegan
  document.addEventListener('keydown', e => {
    if (!lb?.classList.contains('active')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') moveLb('next');
    if (e.key === 'ArrowLeft') moveLb('prev');
  });

  lb?.addEventListener('touchstart', e => tStartX = e.changedTouches[0].screenX, { passive: true });
  lb?.addEventListener('touchend', e => {
    const d = tStartX - e.changedTouches[0].screenX;
    if (Math.abs(d) > 60) moveLb(d > 0 ? 'next' : 'prev');
  }, { passive: true });

  // ============================
  // 6. MODAL DESTINOS
  // ============================

  fetch('destinos.json')
    .then(res => res.json())
    .then(data => {
      destinosData = data;
      const modal = $('#destino-detalle'), detalleInner = $('.detalle-inner');
      const tabButtons = $$('.tab-btn[data-tab]'), tabContents = $$('.tab-content');

      function updateModalContent(destinoInfo) {
        tabContents.forEach(tc => { tc.classList.remove('active'); tc.style.opacity = "0"; });
        tabButtons.forEach(tb => tb.classList.remove('active'));

        ['hospedaje', 'tours', 'transfers'].forEach((tabId, i) => {
          const el = document.getElementById(tabId);
          if (el && destinoInfo[tabId]) {
            el.innerHTML = destinoInfo[tabId][currentLang] || '';
            if (i === 0) {
              tabButtons[0]?.classList.add('active');
              el.classList.add('active');
              setTimeout(() => el.style.opacity = "1", 50);
            }
          }
        });
      }

      tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          const targetId = btn.dataset.tab;
          const newContent = document.getElementById(targetId);
          if (!newContent || newContent.classList.contains("active")) return;

          const oldHeight = detalleInner.offsetHeight;
          tabButtons.forEach(b => b.classList.remove("active"));
          tabContents.forEach(c => { c.classList.remove('active'); c.style.opacity = "0"; });

          btn.classList.add("active");
          newContent.classList.add("active");

          const newHeight = detalleInner.scrollHeight;
          detalleInner.style.height = oldHeight + 'px';
          detalleInner.offsetHeight;
          detalleInner.style.height = newHeight + 'px';

          setTimeout(() => {
            newContent.style.opacity = "1";
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
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            header.classList.add('header-hidden');
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => modal.classList.add('active'));
            $('#volver-btn')?.focus();
          }
        });
      });

      const closeDestino = () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        header.classList.remove('header-hidden');
        document.body.style.overflow = '';
        setTimeout(() => { if (!modal.classList.contains('active')) modal.style.display = 'none'; }, 400);
      };

      $('#volver-btn')?.addEventListener('click', closeDestino);
      modal.addEventListener('click', e => { if (e.target === modal) closeDestino(); });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeDestino();
      });
    })
    .catch(err => console.error("Error cargando destinos:", err));

  // ============================
  // 7. QR INTERACTIVO WHATSAPP
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
  // 8. FORMULARIO DE CONTACTO
  // FIX: clase corregida de .formulario-contacto a .formulario-final-v3
  // ============================

  $('.formulario-final-v3')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>ENVIANDO...</span>';
    btn.disabled = true;

    emailjs.sendForm('service_v95fe07', 'template_nrxcwun', this)
      .then(() => {
        btn.innerHTML = '<span>✓ ENVIADO</span>';
        this.reset();
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 3000);
      })
      .catch(err => {
        console.error('EmailJS error:', err);
        btn.innerHTML = '<span>ERROR — INTENTÁ DE NUEVO</span>';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 3000);
      });
  });

  // ============================
  // 9. INICIALIZACIÓN
  // ============================

  switchSection(currentId);
  setTimeout(() => {
    const active = $(`nav ul li a[href="#${currentId}"]`);
    if (active) moverIndicador(active);
  }, 500);

  // Hint de scroll en móvil (CORREGIDO: ahora dentro de DOMContentLoaded donde $ está definido)
  const navList = $('nav ul');
  if (navList && window.innerWidth < 768) {
    setTimeout(() => {
      navList.scrollTo({ left: 30, behavior: 'smooth' });
      setTimeout(() => navList.scrollTo({ left: 0, behavior: 'smooth' }), 500);
    }, 1000);
  }

});


// ============================
// 10. MOTOR DE SLIDERS
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

    function actualizarPosicion() {
      track.style.transform = `translateX(-${indiceActual * 100}%)`;
      const todosLosDots = slider.querySelectorAll('.dot, .dot-mini');
      todosLosDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === indiceActual);
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
      dot.classList.add(slider.classList.contains('slider-mini') ? 'dot-mini' : 'dot');
      if (i === 0) dot.classList.add('active');
      dot.onclick = () => { indiceActual = i; actualizarPosicion(); reiniciarAutoplay(); };
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

    window.addEventListener('resize', actualizarPosicion);
    iniciar();
  });
}

document.addEventListener('DOMContentLoaded', inicializarSliders);
