import React, { useState, useRef, useEffect } from 'react';
import { Clock, X } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  type?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  onBlur,
  suggestions,
  placeholder,
  className = '',
  type = 'text',
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lọc suggestions theo input hiện tại
  useEffect(() => {
    if (!value.trim()) {
      setFilteredSuggestions(suggestions);
    } else {
      const lower = value.toLowerCase();
      setFilteredSuggestions(
        suggestions.filter(s => s.toLowerCase().includes(lower) && s !== value)
      );
    }
  }, [value, suggestions]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay để cho phép click vào suggestion
    setTimeout(() => {
      onBlur?.();
    }, 150);
  };

  const hasSuggestions = filteredSuggestions.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
        />
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#C1272D] transition-colors p-0.5"
            title="Xem lịch sử nhập"
          >
            <Clock size={13} />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showSuggestions && hasSuggestions && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Đã nhập gần đây
            </span>
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-[#C1272D]/5 hover:text-[#C1272D] transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0"
            >
              <Clock size={10} className="text-gray-300 shrink-0" />
              <span className="truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
