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
        className={`w-full bg-racing-dark border border-gray-700 rounded-lg p-2.5 text-white text-left text-sm flex justify-between items-center transition-all focus:outline-none focus:border-racing-yellow ${
          disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:border-gray-500'
        }`}
      >
        <span className={`truncate ${value ? 'text-white font-medium' : 'text-gray-500'}`}>
          {value || placeholder}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-racing-yellow' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-racing-card border border-gray-700 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-gray-700 bg-racing-dark">
            <input
              autoFocus
              type="text"
              placeholder="Filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-gray-600 rounded p-1.5 text-xs text-white focus:outline-none focus:border-racing-yellow"
            />
          </div>
          <div className="max-h-56 overflow-y-auto no-scrollbar py-1">
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
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-racing-red/20 ${
                    value === option ? 'text-racing-yellow font-bold bg-racing-yellow/10' : 'text-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-gray-500 italic text-center">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;