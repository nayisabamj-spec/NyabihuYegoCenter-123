import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  Edit2,
  LogOut,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PWAInstallPrompt } from '../components/common/PWAInstallPrompt';

export const ProfilePage: React.FC = () => {
  const { userProfile, updateMyProfile, changeMyPassword, signOutUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [position, setPosition] = useState(userProfile?.position || '');
  const [saving, setSaving] = useState(false);

  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateMyProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      position: position.trim(),
    });
    setSaving(false);
    setIsEditing(false);
    toast.success('Profile Updated', 'Your administrator information has been saved.');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changeMyPassword(newPassword);
      toast.success('Password Updated', 'Your password has been changed successfully. You can now use it on your next login.');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please try again.');
      toast.error('Password Update Failed', err.message || 'Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">Account & Security</span>
          <h1 className="text-2xl font-extrabold text-[#23285E]">My Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your verified administrator credentials and district assignment
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={signOutUser}
          icon={<LogOut className="w-4 h-4 text-rose-600" />}
        >
          Sign Out
        </Button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top banner */}
        <div className="bg-[#23285E] p-6 text-white flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#3591C8] border-2 border-white/40 flex items-center justify-center font-bold text-2xl text-white shadow-md shrink-0">
            {userProfile?.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{userProfile?.fullName}</h2>
            <p className="text-xs text-[#DFF8F5] mt-0.5">{userProfile?.position || 'Youth Services Administrator'}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge role={userProfile?.role} size="sm" />
              <Badge status={userProfile?.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Profile Details List / Form */}
        <div className="p-6 sm:p-8">
          {!isEditing ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <User className="w-4 h-4 text-[#3591C8]" />
                    <span>Full Name</span>
                  </div>
                  <p className="text-sm font-bold text-[#23285E]">{userProfile?.fullName}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <Mail className="w-4 h-4 text-[#3591C8]" />
                    <span>Email Address</span>
                  </div>
                  <p className="text-sm font-bold text-[#23285E] truncate">{userProfile?.email}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <Phone className="w-4 h-4 text-[#3591C8]" />
                    <span>Phone Number</span>
                  </div>
                  <p className="text-sm font-bold text-[#23285E]">{userProfile?.phone || 'Not configured'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <Building2 className="w-4 h-4 text-[#3591C8]" />
                    <span>Assigned District Center</span>
                  </div>
                  <p className="text-sm font-bold text-[#23285E]">{userProfile?.districtName}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <Calendar className="w-4 h-4 text-[#3591C8]" />
                    <span>Date Joined</span>
                  </div>
                  <p className="text-sm font-bold text-[#23285E]">
                    {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-GB') : '2026-01-01'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 font-semibold mb-1">
                    <Clock className="w-4 h-4 text-[#3591C8]" />
                    <span>Last Login Session</span>
                  </div>
                  <p className="text-sm font-bold text-[#23285E]">
                    {userProfile?.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleString('en-GB') : 'Current Session'}
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsEditing(true)}
                  icon={<Edit2 className="w-4 h-4" />}
                >
                  Edit Profile Info
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">Position / Role Title</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. District Coordinator"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +250 788 000 000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  Save Updates
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Security & Password Change Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#23285E]">Account Security & Password</h3>
              <p className="text-xs text-slate-500">
                Manage and update your personal password for email sign-in
              </p>
            </div>
          </div>

          {!showPasswordSection && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordSection(true)}
              icon={<Lock className="w-3.5 h-3.5" />}
            >
              Change Password
            </Button>
          )}
        </div>

        {showPasswordSection && (
          <form onSubmit={handlePasswordChange} className="p-6 sm:p-8 space-y-4">
            {passwordError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPasswordSection(false);
                  setPasswordError('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={passwordSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={passwordSaving}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* PWA App Install & Offline Capability */}
      <PWAInstallPrompt variant="card" />
    </div>
  );
};

