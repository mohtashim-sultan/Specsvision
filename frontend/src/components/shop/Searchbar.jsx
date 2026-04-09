import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SearchBar({ onSearch, placeholder = 'Search products...', className = '' }) {
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
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 bg-white border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-gray-900 placeholder-gray-400 text-sm sm:text-base min-h-[44px]"
        />
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClear}
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}