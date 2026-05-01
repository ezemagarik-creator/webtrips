/**
 * script.js — Ezequiel Magarik Portfolio
 */

/* ============================
   EMAILJS INIT
   (movido desde el HTML inline)
   ============================ */
emailjs.init({ publicKey: "Cq9PacH-N_N_hZ344" });

/* ============================
   HELPERS
   ============================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function getFocusable(el) {
  return $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', el)
    .filter(e => !e.closest('[aria-hidden="true"]'));
}
function trapFocus(modal, e) {
  const els = getFocusable(modal);
  if (!els.length) return;
  if (e.shiftKey) { if (document.activeElement === els[0]) { e.preventDefault(); els[els.length-1].focus(); } }
  else            { if (document.activeElement === els[els.length-1]) { e.preventDefault(); els[0].focus(); } }
}

/* Respeta prefers-reduced-motion para autoplay de carruseles y slider */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================
   SERVICIOS DATA
   ============================ */
const SERVICIOS = {
  landing:     { titulo:'Landing Pages',        items:['Diseño y desarrollo desde cero, sin plantillas','Optimizada para conversión y velocidad de carga','Responsive: perfecta en mobile, tablet y desktop','Integración de formularios con EmailJS o WhatsApp','Animaciones y micro-interacciones en CSS/JS puro','Entrega en 5–10 días hábiles'] },
  sitios:      { titulo:'Sitios Web Completos', items:['Arquitectura SPA sin frameworks','Navegación animada con transiciones fluidas','Galería, carruseles, lightbox y modales personalizados','Sistema i18n con JSON','Soporte post-entrega incluido','Código limpio y documentado'] },
  animaciones: { titulo:'Animaciones & UX',     items:['Carruseles auto-play con drag táctil y swipe','Lightbox con navegación por teclado','Modales con focus trap y transiciones suaves','Indicadores de navegación animados','Efectos scroll-triggered','Micro-interacciones que mejoran la experiencia'] },
  optimizacion:{ titulo:'Optimización',         items:['Auditoría Lighthouse (Performance, SEO, A11y)','Lazy loading de imágenes y recursos','Reducción de CLS, LCP y FID','Código ARIA semántico y foco de teclado','Minificación y optimización de assets','Informe detallado con métricas antes/después'] }
};

