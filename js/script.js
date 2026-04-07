/* ═══════════════════════════════════════════════════════
   BIRTHDAY SURPRISE — script.js
   Shanmugam Palaniswamy  |  April 7 2026
═══════════════════════════════════════════════════════ */
'use strict';

/* ───────────────────────────────────────────────────────
   1.  AUDIO SYSTEM
   All audio is unlocked only after the user taps "Start".
─────────────────────────────────────────────────────── */
class BirthdayAudio {
  constructor() {
    this.ctx      = null;
    this.master   = null;
    this.melGain  = null;
    this.melTimeout = null;
    this.fwBuffer      = null;   // decoded fireworks audio buffer
    this._melodyStarted = false; // guard against double-play
    this.ready         = false;
  }

  init() {
    if (this.ready) return;
    const AC    = window.AudioContext || /** @type {any} */(window).webkitAudioContext;
    this.ctx    = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.ready  = true;
    this._loadFireworksBuffer(); // preload audio file in background
  }

  /* Fetch + decode audio/fireworks.mp3 into an AudioBuffer */
  _loadFireworksBuffer() {
    fetch('audio/fireworks.mp3')
      .then(r => { if (!r.ok) throw new Error('not found'); return r.arrayBuffer(); })
      .then(ab => this.ctx.decodeAudioData(ab))
      .then(buf => { this.fwBuffer = buf; })
      .catch(() => { this.fwBuffer = null; }); // silently fall back to Web Audio
  }

