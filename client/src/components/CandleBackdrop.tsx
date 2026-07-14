/** Декоративные свечи для фона (логин / главная). */

const CANDLES = [
  { left: 5, top: -12, h: 38, w: 2.8, body: 0.48 },
  { left: 14, top: 42, h: 18, w: 1.4, body: 0.55 },
  { left: 22, top: 8, h: 48, w: 3.2, body: 0.42 },
  { left: 34, top: 58, h: 22, w: 1.8, body: 0.5 },
  { left: 46, top: -18, h: 32, w: 2.2, body: 0.46 },
  { left: 55, top: 28, h: 14, w: 1.2, body: 0.6 },
  { left: 64, top: 70, h: 42, w: 3.0, body: 0.44 },
  { left: 76, top: 12, h: 20, w: 1.6, body: 0.52 },
  { left: 86, top: 48, h: 55, w: 3.4, body: 0.4 },
  { left: 92, top: -8, h: 16, w: 1.3, body: 0.58 },
];

type Variant = 'onDark' | 'onLight';

export function CandleBackdrop({
  variant = 'onDark',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  const isLight = variant === 'onLight';

  return (
    <div className={`candle-backdrop ${isLight ? 'candle-backdrop--light' : ''} ${className}`} aria-hidden>
      <style>{`
        @keyframes candleDrift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-32px); }
        }
        @keyframes candleDriftAlt {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(28px); }
        }
        @keyframes candleDrip {
          0% { top: -4%; opacity: 0; }
          8% { opacity: var(--drip-peak, 0.85); }
          85% { opacity: calc(var(--drip-peak, 0.85) * 0.6); }
          100% { top: 104%; opacity: 0; }
        }

        .candle-backdrop {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          --candle-opacity: 0.3;
          --wick-bg: rgba(255, 255, 255, 0.4);
          --body-bg: rgba(255, 255, 255, 0.26);
          --body-glow: rgba(255, 255, 255, 0.08);
          --drip-peak: 0.85;
          --trail: rgba(255, 255, 255, 0.15);
        }
        .candle-backdrop--light {
          --candle-opacity: 0.22;
          --wick-bg: rgba(61, 132, 140, 0.28);
          --body-bg: rgba(61, 132, 140, 0.14);
          --body-glow: rgba(61, 132, 140, 0.06);
          --drip-peak: 0.45;
          --trail: rgba(61, 132, 140, 0.12);
        }

        .candle-item {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: var(--candle-opacity);
          will-change: transform;
          animation: candleDrift 8s ease-in-out infinite;
        }
        .candle-item:nth-child(3n) {
          animation-name: candleDriftAlt;
          animation-duration: 10s;
        }
        .candle-item:nth-child(3n+1) { animation-duration: 7s; }
        .candle-item:nth-child(3n+2) { animation-duration: 9.5s; }

        .candle-wick {
          width: 2px;
          background: var(--wick-bg);
          border-radius: 1px;
          flex: 1;
          min-height: 0;
        }
        .candle-body {
          width: 100%;
          background: var(--body-bg);
          border-radius: 3px;
          box-shadow: 0 0 24px var(--body-glow);
          flex-shrink: 0;
        }
        .candle-drip {
          position: absolute;
          left: 50%;
          width: 5px;
          height: 14px;
          margin-left: -2.5px;
          border-radius: 9999px;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.4) 45%,
            transparent 75%
          );
          box-shadow:
            0 0 8px 2px rgba(255, 255, 255, 0.35),
            0 0 16px 4px rgba(255, 255, 255, 0.12);
          animation: candleDrip linear infinite;
          z-index: 2;
        }
        .candle-backdrop--light .candle-drip {
          width: 4px;
          height: 10px;
          margin-left: -2px;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(168, 230, 235, 0.55) 40%,
            transparent 75%
          );
          box-shadow: 0 0 8px 2px rgba(87, 182, 192, 0.25);
        }
        .candle-trail {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          margin-left: -1px;
          background: linear-gradient(
            180deg,
            transparent 0%,
            var(--trail) 40%,
            transparent 100%
          );
          z-index: 1;
        }
      `}</style>

      {CANDLES.map((c, i) => {
        const bodyPct = Math.round(c.body * 100);
        const wickPct = Math.round((100 - bodyPct) / 2);
        return (
          <div
            key={i}
            className="candle-item"
            style={{
              left: `${c.left}%`,
              top: `${c.top}%`,
              height: `${c.h}%`,
              width: `${c.w}%`,
              animationDelay: `${(i * 1.1) % 6}s`,
            }}
          >
            <div className="candle-trail" />
            <span
              className="candle-drip"
              style={{
                animationDuration: `${7 + (i % 4) * 1.2}s`,
                animationDelay: `${(i * 1.7) % 9.5}s`,
              }}
            />
            <div className="candle-wick" style={{ height: `${wickPct}%` }} />
            <div className="candle-body" style={{ height: `${bodyPct}%` }} />
            <div className="candle-wick" style={{ height: `${100 - bodyPct - wickPct}%` }} />
          </div>
        );
      })}
    </div>
  );
}
