'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  FileText, 
  Activity, 
  Clock, 
  UserCheck, 
  UserX, 
  ArrowLeft,
  Search,
  Lock,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  Database
} from 'lucide-react';
import { 
  UserProfile, 
  AuditLog, 
  subscribeAllUsers, 
  subscribeAuditLogs, 
  setUserRole, 
  recordAuditLog 
} from '@/lib/firestore-utils';

interface AdminDashboardProps {
  currentUser: User;
  onBackToWorkspace: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onBackToWorkspace,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'security'>('users');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuperAdminEmail = currentUser.email?.toLowerCase() === '07.nilu@gmail.com';

  useEffect(() => {
    // Record audit log entry when admin panel is accessed
    recordAuditLog(
      currentUser.uid,
      currentUser.email || 'Admin',
      'VIEW_ADMIN_DASHBOARD',
      undefined,
      'Admin accessed management dashboard'
    ).catch(console.warn);

    // Subscribe to users
    const unsubUsers = subscribeAllUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (err) => {
        console.warn('Failed to load users for admin dashboard:', err);
        setErrorMessage(err.message || 'Permission denied accessing users collection.');
        setLoading(false);
      }
    );

    // Subscribe to audit logs
    const unsubLogs = subscribeAuditLogs(
      (logs) => setAuditLogs(logs),
      (err) => console.warn('Audit log subscription notice:', err)
    );

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, [currentUser]);

  const handleToggleRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (
      !confirm(
        `Are you sure you want to change the role of ${
          targetUser.displayName || targetUser.email || targetUser.userId
        } to "${newRole.toUpperCase()}"? This action will be immutably recorded in audit logs.`
      )
    ) {
      return;
    }

    setIsUpdatingRole(targetUser.userId);
    try {
      await setUserRole(
        currentUser.uid,
        currentUser.email || 'Admin',
        targetUser.userId,
        newRole
      );
    } catch (err: any) {
      console.error('Role update failed:', err);
      alert(`Role change failed: ${err.message}`);
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchUser.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.userId.toLowerCase().includes(q)
    );
  });

  return (
    <div id="admin-dashboard-root" className="min-h-[calc(100vh-60px)] bg-stone-100/70 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-xs">
              <Shield className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-stone-900">
                  Admin Console &amp; RBAC Control
                </h1>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  {isSuperAdminEmail ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Authorized identity: <span className="font-mono">{currentUser.email || currentUser.uid}</span>
              </p>
            </div>
          </div>

          <button
            id="back-to-journal-btn"
            onClick={onBackToWorkspace}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Journal</span>
          </button>
        </div>

        {/* System Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Registered Users</span>
              <Users className="h-4 w-4 text-stone-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-stone-900">{users.length}</p>
            <p className="mt-1 text-[11px] text-stone-400">
              {users.filter((u) => u.role === 'admin').length} Elevated Admins
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Immutable Audit Logs</span>
              <Activity className="h-4 w-4 text-stone-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-stone-900">{auditLogs.length}</p>
            <p className="mt-1 text-[11px] text-stone-400">Write-only ledger strictly enforced</p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Security Guardrails</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">Protected</p>
            <p className="mt-1 text-[11px] text-stone-400">OWASP A01 + Firestore RBAC</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'users'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'security'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Security Architecture</span>
          </button>
        </div>

        {/* TAB 1: User Management */}
        {activeTab === 'users' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">User Identity &amp; Roles</h3>
                <p className="text-xs text-stone-500">
                  Assign administrative capabilities or review isolated tenant accounts.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 py-1.5 pl-8 pr-3 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="p-3 font-semibold">User</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold">UID</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-stone-400">
                        {loading ? 'Loading user directory...' : 'No users found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isUserAdmin = u.role === 'admin';
                      const isSelf = u.userId === currentUser.uid;

                      return (
                        <tr key={u.userId} className="hover:bg-stone-50/70 transition">
                          <td className="p-3 font-medium text-stone-900">
                            {u.displayName || 'Anonymous User'}
                          </td>
                          <td className="p-3 text-stone-600 font-mono text-[11px]">
                            {u.email || 'None'}
                          </td>
                          <td className="p-3 text-stone-400 font-mono text-[10px]">
                            {u.userId.slice(0, 12)}...
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isUserAdmin
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {isUserAdmin ? <ShieldCheck className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                              {isUserAdmin ? 'Admin' : 'Standard User'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isUpdatingRole === u.userId}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition border ${
                                isUserAdmin
                                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                              }`}
                            >
                              {isUpdatingRole === u.userId ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : isUserAdmin ? (
                                'Demote to User'
                              ) : (
                                'Promote to Admin'
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Immutable Audit Logs */}
        {activeTab === 'audit' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Immutable Security Audit Trail</h3>
                <p className="text-xs text-stone-500">
                  Logged in <span className="font-mono">/audit_logs</span>. Writes allowed for admins; update and delete operations are strictly rejected.
                </p>
              </div>
              <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-mono text-stone-600">
                Write-Only Append Ledger
              </span>
            </div>

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400">
                  No administrative events recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{log.action}</span>
                        <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-mono text-stone-600">
                          {log.adminEmail || log.adminId.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-stone-600">{log.details || 'Administrative operation recorded.'}</p>
                      {log.targetUserId && (
                        <p className="text-[10px] text-stone-400 font-mono">
                          Target UID: {log.targetUserId}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Security Guardrails & Policy Matrix */}
        {activeTab === 'security' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Active Security Directives &amp; Compliance</h3>
              <p className="text-xs text-stone-500">
                Enforced by Firestore Security Rules, Next.js Server-Side Handlers, and Threat Countermeasures.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>OWASP A01: Broken Access Control Defense</span>
                </div>
                <p className="text-xs text-emerald-950 leading-relaxed">
                  User reflections in <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded">/users/{'{userId}'}/interactions</code> are strictly isolated to <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded">request.auth.uid == userId</code>. Cross-tenant reads and writes are blocked at the Firestore kernel.
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-800 font-semibold text-xs">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span>Immutable Audit Logging</span>
                </div>
                <p className="text-xs text-blue-950 leading-relaxed">
                  The <code className="font-mono bg-blue-100/70 px-1 py-0.5 rounded">/audit_logs</code> collection only permits document creation by authenticated administrators. Updates and deletions are completely blocked by rules.
                </p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-800 font-semibold text-xs">
                  <KeyRound className="h-4 w-4 text-purple-600" />
                  <span>Zero-Hardcoding &amp; Secret Isolation</span>
                </div>
                <p className="text-xs text-purple-950 leading-relaxed">
                  All sensitive credentials (<code className="font-mono bg-purple-100/70 px-1 py-0.5 rounded">GEMINI_API_KEY</code>, <code className="font-mono bg-purple-100/70 px-1 py-0.5 rounded">SLACK_WEBHOOK_URL</code>) reside purely in server runtime memory and are never bundled into client JS.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span>SSRF Defense on Notifications</span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed">
                  Outgoing notifications are validated to forbid private networks (localhost, 127.0.0.1, 10.*, 192.168.*, 169.254.*) with forced HTTPS and a 4-second timeout.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
