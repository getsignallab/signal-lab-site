#!/usr/bin/env python3
"""Genera las páginas de Yeilis AR Beauty.

Uso:  python3 _src/build.py            -> escribe las páginas del sitio (enlaces limpios: servicios/, reservar/ …)
      python3 _src/build.py --preview DIR  -> variante con todo en línea y enlaces a index.html, para vistas previas

Cabecera, pie y navegación se definen una sola vez aquí. Los estilos y el script viven en assets/site.css y assets/site.js.
En el texto, @@pagina se convierte en el enlace relativo correcto (@@home, @@servicios, @@reservar#svc-keratina, @@/assets/x.webp).
"""
import os, re, sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == '--preview' else None

NAV_MAIN = [('home', 'Inicio'), ('servicios', 'Servicios'), ('universo-rizado', 'Universo Rizado'), ('galeria', 'Galería'), ('sobre-yeilis', 'Sobre Yeilis')]
NAV_MORE = [('academia', 'Academia'), ('tienda', 'Tienda'), ('contacto', 'Contacto')]

ARR = '<span class="arr" aria-hidden="true">→</span>'
CROWN = '<svg class="crown" viewBox="0 0 64 40" aria-hidden="true"><path d="M5 36h54l-4-24-12 11L32 4 21 23 9 12z" fill="none" stroke="#f6c3d3" stroke-width="1.6" stroke-linejoin="round"/><circle cx="32" cy="3" r="2.4" fill="#f6c3d3"/><circle cx="8" cy="10" r="2.2" fill="#f6c3d3"/><circle cx="56" cy="10" r="2.2" fill="#f6c3d3"/></svg>'


def more(page, text):
    return f'<a class="more" href="@@{page}">{text} <span aria-hidden="true">→</span></a>'


def reservar_btn(text='Reservar cita', frag=''):
    return f'<a class="btn btn-rose" href="@@reservar{frag}">{text} {ARR}</a>'


def ba(n, title):
    return f'''      <figure class="ba rv">
        <div class="ba-frame">
          <div class="ba-side ba-before"><span>Antes</span></div>
          <div class="ba-side ba-after"><span>Después</span></div>
          <p class="ba-note">Espacio para foto real<small>Desliza para comparar</small></p>
          <div class="ba-bar"></div>
          <input type="range" min="0" max="100" value="50" id="ba-{n}" aria-label="Comparar antes y después: {title}">
        </div>
        <figcaption><b>{title}</b><span>Ejemplo {n:02d}</span></figcaption>
      </figure>'''


def phero(crumb, eyebrow, h1, lead, extra=''):
    return f'''<section class="phero">
  <div class="wrap">
    <p class="crumb"><a href="@@home">Inicio</a><span aria-hidden="true">/</span><span>{crumb}</span></p>
    <p class="eyebrow">{eyebrow}</p>
    <h1>{h1}</h1>
    <p class="lead">{lead}</p>{extra}
  </div>
</section>'''


def fin(h2='Tu transformación <em>comienza aquí</em>', lead='Reserva tu consulta gratuita y cuéntale a Yeilis qué quieres para tu cabello.'):
    return f'''<section class="band fin">
  <div class="wrap rv">
    {CROWN}
    <h2>{h2}</h2>
    <p class="lead">{lead}</p>
    {reservar_btn()}
    <span class="todo">La reserva en línea es una demostración</span>
  </div>
</section>'''


# ---------------------------------------------------------------- servicios (datos reales del negocio, sin precios)
RIZOS = [
    ('recuperacion', 'Recuperación del rizo', 'Un proceso personalizado para acompañar a tu cabello de vuelta a su textura natural, a su propio ritmo.', 'Rizos', ''),
    ('corte-rizos', 'Cortes especializados', 'Cortes pensados para la forma, la caída y el volumen del cabello rizado.', 'Rizos', ''),
    ('definicion', 'Definición del rizo', 'Técnicas de definición para realzar el patrón natural de tus rizos.', 'Rizos', ''),
    ('color', 'Color y transformaciones', 'Coloración, balayage y mechas trabajados con el cuidado que pide un cabello rizado.', 'Rizos y liso', ' both'),
    ('tratamiento', 'Tratamientos personalizados', 'Tratamientos elegidos según lo que tu cabello necesita en este momento.', 'Rizos', ''),
]
LISO = [
    ('keratina', 'Keratina brasileña', 'Tratamiento de keratina para un cabello más manejable.', 'Liso', ' plain'),
    ('botox', 'Botox capilar', 'Tratamiento de cuidado profundo para la fibra capilar.', 'Liso', ' plain'),
    ('alisado', 'Alisado', 'Alisado profesional según el tipo y estado de tu cabello.', 'Liso', ' plain'),
    ('alineacion', 'Alineación capilar', 'Para ordenar la fibra y controlar el frizz.', 'Liso', ' plain'),
    ('repolarizacion', 'Repolarización', 'Tratamiento de reparación para cabello que necesita recuperarse.', 'Liso', ' plain'),
]
AMBOS = [
    ('color', 'Color, balayage y mechas', 'Coloración, balayage y mechas para cualquier textura.', 'Rizos y liso', ' both'),
    ('extensiones', 'Extensiones', 'Extensiones para sumar largo o volumen.', 'Rizos y liso', ' both'),
    ('trenzas', 'Trenzas', 'Trenzados para cualquier textura.', 'Rizos y liso', ' both'),
]


