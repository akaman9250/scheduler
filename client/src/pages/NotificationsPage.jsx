import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { Bell, Calendar, AlertTriangle, Clock, CheckCircle, Mail, Filter } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?unreadOnly=false');
      let data = res.data;
      
      // Role-based filtering for employees
      if (user?.role === 'employee') {
        data = data.filter(n => ['schedule_published', 'override_notice'].includes(n.type));
      }
      
      setNotifications(data);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const filteredData = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    if (filter === 'shifts') return n.type === 'schedule_published' || n.type === 'override_notice';
    if (filter === 'alerts') return n.type === 'shortage_alert' || n.type === 'max_leave_alert';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'schedule_published': return <Calendar size={20} className="text-indigo-600" />;
      case 'shortage_alert': return <AlertTriangle size={20} className="text-red-600" />;
      case 'leave_request': return <Mail size={20} className="text-blue-600" />;
      case 'max_leave_alert': return <AlertTriangle size={20} className="text-amber-600" />;
      default: return <Bell size={20} className="text-slate-600" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Bell className="text-indigo-600" size={40} />
              Notifications
            </h1>
            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-xs">Stay updated with system activities</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={markAllRead}
              className="px-4 py-2 text-sm font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Mark all as read
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
          {['all', 'unread', 'shifts', 'alerts'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 animate-pulse h-24"></div>
            ))
          ) : filteredData.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center shadow-xl shadow-slate-50">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell size={32} className="text-slate-200" />
              </div>
              <h2 className="text-xl font-black text-slate-900">All caught up!</h2>
              <p className="text-slate-400 font-medium mt-2">No notifications found for this filter.</p>
            </div>
          ) : (
            filteredData.map((n) => (
              <div 
                key={n._id} 
                onClick={() => !n.isRead && markAsRead(n._id)}
                className={`group relative bg-white p-6 rounded-3xl border transition-all cursor-pointer ${
                  n.isRead 
                  ? 'border-slate-100 opacity-70 grayscale-[0.5]' 
                  : 'border-indigo-100 shadow-xl shadow-indigo-50/50 ring-1 ring-indigo-50'
                }`}
              >
                {!n.isRead && (
                  <div className="absolute top-6 right-6 w-2 h-2 bg-indigo-600 rounded-full"></div>
                )}
                <div className="flex gap-6">
                  <div className={`p-4 rounded-2xl h-fit transition-transform group-hover:scale-110 ${
                    n.isRead ? 'bg-slate-50' : 'bg-indigo-50 shadow-inner'
                  }`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <p className={`text-sm font-black leading-snug ${n.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                        {n.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} />
                        {new Date(n.createdAt).toLocaleString('en-IN', { 
                          day: '2-digit', month: 'short', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                      {(user?.role === 'admin' || user?.role === 'shift_manager') && n.recipient?.name && (
                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">
                          To: {n.recipient.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NotificationsPage;
