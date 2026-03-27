/**
 * ARCHIVO: script.js
 * FUNCIÓN: Control total de la SPA, Galería, Destinos, Traducciones y UI.
 * ESTADO: 100% Completo y Unificado.
 */

// ============================
// 1. ATAJOS Y UTILIDADES
// ============================
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

document.addEventListener('DOMContentLoaded', () => {

  // --- Referencias Principales ---
  const header = $('header');
  const mainBackground = $('.main-background');
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

  // --- UI: Subtítulos del Header ---
  const headerSubtitle = $('#header-subtitle');
  const subtitleTexts = {
    'destinos': 'Nuestros Destinos',
    'resenas': 'Reseñas de Viajeros',
    'surf-trips': 'Explora un Surf Trip',
    'contacto': 'Contactanos',
  };

  // --- UI: Indicador Nav (La línea que se mueve) ---
  let navIndicator = $('.nav-indicator');
  if (!navIndicator) {
    navIndicator = document.createElement('div');
    navIndicator.classList.add('nav-indicator');
    if ($('nav ul')) $('nav ul').appendChild(navIndicator);
  }

  // ============================
  // 3. LÓGICA DE NAVEGACIÓN (SPA)
  // ============================

  function moverIndicador(elementoActivo) {
    if (!elementoActivo || !navIndicator) return;
    navIndicator.style.width = `${elementoActivo.offsetWidth}px`;
    navIndicator.style.left = `${elementoActivo.offsetLeft}px`;
  }

  function updateHeaderSubtitle(sectionId) {
    if (!headerSubtitle) return;
    if (sectionId === 'home') {
      header.classList.remove('has-subtitle');
      headerSubtitle.innerText = '';
    } else {
      header.classList.add('has-subtitle');
      headerSubtitle.innerText = subtitleTexts[sectionId] || '';
    }
  }

  function switchSection(nextId) {
    if (isAnimating || !sectionById[nextId]) return;
    isAnimating = true;

    sections.forEach(s => s.classList.remove('active', 'prev', 'next'));
    
    sectionOrder.forEach((id, i) => {
      const sec = sectionById[id];
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

    updateHeaderSubtitle(nextId);
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
  // 4. SISTEMA DE TRADUCCIONES
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
      
      navIndicator.style.transition = 'none'; // Sin animación al arrancar
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

    // 1. Matamos la animación temporalmente para que el cambio sea invisible
    navIndicator.style.transition = 'none';

    // 2. Cambiamos los textos
    applyTranslations();

    // 3. Forzamos a que la línea tome el nuevo ancho del link activo
    const activo = $('nav ul li a.active');
    if (activo) {
        moverIndicador(activo);
    }

    // 4. Forzamos al navegador a procesar el cambio y devolvemos la animación 
    // para cuando el usuario haga clicks normales en el menú
    void navIndicator.offsetWidth; // Truco técnico para "resetear" el renderizado
    navIndicator.style.transition = ''; 
  }));



  // ============================
  // 5. CARRUSEL DE RESEÑAS (FIXED)
  // ============================

  const carouselWrapper = $('#resenasCarousel');
  if (carouselWrapper) {
    const cards = Array.from(carouselWrapper.children);
    const track = document.createElement('div');
    
    // Estilos forzados por JS para que no se rompa el diseño
    track.style.display = 'flex';
    track.style.gap = '20px';
    track.style.width = 'max-content';
    track.style.cursor = 'grab';
    
    // Clonamos las tarjetas para el efecto infinito
    cards.forEach(c => track.appendChild(c.cloneNode(true)));
    cards.forEach(c => track.appendChild(c.cloneNode(true)));
    
    carouselWrapper.style.overflow = 'hidden';
    carouselWrapper.innerHTML = '';
    carouselWrapper.appendChild(track);

    let posX = 0, speed = 0.7, isDragging = false, startX = 0, scrollStart = 0;

    function animateCarousel() {
      if (!isDragging) {
        posX -= speed;
        // Si llegamos a la mitad, reseteamos a 0 para el loop infinito
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
      
      // Control de bordes para el drag infinito
      if (-posX >= track.scrollWidth / 2) posX += track.scrollWidth / 2;
      if (posX > 0) posX -= track.scrollWidth / 2;
      
      track.style.transform = `translateX(${posX}px)`;
    });

    const stopDragging = () => { 
      isDragging = false; 
      track.style.cursor = 'grab'; 
    };
    track.addEventListener('pointerup', stopDragging);
    track.addEventListener('pointerleave', stopDragging);
  }

  // ============================
  // 6. LIGHTBOX: GALERÍA DE SURF
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
      lbIdx = dir === 'next' ? (lbIdx + 1) % surfImgs.length : (lbIdx - 1 + surfImgs.length) % surfImgs.length;
      lbImg.src = surfImgs[lbIdx].src;
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
    header.classList.remove('header-hidden');
    document.body.style.overflow = '';
    setTimeout(() => { if(lbImg) lbImg.src = ""; }, 300);
  };

  surfImgs.forEach((img, idx) => img.addEventListener('click', () => {
    lbIdx = idx;
    lbImg.src = img.src;
    lb.classList.add('active');
    header.classList.add('header-hidden'); 
    document.body.style.overflow = 'hidden'; 
    lbImg.style.transform = 'scale(1) translateX(0)';
    lbImg.style.opacity = '1';
  }));

  $('#next-img')?.addEventListener('click', e => { e.stopPropagation(); moveLb('next'); });
  $('#prev-img')?.addEventListener('click', e => { e.stopPropagation(); moveLb('prev'); });
  $('.close-lightbox')?.addEventListener('click', closeLb);
  lb?.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });

  // Gestos táctiles para el lightbox
  lb?.addEventListener('touchstart', e => tStartX = e.changedTouches[0].screenX, {passive: true});
  lb?.addEventListener('touchend', e => {
    const d = tStartX - e.changedTouches[0].screenX;
    if (Math.abs(d) > 60) moveLb(d > 0 ? 'next' : 'prev');
  }, {passive: true});

  // ============================
  // 7. MODAL DESTINOS: LOGICA Y ANIMACIÓN
  // ============================

  fetch('destinos.json')
    .then(res => res.json())
    .then(data => {
      destinosData = data;
      const modal = $('#destino-detalle'), detalleInner = $('.detalle-inner');
      const tabButtons = $$('.tab-btn'), tabContents = $$('.tab-content');

      function updateModalContent(destinoInfo) {
        tabContents.forEach(tc => { tc.classList.remove('active'); tc.style.opacity = "0"; });
        tabButtons.forEach(tb => tb.classList.remove('active'));

        ['hospedaje', 'tours', 'transfers'].forEach((tabId, i) => {
          const el = document.getElementById(tabId);
          if (el && destinoInfo[tabId]) {
            el.innerHTML = destinoInfo[tabId][currentLang] || '';
            if (i === 0) {
              tabButtons[0].classList.add('active');
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
            header.classList.add('header-hidden');
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => modal.classList.add('active'));
          }
        });
      });

      const closeDestino = () => {
        modal.classList.remove('active');
        header.classList.remove('header-hidden');
        document.body.style.overflow = '';
        setTimeout(() => { if(!modal.classList.contains('active')) modal.style.display = 'none'; }, 400);
      };

      $('#volver-btn')?.addEventListener('click', closeDestino);
      modal.addEventListener('click', e => { if (e.target === modal) closeDestino(); });
    })
    .catch(err => console.error("Error cargando destinos:", err));

  // ============================
  // 8. ACCORDION Y FORMULARIOS
  // ============================

  $$('.destino').forEach(dest => {
    const content = dest.querySelector('.contenido');
    if (!content) return;
    dest.addEventListener('click', () => {
      const isOpen = content.offsetHeight > 0;
      $$('.destino .contenido').forEach(c => { c.style.height = '0px'; c.style.opacity = '0'; });
      if (!isOpen) {
        content.style.height = content.scrollHeight + 'px';
        content.style.opacity = '1';
      }
    });
  });

  if (window.emailjs) {
    emailjs.init('Cq9PacH-N_N_hZ344');
    $('.formulario-contacto')?.addEventListener('submit', function(e) {
      e.preventDefault();
      emailjs.sendForm('service_v95fe07', 'template_nrxcwun', this)
        .then(() => { alert('Mensaje enviado 😊'); this.reset(); })
        .catch(err => alert('Error al enviar ❌'));
    });
  }

  // ============================
  // FIX: LÓGICA QR INTERACTIVO WPP
  // ============================
  
  // Usamos tus atajos utilitarios '$'
  const qrContainer = $('.qr-prolijo');
  const qrImage = $('.qr-prolijo img');

  if (qrContainer && qrImage) {
    // Escuchamos el click (o tap en móviles) directamente en la imagen
    qrImage.addEventListener('click', (e) => {
      // Evitamos que el click se propague a otros elementos
      e.stopPropagation(); 
      
      // 'toggle' hace la magia: si no tiene la clase, se la pone (agranda); 
      // si ya la tiene, se la saca (achica).
      qrContainer.classList.toggle('qr-active');
    });

    // OPCIONAL: Si tocan en cualquier otro lado de la pantalla, 
    // achicamos el QR por las dudas.
    document.addEventListener('click', () => {
      qrContainer.classList.remove('qr-active');
    });
  }


  // ============================
  // 9. INICIALIZACIÓN FINAL
  // ============================
  
  // Lazy Load mejorado
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if(img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.add('loaded');
            lazyObserver.unobserve(img);
        }
      }
    });
  });
  $$('img.lazy').forEach(img => lazyObserver.observe(img));

  // Primer arranque
  switchSection(currentId);
  setTimeout(() => {
    const active = $(`nav ul li a[href="#${currentId}"]`);
    if(active) moverIndicador(active);
  }, 500);

});