  /*
   * Play fireworks audio for `duration` seconds.
   * Uses audio/fireworks.mp3 if loaded, otherwise falls back to
   * the Web Audio synthesised cracker played on an interval.
   */
  playFireworks(duration = 9) {
    if (!this.ready) return;
    if (this.fwBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.fwBuffer;
      src.loop   = true;  // loop the clip so it fills the burst window
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.9, this.ctx.currentTime);
      // Fade out in the last 1.5 s
      g.gain.setValueAtTime(0.9, this.ctx.currentTime + duration - 1.5);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      src.connect(g); g.connect(this.master);
      src.start();
      src.stop(this.ctx.currentTime + duration + 0.1);
    } else {
      // Web Audio fallback — synthesised crackers on interval
      let count = 0;
      const timer = setInterval(() => {
        this._synthCrack();
        if (++count > 22) clearInterval(timer);
      }, 380);
    }
  }

  /*
   * Synthesised firecracker — models a real cracker:
   *  • short rising whistle  (rocket going up)
   *  • sharp explosive crack  (the bang at the peak)
   *  • deep thud  (concussive boom)
   *  • sparkle tail  (burning stars falling)
   * All layers are randomly varied so no two bursts sound identical.
   */
  _synthCrack() {
    if (!this.ready) return;
    const ac  = this.ctx;
    const now = ac.currentTime;
    const v   = 0.7 + Math.random() * 0.3;

    // ── 1. Whistle sweep (short rising sine before the bang) ──────────
    { const delay = 0;
      const dur   = 0.18 + Math.random() * 0.12;   // 180–300 ms
      const f0    = 400 + Math.random() * 200;
      const f1    = 1600 + Math.random() * 800;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(this.master);
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, now + delay);
      o.frequency.exponentialRampToValueAtTime(f1, now + delay + dur);
      g.gain.setValueAtTime(v * 0.18, now + delay);
      g.gain.setValueAtTime(v * 0.22, now + delay + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur + 0.02);
      o.start(now + delay); o.stop(now + delay + dur + 0.03); }

    // ── 2. Sharp crack transient (white noise burst at the bang) ──────
    { const t   = now + 0.22;   // fires right after whistle ends
      const len = (ac.sampleRate * 0.055) | 0;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 1.8);   // sharp exponential decay
        d[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ac.createBufferSource(); src.buffer = buf;
      // band-pass tuned to ~2–6 kHz — the "snap" region
      const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass';
      bpf.frequency.value = 2800 + Math.random() * 1200; bpf.Q.value = 0.4;
      const g = ac.createGain();
      g.gain.setValueAtTime(v * 3.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(bpf); bpf.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + 0.07); }

    // ── 3. Deep bass thud (the body blow) ────────────────────────────
    { const t  = now + 0.22;
      const o  = ac.createOscillator();
      const g  = ac.createGain();
      o.connect(g); g.connect(this.master); o.type = 'sine';
      o.frequency.setValueAtTime(120 + Math.random() * 60, t);
      o.frequency.exponentialRampToValueAtTime(22, t + 0.35);
      g.gain.setValueAtTime(v * 2.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.40);
      o.start(t); o.stop(t + 0.42); }

    // ── 4. Mid-range noise body (echo rumble) ────────────────────────
    { const t   = now + 0.22;
      const len = (ac.sampleRate * 0.55) | 0;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf;
      const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass';
      lpf.frequency.value = 600 + Math.random() * 300;
      const g = ac.createGain();
      g.gain.setValueAtTime(v * 0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.60);
      src.connect(lpf); lpf.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + 0.65); }

    // ── 5. Sparkle tail (high filtered noise, long decay) ────────────
    { const t   = now + 0.28;
      const len = (ac.sampleRate * 1.1) | 0;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf;
      const hpf = ac.createBiquadFilter(); hpf.type = 'highpass';
      hpf.frequency.value = 6000 + Math.random() * 3000;
      const g = ac.createGain();
      g.gain.setValueAtTime(v * 0.10, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      src.connect(hpf); hpf.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + 1.3); }
  }

  /* Internal: schedule a simple oscillator tone */
  _tone(freq, dur, type = 'sine', vol = 0.45, delay = 0) {
    if (!this.ready) return;
    const t   = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.connect(g); g.connect(this.master);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  /* Countdown beep — pitch rises as the number falls (10→1) */
  countBeep(n) {
    if (!this.ready) return;
    const freq = 300 + (11 - n) * 52; // 352 Hz for 10, 820 Hz for 1
    if (n <= 3) {
      this._tone(freq,        0.11, 'sine', 0.50, 0.00);
      this._tone(freq * 1.25, 0.11, 'sine', 0.40, 0.14);
    } else {
      this._tone(freq, 0.22, 'sine', 0.45);
    }
  }

  /* kept for any direct callers — delegates to _synthCrack */
  crack() { this._synthCrack(); }

  /* (dead stub — retained so nothing breaks) */
  _oldCrack() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const T   = 0.30; // moment of sky burst

    // ── Stage 1: Rising whistle (light → sharp, 200 Hz → 2400 Hz) ──
    {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.connect(g); g.connect(this.master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + T);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(volMult * 0.28, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + T);
      osc.start(now); osc.stop(now + T + 0.02);
    }

    // ── Stage 2: Sharp sky crack (light, ultra-short high-pass snap) ──
    {
      const len = (this.ctx.sampleRate * 0.016) | 0;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const hpf = this.ctx.createBiquadFilter();
      hpf.type = 'highpass'; hpf.frequency.value = 5000;
      const g   = this.ctx.createGain();
      g.gain.setValueAtTime(volMult * 2.2, now + T);
      g.gain.exponentialRampToValueAtTime(0.001, now + T + 0.018);
      src.connect(hpf); hpf.connect(g); g.connect(this.master);
      src.start(now + T); src.stop(now + T + 0.02);
    }

    // ── Stage 3: Deep bass blast (heavy boom — pitch dives 180 → 20 Hz) ──
    {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.connect(g); g.connect(this.master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now + T);
      osc.frequency.exponentialRampToValueAtTime(20, now + T + 0.45);
      g.gain.setValueAtTime(volMult * 1.6, now + T);
      g.gain.exponentialRampToValueAtTime(0.001, now + T + 0.55);
      osc.start(now + T); osc.stop(now + T + 0.6);
    }

    // ── Stage 4: Noise explosion body (low-pass — rumble spread) ──
    {
      const len = (this.ctx.sampleRate * 0.55) | 0;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const lpf = this.ctx.createBiquadFilter();
      lpf.type = 'lowpass'; lpf.frequency.value = 900;
      const g   = this.ctx.createGain();
      g.gain.setValueAtTime(volMult * 0.9, now + T);
      g.gain.exponentialRampToValueAtTime(0.001, now + T + 0.8);
      src.connect(lpf); lpf.connect(g); g.connect(this.master);
      src.start(now + T); src.stop(now + T + 0.85);
    }

    // ── Stage 5: Sparkle shimmer (high-frequency sky glitter, long fade) ──
    {
      const len = (this.ctx.sampleRate * 1.0) | 0;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const hpf = this.ctx.createBiquadFilter();
      hpf.type = 'highpass'; hpf.frequency.value = 6000 + Math.random() * 2000;
      const g   = this.ctx.createGain();
      g.gain.setValueAtTime(volMult * 0.18, now + T + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + T + 1.2);
      src.connect(hpf); hpf.connect(g); g.connect(this.master);
      src.start(now + T + 0.02); src.stop(now + T + 1.3);
    }
  }

  /*
   * Happy Birthday — piano-quality Web Audio.
   * Also tries audio/happy-birthday.mp3 first if you drop a file there.
   */
  playMelody() {
    if (!this.ready || this._melodyStarted) return;
    this._melodyStarted = true;  // prevent any second call
    this.bgAudio = new Audio('audio/happy-birthday.mp3');
    this.bgAudio.loop = true; this.bgAudio.volume = 0;
    this.bgAudio.play().then(() => {
      let v = 0;
      const fade = setInterval(() => {
        v = Math.min(v + 0.018, 0.5);
        this.bgAudio.volume = v;
        if (v >= 0.5) clearInterval(fade);
      }, 100);
    }).catch(() => this._playHappyBirthday());
  }

  /* Piano-style Happy Birthday (sawtooth + LPF + harmony) */
  _playHappyBirthday() {
    const G4=392, A4=440, B4=494, C5=523,
          D5=587, E5=659, F5=698, G5=784;

    // Standard Happy Birthday to You melody
    const notes = [
      [G4,.28],[G4,.14],[A4,.42],[G4,.42],[C5,.42],[B4,.84],[null,.2],
      [G4,.28],[G4,.14],[A4,.42],[G4,.42],[D5,.42],[C5,.84],[null,.2],
      [G4,.28],[G4,.14],[G5,.42],[E5,.42],[C5,.42],[B4,.42],[A4,.84],[null,.2],
      [F5,.28],[F5,.14],[E5,.42],[C5,.42],[D5,.42],[C5,1.2],[null,.6],
    ];

    this.melGain = this.ctx.createGain();
    this.melGain.gain.value = 0;
    this.melGain.connect(this.master);
    this.melGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 1.5);

    const piano = (freq, start, dur) => {
      if (!freq) return;
      // Two detuned sawtooth oscs → LPF → piano-like tone
      [1, 1.003].forEach(det => {
        const osc = this.ctx.createOscillator();
        const lpf = this.ctx.createBiquadFilter();
        const ng  = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq * det;
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(3800, start);
        lpf.frequency.exponentialRampToValueAtTime(700, start + dur * 0.85);
        osc.connect(lpf); lpf.connect(ng); ng.connect(this.melGain);
        ng.gain.setValueAtTime(0, start);
        ng.gain.linearRampToValueAtTime(0.42, start + 0.012);
        ng.gain.exponentialRampToValueAtTime(0.18, start + dur * 0.4);
        ng.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.97);
        osc.start(start); osc.stop(start + dur + 0.05);
      });
      // Soft 5th-harmony overtone
      const h = this.ctx.createOscillator(), hg = this.ctx.createGain();
      h.type = 'sine'; h.frequency.value = freq * 1.5;
      h.connect(hg); hg.connect(this.melGain);
      hg.gain.setValueAtTime(0, start);
      hg.gain.linearRampToValueAtTime(0.07, start + 0.015);
      hg.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.75);
      h.start(start); h.stop(start + dur);
    };

    let t = this.ctx.currentTime + 0.4;
    const totalDur = notes.reduce((s, [, d]) => s + d, 0);
    const loop = () => {
      let tt = t;
      notes.forEach(([fr, dur]) => { piano(fr, tt, dur); tt += dur; });
      t += totalDur;
      this.melTimeout = setTimeout(loop, Math.max(0, (t - this.ctx.currentTime) * 1000 - 80));
    };
    loop();
  }

  /* Web Speech API — birthday greeting voice */
  speak(text, onEnd) {
    if (!('speechSynthesis' in window)) { onEnd && setTimeout(onEnd, 100); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch  = 1.1;
    u.rate   = 0.85;
    u.volume = 1;
    if (onEnd) u.onend = onEnd;
    const go = () => {
      const voices = speechSynthesis.getVoices();
      const v = voices.find(v => v.lang.startsWith('en-IN'))
             || voices.find(v => v.lang.startsWith('en'))
             || voices[0];
      if (v) u.voice = v;
      let endFired = false;
      if (onEnd) u.onend = () => { if (!endFired) { endFired = true; onEnd(); } };
      speechSynthesis.speak(u);
    };
    if (speechSynthesis.getVoices().length) go();
    else { speechSynthesis.onvoiceschanged = go; go(); }
  }
}

