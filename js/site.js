/* Signal Lab — site behaviour. Loaded with `defer` on every page.
   Each block checks for its own elements, so pages without them are fine. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ---------- Mobile navigation ---------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');
  if (toggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', function () {
      setNav(!nav.classList.contains('open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setNav(false); toggle.focus(); }
    });
  }

  /* ---------- Quiet reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { revealObserver.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('in-view'); });
    }
  }

  /* ---------- Mobile sticky call to action ---------- */
  var stickyCta = document.getElementById('stickyCta');
  var contact = document.getElementById('contact');
  if (stickyCta && contact) {
    var ticking = false;
    var updateSticky = function () {
      ticking = false;
      var pastHero = window.scrollY > 520;
      var reachedForm = contact.getBoundingClientRect().top < window.innerHeight - 80;
      stickyCta.classList.toggle('show', pastHero && !reachedForm);
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateSticky); }
    }, { passive: true });
    updateSticky();
  }

  /* ---------- Application form (multi-step, posts to Formspree) ---------- */
  var leadForm = document.getElementById('leadForm');
  if (leadForm) {
    var steps = Array.prototype.slice.call(leadForm.querySelectorAll('.wizard-step'));
    var fill = document.getElementById('wizardFill');
    var count = document.getElementById('wizardCount');
    var errorBox = document.getElementById('formError');
    var current = 0;

    var showStep = function (i, moveFocus) {
      current = i;
      steps.forEach(function (step, idx) { step.classList.toggle('active', idx === i); });
      if (fill) fill.style.width = ((i + 1) / steps.length * 100) + '%';
      if (count) count.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      if (errorBox) errorBox.textContent = '';
      if (moveFocus) {
        var target = steps[i].querySelector('input:not([type=hidden])') || steps[i].querySelector('h4');
        if (target) target.focus({ preventScroll: true });
      }
    };

    var currentStepValid = function () {
      var fields = steps[current].querySelectorAll('[required]');
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        if (field.type === 'hidden') {
          if (!field.value) return false;
        } else if (!field.value.trim() || !field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
      return true;
    };

    var next = function () {
      if (current < steps.length - 1) showStep(current + 1, true);
    };

    leadForm.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () { if (currentStepValid()) next(); });
    });

    leadForm.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () { if (current > 0) showStep(current - 1, true); });
    });

    leadForm.querySelectorAll('.choice-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.dataset.choice;
        leadForm.querySelectorAll('.choice-btn[data-choice="' + targetId + '"]').forEach(function (b) {
          b.classList.remove('selected');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
        document.getElementById(targetId).value = btn.dataset.value;
        setTimeout(next, 250);
      });
    });

    /* Enter in a text field advances the wizard instead of submitting early. */
    leadForm.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && current < steps.length - 1) {
        e.preventDefault();
        if (currentStepValid()) next();
      }
    });

    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentStepValid()) return;
      var submitBtn = leadForm.querySelector('button[type="submit"]');
      var label = submitBtn.querySelector('span') || submitBtn;
      var originalText = label.textContent;
      var fail = function () {
        label.textContent = originalText;
        submitBtn.disabled = false;
        if (errorBox) errorBox.textContent = 'Something went wrong sending your details. Please try again, or email getsignallab@gmail.com directly.';
      };
      label.textContent = 'Sending…';
      submitBtn.disabled = true;

      fetch(leadForm.action, {
        method: 'POST',
        body: new FormData(leadForm),
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (!response.ok) { fail(); return; }
        document.getElementById('contact-form-wrap').style.display = 'none';
        var thanks = document.getElementById('thankYou');
        thanks.classList.add('show');
        thanks.focus({ preventScroll: true });
        if (window.fbq) fbq('track', 'Lead');
      }).catch(fail);
    });

    showStep(0, false);
  }

  /* ---------- Cal.com booking embed, loaded when the form is near ---------- */
  if (contact && document.querySelector('[data-cal-link]')) {
    var calLoaded = false;
    var loadCal = function () {
      if (calLoaded) return;
      calLoaded = true;
      (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      Cal('init', 'discovery-call', { origin: 'https://cal.com' });
      Cal.ns['discovery-call']('ui', {
        theme: 'dark',
        styles: { branding: { brandColor: '#C8FF2E' } },
        hideEventTypeDetails: false,
        layout: 'month_view'
      });
      Cal.ns['discovery-call']('on', {
        action: 'bookingSuccessful',
        callback: function () { if (window.fbq) fbq('track', 'Schedule'); }
      });
    };
    if ('IntersectionObserver' in window) {
      var calObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { loadCal(); calObserver.disconnect(); }
      }, { rootMargin: '600px' });
      calObserver.observe(contact);
    } else {
      window.addEventListener('load', loadCal);
    }
  }
})();
