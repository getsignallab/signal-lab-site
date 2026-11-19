/* Yeilis AR Beauty — script compartido por todas las páginas. Cada bloque se activa solo si la página tiene sus elementos. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Al abrir los archivos directamente desde el disco, las carpetas necesitan index.html */
  if (location.protocol === 'file:') $$('a[href]').forEach(a => {
    const m = a.getAttribute('href').match(/^(?![a-z]+:|#)([^#?]*\/)(#.*)?$/i);
    if (m) a.setAttribute('href', m[1] + 'index.html' + (m[2] || ''));
  });

  /* Menú móvil y submenú «Más» */
  const burger = $('#burger'), nav = $('#nav'), more = $('.nav-more');
  const setNav = open => { nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); document.body.style.overflow = open ? 'hidden' : ''; };
  burger.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setNav(false); });
  const setMore = open => { if (!more) return; more.classList.toggle('open', open); $('button', more).setAttribute('aria-expanded', String(open)); };
  if (more) {
    $('button', more).addEventListener('click', () => setMore(!more.classList.contains('open')));
    if (matchMedia('(hover: hover)').matches) { more.addEventListener('mouseenter', () => setMore(true)); more.addEventListener('mouseleave', () => setMore(false)); }
    document.addEventListener('click', e => { if (!more.contains(e.target)) setMore(false); });
    more.addEventListener('focusout', e => { if (!more.contains(e.relatedTarget)) setMore(false); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setNav(false); setMore(false); } });

  /* Aviso */
  const toast = $('#toast'); let tt;
  const say = msg => { if (!toast) return; toast.textContent = msg; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 4200); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-toast]'); if (b) say(b.dataset.toast); });

  /* Resorte del logo, dibujado como trazo */
  $$('[data-coil]').forEach((svg, k) => {
    const w = +svg.dataset.w, h = +svg.dataset.h, turns = +svg.dataset.turns;
    const R = w / 2 - 4, ry = 5, pitch = (h - 16) / turns;
    let back = '', front = '';
    for (let i = 0; i <= turns * 40; i++) {
      const t = i / 40 * Math.PI * 2;
      const x = (w / 2 + R * Math.cos(t)).toFixed(1), y = (8 + pitch * t / (Math.PI * 2) + ry * Math.sin(t)).toFixed(1);
      const seg = Math.sin(t) >= 0 ? 'f' : 'b';
      const prev = i ? (Math.sin((i - 1) / 40 * Math.PI * 2) >= 0 ? 'f' : 'b') : null;
      const cmd = (seg !== prev ? 'M' : 'L') + x + ' ' + y;
      if (seg === 'f') front += cmd; else back += cmd;
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `<defs><linearGradient id="cg${k}" x1="0" x2="1"><stop offset="0" stop-color="#A9757E"/><stop offset=".45" stop-color="#D9B3B9"/><stop offset="1" stop-color="#84555F"/></linearGradient></defs>
      <path d="${back}" stroke="#D4AE9F" stroke-width="3"/><path d="${front}" stroke="url(#cg${k})" stroke-width="4"/>`;
  });

  /* Antes / después */
  $$('.ba-frame').forEach(f => { const i = $('input', f); const upd = () => f.style.setProperty('--pos', i.value + '%'); i.addEventListener('input', upd); upd(); });

  /* Tienda (productos de muestra) */
  const pBox = $('#prods'), fBox = $('#filters');
  if (pBox && fBox) {
    const cats = ['Todo', 'Limpieza', 'Hidratación', 'Definición', 'Tratamiento'];
    const desc = 'Espacio para la descripción del producto y para quién se recomienda.';
    const prods = [
      ['Limpieza', 'Champú de muestra', 's-bottle', 'rose'], ['Hidratación', 'Acondicionador de muestra', 's-pump', 'pearl'],
      ['Hidratación', 'Mascarilla de muestra', 's-jar', 'sage'], ['Definición', 'Crema de peinar de muestra', 's-tube', 'rose'],
      ['Definición', 'Gel definidor de muestra', 's-pump', 'sage'], ['Tratamiento', 'Tratamiento de muestra', 's-jar', 'pearl'],
      ['Tratamiento', 'Aceite capilar de muestra', 's-bottle', 'sage'], ['Limpieza', 'Co-wash de muestra', 's-tube', 'pearl']
    ];
    prods.forEach(([cat, name, shape, tone]) => {
      const a = el('article', 'prod rv'); a.dataset.cat = cat;
      const img = el('div', 'prod-img'); img.setAttribute('role', 'img'); img.setAttribute('aria-label', 'Espacio para la foto del producto');
      const sh = el('div', 'shape ' + shape + ' ' + tone); sh.append(el('i', 'cap2'), el('i', 'body'));
      img.append(el('span', 'tag plain', 'Muestra'), sh);
      const foot = el('div', 'prod-foot'); const add = el('button', 'add', 'Añadir'); add.type = 'button';
      add.dataset.toast = 'Tienda de demostración. La bolsa de compra y el pago se activan cuando Yeilis entregue su catálogo.';
      foot.append(el('span', 'price', 'Precio por definir'), add);
      a.append(img, el('small', '', cat), el('h3', '', name), el('p', '', desc), foot); pBox.append(a);
    });
    cats.forEach((c, i) => {
      const b = el('button', 'chip', c); b.type = 'button'; b.setAttribute('aria-pressed', String(i === 0));
      b.addEventListener('click', () => {
        $$('.chip', fBox).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        $$('.prod', pBox).forEach(p => { p.hidden = c !== 'Todo' && p.dataset.cat !== c; });
      });
      fBox.append(b);
    });
  }

  /* Reserva (demostración) */
  const form = $('#rsv');
  if (form) {
    const groups = [
      ['Para empezar', [['consulta', 'Consulta inicial', 'Gratis']]],
      ['Universo Rizado', [['recuperacion', 'Recuperación del rizo', 'Rizos'], ['corte-rizos', 'Corte para rizos', 'Rizos'], ['definicion', 'Definición del rizo', 'Rizos'], ['tratamiento', 'Tratamiento personalizado', 'Rizos']]],
      ['Cabello Liso', [['keratina', 'Keratina brasileña', 'Liso'], ['botox', 'Botox capilar', 'Liso'], ['alisado', 'Alisado', 'Liso'], ['alineacion', 'Alineación capilar', 'Liso'], ['repolarizacion', 'Repolarización', 'Liso']]],
      ['Rizos y liso', [['color', 'Color, balayage o mechas', 'Ambos'], ['extensiones', 'Extensiones', 'Ambos'], ['trenzas', 'Trenzas', 'Ambos']]]
    ];
    const times = ['11:30 a. m.', '1:00 p. m.', '2:30 p. m.', '4:00 p. m.', '5:30 p. m.', '7:00 p. m.', '8:30 p. m.', '10:00 p. m.'];
    const radio = (name, id, value, checked, build) => {
      const l = el('label', 'opt'); const i = el('input'); i.type = 'radio'; i.name = name; i.id = id; i.value = value; i.checked = checked;
      const s = el('span'); build(s); l.append(i, s); return l;
    };
    /* un enlace como reservar/#svc-keratina llega con ese servicio ya elegido */
    const want = location.hash.slice(1);
    groups.forEach(([title, items]) => {
      const fs = el('fieldset', 'rsv-group'); const lg = el('legend'); lg.append(el('span', '', title)); fs.append(lg);
      const box = el('div', 'opts');
      items.forEach(([slug, name, tag]) => box.append(radio('svc', 'svc-' + slug, name, want ? want === 'svc-' + slug : slug === 'consulta', s => s.append(name, el('small', '', tag)))));
      fs.append(box); $('#svc-groups').append(fs);
    });
    if (!$('input[name="svc"]:checked', form)) $('#svc-consulta').checked = true;
    const fmtDow = new Intl.DateTimeFormat('es', { weekday: 'short' }), fmtMon = new Intl.DateTimeFormat('es', { month: 'short' }),
          fmtFull = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
    for (let d = 1; d <= 14; d++) {
      const dt = new Date(); dt.setDate(dt.getDate() + d);
      $('#day-opts').append(radio('day', 'day-' + d, fmtFull.format(dt), d === 2, s => s.append(el('small', '', fmtDow.format(dt).replace('.', '')), el('b', '', dt.getDate()), el('small', '', fmtMon.format(dt).replace('.', '')))));
    }
    times.forEach((t, i) => $('#time-opts').append(radio('time', 'time-' + i, t, i === 3, s => { s.textContent = t; })));

    const val = k => form.elements[k].value.trim();
    const sync = () => {
      $('#s-svc').textContent = val('svc'); $('#s-day').textContent = val('day'); $('#s-time').textContent = val('time');
      $('#s-dep').textContent = val('svc') === 'Consulta inicial' ? 'Sin costo' : 'Monto por definir';
    };
    form.addEventListener('change', sync); sync();

    let step = 1, reached = 1;
    const panels = $$('.rsv-panel', form), stepLis = $$('#steps li'), prev = $('#prev'), next = $('#next');
    const show = (to, focus = true) => {
      step = to; reached = Math.max(reached, Math.min(to, 3));
      panels.forEach(p => { p.hidden = +p.dataset.step !== step; });
      stepLis.forEach((li, i) => {
        const k = i + 1, b = $('button', li);
        li.classList.toggle('is-on', k === step); li.classList.toggle('is-done', k < step || step === 4);
        b.disabled = step === 4 ? false : k > reached; if (k === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      prev.hidden = step === 1;
      prev.textContent = step === 4 ? 'Empezar de nuevo' : 'Atrás';
      next.firstChild.textContent = step === 3 ? 'Revisar solicitud ' : step === 4 ? 'Volver al inicio ' : 'Continuar ';
      if (focus) { form.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' }); $('h2', panels[step - 1]).focus({ preventScroll: true }); }
    };
    const setErr = (id, msg) => { const i = $('#f-' + id), e = $('#e-' + id); e.textContent = msg || ''; e.hidden = !msg; i.setAttribute('aria-invalid', String(!!msg)); return !msg; };
    const validate = () => {
      const okN = setErr('nombre', val('nombre').length >= 2 ? '' : 'Escribe tu nombre para que Yeilis sepa a quién espera.');
      const okT = setErr('tel', val('tel').replace(/\D/g, '').length >= 7 ? '' : 'Escribe un teléfono válido, con código de área.');
      const okM = setErr('mail', !val('mail') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('mail')) ? '' : 'Revisa el correo: falta algo, por ejemplo la @ o el dominio.');
      if (!okN) $('#f-nombre').focus(); else if (!okT) $('#f-tel').focus(); else if (!okM) $('#f-mail').focus();
      return okN && okT && okM;
    };
    ['nombre', 'tel', 'mail'].forEach(id => $('#f-' + id).addEventListener('input', () => { if ($('#f-' + id).getAttribute('aria-invalid') === 'true') setErr(id, ''); }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (step < 3) return show(step + 1);
      if (step === 3) {
        if (!validate()) return;
        const out = { svc: val('svc'), day: val('day'), time: val('time'), nombre: val('nombre'), contacto: [val('tel'), val('mail')].filter(Boolean).join(' · '), pelo: val('pelo') };
        $$('[data-out]', form).forEach(d => { d.textContent = out[d.dataset.out]; });
        return show(4);
      }
      location.href = $('.brand').getAttribute('href');
    });
    prev.addEventListener('click', () => { if (step === 4) { reached = 1; show(1); } else show(step - 1); });
    $('#steps').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) show(+b.dataset.go); });
    show(1, false);
  }

  /* Aparición al hacer scroll: el estado de reposo es visible */
  if ('IntersectionObserver' in window && !calm) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(n => { if (n.getBoundingClientRect().top > innerHeight) io.observe(n); });
  }
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