const bdAudio = new BirthdayAudio();

/* ───────────────────────────────────────────────────────
   2.  THREE.JS — star-field + floating orbs (preloader bg)
─────────────────────────────────────────────────────── */
const threeCanvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

// Stars
const STAR_N   = 3000;
const starGeo  = new THREE.BufferGeometry();
const starPos  = new Float32Array(STAR_N * 3);
const starCol  = new Float32Array(STAR_N * 3);
const palette  = [[1,.42,.61],[1,.85,.24],[.42,.8,.47],[.3,.59,1],[1,.39,.28]];
for (let i = 0; i < STAR_N; i++) {
  starPos[i*3]   = (Math.random()-.5)*200;
  starPos[i*3+1] = (Math.random()-.5)*200;
  starPos[i*3+2] = (Math.random()-.5)*200;
  const c = palette[i % palette.length];
  starCol[i*3] = c[0]; starCol[i*3+1] = c[1]; starCol[i*3+2] = c[2];
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color',    new THREE.BufferAttribute(starCol, 3));
const starMat = new THREE.PointsMaterial({ size:.25, vertexColors:true, transparent:true, opacity:.9 });
const stars   = new THREE.Points(starGeo, starMat);
scene.add(stars);

// Floating coloured orbs
const orbs = [];
const orbColors = [0xff6b9d,0xffd93d,0x6bcb77,0x4d96ff,0xff6348,0xa29bfe];
for (let i = 0; i < 18; i++) {
  const geo  = new THREE.SphereGeometry(.4 + Math.random()*1.8, 16, 16);
  const mat  = new THREE.MeshBasicMaterial({ color: orbColors[i % orbColors.length], transparent:true, opacity:.35 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((Math.random()-.5)*90, (Math.random()-.5)*55, (Math.random()-.5)*40);
  mesh.userData = { sx:(Math.random()-.5)*.08, sy:(Math.random()-.5)*.08 };
  scene.add(mesh); orbs.push(mesh);
}

let threeActive = true;
(function animateThree() {
  if (!threeActive) return;
  requestAnimationFrame(animateThree);
  stars.rotation.x += .0004; stars.rotation.y += .0008;
  orbs.forEach(o => {
    o.position.x += o.userData.sx; o.position.y += o.userData.sy;
    if (Math.abs(o.position.x) > 55) o.userData.sx *= -1;
    if (Math.abs(o.position.y) > 35) o.userData.sy *= -1;
  });
  renderer.render(scene, camera);
})();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (fwCanvas) { fwCanvas.width = window.innerWidth; fwCanvas.height = window.innerHeight; }
});

/* ───────────────────────────────────────────────────────
   3.  SVG GRADIENT for countdown ring
─────────────────────────────────────────────────────── */
(function injectGradient() {
  const svg = document.querySelector('.countdown-ring-svg');
  if (!svg) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#8fc60e"/>
      <stop offset="50%"  stop-color="#c5e818"/>
      <stop offset="100%" stop-color="#6bcb77"/>
    </linearGradient>`;
  svg.prepend(defs);
})();

/* ───────────────────────────────────────────────────────
   4.  FIREWORK CANVAS  (2-D canvas fireworks)
─────────────────────────────────────────────────────── */
const fwCanvas = document.getElementById('firework-canvas');
const fwCtx    = fwCanvas.getContext('2d');
fwCanvas.width  = window.innerWidth;
fwCanvas.height = window.innerHeight;

const rockets = [], sparks = [];

class Rocket {
  constructor() {
    this.x  = fwCanvas.width  * (.12 + Math.random() * .76);
    this.y  = fwCanvas.height * 1.05;
    this.tx = fwCanvas.width  * (.08 + Math.random() * .84);
    this.ty = fwCanvas.height * (.04 + Math.random() * .44);
    const spd = 9 + Math.random() * 5;
    const ang = Math.atan2(this.ty - this.y, this.tx - this.x);
    this.vx   = Math.cos(ang) * spd;
    this.vy   = Math.sin(ang) * spd;
    this.col  = `hsl(${Math.random()*360|0},100%,65%)`;
    this.done = false;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (Math.hypot(this.tx - this.x, this.ty - this.y) < 12) { this.explode(); this.done = true; }
  }
  explode() {
    const n = 80 + (Math.random() * 60 | 0);
    for (let i = 0; i < n; i++) sparks.push(new Spark(this.x, this.y, this.col));
  }
  draw() {
    fwCtx.beginPath(); fwCtx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    fwCtx.fillStyle = this.col;
    fwCtx.shadowBlur = 8; fwCtx.shadowColor = this.col;
    fwCtx.fill(); fwCtx.shadowBlur = 0;
  }
}

class Spark {
  constructor(x, y, col) {
    this.x = x; this.y = y; this.col = col;
    const spd = 2 + Math.random() * 9;
    const ang = Math.random() * Math.PI * 2;
    this.vx = Math.cos(ang) * spd; this.vy = Math.sin(ang) * spd;
    this.alpha = 1;
    this.decay = .012 + Math.random() * .012;
    this.g  = .12;
    this.sz = 1.5 + Math.random() * 2.5;
  }
  update() {
    this.vx *= .985; this.vy *= .985;
    this.vy += this.g;
    this.x  += this.vx; this.y += this.vy;
    this.alpha -= this.decay;
  }
  draw() {
    fwCtx.save();
    fwCtx.globalAlpha = Math.max(0, this.alpha);
    fwCtx.beginPath(); fwCtx.arc(this.x, this.y, this.sz, 0, Math.PI * 2);
    fwCtx.fillStyle = this.col;
    fwCtx.shadowBlur = 5; fwCtx.shadowColor = this.col;
    fwCtx.fill(); fwCtx.restore();
  }
}

let fwAnimId, fwInterval;
function animateFW() {
  fwAnimId = requestAnimationFrame(animateFW);
  fwCtx.fillStyle = 'rgba(2,2,18,.18)';
  fwCtx.fillRect(0, 0, fwCanvas.width, fwCanvas.height);
  for (let i = rockets.length - 1; i >= 0; i--) {
    rockets[i].update(); rockets[i].draw();
    if (rockets[i].done) rockets.splice(i, 1);
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    sparks[i].update(); sparks[i].draw();
    if (sparks[i].alpha <= 0) sparks.splice(i, 1);
  }
}

/* ───────────────────────────────────────────────────────
   5.  START OVERLAY  → unlock audio & begin countdown
─────────────────────────────────────────────────────── */
document.getElementById('start-btn').addEventListener('click', () => {
  bdAudio.init();   // AudioContext must be created from user gesture
  gsap.to('#start-overlay', {
    opacity: 0, scale: .9, duration: .5, ease: 'power2.in',
    onComplete() {
      document.getElementById('start-overlay').style.display = 'none';
      animateCountdown(10);
    }
  });
});

/* ───────────────────────────────────────────────────────
   6.  COUNTDOWN  10 → 0
─────────────────────────────────────────────────────── */
const CIRCUMFERENCE = 785; // 2π × 125
const countEl  = document.getElementById('countdown-number');
const labelEl  = document.getElementById('countdown-label');
const ringEl   = document.getElementById('ring-progress');
const cLabels  = [
  'Get Ready…','Almost There…','Prepare Yourself!','Something Big Is Coming…',
  'Brace Yourself…','You Asked For This!','No Going Back Now!',
  'Counting Blessings…','One More Second…','BOOM! 🎉',
];

function setRing(ratio) { ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - ratio); }
setRing(1);

function animateCountdown(n) {
  countEl.textContent = n;
  labelEl.textContent = cLabels[10 - n] || 'GO!';
  setRing(n / 10);
  bdAudio.countBeep(n);  // 🔊 beep

  gsap.fromTo(countEl,
    { scale: 0, rotation: -20, opacity: 0 },
    { scale: 1, rotation: 0, opacity: 1, duration: .42, ease: 'back.out(2)' }
  );
  gsap.to(countEl, {
    scale: .8, rotation: 8, opacity: 0,
    duration: .35, delay: .58, ease: 'power2.in',
    onComplete() { n > 0 ? animateCountdown(n - 1) : startBurst(); }
  });
}

/* ───────────────────────────────────────────────────────
   7.  BURST LABELS
─────────────────────────────────────────────────────── */
const LABELS = [
  '🌟 Office Legend',  '☕ Chai Champion',   '😂 Laugh Factory',
  '🏆 Meeting Ninja',  '🦸 Silent Hero',     '📑 Tab Collector',
  '🎯 Smart Guy',      '👔 Friendly Manager','🔥 The Main Man',
  '✨ Birthday Star',  '🚀 Problem Solver',  '🍪 Snack Radar',
];

function showBurstLabels() {
  const container = document.getElementById('burst-labels-container');
  LABELS.forEach((label, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'burst-label';
      div.textContent = label;
      // Random position, avoid dead centre
      let lp, tp;
      do { lp = 6 + Math.random() * 88; tp = 6 + Math.random() * 80; }
      while (lp > 33 && lp < 67 && tp > 33 && tp < 67);
      div.style.left = lp + '%'; div.style.top = tp + '%';
      container.appendChild(div);
      gsap.to(div, { scale: 1, rotation: 0, opacity: 1, duration: .5, ease: 'back.out(2)' });
      setTimeout(() => {
        gsap.to(div, { opacity: 0, y: -28, duration: .55, onComplete() { div.remove(); } });
      }, 1900);
    }, i * 360);
  });
}

/* ───────────────────────────────────────────────────────
   8.  START BURST  (called after countdown hits 0)
─────────────────────────────────────────────────────── */
function startBurst() {
  gsap.to('#countdown-wrapper', { opacity: 0, scale: .4, duration: .4 });

  const overlay = document.getElementById('burst-overlay');
  overlay.classList.add('active');

  // Launch fireworks canvas
  animateFW();
  fwInterval = setInterval(() => rockets.push(new Rocket()), 310);

  // 🔊 Fireworks audio (file or synthesised fallback)
  const burstDuration = LABELS.length * 0.36 + 2.5;
  bdAudio.playFireworks(burstDuration);

  // Floating labels
  setTimeout(showBurstLabels, 350);

  // Show big reveal card after labels settle
  setTimeout(() => {
    clearInterval(fwInterval);
    const revealEl = document.getElementById('big-reveal');
    revealEl.classList.remove('hidden');
    gsap.to(revealEl, { scale: 1, opacity: 1, duration: .75, ease: 'back.out(1.6)' });
  }, LABELS.length * 360 + 1100);
}

/* ───────────────────────────────────────────────────────
   9.  ENTER BUTTON  → reveal main site + play audio
─────────────────────────────────────────────────────── */
document.getElementById('enter-btn').addEventListener('click', () => {
  // Fade out preloader
  gsap.to('#preloader', {
    opacity: 0, duration: .65, ease: 'power2.in',
    onComplete() {
      document.getElementById('preloader').style.display = 'none';
      threeActive = false;
      cancelAnimationFrame(fwAnimId);
    }
  });

  // Reveal main content
  document.getElementById('main-content').classList.add('visible');
  setTimeout(() => document.getElementById('navbar').classList.add('visible'), 500);

  // Init AOS + particles + confetti
  AOS.init({ duration: 700, once: true, offset: 80 });
  createHeroParticles();
  createFooterConfetti();

  // Init 3-D carousel
  setTimeout(() => new Carousel3D('car-stage', GALLERY_ITEMS), 700);

  // 🔊 Speech greeting, then start melody
  setTimeout(() => {
    bdAudio.speak(
      'Happy Birthday Shanmugam! Wishing you a spectacular day full of joy, laughter, and lots of chai! ' +
      'From the Aanoor Groups team — we are so lucky to have you!',
      () => setTimeout(() => bdAudio.playMelody(), 600)
    );
  }, 900);
});

/* ───────────────────────────────────────────────────────
   10.  HERO PARTICLES
─────────────────────────────────────────────────────── */
function createHeroParticles() {
  const container = document.getElementById('hero-particles');
  const colors = ['#8fc60e','#c5e818','#6bcb77','#4d96ff','#ff6348','#a29bfe'];
  for (let i = 0; i < 28; i++) {
    const dot = document.createElement('div');
    const sz  = 4 + Math.random() * 14;
    Object.assign(dot.style, {
      position: 'absolute', width: sz + 'px', height: sz + 'px', borderRadius: '50%',
      background: colors[Math.floor(Math.random() * colors.length)],
      opacity: .12 + Math.random() * .18,
      left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
      pointerEvents: 'none',
    });
    container.appendChild(dot);
    gsap.to(dot, {
      y: -35 - Math.random() * 55, x: (Math.random() - .5) * 40, opacity: 0,
      duration: 3 + Math.random() * 4, delay: Math.random() * 3,
      repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }
}

/* ───────────────────────────────────────────────────────
   11.  FOOTER CONFETTI
─────────────────────────────────────────────────────── */
function createFooterConfetti() {
  const container = document.getElementById('footer-confetti');
  const colors = ['#8fc60e','#c5e818','#6bcb77','#4d96ff','#ff6348','#a29bfe','#fd79a8'];
  for (let i = 0; i < 40; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    const sz = 5 + Math.random() * 10;
    Object.assign(dot.style, {
      width: sz + 'px', height: sz + 'px',
      background: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100 + '%', top: '-20px',
      animationDuration: (4 + Math.random() * 6) + 's',
      animationDelay: (Math.random() * 6) + 's',
    });
    container.appendChild(dot);
  }
}

/* ───────────────────────────────────────────────────────
   12.  THEME TOGGLE
─────────────────────────────────────────────────────── */
document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('theme-toggle').innerHTML = dark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
});

/* ───────────────────────────────────────────────────────
   13.  NAVBAR + SCROLL-TO-TOP
─────────────────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) document.getElementById('navbar').classList.add('visible');
  const st = document.getElementById('scroll-top');
  if (st) window.scrollY > 400 ? st.classList.add('visible') : st.classList.remove('visible');
});
const stBtn = document.createElement('button');
stBtn.id = 'scroll-top'; stBtn.title = 'Back to top';
stBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
stBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
document.body.appendChild(stBtn);

/* ───────────────────────────────────────────────────────
   14.  AGE CALCULATOR
─────────────────────────────────────────────────────── */
const BDAY = new Date(2026, 3, 7); // April 7 2026

window.calculateAge = function () {
  const yr = parseInt(document.getElementById('birth-year-input').value);
  if (!yr || yr < 1940 || yr > 2005) { shakeInput(); return; }
  const birth  = new Date(yr, 3, 7);
  const years  = BDAY.getFullYear() - birth.getFullYear();
  const months = years * 12;
  const days   = Math.floor((BDAY - birth) / 864e5);
  const hours  = days * 24;
  const chai   = days * 5;
  animateCounter('age-years',  years);
  animateCounter('stat-months', months, true);
  animateCounter('stat-days',   days,   true);
  animateCounter('stat-hours',  hours,  true);
  animateCounter('stat-chai',   chai,   true);
  const facts = [
    `That's ${(days * 24 * 60).toLocaleString()} minutes of pure awesomeness! 🌟`,
    `${years} years → ≈ ${(years * 240).toLocaleString()} meetings attended. Medal incoming! 🏅`,
    `${years} birthday candles would need a fire-safety permit. 🔥`,
    `You've survived ${(days / 7 | 0).toLocaleString()} Mondays. Absolute legend! 💪`,
    `At 5 chai/day → ${chai.toLocaleString()} cups. You literally ARE the kettle. ☕`,
  ];
  const f = document.getElementById('age-fun-fact');
  f.textContent = '💡 ' + facts[Math.floor(Math.random() * facts.length)];
  f.classList.add('show');
};

function animateCounter(id, target, compact = false) {
  const el = document.getElementById(id), obj = { val: 0 };
  gsap.to(obj, {
    val: target, duration: 2.2, ease: 'power3.out',
    onUpdate() {
      el.textContent = compact && obj.val > 9999
        ? (obj.val / 1000).toFixed(1) + 'k'
        : Math.round(obj.val).toLocaleString();
    }
  });
}
function shakeInput() {
  const inp = document.getElementById('birth-year-input');
  gsap.fromTo(inp, { x: -8 }, { x: 8, duration: .07, repeat: 5, yoyo: true });
}

/* ───────────────────────────────────────────────────────
   15.  3-D FAN CAROUSEL
─────────────────────────────────────────────────────── */
function darkenHex(hex, factor) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  return `rgb(${r},${g},${b})`;
}

