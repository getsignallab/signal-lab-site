// Auditoría funcional completa de Yeilis AR Beauty sobre un servidor web local.
// Uso: node qa.js http://localhost:8765/yeilis-ar-beauty/ [static|flows|all]
const { chromium } = require('playwright');
const base = process.argv[2], mode = process.argv[3] || 'all';
const PAGES = [['', 'Inicio'], ['servicios/', 'Servicios'], ['universo-rizado/', 'Universo Rizado'], ['galeria/', 'Galería'], ['sobre-yeilis/', 'Sobre Yeilis'], ['academia/', 'Academia'], ['tienda/', 'Tienda'], ['contacto/', 'Contacto'], ['reservar/', 'Reservar'], ['pendientes/', 'Pendientes']];
const WIDTHS = [[320, 640], [375, 760], [390, 800], [430, 900], [768, 1024], [1024, 768], [1440, 900]];
let pass = 0, fail = 0; const fails = [];
const ok = (name, cond, extra = '') => { if (cond) pass++; else { fail++; fails.push(name + (extra ? '  ' + extra : '')); console.log('  FAIL ' + name + (extra ? '  ' + extra : '')); } };
const sec = t => console.log('\n## ' + t);

(async () => {
  const b = await chromium.launch();
  const ext = new Set(), reqFail = [], posts = [];
  const newPage = async (w, h, opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1025, isMobile: w < 800, ...opts });
    const p = await ctx.newPage(); p._errs = [];
    p.on('console', m => { if (m.type() === 'error') p._errs.push(m.text()); });
    p.on('pageerror', e => p._errs.push('pageerror: ' + e));
    p.on('request', r => { const u = new URL(r.url()); if (!r.url().startsWith(base) && u.protocol.startsWith('http')) ext.add(u.host); if (r.method() !== 'GET') posts.push(r.method() + ' ' + r.url()); });
    p.on('requestfailed', r => { if (r.url().startsWith(base)) reqFail.push(r.url()); });
    p.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) reqFail.push(r.status() + ' ' + r.url()); });
    return p;
  };
  const settle = async p => { await p.waitForLoadState('load'); await p.waitForTimeout(450); };
  const y = p => p.evaluate(() => Math.round(scrollY));
  const bottom = async p => { await p.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await p.waitForTimeout(120); };

  // ------------------------------------------------------------------ 1. comprobaciones estáticas por página y ancho
  if (mode !== 'flows') {
    sec('Páginas × anchos: carga, errores, desbordes, imágenes, estructura, accesibilidad');
    const linkStatus = new Map();
    for (const [w, h] of WIDTHS) {
      const p = await newPage(w, h, { reducedMotion: 'reduce' });
      for (const [pg, name] of PAGES) {
        const resp = await p.goto(base + pg); await p.waitForTimeout(250);
        await p.evaluate(async () => { for (let s = 0; s < document.body.scrollHeight; s += 700) { scrollTo(0, s); await new Promise(r => setTimeout(r, 25)); } scrollTo(0, 0); });
        await p.waitForTimeout(200);
        const r = await p.evaluate(() => {
          const W = document.documentElement.clientWidth;
          const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
          const lab = e => (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : e.tagName.toLowerCase()) + (e.id ? '#' + e.id : '');
          const uniq = a => [...new Set(a)];
          const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map(e => +e.tagName[1]);
          const skips = []; hs.forEach((l, i) => { if (i && l - hs[i - 1] > 1) skips.push(hs[i - 1] + '>' + l); });
          const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
          const name = e => (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || (e.querySelector('img') && e.querySelector('img').alt) || '').trim();
          return {
            sw: document.documentElement.scrollWidth,
            ov: uniq([...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1) && vis(e) && !e.closest('.days,.nav,.skip') && !e.matches('.hero-art'); }).map(lab)).slice(0, 5),
            imgs: [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.getAttribute('src')),
            noAlt: [...document.images].filter(i => !i.hasAttribute('alt') || (!i.alt.trim() && !i.closest('[aria-hidden]'))).length,
            h1: document.querySelectorAll('h1').length, skips: uniq(skips),
            dupIds: uniq(ids.filter((v, i) => ids.indexOf(v) !== i)),
            lang: document.documentElement.lang, title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '',
            main: document.querySelectorAll('main').length, navLabel: !!document.querySelector('nav[aria-label]'),
            unlabeled: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e => !(e.labels && e.labels.length) && !e.getAttribute('aria-label')).map(lab),
            unnamed: [...document.querySelectorAll('a[href],button')].filter(e => !name(e)).map(lab),
            tap: uniq([...document.querySelectorAll('a,button,select,input:not([type=radio]):not([type=range]),textarea,.opt span')].filter(e => vis(e) && !e.closest('.nav,.skip') && !e.closest('p,.legal,.concept')).filter(e => { const r = e.getBoundingClientRect(); return r.height < 43.5 || r.width < 40; }).map(e => lab(e) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))).slice(0, 6),
            tiny: uniq([...document.querySelectorAll('body *')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && !e.closest('.nav')).map(e => lab(e) + ' ' + parseFloat(getComputedStyle(e).fontSize))).slice(0, 6),
            clipped: uniq([...document.querySelectorAll('h1,h2,h3,.btn,.tag,.todo,.chip,.more')].filter(e => vis(e) && !e.matches('.sr-only') && e.scrollWidth > e.clientWidth + 2).map(lab)).slice(0, 5),
            links: uniq([...document.querySelectorAll('a[href]')].map(a => a.href)),
            contact: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /^(tel:|mailto:|sms:)|wa\.me|whatsapp|instagram|facebook|tiktok|maps\./i.test(h)),
            forms: [...document.querySelectorAll('form')].map(f => f.id + '|' + (f.getAttribute('action') || '') + '|' + (f.getAttribute('method') || '')),
            arrows: (document.body.innerText.match(/[→↗]/g) || []).length
          };
        });
        const t = `${w}px ${name}:`;
        ok(`${t} carga con estado 200`, resp.status() === 200, String(resp.status()));
        ok(`${t} sin errores de consola`, p._errs.length === 0, p._errs.splice(0).join(' | '));
        ok(`${t} sin desplazamiento horizontal`, r.sw <= w, `${r.sw} ${r.ov}`);
        ok(`${t} todas las imágenes cargan`, r.imgs.length === 0, r.imgs.join(','));
        ok(`${t} objetivos táctiles ≥ 44 px`, w > 1024 || r.tap.length === 0, r.tap.join(', '));
        ok(`${t} sin texto menor de 12 px`, r.tiny.length === 0, r.tiny.join(', '));
        ok(`${t} sin texto recortado`, r.clipped.length === 0, r.clipped.join(','));
        if (w === 1440) {
          ok(`${name}: un solo h1`, r.h1 === 1, String(r.h1));
          ok(`${name}: niveles de encabezado sin saltos`, r.skips.length === 0, r.skips.join(','));
          ok(`${name}: sin id duplicados`, r.dupIds.length === 0, r.dupIds.join(','));
          ok(`${name}: idioma, título y descripción`, r.lang === 'es' && r.title.length > 5 && r.desc.length > 20, `${r.lang}|${r.title}`);
          ok(`${name}: un <main> y navegación etiquetada`, r.main === 1 && r.navLabel);
          ok(`${name}: imágenes con texto alternativo`, r.noAlt === 0, String(r.noAlt));
          ok(`${name}: campos con etiqueta`, r.unlabeled.length === 0, r.unlabeled.join(','));
          ok(`${name}: enlaces y botones con nombre`, r.unnamed.length === 0, r.unnamed.join(','));
          ok(`${name}: sin enlaces de contacto inventados (tel, correo, redes)`, r.contact.length === 0, r.contact.join(','));
          ok(`${name}: ningún formulario envía a un servidor`, r.forms.every(f => /^rsv\|\|$/.test(f)), r.forms.join(','));
          ok(`${name}: sin flechas decorativas`, r.arrows === 0, String(r.arrows));
          for (const l of r.links) {
            const u = l.split('#')[0]; if (!u.startsWith(base)) { ok(`${name}: sin enlaces externos inesperados`, false, l); continue; }
            if (!linkStatus.has(u)) linkStatus.set(u, (await p.request.get(u)).status());
            ok(`${name}: enlace ${l.replace(base, '/')} responde`, linkStatus.get(u) === 200, String(linkStatus.get(u)));
            const hash = l.split('#')[1];
            if (hash && !hash.startsWith('svc-')) { const html = await (await p.request.get(u)).text(); ok(`${name}: ancla #${hash} existe`, html.includes(`id="${hash}"`)); }
          }
          const rsvLinks = await p.evaluate(() => [...document.querySelectorAll('a')].filter(a => /reserv/i.test(a.textContent)).map(a => a.getAttribute('href')));
          ok(`${name}: todos los «Reservar…» abren la página de reserva`, rsvLinks.length > 0 && rsvLinks.every(h => /(^|\/)reservar\/(#svc-[\w-]+)?$|^\.\/$/.test(h)), rsvLinks.join(' '));
          // recarga y dirección sin barra final
          await p.reload(); await p.waitForTimeout(200); ok(`${name}: recargar mantiene la página`, (await p.title()) === r.title);
          if (pg) { await p.goto(base + pg.slice(0, -1)); await p.waitForTimeout(300); ok(`${name}: la dirección sin barra final también funciona`, p.url() === base + pg && (await p.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(255, 248, 245)', p.url()); }
        }
      }
      await p.context().close();
    }
  }

  // ------------------------------------------------------------------ 2. flujos de interacción
  if (mode !== 'static') {
    for (const [w, h, dev] of [[1440, 900, 'escritorio'], [768, 1024, 'tablet'], [375, 760, 'móvil']]) {
      const mobileNav = w <= 1200;
      const p = await newPage(w, h);
      const openMenu = async () => { if (mobileNav) { await p.click('#burger'); await p.waitForTimeout(350); } };
      const navTo = async slug => {
        if (slug === 'reservar') { if (mobileNav) { await openMenu(); await p.click('.nav .nav-cta'); } else await p.click('.head-cta'); return; }
        await openMenu();
        if (!mobileNav && ['academia', 'tienda', 'contacto'].includes(slug)) { await p.hover('.nav-more'); await p.waitForTimeout(300); }
        await p.locator(slug === 'home' ? '.nav a:has-text("Inicio")' : `.nav a[href*="${slug}/"]`).first().click();
      };
      sec(`Navegación (${dev}, ${w}px)`);
      await p.goto(base); await settle(p);
      for (const [pg, name] of [...PAGES.slice(1, 9), PAGES[0]]) {
        await bottom(p); const from = await y(p);
        await navTo(pg ? pg.slice(0, -1) : 'home'); await settle(p);
        ok(`${dev}: menú → ${name} abre la página correcta, arriba`, p.url() === base + pg && (await y(p)) === 0 && from > 0, `${p.url()} y=${await y(p)}`);
        if (mobileNav) ok(`${dev}: el menú queda cerrado y la página desbloqueada en ${name}`, await p.evaluate(() => !document.querySelector('#nav').classList.contains('open') && document.body.style.overflow === '' && !document.querySelector('main').inert));
      }
      await navTo('servicios'); await settle(p); await bottom(p); await navTo('galeria'); await settle(p); await bottom(p); await navTo('servicios'); await settle(p);
      ok(`${dev}: bajar en A, ir a B y volver a A empieza arriba`, (await y(p)) === 0);
      await bottom(p); await p.locator('.foot a[href*="sobre-yeilis/"]').click(); await settle(p); ok(`${dev}: enlace del pie abre Sobre Yeilis arriba`, p.url().endsWith('sobre-yeilis/') && (await y(p)) === 0);
      await p.locator('.brand').click(); await settle(p); ok(`${dev}: el logo vuelve a Inicio`, p.url() === base);
      await p.locator('.fin .btn-rose').scrollIntoViewIfNeeded(); await p.locator('.fin .btn-rose').click(); await settle(p); ok(`${dev}: botón final «Reservar cita» abre Reservar arriba`, p.url().endsWith('reservar/') && (await y(p)) === 0);
      await p.goto(base + 'galeria/'); await settle(p); await bottom(p); await p.evaluate(() => { window.__mark = 1; }); await navTo('galeria'); await p.waitForTimeout(1300);
      ok(`${dev}: el enlace de la página actual sube sin recargar`, (await y(p)) === 0 && (await p.evaluate(() => window.__mark)) === 1);
      if (mobileNav) ok(`${dev}: …y cierra el menú`, await p.evaluate(() => !document.querySelector('#nav').classList.contains('open')));
      await p.goto(base); await settle(p); await p.locator('a.cat[href$="servicios/#liso"]').scrollIntoViewIfNeeded(); await p.locator('a.cat[href$="servicios/#liso"]').click(); await settle(p); await p.waitForTimeout(500);
      let top = await p.evaluate(() => Math.round(document.getElementById('liso').getBoundingClientRect().top));
      ok(`${dev}: enlace a sección (Servicios → Cabello liso) llega a la sección`, top >= 0 && top < 150, `a ${top}px`);
      await p.goBack(); await settle(p); ok(`${dev}: Atrás vuelve a Inicio, arriba`, p.url() === base && (await y(p)) === 0);
      await p.goForward(); await settle(p); await p.waitForTimeout(400); top = await p.evaluate(() => Math.round(document.getElementById('liso').getBoundingClientRect().top));
      ok(`${dev}: Adelante vuelve a la sección`, top >= 0 && top < 150, `a ${top}px`);
      await p.goto(base + 'tienda/'); await settle(p); await bottom(p); await navTo('contacto'); await settle(p); await bottom(p); await p.goBack(); await settle(p);
      ok(`${dev}: Atrás tras bajar en dos páginas empieza arriba`, p.url().endsWith('tienda/') && (await y(p)) === 0);
      await p.goForward(); await settle(p); ok(`${dev}: Adelante empieza arriba`, p.url().endsWith('contacto/') && (await y(p)) === 0);

      if (!mobileNav) {
        sec(`Menú desplegable «Más» (${dev})`);
        await p.goto(base); await settle(p);
        const open = () => p.evaluate(() => document.querySelector('.nav-more').classList.contains('open') && getComputedStyle(document.querySelector('.nav-sub')).visibility === 'visible');
        await p.hover('.nav-more'); await p.waitForTimeout(350); ok('se abre al pasar el cursor', await open());
        await p.mouse.move(300, 500); await p.waitForTimeout(350); ok('se cierra al salir', !(await open()));
        await p.click('.nav-more > button'); await p.waitForTimeout(100); await p.mouse.move(300, 500);
        await p.focus('.nav-more > button'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok('Escape lo cierra', !(await open()));
        await p.focus('.nav-more > button'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok('se abre con el teclado (Enter)', await open());
        ok('el botón anuncia su estado (aria-expanded)', (await p.getAttribute('.nav-more > button', 'aria-expanded')) === 'true');
        await p.keyboard.press('Tab'); ok('Tab entra en el primer enlace del submenú', (await p.evaluate(() => document.activeElement.textContent)) === 'Academia');
        await p.mouse.click(300, 500); await p.waitForTimeout(600); ok('se cierra al pulsar fuera', !(await open()));
        ok('cerrado, sus enlaces no reciben foco ni pulsaciones', await p.evaluate(() => getComputedStyle(document.querySelector('.nav-sub')).visibility === 'hidden'));
      } else {
        sec(`Menú móvil (${dev})`);
        await p.goto(base + 'servicios/'); await settle(p);
        ok('cerrado, ningún enlace del menú intercepta pulsaciones', await p.evaluate(() => [...document.querySelectorAll('#nav a')].every(a => getComputedStyle(a).visibility === 'hidden')));
        await p.click('#burger'); await p.waitForTimeout(400);
        ok('abre a pantalla completa con los 8 destinos y «Reservar cita»', await p.evaluate(() => { const n = document.querySelector('#nav').getBoundingClientRect(); return n.width >= innerWidth && n.height >= innerHeight && [...document.querySelectorAll('#nav a')].filter(a => a.getBoundingClientRect().height > 0).length === 9; }));
        ok('bloquea el desplazamiento y deja inerte el contenido de detrás', await p.evaluate(() => document.body.style.overflow === 'hidden' && document.querySelector('main').inert));
        ok('el botón anuncia «Cerrar menú»', (await p.getAttribute('#burger', 'aria-label')) === 'Cerrar menú' && (await p.getAttribute('#burger', 'aria-expanded')) === 'true');
        ok('marca la página actual', (await p.evaluate(() => (document.querySelector('#nav a[aria-current="page"]') || {}).textContent)) === 'Servicios');
        await p.keyboard.press('Escape'); await p.waitForTimeout(300); ok('Escape lo cierra y desbloquea', await p.evaluate(() => !document.querySelector('#nav').classList.contains('open') && document.body.style.overflow === '' && !document.querySelector('main').inert));
        await p.click('#burger'); await p.waitForTimeout(300); await p.click('#burger'); await p.waitForTimeout(300); ok('el botón lo cierra', await p.evaluate(() => !document.querySelector('#nav').classList.contains('open')));
        await p.click('#burger'); await p.waitForTimeout(300); await p.setViewportSize({ width: 1300, height: 800 }); await p.waitForTimeout(300);
        ok('se cierra solo si la pantalla pasa a tamaño de escritorio', await p.evaluate(() => !document.querySelector('#nav').classList.contains('open') && document.body.style.overflow === ''));
        await p.setViewportSize({ width: w, height: h });
      }

      sec(`Servicio → Reservar (${dev})`);
      for (const src of ['servicios/', 'universo-rizado/']) {
        await p.goto(base + src); await settle(p);
        const hrefs = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="#svc-"]')].map(a => a.getAttribute('href')))]);
        let good = 0; const bad = [];
        for (const hf of hrefs) {
          await p.goto(base + src); await p.waitForTimeout(150);
          const rowName = await p.evaluate(h => { const a = document.querySelector(`a[href="${h}"]`); const li = a.closest('li'); return li ? li.querySelector('h3').textContent : 'Consulta inicial'; }, hf);
          await p.locator(`a[href="${hf}"]`).first().click(); await settle(p);
          const got = await p.locator('#s-svc').textContent(), checked = await p.evaluate(() => document.querySelector('input[name=svc]:checked').id);
          const slug = hf.split('#svc-')[1];
          if (checked === 'opt-' + slug && (await y(p)) === 0 && p.url().includes('reservar/')) good++; else bad.push(`${rowName} → ${got} (y=${await y(p)})`);
        }
        ok(`${dev}: desde ${src} los ${hrefs.length} enlaces llegan a Reservar, arriba y con su servicio elegido`, good === hrefs.length && hrefs.length >= 6, bad.join('; '));
      }

      sec(`Flujo de reserva (${dev})`);
      const before = posts.length;
      await p.goto(base + 'reservar/'); await settle(p);
      ok('abre arriba, en el paso 1, con «Consulta inicial» elegida', (await y(p)) === 0 && await p.locator('#t1').isVisible() && (await p.locator('#s-svc').textContent()) === 'Consulta inicial');
      ok('el aviso «Demostración» está visible al entrar', await p.locator('.rsv-notice').isVisible() && /no se reserva nada/i.test(await p.locator('.rsv-notice').textContent()));
      ok('los pasos 2 y 3 están bloqueados hasta llegar a ellos', await p.evaluate(() => [...document.querySelectorAll('#steps button')].map(b => b.disabled).join() === 'false,true,true'));
      const pick = async id => { await p.evaluate(i => document.getElementById(i).scrollIntoView({ block: 'center', behavior: 'instant' }), id); await p.waitForTimeout(120); const y0 = await y(p); await p.locator('#' + id).click({ force: true }); await p.waitForTimeout(150); return Math.abs((await y(p)) - y0); };
      const d1 = await pick('opt-alisado'); ok('elegir un servicio actualiza el resumen sin mover la página', (await p.locator('#s-svc').textContent()) === 'Alisado' && (await p.locator('#s-dep').textContent()) === 'Monto por definir' && d1 < 3, `Δy=${d1}`);
      await pick('opt-keratina'); ok('cambiar de servicio sustituye al anterior (solo uno a la vez)', (await p.locator('#s-svc').textContent()) === 'Keratina brasileña' && (await p.evaluate(() => document.querySelectorAll('input[name=svc]:checked').length)) === 1);
      await pick('opt-consulta'); ok('la consulta aparece «Sin costo»; ningún otro servicio muestra un importe', (await p.locator('#s-dep').textContent()) === 'Sin costo');
      await pick('opt-corte-rizos');
      await p.locator('#next').dblclick(); await p.waitForTimeout(700); ok('una pulsación doble en «Continuar» avanza un solo paso', await p.locator('#t2').isVisible());
      ok('al cambiar de paso el formulario queda a la vista bajo la cabecera', await p.evaluate(() => { const r = document.querySelector('#rsv').getBoundingClientRect(); return r.top >= 0 && r.top < 160; }));
      await pick('day-5'); await pick('time-6'); ok('fecha y hora se reflejan en el resumen', (await p.locator('#s-time').textContent()) === '8:30 p. m.' && (await p.locator('#s-day').textContent()).length > 8);
      ok('los horarios están marcados como ejemplo', /ejemplo/i.test(await p.locator('[data-step="2"]').textContent()));
      await p.click('#prev'); await p.waitForTimeout(600); ok('«Atrás» vuelve al paso 1 conservando el servicio', await p.locator('#t1').isVisible() && (await p.locator('#s-svc').textContent()) === 'Corte para rizos');
      await p.click('#next'); await p.waitForTimeout(600); await p.click('#next'); await p.waitForTimeout(600); ok('llega al paso 3 conservando fecha y hora', await p.locator('#t3').isVisible() && (await p.locator('#s-time').textContent()) === '8:30 p. m.');
      ok('el foco pasa al título del nuevo paso', (await p.evaluate(() => document.activeElement.id)) === 't3');
      await p.click('#next'); await p.waitForTimeout(500);
      let errs = await p.locator('.err:visible').allTextContents();
      ok('sin datos no avanza y explica qué falta (nombre y teléfono)', await p.locator('#t3').isVisible() && errs.length === 2, errs.join(' | '));
      ok('los campos con error quedan marcados y enlazados a su mensaje', await p.evaluate(() => ['nombre', 'tel'].every(f => { const i = document.getElementById('f-' + f); return i.getAttribute('aria-invalid') === 'true' && i.getAttribute('aria-describedby') === 'e-' + f; })));
      ok('el foco va al primer campo con error', (await p.evaluate(() => document.activeElement.id)) === 'f-nombre');
      await p.fill('#f-nombre', 'Ana Ejemplo'); ok('el error desaparece al corregir el campo', (await p.locator('#e-nombre').isHidden()));
      await p.fill('#f-tel', '12'); await p.fill('#f-mail', 'ana@'); await p.click('#next'); await p.waitForTimeout(500);
      errs = await p.locator('.err:visible').allTextContents(); ok('teléfono corto y correo incompleto se rechazan', errs.length === 2 && await p.locator('#t3').isVisible(), errs.join(' | '));
      await p.fill('#f-tel', '(305) 555-0100'); await p.fill('#f-mail', ''); await p.fill('#f-nota', 'Línea uno'); await p.focus('#f-nota'); await p.keyboard.press('Enter'); await p.keyboard.type('Línea dos'); await p.waitForTimeout(200);
      ok('Enter dentro de la nota añade una línea, no envía', await p.locator('#t3').isVisible() && (await p.inputValue('#f-nota')).includes('\n'));
      await p.click('#steps button[data-go="1"]'); await p.waitForTimeout(600); await p.click('#steps button[data-go="3"]'); await p.waitForTimeout(600);
      ok('ir y volver entre pasos conserva lo escrito', (await p.inputValue('#f-nombre')) === 'Ana Ejemplo' && (await p.inputValue('#f-tel')) === '(305) 555-0100' && (await p.inputValue('#f-nota')).startsWith('Línea uno'));
      await p.selectOption('#f-pelo', 'Ondulado'); await p.focus('#f-nombre'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
      ok('Enter en un campo de texto válido pasa a la revisión', await p.locator('#t4').isVisible());
      const end = await p.locator('[data-step="4"]').innerText();
      ok('la pantalla final dice que es una demostración y que no se reservó ni cobró nada', /demostraci/i.test(end) && /No se ha reservado ninguna cita/.test(end) && /ning[uú]n pago/.test(end) && /no se enviaron/.test(end));
      ok('la pantalla final no usa lenguaje de confirmación', !/confirmad|reservada con éxito|gracias por tu reserva|pago recibido/i.test(end));
      ok('la revisión muestra exactamente lo introducido', /Corte para rizos/.test(end) && /8:30 p\. m\./.test(end) && /Ana Ejemplo/.test(end) && /\(305\) 555-0100/.test(end) && /Ondulado/.test(end));
      ok('durante todo el flujo no se envió nada a ningún servidor', posts.length === before, posts.slice(before).join(' '));
      ok('nada de lo escrito se guardó en el navegador', await p.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === ''));
      await p.click('#prev'); await p.waitForTimeout(600); ok('«Empezar de nuevo» vuelve al paso 1', await p.locator('#t1').isVisible());
      await bottom(p); await navTo('reservar'); await p.waitForTimeout(1300); ok('«Reservar cita» estando en Reservar sube sin borrar lo escrito', (await y(p)) === 0 && (await p.inputValue('#f-nombre')) === 'Ana Ejemplo');

      if (w === 375) {
        sec('Barra «Continuar» fija y teclado en móvil');
        await p.goto(base + 'reservar/'); await settle(p);
        ok('la barra queda pegada al borde inferior de la pantalla', await p.evaluate(() => { const r = document.querySelector('.rsv-actions').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 2 && getComputedStyle(document.querySelector('.rsv-actions')).position === 'sticky'; }));
        const covered = async sel => p.evaluate(s => { const e = document.querySelector(s).getBoundingClientRect(), bar = document.querySelector('.rsv-actions').getBoundingClientRect(), head = document.querySelector('.head').getBoundingClientRect(); return e.bottom > bar.top + 1 && e.top < bar.bottom || e.top < head.bottom - 1; }, sel);
        await p.evaluate(() => document.querySelector('[data-step="1"] .todo').scrollIntoView({ block: 'end', behavior: 'instant' })); await bottom(p); await p.evaluate(() => { const f = document.querySelector('#rsv'); window.scrollTo({ top: f.offsetTop + f.offsetHeight - innerHeight + 4, behavior: 'instant' }); }); await p.waitForTimeout(150);
        ok('al final del paso, la barra no tapa el último contenido', !(await covered('[data-step="1"] .todo')));
        await p.click('#next'); await p.waitForTimeout(600); await p.click('#next'); await p.waitForTimeout(600);
        ok('la barra de acciones cabe en una sola fila', await p.evaluate(() => document.querySelector('.rsv-actions').getBoundingClientRect().height < 90));
        for (const kh of [520, 340]) {   // alturas que quedan con el teclado abierto en un teléfono grande y en uno pequeño
          await p.setViewportSize({ width: 375, height: kh }); await p.waitForTimeout(200);
          for (const f of ['#f-nombre', '#f-tel', '#f-mail', '#f-pelo', '#f-nota']) { await p.focus(f); await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'nearest', behavior: 'instant' }), f); await p.waitForTimeout(150); ok(`con el teclado abierto (${kh}px de alto), ${f} queda visible, ni bajo la cabecera ni bajo la barra`, !(await covered(f))); }
        }
        ok('los campos usan letra de 16 px o más (el teléfono no amplía la página al enfocar)', await p.evaluate(() => [...document.querySelectorAll('.field input,.field select,.field textarea')].every(e => parseFloat(getComputedStyle(e).fontSize) >= 16)));
        ok('el campo de teléfono abre el teclado numérico y el de correo el de correo', (await p.getAttribute('#f-tel', 'inputmode')) === 'tel' && (await p.getAttribute('#f-mail', 'type')) === 'email' && (await p.getAttribute('#f-nombre', 'autocomplete')) === 'name');
        await p.setViewportSize({ width: w, height: h });
      }

      sec(`Tienda, Academia, Galería y Contacto (${dev})`);
      await p.goto(base + 'tienda/'); await settle(p);
      ok('Tienda: 8 productos, todos «de muestra» y con «Precio por definir»', await p.evaluate(() => { const c = [...document.querySelectorAll('.prod')]; return c.length === 8 && c.every(x => /de muestra/.test(x.querySelector('h3').textContent) && x.querySelector('.price').textContent === 'Precio por definir' && x.querySelector('.tag').textContent === 'Muestra'); }));
      ok('Tienda: no aparece ningún importe', !/[$€]\s?\d|\d+[.,]\d{2}\s?(USD|usd)/.test(await p.locator('main').innerText()));
      for (const [cat, n] of [['Limpieza', 2], ['Hidratación', 2], ['Definición', 2], ['Tratamiento', 2], ['Todo', 8]]) { await p.locator(`.chip:has-text("${cat}")`).click(); await p.waitForTimeout(120); ok(`Tienda: el filtro «${cat}» muestra ${n}`, (await p.locator('.prod:visible').count()) === n && (await p.getAttribute(`.chip:has-text("${cat}")`, 'aria-pressed')) === 'true'); }
      const u0 = p.url(); await p.locator('.add').first().scrollIntoViewIfNeeded(); await p.locator('.add').first().click(); await p.waitForTimeout(400);
      ok('Tienda: «Añadir» avisa de que es una demostración y no inicia ninguna compra', /demostraci/i.test(await p.locator('#toast').textContent()) && p.url() === u0 && await p.locator('#toast.show').count() === 1);
      await p.goto(base + 'academia/'); await settle(p);
      ok('Academia: marcada «Próximamente» y sin precios ni inscripción', /Próximamente/i.test(await p.locator('.phero').innerText()) && (await p.locator('.offer .tag').allTextContents()).every(t => /Próximamente|A futuro/i.test(t)) && !/[$€]\s?\d|inscr[ií]b/i.test(await p.locator('main').innerText()));
      await p.locator('[data-toast]').click(); await p.waitForTimeout(400); ok('Academia: «Quiero enterarme primero» avisa de que es una demostración', /demostraci/i.test(await p.locator('#toast').textContent()) && p.url().endsWith('academia/'));
      await p.goto(base + 'galeria/'); await settle(p);
      ok('Galería: 6 marcos, todos etiquetados como espacio para foto real', (await p.locator('.ba-frame').count()) === 6 && (await p.locator('.ba-note').allTextContents()).every(t => /Espacio para foto real/.test(t)) && /espacios reservados, no resultados/.test(await p.locator('.phero').innerText()));
      await p.focus('#ba-1'); for (let i = 0; i < 10; i++) await p.keyboard.press('ArrowRight'); ok('Galería: el comparador se mueve con el teclado', (await p.evaluate(() => document.querySelector('.ba-frame').style.getPropertyValue('--pos'))) === '60%');
      const box = await p.locator('.ba-frame').first().boundingBox(); await p.mouse.click(box.x + box.width * .2, box.y + box.height * .5); await p.waitForTimeout(150);
      ok('Galería: el comparador responde al toque o al clic', Math.abs(parseFloat(await p.evaluate(() => document.querySelector('.ba-frame').style.getPropertyValue('--pos'))) - 20) < 6);
      await p.goto(base + 'contacto/'); await settle(p); const ct = await p.locator('main').innerText();
      ok('Contacto: muestra la ubicación y el horario facilitados', /Phenix Salon Suites, Suite\s137/.test(ct) && /Hialeah, Florida/.test(ct) && /11:30 a\.\sm\. – 11:30 p\.\sm\./.test(ct));
      ok('Contacto: teléfono, redes y correo figuran «Por confirmar», sin datos inventados', (ct.match(/Por confirmar/g) || []).length === 3 && !/\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4}|@[a-z]/i.test(ct));
      ok('Contacto: no hay formulario ni mensaje de envío', (await p.locator('main form, main input, main textarea').count()) === 0);
      await p.goto(base); await settle(p);
      ok('Inicio: no hay testimonios ni reseñas (no se han facilitado)', !/testimoni|reseña|★|estrellas/i.test(await p.locator('main').innerText()));
      ok('Inicio: no contiene el formulario de reserva', (await p.locator('form, #rsv').count()) === 0);
      ok(`${dev}: sin errores de script en todo el recorrido`, p._errs.length === 0, p._errs.join(' | '));
      await p.context().close();
    }

    sec('Teclado y foco (escritorio)');
    const p = await newPage(1440, 900);
    await p.goto(base + 'servicios/'); await settle(p);
    await p.keyboard.press('Tab'); await p.waitForTimeout(400); ok('la primera tabulación muestra «Saltar al contenido»', (await p.evaluate(() => document.activeElement.textContent)) === 'Saltar al contenido' && await p.evaluate(() => document.activeElement.getBoundingClientRect().top >= 0));
    await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok('y lleva el foco al contenido principal', (await p.evaluate(() => document.activeElement.id)) === 'contenido');
    await p.goto(base); await settle(p); const seen = [];
    for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); seen.push(await p.evaluate(() => { const a = document.activeElement, cs = getComputedStyle(a); return (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 22) + '|' + (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 ? 'foco' : 'SIN'); })); }
    ok('el orden de tabulación sigue la cabecera: logo, menú, «Más», Reservar', /Saltar.*Yeilis AR Beauty.*Inicio.*Servicios.*Universo Rizado.*Galería.*Sobre Yeilis.*Más.*Reservar cita/.test(seen.map(s => s.split('|')[0]).join(' > ')), seen.map(s => s.split('|')[0]).join(' > '));
    ok('cada elemento enfocado con teclado muestra un contorno visible', seen.slice(1).every(s => s.endsWith('foco')), seen.filter(s => s.endsWith('SIN')).join(', '));
    await p.goto(base + 'reservar/'); await settle(p); await p.focus('#opt-consulta'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
    ok('los servicios se eligen con las flechas del teclado', (await p.locator('#s-svc').textContent()) === 'Recuperación del rizo');
    ok('la opción enfocada muestra contorno', await p.evaluate(() => { const s = getComputedStyle(document.activeElement.nextElementSibling); return s.outlineStyle !== 'none'; }));
    ok('sin errores de script', p._errs.length === 0, p._errs.join(' | '));
    await p.context().close();

    sec('Movimiento reducido');
    const q = await newPage(1440, 900, { reducedMotion: 'reduce' }); await q.goto(base); await settle(q);
    ok('con «reducir movimiento» no hay animaciones ni desplazamiento suave', await q.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto' && getComputedStyle(document.querySelector('.hero-art')).animationName === 'none'));
    await q.context().close();
  }

  sec('Red');
  ok('ningún archivo del sitio falla al cargar', reqFail.length === 0, [...new Set(reqFail)].join(' '));
  ok('solo se usa un servicio externo: Google Fonts', [...ext].every(h => /fonts\.(googleapis|gstatic)\.com$/.test(h)), [...ext].join(', '));
  console.log('servicios externos solicitados:', [...ext].join(', ') || 'ninguno');
  console.log(`\nRESULTADO: ${pass} comprobaciones correctas, ${fail} fallidas`);
  if (fails.length) console.log('FALLOS:\n- ' + fails.join('\n- '));
  await b.close();
})().catch(e => { console.log('ERROR DEL SCRIPT', e); process.exit(1); });
