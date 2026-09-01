import React from 'react';

/**
 * Premium loading spinner with glasses icon and orbital ring animation.
 *
 * @param {{ size?: 'sm' | 'md' | 'lg', message?: string, className?: string }} props
 */
export default function LoadingSpinner({ size = 'md', message, className = '' }) {
  const config = {
    sm: { ring: 32, icon: 14, stroke: 2, textClass: 'text-[10px]' },
    md: { ring: 52, icon: 22, stroke: 2.5, textClass: 'text-xs' },
    lg: { ring: 72, icon: 30, stroke: 3, textClass: 'text-sm' },
  };
  const c = config[size] || config.md;
  const r = (c.ring - c.stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Spinner container */}
      <div className="relative" style={{ width: c.ring, height: c.ring }}>
        {/* Track ring */}
        <svg
          className="absolute inset-0"
          width={c.ring}
          height={c.ring}
          viewBox={`0 0 ${c.ring} ${c.ring}`}
        >
          <circle
            cx={c.ring / 2}
            cy={c.ring / 2}
            r={r}
            fill="none"
            stroke="var(--border-color, rgba(148,163,184,0.15))"
            strokeWidth={c.stroke}
          />
        </svg>

        {/* Animated gradient arc */}
        <svg
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '1.2s' }}
          width={c.ring}
          height={c.ring}
          viewBox={`0 0 ${c.ring} ${c.ring}`}
        >
          <defs>
            <linearGradient id={`spinGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle
            cx={c.ring / 2}
            cy={c.ring / 2}
            r={r}
            fill="none"
            stroke={`url(#spinGrad-${size})`}
            strokeWidth={c.stroke}
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.3} ${circ * 0.7}`}
          />
        </svg>

        {/* Centre glasses icon — pulses gently */}
        <div
          className="absolute inset-0 flex items-center justify-center animate-pulse"
          style={{ animationDuration: '2s' }}
        >
          <svg
            width={c.icon}
            height={c.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#iconGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            {/* Glasses shape */}
            <circle cx="6.5" cy="12" r="3.5" />
            <circle cx="17.5" cy="12" r="3.5" />
            <path d="M10 12h4" />
            <path d="M3 12L1.5 10" />
            <path d="M21 12l1.5-2" />
          </svg>
        </div>
      </div>

      {/* Optional message */}
      {message && (
        <p
          className={`${c.textClass} font-medium animate-pulse`}
          style={{ color: 'var(--text-muted, #94a3b8)', animationDuration: '2s' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}