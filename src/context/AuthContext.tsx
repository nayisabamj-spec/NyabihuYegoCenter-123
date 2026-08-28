import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile
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
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 2800): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)),
    ]);
  };

  // Fetch or create profile on Firestore
  const fetchUserProfile = async (user: FirebaseUser, defaultDistrictId?: string, defaultDistrictName?: string): Promise<UserProfile | null> => {
    const userEmailClean = (user.email || '').toLowerCase().trim();
    const isSuperAdmin = isSuperAdminEmail(userEmailClean);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef).catch(() => null);

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
          await setDoc(userRef, updatedProfile, { merge: true }).catch(() => {});
        } else {
          updateDoc(userRef, {
            lastLoginAt: updatedProfile.lastLoginAt,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
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
          const emailSnap = await getDocs(emailQuery).catch(() => null);

          if (emailSnap && !emailSnap.empty) {
            const matchedDoc = emailSnap.docs[0];
            matchedPreProfile = matchedDoc.data() as UserProfile;
            matchedDocId = matchedDoc.id;
          } else {
            // Also check case-insensitive match by scanning users if needed
            const allUsersSnap = await getDocs(collection(db, 'users')).catch(() => null);
            if (allUsersSnap && !allUsersSnap.empty) {
              for (const uDoc of allUsersSnap.docs) {
                const uData = uDoc.data() as UserProfile;
                if (uData.email && uData.email.toLowerCase().trim() === userEmailClean) {
                  matchedPreProfile = uData;
                  matchedDocId = uDoc.id;
                  break;
                }
              }
            }
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
      const resolvedPosition = matchedPreProfile?.position || (resolvedRole === 'director' ? 'Super Administrator' : 'Youth Attendance Officer');

      const finalProfile: UserProfile = {
        id: user.uid,
        fullName: matchedPreProfile?.fullName || user.displayName || user.email?.split('@')[0] || (resolvedRole === 'director' ? 'Super Administrator' : 'Staff Member'),
        email: user.email || userEmailClean,
        phone: matchedPreProfile?.phone || '',
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
      await setDoc(userRef, finalProfile);

      // Clean up pre-provisioned temporary document if different ID
      if (matchedDocId && matchedDocId !== user.uid) {
        deleteDoc(doc(db, 'users', matchedDocId)).catch(() => {});
      }

      setUserProfile(finalProfile);

      // If a brand new staff registered that is pending approval, notify director
      if (resolvedStatus === 'pending') {
        const notifId = `notif-req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUserId: 'director_only',
          type: 'admin_request',
          title: 'New Admin Request',
          message: `A new administrator account (${finalProfile.fullName} - ${finalProfile.districtName}) is waiting for approval.`,
          priority: 'important',
          districtId: finalProfile.districtId,
          isRead: false,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }

      return finalProfile;
    } catch (err) {
      console.warn('Error fetching or creating user profile in Firestore:', err);
      const fallbackProfile: UserProfile = {
        id: user.uid,
        fullName: user.displayName || user.email?.split('@')[0] || (isSuperAdmin ? 'Super Administrator' : 'Administrator'),
        email: user.email || '',
        role: isSuperAdmin ? 'director' : 'admin',
        districtId: 'nyabihu',
        districtName: 'Nyabihu District',
        status: isSuperAdmin ? 'approved' : 'approved',
        position: isSuperAdmin ? 'Super Administrator' : 'Youth Attendance Officer',
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
    // Safety timer to prevent stuck loading screen
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(safetyTimer);
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
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
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await fetchUserProfile(result.user);
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
    if (!userProfile || !currentUser) return;
    const updated = {
      ...userProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(updated);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to update profile on Firestore:', e);
    }
  };

  const isDirector = (userProfile?.role === 'director' || currentUser?.email?.toLowerCase().trim() === DEFAULT_DIRECTOR_EMAIL.toLowerCase().trim()) && userProfile?.status === 'approved';
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

