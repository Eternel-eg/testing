/**
 * WEDDING INVITATION — AYA & MAHMOUD
 * Script: loading → intro → main invitation
 * Handles: asset preload, autoplay, particles, staggered text reveals
 */

'use strict';

/* ──────────────────────────────────────────────────────────
   CONFIG
────────────────────────────────────────────────────────── */
const CONFIG = {
  INTRO_DURATION:   4500,   // ms to show image2 before main
  ANIM_BASE_DELAY:  300,    // ms base between each text element
  ANIM_STEP:        380,    // ms additional delay per step
  PARTICLE_COUNT:   52,
  PARTICLE_SPEED:   0.35,
  MUSIC_VOLUME:     0.55,
  LOADER_MIN_TIME:  2200,   // Minimum loader display time (ms)
};

/* ──────────────────────────────────────────────────────────
   DOM REFERENCES
────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const loaderEl     = $('loader');
const tapOverlay   = $('tapOverlay');
const introEl      = $('intro');
const mainEl       = $('main');
const loaderBar    = $('loaderBar');
const loaderParts  = $('loaderParticles');
const bgMusic      = $('bgMusic');
const canvas       = $('particleCanvas');
const ctx          = canvas ? canvas.getContext('2d') : null;

/* ──────────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────────── */
let musicStarted = false;
let animFrameId  = null;

/* ──────────────────────────────────────────────────────────
   SCENE HELPERS
────────────────────────────────────────────────────────── */
function showScene(el) {
  el.classList.remove('hidden', 'gone');
  // Force reflow so transition fires
  void el.offsetHeight;
  el.classList.add('active');
}

function hideScene(el, andRemove = false) {
  el.classList.remove('active');
  el.classList.add('hidden');
  if (andRemove) {
    el.addEventListener('transitionend', () => el.classList.add('gone'), { once: true });
  }
}

/* ──────────────────────────────────────────────────────────
   LOADER PARTICLES
────────────────────────────────────────────────────────── */
function spawnLoaderParticles() {
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 4;
    p.style.cssText = `
      width:  ${size}px;
      height: ${size}px;
      left:   ${10 + Math.random() * 80}%;
      top:    ${20 + Math.random() * 70}%;
      --dur:   ${4 + Math.random() * 6}s;
      --delay: ${Math.random() * 5}s;
    `;
    loaderParts.appendChild(p);
  }
}

/* ──────────────────────────────────────────────────────────
   ASSET PRELOADING
────────────────────────────────────────────────────────── */
function preloadAsset(src, type = 'img') {
  return new Promise(resolve => {
    if (type === 'audio') {
      const audio = document.createElement('audio');
      audio.oncanplaythrough = resolve;
      audio.onerror = resolve; // don't block on audio failure
      audio.src = src;
      // Also resolve after short timeout in case audio stalls
      setTimeout(resolve, 3000);
      return;
    }
    const img = new Image();
    img.onload  = resolve;
    img.onerror = resolve; // don't block on individual failures
    img.src = src;
  });
}

function setProgress(pct) {
  loaderBar.style.width = `${Math.min(pct, 100)}%`;
}

async function preloadAll() {
  const assets = [
    { src: 'image1.png',  type: 'img'   },
    { src: 'image2.gif',  type: 'img'   },
    { src: 'https://drive.google.com/thumbnail?id=1xsNzWygrfDPHyZnm6f1gOm2nT9xKz5Hy&sz=w1000',  type: 'img'   },
    { src: 'music1.mp3',  type: 'audio' },
  ];

  const startTime = Date.now();
  let loaded = 0;

  const promises = assets.map(a =>
    preloadAsset(a.src, a.type).then(() => {
      loaded++;
      setProgress((loaded / assets.length) * 85);
    })
  );

  await Promise.all(promises);

  // Ensure minimum display time for elegance
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, CONFIG.LOADER_MIN_TIME - elapsed);
  await new Promise(r => setTimeout(r, remaining));

  setProgress(100);
  await new Promise(r => setTimeout(r, 500)); // brief pause at 100%
}

