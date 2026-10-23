/**
 * ECHOS Chip - Standalone Engine & Performer (SYS.AI.MAYA.SESAME v1.0.0)
 * Paralinguistic vocal fillers, multi-take sampling, and turn-taking earcons.
 * Zero external dependencies. Self-contained WebAudio procedural synthesizer.
 */

var echosExports = (function (global) {
  'use strict';

  var ECHOS_VOICE_TAGS = [
    'hum', 'breath', 'exhale', 'chirp', 'gasp', 'sigh', 'purr',
    'click', 'groan', 'tsk', 'moan', 'buzz', 'laugh'
  ];

  var ECHOS_EARCONS = [
    'floor_want', 'floor_yield', 'floor_ack'
  ];

  var ECHOS_MOODS = {
    neutral: { hue: 215, hsl: 'hsl(215, 20%, 65%)', defaultSound: { tag: 'breath', lvl: 1 } },
    content: { hue: 145, hsl: 'hsl(145, 55%, 60%)', defaultSound: { tag: 'hum', lvl: 1 } },
    amused: { hue: 45, hsl: 'hsl(45, 90%, 60%)', defaultSound: { tag: 'laugh', lvl: 1 } },
    curious: { hue: 190, hsl: 'hsl(190, 80%, 60%)', defaultSound: { tag: 'chirp', lvl: 1 } },
    surprised: { hue: 280, hsl: 'hsl(280, 85%, 65%)', defaultSound: { tag: 'gasp', lvl: 2 } },
    disappointed: { hue: 230, hsl: 'hsl(230, 30%, 50%)', defaultSound: { tag: 'sigh', lvl: 2 } },
    frustrated: { hue: 15, hsl: 'hsl(15, 80%, 55%)', defaultSound: { tag: 'groan', lvl: 2 } },
    tired: { hue: 220, hsl: 'hsl(220, 20%, 45%)', defaultSound: { tag: 'sigh', lvl: 3 } },
    relieved: { hue: 165, hsl: 'hsl(165, 60%, 60%)', defaultSound: { tag: 'sigh', lvl: 1 } },
    thinking: { hue: 260, hsl: 'hsl(260, 60%, 65%)', defaultSound: { tag: 'hum', lvl: 2 } },
    desire: { hue: 330, hsl: 'hsl(330, 80%, 65%)', defaultSound: { tag: 'purr', lvl: 2 } },
    annoyed: { hue: 5, hsl: 'hsl(5, 75%, 55%)', defaultSound: { tag: 'tsk', lvl: 2 } }
  };

  var ECHOS_ALIASES = {
    satisfaction: { tag: 'hum', lvl: 1, mood: 'content' },
    contentment: { tag: 'hum', lvl: 1, mood: 'content' },
    disappointment: { tag: 'sigh', lvl: 2, mood: 'disappointed' },
    relief: { tag: 'sigh', lvl: 1, mood: 'relieved' },
    amusement: { tag: 'laugh', lvl: 1, mood: 'amused' },
    delight: { tag: 'chirp', lvl: 2, mood: 'amused' },
    curiosity: { tag: 'hum', lvl: 1, mood: 'curious' },
    surprise: { tag: 'gasp', lvl: 2, mood: 'surprised' },
    thinking: { tag: 'hum', lvl: 2, mood: 'thinking' },
    pondering: { tag: 'hum', lvl: 2, mood: 'thinking' },
    frustration: { tag: 'groan', lvl: 2, mood: 'frustrated' },
    annoyance: { tag: 'tsk', lvl: 2, mood: 'annoyed' },
    tired: { tag: 'sigh', lvl: 3, mood: 'tired' },
    weary: { tag: 'sigh', lvl: 3, mood: 'tired' },
    desire: { tag: 'purr', lvl: 2, mood: 'desire' },
    longing: { tag: 'purr', lvl: 2, mood: 'desire' },
    pleasure: { tag: 'hum', lvl: 2, mood: 'desire' }
  };

  /**
   * Parse an ECHOS marked text line into structured chunks.
   */
  function parseEchosLine(line) {
    if (!line) return { chunks: [], spoken: '', tags: [], unknown: [] };
    var chunks = [];
    var tags = [];
    var unknown = [];
    var spokenParts = [];

    var tagRegex = /\[([a-zA-Z_]+)(?::([1-3]))?(?:@([+-]?\d+)(?:ms)?)?(?:\s+(under))?\]/g;
    var lastIndex = 0;
    var match;

    while ((match = tagRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        var textPiece = line.slice(lastIndex, match.index);
        if (textPiece.length > 0) {
          chunks.push({ type: 'text', text: textPiece });
          spokenParts.push(textPiece);
        }
      }

      var rawName = match[1].toLowerCase();
      var lvlParsed = match[2] ? parseInt(match[2], 10) : undefined;
      var offsetParsed = match[3] ? parseInt(match[3], 10) : 0;
      var isUnder = match[4] === 'under';

      var effectiveTag = null;
      var effectiveLvl = lvlParsed || 2;

      if (ECHOS_VOICE_TAGS.indexOf(rawName) !== -1 || ECHOS_EARCONS.indexOf(rawName) !== -1) {
        effectiveTag = rawName;
      } else if (ECHOS_ALIASES[rawName]) {
        var alias = ECHOS_ALIASES[rawName];
        effectiveTag = alias.tag;
        if (!lvlParsed) effectiveLvl = alias.lvl;
      } else {
        unknown.push(rawName);
      }

      if (effectiveTag) {
        var soundChunk = {
          type: 'sound',
          tag: effectiveTag,
          lvl: effectiveLvl,
          offsetMs: offsetParsed,
          under: isUnder,
          rawTag: match[0]
        };
        chunks.push(soundChunk);
        tags.push(soundChunk);
      }

      lastIndex = tagRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      var remaining = line.slice(lastIndex);
      if (remaining.length > 0) {
        chunks.push({ type: 'text', text: remaining });
        spokenParts.push(remaining);
      }
    }

    var spoken = spokenParts.join('').replace(/\s+/g, ' ').trim();
    return { chunks: chunks, spoken: spoken, tags: tags, unknown: unknown };
  }

  /**
   * Procedural WebAudio sound generator with zero audio asset dependencies
   */
  function WebAudioSynthBank() {
    this.ctx = null;
  }

  WebAudioSynthBank.prototype.getAudioContext = function () {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(function () {});
    }
    return this.ctx;
  };

  WebAudioSynthBank.prototype.createNoiseBuffer = function (ctx, durationSec) {
    var bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var output = buffer.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  };

  WebAudioSynthBank.prototype.playProcedural = function (tag, lvl, take, cents, db) {
    lvl = lvl || 2;
    take = take || 1;
    cents = cents || 0;
    db = db || 0;

    var ctx = this.getAudioContext();
    if (!ctx) return { durationMs: 0, promise: Promise.resolve() };

    var now = ctx.currentTime;
    var masterGain = ctx.createGain();
    var gainScale = Math.pow(10, db / 20) * (lvl === 1 ? 0.65 : lvl === 3 ? 1.25 : 0.95);
    masterGain.gain.setValueAtTime(gainScale, now);
    masterGain.connect(ctx.destination);

    var pitchFactor = Math.pow(2, cents / 1200);
    var durationMs = 350;

    switch (tag) {
      case 'sigh': {
        durationMs = lvl === 1 ? 450 : lvl === 3 ? 850 : 650;
        var durSec = durationMs / 1000;
        var noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, durSec);
        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750 * pitchFactor, now);
        filter.frequency.exponentialRampToValueAtTime(220 * pitchFactor, now + durSec);
        filter.Q.setValueAtTime(2.2, now);
        var env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.25, now + 0.08);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);
        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        noise.start(now);
        noise.stop(now + durSec);
        break;
      }
      case 'breath': {
        durationMs = lvl === 1 ? 220 : lvl === 3 ? 420 : 320;
        var bDur = durationMs / 1000;
        var bNoise = ctx.createBufferSource();
        bNoise.buffer = this.createNoiseBuffer(ctx, bDur);
        var bFilter = ctx.createBiquadFilter();
        bFilter.type = 'bandpass';
        bFilter.frequency.setValueAtTime(500 * pitchFactor, now);
        bFilter.frequency.linearRampToValueAtTime(950 * pitchFactor, now + bDur * 0.7);
        bFilter.Q.setValueAtTime(1.8, now);
        var bEnv = ctx.createGain();
        bEnv.gain.setValueAtTime(0.001, now);
        bEnv.gain.exponentialRampToValueAtTime(0.18, now + bDur * 0.6);
        bEnv.gain.linearRampToValueAtTime(0.001, now + bDur);
        bNoise.connect(bFilter);
        bFilter.connect(bEnv);
        bEnv.connect(masterGain);
        bNoise.start(now);
        bNoise.stop(now + bDur);
        break;
      }
      case 'exhale': {
        durationMs = lvl === 1 ? 400 : lvl === 3 ? 800 : 600;
        var exDur = durationMs / 1000;
        var exNoise = ctx.createBufferSource();
        exNoise.buffer = this.createNoiseBuffer(ctx, exDur);
        var exFilter = ctx.createBiquadFilter();
        exFilter.type = 'bandpass';
        exFilter.frequency.setValueAtTime(850 * pitchFactor, now);
        exFilter.frequency.linearRampToValueAtTime(450 * pitchFactor, now + exDur);
        exFilter.Q.setValueAtTime(1.2, now);
        var exEnv = ctx.createGain();
        exEnv.gain.setValueAtTime(0.001, now);
        exEnv.gain.exponentialRampToValueAtTime(0.12, now + 0.1);
        exEnv.gain.linearRampToValueAtTime(0.001, now + exDur);
        exNoise.connect(exFilter);
        exFilter.connect(exEnv);
        exEnv.connect(masterGain);
        exNoise.start(now);
        exNoise.stop(now + exDur);
        break;
      }
      case 'gasp': {
        durationMs = 180;
        var gNoise = ctx.createBufferSource();
        gNoise.buffer = this.createNoiseBuffer(ctx, 0.18);
        var gFilter = ctx.createBiquadFilter();
        gFilter.type = 'bandpass';
        gFilter.frequency.setValueAtTime(450 * pitchFactor, now);
        gFilter.frequency.exponentialRampToValueAtTime(1300 * pitchFactor, now + 0.14);
        gFilter.Q.setValueAtTime(3.0, now);
        var gEnv = ctx.createGain();
        gEnv.gain.setValueAtTime(0.001, now);
        gEnv.gain.linearRampToValueAtTime(0.35, now + 0.06);
        gEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        gNoise.connect(gFilter);
        gFilter.connect(gEnv);
        gEnv.connect(masterGain);
        gNoise.start(now);
        gNoise.stop(now + 0.18);
        break;
      }
      case 'hum': {
        durationMs = lvl === 1 ? 300 : lvl === 3 ? 600 : 450;
        var hDur = durationMs / 1000;
        var osc = ctx.createOscillator();
        var baseFreq = (175 + (take % 3) * 15) * pitchFactor;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.96, now + hDur);
        var hFilter = ctx.createBiquadFilter();
        hFilter.type = 'lowpass';
        hFilter.frequency.setValueAtTime(480, now);
        var hEnv = ctx.createGain();
        hEnv.gain.setValueAtTime(0.001, now);
        hEnv.gain.linearRampToValueAtTime(0.3, now + 0.08);
        hEnv.gain.exponentialRampToValueAtTime(0.001, now + hDur);
        osc.connect(hFilter);
        hFilter.connect(hEnv);
        hEnv.connect(masterGain);
        osc.start(now);
        osc.stop(now + hDur);
        break;
      }
      case 'chirp': {
        durationMs = 120;
        var cOsc = ctx.createOscillator();
        cOsc.type = 'sine';
        cOsc.frequency.setValueAtTime(650 * pitchFactor, now);
        cOsc.frequency.exponentialRampToValueAtTime(1450 * pitchFactor, now + 0.12);
        var cEnv = ctx.createGain();
        cEnv.gain.setValueAtTime(0.001, now);
        cEnv.gain.linearRampToValueAtTime(0.2, now + 0.03);
        cEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        cOsc.connect(cEnv);
        cEnv.connect(masterGain);
        cOsc.start(now);
        cOsc.stop(now + 0.12);
        break;
      }
      case 'laugh': {
        durationMs = 420;
        for (var p = 0; p < 3; p++) {
          var pStart = now + p * 0.13;
          var lOsc = ctx.createOscillator();
          lOsc.type = 'sine';
          lOsc.frequency.setValueAtTime((240 - p * 15) * pitchFactor, pStart);
          var lEnv = ctx.createGain();
          lEnv.gain.setValueAtTime(0.001, pStart);
          lEnv.gain.linearRampToValueAtTime(0.22, pStart + 0.03);
          lEnv.gain.exponentialRampToValueAtTime(0.001, pStart + 0.11);
          lOsc.connect(lEnv);
          lEnv.connect(masterGain);
          lOsc.start(pStart);
          lOsc.stop(pStart + 0.12);
        }
        break;
      }
      case 'purr': {
        durationMs = 500;
        var pOsc = ctx.createOscillator();
        pOsc.type = 'sawtooth';
        pOsc.frequency.setValueAtTime(110 * pitchFactor, now);
        var tremolo = ctx.createOscillator();
        tremolo.frequency.setValueAtTime(24, now);
        var tremoloGain = ctx.createGain();
        tremoloGain.gain.setValueAtTime(0.12, now);
        tremolo.connect(tremoloGain.gain);
        var pFilter = ctx.createBiquadFilter();
        pFilter.type = 'lowpass';
        pFilter.frequency.setValueAtTime(320, now);
        var purrEnv = ctx.createGain();
        purrEnv.gain.setValueAtTime(0.001, now);
        purrEnv.gain.linearRampToValueAtTime(0.22, now + 0.1);
        purrEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        pOsc.connect(pFilter);
        pFilter.connect(purrEnv);
        purrEnv.connect(masterGain);
        tremolo.start(now);
        pOsc.start(now);
        tremolo.stop(now + 0.5);
        pOsc.stop(now + 0.5);
        break;
      }
      case 'click': {
        durationMs = 40;
        var clkNoise = ctx.createBufferSource();
        clkNoise.buffer = this.createNoiseBuffer(ctx, 0.04);
        var clkFilter = ctx.createBiquadFilter();
        clkFilter.type = 'bandpass';
        clkFilter.frequency.setValueAtTime(2200 * pitchFactor, now);
        clkFilter.Q.setValueAtTime(4.0, now);
        var clkEnv = ctx.createGain();
        clkEnv.gain.setValueAtTime(0.4, now);
        clkEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        clkNoise.connect(clkFilter);
        clkFilter.connect(clkEnv);
        clkEnv.connect(masterGain);
        clkNoise.start(now);
        clkNoise.stop(now + 0.04);
        break;
      }
      case 'tsk': {
        durationMs = 120;
        for (var i = 0; i < 2; i++) {
          var tStart = now + i * 0.055;
          var tNoise = ctx.createBufferSource();
          tNoise.buffer = this.createNoiseBuffer(ctx, 0.03);
          var tFilter = ctx.createBiquadFilter();
          tFilter.type = 'highpass';
          tFilter.frequency.setValueAtTime(3000 * pitchFactor, tStart);
          var tEnv = ctx.createGain();
          tEnv.gain.setValueAtTime(0.3, tStart);
          tEnv.gain.exponentialRampToValueAtTime(0.001, tStart + 0.025);
          tNoise.connect(tFilter);
          tFilter.connect(tEnv);
          tEnv.connect(masterGain);
          tNoise.start(tStart);
          tNoise.stop(tStart + 0.03);
        }
        break;
      }
      case 'groan': {
        durationMs = 380;
        var grOsc = ctx.createOscillator();
        grOsc.type = 'sawtooth';
        grOsc.frequency.setValueAtTime(140 * pitchFactor, now);
        grOsc.frequency.exponentialRampToValueAtTime(85 * pitchFactor, now + 0.38);
        var grFilter = ctx.createBiquadFilter();
        grFilter.type = 'lowpass';
        grFilter.frequency.setValueAtTime(380, now);
        var grEnv = ctx.createGain();
        grEnv.gain.setValueAtTime(0.001, now);
        grEnv.gain.linearRampToValueAtTime(0.24, now + 0.06);
        grEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        grOsc.connect(grFilter);
        grFilter.connect(grEnv);
        grEnv.connect(masterGain);
        grOsc.start(now);
        grOsc.stop(now + 0.38);
        break;
      }
      case 'moan': {
        durationMs = 450;
        var mOsc = ctx.createOscillator();
        mOsc.type = 'triangle';
        mOsc.frequency.setValueAtTime(210 * pitchFactor, now);
        mOsc.frequency.linearRampToValueAtTime(190 * pitchFactor, now + 0.45);
        var mFilter = ctx.createBiquadFilter();
        mFilter.type = 'bandpass';
        mFilter.frequency.setValueAtTime(600, now);
        mFilter.Q.setValueAtTime(1.5, now);
        var mEnv = ctx.createGain();
        mEnv.gain.setValueAtTime(0.001, now);
        mEnv.gain.linearRampToValueAtTime(0.25, now + 0.09);
        mEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        mOsc.connect(mFilter);
        mFilter.connect(mEnv);
        mEnv.connect(masterGain);
        mOsc.start(now);
        mOsc.stop(now + 0.45);
        break;
      }
      case 'buzz': {
        durationMs = 280;
        var bzOsc = ctx.createOscillator();
        bzOsc.type = 'sawtooth';
        bzOsc.frequency.setValueAtTime(95 * pitchFactor, now);
        var bzFilter = ctx.createBiquadFilter();
        bzFilter.type = 'bandpass';
        bzFilter.frequency.setValueAtTime(260, now);
        bzFilter.Q.setValueAtTime(3.5, now);
        var bzEnv = ctx.createGain();
        bzEnv.gain.setValueAtTime(0.001, now);
        bzEnv.gain.linearRampToValueAtTime(0.28, now + 0.04);
        bzEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        bzOsc.connect(bzFilter);
        bzFilter.connect(bzEnv);
        bzEnv.connect(masterGain);
        bzOsc.start(now);
        bzOsc.stop(now + 0.28);
        break;
      }
      case 'floor_want': {
        durationMs = 200;
        var notes = [523.25, 783.99];
        notes.forEach(function (freq, idx) {
          var tStart = now + idx * 0.09;
          var wOsc = ctx.createOscillator();
          wOsc.type = 'sine';
          wOsc.frequency.setValueAtTime(freq * pitchFactor, tStart);
          var wEnv = ctx.createGain();
          wEnv.gain.setValueAtTime(0.001, tStart);
          wEnv.gain.linearRampToValueAtTime(0.18, tStart + 0.015);
          wEnv.gain.exponentialRampToValueAtTime(0.001, tStart + 0.08);
          wOsc.connect(wEnv);
          wEnv.connect(masterGain);
          wOsc.start(tStart);
          wOsc.stop(tStart + 0.085);
        });
        break;
      }
      case 'floor_yield': {
        durationMs = 240;
        var yNoise = ctx.createBufferSource();
        yNoise.buffer = this.createNoiseBuffer(ctx, 0.02);
        var yFilter = ctx.createBiquadFilter();
        yFilter.type = 'highpass';
        yFilter.frequency.setValueAtTime(2500, now);
        var ynEnv = ctx.createGain();
        ynEnv.gain.setValueAtTime(0.15, now);
        ynEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        yNoise.connect(yFilter);
        yFilter.connect(ynEnv);
        ynEnv.connect(masterGain);
        yNoise.start(now);
        yNoise.stop(now + 0.02);

        var yOsc = ctx.createOscillator();
        yOsc.type = 'sine';
        yOsc.frequency.setValueAtTime(659.25 * pitchFactor, now + 0.02);
        yOsc.frequency.exponentialRampToValueAtTime(440.0 * pitchFactor, now + 0.22);
        var yEnv = ctx.createGain();
        yEnv.gain.setValueAtTime(0.001, now + 0.02);
        yEnv.gain.linearRampToValueAtTime(0.15, now + 0.04);
        yEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        yOsc.connect(yEnv);
        yEnv.connect(masterGain);
        yOsc.start(now + 0.02);
        yOsc.stop(now + 0.23);
        break;
      }
      case 'floor_ack': {
        durationMs = 140;
        for (var a = 0; a < 2; a++) {
          var aStart = now + a * 0.06;
          var aOsc = ctx.createOscillator();
          aOsc.type = 'sine';
          aOsc.frequency.setValueAtTime(880 * pitchFactor, aStart);
          var aEnv = ctx.createGain();
          aEnv.gain.setValueAtTime(0.001, aStart);
          aEnv.gain.linearRampToValueAtTime(0.12, aStart + 0.01);
          aEnv.gain.exponentialRampToValueAtTime(0.001, aStart + 0.045);
          aOsc.connect(aEnv);
          aEnv.connect(masterGain);
          aOsc.start(aStart);
          aOsc.stop(aStart + 0.05);
        }
        break;
      }
      default:
        durationMs = 100;
        break;
    }

    var promise = new Promise(function (resolve) {
      setTimeout(resolve, durationMs);
    });

    return { durationMs: durationMs, promise: promise };
  };

  /**
   * EchosEngine Client
   */
  function EchosEngine() {
    this.synthBank = new WebAudioSynthBank();
    this.listeners = [];
    this.eventListeners = [];
    this.eventLog = [];
    this.state = {
      mood: 'neutral',
      hue: 215,
      level: 2,
      speaking: false,
      sessionActive: false,
      rr: {}
    };
    this.idleTimer = null;
    this.IDLE_THRESHOLD_MS = 30000;
  }

  EchosEngine.prototype.resetIdleTimer = function () {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.state.sessionActive && !this.state.speaking) {
      this.startIdleTimer();
    }
  };

  EchosEngine.prototype.startIdleTimer = function () {
    var self = this;
    if (this.idleTimer) return;
    this.idleTimer = setTimeout(function () {
      if (self.state.sessionActive && !self.state.speaking) {
        self.play('breath', 1, { db: -15 }); // Subtle idle breath
        self.idleTimer = null;
        self.startIdleTimer();
      }
    }, this.IDLE_THRESHOLD_MS);
  };

  EchosEngine.prototype.pickTake = function (tag, lvl) {
    var key = tag + ':' + lvl;
    var last = this.state.rr[key] || 0;
    var next = (last % 5) + 1;
    this.state.rr[key] = next;
    return next;
  };

  EchosEngine.prototype.plan = function (line) {
    var parsed = parseEchosLine(line);
    var self = this;
    var items = [];
    var detectedMood = this.state.mood;

    var msPerChar = 72; // Average timing for speech synthesis
    var currentOffsetMs = 0;

    parsed.chunks.forEach(function (chunk, idx) {
      if (chunk.type === 'text') {
        var text = chunk.text;
        
        // Scan for long pauses (ellipsis or multiple periods)
        var ellipsisRegex = /\.{2,}/g;
        var match;
        while ((match = ellipsisRegex.exec(text)) !== null) {
          // Randomized probability to inject a subtle exhale during a long pause
          if (Math.random() > 0.35) {
            var pauseOffset = currentOffsetMs + (match.index * msPerChar);
            var take = self.pickTake('exhale', 1);
            var cents = Math.round((Math.random() * 80 - 40) * 10) / 10;
            var db = -20 + (Math.random() * 6); // Very subtle

            items.push({
              tag: 'exhale',
              lvl: 1,
              take: take,
              cents: cents,
              db: db,
              mode: 'offset',
              offsetMs: Math.max(0, Math.round(pauseOffset + 50)),
              durationMs: 600,
              chunkIndex: idx
            });
          }
        }
        
        currentOffsetMs += text.length * msPerChar;
      } else if (chunk.type === 'sound') {
        var tag = chunk.tag;
        var lvl = chunk.lvl;
        var take = self.pickTake(tag, lvl);
        var cents = Math.round((Math.random() * 120 - 60) * 10) / 10;
        var db = Math.round((Math.random() * 3 - 2) * 10) / 10;
        var mode = chunk.under ? 'under' : (chunk.offsetMs !== 0 ? 'offset' : 'gap');
        
        // Use explicit offset if provided, otherwise estimate from current character position
        var itemOffset = chunk.offsetMs !== 0 ? chunk.offsetMs : currentOffsetMs;

        var durationMs = 350;
        if (tag === 'sigh') durationMs = lvl === 1 ? 450 : lvl === 3 ? 850 : 650;
        else if (tag === 'breath') durationMs = lvl === 1 ? 220 : lvl === 3 ? 420 : 320;
        else if (tag === 'exhale') durationMs = lvl === 1 ? 400 : lvl === 3 ? 800 : 600;
        else if (tag === 'gasp') durationMs = 180;
        else if (tag === 'chirp') durationMs = 120;
        else if (tag === 'laugh') durationMs = 420;
        else if (tag === 'purr') durationMs = 500;
        else if (tag === 'click') durationMs = 40;
        else if (tag === 'tsk') durationMs = 120;
        else if (tag === 'groan') durationMs = 380;
        else if (tag === 'moan') durationMs = 450;
        else if (tag === 'buzz') durationMs = 280;
        else if (tag === 'floor_want') durationMs = 200;
        else if (tag === 'floor_yield') durationMs = 240;
        else if (tag === 'floor_ack') durationMs = 140;

        items.push({
          tag: tag,
          lvl: lvl,
          take: take,
          cents: cents,
          db: db,
          mode: mode,
          offsetMs: itemOffset,
          durationMs: durationMs,
          chunkIndex: idx
        });

        for (var m in ECHOS_MOODS) {
          if (ECHOS_MOODS[m].defaultSound.tag === tag) {
            detectedMood = m;
            break;
          }
        }
      }
    });

    var hue = ECHOS_MOODS[detectedMood] ? ECHOS_MOODS[detectedMood].hue : 215;

    return {
      v: 1,
      spoken: parsed.spoken,
      items: items,
      mood: detectedMood,
      hue: hue
    };
  };

  EchosEngine.prototype.play = function (tag, lvl, opts) {
    lvl = lvl || 2;
    opts = opts || {};
    var take = opts.take || this.pickTake(tag, lvl);
    var cents = typeof opts.cents === 'number' ? opts.cents : (Math.random() * 80 - 40);
    var db = typeof opts.db === 'number' ? opts.db : (Math.random() * 2 - 1);
    var mode = opts.mode || 'gap';
    var off = opts.off || 0;

    var result = this.synthBank.playProcedural(tag, lvl, take, cents, db);

    var ev = {
      tag: tag,
      take: take,
      lvl: lvl,
      t: Date.now(),
      ev: 'sfx',
      src: 'synth',
      cents: cents,
      db: db,
      mode: mode,
      off: off,
      out: 'audio',
      ms: result.durationMs
    };

    this.eventLog.push(ev);
    this.eventListeners.forEach(function (cb) { cb(ev); });

    this.setState({
      lastTag: tag,
      level: lvl
    });
    this.resetIdleTimer();

    return result;
  };

  EchosEngine.prototype.setState = function (partial) {
    var changed = false;
    var oldSpeaking = this.state.speaking;
    var oldSession = this.state.sessionActive;

    for (var k in partial) {
      if (partial[k] !== undefined && this.state[k] !== partial[k]) {
        this.state[k] = partial[k];
        changed = true;
      }
    }
    if (partial.mood && ECHOS_MOODS[partial.mood]) {
      this.state.hue = ECHOS_MOODS[partial.mood].hue;
      changed = true;
    }
    if (changed) {
      if (this.state.speaking !== oldSpeaking || this.state.sessionActive !== oldSession) {
        this.resetIdleTimer();
      }
      var self = this;
      this.listeners.forEach(function (cb) { cb(self.state); });
    }
  };

  EchosEngine.prototype.onState = function (cb) {
    this.listeners.push(cb);
    cb(this.state);
    var self = this;
    return function () {
      var idx = self.listeners.indexOf(cb);
      if (idx !== -1) self.listeners.splice(idx, 1);
    };
  };

  EchosEngine.prototype.onEvent = function (cb) {
    this.eventListeners.push(cb);
    var self = this;
    return function () {
      var idx = self.eventListeners.indexOf(cb);
      if (idx !== -1) self.eventListeners.splice(idx, 1);
    };
  };

  var defaultEchos = new EchosEngine();

  var exportsObj = {
    ECHOS_VOICE_TAGS: ECHOS_VOICE_TAGS,
    ECHOS_EARCONS: ECHOS_EARCONS,
    ECHOS_MOODS: ECHOS_MOODS,
    ECHOS_ALIASES: ECHOS_ALIASES,
    parseEchosLine: parseEchosLine,
    parse: parseEchosLine,
    WebAudioSynthBank: WebAudioSynthBank,
    EchosEngine: EchosEngine,
    echos: defaultEchos
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  }
  if (typeof global !== 'undefined') {
    global.MythosEchos = defaultEchos;
    global.echos = defaultEchos;
  }

    // Also support ES module exports if environment supports it
    if (typeof window !== 'undefined') {
      window.MythosEchos = defaultEchos;
      window.echos = defaultEchos;
    }

    return exportsObj;
  })(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

  export const {
    ECHOS_VOICE_TAGS,
    ECHOS_EARCONS,
    ECHOS_MOODS,
    ECHOS_ALIASES,
    parseEchosLine,
    parse,
    WebAudioSynthBank,
    EchosEngine,
    echos
  } = echosExports;

  export default echosExports.echos;
