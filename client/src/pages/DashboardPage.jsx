import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
          <TrendingUp size={12} />
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</h3>
    <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [stats, setStats] = useState({
     totalEmployees: 0,
     activeToday: 0,
     pendingLeaves: 0,
     alerts: 0,
     chartData: [],
     manpower: { shift: '-', entry: 0, process: 0, exit: 0 },
     employeesBySection: {}
   });
   const [hoveredSection, setHoveredSection] = useState(null);
  const [notifications, setNotifications] = useState([]);

   useEffect(() => {
     const fetchData = async () => {
       try {
         const [statsRes, notificationsRes] = await Promise.all([
           api.get('/stats/dashboard'),
           api.get('/notifications?unreadOnly=false')
         ]);
         console.log('API response:', statsRes.data);
         setStats({
           ...statsRes.data,
           employeesBySection: statsRes.data.employeesBySection || {}
         });
        
        // Filter for employees: only shift changes
        let filtered = notificationsRes.data;
        if (user?.role === 'employee') {
          filtered = filtered.filter(n => ['schedule_published', 'override_notice'].includes(n.type));
        }
        setNotifications(filtered);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const COLORS = ['#4f46e5', '#10b981', '#a855f7', '#f59e0b'];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 font-medium">Welcome back, {user?.name}. Here's what's happening today.</p>
          </div>
          <button 
            onClick={() => navigate('/schedule')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            <Calendar size={18} />
            View Today's Schedule
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Employees" 
            value={stats.totalEmployees} 
            icon={Users} 
            color="bg-blue-500"
            trend="+2 this month"
          />
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-500 bg-opacity-10 text-green-600">
                <Clock size={24} />
              </div>
              <span className="px-2.5 py-1 bg-green-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">
                Shift {stats.manpower?.shift || '-'}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-3">Current Manpower</h3>
            <div className="space-y-1 relative">
              {['entry', 'process', 'exit'].map((secKey) => {
                const sectionName = `CGL-1 ${secKey.charAt(0).toUpperCase() + secKey.slice(1)}`;
                const names = stats.employeesBySection?.[sectionName] || [];
                const count = stats.manpower?.[secKey] || 0;
                return (
                  <div
                    key={secKey}
                    className="flex justify-between items-center text-xs px-3 py-2 rounded-lg hover:bg-slate-50 cursor-default transition-colors relative"
                    onMouseEnter={() => setHoveredSection(secKey)}
                    onMouseLeave={() => setHoveredSection(null)}
                  >
                    <span className="text-slate-400 font-bold uppercase">{secKey}</span>
                    <span className="font-black text-slate-900">{count}</span>

                    {hoveredSection === secKey && names.length > 0 && (
                      <div className="absolute left-0 top-full mt-2 z-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          {sectionName}
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                          {names.map((name, i) => (
                            <p key={i} className="text-xs font-bold text-slate-700 truncate" title={name}>
                              {name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <StatCard 
            title="Pending Leaves" 
            value={stats.pendingLeaves} 
            icon={Calendar} 
            color="bg-amber-500"
          />
          <StatCard 
            title="System Alerts" 
            value={stats.alerts} 
            icon={AlertTriangle} 
            color="bg-red-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900">Shift Overview</h2>
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <h2 className="text-xl font-black text-slate-900 mb-6">Recent Notifications</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 font-bold text-sm">No new notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n._id} className={`p-4 border rounded-2xl flex gap-4 transition-all ${n.isRead ? 'bg-white border-slate-100 opacity-60' : 'bg-indigo-50/30 border-indigo-100 shadow-sm shadow-indigo-50'}`}>
                    <div className={`p-2 rounded-lg h-fit ${
                      n.type === 'schedule_published' ? 'bg-indigo-100 text-indigo-600' :
                      n.type === 'shortage_alert' ? 'bg-red-100 text-red-600' :
                      n.type === 'leave_request' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {n.type === 'schedule_published' ? <Calendar size={20} /> :
                       n.type === 'shortage_alert' ? <AlertTriangle size={20} /> :
                       <Clock size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-tight">{n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {(user?.role === 'admin' || user?.role === 'shift_manager') && n.recipient?.name && (
                          <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            To: {n.recipient.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => navigate('/notifications')}
              className="w-full mt-6 py-3 text-sm font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              View All Notifications
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
