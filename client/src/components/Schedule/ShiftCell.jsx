import React from 'react';

const SHIFT_COLORS = {
  'A': 'bg-blue-500 text-white',
  'B': 'bg-green-500 text-white',
  'C': 'bg-purple-500 text-white',
  'G': 'bg-amber-500 text-white',
  'L': 'bg-red-400 text-white',
  'OFF': 'bg-slate-300 text-slate-700',
  'CO': 'bg-orange-400 text-white',
};

const SHIFT_NAMES = {
  'A': '6AM - 2PM',
  'B': '2PM - 10PM',
  'C': '10PM - 6AM',
  'G': '8:30AM - 5:30PM',
  'L': 'Leave',
  'OFF': 'Off Day',
  'CO': 'Comp Off',
};

const ShiftCell = ({ shift, onClick, isConfirmed }) => {
  const colorClass = SHIFT_COLORS[shift] || 'bg-slate-100 text-slate-400';
  
  return (
    <div 
      onClick={onClick}
      className={`
        h-10 w-full flex items-center justify-center rounded-lg font-black text-xs cursor-pointer
        transition-all hover:scale-[1.05] active:scale-95 shadow-sm
        ${colorClass}
        ${!isConfirmed ? 'ring-2 ring-slate-200 ring-inset opacity-80' : ''}
      `}
      title={SHIFT_NAMES[shift] || 'No Shift'}
    >
      {shift}
    </div>
  );
};

export default ShiftCell;
