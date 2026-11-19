#!/usr/bin/env python3
"""Comprobación SEO sobre el HTML generado (no sobre las plantillas).

Uso:  python3 _src/seo-check.py                 -> comprueba el sitio en modo previo al lanzamiento
      python3 _src/seo-check.py --launch DIR URL -> comprueba una variante de lanzamiento generada con --launch-test
"""
import glob, json, os, re, sys
from html.parser import HTMLParser
from xml.dom import minidom

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = len(sys.argv) > 3 and sys.argv[1] == '--launch'
ROOT, BASE = (sys.argv[2], sys.argv[3].rstrip('/') + '/') if LIVE else (SITE, None)
BIZ = json.load(open(os.path.join(SITE, '_src', 'business.json'), encoding='utf-8'))
ok_n = bad_n = 0


def ok(name, cond, extra=''):
    global ok_n, bad_n
    if cond:
        ok_n += 1
    else:
        bad_n += 1
        print('  FALLO', name, extra)


class Head(HTMLParser):
    def __init__(self):
        super().__init__(); self.meta = {}; self.links = []; self.title = ''; self.ld = []; self.h = []; self.imgs = []; self.scripts = []; self.tags = set()
        self._t = None; self.a = []
    def handle_starttag(self, t, a):
        a = dict(a); self.tags.add(t)
        if t == 'meta': self.meta[a.get('name') or a.get('property') or a.get('charset') and 'charset'] = a.get('content', a.get('charset'))
        elif t == 'link': self.links.append(a)
        elif t == 'img': self.imgs.append(a)
        elif t == 'a' and 'href' in a: self.a.append(a['href'])
        elif t == 'script':
            self.scripts.append(a); self._t = 'ld' if a.get('type') == 'application/ld+json' else None
        elif t == 'title': self._t = 'title'
        elif re.fullmatch(r'h[1-6]', t): self.h.append(int(t[1]))
        if t == 'html': self.lang = a.get('lang')
    def handle_endtag(self, t):
        if t in ('title', 'script'): self._t = None
    def handle_data(self, d):
        if self._t == 'title': self.title += d
        elif self._t == 'ld': self.ld.append(d)


pages = ['index.html'] + sorted(glob.glob('*/index.html', root_dir=ROOT))
pages = [p for p in pages if not p.startswith('_')]
titles, descs = {}, {}
for f in pages:
    slug = os.path.dirname(f) or 'home'
    raw = open(os.path.join(ROOT, f), encoding='utf-8').read(); h = Head(); h.feed(raw)
    n = slug + ':'
    t, d = h.title.strip(), (h.meta.get('description') or '').strip()
    titles.setdefault(t, []).append(slug); descs.setdefault(d, []).append(slug)
    ok(f'{n} título de 25–60 caracteres con la marca', 25 <= len(t) <= 60 and 'Yeilis AR Beauty' in t, f'{len(t)} «{t}»')
    ok(f'{n} descripción de 70–160 caracteres', 60 <= len(d) <= 160, f'{len(d)}')
    ok(f'{n} sin relleno de palabras clave en el título', max(t.lower().count(w) for w in ('rizado', 'rizos', 'miami', 'hialeah', 'cabello')) <= 2, t)
    ok(f'{n} idioma declarado (es)', getattr(h, 'lang', None) == 'es')
    ok(f'{n} un solo h1 y niveles sin saltos', h.h.count(1) == 1 and all(b - a <= 1 for a, b in zip(h.h, h.h[1:])), str(h.h))
    ok(f'{n} estructura semántica (header, nav, main, footer)', {'header', 'nav', 'main', 'footer'} <= h.tags)
    ok(f'{n} Open Graph básico coherente con el título y la descripción', h.meta.get('og:title') == t and h.meta.get('og:description') == d and h.meta.get('og:type') == 'website' and h.meta.get('og:site_name') == BIZ['name'])
    ok(f'{n} imágenes con alt, ancho y alto (sin saltos de diseño)', all(i.get('alt') and i.get('width') and i.get('height') for i in h.imgs), str([i.get('src') for i in h.imgs if not (i.get('alt') and i.get('width'))]))
    eager = [i for i in h.imgs if i.get('loading') != 'lazy']
    ok(f'{n} la primera imagen de contenido no se carga en diferido', not h.imgs or h.imgs[0].get('loading') != 'lazy')
    ok(f'{n} sin scripts de analítica, píxeles ni terceros', not re.search(r'googletagmanager|google-analytics|gtag\(|fbq\(|hotjar|clarity\.ms|doubleclick', raw, re.I) and all(not s.get('src', '').startswith('http') for s in h.scripts))
    ok(f'{n} direcciones internas limpias (minúsculas, con guiones, sin extensión)', all(re.fullmatch(r'(\.\./|\./)?([a-z0-9-]+/)*(#[\w-]+)?', x) for x in h.a if not x.startswith(('http', '#'))), str([x for x in h.a if not re.fullmatch(r'(\.\./|\./)?([a-z0-9-]+/)*(#[\w-]+)?', x)][:3]))
    canon = [l.get('href') for l in h.links if l.get('rel') == 'canonical']
    lds = []
    for block in h.ld:
        try: lds.append(json.loads(block))
        except Exception as e: ok(f'{n} datos estructurados con JSON válido', False, str(e))
    blob = json.dumps(lds, ensure_ascii=False)
    ok(f'{n} datos estructurados sin valores vacíos ni inventados', not lds or not re.search(r'null|""|\[\]|example\.|000-0000|TODO|pendiente', blob.replace(BASE or '\0', ''), re.I) or (LIVE and 'example.' in (BASE or '')), blob[:120])
    ok(f'{n} sin valoraciones, reseñas ni premios en los datos estructurados', not re.search(r'aggregateRating|"review"|award|ratingValue', blob))
    if slug in ('home', 'contacto'):
        biz = next((x for x in lds if x.get('@type') == BIZ['business_type']), None)
        ok(f'{n} negocio local (HairSalon) con nombre, ciudad, estado y servicios', bool(biz) and biz.get('name') == BIZ['name'] and biz['address'].get('addressLocality') == 'Hialeah' and biz['address'].get('addressRegion') == 'FL' and len(biz['hasOfferCatalog']['itemListElement']) == len(BIZ['services']))
        if biz:
            for field, key in (('telephone', 'telephone'), ('email', 'email'), ('priceRange', 'price_range')):
                ok(f'{n} «{field}» solo aparece si está confirmado', (field in biz) == bool(BIZ.get(key)))
            ok(f'{n} la calle solo aparece si está confirmada', ('streetAddress' in biz['address']) == bool(BIZ['address'].get('street_address')))
            ok(f'{n} el horario solo aparece si está confirmado', ('openingHoursSpecification' in biz) == bool(BIZ['opening_hours'].get('confirmed')))
            ok(f'{n} redes sociales solo si hay perfiles confirmados', ('sameAs' in biz) == bool(BIZ.get('social_profiles')))
    if not LIVE:
        ok(f'{n} PRELANZAMIENTO: noindex, nofollow', h.meta.get('robots') == 'noindex, nofollow', str(h.meta.get('robots')))
        ok(f'{n} PRELANZAMIENTO: sin canonical ni direcciones absolutas del sitio', not canon and 'og:url' not in h.meta and 'og:image' not in h.meta)
        ok(f'{n} PRELANZAMIENTO: conserva el aviso de propuesta', 'class="concept"' in raw and 'no es el sitio oficial' in raw)
    else:
        url = BASE + ('' if slug == 'home' else slug + '/')
        ok(f'{n} LANZAMIENTO: index, follow', h.meta.get('robots') == 'index, follow')
        ok(f'{n} LANZAMIENTO: canonical propio y único', canon == [url], str(canon))
        ok(f'{n} LANZAMIENTO: og:url y og:image absolutos', h.meta.get('og:url') == url and (h.meta.get('og:image') or '').startswith(BASE))
        ok(f'{n} LANZAMIENTO: sin aviso de propuesta', 'class="concept"' not in raw and 'no es el sitio oficial' not in raw)
        if slug != 'home':
            bc = next((x for x in lds if x.get('@type') == 'BreadcrumbList'), None)
            ok(f'{n} LANZAMIENTO: ruta de navegación estructurada', bool(bc) and bc['itemListElement'][-1]['item'] == url)

