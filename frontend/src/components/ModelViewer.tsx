import React, { useState } from 'react';

interface ModelViewerProps {
  /** Full URL to the .glb or .gltf file */
  src: string;
  alt: string;
  /** Optional poster/thumbnail shown while the model loads */
  poster?: string;
  className?: string;
  minHeight?: number | string;
  showArButton?: boolean;
  showHint?: boolean;
  autoRotate?: boolean;
  cameraControls?: boolean;
  loading?: 'auto' | 'lazy' | 'eager';
}

export default function ModelViewer({
  src,
  alt,
  poster,
  className = '',
  minHeight = 320,
  showArButton = true,
  showHint = true,
  autoRotate = true,
  cameraControls = true,
  loading = 'eager',
}: ModelViewerProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 ${className}`}
        style={{ minHeight }}
      >
        <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--text-muted)' }}>
          broken_image
        </span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          3D model unavailable
        </p>
      </div>
    );
  }

  const minHeightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ minHeight: minHeightStyle, height: typeof minHeight === 'string' && minHeight === '100%' ? '100%' : undefined }}
    >
      {/* @ts-ignore - custom web component loaded via CDN script */}
      <model-viewer
        src={src}
        alt={alt}
        poster={poster}
        auto-rotate={autoRotate ? "" : undefined}
        auto-rotate-delay="400"
        rotation-per-second="26deg"
        camera-controls={cameraControls ? "" : undefined}
        ar={showArButton ? "" : undefined}
        ar-modes="webxr scene-viewer quick-look"
        shadow-intensity="1"
        shadow-softness="0.8"
        exposure="1.1"
        tone-mapping="commerce"
        loading={loading}
        reveal="auto"
        onError={() => setErrored(true)}
        style={{
          width: '100%',
          height: '100%',
          minHeight: minHeightStyle,
          background: 'transparent',
          '--poster-color': 'transparent',
        } as React.CSSProperties}
      >
        {/* Loading slot — shows while model streams in */}
        <div slot="poster" className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-accent)' }}
          />
          <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Loading 3D model…
          </p>
        </div>

        {/* AR button slot — only visible on AR-capable devices when enabled */}
        {showArButton && (
          <button
            slot="ar-button"
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #9333ea, #ec4899)',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(147,51,234,0.35)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_in_ar</span>
            View in your space
          </button>
        )}
      </model-viewer>

      {/* Subtle orbit hint */}
      {showHint && (
        <div
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold opacity-60"
          style={{ backgroundColor: 'rgba(147,51,234,0.08)', color: 'var(--text-accent)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>drag_pan</span>
          Drag to rotate
        </div>
      )}
    </div>
  );
}
