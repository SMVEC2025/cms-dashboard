import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PAD = 12;   // spotlight padding around target
const GAP = 16;   // gap between spotlight edge and tooltip
const TW = 340;  // tooltip width (regular)
const TW_WL = 360;  // tooltip width (welcome/centered step)

function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }

/** Compute tooltip top/left using only top+left (no transform) so CSS transitions work */
function computeStyle(rect, tH, isWelcome) {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const tw = isWelcome ? TW_WL : TW;
  const safeH = tH || (isWelcome ? 260 : 200);

  if (!rect) {
    return {
      position: 'fixed',
      top: Math.max(GAP, (vh - safeH) / 2),
      left: Math.max(GAP, (vw - tw) / 2),
    };
  }

  let top;
  if (vh - rect.bottom - GAP >= safeH) {
    top = rect.bottom + GAP;
  } else if (rect.top - GAP >= safeH) {
    top = rect.top - safeH - GAP;
  } else {
    top = rect.bottom + GAP; // best effort
  }

  return {
    position: 'fixed',
    top: clamp(top, GAP, vh - safeH - GAP),
    left: clamp(rect.left + rect.width / 2 - tw / 2, GAP, vw - tw - GAP),
  };
}

function OnboardingTour({ steps, isOpen, onFinish }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [style, setStyle] = useState({});
  const [contentKey, setContentKey] = useState(0);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isWelcome = !current?.target;
  const progress = ((step + 1) / steps.length) * 100;

  // Reset when tour opens/closes
  useEffect(() => {
    if (isOpen) { setStep(0); setContentKey(0); setRect(null); }
  }, [isOpen]);

  // Locate target + position tooltip
  useEffect(() => {
    if (!isOpen || !current) return;
    clearTimeout(timerRef.current);

    if (!current.target) {
      setRect(null);
      setStyle(computeStyle(null, tooltipRef.current?.offsetHeight, true));
      return;
    }

    const el = document.querySelector(current.target);
    if (!el) {
      setStyle(computeStyle(null, tooltipRef.current?.offsetHeight, false));
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Wait for scroll to settle, then measure
    timerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      const ok = r.width > 0 && r.height > 0 &&
        r.top < window.innerHeight && r.bottom > 0 &&
        r.left < window.innerWidth && r.right > 0;
      if (ok) {
        setRect(r);
        setStyle(computeStyle(r, tooltipRef.current?.offsetHeight, false));
      } else {
        setRect(null);
        setStyle(computeStyle(null, tooltipRef.current?.offsetHeight, false));
      }
    }, 320);

    return () => clearTimeout(timerRef.current);
  }, [isOpen, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalc after tooltip renders with real height
  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return;
    setStyle(computeStyle(rect, tooltipRef.current.offsetHeight, isWelcome));
  }, [rect, isOpen, isWelcome]);

  // Resize
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      if (!current?.target) return;
      const el = document.querySelector(current.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect(r);
      setStyle(computeStyle(r, tooltipRef.current?.offsetHeight, false));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, current]);

  if (!isOpen) return null;

  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Spotlight rect with padding
  const sr = rect ? {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    bottom: rect.bottom + PAD,
    right: rect.right + PAD,
  } : null;

  // Always render 4 panels so CSS transitions animate smoothly between steps
  const panels = {
    top: { top: 0, left: 0, right: 0, height: sr ? Math.max(0, sr.top) : vh },
    bottom: { top: sr ? sr.bottom : vh, left: 0, right: 0, bottom: 0 },
    left: { top: sr ? sr.top : 0, left: 0, width: sr ? Math.max(0, sr.left) : 0, height: sr ? sr.height : 0 },
    right: { top: sr ? sr.top : 0, left: sr ? sr.right : vw, right: 0, height: sr ? sr.height : 0 },
  };

  const go = (next) => {
    setContentKey((k) => k + 1);
    if (next >= steps.length) { onFinish(); } else { setStep(next); }
  };

  return createPortal(
    <div className="tour-root" role="dialog" aria-modal="true" aria-label={current?.title || 'Tour'}>
      {/* 4-panel overlay */}
      <div className="tour-overlay" style={panels.top} />
      <div className="tour-overlay" style={panels.bottom} />
      <div className="tour-overlay" style={panels.left} />
      <div className="tour-overlay" style={panels.right} />

      {/* Spotlight ring */}
      {sr && (
        <div
          className="tour-spotlight"
          style={{ top: sr.top, left: sr.left, width: sr.width, height: sr.height }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`tour-tooltip${isWelcome ? ' tour-tooltip--welcome' : ''}`}
        style={style}
      >


        {/* Content block – keyed so it re-animates on each step */}
        <div className="tour-tooltip__body-wrap" key={contentKey}>
          {isWelcome ? (
            /* ── Welcome layout ── */
            <div className="tour-tooltip__welcome">
              <button type="button" className="tour-tooltip__close" onClick={onFinish} aria-label="Close tour">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <p className="tour-tooltip__title">{current?.title}</p>
              <p className="tour-tooltip__desc">{current?.content}</p>
              <div className="tour-tooltip__dots tour-tooltip__dots--centered">
                {steps.map((_, i) => (
                  <button key={i} type="button"
                    className={`tour-dot${i === step ? ' is-active' : ''}`}
                    onClick={() => go(i)} aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>
              <button type="button" className="tour-tooltip__next tour-tooltip__next--lg" onClick={() => go(step + 1)}>
                {isLast ? 'Get started' : "Let's begin"}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          ) : (
            /* ── Regular step layout ── */
            <div className="tour-tooltip__step-body">
              <div className="tour-tooltip__step-header">
                <p className="tour-tooltip__title">{current?.title}</p>
                <button type="button" className="tour-tooltip__close" onClick={onFinish} aria-label="Close tour">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <p className="tour-tooltip__desc">{current?.content}</p>

              <div className="tour-tooltip__footer">
                <span className="tour-tooltip__counter">{step + 1} / {steps.length}</span>
                <div className="tour-tooltip__dots">
                  {steps.map((_, i) => (
                    <button key={i} type="button"
                      className={`tour-dot${i === step ? ' is-active' : ''}`}
                      onClick={() => go(i)} aria-label={`Step ${i + 1}`}
                    />
                  ))}
                </div>
                <button type="button" className="tour-tooltip__next" onClick={() => go(step + 1)}>
                  {isLast ? 'Done' : 'Next'}
                  {!isLast && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default OnboardingTour;