def rows(items, book=True):
    out = []
    for slug, name, desc, tag, cls in items:
        link = f'<a class="more" href="@@reservar#svc-{slug}">Reservar <span aria-hidden="true">→</span></a>' if book else ''
        out.append(f'      <li class="rv"><h3>{name}</h3><p>{desc}</p><span class="tag{cls}">{tag}</span>{link}</li>')
    return '\n'.join(out)


# ---------------------------------------------------------------- INICIO
HOME = f'''<!-- 1 · HERO -->
<section class="hero" id="inicio">
  <div class="wrap">
    <div class="hero-copy">
      <svg class="coil hero-coil" data-coil data-turns="11" data-w="44" data-h="300" aria-hidden="true"></svg>
      <p class="eyebrow">Yeilis Armas · Especialista en cabello rizado</p>
      <h1 class="h1"><span class="chrome">La Reina</span><span class="chrome">de los <em>Rizos</em></span><span class="chrome">de Miami</span></h1>
      <p class="tagline">
        <svg viewBox="0 0 34 22" aria-hidden="true"><path d="M2 20h30L30 7l-7 6-6-11-6 11-7-6z" fill="none" stroke="#f6c3d3" stroke-width="1.4" stroke-linejoin="round"/><circle cx="17" cy="2" r="1.6" fill="#f6c3d3"/><circle cx="4" cy="6.5" r="1.4" fill="#f6c3d3"/><circle cx="30" cy="6.5" r="1.4" fill="#f6c3d3"/></svg>
        Tu cabello, tu corona.
      </p>
      <p class="hero-intro">Más de 20 años de experiencia dedicados a cuidar, cortar, definir y recuperar el cabello rizado, en un espacio privado en Hialeah.</p>
      <div class="cta-row">
        {reservar_btn()}
        <a class="btn btn-line" href="@@servicios">Ver servicios</a>
      </div>
      <p class="hero-meta"><span><b>Phenix Salon Suites</b> · Suite 137 · Hialeah, Florida</span><span>Solo con cita previa</span></p>
    </div>
    <div class="hero-art">
      <!-- RETRATO: reemplazar assets/yeilis-hero.webp por el retrato original en alta resolución (vertical 4:5, mínimo 1200 × 1500 px, sin logos ni texto encima). -->
      <figure class="hero-frame">
        <img src="@@/assets/yeilis-hero.webp" width="572" height="715" fetchpriority="high" decoding="async" alt="Yeilis Armas sonríe, con sombrero negro, lentes y chaqueta de hojas verdes">
        <figcaption><b>Yeilis Armas</b><span>Más de 20 años cuidando rizos</span></figcaption>
      </figure>
    </div>
  </div>
</section>

<!-- 2 · SOBRE YEILIS -->
<section class="band sobre" id="yeilis">
  <div class="wrap about-mini">
    <figure class="portrait rv">
      <img src="@@/assets/yeilis-retrato.webp" width="500" height="500" loading="lazy" decoding="async" alt="Retrato de Yeilis Armas">
    </figure>
    <div class="stack rv">
      <p class="eyebrow">Sobre Yeilis</p>
      <h2 class="h2">Yeilis Armas, <em>la Reina de los Rizos</em></h2>
      <p class="lead">Estilista profesional con más de 20 años de experiencia y embajadora internacional de la marca brasileña Phyto Activo. Su pasión es el cabello rizado, y domina por igual el cabello liso.</p>
      <p class="mini-facts"><span class="tag">20+ años de experiencia</span><span class="tag">Especialista en rizos</span><span class="tag both">Embajadora Phyto Activo</span></p>
      {more('sobre-yeilis', 'Leer más')}
    </div>
  </div>
</section>

<!-- 3 · SERVICIOS DESTACADOS -->
<section class="band" id="servicios">
  <div class="wrap">
    <div class="sec-head rv">
      <div class="stack">
        <p class="eyebrow">Servicios</p>
        <h2 class="h2">Un cuidado para cada <em>textura</em></h2>
      </div>
      {more('servicios', 'Ver todos los servicios')}
    </div>
    <div class="cats">
      <a class="cat star rv" href="@@universo-rizado"><span class="tag">Especialidad</span><h3>Cabello rizado</h3><p>Recuperación del rizo, cortes especializados, definición y tratamientos personalizados.</p><span class="more">Universo Rizado <span aria-hidden="true">→</span></span></a>
      <a class="cat rv" href="@@servicios#liso"><span class="tag plain">Liso</span><h3>Cabello liso</h3><p>Keratina brasileña, botox capilar, alisado, alineación y repolarización.</p><span class="more">Ver servicios <span aria-hidden="true">→</span></span></a>
      <a class="cat rv" href="@@servicios#ambos"><span class="tag both">Rizos y liso</span><h3>Color y mechas</h3><p>Coloración, balayage y mechas para cualquier textura.</p><span class="more">Ver servicios <span aria-hidden="true">→</span></span></a>
      <a class="cat rv" href="@@servicios#ambos"><span class="tag both">Rizos y liso</span><h3>Extensiones y trenzas</h3><p>Largo, volumen y trenzados para cualquier textura.</p><span class="more">Ver servicios <span aria-hidden="true">→</span></span></a>
    </div>
  </div>
</section>

<!-- 4 · UNIVERSO RIZADO -->
<section class="band rizos" id="universo-rizado">
  <div class="wrap rizos-mini">
    <div class="stack rv">
      <p class="eyebrow">La especialidad de la casa</p>
      <h2 class="rizos-title"><span>Universo</span><em>Rizado</em></h2>
      <p class="lead">Aquí el rizo manda. Yeilis lleva más de veinte años estudiando cómo se comporta cada textura, y creó el Programa de Recuperación del Rizo para acompañarte paso a paso.</p>
      <div class="cta-row"><a class="btn btn-line" href="@@universo-rizado">Explorar Universo Rizado</a></div>
    </div>
    <figure class="arch rv">
      <img src="@@/assets/ambiente-rizos.webp" width="1100" height="825" loading="lazy" decoding="async" alt="Imagen de ambiente: melena de rizos definidos">
      <figcaption class="cap">Imagen de ambiente. Se reemplaza por fotos reales del trabajo de Yeilis.</figcaption>
    </figure>
  </div>
</section>

<!-- 5 · GALERÍA DESTACADA -->
<section class="band" id="galeria">
  <div class="wrap">
    <div class="sec-head rv">
      <div class="stack">
        <p class="eyebrow">Antes y después</p>
        <h2 class="h2">Transformaciones <em>reales</em></h2>
      </div>
      {more('galeria', 'Ver galería')}
    </div>
    <div class="ba-grid">
{ba(1, 'Recuperación del rizo')}
{ba(2, 'Corte y definición')}
{ba(3, 'Color en rizos')}
    </div>
    <p style="margin-top:22px"><span class="todo">Pendiente: fotos reales de clientas, con su permiso</span></p>
  </div>
</section>

<!-- 6 · TESTIMONIOS: sección reservada. Se añade aquí cuando Yeilis entregue 2 o 3 reseñas reales de clientas; no se muestran reseñas inventadas. -->

<!-- 7 · ACADEMIA Y TIENDA -->
<section class="band tienda" id="mas">
  <div class="wrap duo">
    <a class="cat rv" href="@@academia"><span class="soon">Próximamente</span><h3>Academia de la Reina de los Rizos</h3><p>Cursos, programas y consultas virtuales para aprender a cuidar tus rizos con la metodología de Yeilis, desde cualquier lugar.</p><span class="more">Conocer la academia <span aria-hidden="true">→</span></span></a>
    <a class="cat rv" href="@@tienda"><span class="tag plain">Catálogo de muestra</span><h3>Tienda</h3><p>Los productos que Yeilis recomienda para continuar el ritual en casa. El catálogo real se publica cuando esté listo.</p><span class="more">Ver la tienda <span aria-hidden="true">→</span></span></a>
  </div>
</section>

<!-- 8 · LLAMADA FINAL -->
{fin()}'''