document.addEventListener('DOMContentLoaded', () => {

  /* ---- refs ---- */
  const header   = $('header');
  const sections = $$('.section');
  const navLinks = $$('nav a');
  /* data-section sigue en los botones CTA del hero; nav links usan href */
  const spaLinks = $$('[data-section], nav a[href^="#"]');
  const byId     = Object.fromEntries(sections.map(s => [s.id, s]));
  let   current  = location.hash.replace('#','') || 'home';

  /* ---- nav indicator ---- */
  const ind = document.createElement('div');
  ind.className = 'nav-indicator';
  $('nav ul')?.appendChild(ind);

  function moveInd(a) {
    if (!a) return;
    ind.style.width = a.offsetWidth + 'px';
    ind.style.left  = a.offsetLeft  + 'px';
  }

  /* ---- SPA switch ---- */
  function go(id) {
    if (!byId[id]) return;
    sections.forEach(s => s.classList.remove('active'));
    byId[id].classList.add('active');
    navLinks.forEach(a => {
      /* deriva el id desde el href en lugar de dataset.section */
      const t = a.getAttribute('href').replace('#','');
      a.classList.toggle('active', t === id);
      if (t === id) moveInd(a);
    });
    current = id;
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  /* ---- click handlers ---- */
  /* Evita listeners duplicados con un Set de elementos ya procesados */
  const registered = new WeakSet();
  spaLinks.forEach(el => {
    if (registered.has(el)) return;
    registered.add(el);
    el.addEventListener('click', e => {
      const raw = el.dataset.section || el.getAttribute('href') || '';
      const id  = raw.replace('#','');
      if (!id || !byId[id]) return;
      e.preventDefault();
      history.pushState({ section:id }, '', '#' + id);
      go(id);
    });
  });

  window.addEventListener('popstate', e => {
    go(e.state?.section || location.hash.replace('#','') || 'home');
  });

  /* ---- email obfuscado ---- */
  const mail = ['ezemagarik','gmail.com'].join('@');
  $$('.js-mailto-btn').forEach(el => { el.href = 'mailto:' + mail; });

  /* ---- init ---- */
  go(current);
  /* replaceState para que el Back del browser tenga estado desde el primer render */
  history.replaceState({ section: current }, '', '#' + current);
  /* moveInd con rAF en lugar del setTimeout(300) — misma solución, más limpio */
  requestAnimationFrame(() => moveInd($(`nav a[href="#${current}"]`)));

  /* mobile nav hint */
  const ul = $('nav ul');
  if (ul && window.innerWidth < 768) {
    setTimeout(() => { ul.scrollTo({left:30,behavior:'smooth'}); setTimeout(()=>ul.scrollTo({left:0,behavior:'smooth'}),500); }, 1000);
  }

  /* ============================
     CAROUSEL (frases / proceso)
     ============================ */
  const cw = $('#resenasCarousel');
  if (cw) {
    const cards = Array.from(cw.children);
    const track = document.createElement('div');
    track.style.cssText = 'display:flex;gap:20px;width:max-content;cursor:grab;';
    [cards, cards].forEach(set => set.forEach(c => track.appendChild(c.cloneNode(true))));
    cw.style.overflow = 'hidden';
    cw.innerHTML = '';
    cw.appendChild(track);

    let x=0, dragging=false, startX=0, startScroll=0, dragH=null, dragStartY=0;
    let carouselVisible=true, tabVisible=!document.hidden;

    new IntersectionObserver(([e]) => carouselVisible = e.isIntersecting, {threshold:.1}).observe(cw);

    /* pausa cuando la pestaña está oculta → ahorra CPU */
    document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; });

    if (!reducedMotion) {
      (function tick() {
        if (carouselVisible && !dragging && tabVisible) {
          x -= 0.6;
          if (-x >= track.scrollWidth / 2) x = 0;
          track.style.transform = `translateX(${x}px)`;
        }
        requestAnimationFrame(tick);
      })();
    }

    track.addEventListener('pointerdown', e => {
      dragging=true; dragH=null; startX=e.clientX; dragStartY=e.clientY; startScroll=x;
      track.setPointerCapture(e.pointerId); track.style.cursor='grabbing';
    });
    track.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx=e.clientX-startX, dy=e.clientY-dragStartY;
      if (dragH===null) dragH = Math.abs(dx)>Math.abs(dy);
      if (!dragH) return;
      e.preventDefault();
      x = startScroll+dx;
      const h=track.scrollWidth/2;
      if (-x>=h) x+=h; if (x>0) x-=h;
      track.style.transform=`translateX(${x}px)`;
    },{passive:false});
    const end = () => { dragging=false; dragH=null; track.style.cursor='grab'; };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointerleave', end);
  }

  /* ============================
     SLIDER ENGINE
     ============================ */
  $$('.slider-wrapper').forEach(wrap => {
    const track  = wrap.querySelector('.slider-track');
    const slides = wrap.querySelectorAll('.slide');
    const dotsEl = wrap.querySelector('.slider-dots');
    if (!track || !slides.length || !dotsEl) return;

    let idx=0, timer;

    function render() {
      track.style.transform = `translateX(-${idx*100}%)`;
      wrap.querySelectorAll('.dot').forEach((d,i) => {
        d.classList.toggle('active', i===idx);
        d.setAttribute('aria-selected', String(i===idx));
      });
    }

    slides.forEach((_,i) => {
      const d = document.createElement('div');
      d.className='dot'; d.setAttribute('role','tab');
      d.setAttribute('aria-label',`Slide ${i+1} de ${slides.length}`);
      d.setAttribute('aria-selected', i===0?'true':'false');
      d.setAttribute('tabindex','0');
      if (i===0) d.classList.add('active');
      const jump = () => { idx=i; render(); restart(); };
      d.addEventListener('click', jump);
      d.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') jump(); });
      dotsEl.appendChild(d);
    });

    const play    = () => { clearInterval(timer); timer = setInterval(() => { idx=(idx+1)%slides.length; render(); }, 3800); };
    const stop    = () => clearInterval(timer);
    const restart = () => { stop(); if(!reducedMotion) play(); };

    /* pausa automática cuando el slider está fuera del viewport */
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { if (!reducedMotion) play(); }
      else stop();
    }, { threshold: 0.1 }).observe(wrap);

    /* navegación por teclado: ArrowLeft / ArrowRight */
    wrap.setAttribute('tabindex', '0');
    wrap.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { idx = Math.max(0, idx - 1); render(); restart(); }
      if (e.key === 'ArrowRight') { idx = Math.min(slides.length - 1, idx + 1); render(); restart(); }
    });

    /* swipe táctil */
    let tx=0;
    wrap.addEventListener('touchstart', e => { stop(); tx=e.changedTouches[0].screenX; },{passive:true});
    wrap.addEventListener('touchend',   e => {
      const d=tx-e.changedTouches[0].screenX;
      if (Math.abs(d)>50) { if(d>0&&idx<slides.length-1)idx++; else if(d<0&&idx>0)idx--; }
      render(); if (!reducedMotion) play();
    },{passive:true});

    let rTimer;
    window.addEventListener('resize', () => { clearTimeout(rTimer); rTimer=setTimeout(render,100); });

    /* autoplay solo si el usuario no pidió menos movimiento */
    if (!reducedMotion) play();
  });

  /* ============================
     MODAL
     ============================ */
  const modal      = $('#servicio-modal');
  const modalTitle = $('#modal-titulo');
  const modalList  = $('#modal-list');
  const modalClose = $('#modal-close');

  function openModal(key) {
    const d = SERVICIOS[key];
    if (!d || !modal) return;
    modalTitle.textContent = d.titulo;
    modalList.innerHTML = d.items.map(i=>`<li>${i}</li>`).join('');
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('active');
    header.classList.add('header-hidden');
    document.body.style.overflow='hidden';
    setTimeout(()=>modalClose?.focus(),100);
  }
  function closeModal() {
    modal?.classList.remove('active');
    modal?.setAttribute('aria-hidden','true');
    header.classList.remove('header-hidden');
    document.body.style.overflow='';
  }

  $$('.servicio-card').forEach(card => {
    const btn = card.querySelector('.btn-glass');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); openModal(card.dataset.servicio); });
  });
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if(e.target===modal) closeModal(); });
  modal?.addEventListener('keydown', e => {
    if (e.key==='Escape') closeModal();
    if (e.key==='Tab') trapFocus(modal,e);
  });

  /* ============================
     QR TOGGLE
     ============================ */
  const qr = $('.qr-prolijo');
  if (qr) {
    qr.querySelector('img')?.addEventListener('click', e => { e.stopPropagation(); qr.classList.toggle('qr-active'); });
    document.addEventListener('click', () => qr.classList.remove('qr-active'));
  }

  /* ============================
     VALIDACIÓN DE FORMULARIO
     ============================ */
  function validateForm(form) {
    /* limpia errores previos */
    form.querySelectorAll('.f-error').forEach(e => e.remove());
    let ok = true;

    form.querySelectorAll('[required]').forEach(field => {
      const empty    = !field.value.trim();
      const badEmail = field.type === 'email' && field.value.trim() &&
                       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);

      if (empty || badEmail) {
        const msg = document.createElement('span');
        msg.className   = 'f-error';
        msg.textContent = badEmail ? 'Email inválido' : 'Campo requerido';
        field.closest('.f-group').appendChild(msg);
        ok = false;
      }
    });

    return ok;
  }

  /* ============================
     CONTACT FORM
     ============================ */
  $('.contacto-form')?.addEventListener('submit', function(e) {
    e.preventDefault();

    /* honeypot check */
    const honey = this.querySelector('[name="_honey"]');
    if (honey?.value) return;

    /* validación cliente */
    if (!validateForm(this)) return;

    const btn  = this.querySelector('.btn-submit');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>ENVIANDO...</span>'; btn.disabled=true;

    emailjs.sendForm('service_v95fe07','template_nrxcwun',this)
      .then(()  => {
        btn.innerHTML='<span>✓ ENVIADO</span>';
        this.reset();
        setTimeout(()=>{ btn.innerHTML=orig; btn.disabled=false; }, 3000);
      })
      .catch(err => {
        console.error(err);
        btn.innerHTML='<span>ERROR — INTENTÁ DE NUEVO</span>';
        setTimeout(()=>{ btn.innerHTML=orig; btn.disabled=false; }, 3000);
      });
  });

}); // end DOMContentLoaded
