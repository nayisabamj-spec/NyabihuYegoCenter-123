import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isSuperAdminEmail, SUPER_ADMIN_EMAILS } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  District,
  ServiceItem,
  AttendanceRecord,
  AuditLog,
  SystemSettings,
  UserProfile,
  UserStatus,
  Sex,
} from '../types';
import { DEFAULT_DISTRICTS, DEFAULT_SERVICES, DEFAULT_SETTINGS } from '../data/initialData';
import { formatDateYYYYMMDD } from '../utils/stats';
import { cleanForFirestore } from '../utils/firestoreSanitizer';
import { formatFirebaseError, withTimeout } from '../utils/firebaseErrorHelper';

interface AppContextType {
  districts: District[];
  services: ServiceItem[];
  attendanceRecords: AttendanceRecord[];
  allUserProfiles: UserProfile[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  loadingData: boolean;
  dbError: string | null;
  activeDistrictFilter: string; // 'all' or specific districtId (for Director)
  setActiveDistrictFilter: (dId: string) => void;
  refreshAttendanceData: () => Promise<void>;
  recordVisit: (data: {
    personName: string;
    sex: Sex;
    serviceId: string;
    attendanceDate?: string;
    attendanceTime?: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    phoneNumber?: string;
    email?: string;
    nationalId?: string;
    notes?: string;
  }) => Promise<{ success: boolean; id?: string; error?: string }>;
  submitPublicVisitorAttendance: (data: {
    personName: string;
    sex: Sex;
    serviceId: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    phoneNumber?: string;
    email?: string;
    nationalId?: string;
    attendanceDate?: string;
    attendanceTime?: string;
    notes?: string;
  }) => Promise<{ success: boolean; id?: string; error?: string }>;
  editAttendance: (
    id: string,
    updates: Partial<Omit<AttendanceRecord, 'id' | 'districtId' | 'adminId'>>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAttendance: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateUserStatus: (
    targetUserId: string,
    status: UserStatus,
    assignedDistrictId?: string,
    role?: 'director' | 'admin'
  ) => Promise<void>;
  addDistrict: (name: string, code?: string, location?: string) => Promise<void>;
  updateDistrict: (id: string, updates: Partial<District>) => Promise<void>;
  deleteDistrict: (id: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  createAdminUser: (params: {
    fullName: string;
    email: string;
    phone?: string;
    role: 'director' | 'admin';
    districtId?: string;
    position?: string;
    status?: UserStatus;
  }) => Promise<UserProfile>;
  addService: (name: string, description: string, icon?: string) => Promise<void>;
  updateService: (id: string, updates: Partial<ServiceItem>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  toggleServiceStatus: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  logAction: (action: string, entityType: string, entityId: string, details?: string) => Promise<void>;
  seedRealisticData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isDirector } = useAuth();

  const [districts, setDistricts] = useState<District[]>(() => {
    try {
      const s = localStorage.getItem('nyabihu_districts_cache');
      return s ? JSON.parse(s) : DEFAULT_DISTRICTS;
    } catch {
      return DEFAULT_DISTRICTS;
    }
  });

  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      const s = localStorage.getItem('nyabihu_services_cache');
      return s ? JSON.parse(s) : DEFAULT_SERVICES;
    } catch {
      return DEFAULT_SERVICES;
    }
  });

  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() => {
    try {
      const s = localStorage.getItem('nyabihu_attendance_backup');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [allUserProfiles, setAllUserProfiles] = useState<UserProfile[]>(() => {
    try {
      const s = localStorage.getItem('nyabihu_users_cache');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Director district filter: 'all' or specific districtId
  const [activeDistrictFilter, setActiveDistrictFilter] = useState<string>('all');

  // Load or sync Districts, Services, Settings & Users in real-time
  useEffect(() => {
    // 1. Real-time Districts listener
    const districtsRef = collection(db, 'districts');
    const unsubDistricts = onSnapshot(districtsRef, (snap) => {
      if (!snap.empty) {
        const loadedDistricts = snap.docs.map(doc => doc.data() as District);
        setDistricts(loadedDistricts);
        try {
          localStorage.setItem('nyabihu_districts_cache', JSON.stringify(loadedDistricts));
        } catch {}
      } else {
        // Initialize defaults if empty
        DEFAULT_DISTRICTS.forEach(d => {
          const distDoc: District = {
            ...d,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'districts', d.id), distDoc).catch(() => {});
        });
      }
    }, (err) => {
      console.warn('Districts listener info:', err);
    });

    // 2. Real-time Services listener
    const servicesRef = collection(db, 'services');
    const unsubServices = onSnapshot(servicesRef, (snap) => {
      if (!snap.empty) {
        const loadedServices = snap.docs.map(doc => doc.data() as ServiceItem);
        loadedServices.sort((a, b) => (a.order || 0) - (b.order || 0));
        setServices(loadedServices);
        try {
          localStorage.setItem('nyabihu_services_cache', JSON.stringify(loadedServices));
        } catch {}
      } else {
        DEFAULT_SERVICES.forEach(s => {
          const srvDoc: ServiceItem = {
            ...s,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'services', s.id), srvDoc).catch(() => {});
        });
      }
    }, (err) => {
      console.warn('Services listener info:', err);
    });

    // 3. Real-time Settings listener
    const settingsRef = doc(db, 'settings', 'general');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemSettings);
      } else {
        setDoc(settingsRef, DEFAULT_SETTINGS).catch(() => {});
      }
    }, (err) => {
      console.warn('Settings listener info:', err);
    });

    // 4. Real-time Users collection listener
    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      if (!snapshot.empty) {
        const users: UserProfile[] = [];
        snapshot.forEach((doc) => {
          users.push(doc.data() as UserProfile);
        });

        // Ensure authorized super admin emails are in the list with director privileges in UI state
        SUPER_ADMIN_EMAILS.forEach(superEmail => {
          const cleanSuper = superEmail.toLowerCase().trim();
          const found = users.find(u => u.email?.toLowerCase().trim() === cleanSuper);
          if (!found) {
            const isMarie = cleanSuper === 'nyirabakundamarie@gmail.com';
            const superDoc: UserProfile = {
              id: isMarie ? 'marie-super-admin' : 'yves-super-admin',
              fullName: isMarie ? 'Nyirabakunda Marie' : 'M. Yves Robert',
              email: superEmail,
              phone: isMarie ? '+250 788 000 000' : '+250 788 123 456',
              role: 'director',
              districtId: 'nyabihu',
              districtName: 'Nyabihu District',
              status: 'approved',
              position: 'Super Administrator',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            users.push(superDoc);
          }
        });

        setAllUserProfiles(users);
        try {
          localStorage.setItem('nyabihu_users_cache', JSON.stringify(users));
        } catch {}
      } else {
        // Fallback default super admins if collection is fresh
        const initialAdmins: UserProfile[] = [
          {
            id: 'marie-super-admin',
            fullName: 'Nyirabakunda Marie',
            email: 'nyirabakundamarie@gmail.com',
            phone: '+250 788 000 000',
            role: 'director',
            districtId: 'nyabihu',
            districtName: 'Nyabihu District',
            status: 'approved',
            position: 'Executive Center Director (Super Admin)',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'yves-super-admin',
            fullName: 'M. Yves Robert',
            email: 'myvesrobert@gmail.com',
            phone: '+250 788 123 456',
            role: 'director',
            districtId: 'nyabihu',
            districtName: 'Nyabihu District',
            status: 'approved',
            position: 'Super Administrator',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ];
        setAllUserProfiles(initialAdmins);
      }
    }, (err) => {
      console.warn('Users listener info:', err);
    });

    return () => {
      unsubDistricts();
      unsubServices();
      unsubSettings();
      unsubUsers();
    };
  }, []);

  // Listen to Attendance & Audit Logs in real-time from Firestore
  useEffect(() => {
    // If not signed in yet or not approved, do not wipe cache if we are still authenticating
    if (!userProfile) {
      return;
    }

    if (userProfile.status !== 'approved') {
      setAllAttendance([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setDbError(null);
    let unsubAttendance = () => {};
    let unsubLogs = () => {};

    try {
      // Listen directly to the attendance collection
      const attendanceRef = collection(db, 'attendance');

      unsubAttendance = onSnapshot(
        attendanceRef,
        (snapshot) => {
          const records: AttendanceRecord[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as AttendanceRecord;
            records.push({
              ...data,
              id: d.id || data.id,
              districtId: (data.districtId || 'nyabihu').toLowerCase(),
            });
          });
          // Sort by date & time desc in memory
          records.sort((a, b) => {
            const dtA = `${a.attendanceDate || ''} ${a.attendanceTime || ''}`;
            const dtB = `${b.attendanceDate || ''} ${b.attendanceTime || ''}`;
            return dtB.localeCompare(dtA);
          });
          setAllAttendance(records);
          try {
            localStorage.setItem('nyabihu_attendance_backup', JSON.stringify(records.slice(0, 3000)));
          } catch {}
          setLoadingData(false);
          setDbError(null);
        },
        (error) => {
          console.warn('Firestore attendance snapshot error, fallback to local store:', error);
          setDbError(error?.message || 'Database connection issue. Showing local cached records.');
          const localSaved = localStorage.getItem('nyabihu_attendance_backup');
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved) as AttendanceRecord[];
              setAllAttendance(parsed);
            } catch {}
          }
          setLoadingData(false);
        }
      );

      // Audit logs listener
      const logsRef = collection(db, 'auditLogs');
      unsubLogs = onSnapshot(logsRef, (snapshot) => {
        const logs: AuditLog[] = [];
        snapshot.forEach(d => {
          const lData = d.data() as AuditLog;
          logs.push({ ...lData, id: d.id || lData.id });
        });
        logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setAuditLogs(logs.slice(0, 150));
      }, (err) => {
        console.warn('Audit logs listener info:', err);
      });
    } catch (e: any) {
      console.warn('Error setting up firestore listeners:', e);
      setDbError(e?.message || 'Error initializing Firestore listener.');
      setLoadingData(false);
    }

    return () => {
      unsubAttendance();
      unsubLogs();
    };
  }, [userProfile?.id, userProfile?.status]);

  // Explicit manual re-sync from Firestore database
  const refreshAttendanceData = async (): Promise<void> => {
    setLoadingData(true);
    setDbError(null);
    try {
      const snap = await getDocs(collection(db, 'attendance'));
      const records: AttendanceRecord[] = [];
      snap.forEach((d) => {
        const data = d.data() as AttendanceRecord;
        records.push({
          ...data,
          id: d.id || data.id,
          districtId: (data.districtId || 'nyabihu').toLowerCase(),
        });
      });
      records.sort((a, b) => {
        const dtA = `${a.attendanceDate || ''} ${a.attendanceTime || ''}`;
        const dtB = `${b.attendanceDate || ''} ${b.attendanceTime || ''}`;
        return dtB.localeCompare(dtA);
      });
      setAllAttendance(records);
      try {
        localStorage.setItem('nyabihu_attendance_backup', JSON.stringify(records.slice(0, 3000)));
      } catch {}
      setLoadingData(false);
    } catch (err: any) {
      console.error('Error in refreshAttendanceData:', err);
      setDbError(err?.message || 'Failed to reload attendance from Firebase.');
      setLoadingData(false);
    }
  };

  // Compute filtered attendance records according to data isolation & active filter
  const attendanceRecords = useMemo(() => {
    if (!userProfile) return [];
    
    // Strict isolation: if not director, ONLY ever return their own district
    if (!isDirector) {
      const userDistClean = (userProfile.districtId || 'nyabihu').toLowerCase();
      return allAttendance.filter(r => (r.districtId || 'nyabihu').toLowerCase() === userDistClean);
    }

    // If director: apply active district filter if selected
    if (activeDistrictFilter !== 'all') {
      const filterClean = activeDistrictFilter.toLowerCase();
      return allAttendance.filter(r => (r.districtId || 'nyabihu').toLowerCase() === filterClean);
    }

    return allAttendance;
  }, [allAttendance, userProfile, isDirector, activeDistrictFilter]);

  // Audit Logging
  const logAction = async (action: string, entityType: string, entityId: string, details?: string) => {
    if (!userProfile) return;
    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const log: AuditLog = {
      id: logId,
      userId: userProfile.id,
      userName: userProfile.fullName,
      action,
      entityType,
      entityId,
      districtId: userProfile.districtId,
      timestamp: new Date().toISOString(),
      details,
    };

    setAuditLogs(prev => [log, ...prev].slice(0, 100));
    try {
      await setDoc(doc(db, 'auditLogs', logId), cleanForFirestore(log));
    } catch {}
  };

  // Record Attendance Visit (Staff/Admin)
  const recordVisit = async (data: {
    personName: string;
    sex: Sex;
    serviceId: string;
    attendanceDate?: string;
    attendanceTime?: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    phoneNumber?: string;
    email?: string;
    nationalId?: string;
    notes?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!userProfile) {
      return { success: false, error: 'User is not authenticated' };
    }

    const srv = services.find(s => s.id === data.serviceId);
    const serviceName = srv ? srv.name : data.serviceId;

    const now = new Date();
    const currentDate = data.attendanceDate || formatDateYYYYMMDD(now);
    const currentTime = data.attendanceTime || now.toTimeString().substring(0, 5);

    const recordId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Automatically use the authenticated user's district and identity with Nyabihu as default
    const newRecord: AttendanceRecord = {
      id: recordId,
      districtId: (userProfile.districtId || 'nyabihu').toLowerCase(),
      districtName: data.district || userProfile.districtName || 'NYABIHU',
      adminId: userProfile.id,
      recordedBy: userProfile.fullName,
      personName: data.personName.trim(),
      sex: data.sex,
      serviceId: data.serviceId,
      serviceNameSnapshot: serviceName,
      attendanceDate: currentDate,
      attendanceTime: currentTime,
      sector: data.sector?.trim() || '',
      cell: data.cell?.trim() || '',
      village: data.village?.trim() || '',
      phoneNumber: data.phoneNumber?.trim() || '',
      email: data.email?.trim() || '',
      nationalId: data.nationalId?.trim() || '',
      notes: data.notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Firebase Persistence with reload verification
    try {
      const docRef = doc(db, 'attendance', recordId);
      const sanitized = cleanForFirestore(newRecord);
      
      // Step 1: Write to Firestore
      await setDoc(docRef, sanitized);

      // Step 2: Reload and confirm write succeeded in Firestore
      const verifySnap = await getDoc(docRef);
      if (!verifySnap.exists()) {
        throw new Error('Firestore verification failed: Document was not found in the database after saving.');
      }

      const verifiedRecord = {
        ...(verifySnap.data() as AttendanceRecord),
        id: recordId,
      };

      // Step 3: Update local state & backup only after Firestore confirmation
      setAllAttendance(prev => {
        const filtered = prev.filter(r => r.id !== recordId);
        return [verifiedRecord, ...filtered];
      });

      try {
        const existingBackup = JSON.parse(localStorage.getItem('nyabihu_attendance_backup') || '[]');
        const updatedBackup = [verifiedRecord, ...existingBackup.filter((r: AttendanceRecord) => r.id !== recordId)];
        localStorage.setItem('nyabihu_attendance_backup', JSON.stringify(updatedBackup.slice(0, 3000)));
      } catch {}

      // Step 4: Non-blocking log action & notification
      logAction('RECORD_ATTENDANCE', 'attendance', recordId, `Visit recorded for ${verifiedRecord.personName} (${verifiedRecord.serviceNameSnapshot})`).catch(() => {});
      
      const notifId = `notif-staff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setDoc(doc(db, 'notifications', notifId), cleanForFirestore({
        id: notifId,
        recipientUserId: 'all_approved_admins',
        type: 'staff_recorded',
        title: 'Attendance Recorded',
        message: `A new ${serviceName} attendance record was logged by ${userProfile.fullName}.`,
        priority: 'normal',
        relatedRecordId: recordId,
        districtId: userProfile.districtId || 'nyabihu',
        districtName: newRecord.districtName,
        serviceName: serviceName,
        isRead: false,
        createdAt: new Date().toISOString(),
      })).catch(() => {});

      return { success: true, id: recordId };
    } catch (err: any) {
      console.error('CRITICAL: Firestore attendance write failed:', err);
      // Strictly do not claim success if Firebase write failed
      return { success: false, error: err?.message || 'Database write failed. The record could not be saved to Firestore.' };
    }
  };

  // Public Visitor Self Check-In (From Home Screen / Kiosk)
  const submitPublicVisitorAttendance = async (data: {
    personName: string;
    sex: Sex;
    serviceId: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    phoneNumber?: string;
    email?: string;
    nationalId?: string;
    attendanceDate?: string;
    attendanceTime?: string;
    notes?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> => {
    const srv = services.find(s => s.id === data.serviceId) || DEFAULT_SERVICES.find(s => s.id === data.serviceId);
    const serviceName = srv ? srv.name : data.serviceId;

    const now = new Date();
    const currentDate = data.attendanceDate || formatDateYYYYMMDD(now);
    const currentTime = data.attendanceTime || now.toTimeString().substring(0, 5);

    const recordId = `rec-kiosk-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const targetDistrict = data.district?.trim().toUpperCase() || 'NYABIHU';

    const newRecord: AttendanceRecord = {
      id: recordId,
      districtId: 'nyabihu',
      districtName: targetDistrict,
      adminId: 'visitor-self-checkin',
      recordedBy: 'Visitor Self Check-In',
      personName: data.personName.trim(),
      sex: data.sex,
      serviceId: data.serviceId,
      serviceNameSnapshot: serviceName,
      attendanceDate: currentDate,
      attendanceTime: currentTime,
      sector: data.sector?.trim() || '',
      cell: data.cell?.trim() || '',
      village: data.village?.trim() || '',
      phoneNumber: data.phoneNumber?.trim() || '',
      email: data.email?.trim() || '',
      nationalId: data.nationalId?.trim() || '',
      isSelfCheckIn: true,
      notes: data.notes?.trim() || 'Visitor Public Check-In',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Firebase Persistence with reload verification
    try {
      const docRef = doc(db, 'attendance', recordId);
      const sanitized = cleanForFirestore(newRecord);
      
      // Step 1: Write to Firestore
      await setDoc(docRef, sanitized);

      // Step 2: Reload and confirm write
      const verifySnap = await getDoc(docRef);
      if (!verifySnap.exists()) {
        throw new Error('Firestore verification failed: Document was not saved in the database.');
      }

      const verifiedRecord = {
        ...(verifySnap.data() as AttendanceRecord),
        id: recordId,
      };

      // Step 3: Update local state & backup only after Firestore confirmation
      setAllAttendance(prev => {
        const filtered = prev.filter(r => r.id !== recordId);
        return [verifiedRecord, ...filtered];
      });

      try {
        const existingBackup = JSON.parse(localStorage.getItem('nyabihu_attendance_backup') || '[]');
        const updatedBackup = [verifiedRecord, ...existingBackup.filter((r: AttendanceRecord) => r.id !== recordId)];
        localStorage.setItem('nyabihu_attendance_backup', JSON.stringify(updatedBackup.slice(0, 3000)));
      } catch {}

      // Non-blocking notification emission for authorized admins
      const notifId = `notif-kiosk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setDoc(doc(db, 'notifications', notifId), cleanForFirestore({
        id: notifId,
        recipientUserId: 'all_approved_admins',
        type: 'new_visitor',
        title: 'New Visit Recorded',
        message: `New ${serviceName} visit recorded at NYABIHU YEGO CENTER.`,
        priority: 'normal',
        relatedRecordId: recordId,
        districtId: 'nyabihu',
        districtName: targetDistrict,
        serviceName: serviceName,
        isRead: false,
        createdAt: new Date().toISOString(),
      })).catch(() => {});

      return { success: true, id: recordId };
    } catch (err: any) {
      console.error('CRITICAL: Firestore visitor checkin failed:', err);
      return { success: false, error: err?.message || 'Database write failed. Check your internet connection.' };
    }
  };

  // Edit Attendance Record
  const editAttendance = async (
    id: string,
    updates: Partial<Omit<AttendanceRecord, 'id' | 'districtId' | 'adminId'>>
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = allAttendance.find(r => r.id === id);
    if (!existing) {
      return { success: false, error: 'Record not found' };
    }

    // Security check: District admins can only edit their own district's records
    if (!isDirector && existing.districtId !== userProfile?.districtId) {
      return { success: false, error: 'Unauthorized to modify another district record' };
    }

    // If serviceId changed, update serviceNameSnapshot
    let updatedSnapshot = existing.serviceNameSnapshot;
    if (updates.serviceId && updates.serviceId !== existing.serviceId) {
      const srv = services.find(s => s.id === updates.serviceId);
      if (srv) updatedSnapshot = srv.name;
    }

    try {
      const docRef = doc(db, 'attendance', id);
      await updateDoc(docRef, cleanForFirestore({
        ...updates,
        serviceNameSnapshot: updatedSnapshot,
        updatedAt: new Date().toISOString(),
      }));

      // Reload and confirm
      const verifySnap = await getDoc(docRef);
      if (!verifySnap.exists()) {
        throw new Error('Firestore verification failed: Updated document not found.');
      }
      const verified = {
        ...(verifySnap.data() as AttendanceRecord),
        id,
      };

      setAllAttendance(prev => prev.map(r => (r.id === id ? verified : r)));
      
      try {
        const existingBackup = JSON.parse(localStorage.getItem('nyabihu_attendance_backup') || '[]');
        const updatedBackup = existingBackup.map((r: AttendanceRecord) => (r.id === id ? verified : r));
        localStorage.setItem('nyabihu_attendance_backup', JSON.stringify(updatedBackup.slice(0, 3000)));
      } catch {}

      await logAction('EDIT_ATTENDANCE', 'attendance', id, `Updated record for ${verified.personName}`);
      return { success: true };
    } catch (err: any) {
      console.error('Error updating attendance in Firestore:', err);
      return { success: false, error: err?.message || 'Failed to update record in Firestore' };
    }
  };

  // Delete Attendance Record
  const deleteAttendance = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const existing = allAttendance.find(r => r.id === id);
    if (!existing) {
      return { success: false, error: 'Record not found' };
    }

    if (!isDirector && existing.districtId !== userProfile?.districtId) {
      return { success: false, error: 'Unauthorized to delete another district record' };
    }

    try {
      const docRef = doc(db, 'attendance', id);
      await deleteDoc(docRef);

      // Verify deletion from database
      const verifySnap = await getDoc(docRef);
      if (verifySnap.exists()) {
        throw new Error('Firestore delete verification failed: Document still exists.');
      }

      setAllAttendance(prev => prev.filter(r => r.id !== id));
      
      try {
        const currentBackup: AttendanceRecord[] = JSON.parse(localStorage.getItem('nyabihu_attendance_backup') || '[]');
        localStorage.setItem('nyabihu_attendance_backup', JSON.stringify(currentBackup.filter(r => r.id !== id)));
      } catch {}

      await logAction('DELETE_ATTENDANCE', 'attendance', id, `Deleted record for ${existing.personName} (${existing.serviceNameSnapshot})`);
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting attendance record from Firestore:', err);
      return { success: false, error: err?.message || 'Failed to delete record from Firestore' };
    }
  };

  // Director user approval/status updater
  const updateUserStatus = async (
    targetUserId: string,
    status: UserStatus,
    assignedDistrictId?: string,
    role?: 'director' | 'admin'
  ) => {
    if (!isDirector) return;

    const targetUser = allUserProfiles.find(u => u.id === targetUserId);
    const isTargetSuperAdmin = isSuperAdminEmail(targetUser?.email);

    let targetDistrictName = undefined;
    if (assignedDistrictId) {
      const dObj = districts.find(d => d.id === assignedDistrictId);
      if (dObj) targetDistrictName = dObj.name;
    }

    const updates: Partial<UserProfile> = {
      status: isTargetSuperAdmin ? 'approved' : status,
      updatedAt: new Date().toISOString(),
    };
    if (assignedDistrictId) updates.districtId = assignedDistrictId;
    if (targetDistrictName) updates.districtName = targetDistrictName;
    if (role) updates.role = isTargetSuperAdmin ? 'director' : role;

    setAllUserProfiles(prev => {
      const nextList = prev.map(u => (u.id === targetUserId ? { ...u, ...updates } : u));
      try {
        localStorage.setItem('nyabihu_users_cache', JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    try {
      await updateDoc(doc(db, 'users', targetUserId), cleanForFirestore(updates));
      logAction(
        `ADMIN_${status.toUpperCase()}`,
        'user',
        targetUserId,
        `Status updated to ${status}`
      ).catch(() => {});

      // Trigger targeted notification for user & director
      const notifId = `notif-user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setDoc(doc(db, 'notifications', notifId), cleanForFirestore({
        id: notifId,
        recipientUserId: targetUserId,
        type: status === 'approved' ? 'admin_approved' : status === 'suspended' ? 'admin_suspended' : 'system_alert',
        title: status === 'approved' ? 'Account Approved' : status === 'suspended' ? 'Account Suspended' : 'Status Updated',
        message: status === 'approved'
          ? 'Your administrator account has been approved. You now have full access to attendance & reports.'
          : `Your account status has been updated to ${status}.`,
        priority: 'important',
        districtId: assignedDistrictId || 'nyabihu',
        isRead: false,
        createdAt: new Date().toISOString(),
      })).catch(() => {});
    } catch (e) {
      console.warn('Error updating user status on Firestore:', e);
    }
  };

  // Districts management
  const addDistrict = async (name: string, code?: string, location?: string) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const newDistrict: District = {
      id,
      name,
      code: code || `DST-${Math.floor(Math.random() * 90 + 10)}`,
      status: 'active',
      location: location || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDistricts(prev => {
      const next = [...prev, newDistrict];
      try {
        localStorage.setItem('nyabihu_districts_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      await setDoc(doc(db, 'districts', id), cleanForFirestore(newDistrict));
      await logAction('CREATE_DISTRICT', 'district', id, `Created district: ${name}`);
    } catch {}
  };

  const updateDistrict = async (id: string, updates: Partial<District>) => {
    setDistricts(prev => {
      const next = prev.map(d => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d));
      try {
        localStorage.setItem('nyabihu_districts_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      await updateDoc(doc(db, 'districts', id), cleanForFirestore({ ...updates, updatedAt: new Date().toISOString() }));
      await logAction('UPDATE_DISTRICT', 'district', id, `Updated district ${id}`);
    } catch {}
  };

  const deleteDistrict = async (id: string) => {
    setDistricts(prev => {
      const next = prev.filter(d => d.id !== id);
      try {
        localStorage.setItem('nyabihu_districts_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      await deleteDoc(doc(db, 'districts', id));
      await logAction('DELETE_DISTRICT', 'district', id, `Deleted district ${id}`);
    } catch {}
  };

  const deleteUser = async (userId: string) => {
    if (!isDirector) return;
    const targetUser = allUserProfiles.find(u => u.id === userId);
    if (isSuperAdminEmail(targetUser?.email)) {
      throw new Error('Authorized Super Administrator accounts cannot be deleted.');
    }
    setAllUserProfiles(prev => {
      const next = prev.filter(u => u.id !== userId);
      try {
        localStorage.setItem('nyabihu_users_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      await deleteDoc(doc(db, 'users', userId));
      logAction('DELETE_USER', 'user', userId, `Deleted user profile ${userId}`).catch(() => {});
    } catch (e) {
      console.warn('Error deleting user from Firestore:', e);
    }
  };

  const createAdminUser = async (params: {
    fullName: string;
    email: string;
    phone?: string;
    role: 'director' | 'admin';
    districtId?: string;
    position?: string;
    status?: UserStatus;
  }): Promise<UserProfile> => {
    if (!isDirector) {
      throw new Error('Only an authorized Super Admin (Director) can create new administrators.');
    }

    const emailClean = params.email.toLowerCase().trim();
    if (!emailClean) {
      throw new Error('Email address is required.');
    }

    // Check if user with this email already exists in local list
    const existing = allUserProfiles.find(u => u.email?.toLowerCase().trim() === emailClean);
    if (existing) {
      throw new Error(`An administrator with email "${emailClean}" already exists (${existing.fullName} - ${existing.role}).`);
    }

    const assignedDistrictId = params.districtId || 'nyabihu';
    const dObj = districts.find(d => d.id === assignedDistrictId) || districts[0] || { id: 'nyabihu', name: 'Nyabihu District' };

    const userId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newProfile: UserProfile = {
      id: userId,
      fullName: params.fullName.trim(),
      email: emailClean,
      phone: params.phone?.trim() || '',
      role: params.role,
      districtId: assignedDistrictId,
      districtName: dObj.name,
      status: params.status || 'approved',
      position: params.position?.trim() || (params.role === 'director' ? 'Super Administrator / Main Director' : 'District Administrator'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllUserProfiles(prev => {
      const filtered = prev.filter(u => u.id !== userId && u.email?.toLowerCase().trim() !== emailClean);
      const nextList = [newProfile, ...filtered];
      try {
        localStorage.setItem('nyabihu_users_cache', JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    try {
      await setDoc(doc(db, 'users', userId), cleanForFirestore(newProfile));
      logAction(
        params.role === 'director' ? 'CREATE_SUPER_ADMIN' : 'CREATE_ADMIN',
        'user',
        userId,
        `Created ${params.role === 'director' ? 'Super Admin' : 'Admin'}: ${newProfile.fullName} (${newProfile.email}) for ${newProfile.districtName}`
      ).catch(() => {});
    } catch (err: any) {
      console.warn('Firestore setDoc user warning:', err);
    }

    // Trigger notification for admins
    const notifId = `notif-user-created-${Date.now()}`;
    setDoc(doc(db, 'notifications', notifId), cleanForFirestore({
      id: notifId,
      recipientUserId: 'all_approved_admins',
      type: 'admin_approved',
      title: params.role === 'director' ? 'New Super Admin Created' : 'New Administrator Created',
      message: `${params.fullName} was created as ${params.role === 'director' ? 'Super Admin (Director)' : 'District Administrator'} for ${dObj.name}.`,
      priority: 'normal',
      districtId: assignedDistrictId,
      isRead: false,
      createdAt: new Date().toISOString(),
    })).catch(() => {});

    return newProfile;
  };

  // Services management
  const addService = async (name: string, description: string, icon?: string) => {
    const id = `srv-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
    const newService: ServiceItem = {
      id,
      name,
      description,
      status: 'active',
      icon: icon || 'Sparkles',
      order: services.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setServices(prev => [...prev, newService]);
    try {
      await setDoc(doc(db, 'services', id), cleanForFirestore(newService));
      await logAction('CREATE_SERVICE', 'service', id, `Added service: ${name}`);
    } catch {}
  };

  const updateService = async (id: string, updates: Partial<ServiceItem>) => {
    setServices(prev => prev.map(s => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)));
    try {
      await updateDoc(doc(db, 'services', id), cleanForFirestore({ ...updates, updatedAt: new Date().toISOString() }));
      await logAction('UPDATE_SERVICE', 'service', id, `Updated service ${id}`);
    } catch {}
  };

  const deleteService = async (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'services', id));
      await logAction('DELETE_SERVICE', 'service', id, `Deleted service ${id}`);
    } catch {}
  };

  const toggleServiceStatus = async (id: string) => {
    const srv = services.find(s => s.id === id);
    if (!srv) return;
    const newStatus = srv.status === 'active' ? 'inactive' : 'active';
    await updateService(id, { status: newStatus });
  };

  const updateSettings = async (updates: Partial<SystemSettings>) => {
    const updated = { ...settings, ...updates, updatedAt: new Date().toISOString() };
    setSettings(updated);
    try {
      await setDoc(doc(db, 'settings', 'general'), cleanForFirestore(updated), { merge: true });
      await logAction('UPDATE_SETTINGS', 'settings', 'general', 'Updated center settings');
    } catch (e) {
      console.warn('Error saving settings to Firestore:', e);
    }
  };

  // Seed realistic historical attendance dataset
  const seedRealisticData = async () => {
    if (!userProfile) return;
    setLoadingData(true);

    const namesMale = [
      'Mugisha Jean de Dieu', 'Habimana Emmanuel', 'Twahirwa Claude', 'Nshimiyimana Eric',
      'Uwiringiyimana Patrick', 'Bizimana Christian', 'Kwizera Theogene', 'Nsengiyumva David',
      'Murenzi Fabrice', 'Hakizimana Bosco', 'Kayiranga Samuel', 'Dusabimana Innocent',
      'Tuyishime Olivier', 'Manzi Kevin', 'Gashumba Alain', 'Mugabo Thierry'
    ];

    const namesFemale = [
      'Uwase Diane', 'Mukamana Sandrine', 'Ingabire Clarisse', 'Nirere Aline',
      'Mutesi Solange', 'Umutoni Jeanne', 'Mukandayisenga Chantal', 'Iradukunda Alice',
      'Kamanzi Marie Rose', 'Nyirahabimana Vestine', 'Gisele Uwera', 'Niyonsaba Peace',
      'Uwamahoro Esperance', 'Ishimwe Claudine', 'Kaneza Angelique', 'Uwingabire Nadine'
    ];

    const serviceWeights = [
      { id: 'srv-ict', weight: 26 },
      { id: 'srv-empowerment', weight: 20 },
      { id: 'srv-jobdesk', weight: 16 },
      { id: 'srv-library', weight: 14 },
      { id: 'srv-sports', weight: 12 },
      { id: 'srv-srh', weight: 10 },
      { id: 'srv-volunteering', weight: 8 },
      { id: 'srv-vct', weight: 6 },
      { id: 'srv-outreach', weight: 5 },
    ];

    const weightedServices: string[] = [];
    serviceWeights.forEach(sw => {
      for (let i = 0; i < sw.weight; i++) weightedServices.push(sw.id);
    });

    const generatedRecords: AttendanceRecord[] = [];
    const now = new Date();

    // Generate records across the past 120 days (approx 4 months for rich statistics)
    for (let dayOffset = 0; dayOffset < 120; dayOffset++) {
      const recordDate = new Date(now);
      recordDate.setDate(recordDate.getDate() - dayOffset);
      const dateStr = formatDateYYYYMMDD(recordDate);

      // Don't generate on some Sundays
      if (recordDate.getDay() === 0 && Math.random() > 0.3) continue;

      const visitsToday = Math.floor(Math.random() * 8) + 6; // 6 to 14 visits daily

      for (let v = 0; v < visitsToday; v++) {
        const isMale = Math.random() < 0.52;
        const nameList = isMale ? namesMale : namesFemale;
        const personName = nameList[Math.floor(Math.random() * nameList.length)];
        const sex: Sex = isMale ? 'Male' : 'Female';

        const sId = weightedServices[Math.floor(Math.random() * weightedServices.length)];
        const sObj = services.find(s => s.id === sId) || DEFAULT_SERVICES[0];

        const hour = Math.floor(Math.random() * 9) + 8; // 8am to 5pm
        const min = Math.floor(Math.random() * 60);
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

        const recId = `seed-${dateStr}-${v}-${Math.random().toString(36).substr(2, 4)}`;
        const districtId = userProfile.districtId || 'nyabihu';
        const districtName = userProfile.districtName || 'Nyabihu District';

        const rec: AttendanceRecord = {
          id: recId,
          districtId,
          districtName,
          adminId: userProfile.id,
          recordedBy: userProfile.fullName,
          personName,
          sex,
          serviceId: sObj.id,
          serviceNameSnapshot: sObj.name,
          attendanceDate: dateStr,
          attendanceTime: timeStr,
          createdAt: new Date(recordDate.getTime() + hour * 3600000).toISOString(),
          updatedAt: new Date(recordDate.getTime() + hour * 3600000).toISOString(),
        };

        generatedRecords.push(rec);
      }
    }

    setAllAttendance(generatedRecords);

    // Save batch to localStorage backup
    try {
      localStorage.setItem('nyabihu_attendance_backup', JSON.stringify(generatedRecords.slice(0, 1500)));
    } catch {}

    // Save sample records to firestore
    for (const r of generatedRecords.slice(0, 50)) {
      setDoc(doc(db, 'attendance', r.id), cleanForFirestore(r)).catch(() => {});
    }

    await logAction('SEED_DATA', 'system', 'attendance', `Seeded ${generatedRecords.length} records for reporting analysis`);
    setLoadingData(false);
  };

  return (
    <AppContext.Provider
      value={{
        districts,
        services,
        attendanceRecords,
        allUserProfiles,
        auditLogs,
        settings,
        loadingData,
        activeDistrictFilter,
        setActiveDistrictFilter,
        recordVisit,
        submitPublicVisitorAttendance,
        editAttendance,
        deleteAttendance,
        updateUserStatus,
        addDistrict,
        updateDistrict,
        deleteDistrict,
        deleteUser,
        createAdminUser,
        addService,
        updateService,
        deleteService,
        toggleServiceStatus,
        updateSettings,
        logAction,
        seedRealisticData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
