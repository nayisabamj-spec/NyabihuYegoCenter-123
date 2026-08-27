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
} from 'firebase/firestore';
import { auth, db, googleProvider, DEFAULT_DIRECTOR_EMAIL } from '../firebase/config';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or create profile on Firestore
  const fetchUserProfile = async (user: FirebaseUser, defaultDistrictId?: string, defaultDistrictName?: string): Promise<UserProfile | null> => {
    try {
      const isDirectorEmail = user.email?.toLowerCase().trim() === DEFAULT_DIRECTOR_EMAIL.toLowerCase().trim();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        
        // Enforce director status for director email
        let updatedProfile = { ...data };
        if (isDirectorEmail && (data.role !== 'director' || data.status !== 'approved')) {
          updatedProfile.role = 'director';
          updatedProfile.status = 'approved';
          await updateDoc(userRef, {
            role: 'director',
            status: 'approved',
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        setUserProfile(updatedProfile);

        // Update last login
        await updateDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
        return updatedProfile;
      } else {
        // Auto-configure director or initialize new staff pending authorization
        const districtObj = DEFAULT_DISTRICTS.find(d => d.id === (defaultDistrictId || 'nyabihu')) || DEFAULT_DISTRICTS[0];
        const assignedDistrictId = isDirectorEmail ? 'nyabihu' : (defaultDistrictId || districtObj.id);
        const assignedDistrictName = isDirectorEmail ? 'Nyabihu District' : (defaultDistrictName || districtObj.name);

        const newProfile: UserProfile = {
          id: user.uid,
          fullName: user.displayName || user.email?.split('@')[0] || (isDirectorEmail ? 'Nyirabakunda Marie' : 'Staff Member'),
          email: user.email || '',
          phone: '',
          role: isDirectorEmail ? 'director' : 'admin',
          districtId: assignedDistrictId,
          districtName: assignedDistrictName,
          status: isDirectorEmail ? 'approved' : 'pending',
          profilePhoto: user.photoURL || '',
          position: isDirectorEmail ? 'Executive Center Director' : 'Youth Attendance Officer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);

        // If newly registered pending user, alert director
        if (!isDirectorEmail) {
          const notifId = `notif-req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          setDoc(doc(db, 'notifications', notifId), {
            id: notifId,
            recipientUserId: 'director_only',
            type: 'admin_request',
            title: 'New Admin Request',
            message: `A new administrator account (${newProfile.fullName} - ${newProfile.districtName}) is waiting for approval.`,
            priority: 'important',
            districtId: newProfile.districtId,
            isRead: false,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        }

        return newProfile;
      }
    } catch (err) {
      console.warn('Error fetching or creating user profile in Firestore:', err);
      // Fallback user profile in case of offline/network conditions
      const isDirectorEmail = user.email?.toLowerCase().trim() === DEFAULT_DIRECTOR_EMAIL.toLowerCase().trim();
      const fallbackProfile: UserProfile = {
        id: user.uid,
        fullName: user.displayName || user.email?.split('@')[0] || (isDirectorEmail ? 'Nyirabakunda Marie' : 'Staff Member'),
        email: user.email || '',
        role: isDirectorEmail ? 'director' : 'admin',
        districtId: 'nyabihu',
        districtName: 'Nyabihu District',
        status: isDirectorEmail ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
        await updateFirebaseProfile(result.user, { displayName: fullName });
        const userRef = doc(db, 'users', result.user.uid);
        const isDirectorEmail = email.toLowerCase().trim() === DEFAULT_DIRECTOR_EMAIL.toLowerCase().trim();

        const newProfile: UserProfile = {
          id: result.user.uid,
          fullName,
          email,
          phone,
          role: isDirectorEmail ? 'director' : 'admin',
          districtId,
          districtName,
          status: isDirectorEmail ? 'approved' : 'pending',
          position: isDirectorEmail ? 'Executive Center Director' : 'Youth Attendance Officer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
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

