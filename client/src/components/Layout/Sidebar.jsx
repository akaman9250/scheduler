import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  CalendarDays, 
  Users, 
  FileText, 
  Building, 
  Archive, 
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout, isAdmin, isManager } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'shift_manager', 'employee', 'guest'] },
    { name: 'Schedule Viewer', icon: CalendarDays, path: '/schedule', roles: ['admin', 'shift_manager', 'employee', 'guest'] },
    { name: 'Employee Manager', icon: Users, path: '/employees', roles: ['admin', 'shift_manager'] },
    { name: 'Leave Manager', icon: FileText, path: '/leave', roles: ['admin', 'shift_manager', 'employee'] },
    { name: 'Schedule Manager', icon: Building, path: '/manager', roles: ['admin', 'shift_manager'] },
    { name: 'Activity Log', icon: History, path: '/activity', roles: ['admin', 'shift_manager'] },
    { name: 'Archive', icon: Archive, path: '/archive', roles: ['admin', 'shift_manager'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside 
      className={`${isOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0`}
    >
      <div className="p-6 flex items-center justify-between">
         {isOpen && (
           <span className="text-xl font-extrabold tracking-tighter text-indigo-600">
             SCHEDULER<span className="text-slate-900">.</span>
           </span>
         )}
        <button 
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
              ${isActive 
                ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}
            `}
          >
            <item.icon size={20} className="shrink-0" />
            {isOpen && <span className="text-sm font-bold">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-bold group"
        >
          <LogOut size={20} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
          {isOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
