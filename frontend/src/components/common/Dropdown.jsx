import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dropdown({
  label,
  options = [],
  selected = [],
  onChange,
  multiple = false,
  placeholder = 'Select...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    if (multiple) {
      const isSelected = selected.some((s) => s.value === option.value);
      if (isSelected) {
        onChange(selected.filter((s) => s.value !== option.value));
      } else {
        onChange([...selected, option]);
      }
    } else {
      onChange([option]);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const isSelected = (option) => {
    return selected.some((s) => s.value === option.value);
  };

  const displayText = selected.length > 0
    ? multiple
      ? selected.length === 1
        ? selected[0].label
        : `${selected.length} selected`
      : selected[0].label
    : placeholder;

  return (
    <div className={`relative transition-all ${isOpen ? 'z-[100]' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between transition-all outline-none text-xs sm:text-sm font-medium min-h-[44px] touch-manipulation group"
        style={{
          backgroundColor: isOpen ? 'var(--surface-bg)' : 'var(--surface-bg-secondary)',
          border: `1.5px solid ${isOpen ? 'var(--text-accent)' : selected.length > 0 ? 'rgba(147,51,234,0.4)' : 'var(--border-color)'}`,
          boxShadow: isOpen ? '0 0 12px rgba(147,51,234,0.18)' : 'none',
          color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="truncate pr-2 font-medium">
          {displayText}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-purple-500/10 transition-colors"
              style={{ color: 'var(--text-accent)' }}
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-600' : 'group-hover:text-purple-500'}`}
            style={{ color: isOpen ? 'var(--text-accent)' : 'var(--text-muted)' }}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[100] top-full left-0 right-0 w-full min-w-[180px] mt-1.5 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overscroll-contain custom-scrollbar border bg-white dark:bg-slate-900 border-purple-100 dark:border-purple-500/25"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35), 0 0 15px rgba(147,51,234,0.12)',
            }}
          >
            {options.length > 0 ? (
              <div className="p-1.5 space-y-0.5">
                {options.map((option) => {
                  const optSelected = isSelected(option);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-all flex items-center justify-between min-h-[38px] touch-manipulation"
                      style={{
                        backgroundColor: optSelected ? 'rgba(147,51,234,0.12)' : 'transparent',
                        color: optSelected ? 'var(--text-accent)' : 'var(--text-primary)',
                        fontWeight: optSelected ? 600 : 400,
                      }}
                      onMouseEnter={e => { if (!optSelected) e.currentTarget.style.backgroundColor = 'rgba(147,51,234,0.05)'; }}
                      onMouseLeave={e => { if (!optSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span className="truncate pr-2">{option.label}</span>
                      {optSelected && (
                        <Check className="w-4 h-4 shrink-0 font-bold" style={{ color: 'var(--text-accent)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                No options available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}