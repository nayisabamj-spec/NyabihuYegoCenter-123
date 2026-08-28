import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  updatePassword as updateFirebasePassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, DEFAULT_DIRECTOR_EMAIL, SUPER_ADMIN_EMAILS, isSuperAdminEmail } from '../firebase/config';
import { UserProfile, UserStatus } from '../types';
import { DEFAULT_DISTRICTS } from '../data/initialData';

const PASSWORDS_STORAGE_KEY = 'nyabihu_admin_passwords';
const DEFAULT_PASSWORDS: Record<string, string> = {
  'myvesrobert@gmail.com': 'Yves@2026',
  'nyirabakundamarie@gmail.com': 'Marie@2026',
};

export const getStoredPasswordForEmail = (email?: string | null): string => {
  if (!email) return '';
  const clean = email.toLowerCase().trim();
  try {
    const saved = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[clean]) return parsed[clean];
    }
  } catch {}
  return DEFAULT_PASSWORDS[clean] || '';
};

export const setStoredPasswordForEmail = (email: string, newPass: string) => {
  const clean = email.toLowerCase().trim();
  try {
    const saved = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : { ...DEFAULT_PASSWORDS };
    parsed[clean] = newPass;
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
};

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isDirector: boolean;
  isApproved: boolean;
  isPending: boolean;
  isSuspendedOrRejected: boolean;
  signInWithGoogle: (districtId?: string, districtName?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    fullName: string,
    phone: string,
    districtId: string,
    districtName: string
  ) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateMyProfile: (updates: Partial<UserProfile>) => Promise<void>;
  changeMyPassword: (newPassword: string, oldPassword?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = 'nyabihu_auth_user_cache';
const AUTH_TIMESTAMP_KEY = 'nyabihu_auth_session_time';
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000; // 3 months session lifespan

const getInitialCachedProfile = (): UserProfile | null => {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    const timestampStr = localStorage.getItem(AUTH_TIMESTAMP_KEY);
    if (!cached) return null;
    
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      if (Date.now() - timestamp > NINETY_DAYS_MS) {
        localStorage.removeItem(AUTH_CACHE_KEY);
        localStorage.removeItem(AUTH_TIMESTAMP_KEY);
        return null;
      }
    }
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(getInitialCachedProfile);
  // Fast zero-delay start: if cached profile exists, never block; if not cached, max 400ms timer
  const [loading, setLoading] = useState<boolean>(!getInitialCachedProfile());

  const setUserProfile = (profile: UserProfile | null) => {
    setUserProfileState(profile);
    try {
      if (profile) {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(profile));
        localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
      } else {
        localStorage.removeItem(AUTH_CACHE_KEY);
        localStorage.removeItem(AUTH_TIMESTAMP_KEY);
      }
    } catch {}
  };

  // Helper with timeout to prevent hung requests
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 1200): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)),
    ]);
  };

  // Fetch or create profile on Firestore
  const fetchUserProfile = async (user: FirebaseUser | { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }, defaultDistrictId?: string, defaultDistrictName?: string): Promise<UserProfile | null> => {
    const userEmailClean = (user.email || '').toLowerCase().trim();
    const isSuperAdmin = isSuperAdminEmail(userEmailClean);
    const isYves = userEmailClean === 'myvesrobert@gmail.com';
    const isMarie = userEmailClean === 'nyirabakundamarie@gmail.com';
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await withTimeout(getDoc(userRef), 1200).catch(() => null);

      if (userSnap && userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        
        let updatedProfile: UserProfile = { ...data, id: user.uid };
        let needsDbUpdate = false;

        // Guarantee primary director and authorized super admin emails always maintain director privileges
        if (isSuperAdmin && (data.role !== 'director' || data.status !== 'approved')) {
          updatedProfile.role = 'director';
          updatedProfile.status = 'approved';
          needsDbUpdate = true;
        }

        if (user.photoURL && user.photoURL !== data.profilePhoto) {
          updatedProfile.profilePhoto = user.photoURL;
          needsDbUpdate = true;
        }

        updatedProfile.lastLoginAt = new Date().toISOString();

        if (needsDbUpdate) {
          withTimeout(setDoc(userRef, updatedProfile, { merge: true }), 1200).catch(() => {});
        } else {
          withTimeout(updateDoc(userRef, {
            lastLoginAt: updatedProfile.lastLoginAt,
            updatedAt: new Date().toISOString(),
          }), 1200).catch(() => {});
        }

        setUserProfile(updatedProfile);
        return updatedProfile;
      }

      // Check if there is a pre-provisioned administrator account matching this email
      let matchedPreProfile: UserProfile | null = null;
      let matchedDocId: string | null = null;

      if (userEmailClean) {
        try {
          const emailQuery = query(collection(db, 'users'), where('email', '==', userEmailClean));
          const emailSnap = await withTimeout(getDocs(emailQuery), 1200).catch(() => null);

          if (emailSnap && !emailSnap.empty) {
            const matchedDoc = emailSnap.docs[0];
            matchedPreProfile = matchedDoc.data() as UserProfile;
            matchedDocId = matchedDoc.id;
          }
        } catch (e) {
          console.warn('Pre-provisioned user search error:', e);
        }
      }

      const districtObj = DEFAULT_DISTRICTS.find(d => d.id === (defaultDistrictId || 'nyabihu')) || DEFAULT_DISTRICTS[0];
      const assignedDistrictId = matchedPreProfile?.districtId || (isSuperAdmin ? 'nyabihu' : (defaultDistrictId || districtObj.id));
      const assignedDistrictName = matchedPreProfile?.districtName || (isSuperAdmin ? 'Nyabihu District' : (defaultDistrictName || districtObj.name));

      // Resolve role and approval status
      const resolvedRole: 'director' | 'admin' = (isSuperAdmin || matchedPreProfile?.role === 'director') ? 'director' : (matchedPreProfile?.role || 'admin');
      const resolvedStatus: UserStatus = (isSuperAdmin || matchedPreProfile?.status === 'approved') ? 'approved' : (matchedPreProfile?.status || 'pending');
      const resolvedPosition = matchedPreProfile?.position || (isMarie ? 'Executive Center Director (Super Admin)' : isYves ? 'Super Administrator' : resolvedRole === 'director' ? 'Super Administrator' : 'Youth Attendance Officer');
      const resolvedFullName = matchedPreProfile?.fullName || (isMarie ? 'Nyirabakunda Marie' : isYves ? 'M. Yves Robert' : user.displayName || user.email?.split('@')[0] || 'Staff Member');

      const finalProfile: UserProfile = {
        id: user.uid,
        fullName: resolvedFullName,
        email: user.email || userEmailClean,
        phone: matchedPreProfile?.phone || (isYves ? '+250 788 123 456' : isMarie ? '+250 788 000 000' : ''),
        role: resolvedRole,
        districtId: assignedDistrictId,
        districtName: assignedDistrictName,
        status: resolvedStatus,
        position: resolvedPosition,
        profilePhoto: user.photoURL || matchedPreProfile?.profilePhoto || '',
        createdAt: matchedPreProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      // Persist finalized profile directly under user.uid
      withTimeout(setDoc(userRef, finalProfile), 1200).catch(() => {});

      // Clean up pre-provisioned temporary document if different ID
      if (matchedDocId && matchedDocId !== user.uid) {
        deleteDoc(doc(db, 'users', matchedDocId)).catch(() => {});
      }

      setUserProfile(finalProfile);

      // If a brand new staff registered that is pending approval, notify director
      if (resolvedStatus === 'pending') {
        const notifId = `notif-req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        withTimeout(setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUserId: 'director_only',
          type: 'admin_request',
          title: 'New Admin Request',
          message: `A new administrator account (${finalProfile.fullName} - ${finalProfile.districtName}) is waiting for approval.`,
          priority: 'important',
          districtId: finalProfile.districtId,
          isRead: false,
          createdAt: new Date().toISOString(),
        }), 1200).catch(() => {});
      }

      return finalProfile;
    } catch (err) {
      console.warn('Error fetching or creating user profile in Firestore:', err);
      const isYves = userEmailClean === 'myvesrobert@gmail.com';
      const isMarie = userEmailClean === 'nyirabakundamarie@gmail.com';
      const fallbackProfile: UserProfile = {
        id: user.uid,
        fullName: isMarie ? 'Nyirabakunda Marie' : isYves ? 'M. Yves Robert' : user.displayName || user.email?.split('@')[0] || (isSuperAdmin ? 'Super Administrator' : 'Administrator'),
        email: user.email || userEmailClean,
        role: isSuperAdmin ? 'director' : 'admin',
        districtId: 'nyabihu',
        districtName: 'Nyabihu District',
        status: isSuperAdmin ? 'approved' : 'approved',
        position: isMarie ? 'Executive Center Director (Super Admin)' : isYves ? 'Super Administrator' : isSuperAdmin ? 'Super Administrator' : 'Youth Attendance Officer',
        profilePhoto: user.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    // Ultra-fast safety timer: ensures app loads under 350ms regardless of network state
    const fastSafetyTimer = setTimeout(() => {
      setLoading(false);
    }, 350);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await fetchUserProfile(user);
        } catch {
          // fallback profile is set inside fetchUserProfile
        }
      }
      setLoading(false);
      clearTimeout(fastSafetyTimer);
    });

    return () => {
      clearTimeout(fastSafetyTimer);
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  const signInWithGoogle = async (districtId?: string, districtName?: string) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await fetchUserProfile(result.user, districtId, districtName);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = isSuperAdminEmail(cleanEmail);
    const expectedStoredPass = getStoredPasswordForEmail(cleanEmail);

    setLoading(true);
    try {
      // 1. Try standard Firebase Auth email sign-in
      try {
        const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        if (result.user) {
          await fetchUserProfile(result.user);
          return;
        }
      } catch (fbErr: any) {
        // If user not found in Firebase Auth yet, but password matches configured password:
        const matchesPassword = (expectedStoredPass && pass === expectedStoredPass) ||
                                (isSuperAdmin && (pass === 'Yves@2026' || pass === 'Marie@2026'));

        if (matchesPassword) {
          // Attempt to register into Firebase Auth automatically
          try {
            const signupRes = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
            if (signupRes.user) {
              const name = cleanEmail === 'myvesrobert@gmail.com' ? 'M. Yves Robert' :
                           cleanEmail === 'nyirabakundamarie@gmail.com' ? 'Nyirabakunda Marie' : 'Administrator';
              await updateFirebaseProfile(signupRes.user, { displayName: name }).catch(() => {});
              await fetchUserProfile(signupRes.user);
              return;
            }
          } catch (createErr) {
            console.warn('Auto-create in Firebase Auth warning:', createErr);
          }

          // Fallback direct authenticated session for Super Admins / verified credentials
          const syntheticUid = `superadmin-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
          await fetchUserProfile({
            uid: syntheticUid,
            email: cleanEmail,
            displayName: cleanEmail === 'myvesrobert@gmail.com' ? 'M. Yves Robert' : 'Super Administrator',
            photoURL: null,
          });
          return;
        }

        // Rethrow if wrong password or unauthorized
        throw fbErr;
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    fullName: string,
    phone: string,
    districtId: string,
    districtName: string
  ) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        setStoredPasswordForEmail(email, pass);
        await updateFirebaseProfile(result.user, { displayName: fullName }).catch(() => {});
        await fetchUserProfile(result.user, districtId, districtName);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateMyProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = {
      ...userProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(updated);

    try {
      const userRef = doc(db, 'users', userProfile.id);
      withTimeout(updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      }), 1500).catch(() => {});
    } catch (e) {
      console.warn('Failed to update profile on Firestore:', e);
    }
  };

  const changeMyPassword = async (newPassword: string, oldPassword?: string) => {
    if (!userProfile?.email) {
      throw new Error('No authenticated user profile found.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    // 1. Update in local credential storage
    setStoredPasswordForEmail(userProfile.email, newPassword);

    // 2. If Firebase Auth user is active, update in Firebase Authentication
    if (auth.currentUser) {
      try {
        await updateFirebasePassword(auth.currentUser, newPassword);
      } catch (authErr: any) {
        console.warn('Firebase Auth password update note:', authErr);
        // auth/requires-recent-login might occur, we still persisted local credential
      }
    }

    // 3. Update security timestamp on profile in Firestore
    try {
      const userRef = doc(db, 'users', userProfile.id);
      withTimeout(updateDoc(userRef, {
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }), 1500).catch(() => {});
    } catch (e) {
      console.warn('Firestore password change timestamp warning:', e);
    }
  };

  const isDirector = (userProfile?.role === 'director' || isSuperAdminEmail(userProfile?.email || currentUser?.email)) && userProfile?.status === 'approved';
  const isApproved = userProfile?.status === 'approved';
  const isPending = userProfile?.status === 'pending';
  const isSuspendedOrRejected = userProfile?.status === 'suspended' || userProfile?.status === 'rejected';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isDirector,
        isApproved,
        isPending,
        isSuspendedOrRejected,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        updateMyProfile,
        changeMyPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


