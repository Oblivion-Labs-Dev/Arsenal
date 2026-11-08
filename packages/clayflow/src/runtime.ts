/**
 * Vanilla ClayFlow runtime (ES2019 IIFE, no dependencies). One shared requestAnimationFrame loop
 * drives every diagram on the page; it stops when nothing is playing, visible and in a shown tab.
 * Markup is static-first: until a diagram scrolls into view it shows its final frame.
 * The source keeps readable indentation; CLAYFLOW_RUNTIME ships it with leading whitespace and
 * whole-line comments removed (no line of the source may end in a trailing comment).
 */
const SOURCE = String.raw`(function () {
  'use strict';
  var instances = [];
  var rafId = 0;
  var lastTime = 0;
  var docHidden = typeof document !== 'undefined' && document.hidden;
  var HOLD_MS = 1400;
  var globalListenersActive = false;
  var globalMutationObserver = null;

  function reducedMotion() {
    return (
      (mq && mq.matches) ||
      document.documentElement.classList.contains('force-reduced')
    );
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function getInst(el) {
    for (var i = 0; i < instances.length; i++) if (instances[i].fig === el) return instances[i];
    return null;
  }

  function frameIndexAt(frames, t) {
    for (var j = 0; j < frames.length; j++) {
      if (t < frames[j].at + frames[j].duration) return j;
    }
    return frames.length - 1;
  }

  function activeStage(inst) {
    return inst.stageV && !inst.stageV.hidden ? inst.stageV : inst.stageH;
  }

  function runnable(inst) {
    return inst.isPlaying && inst.isVisible && !docHidden && !reducedMotion();
  }

  function updatePlayIcon(inst) {
    if (!inst.playBtn) return;
    var playIco = inst.playBtn.querySelector('.cf-icon-play');
    var pauseIco = inst.playBtn.querySelector('.cf-icon-pause');
    if (playIco && pauseIco) {
      playIco.hidden = inst.isPlaying;
      pauseIco.hidden = !inst.isPlaying;
    }
    inst.playBtn.setAttribute('aria-label', inst.isPlaying ? 'Pause animation' : 'Play animation');
    inst.playBtn.setAttribute('aria-pressed', inst.isPlaying ? 'true' : 'false');
  }

  function emit(inst, name, value) {
    var handlers = inst.events[name] || [];
    for (var i = 0; i < handlers.length; i++) handlers[i](value);
  }

  function inspect(inst, nodeId) {
    var panel = inst.fig.querySelector('.cf-inspect');
    if (!panel) return;
    if (nodeId === null) {
      panel.hidden = true;
      if (inst.inspectNode && inst.inspectNode.focus) inst.inspectNode.focus();
      inst.inspectNode = null;
      return;
    }
    var node = inst.fig.querySelector('.cf-node[data-node="' + nodeId + '"][data-inspectable="true"]');
    var template = inst.fig.querySelector('.cf-inspect-data[data-node="' + nodeId + '"]');
    if (!node || !template) return;
    var info; try { info = JSON.parse((template.content ? template.content.textContent : template.textContent) || '{}'); } catch (err) { return; }
    inst.inspectNode = node;
    panel.querySelector('[data-inspect="what"]').textContent = info.label + ' (' + (info.noun || info.kind) + ')';
    panel.querySelector('[data-inspect="role"]').textContent = info.role || info.meta || 'Not specified';
    panel.querySelector('[data-inspect="inputs"]').textContent = (info.inputs || []).join(', ') || 'Not specified';
    panel.querySelector('[data-inspect="outputs"]').textContent = (info.outputs || []).join(', ') || 'Not specified';
    panel.querySelector('[data-inspect="state"]').textContent = node.getAttribute('data-state') || 'idle';
    panel.querySelector('[data-inspect="evidence"]').textContent = info.evidence || 'Not specified';
    panel.hidden = false;
    var close = panel.querySelector('[data-action="inspect-close"]'); if (close) close.focus();
  }

  function applyFrame(inst, idx) {
    if (idx < 0 || idx >= inst.frames.length) return;
    inst.index = idx;
    var frame = inst.frames[idx];
    var shown = {};
    for (var v = 0; v < frame.visible.length; v++) shown[frame.visible[v]] = true;
    var lit = {};
    for (var h = 0; h < frame.highlight.length; h++) lit[frame.highlight[h]] = true;
    var moving = {};
    for (var p = 0; p < frame.packets.length; p++) moving[frame.packets[p].edge] = frame.packets[p];
    inst.packets = moving;
    inst.fig.setAttribute('data-complete', frame.complete ? 'true' : 'false');

    if (inst.scrubInput) inst.scrubInput.value = String(idx);
    if (inst.captionEl && inst.captionEl.textContent !== frame.caption) {
      inst.captionEl.textContent = frame.caption;
    }
    emit(inst, 'frame', idx);
    if (frame.complete) emit(inst, 'complete');

    var stages = [inst.stageH, inst.stageV];
    for (var s = 0; s < stages.length; s++) {
      var stage = stages[s];
      if (!stage) continue;
      var nodes = stage.querySelectorAll('.cf-node');
      for (var n = 0; n < nodes.length; n++) {
        var nodeEl = nodes[n];
        var nId = nodeEl.getAttribute('data-node');
        nodeEl.setAttribute('data-state', frame.states[nId] || 'idle');
        nodeEl.classList.toggle('is-highlight', !!lit[nId]);
        nodeEl.classList.toggle('cf-off', !shown[nId]);
        nodeEl.classList.toggle('is-dimmed', (frame.dimmed || []).indexOf(nId) !== -1);
        nodeEl.classList.toggle('is-focus', frame.focus === nId);
        nodeEl.classList.toggle('is-focus-dim', !!frame.focus && frame.focus !== nId);
        var transform = frame.transforms && frame.transforms[nId];
        if (transform) {
          if (!nodeEl.hasAttribute('data-original-kind')) nodeEl.setAttribute('data-original-kind', nodeEl.getAttribute('data-kind') || '');
          if (!nodeEl.hasAttribute('data-original-label')) nodeEl.setAttribute('data-original-label', nodeEl.querySelector('.cf-node-label') ? nodeEl.querySelector('.cf-node-label').textContent : '');
          if (!nodeEl.hasAttribute('data-original-motion')) nodeEl.setAttribute('data-original-motion', nodeEl.getAttribute('data-motion') || '');
          if (transform.kind) nodeEl.setAttribute('data-kind', transform.kind);
          if (transform.motion) nodeEl.setAttribute('data-motion', transform.motion);
          if (transform.label) { var labelEl = nodeEl.querySelector('.cf-node-label'); if (labelEl) labelEl.textContent = transform.label; }
          nodeEl.classList.add('is-transforming');
          if (nodeEl._cfTransformTimer) clearTimeout(nodeEl._cfTransformTimer);
          (function (target) { target._cfTransformTimer = setTimeout(function () { target.classList.remove('is-transforming'); }, parseFloat(getComputedStyle(inst.fig).getPropertyValue('--cf-dur-transform')) || 680); })(nodeEl);
        } else if (nodeEl.hasAttribute('data-original-kind')) {
          nodeEl.setAttribute('data-kind', nodeEl.getAttribute('data-original-kind'));
          var originalLabel = nodeEl.querySelector('.cf-node-label'); if (originalLabel) originalLabel.textContent = nodeEl.getAttribute('data-original-label') || '';
          if (nodeEl.hasAttribute('data-original-motion')) nodeEl.setAttribute('data-motion', nodeEl.getAttribute('data-original-motion'));
          nodeEl.removeAttribute('data-original-kind'); nodeEl.removeAttribute('data-original-label'); nodeEl.removeAttribute('data-original-motion');
        }
        if (frame.counters[nId] !== undefined) {
          var valEl = nodeEl.querySelector('.cf-metric-val');
          if (valEl) valEl.textContent = String(frame.counters[nId]);
        }
      }
      var chips = stage.querySelectorAll('.cf-chip');
      for (var c = 0; c < chips.length; c++) {
        chips[c].classList.toggle('cf-off', !shown[chips[c].getAttribute('data-target')]);
        if (inst.fig.getAttribute('data-cf-annotations') === 'true') chips[c].hidden = (frame.annotations || []).indexOf(chips[c].getAttribute('data-annotation')) === -1;
      }
      var groups = stage.querySelectorAll('.cf-group');
      for (var g = 0; g < groups.length; g++) { var gId = groups[g].getAttribute('data-group'); groups[g].classList.toggle('is-expanded', (frame.expanded || []).indexOf(gId) !== -1); groups[g].classList.toggle('is-collapsed', (frame.collapsed || []).indexOf(gId) !== -1); }
      var edges = stage.querySelectorAll('.cf-edge');
      for (var e = 0; e < edges.length; e++) {
        var edgeEl = edges[e];
        var eId = edgeEl.getAttribute('data-edge');
        edgeEl.classList.toggle('is-active', !!lit[eId] || !!moving[eId]);
        edgeEl.classList.toggle('cf-off', !shown[eId]);
        edgeEl.classList.toggle('is-dimmed', (frame.dimmed || []).indexOf(eId) !== -1);
        var pkt = edgeEl.querySelector('.cf-packet');
        if (pkt) pkt.style.opacity = moving[eId] && !reducedMotion() ? '1' : '0';
      }
    }

    if (inst.inspectNode) {
      var inspectState = inst.fig.querySelector('.cf-inspect [data-inspect="state"]');
      if (inspectState) inspectState.textContent = inst.inspectNode.getAttribute('data-state') || 'idle';
    }

    if (inst.stepItems) {
      for (var k = 0; k < inst.stepItems.length; k++) {
        inst.stepItems[k].classList.toggle('is-active-step', k === idx);
      }
    }
    placePackets(inst, 0);
  }

  function placePackets(inst, progress) {
    var stage = activeStage(inst);
    if (!stage) return;
    for (var id in inst.packets) {
      var group = stage.querySelector('.cf-edge[data-edge="' + id + '"]');
      if (!group) continue;
      var wire = group.querySelector('.cf-edge-wire');
      var pkt = group.querySelector('.cf-packet');
      if (!wire || !pkt || !wire.getTotalLength) continue;
      var len = wire.getTotalLength();
      var t = ease(progress);
      var pt = wire.getPointAtLength((inst.packets[id].reverse ? 1 - t : t) * len);
      pkt.setAttribute('cx', pt.x.toFixed(1));
      pkt.setAttribute('cy', pt.y.toFixed(1));
    }
  }

  function seek(inst, t) {
    inst.time = t;
    var idx = frameIndexAt(inst.frames, Math.min(t, inst.total - 1));
    if (idx !== inst.index) applyFrame(inst, idx);
    var f = inst.frames[idx];
    var packetMs = parseFloat(getComputedStyle(inst.fig).getPropertyValue('--cf-dur-packet')) || 1100;
    placePackets(inst, Math.max(0, Math.min(1, (t - f.at) / Math.min(f.duration, packetMs / inst.speed))));
  }

  function schedule() {
    var needed = false;
    for (var i = 0; i < instances.length; i++) if (runnable(instances[i])) needed = true;
    if (needed && !rafId) {
      rafId = requestAnimationFrame(tick);
    } else if (!needed) {
      lastTime = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function tick(now) {
    var delta = lastTime ? Math.min(now - lastTime, 100) : 0;
    lastTime = now;
    rafId = 0;
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (!runnable(inst)) continue;
      var t = inst.time + delta * inst.speed;
      if (t >= inst.total + HOLD_MS) {
        if (inst.loop) {
          inst.index = -1;
          seek(inst, 0);
        } else {
          seek(inst, inst.total - 1);
          inst.pause();
        }
      } else if (t >= inst.total) {
        inst.time = t;
      } else {
        seek(inst, t);
      }
    }
    schedule();
  }

  function setVisible(inst, visible) {
    inst.isVisible = visible;
    if (visible && !inst.started && !reducedMotion()) {
      inst.started = true;
      inst.replay();
      return;
    }
    schedule();
  }

  var io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          function (entries) {
            for (var i = 0; i < entries.length; i++) {
              var inst = getInst(entries[i].target);
              if (inst) setVisible(inst, entries[i].isIntersecting);
            }
          },
          { threshold: 0.2 }
        )
      : null;

  var ro =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var inst = getInst(entries[i].target);
            if (!inst || !inst.stageH || !inst.stageV) continue;
            var wh = Number(inst.stageH.getAttribute('data-cf-w')) || 750;
            var wv = Number(inst.stageV.getAttribute('data-cf-w')) || 0;
            var vertical = entries[i].contentRect.width < wh * 0.75 && wv < wh;
            inst.stageH.hidden = vertical;
            inst.stageV.hidden = !vertical;
            inst.fig.setAttribute('data-cf-active-layout', vertical ? 'vertical' : 'horizontal');
            placePackets(inst, 0);
          }
        })
      : null;

  function on(inst, el, type, fn) {
    if (!el) return;
    el.addEventListener(type, fn);
    inst.listeners.push([el, type, fn]);
  }

  function mount(fig) {
    if (!fig || fig._cf) return;
    var script = fig.querySelector('.cf-frames');
    var frames = null;
    try {
      frames = JSON.parse((script && script.textContent) || '[]');
    } catch (err) {
      console.warn('[clayflow] could not read animation frames', err);
    }
    if (!frames || !frames.length) return;
    startGlobalListeners();
    var last = frames[frames.length - 1];

    var inst = {
      fig: fig,
      frames: frames,
      total: last.at + last.duration,
      speed: parseFloat(fig.getAttribute('data-cf-speed')) || 1,
      loop: fig.getAttribute('data-cf-loop') !== 'false',
      isPlaying: false,
      isVisible: !io,
      started: false,
      index: -1,
      time: 0,
      packets: {},
      listeners: [],
      events: { frame: [], complete: [] },
      inspectNode: null,
      stageH: fig.querySelector('.cf-stage[data-cf-layout="horizontal"]'),
      stageV: fig.querySelector('.cf-stage[data-cf-layout="vertical"]'),
      captionEl: fig.querySelector('.cf-live-caption'),
      controls: fig.querySelector('.cf-controls'),
      playBtn: fig.querySelector('[data-action="play"]'),
      scrubInput: fig.querySelector('.cf-scrub'),
      speedSelect: fig.querySelector('.cf-speed'),
      stepItems: fig.querySelectorAll('.cf-steps li'),
      play: function () {
        if (reducedMotion()) { this.pause(); seek(this, this.total - 1); this.time = this.total; return; }
        if (this.time >= this.total) seek(this, 0);
        this.isPlaying = true;
        updatePlayIcon(this);
        schedule();
      },
      pause: function () {
        this.isPlaying = false;
        updatePlayIcon(this);
        schedule();
      },
      toggle: function () {
        if (this.isPlaying) this.pause();
        else this.play();
      },
      replay: function () {
        this.index = -1;
        seek(this, 0);
        this.play();
      },
      reset: function () { this.pause(); this.index = -1; seek(this, 0); this.time = 0; this.inspect(null); },
      seek: function (idx) { var n = Math.max(0, Math.min(Number(idx) || 0, this.frames.length - 1)); this.pause(); this.started = true; seek(this, this.frames[n].at); },
      setSpeed: function (n) { this.speed = Math.max(0.5, Math.min(2, Number(n) || 1)); if (this.speedSelect) this.speedSelect.value = String(this.speed); },
      inspect: function (nodeId) { inspect(this, nodeId); },
      on: function (name, fn) { if (!this.events[name] || typeof fn !== 'function') return function () {}; this.events[name].push(fn); var list = this.events[name]; return function () { var i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); }; },
      step: function (dir) {
        this.pause();
        var n = this.frames.length;
        var idx = (this.index + dir + n) % n;
        this.started = true;
        seek(this, this.frames[idx].at);
      },
    };
    if (inst.speedSelect) inst.speedSelect.value = String(inst.speed);
    if (inst.controls) inst.controls.hidden = false;

    on(inst, inst.playBtn, 'click', function () {
      inst.started = true;
      inst.toggle();
    });
    on(inst, fig.querySelector('[data-action="replay"]'), 'click', function () {
      inst.started = true;
      inst.replay();
    });
    on(inst, fig.querySelector('[data-action="reset"]'), 'click', function () { inst.started = true; inst.reset(); });
    on(inst, fig.querySelector('[data-action="inspect-close"]'), 'click', function () { inst.inspect(null); });
    on(inst, fig, 'click', function (e) { var node = e.target.closest && e.target.closest('.cf-node[data-inspectable="true"]'); if (node) inst.inspect(node.getAttribute('data-node')); });
    on(inst, fig, 'keydown', function (e) { var node = e.target.closest && e.target.closest('.cf-node[data-inspectable="true"]'); if (node && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopImmediatePropagation(); inst.inspect(node.getAttribute('data-node')); } else if (e.key === 'Escape' && inst.inspectNode) { e.preventDefault(); e.stopImmediatePropagation(); inst.inspect(null); } });
    on(inst, fig.querySelector('[data-action="prev"]'), 'click', function () {
      inst.step(-1);
    });
    on(inst, fig.querySelector('[data-action="next"]'), 'click', function () {
      inst.step(1);
    });
    on(inst, inst.scrubInput, 'input', function () {
      inst.pause();
      inst.started = true;
      var idx = parseInt(inst.scrubInput.value, 10) || 0;
      seek(inst, inst.frames[Math.max(0, Math.min(idx, inst.frames.length - 1))].at);
    });
    on(inst, inst.speedSelect, 'change', function () {
      inst.setSpeed(parseFloat(inst.speedSelect.value) || 1);
    });
    on(inst, fig, 'keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
      var k = e.key;
      if (k === ' ' || k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home') e.preventDefault();
      else return;
      inst.started = true;
      if (k === ' ') inst.toggle();
      else if (k === 'ArrowRight') inst.step(1);
      else if (k === 'ArrowLeft') inst.step(-1);
      else inst.replay();
    });

    fig._cf = inst;
    instances.push(inst);
    applyFrame(inst, frames.length - 1);
    inst.time = inst.total;
    updatePlayIcon(inst);
    if (io) io.observe(fig);
    else setVisible(inst, true);
    if (ro) ro.observe(fig);
  }

  function unmount(fig) {
    var inst = fig && fig._cf;
    if (!inst) return;
    if (io) io.unobserve(fig);
    if (ro) ro.unobserve(fig);
    for (var i = 0; i < inst.listeners.length; i++) {
      var l = inst.listeners[i];
      l[0].removeEventListener(l[1], l[2]);
    }
    var allNodes = fig.querySelectorAll('.cf-node'); for (var n = 0; n < allNodes.length; n++) if (allNodes[n]._cfTransformTimer) clearTimeout(allNodes[n]._cfTransformTimer);
    if (inst.inspectNode && inst.inspectNode.blur) inst.inspectNode.blur();
    inst.events.frame.length = 0; inst.events.complete.length = 0;
    instances.splice(instances.indexOf(inst), 1);
    delete fig._cf;
    if (!instances.length) stopGlobalListeners();
    schedule();
  }

  var onVisibilityChange = function () {
    docHidden = document.hidden;
    schedule();
  };

  function motionChanged() {
    if (reducedMotion())
      for (var i = 0; i < instances.length; i++) {
        instances[i].pause();
        seek(instances[i], instances[i].total - 1);
        instances[i].time = instances[i].total;
      }
    schedule();
  }
  var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function startGlobalListeners() {
    if (globalListenersActive) return;
    globalListenersActive = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (mq && mq.addEventListener) mq.addEventListener('change', motionChanged);
    if (typeof MutationObserver !== 'undefined') {
      globalMutationObserver = new MutationObserver(motionChanged);
      globalMutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }
  function stopGlobalListeners() {
    if (!globalListenersActive) return;
    globalListenersActive = false;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (mq && mq.removeEventListener) mq.removeEventListener('change', motionChanged);
    if (globalMutationObserver) { globalMutationObserver.disconnect(); globalMutationObserver = null; }
  }

  function mountAll() {
    var list = document.querySelectorAll('.cf:not(.cf-fallback)');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll, { once: true });
  } else {
    mountAll();
  }

  window.ClayFlow = { mount: mount, unmount: unmount, get: function (fig) { var inst = getInst(fig); if (!inst) return null; return { play: function () { inst.play(); }, pause: function () { inst.pause(); }, toggle: function () { inst.toggle(); }, replay: function () { inst.replay(); }, reset: function () { inst.reset(); }, step: function (dir) { inst.step(dir); }, seek: function (index) { inst.seek(index); }, setSpeed: function (n) { inst.setSpeed(n); }, inspect: function (id) { inst.inspect(id); }, on: function (event, fn) { return inst.on(event, fn); } }; } };
})();`;

export const CLAYFLOW_RUNTIME = SOURCE.replace(/^[ \t]+/gm, "")
  .replace(/^\/\/.*\n/gm, "")
  .trim();

export interface ClayFlowInstanceAPI {
  play(): void; pause(): void; toggle(): void; replay(): void; reset(): void;
  step(dir: number): void; seek(index: number): void; setSpeed(n: number): void;
  inspect(nodeId: string | null): void;
  on(event: "frame" | "complete", fn: (value?: number) => void): () => void;
}
