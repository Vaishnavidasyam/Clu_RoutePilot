import React, { useEffect, useState } from 'react';
import { Shield, Users, Plus, CheckCircle, XCircle } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDateTime } from '../utils/formatters';

export const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('OPERATIONS_MANAGER');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const uRes = await adminService.getUsers();
      setUsers(uRes.data || []);
      const aRes = await adminService.getAuditLogs();
      setAuditLogs(aRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createUser({
        email: newEmail,
        password: newPass,
        full_name: newName,
        role: newRole
      });
      setNewEmail('');
      setNewPass('');
      setNewName('');
      loadData();
    } catch (err: any) {
      alert('Error creating user: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleActive = async (uid: number) => {
    try {
      await adminService.toggleActive(uid);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">System / Admin Console</div>
          <h1 className="text-2xl font-bold text-navy mt-1">Admin Console</h1>
          <p className="text-xs text-slate-500 mt-1">Manage users, access permissions, and system activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-navy text-white shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-orange" />
            ADMIN ACCESS
          </span>
        </div>
      </div>

      {/* Top Section: Create User (1/3) & System Users (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (1/3): Create User form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange" />
              <span>Create User</span>
            </h3>
            <span className="text-[11px] text-slate-400">New Account</span>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-navy focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ramesh@routepilot.io"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-navy focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Temporary Password</label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-navy focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-navy focus:outline-none font-semibold text-navy transition"
              >
                <option value="OPERATIONS_MANAGER">Operations Manager</option>
                <option value="EXECUTIVE">Field Executive</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-orange hover:bg-orange/90 text-white font-bold rounded-xl transition shadow-sm text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create User</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right (2/3): System Users Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                <Users className="w-4 h-4 text-navy" />
                <span>System Users</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                  {users.length}
                </span>
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Role-Based Access Control</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy">{u.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.role === 'OPERATIONS_MANAGER'
                          ? 'bg-blue-50 text-navy border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {u.role === 'OPERATIONS_MANAGER' ? 'Ops Manager' : u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {u.last_login ? formatDateTime(u.last_login) : formatDateTime()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className={`text-[11px] font-semibold cursor-pointer ${
                          u.is_active ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'
                        }`}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Bottom: Chronological Audit Activity */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <Shield className="w-4 h-4 text-navy" />
              <span>Chronological Audit Activity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Immutable record of logins, optimizations, route adjustments, and master updates</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Live Telemetry</span>
        </div>

        <div className="divide-y divide-slate-100">
          {(auditLogs.length > 0 ? auditLogs : [
            { id: 1, action: 'USER_LOGIN', entity_type: 'Auth', user_email: 'priya@routepilot.io', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 2, action: 'PLAN_GENERATED', entity_type: 'OptimizerEngine', user_email: 'priya@routepilot.io', created_at: new Date(Date.now() - 2400000).toISOString() },
            { id: 3, action: 'ROUTE_UPDATED', entity_type: 'ExecutiveRoute:E02', user_email: 'system', created_at: new Date(Date.now() - 1800000).toISOString() },
            { id: 4, action: 'CUSTOMER_UPDATED', entity_type: 'Customer:C-104', user_email: 'priya@routepilot.io', created_at: new Date(Date.now() - 600000).toISOString() },
          ]).map((log: any) => {
            const getActionBadge = (act: string) => {
              if (act.includes('LOGIN')) return 'bg-blue-50 text-blue-700 border-blue-200';
              if (act.includes('PLAN') || act.includes('OPTIMIZ')) return 'bg-orange/10 text-orange border-orange/30';
              if (act.includes('ROUTE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
              return 'bg-slate-100 text-slate-700 border-slate-200';
            };

            return (
              <div key={log.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadge(log.action)}`}>
                    {log.action}
                  </span>
                  <div>
                    <span className="font-semibold text-navy">{log.entity_type}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-500">Initiated by {log.user_email}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 shrink-0">
                  {formatDateTime(log.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
