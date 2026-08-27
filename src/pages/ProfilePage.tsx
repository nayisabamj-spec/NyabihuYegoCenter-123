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
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PWAInstallPrompt } from '../components/common/PWAInstallPrompt';

export const ProfilePage: React.FC = () => {
  const { userProfile, updateMyProfile, signOutUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [position, setPosition] = useState(userProfile?.position || '');
  const [saving, setSaving] = useState(false);

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

      {/* PWA App Install & Offline Capability */}
      <PWAInstallPrompt variant="card" />
    </div>
  );
};
