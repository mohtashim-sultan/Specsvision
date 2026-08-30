import React from 'react';
import Dropdown, { type DropdownOption } from '../common/Dropdown';

type FilterDropdownProps = {
  label: string;
  options: DropdownOption[];
  selected: DropdownOption[];
  onChange: (selected: DropdownOption[]) => void;
  multiple?: boolean;
};

export default function FilterDropdown({ label, options, selected, onChange, multiple = true }: FilterDropdownProps) {
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