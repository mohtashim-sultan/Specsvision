import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

type SearchBarProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchBar({ onSearch, placeholder = 'Search products...', className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative group">
        <Search
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none transition-colors"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 rounded-xl outline-none transition-all text-sm sm:text-base min-h-[44px]"
          style={{
            backgroundColor: 'var(--surface-bg)',
            border: '2px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--text-accent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        />
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClear}
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Clear search"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}