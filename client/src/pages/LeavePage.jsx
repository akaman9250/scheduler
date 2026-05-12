import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { 
  FileText, 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Loader2,
  Trash2,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const LeavePage = () => {
  const { user, isAdmin, isManager } = useAuth();
  const { searchTerm } = useSearch();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveType, setLeaveType] = useState('leave');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data);
    } catch (error) {
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!leaveDate) return toast.error('Please select a date');

    setIsSubmitting(true);
    try {
      await api.post('/leaves', {
        date: leaveDate,
        reason: leaveReason,
        type: leaveType
      });
      toast.success('Leave request submitted!');
      setLeaveDate('');
      setLeaveReason('');
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id, status) => {
    try {
      await api.put(`/leaves/${id}/approve`, { status });
      toast.success(`Request ${status} successfully`);
      fetchLeaves();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-black uppercase tracking-widest border border-green-100"><CheckCircle2 size={12} /> Approved</span>;
      case 'rejected': return <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest border border-red-100"><XCircle size={12} /> Rejected</span>;
      default: return <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileText size={32} className="text-indigo-600" />
            Leave Manager
          </h1>
          <p className="text-slate-500 font-medium mt-1">Request time off or manage employee leave applications.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sticky top-24">
              <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                Request Leave
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Leave Date</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date"
                      required
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Leave Type</label>
                  <select 
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="leave">Standard Leave (L)</option>
                    <option value="comp_off">Compensatory Off (CO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Reason (Optional)</label>
                  <textarea 
                    rows="3"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Briefly explain the reason..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                  Submit Request
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {isAdmin || isManager ? 'Leave Requests' : 'My Leave Requests'}
                </h2>
                <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase">
                  {leaves.length} Total
                </div>
              </div>


              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
              ) : leaves.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-medium italic">
                  No leave requests found.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {leaves
                    .filter(leave => 
                      leave.employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      leave.employee?.personalNumber.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((leave) => (
                      <div key={leave._id} className="p-6 hover:bg-white/50 transition-colors group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white flex flex-col items-center justify-center text-slate-500 shrink-0 border border-slate-100">
                            <span className="text-[10px] font-black uppercase tracking-tighter">
                              {new Date(leave.date).toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                            <span className="text-lg font-black leading-none">
                              {new Date(leave.date).getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                              {leave.employee?.name}
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">
                                {leave.employee?.personalNumber}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {leave.type === 'comp_off' ? 'Compensatory Off' : 'Regular Leave'} 
                              {leave.reason && ` • ${leave.reason}`}
                            </p>
                            <div className="mt-3">
                              {getStatusBadge(leave.status)}
                            </div>
                          </div>
                        </div>

                        {(isAdmin || isManager) && leave.status === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApprove(leave._id, 'approved')}
                              className="px-4 py-2 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-100 active:scale-95"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApprove(leave._id, 'rejected')}
                              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-white transition-all active:scale-95"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {(user?._id === leave.employee?._id && leave.status === 'pending') && (
                          <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LeavePage;
