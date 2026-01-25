import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ModernDropdown({ label, icon: Icon, options, current, onChange, map }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = (val) => (map && map[val]) ? map[val] : val;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <p className="text-xs uppercase font-bold mb-3 ml-1" style={{color: 'rgba(107, 114, 128, 1)', letterSpacing: '0.2em'}}>{label}</p>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-6 py-4 rounded-2xl group transition-all popup-surface popup-surface-hover">
        <div className="flex items-center gap-3"><Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" /><span className="text-xs font-bold uppercase tracking-widest italic" style={{color: 'var(--text-secondary)'}}>{String(getLabel(current) || "Ikkje valt")}</span></div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-50 rounded-2xl overflow-hidden shadow-2xl popup-surface">
          <div className="max-h-48 overflow-y-auto">
            {(options || []).map((option) => (
              <button key={option} onClick={() => { onChange(option); setIsOpen(false); }} className={`w-full text-left px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${current === option ? 'text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`} style={{backgroundColor: current === option ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}}>{String(getLabel(option))}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
