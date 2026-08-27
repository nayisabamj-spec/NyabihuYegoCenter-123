import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Building2,
  Settings,
  History,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { UserProfile, District, UserStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const AdminManagementPage: React.FC = () => {
  const { userProfile, isDirector } = useAuth();
  const {
    allUserProfiles,
    districts,
    auditLogs,
    settings,
    updateUserStatus,
    deleteUser,
    addDistrict,
    updateDistrict,
    deleteDistrict,
    updateSettings,
  } = useApp();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'pending' | 'admins' | 'districts' | 'audit' | 'settings'>('pending');

  // District modals & delete
  const [isAddingDistrict, setIsAddingDistrict] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [deletingDistrict, setDeletingDistrict] = useState<District | null>(null);
  const [districtName, setDistrictName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [districtLocation, setDistrictLocation] = useState('');
  const [savingDistrict, setSavingDistrict] = useState(false);

  // User action modal / dialog
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [assignDistrictId, setAssignDistrictId] = useState('nyabihu');
  const [assignRole, setAssignRole] = useState<'admin' | 'director'>('admin');
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Settings form
  const [centerName, setCenterName] = useState(settings.centerName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [address, setAddress] = useState(settings.address);
  const [settingsSaved, setSettingsSaved] = useState(false);

  if (!isDirector) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#23285E]">Access Restricted</h2>
        <p className="text-xs text-slate-600 mt-1">
          This administration section is restricted to the Main Director (Super Admin).
        </p>
      </div>
    );
  }

  // Pending user requests
  const pendingUsers = allUserProfiles.filter(u => u.status === 'pending');
  const activeAdmins = allUserProfiles.filter(u => u.status !== 'pending');

  const handleOpenApprove = (u: UserProfile) => {
    setTargetUser(u);
    setAssignDistrictId(u.districtId || 'nyabihu');
    setAssignRole(u.role || 'admin');
    setIsApprovalModalOpen(true);
  };

  const handleConfirmApproval = async (status: UserStatus) => {
    if (!targetUser) return;
    setActionLoading(true);
    try {
      await updateUserStatus(targetUser.id, status, assignDistrictId, assignRole);
      const uName = targetUser.fullName;
      if (status === 'approved') {
        toast.success('Admin Approved', `${uName} has been approved as an authorized staff member.`);
      } else {
        toast.info('Admin Account Updated', `${uName} status set to ${status}.`);
      }
    } catch (err: any) {
      toast.error('Operation Failed', err?.message || 'Could not update user status');
    } finally {
      setActionLoading(false);
      setIsApprovalModalOpen(false);
      setTargetUser(null);
    }
  };

  const handleQuickStatusChange = async (userId: string, newStatus: UserStatus, userName: string) => {
    try {
      await updateUserStatus(userId, newStatus);
      if (newStatus === 'approved') {
        toast.success('Account Activated', `${userName}'s account is now active.`);
      } else if (newStatus === 'suspended') {
        toast.warning('Account Suspended', `${userName}'s account has been temporarily suspended.`);
      } else if (newStatus === 'rejected') {
        toast.info('Account Rejected', `${userName}'s registration request was rejected.`);
      }
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Could not update status');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setActionLoading(true);
    try {
      const uName = deletingUser.fullName;
      await deleteUser(deletingUser.id);
      toast.success('Admin Account Removed', `${uName} was deleted from the system.`);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Could not delete user account');
    } finally {
      setActionLoading(false);
      setDeletingUser(null);
    }
  };

  const handleSaveDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtName.trim()) return;
    setSavingDistrict(true);

    try {
      if (editingDistrict) {
        await updateDistrict(editingDistrict.id, {
          name: districtName.trim(),
          code: districtCode.trim(),
          location: districtLocation.trim(),
        });
        toast.success('District Updated', `${districtName.trim()} modified successfully.`);
      } else {
        await addDistrict(districtName.trim(), districtCode.trim(), districtLocation.trim());
        toast.success('District Created', `${districtName.trim()} branch added successfully.`);
      }
      setIsAddingDistrict(false);
      setEditingDistrict(null);
    } catch (err: any) {
      toast.error('District Save Error', err?.message || 'Could not save district');
    } finally {
      setSavingDistrict(false);
    }
  };

  const handleConfirmDeleteDistrict = async () => {
    if (!deletingDistrict) return;
    setSavingDistrict(true);
    try {
      const dName = deletingDistrict.name;
      await deleteDistrict(deletingDistrict.id);
      toast.success('District Removed', `${dName} has been deleted.`);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Could not delete district');
    } finally {
      setSavingDistrict(false);
      setDeletingDistrict(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        centerName,
        tagline,
        contactEmail,
        contactPhone,
        address,
      });
      setSettingsSaved(true);
      toast.success('Center Settings Saved', 'Platform branding and contact information updated.');
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      toast.error('Settings Error', err?.message || 'Could not save center settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">Super Admin Control</span>
          <h1 className="text-2xl font-extrabold text-[#23285E]">Center Administration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authorized district administrators, location branches, and system audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="yellow">
            <ShieldCheck className="w-3.5 h-3.5" />
            Main Director Privileges
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-[#23285E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Pending Approvals</span>
          {pendingUsers.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'admins'
              ? 'bg-[#23285E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>District Administrators</span>
          <span className="text-slate-400 font-normal">({activeAdmins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('districts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'districts'
              ? 'bg-[#23285E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Districts ({districts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-[#23285E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-[#23285E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Center Settings</span>
        </button>
      </div>

      {/* Tab 1: Pending Approvals */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#23285E]">Pending Administrator Registrations</h3>
              <p className="text-xs text-slate-500">
                New accounts must be verified and approved by the Director before accessing attendance records
              </p>
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#23285E]">No pending registration requests</p>
              <p className="text-xs text-slate-500 mt-0.5">All staff accounts are up to date and verified.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingUsers.map((user) => (
                <div key={user.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {user.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#23285E]">{user.fullName}</h4>
                      <p className="text-xs text-slate-500">{user.email} • {user.phone || 'No phone'}</p>
                      <p className="text-xs text-[#3591C8] font-semibold mt-0.5">
                        Requested District: {user.districtName || 'Nyabihu District'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleOpenApprove(user)}
                      icon={<UserCheck className="w-4 h-4" />}
                    >
                      Review & Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleQuickStatusChange(user.id, 'rejected', user.fullName)}
                      icon={<UserX className="w-4 h-4" />}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: District Administrators */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#23285E]">Authorized Administrators</h3>
              <p className="text-xs text-slate-500">
                Staff authorized to record visits and generate district-specific attendance reports
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-4">Assigned District</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeAdmins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#23285E]">{adm.fullName}</p>
                      <p className="text-[11px] text-slate-500">{adm.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <Badge role={adm.role} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {adm.districtName}
                    </td>
                    <td className="py-3 px-3">
                      <Badge status={adm.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString('en-GB') : '2026-01-01'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {adm.role !== 'director' && (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenApprove(adm)}
                            className="p-1.5 text-slate-500 hover:text-[#3591C8] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Role & District"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {adm.status === 'approved' ? (
                            <button
                              onClick={() => handleQuickStatusChange(adm.id, 'suspended', adm.fullName)}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                              title="Suspend Admin"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickStatusChange(adm.id, 'approved', adm.fullName)}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                              title="Activate Admin"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingUser(adm)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Admin Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Participating Districts */}
      {activeTab === 'districts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#23285E]">District Locations</h3>
              <p className="text-xs text-slate-500">
                Operating district branches and center facilities
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingDistrict(null);
                setDistrictName('');
                setDistrictCode('');
                setDistrictLocation('');
                setIsAddingDistrict(true);
              }}
              icon={<Plus className="w-4 h-4 text-[#E6E65A]" />}
            >
              Add District
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {districts.map((dist) => (
              <div key={dist.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#23285E]">{dist.name}</h4>
                    {dist.code && <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">{dist.code}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{dist.location || 'Location not specified'}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingDistrict(dist);
                      setDistrictName(dist.name);
                      setDistrictCode(dist.code || '');
                      setDistrictLocation(dist.location || '');
                      setIsAddingDistrict(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-[#3591C8] hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="Edit District"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {dist.id !== 'nyabihu' && (
                    <button
                      onClick={() => setDeletingDistrict(dist)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Delete District"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#23285E]">System Audit Log Trail</h3>
            <p className="text-xs text-slate-500">
              Immutable chronological record of administrative actions, data edits, and approvals
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No audit logs recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-[#23285E]">{log.action}</span>
                    <span className="text-slate-500 ml-2">by {log.userName}</span>
                    {log.details && <p className="text-[11px] text-slate-600 mt-0.5">{log.details}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-GB')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#23285E]">Center Settings & Branding</h3>
            <p className="text-xs text-slate-500">
              Institution identification details reflected across headers, exports, and reports
            </p>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
              Settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Center Brand Name</label>
              <input
                type="text"
                required
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="pt-3">
              <Button type="submit" variant="primary" size="md">
                Save Center Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Approve / Edit Administrator Modal */}
      {isApprovalModalOpen && targetUser && (
        <Modal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          title="Review Administrator Account"
          subtitle={`Applicant: ${targetUser.fullName} (${targetUser.email})`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Assign District Location *</label>
              <select
                value={assignDistrictId}
                onChange={(e) => setAssignDistrictId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">System Role *</label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                <option value="admin">District Administrator</option>
                <option value="director">Main Director (Super Admin)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApprovalModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleConfirmApproval('approved')}
                loading={actionLoading}
                icon={<UserCheck className="w-4 h-4" />}
              >
                Approve & Grant Access
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* District Add/Edit Modal */}
      {isAddingDistrict && (
        <Modal
          isOpen={isAddingDistrict}
          onClose={() => { setIsAddingDistrict(false); setEditingDistrict(null); }}
          title={editingDistrict ? 'Edit District' : 'Add District Center'}
          subtitle="Define participating district operating locations"
        >
          <form onSubmit={handleSaveDistrict} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">District Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Nyabihu District"
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">District Code</label>
              <input
                type="text"
                placeholder="e.g. NYA-01"
                value={districtCode}
                onChange={(e) => setDistrictCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Location Details</label>
              <input
                type="text"
                placeholder="e.g. Western Province, Rwanda"
                value={districtLocation}
                onChange={(e) => setDistrictLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsAddingDistrict(false); setEditingDistrict(null); }}
                disabled={savingDistrict}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={savingDistrict}>
                {editingDistrict ? 'Save Changes' : 'Create District'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Administrator Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingUser}
        title="Delete Administrator Account"
        message={`Are you sure you want to permanently remove ${deletingUser?.fullName} (${deletingUser?.email})? This user will no longer be able to log in or manage records.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteUser}
        onClose={() => setDeletingUser(null)}
        variant="danger"
        loading={actionLoading}
      />

      {/* Delete District Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingDistrict}
        title="Delete District Location"
        message={`Are you sure you want to remove the district "${deletingDistrict?.name}"?`}
        confirmText="Delete District"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteDistrict}
        onClose={() => setDeletingDistrict(null)}
        variant="danger"
        loading={savingDistrict}
      />
    </div>
  );
};
