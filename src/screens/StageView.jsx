import React, { useEffect, useRef, useState } from 'react';
import { ui, useUI } from '../game/bridge.js';
import { ensureGame } from '../game/runtime.js';
import { session } from '../game/session.js';
import { Progress } from '../../game/progress.js';
import { HDATA } from '../../game/game-data.js';
import { SND } from '../../game/game-audio.js';
import { createStage } from '../../game/stage.js';

function pctWidth(v) {
  return Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 100) + '%';
}

function normalize(h) {
  const src = h || {};
  const chargeMax = HDATA.SUPER && HDATA.SUPER.chargeMax ? HDATA.SUPER.chargeMax : 18;
  const bossRaw = src.boss;
  const boss =
    bossRaw && typeof bossRaw === 'object'
      ? bossRaw
      : src.bossAlive
        ? { name: src.bossName || src.bossLabel, pct: src.bossPct }
        : null;
  return {
    score: Math.max(0, src.score | 0),
    lives: src.lives != null ? src.lives : HDATA.LIVES,
    bombs: src.bombs != null ? src.bombs : src.bomb != null ? src.bomb : HDATA.BOMBS_START,
    obj: src.obj || src.objectiveText || src.objective || '',
    pct:
      src.pct != null
        ? src.pct
        : src.objectivePct != null
          ? src.objectivePct
          : src.progress != null
            ? src.progress
            : 0,
    boss: boss
      ? {
          name: boss.name || boss.label || 'CHEFE',
          pct: boss.pct != null ? boss.pct : boss.hpPct != null ? boss.hpPct : 0
        }
      : null,
    superPct:
      src.super != null
        ? src.super
        : src.superPct != null
          ? src.superPct
          : src.superCharge != null
            ? src.superCharge / chargeMax
            : 0,
    act: src.act || 'opening',
    actName: src.actName || 'COMEÇO',
    level: Math.max(1, src.level | 0),
    xp: Math.max(0, src.xp | 0),
    xpNext: Math.max(1, src.xpNext != null ? src.xpNext | 0 : ((HDATA.LEVEL_UP && HDATA.LEVEL_UP.firstXp) || 5)),
    xpPct: Math.max(0, Math.min(1, Number(src.xpPct) || 0)),
    spec: src.spec === 'A' || src.spec === 'B' ? src.spec : null,
    label: src.campaignLabel || null
  };
}

