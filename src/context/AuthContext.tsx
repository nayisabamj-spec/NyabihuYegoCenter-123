import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
import { cleanForFirestore } from '../utils/firestoreSanitizer';

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
  signInWithGoogle: (districtId?: string, districtName?: string) => Promise<UserProfile | null>;
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
  refreshProfile: () => Promise<UserProfile | null>;
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

// Helper: Wrap promise with strict timeout
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${timeoutMsg}`)), ms)
    ),
  ]);
}

// In-flight profile fetch deduplication map
const inFlightProfileFetches = new Map<string, Promise<UserProfile | null>>();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(getInitialCachedProfile);
  // Fast start: initial session check
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

  // Fetch or create profile on Firestore with deduplication and timeout protection
  const fetchUserProfile = async (
    user: FirebaseUser | { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
    defaultDistrictId?: string,
    defaultDistrictName?: string
  ): Promise<UserProfile | null> => {
    const uid = user.uid;
    if (!uid) return null;

    // Deduplicate concurrent fetch requests for the same user UID
    if (inFlightProfileFetches.has(uid)) {
      return inFlightProfileFetches.get(uid)!;
    }

    const fetchPromise = (async (): Promise<UserProfile | null> => {
      const userEmailClean = (user.email || '').toLowerCase().trim();
      const isSuperAdmin = isSuperAdminEmail(userEmailClean);
      const isYves = userEmailClean === 'myvesrobert@gmail.com';
      const isMarie = userEmailClean === 'nyirabakundamarie@gmail.com';

      try {
        const userRef = doc(db, 'users', uid);
        let userSnap: any = null;
        
        try {
          userSnap = await withTimeout(getDoc(userRef), 3500, 'Firestore user doc lookup');
        } catch (err) {
          console.warn('Direct user doc fetch info/timeout:', err);
        }

        if (userSnap && userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          
          let updatedProfile: UserProfile = { ...data, id: uid };
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

          // Non-blocking background update
          if (needsDbUpdate) {
            setDoc(userRef, cleanForFirestore(updatedProfile), { merge: true }).catch(() => {});
          } else {
            updateDoc(userRef, cleanForFirestore({
              lastLoginAt: updatedProfile.lastLoginAt,
              updatedAt: new Date().toISOString(),
            })).catch(() => {});
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
            const emailSnap = await withTimeout(getDocs(emailQuery), 2500, 'Pre-provisioned user search');

            if (emailSnap && !emailSnap.empty) {
              const matchedDoc = emailSnap.docs[0];
              matchedPreProfile = matchedDoc.data() as UserProfile;
              matchedDocId = matchedDoc.id;
            }
          } catch (e) {
            console.warn('Pre-provisioned user search error/timeout:', e);
          }
        }

        const districtObj = DEFAULT_DISTRICTS.find(d => d.id === (defaultDistrictId || 'nyabihu')) || DEFAULT_DISTRICTS[0];
        const assignedDistrictId = matchedPreProfile?.districtId || (isSuperAdmin ? 'nyabihu' : (defaultDistrictId || districtObj.id));
        const assignedDistrictName = matchedPreProfile?.districtName || (isSuperAdmin ? 'Nyabihu District' : (defaultDistrictName || districtObj.name));

        // Resolve role and approval status
        const resolvedRole: 'director' | 'admin' = (isSuperAdmin || matchedPreProfile?.role === 'director') ? 'director' : (matchedPreProfile?.role || 'admin');
        const resolvedStatus: UserStatus = (isSuperAdmin || matchedPreProfile?.status === 'approved') ? 'approved' : (matchedPreProfile?.status || 'approved');
        const resolvedPosition = matchedPreProfile?.position || (isMarie ? 'Executive Center Director (Super Admin)' : isYves ? 'Super Administrator' : resolvedRole === 'director' ? 'Super Administrator' : 'Youth Attendance Officer');
        const resolvedFullName = matchedPreProfile?.fullName || (isMarie ? 'Nyirabakunda Marie' : isYves ? 'M. Yves Robert' : user.displayName || user.email?.split('@')[0] || 'Staff Member');

        const finalProfile: UserProfile = {
          id: uid,
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

        // Persist finalized profile directly under user.uid (non-blocking)
        setDoc(userRef, cleanForFirestore(finalProfile), { merge: true }).catch((saveErr) => {
          console.warn('User profile initial save to firestore:', saveErr);
        });

        // Clean up pre-provisioned temporary document if different ID
        if (matchedDocId && matchedDocId !== uid) {
          deleteDoc(doc(db, 'users', matchedDocId)).catch(() => {});
        }

        setUserProfile(finalProfile);

        // If staff registered that is pending approval, notify director
        if (resolvedStatus === 'pending') {
          const notifId = `notif-req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          setDoc(doc(db, 'notifications', notifId), cleanForFirestore({
            id: notifId,
            recipientUserId: 'director_only',
            type: 'admin_request',
            title: 'New Admin Request',
            message: `A new administrator account (${finalProfile.fullName} - ${finalProfile.districtName}) is waiting for approval.`,
            priority: 'urgent',
            districtId: finalProfile.districtId,
            districtName: finalProfile.districtName,
            isRead: false,
            createdAt: new Date().toISOString(),
          })).catch(() => {});
        }

        return finalProfile;
      } catch (err) {
        console.warn('Error fetching or creating user profile, applying resilient fallback:', err);
        const fallbackProfile: UserProfile = {
          id: uid,
          fullName: isMarie ? 'Nyirabakunda Marie' : isYves ? 'M. Yves Robert' : user.displayName || user.email?.split('@')[0] || 'Administrator',
          email: user.email || userEmailClean,
          phone: isYves ? '+250 788 123 456' : isMarie ? '+250 788 000 000' : '',
          role: isSuperAdmin ? 'director' : 'admin',
          districtId: 'nyabihu',
          districtName: 'Nyabihu District',
          status: 'approved',
          position: isSuperAdmin ? 'Super Administrator' : 'Staff Administrator',
          profilePhoto: user.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setUserProfile(fallbackProfile);
        return fallbackProfile;
      } finally {
        inFlightProfileFetches.delete(uid);
      }
    })();

    inFlightProfileFetches.set(uid, fetchPromise);
    return fetchPromise;
  };

  useEffect(() => {
    let isMounted = true;

    // Hard fallback timer: prevents app from staying stuck in initial loading for more than 800ms
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 800);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setCurrentUser(user);
      if (user) {
        try {
          await fetchUserProfile(user);
        } catch (e) {
          console.warn('onAuthStateChanged profile fetch error:', e);
        }
      } else {
        setUserProfile(null);
      }
      if (isMounted) {
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (currentUser) {
      return await fetchUserProfile(currentUser);
    }
    if (auth.currentUser) {
      return await fetchUserProfile(auth.currentUser);
    }
    return null;
  };

  const signInWithGoogle = async (districtId?: string, districtName?: string): Promise<UserProfile | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setCurrentUser(result.user);
        const profile = await fetchUserProfile(result.user, districtId, districtName);
        return profile;
      }
      return null;
    } catch (err: any) {
      console.error('Google Sign-in error in AuthContext:', err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const isSuperAdmin = isSuperAdminEmail(cleanEmail);
    const expectedStoredPass = getStoredPasswordForEmail(cleanEmail);

    try {
      // 1. Try standard Firebase Auth email sign-in
      try {
        const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        if (result.user) {
          setCurrentUser(result.user);
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
              setCurrentUser(signupRes.user);
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
    } catch (err) {
      throw err;
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
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        setStoredPasswordForEmail(email, pass);
        await updateFirebaseProfile(result.user, { displayName: fullName }).catch(() => {});
        setCurrentUser(result.user);
        await fetchUserProfile(result.user, districtId, districtName);
      }
    } catch (err) {
      throw err;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch {}
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
      await updateDoc(userRef, cleanForFirestore({
        ...updates,
        updatedAt: new Date().toISOString(),
      }));
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
      }
    }

    // 3. Update security timestamp on profile in Firestore
    try {
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, cleanForFirestore({
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
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


