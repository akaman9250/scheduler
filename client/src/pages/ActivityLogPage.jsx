import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { History, Search, Filter, Calendar as CalendarIcon, User, ArrowRight, ShieldCheck, Trash2, Zap } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState('');
  const { user } = useAuth();

  const sections = ['CGL-1 Entry', 'CGL-1 Process', 'CGL-1 Exit'];

  useEffect(() => {
    fetchLogs();
  }, [sectionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/schedules/logs?section=${sectionFilter}`);
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'manual_update': return <User className="text-blue-500" size={16} />;
      case 'auto_generate': return <Zap className="text-amber-500" size={16} />;
      case 'clear': return <Trash2 className="text-red-500" size={16} />;
      default: return <History size={16} />;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'manual_update': return 'Manual Assignment';
      case 'auto_generate': return 'Auto Generation';
      case 'clear': return 'Schedule Clear';
      default: return action;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <History className="text-indigo-600" size={40} />
              Activity Log
            </h1>
            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-xs">Full audit trail of shift modifications</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <Filter size={18} className="text-slate-400 ml-2" />
            <select 
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="bg-transparent text-sm font-black text-slate-900 focus:outline-none pr-8 py-2 cursor-pointer"
            >
              <option value="">All Sections</option>
              {sections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Admin</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Target</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Shift Change</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="p-8 bg-slate-50/30"></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History size={32} className="text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold">No activity recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{log.admin?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{log.section}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-sm font-bold text-slate-700">{getActionLabel(log.action)}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="font-black text-slate-900">{log.employeeName}</p>
                        <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                          <CalendarIcon size={10} />
                          {new Date(log.shiftDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                            {log.oldShift}
                          </span>
                          <ArrowRight size={14} className="text-slate-300" />
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-md ${
                            log.newShift === 'A' ? 'bg-blue-500' :
                            log.newShift === 'B' ? 'bg-green-500' :
                            log.newShift === 'C' ? 'bg-purple-500' :
                            'bg-slate-400'
                          }`}>
                            {log.newShift}
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <p className="text-sm font-black text-slate-900">
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ActivityLogPage;