// ── Gallery items — all real photos from images/ folder ──
const GALLERY_ITEMS = [
  { title:"The One & Only",         icon:"fa-star",               color:"#00b894", caption:"Office Legend ⭐",            realSrc:"images/one.jpeg" },
  { title:"Day Two Vibes",          icon:"fa-camera",             color:"#8fc60e", caption:"Always Photogenic 📸",        realSrc:"images/two.jpeg" },
  { title:"Triple Treat",           icon:"fa-fire",               color:"#e17055", caption:"Triple the Fun 🔥",           realSrc:"images/three.jpeg" },
  { title:"The Classic Smile™",     icon:"fa-face-grin-wide",     color:"#c5e818", caption:"That Legendary Grin 😄",      realSrc:"images/4.jpeg" },
  { title:"Chai O'Clock",           icon:"fa-mug-hot",            color:"#8fc60e", caption:"Tea Time Ritual ☕",           realSrc:"images/5.jpeg" },
  { title:"Team Leader Mode",       icon:"fa-users",              color:"#6bcb77", caption:"Boss Mode: ON 👔",            realSrc:"images/7.jpeg" },
  { title:"47 Tabs Open",           icon:"fa-laptop",             color:"#4d96ff", caption:"Tab Collector 💻",            realSrc:"images/8.jpeg" },
  { title:"Mid-Joke Moment",        icon:"fa-face-laugh-squint",  color:"#a29bfe", caption:"Self-Laughing Champ 😂",      realSrc:"images/11.jpeg" },
  { title:"Meeting Survived",       icon:"fa-trophy",             color:"#fd79a8", caption:"Meeting Survivor 🏆",         realSrc:"images/12.jpeg" },
  { title:"Historic Moment",        icon:"fa-fire",               color:"#e17055", caption:"Caught in the Act 🔥",        realSrc:"images/13.jpeg" },
  { title:"Snack Radar Active",     icon:"fa-cookie",             color:"#fdcb6e", caption:"Snack Detected! 🍪",          realSrc:"images/14.jpeg" },
  { title:"Magic Manager",          icon:"fa-wand-magic-sparkles",color:"#74b9ff", caption:"Problem Solved ✨",            realSrc:"images/15.jpeg" },
  { title:"Camera Ready",           icon:"fa-camera",             color:"#d63031", caption:"Always Photogenic 📸",        realSrc:"images/16.jpeg" },
  { title:"2-Finger Speedster",     icon:"fa-keyboard",           color:"#00cec9", caption:"World Record Typing ⌨️",      realSrc:"images/17.jpeg" },
  { title:"Quick Meeting™",         icon:"fa-clock",              color:"#6c5ce7", caption:"Time Is Relative 🕐",         realSrc:"images/18.jpeg" },
  { title:"Chai #5 Today",          icon:"fa-mug-saucer",         color:"#e84393", caption:"Fuelled by Chai ☕",          realSrc:"images/19.jpeg" },
  { title:"Google Expert",          icon:"fa-magnifying-glass",   color:"#00b4d8", caption:"Solution Found! 🔍",          realSrc:"images/20.jpeg" },
  { title:"Laughter Generator",     icon:"fa-face-laugh-beam",    color:"#60a5fa", caption:"Jokes on Repeat 🤣",          realSrc:"images/24.jpeg" },
  { title:"Strategic Napper",       icon:"fa-moon",               color:"#818cf8", caption:"Power Napper 😴",            realSrc:"images/25.jpeg" },
  { title:"Team Spirit",            icon:"fa-heart",              color:"#f43f5e", caption:"Always There ❤️",             realSrc:"images/26.jpeg" },
  { title:"The Mentor",             icon:"fa-graduation-cap",     color:"#22c55e", caption:"Guiding the Way 🎓",          realSrc:"images/27.jpeg" },
  { title:"Tech Wizard",            icon:"fa-microchip",          color:"#0ea5e9", caption:"Tech Guru 💻",               realSrc:"images/28.jpeg" },
  { title:"Today's VIP",            icon:"fa-person-burst",       color:"#ec4899", caption:"Birthday Star 🌟",            realSrc:"images/29.jpeg" },
  { title:"Office Comedian",        icon:"fa-masks-theater",      color:"#f97316", caption:"Always the Funny Guy 🎭",     realSrc:"images/30.jpeg" },
  { title:"Chai Connoisseur",       icon:"fa-fire-flame-curved",  color:"#ef4444", caption:"Chai Master 🔥",             realSrc:"images/31.jpeg" },
  { title:"Absolute Legend",        icon:"fa-star",               color:"#c5e818", caption:"The Legend Lives On ⭐",      realSrc:"images/32.jpeg" },
  { title:"Funny Moments",          icon:"fa-face-laugh-beam",    color:"#8fc60e", caption:"Caught in Action 😂",         realSrc:"images/33.jpeg" },
  { title:"Work Hard Play Hard",    icon:"fa-briefcase",          color:"#6bcb77", caption:"Dedication Level MAX 💼",     realSrc:"images/34.jpeg" },
  { title:"The Final Boss",         icon:"fa-chess-king",         color:"#4d96ff", caption:"Game Over 👑",               realSrc:"images/35.jpeg" },
  { title:"Special Moment",         icon:"fa-heart",              color:"#fd79a8", caption:"Priceless Memory 💖",         realSrc:"images/WhatsApp Image 2026-04-06 at 12.03.41 PM.jpeg" },
  { title:"Candid Shot",            icon:"fa-camera",             color:"#a29bfe", caption:"Caught Off Guard 📷",         realSrc:"images/WhatsApp Image 2026-04-06 at 12.04.01 PM.jpeg" },
  { title:"That Look",              icon:"fa-face-grin-stars",    color:"#00b894", caption:"Iconic Expression 😎",        realSrc:"images/WhatsApp Image 2026-04-06 at 12.04.02 PM.jpeg" },
  { title:"Perfect Timing",         icon:"fa-trophy",             color:"#fbbf24", caption:"Right Place Right Time 🏆",   realSrc:"images/WhatsApp Image 2026-04-06 at 12.04.03 PM.jpeg" },
];