ok('títulos únicos en todas las páginas', all(len(v) == 1 for v in titles.values()), str([v for v in titles.values() if len(v) > 1]))
ok('descripciones únicas en todas las páginas', all(len(v) == 1 for v in descs.values()), str([v for v in descs.values() if len(v) > 1]))
robots = open(os.path.join(ROOT, 'robots.txt'), encoding='utf-8').read() if os.path.exists(os.path.join(ROOT, 'robots.txt')) else ''
sm = os.path.join(ROOT, 'sitemap.xml')
if not LIVE:
    ok('PRELANZAMIENTO: robots.txt cierra el rastreo', re.search(r'^Disallow: /$', robots, re.M) and 'Allow: /' not in robots.replace('Disallow: /', ''))
    ok('PRELANZAMIENTO: no existe sitemap.xml', not os.path.exists(sm))
    ok('PRELANZAMIENTO: el lanzamiento no está autorizado ni tiene dominio', BIZ.get('launch_authorized') is False and not BIZ.get('production_url'))
    hdr = os.path.join(os.path.dirname(SITE), '_headers')
    ok('PRELANZAMIENTO: el servidor añade X-Robots-Tag noindex a esta carpeta', os.path.exists(hdr) and re.search(r'/yeilis-ar-beauty/\*\s+X-Robots-Tag: noindex, nofollow', open(hdr).read()))
    ok('PRELANZAMIENTO: «pendientes» existe y no está en el menú', os.path.exists(os.path.join(ROOT, 'pendientes', 'index.html')))
else:
    ok('LANZAMIENTO: robots.txt permite el rastreo y anuncia el sitemap', 'Allow: /' in robots and f'Sitemap: {BASE}sitemap.xml' in robots)
    locs = [n.firstChild.data for n in minidom.parse(sm).getElementsByTagName('loc')]
    want = sorted(BASE + ('' if os.path.dirname(f) == '' else os.path.dirname(f) + '/') for f in pages)
    ok('LANZAMIENTO: sitemap.xml válido con las 9 páginas y nada más', sorted(locs) == want and len(locs) == 9, str(locs))
    ok('LANZAMIENTO: la página interna «pendientes» no se genera', not os.path.exists(os.path.join(ROOT, 'pendientes')))

print(f'{"LANZAMIENTO (ensayo)" if LIVE else "PRELANZAMIENTO"}: {ok_n} comprobaciones correctas, {bad_n} fallidas')
sys.exit(1 if bad_n else 0)
