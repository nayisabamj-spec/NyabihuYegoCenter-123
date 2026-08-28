import React, { useState } from 'react';
import {
  LogIn,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  ArrowLeft,
  XCircle,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/common/Button';
import { DEFAULT_DISTRICTS } from '../data/initialData';
import { DEFAULT_DIRECTOR_EMAIL } from '../firebase/config';

interface LoginPageProps {
  onBackToLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToLanding }) => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    userProfile,
    isPending,
    isSuspendedOrRejected,
    signOutUser,
  } = useAuth();
  const { districts } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('nyabihu');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const availableDistricts = districts.length > 0 ? districts : DEFAULT_DISTRICTS;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        if (!email.trim() || !password) {
          setErrorMsg('Please provide both email and password.');
          setLoading(false);
          return;
        }
        await signInWithEmail(email.trim(), password);
      } else {
        if (!fullName.trim() || !email.trim() || !password) {
          setErrorMsg('Please complete all required fields.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const dObj = availableDistricts.find(d => d.id === selectedDistrictId) || availableDistricts[0];
        await signUpWithEmail(email.trim(), password, fullName.trim(), phone.trim(), dObj.id, dObj.name);
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password. Please check your credentials and try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Email/Password provider is not enabled. Please enable "Email/Password" in Firebase Console > Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg(`Unauthorized Domain: Please add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else {
        setErrorMsg(err.message || 'Unable to complete request. Please check your network and credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const dObj = availableDistricts.find(d => d.id === selectedDistrictId) || availableDistricts[0];
      await signInWithGoogle(dObj.id, dObj.name);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google Sign-in popup was closed before completing.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg(`Unauthorized Domain: Please add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-in is not enabled yet in your Firebase Project. Please enable the "Google" provider under Firebase Console > Authentication > Sign-in method.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('The sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Another sign-in request is already in progress.');
      } else {
        setErrorMsg(err.message || 'Google Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // If user account is suspended or rejected
  if (userProfile && isSuspendedOrRejected) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-[#3591C8] selection:text-white">
        <div className="mb-4">
          <Logo size="lg" />
        </div>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#23285E]">Access Restricted</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Your account ({userProfile.email}) is currently <span className="font-bold text-red-600 uppercase">{userProfile.status}</span>.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Only authorized personnel approved by the Executive Director ({DEFAULT_DIRECTOR_EMAIL}) can access this management portal.
          </p>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
            <p><span className="font-semibold text-slate-700">Account:</span> {userProfile.fullName}</p>
            <p><span className="font-semibold text-slate-700">Email:</span> {userProfile.email}</p>
            <p><span className="font-semibold text-slate-700">Status:</span> <span className="text-red-600 font-bold capitalize">{userProfile.status}</span></p>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              size="md"
              onClick={signOutUser}
              fullWidth
            >
              Sign Out & Return
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If user is currently pending approval
  if (userProfile && isPending) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-[#3591C8] selection:text-white">
        <div className="mb-4">
          <Logo size="lg" />
        </div>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-amber-200 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#23285E]">Account Pending Approval</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Your account for <span className="font-semibold text-[#23285E]">{userProfile.districtName}</span> is awaiting verification by the Executive Center Director.
          </p>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
            <p><span className="font-semibold text-slate-700">Name:</span> {userProfile.fullName}</p>
            <p><span className="font-semibold text-slate-700">Email:</span> {userProfile.email}</p>
            <p><span className="font-semibold text-slate-700">Assigned District:</span> {userProfile.districtName}</p>
            <p><span className="font-semibold text-slate-700">Status:</span> <span className="text-amber-600 font-bold">Pending Director Review</span></p>
          </div>

          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            To prevent unauthorized access, center attendance records remain protected until your identity and district role are approved.
          </p>

          <div className="mt-6">
            <Button
              variant="outline"
              size="md"
              onClick={signOutUser}
              fullWidth
            >
              Sign Out & Return
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#3591C8] selection:text-white">
      {/* Back button */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#23285E] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Banner Header */}
        <div className="bg-[#23285E] p-6 text-center text-white border-b border-[#1b1f4a]">
          <div className="flex justify-center mb-3">
            <Logo variant="white" size="lg" showSubtitle={false} />
          </div>
          <h2 className="text-lg font-bold">NYABIHU YEGO CENTER</h2>
          <p className="text-xs text-[#DFF8F5] mt-0.5">Staff & Management Access</p>
        </div>

        {/* Tab switch: Sign In vs Request Access */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'border-[#23285E] text-[#23285E] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In to Account
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'border-[#23285E] text-[#23285E] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Request Staff Access
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Google Auth Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-300 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27A7.16 7.16 0 0 1 4.9 12c0-.79.14-1.56.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span className="text-sm">Continue with Google</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Authorized Google accounts will be verified automatically.
            </p>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              or with email & password
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#23285E] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mugisha Jean de Dieu"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23285E] mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      placeholder="e.g. +250 788 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23285E] mb-1">
                    Operating District / Center *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <select
                      value={selectedDistrictId}
                      onChange={(e) => setSelectedDistrictId(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8] cursor-pointer"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.id === 'nyabihu' ? '(Main Center)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@nyabihuyego.rw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#23285E]">
                  Password *
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            >
              {mode === 'signin' ? 'Sign In' : 'Submit Registration Request'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

