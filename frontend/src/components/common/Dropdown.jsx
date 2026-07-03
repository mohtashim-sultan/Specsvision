import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
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
      ? `${selected.length} selected`
      : selected[0].label
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 sm:px-4 py-3 rounded-xl text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 min-h-[44px] touch-manipulation"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '2px solid var(--border-color)',
          color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--text-accent)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
      >
        <span className={selected.length > 0 ? 'font-medium' : ''}>
          {displayText}
        </span>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-accent)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-accent)' }}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 rounded-xl shadow-xl max-h-60 overflow-y-auto overscroll-contain"
            style={{
              backgroundColor: 'var(--surface-bg)',
              border: '2px solid var(--border-color)',
            }}
          >
            {options.length > 0 ? (
              <div className="p-2">
                {options.map((option) => {
                  const optSelected = isSelected(option);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className="w-full px-4 py-2.5 rounded-lg text-left transition-all min-h-[44px] touch-manipulation"
                      style={{
                        backgroundColor: optSelected ? 'rgba(147,51,234,0.1)' : 'transparent',
                        color: optSelected ? 'var(--text-accent)' : 'var(--text-primary)',
                        fontWeight: optSelected ? 600 : 400,
                      }}
                      onMouseEnter={e => { if (!optSelected) e.currentTarget.style.backgroundColor = 'var(--surface-bg-secondary)'; }}
                      onMouseLeave={e => { if (!optSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {optSelected && (
                          <span style={{ color: 'var(--text-accent)' }} className="font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>No options available</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}