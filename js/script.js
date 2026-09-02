(() => {
  'use strict';

  document.documentElement.classList.add('js-loaded');
  window.__harshitaBirthdayLoaded = true;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const themeToggle = document.getElementById('themeToggle');
  const themeName = document.getElementById('themeName');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const homeScreen = document.getElementById('homeScreen');
  const routeBack = document.getElementById('routeBack');
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  const allScenes = [...document.querySelectorAll('.scene')];
  const routeScenes = {
    daksh: allScenes.filter(scene => scene.dataset.route === 'daksh'),
    addii: allScenes.filter(scene => scene.dataset.route === 'addii')
  };

  const themes = [
    {id: 'blueberry', label: 'BLEEUUU'},
    {id: 'strawberry', label: 'REEDDD'},
    {id: 'kala', label: 'KALA KALA'}
  ];
  const savedTheme = (() => {
    try { return localStorage.getItem('harshita-theme'); } catch { return null; }
  })();

  let theme = themes.some(option => option.id === savedTheme) ? savedTheme : 'blueberry';
  let activeRoute = 'addii';
  let current = 0;
  let transitioning = false;
  let themeTransitionTimer;
  let romanceParticleTimer;
  let canvasReady = false;
  let stars = [], width = 0, height = 0, easterClicks = 0, starRgb = '217,222,255';
  let pointerX = 0, pointerY = 0;

  function applyTheme(nextTheme, persist = true) {
    if (persist) {
      document.documentElement.classList.remove('theme-changing');
      void document.documentElement.offsetWidth;
      document.documentElement.classList.add('theme-changing');
      clearTimeout(themeTransitionTimer);
      themeTransitionTimer = setTimeout(() => document.documentElement.classList.remove('theme-changing'), 650);
    }
    theme = themes.some(option => option.id === nextTheme) ? nextTheme : 'blueberry';
    document.documentElement.dataset.theme = theme;
    const index = themes.findIndex(option => option.id === theme);
    themeName.textContent = themes[index].label;
    themeToggle.setAttribute('aria-label', `Current theme ${themes[index].label}. Switch to ${themes[(index + 1) % themes.length].label}`);
    if (persist) {
      try { localStorage.setItem('harshita-theme', theme); } catch { /* Storage may be disabled. */ }
    }
    if (canvasReady) resize();
  }

  const activeScenes = () => routeScenes[activeRoute] || [];

  function updateProgress() {
    const total = activeScenes().length || 6;
    progressFill.style.width = `${((current + 1) / total) * 100}%`;
    progressText.textContent = `${current + 1} / ${total}`;
  }

  function resetInteractiveScene(scene) {
    const envelope = scene.querySelector('.envelope');
    const letter = scene.querySelector('.letter');
    const hint = scene.querySelector('.open-hint');
    const envelopeTrigger = scene.querySelector('.envelope-trigger');
    const gift = scene.querySelector('.gift');
    const reveal = scene.querySelector('.birthday-reveal');
    const wishReveal = scene.querySelector('.wish-reveal');
    if (envelope) {
      envelope.classList.remove('open', 'depart');
      envelope.style.display = 'block';
    }
    if (letter) letter.classList.remove('visible');
    if (hint) hint.style.display = 'block';
    if (envelopeTrigger) envelopeTrigger.style.display = '';
    if (gift) gift.classList.remove('open');
    if (reveal) reveal.classList.remove('visible');
    if (wishReveal) wishReveal.classList.remove('visible');
    scene.classList.remove('celebrating');
    scene.classList.remove('jar-opened');
    scene.querySelectorAll('.released-wish').forEach(wish => wish.remove());
    scene.querySelectorAll('.jar-wishes i').forEach(wish => wish.classList.remove('escaping'));
    if (scene.classList.contains('addii-wish-scene')) fillWishJar(scene);
  }

  function resetRoute(route) {
    routeScenes[route].forEach(resetInteractiveScene);
    document.body.classList.remove('flash');
  }

  function showRoute(route) {
    if (!routeScenes[route] || transitioning) return;
    transitioning = true;
    activeRoute = route;
    current = 0;
    document.body.dataset.route = route;
    setRomanceParticles(route === 'addii');
    homeScreen.classList.remove('active');
    homeScreen.setAttribute('aria-hidden', 'true');
    routeBack.hidden = false;
    allScenes.forEach(scene => {
      scene.classList.remove('active', 'leaving');
      scene.setAttribute('aria-hidden', 'true');
    });
    resetRoute(route);
    const first = routeScenes[route][0];
    setTimeout(() => {
      first.classList.add('active');
      first.setAttribute('aria-hidden', 'false');
      updateProgress();
      transitioning = false;
      first.querySelector('button')?.focus({preventScroll: true});
    }, reducedMotion ? 10 : 420);
  }

  function goHome() {
    if (activeRoute === 'home' || transitioning) return;
    transitioning = true;
    activeScenes()[current]?.classList.add('leaving');
    setTimeout(() => {
      allScenes.forEach(scene => {
        scene.classList.remove('active', 'leaving');
        scene.setAttribute('aria-hidden', 'true');
      });
      activeRoute = 'home';
      current = 0;
      document.body.dataset.route = 'home';
      setRomanceParticles(false);
      routeBack.hidden = true;
      homeScreen.classList.add('active');
      homeScreen.setAttribute('aria-hidden', 'false');
      transitioning = false;
      homeScreen.querySelector('[data-route-select]')?.focus({preventScroll: true});
    }, reducedMotion ? 10 : 520);
  }

  function goTo(index) {
    const scenes = activeScenes();
    if (activeRoute === 'home' || transitioning || index < 0 || index >= scenes.length || index === current) return;
    transitioning = true;
    const old = scenes[current], next = scenes[index];
    old.classList.add('leaving');
    setTimeout(() => {
      old.classList.remove('active', 'leaving');
      old.setAttribute('aria-hidden', 'true');
      next.classList.add('active');
      next.setAttribute('aria-hidden', 'false');
      next.scrollTop = 0;
      current = index;
      updateProgress();
      if (document.activeElement?.tagName === 'BUTTON') {
        next.querySelector('button:not(.envelope), [tabindex="0"]')?.focus({preventScroll: true});
      }
      setTimeout(() => { transitioning = false; }, reducedMotion ? 20 : 850);
    }, reducedMotion ? 10 : 520);
  }

  function replayRoute() {
    if (activeRoute === 'home' || transitioning) return;
    resetRoute(activeRoute);
    if (current === 0) {
      const scene = activeScenes()[0];
      scene.classList.remove('active');
      void scene.offsetWidth;
      scene.classList.add('active');
      updateProgress();
      return;
    }
    goTo(0);
  }

  function openEnvelope(envelope) {
    if (envelope.classList.contains('open')) return;
    const scene = envelope.closest('.scene');
    const letter = scene.querySelector('.letter');
    const hint = scene.querySelector('.open-hint');
    const trigger = scene.querySelector('.envelope-trigger');
    envelope.classList.add('open');
    setTimeout(() => {
      envelope.classList.add('depart');
      hint.style.display = 'none';
      if (trigger) trigger.style.display = 'none';
      setTimeout(() => {
        envelope.style.display = 'none';
        letter.classList.add('visible');
        letter.focus();
      }, reducedMotion ? 10 : 450);
    }, reducedMotion ? 10 : 850);
  }

  function fillWishJar(scene) {
    const container = scene.querySelector('.jar-wishes');
    if (!container || container.children.length) return;
    const amount = reducedMotion ? 10 : 22;
    for (let i = 0; i < amount; i++) {
      const wish = document.createElement('i');
      wish.style.setProperty('--x', `${10 + Math.random() * 80}%`);
      wish.style.setProperty('--y', `${12 + Math.random() * 78}%`);
      wish.style.setProperty('--size', `${3 + Math.random() * 5}px`);
      wish.style.setProperty('--delay', `${Math.random() * -5}s`);
      wish.style.setProperty('--float', `${4 + Math.random() * 4}s`);
      container.appendChild(wish);
    }
  }

  function openWishJar(button) {
    const scene = button.closest('.addii-wish-scene');
    if (!scene || scene.classList.contains('jar-opened')) return;
    scene.classList.add('jar-opened');
    const jar = scene.querySelector('.wish-jar');
    const sourceWishes = [...scene.querySelectorAll('.jar-wishes i')];
    const amount = reducedMotion ? 6 : 24;
    for (let i = 0; i < amount; i++) {
      const wish = document.createElement('span');
      wish.className = 'released-wish';
      wish.textContent = i % 5 === 0 ? '♥' : i % 3 === 0 ? '✦' : '•';
      wish.style.setProperty('--release-x', `${-115 + Math.random() * 230}px`);
      wish.style.setProperty('--release-rise', `${190 + Math.random() * 250}px`);
      wish.style.setProperty('--release-size', `${6 + Math.random() * 12}px`);
      wish.style.setProperty('--release-delay', `${reducedMotion ? 0 : Math.random() * 1.25}s`);
      wish.style.setProperty('--release-time', `${reducedMotion ? .01 : 2.8 + Math.random() * 2}s`);
      jar.appendChild(wish);
      setTimeout(() => wish.remove(), reducedMotion ? 100 : 5600);
    }
    sourceWishes.forEach(wish => wish.classList.add('escaping'));
    setTimeout(() => {
      const reveal = scene.querySelector('.wish-reveal');
      reveal.classList.add('visible');
      reveal.querySelector('button')?.focus({preventScroll: true});
    }, reducedMotion ? 30 : 2700);
  }

  function makeRomanceParticle(burstMode = false) {
    if (activeRoute !== 'addii' && !burstMode) return;
    const heart = document.createElement('span');
    heart.className = 'romance-particle';
    heart.textContent = Math.random() > .35 ? '♥' : '♡';
    heart.style.left = `${burstMode ? 35 + Math.random() * 30 : 4 + Math.random() * 92}%`;
    heart.style.setProperty('--particle-size', `${burstMode ? 15 + Math.random() * 25 : 7 + Math.random() * 13}px`);
    heart.style.setProperty('--particle-duration', `${burstMode ? 2.4 + Math.random() * 2 : 7 + Math.random() * 6}s`);
    heart.style.setProperty('--particle-drift', `${-70 + Math.random() * 140}px`);
    heart.style.setProperty('--particle-blur', `${Math.random() > .75 ? 2 : 0}px`);
    document.getElementById('hearts').appendChild(heart);
    setTimeout(() => heart.remove(), burstMode ? 4800 : 13500);
  }

  function setRomanceParticles(enabled) {
    clearInterval(romanceParticleTimer);
    romanceParticleTimer = undefined;
    if (!enabled || reducedMotion) return;
    makeRomanceParticle();
    romanceParticleTimer = setInterval(makeRomanceParticle, 850);
  }

  function openGift(button) {
    const scene = button.closest('.gift-scene');
    const gift = scene.querySelector('.gift');
    const reveal = scene.querySelector('.birthday-reveal');
    if (gift.classList.contains('open')) return;
    gift.classList.add('open');
    document.body.classList.add('flash');
    burst();
    setTimeout(() => {
      scene.classList.add('celebrating');
      reveal.classList.add('visible');
      reveal.querySelector('button')?.focus({preventScroll: true});
    }, reducedMotion ? 20 : 900);
  }

  function burst() {
    const styles = getComputedStyle(document.documentElement);
    const names = theme === 'kala'
      ? ['--accent', '--text-soft', '--text-main', '--secondary', '--accent']
      : ['--accent', '--secondary', '--text-soft', '--text-main', '--primary'];
    const colors = names.map(name => styles.getPropertyValue(name).trim());
    const confetti = document.getElementById('confetti');
    const hearts = document.getElementById('hearts');
    const amount = reducedMotion ? 12 : 85;
    for (let i = 0; i < amount; i++) {
      const piece = document.createElement('i');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty('--duration', `${2.5 + Math.random() * 2.2}s`);
      piece.style.setProperty('--drift', `${-100 + Math.random() * 200}px`);
      piece.style.setProperty('--spin', `${Math.random() * 900 - 450}deg`);
      piece.style.animationDelay = `${Math.random() * .5}s`;
      confetti.appendChild(piece);
      setTimeout(() => piece.remove(), 5200);
    }
    for (let i = 0; i < (reducedMotion ? 4 : 18); i++) {
      const heart = document.createElement('span');
      heart.className = 'floating-heart';
      heart.textContent = i % 3 ? '♥' : '♡';
      heart.style.left = `${8 + Math.random() * 84}%`;
      heart.style.setProperty('--size', `${16 + Math.random() * 22}px`);
      heart.style.setProperty('--duration', `${3.5 + Math.random() * 3}s`);
      heart.style.setProperty('--drift', `${-80 + Math.random() * 160}px`);
      heart.style.animationDelay = `${Math.random() * 1.8}s`;
      hearts.appendChild(heart);
      setTimeout(() => heart.remove(), 8500);
    }
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    starRgb = getComputedStyle(document.documentElement).getPropertyValue('--star-rgb').trim() || starRgb;
    const count = Math.min(150, Math.max(55, Math.floor(width * height / 9000)));
    stars = Array.from({length: count}, () => ({
      x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.35 + .2,
      a: Math.random() * .65 + .2, v: Math.random() * .008 + .002,
      phase: Math.random() * Math.PI * 2, depth: Math.random() * .8 + .2
    }));
  }

  function drawStars(time = 0) {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const alpha = reducedMotion ? star.a : star.a * (.6 + .4 * Math.sin(time * star.v + star.phase));
      ctx.beginPath();
      ctx.arc(star.x + pointerX * star.depth, star.y + pointerY * star.depth, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${starRgb},${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(drawStars);
  }

  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-route-select]');
    if (event.target.closest('.replay-button')) return replayRoute();
    const envelope = event.target.closest('.envelope');
    if (envelope) return openEnvelope(envelope);
    const envelopeTrigger = event.target.closest('.envelope-trigger');
    if (envelopeTrigger) return openEnvelope(envelopeTrigger.closest('.scene').querySelector('.envelope'));
    const wishJarButton = event.target.closest('.wish-jar-button');
    if (wishJarButton) return openWishJar(wishJarButton);
    const giftButton = event.target.closest('.open-gift');
    if (giftButton) return openGift(giftButton);
    if (event.target.closest('[data-action="next"]')) goTo(current + 1);
  });

  themeToggle.addEventListener('click', () => {
    const index = themes.findIndex(option => option.id === theme);
    applyTheme(themes[(index + 1) % themes.length].id);
  });

  document.querySelectorAll('.star-button').forEach(star => {
    const tap = () => {
      easterClicks++;
      star.animate([{transform:'scale(1)'},{transform:'scale(1.8)'},{transform:'scale(1)'}], {duration:350});
      if (easterClicks >= 5) {
        const egg = document.getElementById('easterEgg');
        egg.classList.add('show');
        easterClicks = 0;
        setTimeout(() => egg.classList.remove('show'), 4000);
      }
    };
    star.addEventListener('click', tap);
    star.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        tap();
      }
    });
  });

  addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') {
      const glow = document.getElementById('cursorGlow');
      glow.style.opacity = '1';
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
      pointerX = (event.clientX / width - .5) * -8;
      pointerY = (event.clientY / height - .5) * -8;
    }
  });
  addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' && activeRoute !== 'home' && current !== 3 && current !== 4) goTo(current + 1);
  });
  addEventListener('resize', resize, {passive: true});

  allScenes.forEach(scene => {
    scene.classList.remove('active', 'leaving');
    scene.setAttribute('aria-hidden', 'true');
  });
  routeScenes.addii[0].classList.add('active');
  routeScenes.addii[0].setAttribute('aria-hidden', 'false');
  document.body.dataset.route = 'addii';
  applyTheme(theme, false);
  canvasReady = true;
  resize();
  requestAnimationFrame(drawStars);
  updateProgress();
  setRomanceParticles(true);
})();
