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
        className="w-full px-3 sm:px-4 py-3 bg-white border-2 border-purple-200 rounded-xl text-left flex items-center justify-between hover:border-purple-400 active:border-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] touch-manipulation"
      >
        <span className={selected.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
          {displayText}
        </span>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-purple-50 rounded transition-colors"
            >
              <X className="w-4 h-4 text-purple-600" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-purple-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overscroll-contain"
          >
            {options.length > 0 ? (
              <div className="p-2">
                {options.map((option) => {
                  const selected = isSelected(option);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`w-full px-4 py-2.5 rounded-lg text-left transition-colors min-h-[44px] touch-manipulation ${
                        selected
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'hover:bg-purple-50 active:bg-purple-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {selected && (
                          <span className="text-purple-600 font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">No options available</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}