class Carousel3D {
  constructor(stageId, items) {
    this.stage   = document.getElementById(stageId);
    this.items   = items;
    this.total   = items.length;
    this.current = 0;
    this.VISIBLE = 3;   // cards visible on each side of centre
    this.cards   = [];
    this.dots    = [];
    this.autoId  = null;
    this.touchX  = null;

    this._buildCards();
    this._buildNav();
    this._render(false);
    this._startAuto();
    this._setupTouch();
  }

  /* Position config: [translateX, rotateY°, scale, translateZ, opacity] */
  get _CFG() {
    return [
      { x:   0, ry:  0, sc: 1.00, z:   0, op: 1.00 },  // centre
      { x: 270, ry: 22, sc: 0.79, z: -70, op: 0.85 },  // ±1
      { x: 508, ry: 40, sc: 0.60, z:-140, op: 0.60 },  // ±2
      { x: 700, ry: 55, sc: 0.44, z:-200, op: 0.30 },  // ±3
    ];
  }

  _buildCards() {
    this.items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'car-card';

      const dark = darkenHex(item.color, 0.42);
      const bg   = `linear-gradient(160deg, ${item.color}, ${dark})`;

      if (item.realSrc) {
        // Real photo — image only, no text/emoji overlay
        card.innerHTML = `
          <div class="car-card-inner" style="background:${bg}">
            <img src="${encodeURI(item.realSrc)}" alt="" class="car-real-img" loading="lazy">
          </div>`;
      } else {
        // Placeholder — FA icon only, no text/emoji
        card.innerHTML = `
          <div class="car-card-inner" style="background:${bg}">
            <div class="car-img-area">
              <i class="fas ${item.icon}"></i>
            </div>
          </div>`;
      }

      card.addEventListener('click',       () => this.goTo(i));
      card.addEventListener('mouseenter',  () => this._onHover(i));
      card.addEventListener('mouseleave',  () => this._onLeave(i));
      this.stage.appendChild(card);
      this.cards.push(card);
    });
  }

  _buildNav() {
    document.getElementById('car-prev').addEventListener('click', e => { e.stopPropagation(); this.prev(); });
    document.getElementById('car-next').addEventListener('click', e => { e.stopPropagation(); this.next(); });

    const dotsEl = document.getElementById('car-dots');
    this.items.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'car-dot';
      d.setAttribute('aria-label', `Go to photo ${i + 1}`);
      d.addEventListener('click', () => this.goTo(i));
      dotsEl.appendChild(d);
      this.dots.push(d);
    });
  }

  /* Signed offset of card i from current centre, accounting for wraparound */
  _off(i) {
    let o = ((i - this.current) % this.total + this.total) % this.total;
    if (o > Math.floor(this.total / 2)) o -= this.total;
    return o;
  }

  _render(animated = true) {
    const dur = animated ? 0.45 : 0;
    const CFG = this._CFG;

    this.cards.forEach((card, i) => {
      const off = this._off(i);
      const abs = Math.abs(off);
      const sgn = off < 0 ? -1 : off > 0 ? 1 : 0;

      if (abs > this.VISIBLE) {
        gsap.set(card, { autoAlpha: 0, zIndex: 0, pointerEvents: 'none' });
        return;
      }
      const c = CFG[abs];
      gsap.to(card, {
        x: sgn * c.x, rotateY: sgn * c.ry,
        scale: c.sc, z: c.z,
        autoAlpha: c.op,
        zIndex: 100 - abs * 20,
        pointerEvents: 'all',
        duration: dur, ease: 'power3.out',
      });
    });

    // Sync dots + counter
    this.dots.forEach((d, i) => d.classList.toggle('active', i === this.current));
    const counter = document.getElementById('car-counter');
    if (counter) counter.textContent = `${this.current + 1} / ${this.total}`;
  }

  goTo(i) {
    this.current = ((i % this.total) + this.total) % this.total;
    this._render();
  }
  prev() { this.goTo(this.current - 1); }
  next() { this.goTo(this.current + 1); }

  /* Hover centre card → expand slightly */
  _onHover(i) {
    if (this._off(i) === 0) {
      gsap.to(this.cards[i], { scale: 1.07, z: 30, duration: .3, ease: 'power2.out' });
    }
  }
  /* Leave centre card → restore */
  _onLeave(i) {
    if (this._off(i) === 0) {
      gsap.to(this.cards[i], { scale: 1.00, z: 0, duration: .3, ease: 'power2.out' });
    }
  }

  /* Auto-play: pause on hover, resume on leave */
  _startAuto() {
    const wrap = document.getElementById('carousel-wrapper');
    this.autoId = setInterval(() => this.next(), 1800);
    wrap.addEventListener('mouseenter', () => clearInterval(this.autoId));
    wrap.addEventListener('mouseleave', () => {
      clearInterval(this.autoId);
      this.autoId = setInterval(() => this.next(), 1800);
    });
  }

  /* Touch / swipe support */
  _setupTouch() {
    const wrap = document.getElementById('carousel-wrapper');
    wrap.addEventListener('touchstart', e => { this.touchX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', e => {
      if (this.touchX === null) return;
      const dx = this.touchX - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 50) dx > 0 ? this.next() : this.prev();
      this.touchX = null;
    });
  }
}

