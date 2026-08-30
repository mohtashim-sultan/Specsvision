import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

type LoadingSpinnerProps = {
  size?: SpinnerSize;
  className?: string;
  /** Rendered under the rings and announced to screen readers. */
  label?: string;
};

const SIZES: Record<SpinnerSize, { box: string; ring: string; inset: string; text: string }> = {
  sm: { box: 'w-6 h-6', ring: 'border-2', inset: 'inset-[5px]', text: 'text-xs' },
  md: { box: 'w-12 h-12', ring: 'border-[3px]', inset: 'inset-[9px]', text: 'text-sm' },
  lg: { box: 'w-16 h-16', ring: 'border-[3px]', inset: 'inset-[12px]', text: 'text-sm' },
};

/**
 * Two counter-rotating arcs over a breathing halo.
 *
 * The arcs are drawn as rings whose border is transparent on three sides, so each shows
 * as a single sweeping segment; running them in opposite directions at different speeds
 * keeps the motion from reading as one thick ring. Colours come from the theme variables
 * rather than fixed hexes, so the spinner follows light and dark mode like the rest of
 * the app. Every animation is dropped under prefers-reduced-motion, which leaves a static
 * but still legible pair of arcs.
 */
export default function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  const s = SIZES[size];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className={`relative ${s.box}`}>
        {/* Halo. Purely decorative, and the blur keeps it from competing with the arcs. */}
        <div
          className="absolute inset-0 rounded-full blur-md animate-spinner-glow motion-reduce:animate-none"
          style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)' }}
        />
        {/* Track, so the arcs read as travelling along a ring rather than floating. */}
        <div
          className={`absolute inset-0 rounded-full ${s.ring}`}
          style={{ borderColor: 'var(--border-color)' }}
        />
        {/* Outer arc, clockwise. */}
        <div
          className={`absolute inset-0 rounded-full ${s.ring} animate-spin-slow motion-reduce:animate-none`}
          style={{
            borderColor: 'transparent',
            borderTopColor: 'var(--text-accent)',
            borderRightColor: 'var(--text-accent)',
          }}
        />
        {/* Inner arc, anticlockwise and quicker. */}
        <div
          className={`absolute ${s.inset} rounded-full ${s.ring} animate-spin-reverse motion-reduce:animate-none`}
          style={{ borderColor: 'transparent', borderBottomColor: '#ec4899' }}
        />
      </div>
      {label && (
        <p className={`${s.text} font-medium animate-pulse motion-reduce:animate-none`} style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      )}
    </div>
  );
}
