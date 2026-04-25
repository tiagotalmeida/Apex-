import React, { useState, useRef, useEffect } from 'react';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onSelect,
  placeholder,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl px-4 py-3.5 text-left text-[15px] flex justify-between items-center transition-all
          ${isOpen
            ? 'bg-white/[0.08] border border-racing-red/40 ring-2 ring-racing-red/20'
            : 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.06]'}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate font-semibold ${value ? 'text-white' : 'text-slate-500'}`}>
          {value || placeholder}
        </span>
        <svg
          className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180 text-racing-red' : 'text-slate-400'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 surface-overlay rounded-2xl border border-white/10 shadow-2xl shadow-black/80 overflow-hidden animate-fade-in">
          <div className="p-2.5 border-b border-white/5">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white font-medium placeholder-slate-500 focus:outline-none focus:bg-white/[0.08] transition-colors"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto no-scrollbar py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-4 py-3 text-[15px] font-semibold transition-colors flex items-center justify-between
                    ${value === option
                      ? 'text-white bg-gradient-to-r from-racing-red/25 to-transparent'
                      : 'text-slate-200 hover:bg-white/5'}`}
                >
                  <span>{option}</span>
                  {value === option && (
                    <svg className="w-5 h-5 text-racing-red" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-slate-500 text-center font-medium">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