# ---------------------------------------------------------------- SOBRE YEILIS
SOBRE = phero('Sobre Yeilis', 'Sobre Yeilis', 'Yeilis Armas, <em>la Reina de los Rizos</em>', 'Estilista profesional, especialista en cabello rizado y embajadora internacional de Phyto Activo.') + f'''
<section class="creds" aria-label="Credenciales">
  <div class="wrap">
    <ul>
      <li><b>20+ años</b><span>de experiencia profesional</span></li>
      <li><b>Phyto Activo</b><span>Embajadora internacional</span></li>
      <li><b>Rizos primero</b><span>Su especialidad principal</span></li>
      <li><b>Consulta gratuita</b><span>Siempre con cita</span></li>
    </ul>
  </div>
</section>
<section class="band sobre">
  <div class="wrap sobre-grid">
    <figure class="portrait rv">
      <img src="@@/assets/yeilis-retrato.webp" width="500" height="500" decoding="async" alt="Retrato de Yeilis Armas con sombrero negro y lentes">
    </figure>
    <div class="stack" style="gap:26px">
      <div class="story rv">
        <p class="sign">«Tu cabello, tu corona.»</p>
        <p>Yeilis Armas es estilista profesional con más de 20 años de experiencia. Su pasión es el cabello rizado: recuperarlo, cortarlo, definirlo y darle color. Domina por igual el cabello liso, con keratina brasileña, botox capilar, alisados, alineación y repolarización.</p>
        <p>Es embajadora internacional de la marca brasileña Phyto Activo y organiza eventos para la comunidad de cabello rizado en Miami.</p>
        <p>Desde su suite en Phenix Salon Suites, en Hialeah, trabaja con cita previa para que Miami la conozca por lo que ya es para sus clientas: la Reina de los Rizos.</p>
        <span class="todo">Pendiente: su historia contada con sus propias palabras</span>
      </div>
      <ul class="facts">
        <li class="rv"><b>Más de 20 años</b><span>de experiencia profesional como estilista.</span></li>
        <li class="rv"><b>Especialista en rizos</b><span>Recuperación, corte, definición y color.</span></li>
        <li class="rv"><b>Rizos y liso</b><span>Experiencia profesional en ambas texturas.</span></li>
        <li class="rv"><b>Phyto Activo</b><span>Embajadora internacional de la marca brasileña.</span></li>
        <li class="rv"><b>Comunidad rizada</b><span>Organiza eventos para la comunidad de cabello rizado en Miami.</span></li>
        <li class="rv"><b>Su visión</b><span>Ser reconocida como La Reina de los Rizos de Miami.</span></li>
      </ul>
      <div class="stack rv" style="gap:12px">
        <div class="photos">
          <div class="ph">Foto de Yeilis en el salón</div>
          <div class="ph">Foto de un evento de la comunidad</div>
          <div class="ph">Foto con Phyto Activo</div>
        </div>
        <span class="todo">Pendiente: fotos personales de Yeilis</span>
      </div>
    </div>
  </div>
</section>
''' + fin()

