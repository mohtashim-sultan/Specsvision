import React from 'react';
import Dropdown from '../common/Dropdown';

export default function FilterDropdown({ label, options, selected, onChange, multiple = true }) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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