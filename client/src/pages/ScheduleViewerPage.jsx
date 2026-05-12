import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import ScheduleGrid from '../components/Schedule/ScheduleGrid';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Download, 
  RotateCcw,
  Calendar as CalendarIcon
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ScheduleViewerPage = () => {
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('CGL-1 Entry');
  const [startDate, setStartDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('weekly'); // 'today', 'weekly', 'monthly'

  // Get range of dates based on view mode
  const getDates = (start, mode) => {
    const dates = [];
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);

    if (mode === 'today') {
      dates.push(new Date(d));
    } else if (mode === 'weekly') {
      // Find previous Monday
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      for (let i = 0; i < 7; i++) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (mode === 'monthly') {
      d.setDate(1); // Start of month
      const month = d.getMonth();
      while (d.getMonth() === month) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    }
    return dates;
  };

  const dates = getDates(startDate, viewMode);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = dates[0].toISOString();
      const dateTo = dates[dates.length - 1].toISOString();

      const [empRes, schedRes, sumRes] = await Promise.all([
        api.get(`/users?section=${selectedSection}`),
        api.get(`/schedules?section=${selectedSection}&dateFrom=${dateFrom}&dateTo=${dateTo}&confirmedOnly=true`),
        api.get(`/schedules/summary?section=${selectedSection}&dateFrom=${dateFrom}&dateTo=${dateTo}&confirmedOnly=true`)
      ]);

      setEmployees(empRes.data);
      setSchedules(schedRes.data);
      setSummary(sumRes.data);
    } catch (error) {
      toast.error('Failed to fetch schedule data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSection, startDate, viewMode]);

  const handlePrevWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const handleReset = () => {
    setStartDate(new Date());
    setViewMode('weekly');
  };

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <CalendarIcon size={32} className="text-indigo-600" />
              Schedule Viewer
            </h1>
            <p className="text-slate-500 font-medium mt-1">View and manage shift rotations for your section.</p>
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

            <div className="h-10 w-px bg-slate-200 mx-1 hidden lg:block"></div>

            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner">
              {[
                { id: 'today', label: 'Today' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`
                    px-4 py-1.5 rounded-xl text-[10px] font-black transition-all
                    ${viewMode === mode.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900'}
                  `}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="h-10 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevWeek}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-white text-slate-600 transition-all active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-black text-sm text-slate-900 min-w-[240px] text-center shadow-sm">
                {dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dates[dates.length-1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <button 
                onClick={handleNextWeek}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-white text-slate-600 transition-all active:scale-95"
              >
                <ChevronRight size={20} />
              </button>
              <button 
                onClick={handleReset}
                title="Current Week"
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-white text-slate-600 transition-all"
              >
                <RotateCcw size={20} />
              </button>
            </div>
            
            <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]">
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-slate-500 font-bold animate-pulse">Synchronizing Data...</p>
          </div>
        ) : employees.length > 0 ? (
          <ScheduleGrid 
            employees={employees}
            dates={dates}
            schedules={schedules}
            summary={summary}
          />
        ) : (
          <div className="text-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm px-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter size={40} className="text-slate-300" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">No Employees Found</h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              There are no employees assigned to the {selectedSection} section yet. Use the Employee Manager to add workers.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScheduleViewerPage;
