import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { 
  Building, 
  Play, 
  CheckCircle2, 
  RotateCcw, 
  Calendar as CalendarIcon,
  Loader2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Info,
  Save,
  Search,
  Users,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import ShiftEditCell from '../components/Schedule/ShiftEditCell';

const ScheduleManagerPage = () => {
  const { searchTerm } = useSearch();
  const [selectedSection, setSelectedSection] = useState('CGL-1 Entry');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectionMode, setSelectionMode] = useState('single'); // 'single' or 'multi'
  const [selectedCells, setSelectedCells] = useState([]); // Array of schedule IDs
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [genTarget, setGenTarget] = useState('all');
  const [clearTarget, setClearTarget] = useState('all');
  const [isClearing, setIsClearing] = useState(false);

  // Generate date array for the grid header
  const getDates = () => {
    if (!dateFrom || !dateTo) return [];
    const dates = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const dates = getDates();

  useEffect(() => {
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      // Adjust for local timezone to avoid off-by-one errors
      const formatDate = (d) => d.toISOString().split('T')[0];
      
      setDateFrom(formatDate(firstDay));
      setDateTo(formatDate(lastDay));
    }
  }, [selectedMonth]);

  const fetchDraftData = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const [empRes, schedRes] = await Promise.all([
        api.get(`/users?section=${selectedSection}`),
        api.get(`/schedules?section=${selectedSection}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      ]);
      setEmployees(empRes.data);
      setSchedules(schedRes.data);
    } catch (error) {
      toast.error('Failed to fetch draft data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraftData();
  }, [selectedSection, dateFrom, dateTo]);

  const handleGenerate = async (targetId = null) => {
    if (!dateFrom || !dateTo) return toast.error('Please select dates');
    setIsGenerating(true);
    setShowGenModal(false);
    try {
      await api.post('/schedules/generate', {
        section: selectedSection,
        dateFrom,
        dateTo,
        targetEmployeeId: targetId
      });
      toast.success(targetId ? 'Employee schedule updated!' : 'Full schedule re-generated!');
      fetchDraftData();
    } catch (error) {
      toast.error('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualUpdate = async (scheduleId, newShift, employeeId, date) => {
    try {
      await api.post('/schedules/update-manual', { 
        employeeId, 
        date, 
        shift: newShift, 
        section: selectedSection 
      });
      toast.success('Shift updated');
      fetchDraftData();
    } catch (error) {
      toast.error('Failed to update shift');
    }
  };

  const handleSaveDraft = async () => {
    if (!dateFrom || !dateTo) return;
    setIsSaving(true);
    try {
      await api.post('/schedules/save-draft', {
        section: selectedSection,
        dateFrom,
        dateTo
      });
      toast.success('Draft saved and all shifts locked!');
      fetchDraftData();
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkUpdate = async (newShift) => {
    if (selectedCells.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(selectedCells.map(id => {
        // If id contains an underscore, it's a new cell (empId_date)
        // If not, it might be an existing ID, but we can't be sure
        // We modified the cellId to ALWAYS be empId_date or we can handle both.
        // Let's use the context we have.
        const [empId, date] = id.includes('_') ? id.split('_') : [null, null];
        
        return api.post('/schedules/update-manual', { 
          employeeId: empId,
          date: date,
          shift: newShift,
          section: selectedSection
        });
      }));
      toast.success(`Updated ${selectedCells.length} shifts!`);
      setSelectedCells([]);
      fetchDraftData();
    } catch (error) {
      toast.error('Bulk update failed');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleCellSelection = (id) => {
    setSelectedCells(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePublish = async () => {
    try {
      await api.post('/schedules/confirm', {
        section: selectedSection,
        dateFrom,
        dateTo
      });
      toast.success('Schedule published successfully!');
    } catch (error) {
      toast.error('Publishing failed');
    }
  };

  const handleClear = async (targetId = null) => {
    if (!dateFrom || !dateTo) return;
    setIsClearing(true);
    setShowClearModal(false);
    try {
      await api.delete('/schedules/clear', {
        data: {
          section: selectedSection,
          dateFrom,
          dateTo,
          targetEmployeeId: targetId
        }
      });
      toast.success(targetId ? 'Employee schedule cleared!' : 'Section schedule cleared!');
      fetchDraftData();
    } catch (error) {
      toast.error('Clear failed');
    } finally {
      setIsClearing(false);
    }
  };

  const scheduleMap = {};
  let lastEditedAt = null;
  let isPublished = false;

  schedules.forEach(s => {
    const dKey = s.date.split('T')[0];
    const eKey = s.employee._id || s.employee;
    if (!scheduleMap[eKey]) scheduleMap[eKey] = {};
    scheduleMap[eKey][dKey] = s;

    // Track latest edit and overall published status
    const updateTime = new Date(s.updatedAt);
    if (!lastEditedAt || updateTime > lastEditedAt) {
      lastEditedAt = updateTime;
    }
    if (s.isConfirmed) isPublished = true;
  });

  const getStatusText = () => {
    if (schedules.length === 0) return 'No schedule data for this period.';
    const timeStr = lastEditedAt ? lastEditedAt.toLocaleString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : 'N/A';

    if (isPublished) {
      return <span className="text-green-600 font-black">Published • Last Updated: {timeStr}</span>;
    }
    return <span className="text-amber-600 font-black">Draft Mode • Last Edited: {timeStr}</span>;
  };

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Building size={32} className="text-indigo-600" />
              Schedule Manager
            </h1>
            <p className="text-xs mt-1 uppercase tracking-wider">
              {getStatusText()}
            </p>
          </div>



          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex gap-1 shadow-sm overflow-x-auto">
              {[
                { id: 'CGL-1 Entry', label: 'Entry' },
                { id: 'CGL-1 Process', label: 'Process' },
                { id: 'CGL-1 Exit', label: 'Exit' }
              ].map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSection(sec.id)}
                  className={`
                    px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap
                    ${selectedSection === sec.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'text-slate-500 hover:bg-white hover:text-indigo-600'}
                  `}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => {
                  const d = new Date(selectedMonth + '-01');
                  d.setMonth(d.getMonth() - 1);
                  setSelectedMonth(d.toISOString().slice(0, 7));
                }}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer uppercase text-center w-32"
              />

              <button 
                onClick={() => {
                  const d = new Date(selectedMonth + '-01');
                  d.setMonth(d.getMonth() + 1);
                  setSelectedMonth(d.toISOString().slice(0, 7));
                }}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={() => schedules.length > 0 ? setShowGenModal(true) : handleGenerate()}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {schedules.length > 0 ? 'Re-Generate' : 'Auto Generate'}
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={isSaving || schedules.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white font-black rounded-xl shadow-lg hover:bg-slate-900 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              Save Draft
            </button>

            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-black rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-[0.98]"
            >
              <Save size={18} />
              Publish
            </button>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectionMode === 'multi' && selectedCells.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center font-black">
                {selectedCells.length}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected</p>
                <p className="text-sm font-black uppercase">Shifts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {['A', 'B', 'C', 'L', 'OFF', 'CO'].map(opt => (
                <button
                  key={opt}
                  disabled={isBulkUpdating}
                  onClick={() => handleBulkUpdate(opt)}
                  className={`
                    w-10 h-10 rounded-xl text-xs font-black transition-all hover:scale-110 active:scale-95
                    ${opt === 'A' ? 'bg-blue-500 text-white' :
                      opt === 'B' ? 'bg-green-500 text-white' :
                      opt === 'C' ? 'bg-purple-500 text-white' :
                      opt === 'L' ? 'bg-red-400 text-white' :
                      opt === 'OFF' ? 'bg-slate-300 text-slate-700' :
                      'bg-orange-400 text-white'}
                  `}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setSelectedCells([])}
              className="ml-4 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        )}

        {dateFrom && dateTo ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="selectionMode" 
                    value="single" 
                    checked={selectionMode === 'single'} 
                    onChange={() => {
                      setSelectionMode('single');
                      setSelectedCells([]);
                    }}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">Single Select</span>
                </label>
                <div className="w-px h-4 bg-slate-200"></div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="selectionMode" 
                    value="multi" 
                    checked={selectionMode === 'multi'} 
                    onChange={() => setSelectionMode('multi')}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">Multi Select</span>
                </label>
              </div>
              
              {selectionMode === 'multi' && (
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">
                  {selectedCells.length} cells selected
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="sticky left-0 z-10 bg-white p-4 text-left min-w-[200px] border-r border-slate-100 font-black text-xs text-slate-400 uppercase tracking-widest">Employee</th>
                    {dates.map(date => (
                      <th key={date.toISOString()} className="p-3 text-center min-w-[80px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        <p className="text-sm font-black text-slate-900">{date.getDate()}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.personalNumber.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(emp => (
                      <tr key={emp._id} className="border-b border-slate-50 hover:bg-white/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white p-4 border-r border-slate-100">
                        <p className="text-sm font-black text-slate-900">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.personalNumber}</p>
                      </td>
                      {dates.map(date => {
                        const dKey = date.toISOString().split('T')[0];
                        const s = scheduleMap[emp._id]?.[dKey];
                        const cellId = `${emp._id}_${dKey}`;
                        const isPast = new Date(dKey) < new Date().setHours(0,0,0,0);
                        const isSelected = selectionMode === 'multi' && selectedCells.includes(cellId);
                        return (
                          <td key={dKey} className="p-2 relative">
                            <ShiftEditCell 
                              schedule={s} 
                              onUpdate={(id, shift) => handleManualUpdate(id, shift, emp._id, dKey)} 
                              readOnly={isPast}
                              onClick={selectionMode === 'multi' ? () => !isPast && toggleCellSelection(cellId) : null}
                              forceSelected={isSelected}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {/* Shift Wise Counts */}
                  {['A', 'B', 'C', 'OFF', 'L'].map((type) => (
                    <tr key={type} className="bg-white border-b border-slate-100/50">
                      <td className="sticky left-0 z-10 bg-slate-100 p-1.5 border-r border-slate-100 text-right pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          type === 'A' ? 'bg-blue-100 text-blue-600' :
                          type === 'B' ? 'bg-green-100 text-green-600' :
                          type === 'C' ? 'bg-purple-100 text-purple-600' :
                          type === 'OFF' ? 'bg-slate-200 text-slate-600' :
                          'bg-red-100 text-red-600'
                        }`}>{type === 'L' ? 'LEAVE' : type === 'OFF' ? 'OFF/CO' : type}</span>
                      </td>
                      {dates.map(date => {
                        const dKey = date.toISOString().split('T')[0];
                        const count = employees.reduce((acc, emp) => {
                          const s = scheduleMap[emp._id]?.[dKey];
                          if (!s?.isConfirmed) return acc;
                          if (type === 'OFF') {
                            return (s?.shift === 'OFF' || s?.shift === 'CO') ? acc + 1 : acc;
                          }
                          return s?.shift === type ? acc + 1 : acc;
                        }, 0);
                        return (
                          <td key={dKey} className="p-1 text-center">
                            <span className={`text-[11px] font-black ${(['A', 'B', 'C'].includes(type) && count < 2) ? 'text-red-500' : 'text-slate-500'}`}>
                              {count}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* Total Count */}
                  <tr className="bg-slate-900 text-white">
                    <td className="sticky left-0 z-10 bg-slate-900 p-4 border-r border-slate-700 font-black text-xs uppercase tracking-widest flex items-center justify-between">
                      <span>Total Workforce: {employees.length}</span>
                      <button 
                        onClick={() => setShowClearModal(true)}
                        className="ml-4 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                      >
                        <Trash2 size={12} />
                        Clear
                      </button>
                    </td>
                    <td colSpan={dates.length} className="p-4 text-right pr-8">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        * Manpower tracking active for {selectedSection}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <CalendarIcon size={64} className="text-slate-200 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Select Date Range</h2>
            <p className="text-slate-500 font-medium max-w-sm mx-auto">Please select a start and end date to manage the schedule for {selectedSection}.</p>
          </div>
        )}

        {/* Re-Generation Modal */}
        {showGenModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setShowGenModal(false)}
            />
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
                  <RotateCcw className="text-indigo-600" size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Re-Generate Schedule</h3>
                <p className="text-slate-500 font-medium mb-8">Choose how you want to recalculate the shifts for this period.</p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => handleGenerate(null)}
                    className="w-full p-6 bg-white border-2 border-slate-100 hover:border-indigo-600 rounded-3xl text-left transition-all group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-indigo-600">All Employees</p>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">Full Section Recalculation</p>
                      </div>
                      <Users className="text-slate-300 group-hover:text-indigo-600" size={24} />
                    </div>
                  </button>

                  <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl transition-all shadow-sm">
                    <p className="font-black text-slate-900 mb-4">Specific Employee</p>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                      <Search size={18} className="text-slate-400" />
                      <select 
                        value={genTarget}
                        onChange={(e) => setGenTarget(e.target.value)}
                        className="bg-transparent text-sm font-black text-slate-900 focus:outline-none w-full appearance-none cursor-pointer"
                      >
                        <option value="all" className="bg-white text-slate-900">Select Employee...</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id} className="bg-white text-slate-900 py-2">
                            {emp.name} ({emp.personalNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                    {genTarget !== 'all' && (
                      <button 
                        onClick={() => handleGenerate(genTarget)}
                        className="w-full mt-4 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        Apply for {employees.find(e => e._id === genTarget)?.name}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowGenModal(false)}
                className="w-full py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Nevermind, Go Back
              </button>
            </div>
          </div>
        )}

        {/* Clear Modal */}
        {showClearModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-red-950/40 backdrop-blur-sm" 
              onClick={() => setShowClearModal(false)}
            />
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                  <Trash2 className="text-red-600" size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Clear Schedule?</h3>
                <p className="text-slate-500 font-medium mb-8">This will permanently remove the shifts for the selected period. This action cannot be undone.</p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => handleClear(null)}
                    disabled={isClearing}
                    className="w-full p-6 bg-white border-2 border-slate-100 hover:border-red-600 rounded-3xl text-left transition-all group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-red-900 group-hover:text-red-700">Clear All Employees</p>
                        <p className="text-xs text-red-500 font-bold uppercase mt-1">Full Section Reset</p>
                      </div>
                      <RotateCcw className="text-red-300 group-hover:text-red-600" size={24} />
                    </div>
                  </button>

                  <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl transition-all shadow-sm">
                    <p className="font-black text-slate-900 mb-4">Clear Specific Employee</p>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm focus-within:border-red-600 transition-all">
                      <Search size={18} className="text-slate-400" />
                      <select 
                        value={clearTarget}
                        onChange={(e) => setClearTarget(e.target.value)}
                        className="bg-transparent text-sm font-black text-slate-900 focus:outline-none w-full appearance-none cursor-pointer"
                      >
                        <option value="all">Select Employee...</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    {clearTarget !== 'all' && (
                      <button 
                        onClick={() => handleClear(clearTarget)}
                        disabled={isClearing}
                        className="w-full mt-4 py-3 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition-all active:scale-95"
                      >
                        Clear for {employees.find(e => e._id === clearTarget)?.name}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowClearModal(false)}
                className="w-full py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagerPage;