# ---------------------------------------------------------------- SERVICIOS
SERVICIOS = phero('Servicios', 'Servicios', 'Todos los <em>servicios</em>', 'Cada cita empieza por entender tu cabello. Si no sabes cuál elegir, reserva la consulta gratuita y Yeilis te orienta.',
                  f'\n    <div class="cta-row">{reservar_btn("Reservar consulta gratuita", "#svc-consulta")}</div>\n    <span class="todo">Pendiente: precios y duración de cada servicio, confirmados por Yeilis</span>') + f'''
<section class="band rizos">
  <div class="wrap">
    <div class="svc-block" id="rizos">
      <div class="sec-head rv">
        <div class="stack"><p class="eyebrow">Su especialidad</p><h2 class="h2">Cabello <em>rizado</em></h2></div>
        {more('universo-rizado', 'Conocer Universo Rizado')}
      </div>
      <ul class="expert svc-rows">
{rows(RIZOS)}
      </ul>
    </div>
    <div class="svc-block" id="liso">
      <div class="sec-head rv">
        <div class="stack"><p class="eyebrow sage">También en el salón</p><h2 class="h2">Cabello liso</h2></div>
      </div>
      <ul class="expert svc-rows">
{rows(LISO)}
      </ul>
    </div>
    <div class="svc-block" id="ambos">
      <div class="sec-head rv">
        <div class="stack"><p class="eyebrow sage">Para cualquier textura</p><h2 class="h2">Rizos y liso</h2></div>
      </div>
      <ul class="expert svc-rows">
{rows(AMBOS)}
      </ul>
    </div>
  </div>
</section>
''' + fin()

# ---------------------------------------------------------------- UNIVERSO RIZADO
UNIVERSO = f'''<section class="band rizos" style="padding-top:clamp(22px,3vw,40px)">
  <div class="wrap">
    <p class="crumb"><a href="@@home">Inicio</a><span aria-hidden="true">/</span><span>Universo Rizado</span></p>
    <div class="rizos-top" style="margin-top:10px">
      <div class="stack">
        <p class="eyebrow">La especialidad de la casa</p>
        <h1 class="rizos-title"><span>Universo</span><em>Rizado</em></h1>
        <p class="lead">Aquí el rizo manda. Yeilis lleva más de veinte años estudiando cómo se comporta cada textura: cómo se corta, cómo se hidrata, cómo se define y cómo recupera su forma. Cada servicio empieza por entender tu cabello.</p>
        <div class="cta-row">{reservar_btn("Agenda tu consulta gratuita", "#svc-consulta")}</div>
      </div>
      <figure class="arch">
        <img src="@@/assets/ambiente-rizos.webp" width="1100" height="825" decoding="async" alt="Imagen de ambiente: melena de rizos definidos">
        <figcaption class="cap">Imagen de ambiente. Se reemplaza por fotos reales del trabajo de Yeilis.</figcaption>
      </figure>
    </div>
    <ul class="expert svc-rows">
{rows(RIZOS)}
    </ul>
  </div>
</section>

<section class="band programa" id="programa">
  <div class="wrap">
    <div class="prog-head rv">
      {CROWN}
      <p class="eyebrow">Programa insignia</p>
      <h2>Programa de Recuperación del Rizo</h2>
      <p class="by">By La Reina de los Rizos</p>
      <p class="lead">Recuperar un rizo no es un servicio de un día: es un recorrido. Yeilis lo diseña para ti según el punto de partida de tu cabello, tu historial y tu rutina, y te acompaña en cada etapa.</p>
    </div>
    <ol class="journey">
      <li class="rv"><h3>Consulta gratuita</h3><p>Una primera cita, sin costo, para conversar sobre tu cabello y lo que quieres lograr.</p></li>
      <li class="rv"><h3>Evaluación</h3><p>Yeilis observa el estado actual de tu cabello y de tu rizo para entender por dónde empezar.</p></li>
      <li class="rv"><h3>Plan personalizado</h3><p>Un plan de cuidado en el salón y en casa, pensado solo para tu cabello.</p></li>
      <li class="rv"><h3>Acompañamiento</h3><p>Citas de seguimiento para ajustar el plan según cómo responde tu cabello.</p></li>
    </ol>
    <div class="prog-foot rv">
      {reservar_btn("Reserva tu consulta", "#svc-consulta")}
      <small>Cada cabello es distinto y cada recorrido también. El plan y sus tiempos se definen en la consulta.</small>
      <span class="todo">Pendiente: Yeilis valida las etapas y el texto de su método</span>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="sec-head rv">
      <div class="stack"><p class="eyebrow">Antes y después</p><h2 class="h2">Rizos que vuelven a su <em>forma</em></h2></div>
      {more('galeria', 'Ver galería')}
    </div>
    <div class="ba-grid">
{ba(1, 'Recuperación del rizo')}
{ba(2, 'Corte y definición')}
{ba(3, 'Color en rizos')}
    </div>
    <p style="margin-top:22px"><span class="todo">Pendiente: fotos reales de clientas, con su permiso</span></p>
  </div>
</section>
''' + fin()

