import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Building2, 
  Shield, 
  Calendar,
  Loader2,
  X,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const EmployeesPage = () => {
  const { user, isAdmin } = useAuth();
  const { searchTerm } = useSearch();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(user?.section || 'CGL-1 Entry');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users?section=${selectedSection}&role=all`);
      setEmployees(res.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedSection]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeId) return;

    setIsAdding(true);
    try {
      // Find user by personal number first or use search
      const searchRes = await api.get(`/users/search?q=${newEmployeeId}`);
      if (searchRes.data.length === 0) {
        toast.error('Employee not found. Ensure they have created an account.');
        return;
      }
      
      const targetUser = searchRes.data[0];
      await api.post(`/users/section/${encodeURIComponent(selectedSection)}/add`, {
        userId: targetUser._id
      });
      
      toast.success(`${targetUser.name} added to ${selectedSection}`);
      setShowAddModal(false);
      setNewEmployeeId('');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to add employee');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveEmployee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this section?`)) return;

    try {
      await api.delete(`/users/section/${encodeURIComponent(selectedSection)}/${id}`);
      toast.success('Employee removed from section');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to remove employee');
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const updateData = {
        name: editingEmployee.name,
        email: editingEmployee.email,
        phone: editingEmployee.phone,
        preferredShifts: editingEmployee.preferredShifts,
        offDay: editingEmployee.offDay
      };

      if (isAdmin) {
        updateData.personalNumber = editingEmployee.personalNumber;
        updateData.role = editingEmployee.role;
        updateData.section = editingEmployee.section;
        if (editingEmployee.newPassword) {
          updateData.password = editingEmployee.newPassword;
        }
      }

      await api.put(`/users/${editingEmployee._id}`, updateData);
      toast.success('Employee updated');
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to update employee');
    } finally {
      setIsUpdating(false);
    }
  };

  const togglePreference = (shift) => {
    setEditingEmployee(prev => {
      const current = prev.preferredShifts || ['A', 'B', 'C'];
      const SHIFT_OPTIONS = ['A', 'B', 'C', 'L', 'OFF', 'CO'];
      const updated = current.includes(shift)
        ? current.filter(s => s !== shift)
        : [...current, shift];
      return { ...prev, preferredShifts: updated };
    });
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.personalNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users size={32} className="text-indigo-600" />
              Employee Manager
            </h1>
            <p className="text-slate-500 font-medium mt-1">Manage workforce distribution for {selectedSection}.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 p-1 rounded-xl flex shadow-sm">
              {['CGL-1 Entry', 'CGL-1 Process', 'CGL-1 Exit'].map((sec) => (
                 <button
                   key={sec}
                   onClick={() => setSelectedSection(sec)}
                   className={`
                     px-4 py-2 rounded-lg text-xs font-black transition-all
                     ${selectedSection === sec 
                       ? 'bg-indigo-600 text-white shadow-sm' 
                       : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                   `}
                 >
                   {sec.split(' ')[1]}
                 </button>
              ))}
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
            >
               <UserPlus size={18} />
              Add Employee
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/30 border-b border-slate-100">
                  <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Worker</th>
                  <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Off Day</th>
                  <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Contact</th>
                  <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />
                      <p className="text-slate-400 font-bold mt-4">Loading Staff List...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <p className="text-slate-400 font-medium italic">No employees found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-white/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{emp.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.personalNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          emp.role === 'shift_manager' 
                            ? 'bg-purple-50 text-purple-600 border-purple-100' 
                            : 'bg-white text-slate-500 border-slate-100'
                        }`}>
                          {emp.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-bold">{emp.offDay || 'Not Set'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-xs font-bold text-slate-600">{emp.email || 'No Email'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{emp.phone || 'No Phone'}</p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingEmployee({ ...emp })}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleRemoveEmployee(emp._id, emp.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Employee</h3>
                    <p className="text-slate-500 text-sm font-medium">Assign an existing user to this section.</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddEmployee} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Personal Number / ID</label>
                    <input 
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. EMP001"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newEmployeeId}
                      onChange={(e) => setNewEmployeeId(e.target.value)}
                    />
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-700">
                    <Shield size={20} className="shrink-0" />
                    <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">
                      Only users who have already registered their SPIDER account can be added to a section.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isAdding}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
                  >
                    {isAdding ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                    Assign to {selectedSection.split('- ')[1]}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Preferences Modal */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingEmployee(null)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {isAdmin ? 'Edit Profile' : 'Edit Preferences'}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium">Customize details for {editingEmployee.name}</p>
                  </div>
                  <button onClick={() => setEditingEmployee(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleUpdatePreferences} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                        <input 
                          type="text"
                          value={editingEmployee.name}
                          onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Personal No.</label>
                        <input 
                          type="text"
                          value={editingEmployee.personalNumber}
                          onChange={(e) => setEditingEmployee({...editingEmployee, personalNumber: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                        <input 
                          type="password"
                          placeholder="Leave blank to keep"
                          onChange={(e) => setEditingEmployee({...editingEmployee, newPassword: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Role</label>
                        <select
                          value={editingEmployee.role}
                          onChange={(e) => setEditingEmployee({...editingEmployee, role: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                        >
                          <option value="employee">Employee</option>
                          <option value="shift_manager">Shift Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                      <input 
                        type="email"
                        value={editingEmployee.email || ''}
                        onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                      <input 
                        type="text"
                        value={editingEmployee.phone || ''}
                        onChange={(e) => setEditingEmployee({...editingEmployee, phone: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Preferred Shifts</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['A', 'B', 'C'].map(shift => (
                        <button
                          key={shift}
                          type="button"
                          onClick={() => togglePreference(shift)}
                          className={`
                            h-10 rounded-xl font-black text-xs transition-all border-2
                            ${(editingEmployee.preferredShifts || ['A', 'B', 'C']).includes(shift)
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}
                          `}
                        >
                          {shift}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Off Day</label>
                    <select
                      value={editingEmployee.offDay}
                      onChange={(e) => setEditingEmployee({...editingEmployee, offDay: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                    >
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
                  >
                    {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isAdmin ? 'Update Full Profile' : 'Save Preferences'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmployeesPage;
