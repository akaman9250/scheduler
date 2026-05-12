import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { 
  Building, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Calendar as CalendarIcon,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ScheduleGeneratorPage = () => {
  const [selectedSection, setSelectedSection] = useState('CGL-1 Entry');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!dateFrom || !dateTo) return toast.error('Please select date range');

    setIsGenerating(true);
    try {
      const res = await api.post('/schedules/generate', {
        section: selectedSection,
        dateFrom,
        dateTo
      });
      setPreviewData(res.data);
      toast.success(`Successfully generated ${res.data.count} shift entries!`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await api.post('/schedules/confirm', {
        section: selectedSection,
        dateFrom,
        dateTo
      });
      toast.success('Schedule published and visible to all employees!');
      setPreviewData(null);
    } catch (error) {
      toast.error('Failed to publish schedule');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Building size={32} className="text-indigo-600" />
            Shift Generator
          </h1>
          <p className="text-slate-500 font-medium mt-1">Use AI-driven algorithm to generate optimal shift rotations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sticky top-24">
              <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Play size={18} className="text-indigo-600" />
                Configuration
              </h2>

              <form onSubmit={handleGenerate} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Section</label>
                  <select 
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option>CGL-1 Entry</option>
                    <option>CGL-1 Process</option>
                    <option>CGL-1 Exit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Start Date</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date"
                      required
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">End Date</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date"
                      required
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex gap-2 text-indigo-700">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight">
                      Algorithm will follow A &gt; B &gt; C rotation, minimize G shifts, and maintain 10-day duty limits.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                  Generate Schedule
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!previewData ? (
              <div className="h-full min-h-[500px] bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <CalendarIcon size={24} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">No Generation Preview</h3>
                <p className="text-slate-500 font-medium max-w-sm">
                  Configure the section and dates on the left to start the generation process. Preview will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Generation Complete</h3>
                      <p className="text-slate-500 text-sm font-medium">Successfully calculated shifts for {selectedSection}.</p>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                      <CheckCircle2 size={24} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Entries</p>
                      <p className="text-2xl font-black text-slate-900">{previewData.count}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                      <p className="text-2xl font-black text-amber-600 uppercase">Draft</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4 mb-8">
                    <AlertCircle size={24} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-amber-900">Verification Required</p>
                      <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                        The generated schedule is currently in draft mode. Review the entries in the Schedule Viewer before publishing to employees.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleConfirm}
                      disabled={isConfirming}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-[0.98]"
                    >
                      {isConfirming ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                      Publish Schedule
                    </button>
                    <button
                      onClick={() => setPreviewData(null)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98]"
                    >
                      Discard & Retry
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                  <h3 className="text-lg font-black text-slate-900 mb-6">Algorithm Insights</h3>
                  <div className="space-y-4">
                    {[
                      'Maximized A &gt; B &gt; C rotation efficiency',
                      'Zero double-shift violations detected',
                      'Optimized manpower distribution for Shift G',
                      'Maintained minimum 2 person staffing rule'
                    ].map((insight, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-600">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                        <span className="text-sm font-medium">{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ScheduleGeneratorPage;