/* ============================
   10. MOTOR DE SLIDERS (UNIFICADO & TOUCH)
   ============================ */
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
            // Usamos porcentaje puro para evitar errores de redondeo en iPad
            track.style.transform = `translateX(-${indiceActual * 100}%)`;
            
            const todosLosDots = slider.querySelectorAll('.dot, .dot-mini');
            todosLosDots.forEach((dot, i) => {
                dot.classList.toggle('active', i === indiceActual);
            });
        }

        // --- LÓGICA DE TOQUE (MANUAL) ---
        slider.addEventListener('touchstart', e => {
            detener();
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        slider.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0 && indiceActual < slides.length - 1) indiceActual++;
                else if (diff < 0 && indiceActual > 0) indiceActual--;
            }
            actualizarPosicion();
            iniciar();
        }, {passive: true});

        // --- DOTS Y AUTOPLAY ---
        dotContainer.innerHTML = '';
        slides.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.classList.add(slider.classList.contains('slider-mini') ? 'dot-mini' : 'dot');
            if (i === 0) dot.classList.add('active');
            dot.onclick = () => {
                indiceActual = i;
                actualizarPosicion();
                reiniciarAutoplay();
            };
            dotContainer.appendChild(dot);
        });

        const iniciar = () => { clearInterval(intervalo); intervalo = setInterval(() => {
            indiceActual = (indiceActual + 1) % slides.length;
            actualizarPosicion();
        }, tiempo); };
        const detener = () => clearInterval(intervalo);
        const reiniciarAutoplay = () => { detener(); iniciar(); };

        window.addEventListener('resize', actualizarPosicion);
        iniciar();
    });
}

function actualizarSubrayado() {
    // Buscamos cuál es el link que está activo en este momento
    const linkActivo = document.querySelector('nav ul li a.active'); // Fijate si usás la clase '.active' u otra
    const indicador = document.querySelector('.nav-indicator');

    if (linkActivo && indicador) {
        // Le damos el nuevo ancho y la nueva posición
        indicador.style.width = linkActivo.offsetWidth + 'px';
        indicador.style.left = linkActivo.offsetLeft + 'px';
    }
}

// Hace un pequeño "baile" al cargar para mostrar que hay más menú
const navList = $('nav ul');
if(navList && window.innerWidth < 768) {
    setTimeout(() => {
        navList.scrollTo({ left: 30, behavior: 'smooth' });
        setTimeout(() => navList.scrollTo({ left: 0, behavior: 'smooth' }), 500);
    }, 1000);
}



// Arranca cuando el DOM está listo
document.addEventListener('DOMContentLoaded', inicializarSliders);