/* ───────────────────────────────────────────────────────
   16.  QUIZ
─────────────────────────────────────────────────────── */
const QUIZ = [
  {
    q: "What does Shanmugam do when the WiFi suddenly goes slow?",
    opts: ["Calmly troubleshoots it step by step","Immediately blames IT and calls thrice","Takes a chai break and hopes it fixes itself","Formats the laptop and reinstalls Windows"],
    correct: 2,
    exp: "Chai is the universal fix. Ancient wisdom meets modern DevOps. ☕"
  },
  {
    q: "How many browser tabs does Shanmugam have open right now?",
    opts: ["A responsible 5 tabs","About 15 — totally manageable","Somewhere between 40 and 50","Nobody has counted and survived to tell"],
    correct: 3,
    exp: "The number is classified. Viewing it may violate safety regulations. 📑"
  },
  {
    q: "What is Shanmugam's most legendary superpower?",
    opts: ["Lightning-fast 2-finger typing","Detecting snacks from 3 floors away","Sleeping with eyes open in meetings","All of the above (and a few undiscovered ones)"],
    correct: 3,
    exp: "Why settle for one superpower? Legends collect them ALL! 🦸"
  },
  {
    q: "When Shanmugam says 'quick 5-minute meeting', what happens?",
    opts: ["Ends in exactly 5 minutes ✅","Goes 30 minutes max","2+ hours — everyone rearranges their day","Nobody knows — no one has seen one end"],
    correct: 2,
    exp: "The 'quick meeting' is a myth, like unicorns and fast WiFi. 🗓️"
  },
  {
    q: "What is Shanmugam's spirit animal?",
    opts: ["🦁 Lion — fearless leader","🦉 Owl — wise, silent, all-knowing","🦜 Parrot — stories get more colourful each retelling","🐻 Bear — strategic power napper"],
    correct: 2,
    exp: "Squawk! Every tale evolves into an epic saga by retelling #3! 🦜😂"
  },
];

