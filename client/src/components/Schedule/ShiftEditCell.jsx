import React, { useState, useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';

const SHIFT_OPTIONS = ['A', 'B', 'C', 'L', 'OFF', 'CO'];

const ShiftEditCell = ({ schedule, onUpdate, readOnly = false, onClick, forceSelected = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const getShiftColor = (s) => {
    switch(s) {
      case 'A': return 'bg-blue-500 text-white';
      case 'B': return 'bg-green-500 text-white';
      case 'C': return 'bg-purple-500 text-white';
      case 'G': return 'bg-amber-500 text-white';
      case 'L': return 'bg-red-400 text-white';
      case 'OFF': return 'bg-slate-300 text-slate-700';
      case 'CO': return 'bg-orange-400 text-white';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  const handleShiftChange = (newShift) => {
    if (readOnly) return;
    onUpdate(schedule?._id, newShift);
    setIsEditing(false);
  };

  const handleClick = () => {
    if (readOnly) return;
    if (onClick) {
      onClick();
    } else {
      setIsEditing(true);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {isEditing && !readOnly && (
        <div className="absolute z-50 bg-white border border-slate-200 shadow-2xl rounded-xl p-1 flex flex-wrap gap-1 w-32 -translate-x-1/2 left-1/2 -top-24 sm:top-12">
          {SHIFT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleShiftChange(opt)}
              className={`w-7 h-7 rounded-lg text-[10px] font-black hover:scale-110 transition-transform ${getShiftColor(opt)}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <div 
        onClick={handleClick}
        className={`
          relative h-10 w-full flex items-center justify-center rounded-lg font-black text-xs
          ${!readOnly ? 'cursor-pointer transition-all hover:scale-[1.05] active:scale-95' : 'cursor-not-allowed opacity-80'}
          shadow-sm
          ${getShiftColor(schedule?.shift)}
          ${forceSelected ? 'ring-2 ring-indigo-600 ring-offset-2 scale-[1.1] z-10 shadow-xl' : ''}
          ${(schedule?.isConfirmed && !forceSelected) ? 'ring-1 ring-slate-300' : ''}
        `}
      >
        {schedule?.shift || ''}
        {schedule?.isConfirmed && (
          <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-200 text-slate-400">
            <Lock size={8} />
          </span>
        )}
      </div>
    </div>
  );
};

export default ShiftEditCell;
