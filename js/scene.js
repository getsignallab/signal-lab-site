/* Signal Lab — hero 3D scene ("noise becomes signal").
   Loaded with `defer`. It never blocks the page: the headline and call to action are
   plain HTML, and this file only starts after the page has finished loading.

   Quality ladder (steps down in place, never rebuilds the WebGL context):
     balanced  default on every device
     light     fewer particles, lower resolution, baked chrome
     still     one frame drawn, then nothing animates
   Devices without WebGL, with data-saver on, or that fail to load the library get the
   still image in the markup instead (html.scene-still). */
(function () {
  'use strict';

  var hero = document.querySelector('[data-scene]');
  if (!hero) return;
  var canvas = hero.querySelector('canvas');
  var root = document.documentElement;
  var VENDOR = '/js/vendor/three-r128.min.js';

  function useStillImage() { root.classList.add('scene-still'); root.classList.remove('scene-live'); }

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  var connection = navigator.connection;
  if (!canvas || (connection && connection.saveData) || !hasWebGL()) { useStillImage(); return; }

  function loadLibrary() {
    var s = document.createElement('script');
    s.src = VENDOR;
    s.onload = function () { try { measureCeiling(start); } catch (e) { useStillImage(); } };
    s.onerror = useStillImage;
    document.head.appendChild(s);
  }
  function whenIdle(fn) { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 }); else setTimeout(fn, 200); }
  if (document.readyState === 'complete') whenIdle(loadLibrary);
  else window.addEventListener('load', function () { whenIdle(loadLibrary); });

  /* Time 20 empty frames to learn the frame rate the browser allows here, so the
     step-down logic never chases a rate the browser itself is capping. */
  var ceiling = 60;
  function measureCeiling(done) {
    var gaps = [], prev = 0;
    function probe(now) {
      if (prev) gaps.push(now - prev);
      prev = now;
      if (gaps.length < 20) { requestAnimationFrame(probe); return; }
      gaps.sort(function (a, b) { return a - b; });
      ceiling = Math.round(1000 / gaps[10]);
      done();
    }
    requestAnimationFrame(probe);
  }

  function start() {
    var THREE = window.THREE;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = window.matchMedia('(max-width:760px)').matches;
    var BALANCED = { particles: small ? 5000 : 14000, dpr: small ? 1.25 : 1.5 };
    var LIGHT = { particles: small ? 2500 : 7000, dpr: 1 };
    var REFERENCE = small ? 9000 : 26000;   // density the particle size was designed at
    var level = 'balanced';

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch (e) { useStillImage(); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, BALANCED.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x05061A, 1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    /* Lit backdrop, drawn in the scene so the canvas can stay opaque. Matches the CSS gradient. */
    var backdrop = { uC: { value: new THREE.Vector2(0.73, 0.54) }, uA: { value: 1 } };
    var bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, uniforms: backdrop,
      vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader: 'varying vec2 vU;uniform vec2 uC;uniform float uA;void main(){vec2 d=(vU-uC)*vec2(uA,1.0);float r=length(d);vec3 col=mix(vec3(0.106,0.082,0.44),vec3(0.047,0.059,0.235),smoothstep(0.0,0.42,r));col=mix(col,vec3(0.02,0.024,0.102),smoothstep(0.25,0.85,r));gl_FragColor=vec4(col,1.0);}'
    }));
    bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

    /* Lighting studio, rendered once into a reflection map: a dark room with a cobalt
       key, an ultraviolet rim, a lime kicker and three hard white strips. The contrast
       between dark and bright is what makes the metal read as chrome. */
    var studio = new THREE.Scene();
    studio.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: [
        'varying vec3 vP;',
        'float lobe(vec3 d,vec3 a,float k){return pow(max(dot(d,normalize(a)),0.0),k);}',
        'void main(){vec3 d=normalize(vP);',
        ' vec3 c=vec3(0.006,0.008,0.035);',
        ' c+=vec3(0.07,0.17,1.0)*1.5*lobe(d,vec3(-1.0,0.25,0.55),3.0);',
        ' c+=vec3(0.42,0.12,1.0)*1.3*lobe(d,vec3(1.0,0.45,-0.35),3.5);',
        ' c+=vec3(0.20,0.06,0.55)*0.7*lobe(d,vec3(0.0,-1.0,-0.2),2.0);',
        ' c+=vec3(0.78,1.0,0.18)*1.6*lobe(d,vec3(0.35,-0.75,0.6),26.0);',
        ' c*=0.55+0.45*smoothstep(-0.2,0.2,sin(d.y*26.0+d.x*5.0));',
        ' gl_FragColor=linearToOutputTexel(vec4(c,1.0));}'
      ].join('\n')
    })));
    function strip(hex, power, w, h, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m);
    }
    strip(0xffffff, 14, 9, 0.5, -3, 13, 4);
    strip(0xffffff, 10, 0.45, 12, 9, 2, 11);
    strip(0xdfe6ff, 6, 0.3, 9, -8, -3, 12);
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envMap = pmrem.fromScene(studio, 0).texture;
    pmrem.dispose();

    /* The signal: one closed chrome ribbon with three half-twists. */
    function curve(u) { return new THREE.Vector3(2.7 * Math.cos(u), 1.15 * Math.sin(2 * u), 1.45 * Math.sin(u)); }
    function buildRibbon(seg, around) {
      var pts = [], tan = [], i, j;
      for (i = 0; i <= seg; i++) { var u = i / seg * Math.PI * 2; pts.push(curve(u)); tan.push(curve(u + 0.0005).sub(curve(u - 0.0005)).normalize()); }
      var n = new THREE.Vector3(0, 1, 0).cross(tan[0]).normalize(), norms = [n.clone()];
      for (i = 1; i <= seg; i++) {
        var axis = new THREE.Vector3().crossVectors(tan[i - 1], tan[i]), len = axis.length();
        if (len > 1e-7) { axis.multiplyScalar(1 / len); n.applyAxisAngle(axis, Math.asin(Math.min(1, len))); }
        n.sub(tan[i].clone().multiplyScalar(n.dot(tan[i]))).normalize(); norms.push(n.clone());
      }
      var b0 = new THREE.Vector3().crossVectors(tan[0], norms[0]);
      var drift = Math.atan2(norms[seg].dot(b0), norms[seg].dot(norms[0]));   // frame mismatch where the loop closes
      var total = 3 * Math.PI - drift;
      var pos = new Float32Array((seg + 1) * around * 3), idx = [];
      for (i = 0; i <= seg; i++) {
        var uu = i / seg, T = tan[i], N = norms[i].clone().applyAxisAngle(T, total * uu), B = new THREE.Vector3().crossVectors(T, N);
        var w = 0.5 + 0.2 * Math.sin(uu * Math.PI * 4 + 0.8), th = 0.045;
        for (j = 0; j < around; j++) {
          var a = j / around * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a);
          var x = w * Math.sign(cx) * Math.pow(Math.abs(cx), 0.3), y = th * Math.sign(sy) * Math.pow(Math.abs(sy), 0.55);
          var k = (i * around + j) * 3;
          pos[k] = pts[i].x + N.x * x + B.x * y; pos[k + 1] = pts[i].y + N.y * x + B.y * y; pos[k + 2] = pts[i].z + N.z * x + B.z * y;
        }
      }
      for (i = 0; i < seg; i++) for (j = 0; j < around; j++) {
        var a0 = i * around + j, a1 = i * around + (j + 1) % around, b1 = (i + 1) * around + j, b2 = (i + 1) * around + (j + 1) % around;
        idx.push(a0, a1, b1, a1, b2, b1);
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    }
    var holder = new THREE.Group(); scene.add(holder);
    var chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.045, envMap: envMap, envMapIntensity: 1.0 });
    var ribbon = new THREE.Mesh(buildRibbon(small ? 200 : 360, small ? 12 : 18), chrome);
    holder.add(ribbon);

    /* Particles: four formations (noise, signal, structure, performance), morphed on the
       graphics card. In the signal state each particle travels a helix around the ribbon's
       own curve. The list is in random order, so drawing a prefix is an even subsample. */
    var N = BALANCED.particles, seed = 20261113;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var T = [], L = [], s, i, j;
    for (s = 0; s < 4; s++) { T.push(new Float32Array(N * 3)); L.push(new Float32Array(N)); }
    var flow = new Float32Array(N * 3), bars = [1.0, 1.5, 1.35, 2.1, 2.7, 3.3, 4.2], barVol = bars.reduce(function (a, b) { return a + b; }, 0);
    for (i = 0; i < N; i++) {
      j = i * 3;
      T[0][j] = (rnd() - 0.5) * 26; T[0][j + 1] = (rnd() - 0.5) * 12; T[0][j + 2] = (rnd() - 0.5) * 10;
      var rad = 0.16 + Math.pow(rnd(), 1.7) * 1.5;
      flow[j] = rnd() * 6.2832; flow[j + 1] = rnd() * 6.2832; flow[j + 2] = rad; L[1][i] = rad < 0.4 ? 1 : 0;
      var gx = Math.floor(rnd() * 22), gy = Math.floor(rnd() * 12), gz = Math.floor(rnd() * 6);
      T[2][j] = (gx - 10.5) * 0.44 + (rnd() - 0.5) * 0.03; T[2][j + 1] = (gy - 5.5) * 0.44 + (rnd() - 0.5) * 0.03; T[2][j + 2] = (gz - 2.5) * 0.44 + (rnd() - 0.5) * 0.03;
      L[2][i] = (gx + gy + gz) % 9 === 0 ? 1 : 0;
      var pick = rnd() * barVol, b = 0; while (pick > bars[b]) { pick -= bars[b]; b++; }
      var hgt = rnd() * bars[b];
      T[3][j] = (b - 3) * 0.92 + (rnd() - 0.5) * 0.56; T[3][j + 1] = -2.2 + hgt; T[3][j + 2] = (rnd() - 0.5) * 0.56;
      L[3][i] = hgt > bars[b] - 0.09 ? 1 : 0;
    }
    var rand = new Float32Array(N); for (i = 0; i < N; i++) rand[i] = rnd();
    var geo = new THREE.BufferGeometry();
    var aFrom = new THREE.BufferAttribute(new Float32Array(T[0]), 3), aTo = new THREE.BufferAttribute(new Float32Array(T[0]), 3);
    var lFrom = new THREE.BufferAttribute(new Float32Array(L[0]), 1), lTo = new THREE.BufferAttribute(new Float32Array(L[0]), 1);
    geo.setAttribute('position', aTo); geo.setAttribute('aFrom', aFrom); geo.setAttribute('aTo', aTo);
    geo.setAttribute('aLimeFrom', lFrom); geo.setAttribute('aLimeTo', lTo);
    geo.setAttribute('aFlow', new THREE.BufferAttribute(flow, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    var sizeK = 1;   // shrinks the points with the ribbon on small stages, set in resize()
    function pointScale(count) { return dpr * sizeK * Math.min(Math.sqrt(REFERENCE / count), 1.7); }   // fewer particles are drawn larger
    var uniforms = { uMix: { value: 1 }, uTime: { value: 0 }, uOrder: { value: 0 }, uPx: { value: pointScale(N) }, uFlowFrom: { value: 0 }, uFlowTo: { value: 0 } };
    var points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [
        'attribute vec3 aFrom;attribute vec3 aTo;attribute vec3 aFlow;attribute float aRand;attribute float aLimeFrom;attribute float aLimeTo;',
        'uniform float uMix;uniform float uTime;uniform float uOrder;uniform float uPx;uniform float uFlowFrom;uniform float uFlowTo;',
        'varying float vLime;varying float vRand;',
        'void main(){',
        ' float t=clamp(uMix*1.7-aRand*0.7,0.0,1.0);t=t*t*(3.0-2.0*t);',
        ' float u=aFlow.x+uTime*(0.05+aRand*0.07);',
        ' vec3 c=vec3(2.7*cos(u),1.15*sin(2.0*u),1.45*sin(u));',
        ' vec3 tg=normalize(vec3(-2.7*sin(u),2.3*cos(2.0*u),1.45*cos(u)));',
        ' vec3 nn=normalize(cross(tg,vec3(0.0,1.0,0.0)));vec3 bb=cross(tg,nn);',
        ' float ph=aFlow.y+u*3.0;',
        ' vec3 fl=c+aFlow.z*(cos(ph)*nn+sin(ph)*bb);',
        ' vec3 p=mix(mix(aFrom,fl,uFlowFrom),mix(aTo,fl,uFlowTo),t);',
        ' float d=mix(0.6,0.03,uOrder);',
        ' p+=d*vec3(sin(uTime*0.35+aRand*43.0),cos(uTime*0.29+aRand*31.0),sin(uTime*0.23+aRand*17.0));',
        ' vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;',
        ' vLime=mix(aLimeFrom,aLimeTo,t);vRand=fract(aRand*7.31);',
        ' gl_PointSize=uPx*(0.7+aRand*1.0+vLime*0.4)*(30.0/-mv.z);',
        '}'].join('\n'),
      fragmentShader: [
        'varying float vLime;varying float vRand;',
        'void main(){',
        ' float a=smoothstep(0.5,0.08,length(gl_PointCoord-0.5));',
        ' vec3 cool=mix(vec3(0.16,0.30,1.0),vec3(0.50,0.24,1.0),vRand);',
        ' vec3 col=mix(cool,vec3(0.78,1.0,0.18),vLime);',
        ' gl_FragColor=vec4(col,a*mix(0.6,0.95,vLime));',
        '}'].join('\n')
    }));
    points.frustumCulled = false; holder.add(points);

    /* ---- State ---- */
    var clock = new THREE.Clock(), last = 0, state = 0, mixStart = 0, mixing = false, orderFrom = 0, orderTo = 0;
    var formScale = 0, formTarget = 0, MORPH_SECONDS = 3.0, frozen = reduceMotion, dirty = 2;
    var px = 0, py = 0, tx = 0, ty = 0, scrollP = 0, onScreen = true, live = false, lost = false;

    function setState(next, instant) {
      aFrom.array.set(T[state]); lFrom.array.set(L[state]); aTo.array.set(T[next]); lTo.array.set(L[next]);
      aFrom.needsUpdate = aTo.needsUpdate = lFrom.needsUpdate = lTo.needsUpdate = true;
      uniforms.uFlowFrom.value = state === 1 ? 1 : 0; uniforms.uFlowTo.value = next === 1 ? 1 : 0;
      orderFrom = uniforms.uOrder.value; orderTo = next === 0 ? 0 : 1; formTarget = next === 1 ? 1 : 0;
      state = next;
      if (instant || frozen) { uniforms.uMix.value = 1; uniforms.uOrder.value = orderTo; formScale = formTarget; mixing = false; }
      else { uniforms.uMix.value = 0; mixStart = clock.getElapsedTime(); mixing = true; }
      dirty = 2;
    }

    /* Framing: the canvas fills its own stage box, never the copy above it. The ribbon is
       centred in that box and sized so the whole ribbon fits inside. */
    function resize() {
      var w = hero.clientWidth, h = hero.clientHeight, aspect = w / h;
      renderer.setSize(w, h, false); camera.aspect = aspect;
      var halfWidthPx = Math.min(w * 0.4, h * 0.6, 330);   // on-screen half-width; 0.6 of the height keeps every rotation inside the box
      /* Keep the camera at a fixed distance and narrow the lens instead, so the ribbon's
         perspective looks the same whatever shape the stage is. */
      var z = 14, tanHalf = (2.9 * (w / 2) / halfWidthPx) / (z * aspect);
      camera.fov = 2 * Math.atan(tanHalf) * 180 / Math.PI;
      camera.position.set(0, 0, z);
      holder.position.set(0, -0.02 * tanHalf * z, 0);
      backdrop.uA.value = aspect; backdrop.uC.value.set(0.5, 0.48);
      sizeK = Math.max(0.55, Math.min(1, halfWidthPx / 330));
      uniforms.uPx.value = pointScale(level === 'balanced' ? BALANCED.particles : LIGHT.particles);
      camera.updateProjectionMatrix(); dirty = 2;
    }

    /* ---- Step down in place ---- */
    function stepDown() {
      if (level === 'balanced') {
        level = 'light';
        dpr = Math.min(dpr, LIGHT.dpr); renderer.setPixelRatio(dpr);
        geo.setDrawRange(0, LIGHT.particles);
        /* Bake the chrome: render the reflective material once onto a sphere and reuse
           that image as a one-lookup material. */
        var baked = new THREE.WebGLRenderTarget(256, 256);
        var ball = new THREE.Scene(); ball.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), chrome));
        var ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10); ortho.position.z = 3;
        renderer.setRenderTarget(baked); renderer.render(ball, ortho); renderer.setRenderTarget(null);
        ribbon.material = new THREE.MeshMatcapMaterial({ matcap: baked.texture });
        resize();
      } else if (level === 'light') {
        level = 'still';
        frozen = true; setState(1, true);
      }
      root.setAttribute('data-scene-level', level);
    }

    function render() {
      if (frozen && dirty <= 0) return;
      var t = clock.getElapsedTime(), dt = Math.min(t - last, 0.05); last = t;
      if (mixing) {
        var m = Math.min((t - mixStart) / MORPH_SECONDS, 1);
        uniforms.uMix.value = m; uniforms.uOrder.value = orderFrom + (orderTo - orderFrom) * m;
        if (m >= 1) mixing = false;
      }
      formScale = frozen ? formTarget : formScale + (formTarget - formScale) * Math.min(dt * 2.0, 1);
      var e = formScale * formScale * (3 - 2 * formScale);
      ribbon.scale.setScalar(Math.max(e, 0.0001)); ribbon.visible = e > 0.002;
      if (frozen) { holder.rotation.set(0.32, -0.45, -0.18); }
      else {
        uniforms.uTime.value = t;
        px += (tx - px) * 0.05; py += (ty - py) * 0.05;
        holder.rotation.set(0.32 + py * 0.35 + scrollP * 0.3, -0.45 + px * 0.6 + scrollP * 1.1 + t * 0.07, -0.18);
      }
      renderer.render(scene, camera); dirty--;
      if (!live) { live = true; root.classList.add('scene-live'); }
    }

    /* ---- Loop: renders only while the hero is on screen and the tab is visible ---- */
    var frames = 0, windowStart = 0, slowWindows = 0, startedAt = 0;
    function tick(now) {
      if (lost) return;
      requestAnimationFrame(tick);
      if (document.hidden || !onScreen) { frames = 0; windowStart = now; return; }
      render();
      if (frozen) return;
      frames++;
      if (now - windowStart < 1000) return;
      var fps = frames * 1000 / (now - windowStart);
      frames = 0; windowStart = now;
      if (fps > ceiling) ceiling = Math.round(fps);
      if (now - startedAt < 4500) return;                 // let the intro and shader warm-up pass
      slowWindows = fps < Math.min(ceiling, 60) * 0.8 ? slowWindows + 1 : 0;
      if (slowWindows >= 3) { slowWindows = 0; startedAt = now; stepDown(); }
    }

    var section = hero.closest('section') || hero;   // pointer and scroll are read from the whole hero
    section.addEventListener('pointermove', function (e) { var r = section.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; });
    section.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    window.addEventListener('scroll', function () { var r = section.getBoundingClientRect(); scrollP = Math.max(0, Math.min(1, -r.top / r.height)); }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }).observe(hero);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else window.addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; useStillImage(); });

    resize();
    root.setAttribute('data-scene-level', frozen ? 'still' : level);
    if (frozen) setState(1, true);
    else setTimeout(function () { setState(1, false); }, 350);
    requestAnimationFrame(function (now) { startedAt = windowStart = now; tick(now); });

    /* Later sections drive the same scene: 0 noise, 1 signal, 2 structure, 3 performance. */
    window.SignalScene = { setState: function (n) { if (n >= 0 && n <= 3 && n !== state) setState(n, false); }, level: function () { return level; } };
  }
})();
