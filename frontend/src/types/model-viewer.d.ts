import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          'auto-rotate'?: boolean | '';
          'auto-rotate-delay'?: string;
          'rotation-per-second'?: string;
          'camera-controls'?: boolean | '';
          ar?: boolean | '';
          'ar-modes'?: string;
          'shadow-intensity'?: string;
          'shadow-softness'?: string;
          'environment-image'?: string;
          exposure?: string;
          'tone-mapping'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'manual' | 'interaction';
          style?: React.CSSProperties;
          className?: string;
        },
        HTMLElement
      >;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          'auto-rotate'?: boolean | '';
          'auto-rotate-delay'?: string;
          'rotation-per-second'?: string;
          'camera-controls'?: boolean | '';
          ar?: boolean | '';
          'ar-modes'?: string;
          'shadow-intensity'?: string;
          'shadow-softness'?: string;
          'environment-image'?: string;
          exposure?: string;
          'tone-mapping'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'manual' | 'interaction';
          style?: React.CSSProperties;
          className?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};

