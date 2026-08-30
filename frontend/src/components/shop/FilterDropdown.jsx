import React from 'react';
import Dropdown from '../common/Dropdown';

export default function FilterDropdown({ label, options, selected, onChange, multiple = true }) {
  return (
    <div className="w-full min-w-0">
      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <Dropdown
        options={options}
        selected={selected}
        onChange={onChange}
        multiple={multiple}
        placeholder={`Select ${label.toLowerCase()}`}
      />
    </div>
  );
}