# ---------------------------------------------------------------- GALERÍA
GALERIA = phero('Galería', 'Galería', 'Antes y <em>después</em>', 'Aquí se mostrará el trabajo de Yeilis: transformaciones reales de sus clientas, con su permiso. Desliza cada imagen para comparar.',
                '\n    <span class="todo">Pendiente: fotos reales. Los marcos de abajo son espacios reservados, no resultados.</span>') + f'''
<section class="band">
  <div class="wrap">
    <div class="sec-head rv"><div class="stack"><p class="eyebrow">Universo Rizado</p><h2 class="h2">Cabello <em>rizado</em></h2></div></div>
    <div class="ba-grid">
{ba(1, 'Recuperación del rizo')}
{ba(2, 'Corte y definición')}
{ba(3, 'Color en rizos')}
    </div>
    <div class="sec-head rv" style="margin-top:clamp(40px,5vw,64px)"><div class="stack"><p class="eyebrow sage">También en el salón</p><h2 class="h2">Cabello liso y color</h2></div></div>
    <div class="ba-grid">
{ba(4, 'Alisado')}
{ba(5, 'Color y mechas')}
{ba(6, 'Extensiones')}
    </div>
  </div>
</section>
''' + fin()

# ---------------------------------------------------------------- ACADEMIA
ACADEMIA = phero('Academia', 'Academia', 'Academia de la Reina de los <em>Rizos</em>', 'El próximo capítulo de la marca. Yeilis quiere enseñar a mujeres de todo el mundo a cuidar y recuperar su cabello rizado con su propia metodología, desde cualquier lugar.',
                 '\n    <span class="soon">Próximamente</span>') + '''
<section class="band academia">
  <div class="wrap aca-grid">
    <div class="stack aca-id rv">
      <h2 class="h2">Lo que <em>viene</em></h2>
      <p class="lead">La academia todavía no está abierta. Esta página muestra cómo se presentará cada formato cuando Yeilis lo lance.</p>
      <div class="cta-row"><button class="btn btn-line" type="button" data-toast="Lista de espera de demostración. En el sitio final aquí podrás dejar tu correo para enterarte del lanzamiento.">Quiero enterarme primero</button></div>
      <span class="todo">Pendiente: contenidos, fechas y precios definidos por Yeilis</span>
    </div>
    <ul class="offers">
      <li class="offer rv"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M10 9.5v4l3.5-2z"/><path d="M8 21h8"/></svg></span><div><h3>Cursos online</h3><p>Clases en video para aprender a cuidar tus rizos paso a paso.</p></div><span class="tag">Próximamente</span></li>
      <li class="offer rv"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.5V16c1.5 1.5 3.2 2 5 2s3.500-.5 5-2v-4.500"/><path d="M21 9v6"/></svg></span><div><h3>Programas educativos</h3><p>Formación más profunda en la metodología de Yeilis.</p></div><span class="tag">Próximamente</span></li>
      <li class="offer rv"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.500l5-3v9l-5-3z"/></svg></span><div><h3>Consultas virtuales privadas</h3><p>Una sesión uno a uno con Yeilis, estés donde estés.</p></div><span class="tag">Próximamente</span></li>
      <li class="offer rv"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h7"/></svg></span><div><h3>Guías digitales</h3><p>Guías descargables para tu rutina en casa.</p></div><span class="tag">Próximamente</span></li>
      <li class="offer rv"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16l-1.500-10-4.500 4-2-7-2 7-4.500-4z"/><path d="M4 21h16"/></svg></span><div><h3>Membresías</h3><p>Una comunidad con contenido nuevo y acompañamiento continuo.</p></div><span class="tag both">A futuro</span></li>
    </ul>
  </div>
</section>
''' + fin('Mientras tanto, empieza <em>en el salón</em>', 'La mejor primera clase es una consulta con Yeilis sobre tu propio cabello.')

# ---------------------------------------------------------------- TIENDA
TIENDA = phero('Tienda', 'Tienda en línea', 'El ritual sigue <em>en casa</em>', 'Los productos que Yeilis recomienda, organizados por lo que tu cabello necesita. Así se verá el catálogo cuando ella lo entregue.',
               '\n    <span class="todo">Catálogo de muestra: los productos, fotos y precios reales están pendientes</span>') + '''
<section class="band tienda">
  <div class="wrap">
    <div class="filters" id="filters" role="group" aria-label="Filtrar productos por categoría" style="margin-top:0"></div>
    <div class="prods" id="prods"></div>
    <div class="shop-note rv">
      <span class="tag plain">Productos de muestra</span>
      <span class="tag plain">Pago en línea: se conecta en la siguiente fase</span>
    </div>
  </div>
</section>
''' + fin()

# ---------------------------------------------------------------- CONTACTO
CONTACTO = phero('Contacto', 'Contacto', 'Visítanos en <em>Hialeah</em>', 'Yeilis atiende únicamente con cita previa. La forma más rápida de verla es reservar tu consulta gratuita.',
                 f'\n    <div class="cta-row">{reservar_btn()}</div>') + '''
<section class="band">
  <div class="wrap">
    <div class="contact">
      <div class="cat rv"><span class="tag">Dirección</span><p class="val">Yeilis AR Beauty<br>Phenix Salon Suites, Suite 137<br>Hialeah, Florida</p><span class="todo">Pendiente: calle y número</span></div>
      <div class="cat rv"><span class="tag">Horario de citas</span><p class="val">Lunes a domingo<br>11:30 a.&nbsp;m. – 11:30 p.&nbsp;m.</p><p>Según la disponibilidad de su agenda. Solo con cita previa.</p></div>
      <div class="cat rv"><span class="tag both">Teléfono y WhatsApp</span><p class="val">Por confirmar</p><span class="todo">Pendiente: número de Yeilis</span></div>
      <div class="cat rv"><span class="tag both">Redes sociales</span><p class="val">Por confirmar</p><span class="todo">Pendiente: Instagram y otras redes</span></div>
      <div class="cat rv"><span class="tag both">Correo</span><p class="val">Por confirmar</p><span class="todo">Pendiente: correo de contacto</span></div>
      <div class="cat rv"><span class="tag plain">Formulario de consultas</span><p>Se activará cuando haya un correo donde recibir los mensajes. Por ahora no se muestra un formulario que no envía nada.</p></div>
    </div>
  </div>
</section>
''' + fin()

