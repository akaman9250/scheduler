import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Settings, LogOut, X, Phone, Mail, MapPin, Briefcase, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { searchTerm, setSearchTerm } = useSearch();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications/count');
        setUnreadCount(res.data.count);
      } catch (error) {
        console.error('Failed to fetch unread count');
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 1) {
        setIsSearching(true);
        try {
          const res = await api.get(`/users/search?q=${searchTerm}`);
          setResults(res.data);
          setShowResults(true);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            placeholder="Search employees or schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length > 1 && setShowResults(true)}
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {isSearching ? (
              <div className="p-4 text-center">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                {results.map((res) => (
                  <button
                    key={res._id}
                    onClick={() => {
                      setSelectedUser(res);
                      setShowResults(false);
                      setSearchTerm('');
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 uppercase">
                      {res.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{res.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                        {res.personalNumber} • {res.section || 'Unassigned'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm font-bold text-slate-400">No matching workers found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 ml-4">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Section</span>
          <span className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
            {user?.section || 'Management'}
          </span>
        </div>

        <button 
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 group p-1 pr-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-black text-slate-900 leading-none mb-0.5">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{user?.role?.replace('_', ' ')}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                <User size={16} />
                <span>My Profile</span>
              </button>
              <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                <Settings size={16} />
                <span>Settings</span>
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button 
                onClick={logout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Profile Preview Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedUser(null)}></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700 relative">
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-8 pb-10">
              <div className="relative -mt-16 mb-6">
                <div className="w-32 h-32 rounded-[2rem] bg-white p-2 shadow-2xl mx-auto">
                  <div className="w-full h-full rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl font-black uppercase border border-indigo-100">
                    {selectedUser.name.charAt(0)}
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedUser.name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                    {selectedUser.role.replace('_', ' ')}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">{selectedUser.personalNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Section</p>
                    <p className="text-xs font-black text-slate-900">{selectedUser.section || 'Unassigned'}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Off Day</p>
                    <p className="text-xs font-black text-slate-900">{selectedUser.offDay || 'Not Set'}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                    <p className="text-xs font-black text-slate-900 truncate">{selectedUser.email || 'No email'}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Phone</p>
                    <p className="text-xs font-black text-slate-900">{selectedUser.phone || 'No phone'}</p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <Briefcase size={18} />
                View Full Work History
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