let curQ = 0, score = 0, answered = false;

function renderQuiz() {
  const body = document.getElementById('quiz-body');
  body.innerHTML = ''; answered = false;
  const data = QUIZ[curQ];
  document.getElementById('quiz-bar').style.width = (curQ / QUIZ.length * 100) + '%';
  document.getElementById('quiz-counter').textContent = `Question ${curQ + 1} of ${QUIZ.length}`;

  const qDiv = document.createElement('div');
  qDiv.className = 'quiz-question'; qDiv.textContent = data.q;
  body.appendChild(qDiv);

  const opts = document.createElement('div');
  opts.className = 'quiz-options';
  data.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn'; btn.textContent = opt;
    btn.onclick = () => handleAnswer(i, btn, opts, data);
    opts.appendChild(btn);
  });
  body.appendChild(opts);
  gsap.from(qDiv, { x: -20, opacity: 0, duration: .4 });
  gsap.from(opts.children, { x: -20, opacity: 0, duration: .35, stagger: .07, delay: .1 });
}

function handleAnswer(idx, _btn, opts, data) {
  if (answered) return; answered = true;
  if (idx === data.correct) score++;
  Array.from(opts.children).forEach((b, i) => {
    b.disabled = true;
    if (i === data.correct) b.classList.add('correct');
    else if (i === idx) b.classList.add('wrong');
  });
  const exp = document.createElement('div');
  exp.className = 'quiz-explanation'; exp.textContent = '💬 ' + data.exp;
  opts.parentNode.appendChild(exp);
  gsap.from(exp, { opacity: 0, y: 10, duration: .4 });

  const nb = document.createElement('button');
  nb.className = 'quiz-next-btn';
  nb.textContent = curQ < QUIZ.length - 1 ? 'Next Question →' : 'See My Score 🏆';
  nb.onclick = () => { curQ++; curQ < QUIZ.length ? renderQuiz() : showResult(); };
  opts.parentNode.appendChild(nb);
  gsap.from(nb, { scale: .8, opacity: 0, duration: .3, delay: .2 });
}