# ---------------------------------------------------------------- RESERVAR
RESERVAR = f'''<main class="rsv">
  <div class="wrap">
    <div class="rsv-head">
      <p class="crumb"><a href="@@home">Inicio</a><span aria-hidden="true">/</span><span>Reservar cita</span></p>
      <p class="eyebrow">Citas en línea</p>
      <h1>Reserva tu <em>cita</em></h1>
      <p class="lead">Yeilis atiende únicamente con cita previa, de lunes a domingo, de 11:30 a.&nbsp;m. a 11:30 p.&nbsp;m., según la disponibilidad de su agenda. La consulta es gratuita, pero también se agenda.</p>
      <p class="rsv-notice"><span class="demo-pill">Demostración</span><span>Esta página muestra cómo será la reserva. Todavía no está conectada a un sistema de citas: no se reserva nada, no se cobra nada y tus datos no se envían.</span></p>
    </div>

    <div class="rsv-grid">
      <form class="booker" id="rsv" novalidate>
        <ol class="rsv-steps" id="steps" aria-label="Pasos de la reserva">
          <li><button type="button" data-go="1"><i>1</i><span>Servicio</span></button></li>
          <li><button type="button" data-go="2"><i>2</i><span>Fecha y hora</span></button></li>
          <li><button type="button" data-go="3"><i>3</i><span>Tus datos</span></button></li>
        </ol>

        <section class="rsv-panel" data-step="1" aria-labelledby="t1">
          <h2 id="t1" tabindex="-1">¿Qué servicio necesitas?</h2>
          <p>Si no estás segura, empieza por la consulta gratuita.</p>
          <div id="svc-groups" class="stack" style="gap:22px"></div>
          <span class="todo">Pendiente: duración, precios y depósito de cada servicio</span>
        </section>

        <section class="rsv-panel" data-step="2" aria-labelledby="t2" hidden>
          <h2 id="t2" tabindex="-1">Elige el día y la hora</h2>
          <fieldset class="rsv-group">
            <legend><span>Fecha</span></legend>
            <div class="days" id="day-opts"></div>
          </fieldset>
          <fieldset class="rsv-group">
            <legend><span>Hora</span><i>Horarios de ejemplo</i></legend>
            <div class="times" id="time-opts"></div>
          </fieldset>
          <p class="rsv-privacy" style="margin-top:0">En el sitio final aquí solo aparecerán los horarios que Yeilis tenga realmente libres.</p>
        </section>

        <section class="rsv-panel" data-step="3" aria-labelledby="t3" hidden>
          <h2 id="t3" tabindex="-1">Tus datos</h2>
          <p>Para que Yeilis pueda confirmar tu cita y prepararse para recibirte.</p>
          <div class="fields">
            <div class="field">
              <label for="f-nombre">Nombre y apellido</label>
              <input id="f-nombre" name="nombre" type="text" autocomplete="name" aria-describedby="e-nombre">
              <span class="err" id="e-nombre" hidden></span>
            </div>
            <div class="field">
              <label for="f-tel">Teléfono o WhatsApp</label>
              <input id="f-tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" aria-describedby="e-tel">
              <span class="err" id="e-tel" hidden></span>
            </div>
            <div class="field">
              <label for="f-mail">Correo electrónico <small>(opcional)</small></label>
              <input id="f-mail" name="mail" type="email" autocomplete="email" aria-describedby="e-mail">
              <span class="err" id="e-mail" hidden></span>
            </div>
            <div class="field">
              <label for="f-pelo">Tu tipo de cabello</label>
              <select id="f-pelo" name="pelo">
                <option>Rizado</option>
                <option>Ondulado</option>
                <option>Liso</option>
                <option>No estoy segura</option>
              </select>
            </div>
            <div class="field wide">
              <label for="f-nota">Cuéntale a Yeilis sobre tu cabello <small>(opcional)</small></label>
              <textarea id="f-nota" name="nota" rows="3" placeholder="Por ejemplo: tratamientos anteriores, lo que te gustaría lograr…"></textarea>
            </div>
          </div>
          <p class="rsv-privacy">En esta demostración tus datos se quedan en tu pantalla: no se envían ni se guardan.</p>
        </section>

        <section class="rsv-panel rsv-end" data-step="4" aria-labelledby="t4" hidden>
          <span class="demo-pill">Demostración</span>
          <h2 id="t4" tabindex="-1">Aquí termina la demostración</h2>
          <p style="margin-top:0">Esta es la solicitud que llegaría a la agenda de Yeilis cuando el sistema de citas esté conectado.</p>
          <dl>
            <dt>Servicio</dt><dd data-out="svc"></dd>
            <dt>Fecha</dt><dd data-out="day"></dd>
            <dt>Hora</dt><dd data-out="time"></dd>
            <dt>Nombre</dt><dd data-out="nombre"></dd>
            <dt>Contacto</dt><dd data-out="contacto"></dd>
            <dt>Cabello</dt><dd data-out="pelo"></dd>
          </dl>
          <p class="demo-msg" role="status" style="margin-top:0">No se ha reservado ninguna cita ni se ha cobrado ningún pago, y tus datos no se enviaron. En el sitio final, este paso confirmará la disponibilidad real, cobrará el depósito y enviará la confirmación.</p>
        </section>

        <div class="rsv-actions">
          <button class="btn btn-line" type="button" id="prev">Atrás</button>
          <button class="btn btn-rose" type="submit" id="next">Continuar {ARR}</button>
        </div>
      </form>

      <aside class="rsv-side" aria-label="Resumen de la cita">
        <div class="rsv-card">
          <h2>Tu cita</h2>
          <dl>
            <dt>Servicio</dt><dd id="s-svc">—</dd>
            <dt>Fecha</dt><dd id="s-day">—</dd>
            <dt>Hora</dt><dd id="s-time">—</dd>
            <dt>Depósito</dt><dd id="s-dep">—</dd>
            <dt>Lugar</dt><dd>Phenix Salon Suites, Suite 137<br>Hialeah, Florida</dd>
          </dl>
        </div>
        <div class="rsv-card">
          <h2>En el sitio final</h2>
          <ul class="res-list">
            <li>Verás solo los horarios realmente disponibles.</li>
            <li>Podrás pagar el depósito de tu cita.</li>
            <li>Recibirás confirmación y recordatorios.</li>
            <li>Yeilis gestionará todo desde un solo calendario.</li>
          </ul>
          <span class="todo">Pendiente: conectar Square Appointments</span>
        </div>
      </aside>
    </div>
  </div>
</main>'''