/* ──────────────────────────────────────────────────────────
   MUSIC
────────────────────────────────────────────────────────── */
function startMusic() {
  if (musicStarted) return;
  bgMusic.volume = CONFIG.MUSIC_VOLUME;
  bgMusic.play()
    .then(() => {
      musicStarted = true;
    })
    .catch(() => {
      // Autoplay blocked — show tap overlay
      showTapOverlay();
    });
}

function showTapOverlay() {
  tapOverlay.classList.remove('hidden');
  tapOverlay.addEventListener('click', () => {
    tapOverlay.style.opacity = '0';
    bgMusic.play().then(() => {
      musicStarted = true;
      setTimeout(() => tapOverlay.classList.add('hidden'), 800);
    });
  }, { once: true });
}

/* ──────────────────────────────────────────────────────────
   TEXT ANIMATION — Staggered reveals
────────────────────────────────────────────────────────── */
function revealText() {
  const items = mainEl.querySelectorAll('.anim-item');
  items.forEach((el, i) => {
    const delay = CONFIG.ANIM_BASE_DELAY + i * CONFIG.ANIM_STEP;
    setTimeout(() => el.classList.add('revealed'), delay);
  });
}

/* ──────────────────────────────────────────────────────────
   PARTICLE SYSTEM — Floating motes in main scene
────────────────────────────────────────────────────────── */
class Particle {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, initial = false) {
    this.x     = Math.random() * w;
    this.y     = initial ? Math.random() * h : h + 10;
    this.size  = 1 + Math.random() * 2.5;
    this.speed = (0.15 + Math.random() * 0.5) * CONFIG.PARTICLE_SPEED;
    this.drift = (Math.random() - 0.5) * 0.3;
    this.life  = 0;
    this.maxLife = 180 + Math.random() * 220;
    this.glow  = Math.random() > 0.6;
  }

  update() {
    this.y   -= this.speed;
    this.x   += this.drift;
    this.life++;
  }

  alpha() {
    const t = this.life / this.maxLife;
    if (t < 0.15) return t / 0.15;
    if (t > 0.75) return 1 - (t - 0.75) / 0.25;
    return 1;
  }

  draw(ctx) {
    const a = this.alpha() * 0.65;
    if (this.glow) {
      // Glowing mote
      const grad = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size * 4
      );
      grad.addColorStop(0, `rgba(225, 198, 140, ${a})`);
      grad.addColorStop(1, `rgba(225, 198, 140, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Core dot
    ctx.fillStyle = `rgba(242, 218, 165, ${a})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

let particles = [];

function initParticles() {
  if (!canvas || !ctx) return;
  resizeCanvas();
  particles = Array.from({ length: CONFIG.PARTICLE_COUNT },
    () => new Particle(canvas.width, canvas.height)
  );
  animateParticles();
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function animateParticles() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.update();
    p.draw(ctx);
    if (p.life >= p.maxLife) p.reset(canvas.width, canvas.height);
  });

  animFrameId = requestAnimationFrame(animateParticles);
}

/* ──────────────────────────────────────────────────────────
   MAIN FLOW
────────────────────────────────────────────────────────── */
async function run() {
  // Spawn decorative particles on loader
  spawnLoaderParticles();

  // Preload everything
  await preloadAll();

  /* ── Fade out loader ── */
  hideScene(loaderEl, true);

  /* ── Try to start music immediately ── */
  await new Promise(r => setTimeout(r, 200));
  startMusic();

  /* ── Show intro (image2) ── */
  showScene(introEl);
  await new Promise(r => setTimeout(r, CONFIG.INTRO_DURATION));

  /* ── Fade intro → main ── */
  hideScene(introEl, true);
  await new Promise(r => setTimeout(r, 800)); // overlap grace

  showScene(mainEl);
  initParticles();

  /* ── Reveal text with stagger ── */
  setTimeout(revealText, 600);
}

/* ──────────────────────────────────────────────────────────
   EVENTS
────────────────────────────────────────────────────────── */
window.addEventListener('resize', () => {
  resizeCanvas();
  // Re-spread particles across new dimensions
  if (particles.length) {
    particles.forEach(p => {
      if (p.x > canvas.width)  p.x = Math.random() * canvas.width;
      if (p.y > canvas.height) p.y = Math.random() * canvas.height;
    });
  }
});

/* ──────────────────────────────────────────────────────────
   BOOT
────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', run);