function showResult() {
  document.getElementById('quiz-body').innerHTML = '';
  document.getElementById('quiz-bar').style.width = '100%';
  document.getElementById('quiz-counter').textContent = 'Results!';
  const res = document.getElementById('quiz-result');
  res.classList.remove('hidden');
  const pct = score / QUIZ.length;
  const [icon, title, msg] =
    pct === 1 ? ['🏆','Perfect Score!',`All ${QUIZ.length} correct! You know Shanmugam better than he knows himself. Impressive (or slightly concerning). 😄`]
    : pct >= .6 ? ['🥈','Pretty Good!',`${score}/${QUIZ.length}! You've clearly been paying attention during those "quick" meetings! 🎉`]
    : pct >= .4 ? ['😅','Room to Grow!',`${score}/${QUIZ.length}. Spend more time at the chai station — that's where all the intel lives. ☕`]
    : ['😂','Did You Just Meet Him?',`${score}/${QUIZ.length}. After today's celebration you'll know every secret. 🎂`];
  document.getElementById('result-icon').textContent  = icon;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-msg').textContent   = msg;
  gsap.from(res, { scale: .8, opacity: 0, duration: .5, ease: 'back.out(1.5)' });
}

window.resetQuiz = function () {
  curQ = 0; score = 0;
  document.getElementById('quiz-result').classList.add('hidden');
  renderQuiz();
};

// Lazy-init quiz when section scrolls into view
const quizObs = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !document.getElementById('quiz-body').children.length) {
    renderQuiz(); quizObs.disconnect();
  }
}, { threshold: .2 });
quizObs.observe(document.getElementById('quiz'));
