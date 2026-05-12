import React from 'react';
import ShiftCell from './ShiftCell';
import { User } from 'lucide-react';

const ScheduleGrid = ({ employees, dates, schedules, onShiftClick, summary }) => {
  // Map schedules for quick lookup
  const scheduleMap = {};
  schedules.forEach(s => {
    const dateKey = s.date.split('T')[0];
    const empId = s.employee._id || s.employee;
    if (!scheduleMap[empId]) scheduleMap[empId] = {};
    scheduleMap[empId][dateKey] = s;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-100">
              <th className="sticky left-0 z-10 bg-white p-4 text-left min-w-[240px] border-r border-slate-100">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Employee</span>
              </th>
              {dates.map((date) => (
                <th key={date.toISOString()} className="p-3 text-center min-w-[80px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {date.getDate()}
                  </p>
                </th>
              ))}
            </tr>
            
            {/* Summary Row */}
            {summary && (
              <tr className="bg-indigo-50/30 border-b border-indigo-100">
                <td className="sticky left-0 z-10 bg-indigo-50 p-4 font-bold text-indigo-900 text-xs border-r border-indigo-100">
                  Daily Counts (A/B/C)
                </td>
                {dates.map((date) => {
                  const dateKey = date.toISOString().split('T')[0];
                  const daySummary = summary.find(s => s._id.date.split('T')[0] === dateKey);
                  
                  const counts = { A: 0, B: 0, C: 0 };
                  daySummary?.shifts.forEach(sh => {
                    if (counts[sh.shift] !== undefined) counts[sh.shift] = sh.count;
                  });

                  const isUnderstaffed = counts.A < 2 || counts.B < 2 || counts.C < 2;

                  return (
                    <td key={dateKey} className="p-2 text-center">
                      <div className={`flex flex-col gap-0.5 font-black text-[10px] ${isUnderstaffed ? 'text-red-600' : 'text-indigo-600'}`}>
                        <span>{counts.A}/{counts.B}/{counts.C}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp._id} className="border-b border-slate-50 hover:bg-white/50 transition-colors group">
                <td className="sticky left-0 z-10 bg-white group-hover:bg-white transition-colors p-4 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 truncate max-w-[140px]">{emp.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.personalNumber}</p>
                    </div>
                  </div>
                </td>
                {dates.map((date) => {
                  const dateKey = date.toISOString().split('T')[0];
                  const s = scheduleMap[emp._id]?.[dateKey];
                  
                  return (
                    <td key={dateKey} className="p-2">
                      <ShiftCell 
                        shift={s?.shift || ''} 
                        isConfirmed={s?.isConfirmed}
                        onClick={() => onShiftClick?.(emp, date, s)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleGrid;