# ---------------------------------------------------------------- PENDIENTES (página de la propuesta, fuera del menú)
PENDIENTES = phero('Pendientes', 'Para completar el sitio', 'Lo que necesitamos de ti, <em>Yeilis</em>', 'Esta propuesta usa tu logo y tu foto reales. Todo lo marcado en verde en el sitio es un espacio reservado que se llena con tu material.') + '''
<section class="band pend">
  <div class="wrap">
    <ul class="pend-grid" style="margin-top:0">
      <li class="rv"><b>Logo y fotos originales</b><span>Archivo original del logo con fondo transparente y fotos en alta resolución, sin texto encima.</span></li>
      <li class="rv"><b>Antes y después</b><span>Fotos reales de clientas, con su autorización para publicarlas.</span></li>
      <li class="rv"><b>Reseñas reales</b><span>Dos o tres testimonios de clientas, con su nombre y permiso. Hasta entonces la sección de testimonios no se muestra.</span></li>
      <li class="rv"><b>Servicios y precios</b><span>Lista final de servicios, duración, precios y monto del depósito.</span></li>
      <li class="rv"><b>Cuenta de Square</b><span>Acceso para configurar servicios, horarios, depósitos y recordatorios.</span></li>
      <li class="rv"><b>Catálogo de productos</b><span>Nombres, fotos, descripciones, precios e inventario.</span></li>
      <li class="rv"><b>Contacto y redes</b><span>Teléfono, WhatsApp, correo, Instagram y dirección completa del salón.</span></li>
      <li class="rv"><b>Tu historia</b><span>Tu trayectoria contada con tus palabras y fotos personales para la página Sobre Yeilis.</span></li>
      <li class="rv"><b>Academia</b><span>Contenidos, formatos, fechas y precios cuando decidas lanzarla.</span></li>
    </ul>
  </div>
</section>'''

PAGES = [
    # slug, <title>, descripción, cuerpo, elemento de menú activo
    ('home', 'Yeilis AR Beauty', 'Yeilis AR Beauty, La Reina de los Rizos de Miami. Especialista en cabello rizado en Hialeah, Florida. Propuesta de diseño.', HOME, 'home'),
    ('sobre-yeilis', 'Sobre Yeilis · Yeilis AR Beauty', 'La historia y la experiencia de Yeilis Armas, especialista en cabello rizado.', SOBRE, 'sobre-yeilis'),
    ('servicios', 'Servicios · Yeilis AR Beauty', 'Todos los servicios de Yeilis AR Beauty para cabello rizado y liso.', SERVICIOS, 'servicios'),
    ('universo-rizado', 'Universo Rizado · Yeilis AR Beauty', 'La especialidad de Yeilis: cabello rizado y el Programa de Recuperación del Rizo.', UNIVERSO, 'universo-rizado'),
    ('galeria', 'Galería · Yeilis AR Beauty', 'Galería de antes y después de Yeilis AR Beauty.', GALERIA, 'galeria'),
    ('academia', 'Academia · Yeilis AR Beauty', 'Academia de la Reina de los Rizos, próximamente.', ACADEMIA, 'academia'),
    ('tienda', 'Tienda · Yeilis AR Beauty', 'Tienda de productos recomendados por Yeilis. Catálogo de muestra.', TIENDA, 'tienda'),
    ('reservar', 'Reservar cita · Yeilis AR Beauty', 'Demostración de la reserva de citas en línea de Yeilis AR Beauty.', RESERVAR, 'reservar'),
    ('contacto', 'Contacto · Yeilis AR Beauty', 'Dirección, horario y contacto de Yeilis AR Beauty en Hialeah, Florida.', CONTACTO, 'contacto'),
    ('pendientes', 'Pendientes · Yeilis AR Beauty', 'Material pendiente para completar el sitio de Yeilis AR Beauty.', PENDIENTES, ''),
]


