import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  values,
  onChange,
  placeholder = 'Select options',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle an option's selection
  const toggleOption = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };
  
  // Clear all selections
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };
  
  // Select all options
  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(options.map(option => option.value));
  };
  
  // Get display text for selected values
  const getDisplayText = () => {
    if (values.length === 0) return placeholder;
    if (values.length === 1) {
      const option = options.find(opt => opt.value === values[0]);
      return option ? option.label : placeholder;
    }
    if (values.length === options.length) return 'All items selected';
    return `${values.length} items selected`;
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown trigger */}
      <div 
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white hover:border-gray-400 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate text-sm text-gray-700">
          {getDisplayText()}
        </div>
        <div className="pl-2">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Select all / Clear all actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
            <button 
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              onClick={selectAll}
            >
              Select All
            </button>
            <button 
              className="text-xs text-red-600 hover:text-red-800 font-medium"
              onClick={clearAll}
            >
              Clear All
            </button>
          </div>
          
          {/* Options */}
          <div className="py-1">
            {options.map(option => (
              <div 
                key={option.value}
                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => toggleOption(option.value)}
              >
                <input 
                  type="checkbox" 
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={values.includes(option.value)}
                  onChange={() => {}}
                />
                <label className="ml-2 text-sm text-gray-700 cursor-pointer">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
