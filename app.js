/*
 * safezone: app.js
 * Loads an image or video frame into a 1080x1920 canvas and draws the
 * selected platform's UI zones (from zones.js) on top. No dependencies.
 */
(() => {
  'use strict';

  const { FRAME, KINDS, platforms: PLATFORMS } = window.SAFEZONE;
  const W = FRAME.width;
  const H = FRAME.height;
  const ALL = 'all';
  const SAFE_COLOR = '#22c55e';
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const $ = (id) => document.getElementById(id);
  const els = {
    stage: $('stage'),
    canvas: $('frame'),
    overlay: $('overlay'),
    legend: $('legend'),
    file: $('file'),
    video: $('video'),
    sourceHint: $('sourceHint'),
    scrubRow: $('scrubRow'),
    scrub: $('scrub'),
    scrubTime: $('scrubTime'),
    fitGroup: $('fitGroup'),
    platformGroup: $('platformGroup'),
    platformNote: $('platformNote'),
    showZones: $('showZones'),
    showLabels: $('showLabels'),
    showSafe: $('showSafe'),
    opacity: $('opacity'),
    opacityOut: $('opacityOut'),
  };
  const ctx = els.canvas.getContext('2d');

  const state = {
    platform: 'tiktok',
    fit: 'cover',
    opacity: 0.45,
    showZones: true,
    showLabels: true,
    showSafe: true,
    media: null,     // HTMLImageElement | HTMLVideoElement currently drawn
    mediaUrl: null,  // object URL to revoke when replaced
  };

  /* ------------------------------------------------------------ prefs */

  const PREF_KEY = 'safezone:prefs:v1';
  const PREF_FIELDS = ['platform', 'fit', 'opacity', 'showZones', 'showLabels', 'showSafe'];

  function loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      PREF_FIELDS.forEach((k) => {
        if (k in saved && typeof saved[k] === typeof state[k]) state[k] = saved[k];
      });
    } catch (_) { /* storage unavailable: defaults are fine */ }
    if (state.platform !== ALL && !PLATFORMS[state.platform]) state.platform = 'tiktok';
  }

  function savePrefs() {
    try {
      const out = {};
      PREF_FIELDS.forEach((k) => { out[k] = state[k]; });
      localStorage.setItem(PREF_KEY, JSON.stringify(out));
    } catch (_) { /* ignore */ }
  }

  /* -------------------------------------------------------- platforms */

  /** Returns the platform definition, or a merged "all platforms" view. */
  function getPlatform(id) {
    if (id !== ALL) {
      const p = PLATFORMS[id] || PLATFORMS.tiktok;
      return Object.assign({}, p, { zones: p.zones.map((z) => Object.assign({}, z, { id: id + ':' + z.id })) });
    }
    const ids = Object.keys(PLATFORMS);
    const zones = [];
    let l = 0, t = 0, r = 100, b = 100;
    ids.forEach((pid) => {
      const p = PLATFORMS[pid];
      p.zones.forEach((z) => zones.push(Object.assign({}, z, { id: pid + ':' + z.id, label: p.name + ': ' + z.label })));
      l = Math.max(l, p.safe.x);
      t = Math.max(t, p.safe.y);
      r = Math.min(r, p.safe.x + p.safe.w);
      b = Math.min(b, p.safe.y + p.safe.h);
    });
    return {
      name: 'All',
      notes: 'Every platform stacked. The safe area is where all of them agree.',
      zones,
      safe: { x: l, y: t, w: Math.max(0, r - l), h: Math.max(0, b - t) },
      combined: true,
    };
  }

  function buildPlatformButtons() {
    const entries = Object.keys(PLATFORMS).map((id) => [id, PLATFORMS[id].name]);
    entries.push([ALL, 'All three']);
    els.platformGroup.replaceChildren(...entries.map(([id, name]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.platform = id;
      btn.textContent = name;
      return btn;
    }));
  }

  function buildLegend() {
    const items = Object.values(KINDS).map((k) => {
      const li = document.createElement('li');
      const sw = document.createElement('i');
      sw.style.setProperty('--c', k.color);
      li.append(sw, k.label);
      return li;
    });
    const safe = document.createElement('li');
    const sw = document.createElement('i');
    sw.className = 'dashed';
    safe.append(sw, 'Safe area');
    items.push(safe);
    els.legend.replaceChildren(...items);
  }

  /* ------------------------------------------------------------ media */

  function setHint(text, isError) {
    els.sourceHint.textContent = text;
    els.sourceHint.classList.toggle('is-error', !!isError);
  }

  function releaseMedia() {
    if (state.mediaUrl) URL.revokeObjectURL(state.mediaUrl);
    state.mediaUrl = null;
    state.media = null;
    const v = els.video;
    v.onloadedmetadata = v.onloadeddata = v.onseeked = v.onerror = null;
    if (v.getAttribute('src')) {
      v.removeAttribute('src');
      v.load();
    }
    els.scrubRow.hidden = true;
  }

  function loadFile(file) {
    if (!file) return;
    const type = file.type || '';
    const isVideo = type.startsWith('video/');
    const isImage = type.startsWith('image/');
    if (!isVideo && !isImage) {
      setHint('That file type (' + (type || file.name) + ') is not an image or video.', true);
      return;
    }
    releaseMedia();
    const url = URL.createObjectURL(file);
    state.mediaUrl = url;
    const label = file.name || (isImage ? 'Pasted image' : 'Video');

    if (isImage) {
      const img = new Image();
      img.onload = () => {
        state.media = img;
        setHint(label + ' · ' + img.naturalWidth + ' × ' + img.naturalHeight);
        drawFrame();
      };
      img.onerror = () => setHint('Could not decode that image.', true);
      img.src = url;
      return;
    }

    const v = els.video;
    v.onloadedmetadata = () => {
      const d = isFinite(v.duration) ? v.duration : 0;
      els.scrub.max = String(d);
      els.scrub.value = '0';
      els.scrubRow.hidden = !(d > 0);
      setHint(label + ' · ' + v.videoWidth + ' × ' + v.videoHeight + ' · ' + d.toFixed(2) + ' s');
    };
    v.onloadeddata = () => {
      state.media = v;
      drawFrame();
      updateScrubLabel();
    };
    v.onseeked = () => {
      state.media = v;
      drawFrame();
      updateScrubLabel();
    };
    v.onerror = () => setHint('This browser cannot decode that video. Try MP4 (H.264) or WebM.', true);
    v.src = url;
    v.load();
  }

  function updateScrubLabel() {
    els.scrubTime.value = els.video.currentTime.toFixed(2) + ' s';
  }

  /* ---------------------------------------------------------- drawing */

  function drawPlaceholder(c) {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1f1d4d');
    g.addColorStop(0.55, '#2c2a6b');
    g.addColorStop(1, '#0e1422');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 2;
    c.beginPath();
    for (let x = W / 9; x < W; x += W / 9) { c.moveTo(x, 0); c.lineTo(x, H); }
    for (let y = H / 16; y < H; y += H / 16) { c.moveTo(0, y); c.lineTo(W, y); }
    c.stroke();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,255,255,0.88)';
    c.font = '700 60px ' + FONT;
    c.fillText('Drop an image or video', W / 2, H / 2 - 36);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.font = '500 38px ' + FONT;
    c.fillText('1080 × 1920 · 9:16', W / 2, H / 2 + 40);
  }

  /** Draws the current media (or placeholder) into the preview canvas. */
  function drawFrame() {
    const m = state.media;
    const sw = m ? (m.videoWidth || m.naturalWidth) : 0;
    const sh = m ? (m.videoHeight || m.naturalHeight) : 0;
    ctx.clearRect(0, 0, W, H);
    if (!sw || !sh) {
      drawPlaceholder(ctx);
      return;
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const scale = state.fit === 'cover' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(m, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  function place(el, r) {
    el.style.left = r.x + '%';
    el.style.top = r.y + '%';
    el.style.width = r.w + '%';
    el.style.height = r.h + '%';
  }

  function makeLabel(className, text) {
    const s = document.createElement('span');
    s.className = className;
    s.textContent = text;
    return s;
  }

  /** Rebuilds the DOM overlay for the current platform and toggles. */
  function renderOverlay() {
    const p = getPlatform(state.platform);
    const nodes = [];
    els.overlay.style.setProperty('--zone-alpha', String(state.opacity));

    if (state.showZones) {
      p.zones.forEach((z) => {
        const d = document.createElement('div');
        d.className = 'zone';
        d.dataset.zone = z.id;
        d.style.setProperty('--c', KINDS[z.kind].color);
        place(d, z);
        if (state.showLabels && !p.combined) d.appendChild(makeLabel('zone-label', z.label));
        nodes.push(d);
      });
    }
    if (state.showSafe && p.safe.w > 0 && p.safe.h > 0) {
      const s = document.createElement('div');
      s.className = 'safe';
      place(s, p.safe);
      if (state.showLabels) s.appendChild(makeLabel('safe-label', 'Safe area'));
      nodes.push(s);
    }
    els.overlay.replaceChildren(...nodes);
    els.platformNote.textContent = p.notes;
  }

  /* ------------------------------------------------------------ sync UI */

  function syncControls() {
    els.platformGroup.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.platform === state.platform));
    });
    els.fitGroup.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.fit === state.fit));
    });
    els.showZones.checked = state.showZones;
    els.showLabels.checked = state.showLabels;
    els.showSafe.checked = state.showSafe;
    els.opacity.value = String(Math.round(state.opacity * 100));
    els.opacityOut.value = Math.round(state.opacity * 100) + '%';
    els.opacity.disabled = !state.showZones;
  }

  function update() {
    syncControls();
    renderOverlay();
    savePrefs();
  }

  /* ------------------------------------------------------------ events */

  function bindEvents() {
    els.platformGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-platform]');
      if (!btn) return;
      state.platform = btn.dataset.platform;
      update();
    });

    els.fitGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-fit]');
      if (!btn) return;
      state.fit = btn.dataset.fit;
      drawFrame();
      update();
    });

    els.showZones.addEventListener('change', () => { state.showZones = els.showZones.checked; update(); });
    els.showLabels.addEventListener('change', () => { state.showLabels = els.showLabels.checked; update(); });
    els.showSafe.addEventListener('change', () => { state.showSafe = els.showSafe.checked; update(); });
    els.opacity.addEventListener('input', () => {
      state.opacity = Number(els.opacity.value) / 100;
      els.opacityOut.value = els.opacity.value + '%';
      els.overlay.style.setProperty('--zone-alpha', String(state.opacity));
    });
    els.opacity.addEventListener('change', savePrefs);

    els.file.addEventListener('change', () => {
      loadFile(els.file.files[0]);
      els.file.value = '';
    });

    els.scrub.addEventListener('input', () => {
      const v = els.video;
      if (!v.getAttribute('src')) return;
      v.currentTime = Number(els.scrub.value);
      updateScrubLabel();
    });

    // Drag and drop anywhere on the page.
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    let dragDepth = 0;
    window.addEventListener('dragenter', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth++;
      document.body.classList.add('is-dragging');
    });
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) document.body.classList.remove('is-dragging');
    });
    window.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      document.body.classList.remove('is-dragging');
      loadFile(e.dataTransfer.files[0]);
    });

    // Paste a screenshot straight from the clipboard.
    window.addEventListener('paste', (e) => {
      const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
      const item = items.find((i) => i.kind === 'file');
      if (!item) return;
      e.preventDefault();
      loadFile(item.getAsFile());
    });

    // Keep --k (stage px per frame px) current so labels and text scale.
    const setScale = () => {
      els.stage.style.setProperty('--k', String(els.stage.clientWidth / W));
    };
    if ('ResizeObserver' in window) new ResizeObserver(setScale).observe(els.stage);
    else window.addEventListener('resize', setScale);
    setScale();
  }

  /* -------------------------------------------------------------- init */

  loadPrefs();
  buildPlatformButtons();
  buildLegend();
  bindEvents();
  drawFrame();
  update();
})();
