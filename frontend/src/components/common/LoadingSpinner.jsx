import React from 'react';

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-[3px]',
    lg: 'w-16 h-16 border-[3px]',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full animate-spin`}
        style={{
          borderColor: 'var(--border-color)',
          borderTopColor: 'var(--text-accent)',
        }}
      />
    </div>
  );
}