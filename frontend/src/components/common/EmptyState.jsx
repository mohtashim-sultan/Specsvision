import React from 'react';

export default function EmptyState({ 
  icon: Icon, 
  title = 'No items found', 
  message = 'Try adjusting your search or filters',
  action = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div
        className="rounded-2xl p-5 mb-5 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(236,72,153,0.1))',
          border: '1px solid var(--border-color)',
        }}
      >
        <Icon className="w-10 h-10" style={{ color: 'var(--text-accent)' }} />
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-center max-w-md mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {action && action}
    </div>
  );
}