def chrome(body, current):
    cur = lambda p: ' aria-current="page"' if p == current else ''
    main = '\n'.join(f'      <a href="@@{p}"{cur(p)}>{t}</a>' for p, t in NAV_MAIN)
    sub = '\n'.join(f'          <a href="@@{p}"{cur(p)}>{t}</a>' for p, t in NAV_MORE)
    has = ' has-current' if current in dict(NAV_MORE) else ''
    foot_nav = '\n'.join(f'          <li><a href="@@{p}">{t}</a></li>' for p, t in NAV_MAIN[1:] + NAV_MORE)
    inner = body if body.lstrip().startswith('<main') else f'<main>\n{body}\n</main>'
    return f'''<div class="concept"><div class="wrap">Propuesta de diseño · Demostración para Yeilis AR Beauty · Aún no es el sitio oficial · <a href="@@pendientes">Qué falta</a></div></div>

<header class="head">
  <div class="wrap">
    <a class="brand" href="@@home" aria-label="Yeilis AR Beauty, inicio">
      <!-- LOGO: reemplazar assets/logo-ya.webp por el logo original con fondo transparente (PNG o SVG) y quitar mix-blend-mode de .brand img y .foot-brand img. -->
      <img src="@@/assets/logo-ya.webp" width="288" height="264" alt="Logo YA de Yeilis Armas">
      <span><b>Yeilis AR Beauty</b><small>La Reina de los Rizos</small></span>
    </a>
    <nav class="nav" id="nav" aria-label="Navegación principal">
{main}
      <div class="nav-more{has}">
        <button type="button" aria-expanded="false" aria-controls="nav-sub">Más</button>
        <div class="nav-sub" id="nav-sub">
{sub}
        </div>
      </div>
      <a class="btn btn-rose nav-cta" href="@@reservar"{cur('reservar')}>Reservar cita</a>
    </nav>
    <a class="btn btn-rose btn-sm head-cta" href="@@reservar"{cur('reservar')}><span>Reservar<span class="xs-hide"> cita</span></span></a>
    <button class="burger" id="burger" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav"><i></i><i></i></button>
  </div>
</header>

{inner}

<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <img src="@@/assets/logo-ya.webp" width="288" height="264" loading="lazy" alt="Logo YA de Yeilis Armas">
        <p>La Reina de los Rizos de Miami.<br>Tu cabello, tu corona.</p>
      </div>
      <div>
        <h4>Visítanos</h4>
        <p>Yeilis AR Beauty<br>Phenix Salon Suites, Suite 137<br>Hialeah, Florida</p>
      </div>
      <div>
        <h4>Citas</h4>
        <p>Lunes a domingo<br>11:30 a.&nbsp;m. – 11:30 p.&nbsp;m.<br>Solo con cita previa</p>
      </div>
      <div>
        <h4>Contacto</h4>
        <p>Teléfono, WhatsApp y redes sociales: por confirmar.</p>
        <p><a class="more" href="@@contacto">Ver contacto <span aria-hidden="true">→</span></a></p>
      </div>
      <div>
        <h4>Explora</h4>
        <ul>
{foot_nav}
          <li><a href="@@reservar">Reservar cita</a></li>
        </ul>
      </div>
    </div>
    <div class="legal">
      <span>© <span id="yr">2026</span> Yeilis AR Beauty · Propuesta de diseño, no es el sitio oficial.</span>
      <span>Las funciones de reserva, tienda y academia son demostraciones.</span>
    </div>
  </div>
</footer>

<div class="toast" id="toast" role="status" aria-live="polite"></div>'''


FONTS = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600&family=Jost:wght@300..600&display=swap">'''


def resolve(html, slug):
    root = '' if slug == 'home' else '../'
    idx = 'index.html' if PREVIEW else ''

    def sub(m):
        name, frag = m.group(1), m.group(2) or ''
        if name.startswith('/'):
            return root + name[1:]
        if name == 'home':
            return ((root or './') if not PREVIEW else root) + idx + frag
        return root + name + '/' + idx + frag
    return re.sub(r'@@([\w/.-]+?)(#[\w-]+)?(?=")', sub, html)


def render(slug, title, desc, body, current):
    css = open(os.path.join(SITE, 'assets', 'site.css')).read()
    js = open(os.path.join(SITE, 'assets', 'site.js')).read()
    if PREVIEW:
        style, script = f'<style>\n{css}\n</style>', f'<script>\n{js}\n</script>'
    else:
        style, script = '<link rel="stylesheet" href="@@/assets/site.css">', '<script src="@@/assets/site.js" defer></script>'
    head = f'''<title>{title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#070506">
<meta name="description" content="{desc}">
{FONTS}
{style}'''
    content = f'{chrome(body, current)}\n\n{script}\n'
    if PREVIEW and slug == 'home':   # la página principal de la vista previa va sin envoltorio de documento
        doc = head + '\n' + content
    else:
        doc = f'<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n{head}\n</head>\n<body>\n{content}</body>\n</html>\n'
    return resolve(doc, slug)


out_root = PREVIEW or SITE
for slug, title, desc, body, current in PAGES:
    d = out_root if slug == 'home' else os.path.join(out_root, slug)
    os.makedirs(d, exist_ok=True)
    html = render(slug, title, desc, body, current)
    assert '@@' not in html, (slug, re.findall(r'@@[^"]*', html)[:3])
    open(os.path.join(d, 'index.html'), 'w').write(html)
print('páginas:', len(PAGES), '->', out_root)