export default function StageView() {
  const view = useUI();
  const stageRef = useRef(null);
  const engineRef = useRef(null);
  const padRef = useRef(null);
  const pointerRef = useRef(null);
  const [banner, setBanner] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [levelChoice, setLevelChoice] = useState(0);
  const [padOffset, setPadOffset] = useState({ x: 0, y: 0 });
  const [, force] = useState(0);

  const setVirtualAxes = (x, y) => {
    const input = engineRef.current && engineRef.current.virtualInput;
    if (input){ input.x = x; input.y = y; }
  };

  const updatePad = (event) => {
    const rect = padRef.current && padRef.current.getBoundingClientRect();
    if (!rect) return;
    const radius = Math.min(rect.width, rect.height) * 0.34;
    const rawX = (event.clientX - (rect.left + rect.width / 2)) / radius;
    const rawY = (event.clientY - (rect.top + rect.height / 2)) / radius;
    const length = Math.hypot(rawX, rawY);
    const strength = Math.min(1, length);
    const x = length > 0.08 ? (rawX / length) * strength : 0;
    const y = length > 0.08 ? (rawY / length) * strength : 0;
    setVirtualAxes(x, y);
    setPadOffset({ x: x * radius, y: y * radius });
  };

  const releasePad = (event) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    setVirtualAxes(0, 0);
    setPadOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    let dead = false;
    let stage = null;
    let stopped = false;

    const stopAll = () => {
      if (stage) {
        try {
          stage.destroy();
        } catch (e) {}
        stage = null;
      }
      stageRef.current = null;
      if (!stopped) {
        stopped = true;
        try {
          if (engineRef.current) {
            engineRef.current.stop();
            engineRef.current.virtualInput = { x: 0, y: 0, bomb: false };
            engineRef.current.clearFrame();
          }
        } catch (e) {}
      }
    };

    ensureGame()
      .then((engine) => {
        if (dead) return;
        const cur = session.current;
        if (!cur) {
          ui.set({ screen: 'title', hud: null });
          return;
        }
        engineRef.current = engine;
        try {
          stage = createStage(engine, cur, {
            onHud: (h) => ui.set({ hud: h }),
            onLevelUp: (info) => {
              setLevelUp(info);
              setLevelChoice(0);
            },
            onBanner: (text, ms) =>
              setBanner({ text: String(text), until: Date.now() + (ms || 1500) }),
            onFinish: (r) => {
              const res = r || {};
              const c = res.c != null ? res.c : cur.c;
              const p = res.p != null ? res.p : cur.p;
              if (res.victory) Progress.complete(c, p);
              Progress.setHigh(res.score || 0);
              ui.set({ screen: 'result', result: { ...res, c, p }, hud: null });
              stopAll();
            },
            onExit: () => {
              ui.set({ screen: 'title', hud: null, result: null });
              stopAll();
            }
          });
        } catch (e) {
          console.error('createStage failed', e);
          ui.set({ screen: 'title', hud: null, result: null });
          stopAll();
          return;
        }
        stageRef.current = stage;
        engine.start((dt) => {
          if (stageRef.current) stageRef.current.update(dt);
        });
      })
      .catch((e) => {
        console.error('ensureGame failed', e);
        ui.set({ screen: 'title', hud: null, result: null });
      });

    return () => {
      dead = true;
      stopAll();
    };
  }, []);

  useEffect(() => {
    if (!levelUp || !levelUp.choices || !levelUp.choices.length) return undefined;
    const onKey = (event) => {
      if (event.repeat && event.code !== 'ArrowDown' && event.code !== 'ArrowRight' && event.code !== 'ArrowUp' && event.code !== 'ArrowLeft') return;
      if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
        event.preventDefault();
        setLevelChoice((index) => (index + 1) % levelUp.choices.length);
      } else if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
        event.preventDefault();
        setLevelChoice((index) => (index - 1 + levelUp.choices.length) % levelUp.choices.length);
      } else if (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyZ') {
        event.preventDefault();
        const choice = levelUp.choices[Math.min(levelChoice, levelUp.choices.length - 1)];
        if (choice && stageRef.current && stageRef.current.chooseUpgrade) {
          stageRef.current.chooseUpgrade(choice.id);
        }
      } else if (event.code === 'Escape') {
        event.preventDefault();
        if (stageRef.current && stageRef.current.cancelLevelUp) stageRef.current.cancelLevelUp();
      } else if (event.code === 'KeyM') {
        SND.setMuted(!SND.muted);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [levelUp, levelChoice]);

  useEffect(() => {
    const t = setInterval(() => {
      setBanner((b) => (b && Date.now() >= b.until ? null : b));
      force((n) => n + 1);
    }, 150);
    return () => clearInterval(t);
  }, []);

  const cur = session.current || {};
  const letter = 'ABCDE'.charAt(cur.c) || 'A';
  const phaseNum = (cur.c | 0) * 5 + (cur.p | 0) + 1;
  const h = normalize(view.hud);
  const superPct = Math.max(0, Math.min(1, h.superPct));
  const superFull = superPct >= 1;
  const lives = Math.min(12, Math.max(0, h.lives | 0));
  const spec = h.spec || (cur.spec === 'B' ? 'B' : 'A');
  const label = h.label || 'CAMPANHA ' + letter + ' · FASE ' + phaseNum;
  const phaseActIndex = ['opening', 'middle', 'final'].indexOf(h.act);
  const selectUpgrade = (choice) => {
    if (stageRef.current && stageRef.current.chooseUpgrade) stageRef.current.chooseUpgrade(choice.id);
  };

  return (
    <div className="hud">
      <div className="hud-topleft">
        <div className="hud-score">{String(h.score).padStart(6, '0')}</div>
        <div className="hud-label">{label}</div>
      </div>
      <div className="hud-topright">
        <div className="hud-lives">
          {Array.from({ length: lives }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="hud-bombs">B×{h.bombs}</div>
        <div className={spec === 'B' ? 'hud-spec is-b' : 'hud-spec is-a'}>{spec}</div>
      </div>
      <div className="hud-obj">
        <div className="hud-phase-track" aria-label={`Ato atual: ${h.actName}`}>
          {['COMEÇO', 'MEIO', 'FINAL'].map((name, index) => (
            <span
              key={name}
              className={index === phaseActIndex ? 'is-active' : index < phaseActIndex ? 'is-complete' : ''}
            >
              {name}
            </span>
          ))}
        </div>
        <div className={h.boss ? 'hud-objlabel is-boss' : 'hud-objlabel'}>
          {h.boss ? `CHEFE: ${h.boss.name}` : h.obj}
        </div>
        <div className="hud-bar">
          <span
            className={h.boss ? 'hud-barfill is-boss' : 'hud-barfill'}
            style={{ width: pctWidth(h.boss ? h.boss.pct : h.pct) }}
          />
        </div>
      </div>
      <div className="hud-runlevel" aria-label={`Nível ${h.level}, experiência ${h.xp} de ${h.xpNext}`}>
        <div className="hud-runlevel-label">
          <b>LV {String(h.level).padStart(2, '0')}</b>
          <span>EXP {h.xp}/{h.xpNext}</span>
        </div>
        <div className="hud-runxp"><i style={{ width: pctWidth(h.xpPct) }} /></div>
      </div>
      <div className="hud-super">
        <span className={superFull ? 'hud-superlabel is-full' : 'hud-superlabel'}>SUPER</span>
        <div className="hud-superbar">
          <span
            className={superFull ? 'hud-superfill is-full' : 'hud-superfill'}
            style={{ width: pctWidth(superPct) }}
          />
        </div>
      </div>
      {banner && (
        <div className="hud-banner" key={banner.text + banner.until}>
          {banner.text}
        </div>
      )}
      <div className="touch-controls" aria-label="Controles de toque">
        <button
          ref={padRef}
          type="button"
          className="touch-pad"
          aria-label="Mover a nave"
          onPointerDown={(event) => {
            event.preventDefault();
            pointerRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            updatePad(event);
          }}
          onPointerMove={(event) => {
            if (pointerRef.current === event.pointerId) updatePad(event);
          }}
          onPointerUp={releasePad}
          onPointerCancel={releasePad}
          onLostPointerCapture={releasePad}
        >
          <span className="touch-pad-ring" />
          <span className="touch-pad-knob" style={{ transform: `translate(${padOffset.x}px, ${padOffset.y}px)` }} />
        </button>
        <button
          type="button"
          className="touch-bomb"
          aria-label={`Usar bomba, ${h.bombs} restantes`}
          disabled={h.bombs <= 0}
          onClick={() => {
            if (engineRef.current && engineRef.current.virtualInput) engineRef.current.virtualInput.bomb = true;
          }}
        >
          <span aria-hidden="true">✦</span>
          <b>BOMBA</b>
          <small>{h.bombs}</small>
        </button>
      </div>
      {levelUp && (
        <div className="levelup-overlay">
          <section className="levelup-panel" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
            <div className="levelup-kicker">NÍVEL {String(levelUp.level).padStart(2, '0')} ALCANÇADO</div>
            <h2 id="levelup-title">APERFEIÇOE SEU DISPARO</h2>
            <div className="levelup-choices">
              {levelUp.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  type="button"
                  className={index === levelChoice ? 'levelup-card is-selected' : 'levelup-card'}
                  onClick={() => selectUpgrade(choice)}
                >
                  <span className="levelup-icon" aria-hidden="true">{choice.icon}</span>
                  <span className="levelup-copy">
                    <b>{choice.name}</b>
                    <small>{choice.desc} · {choice.rank}/{choice.max}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="levelup-hint">↑↓ ESCOLHE · ENTER CONFIRMA · ESC PULA</div>
          </section>
        </div>
      )}
    </div>
  );
}
