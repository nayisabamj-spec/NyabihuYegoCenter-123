import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
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
import { db } from '../firebase/config';
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

interface AppContextType {
  districts: District[];
  services: ServiceItem[];
  attendanceRecords: AttendanceRecord[];
  allUserProfiles: UserProfile[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  loadingData: boolean;
  activeDistrictFilter: string; // 'all' or specific districtId (for Director)
  setActiveDistrictFilter: (dId: string) => void;
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

  const [districts, setDistricts] = useState<District[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allUserProfiles, setAllUserProfiles] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Director district filter: 'all' or specific districtId
  const [activeDistrictFilter, setActiveDistrictFilter] = useState<string>('all');

  // Load or sync Districts & Services & Settings
  useEffect(() => {
    let isMounted = true;

    const initializeBaseData = async () => {
      try {
        // 1. Districts
        const districtsRef = collection(db, 'districts');
        const dSnap = await getDocs(districtsRef).catch(() => null);

        let initialDistricts: District[] = [];
        if (dSnap && !dSnap.empty) {
          initialDistricts = dSnap.docs.map(doc => doc.data() as District);
        } else {
          // Seed defaults
          initialDistricts = DEFAULT_DISTRICTS.map(d => ({
            ...d,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          // Try to write to firestore
          for (const dist of initialDistricts) {
            setDoc(doc(db, 'districts', dist.id), dist).catch(() => {});
          }
        }
        if (isMounted) setDistricts(initialDistricts);

        // 2. Services
        const servicesRef = collection(db, 'services');
        const sSnap = await getDocs(servicesRef).catch(() => null);

        let initialServices: ServiceItem[] = [];
        if (sSnap && !sSnap.empty) {
          initialServices = sSnap.docs.map(doc => doc.data() as ServiceItem);
          initialServices.sort((a, b) => (a.order || 0) - (b.order || 0));
        } else {
          // Seed defaults
          initialServices = DEFAULT_SERVICES.map(s => ({
            ...s,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          for (const srv of initialServices) {
            setDoc(doc(db, 'services', srv.id), srv).catch(() => {});
          }
        }
        if (isMounted) setServices(initialServices);

        // 3. Settings
        const settingsDoc = await doc(db, 'settings', 'general');
        // fallback
        if (isMounted) setSettings(DEFAULT_SETTINGS);
      } catch (err) {
        console.warn('Fallback initializing base data locally:', err);
        if (isMounted) {
          setDistricts(DEFAULT_DISTRICTS.map(d => ({ ...d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })));
          setServices(DEFAULT_SERVICES.map(s => ({ ...s, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })));
        }
      }
    };

    initializeBaseData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to Attendance in real-time or from Firestore
  useEffect(() => {
    if (!userProfile || userProfile.status !== 'approved') {
      setAllAttendance([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    let unsubAttendance = () => {};
    let unsubUsers = () => {};
    let unsubLogs = () => {};

    try {
      // DATA ISOLATION ENFORCEMENT:
      // If director: fetch all attendance
      // If district admin: STRICTLY query where districtId == userProfile.districtId
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = isDirector
        ? query(attendanceRef, orderBy('attendanceDate', 'desc'), limit(1500))
        : query(attendanceRef, where('districtId', '==', userProfile.districtId), limit(1500));

      unsubAttendance = onSnapshot(
        attendanceQuery,
        (snapshot) => {
          const records: AttendanceRecord[] = [];
          snapshot.forEach((d) => {
            records.push(d.data() as AttendanceRecord);
          });
          // Sort by date & time desc
          records.sort((a, b) => {
            const dtA = `${a.attendanceDate} ${a.attendanceTime}`;
            const dtB = `${b.attendanceDate} ${b.attendanceTime}`;
            return dtB.localeCompare(dtA);
          });
          setAllAttendance(records);
          setLoadingData(false);
        },
        (error) => {
          console.warn('Firestore attendance snapshot error or offline, fallback to local store:', error);
          // Check local backup
          const localSaved = localStorage.getItem('nyabihu_attendance_backup');
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved) as AttendanceRecord[];
              const filtered = isDirector
                ? parsed
                : parsed.filter(r => r.districtId === userProfile.districtId);
              setAllAttendance(filtered);
            } catch {}
          }
          setLoadingData(false);
        }
      );

      // If director: listen to all users
      if (isDirector) {
        const usersRef = collection(db, 'users');
        unsubUsers = onSnapshot(usersRef, (snapshot) => {
          const users: UserProfile[] = [];
          snapshot.forEach((doc) => {
            users.push(doc.data() as UserProfile);
          });
          setAllUserProfiles(users);
        }, () => {});

        const logsRef = collection(db, 'auditLogs');
        const logsQuery = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
        unsubLogs = onSnapshot(logsQuery, (snapshot) => {
          const logs: AuditLog[] = [];
          snapshot.forEach(d => logs.push(d.data() as AuditLog));
          setAuditLogs(logs);
        }, () => {});
      }
    } catch (e) {
      console.warn('Error setting up firestore listeners:', e);
      setLoadingData(false);
    }

    return () => {
      unsubAttendance();
      unsubUsers();
      unsubLogs();
    };
  }, [userProfile?.id, userProfile?.districtId, isDirector]);

  // Compute filtered attendance records according to data isolation & active filter
  const attendanceRecords = useMemo(() => {
    if (!userProfile) return [];
    
    // Strict isolation: if not director, ONLY ever return their own district
    if (!isDirector) {
      return allAttendance.filter(r => r.districtId === userProfile.districtId);
    }

    // If director: apply active district filter if selected
    if (activeDistrictFilter !== 'all') {
      return allAttendance.filter(r => r.districtId === activeDistrictFilter);
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
      await setDoc(doc(db, 'auditLogs', logId), log);
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
      districtId: userProfile.districtId || 'nyabihu',
      districtName: data.district || userProfile.districtName || 'NYABIHU',
      adminId: userProfile.id,
      recordedBy: userProfile.fullName,
      personName: data.personName.trim(),
      sex: data.sex,
      serviceId: data.serviceId,
      serviceNameSnapshot: serviceName,
      attendanceDate: currentDate,
      attendanceTime: currentTime,
      sector: data.sector?.trim(),
      cell: data.cell?.trim(),
      village: data.village?.trim(),
      phoneNumber: data.phoneNumber?.trim(),
      email: data.email?.trim(),
      nationalId: data.nationalId?.trim(),
      notes: data.notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic state update
    setAllAttendance(prev => [newRecord, ...prev]);

    // Save to local backup
    try {
      const existingBackup = JSON.parse(localStorage.getItem('nyabihu_attendance_backup') || '[]');
      localStorage.setItem('nyabihu_attendance_backup', JSON.stringify([newRecord, ...existingBackup].slice(0, 1500)));
    } catch {}

    // Firestore persistence
    try {
      await setDoc(doc(db, 'attendance', recordId), newRecord);
      await logAction('RECORD_ATTENDANCE', 'attendance', recordId, `Visit recorded for ${newRecord.personName} (${newRecord.serviceNameSnapshot})`);
      
      // Asynchronously trigger notification for other admins/director (non-blocking)
      const notifId = `notif-staff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setDoc(doc(db, 'notifications', notifId), {
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
      }).catch(() => {});

      return { success: true, id: recordId };
    } catch (err: any) {
      console.warn('Firestore write failed, saved in local store:', err);
      return { success: true, id: recordId };
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
      sector: data.sector?.trim(),
      cell: data.cell?.trim(),
      village: data.village?.trim(),
      phoneNumber: data.phoneNumber?.trim(),
      email: data.email?.trim(),
      nationalId: data.nationalId?.trim(),
      isSelfCheckIn: true,
      notes: data.notes?.trim() || 'Visitor Public Check-In',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic state update
    setAllAttendance(prev => [newRecord, ...prev]);

    // Save to local backup
    try {
      const existingBackup = JSON.parse(localStorage.getItem('nyabihu_attendance_backup') || '[]');
      localStorage.setItem('nyabihu_attendance_backup', JSON.stringify([newRecord, ...existingBackup].slice(0, 1500)));
    } catch {}

    // Firestore persistence
    try {
      await setDoc(doc(db, 'attendance', recordId), newRecord);

      // Non-blocking notification emission for authorized admins (never delays visitor success)
      const notifId = `notif-kiosk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setDoc(doc(db, 'notifications', notifId), {
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
      }).catch(() => {});

      return { success: true, id: recordId };
    } catch (err: any) {
      console.warn('Firestore write failed, saved in local store:', err);
      return { success: true, id: recordId };
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

    const updatedRecord: AttendanceRecord = {
      ...existing,
      ...updates,
      serviceNameSnapshot: updatedSnapshot,
      updatedAt: new Date().toISOString(),
    };

    setAllAttendance(prev => prev.map(r => (r.id === id ? updatedRecord : r)));

    try {
      await updateDoc(doc(db, 'attendance', id), {
        ...updates,
        serviceNameSnapshot: updatedSnapshot,
        updatedAt: new Date().toISOString(),
      });
      await logAction('EDIT_ATTENDANCE', 'attendance', id, `Updated record for ${updatedRecord.personName}`);
      return { success: true };
    } catch (err: any) {
      return { success: true };
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

    setAllAttendance(prev => prev.filter(r => r.id !== id));

    try {
      await deleteDoc(doc(db, 'attendance', id));
      await logAction('DELETE_ATTENDANCE', 'attendance', id, `Deleted record for ${existing.personName} (${existing.serviceNameSnapshot})`);
      return { success: true };
    } catch {
      return { success: true };
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

    let targetDistrictName = undefined;
    if (assignedDistrictId) {
      const dObj = districts.find(d => d.id === assignedDistrictId);
      if (dObj) targetDistrictName = dObj.name;
    }

    const updates: Partial<UserProfile> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (assignedDistrictId) updates.districtId = assignedDistrictId;
    if (targetDistrictName) updates.districtName = targetDistrictName;
    if (role) updates.role = role;

    setAllUserProfiles(prev =>
      prev.map(u => (u.id === targetUserId ? { ...u, ...updates } : u))
    );

    try {
      await updateDoc(doc(db, 'users', targetUserId), updates);
      await logAction(
        `ADMIN_${status.toUpperCase()}`,
        'user',
        targetUserId,
        `Status updated to ${status}`
      );

      // Trigger targeted notification for user & director
      const notifId = `notif-user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setDoc(doc(db, 'notifications', notifId), {
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
      }).catch(() => {});
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
    setDistricts(prev => [...prev, newDistrict]);
    try {
      await setDoc(doc(db, 'districts', id), newDistrict);
      await logAction('CREATE_DISTRICT', 'district', id, `Created district: ${name}`);
    } catch {}
  };

  const updateDistrict = async (id: string, updates: Partial<District>) => {
    setDistricts(prev => prev.map(d => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)));
    try {
      await updateDoc(doc(db, 'districts', id), { ...updates, updatedAt: new Date().toISOString() });
      await logAction('UPDATE_DISTRICT', 'district', id, `Updated district ${id}`);
    } catch {}
  };

  const deleteDistrict = async (id: string) => {
    setDistricts(prev => prev.filter(d => d.id !== id));
    try {
      await deleteDoc(doc(db, 'districts', id));
      await logAction('DELETE_DISTRICT', 'district', id, `Deleted district ${id}`);
    } catch {}
  };

  const deleteUser = async (userId: string) => {
    if (!isDirector) return;
    setAllUserProfiles(prev => prev.filter(u => u.id !== userId));
    try {
      await deleteDoc(doc(db, 'users', userId));
      await logAction('DELETE_USER', 'user', userId, `Deleted user profile ${userId}`);
    } catch {}
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
      await setDoc(doc(db, 'services', id), newService);
      await logAction('CREATE_SERVICE', 'service', id, `Added service: ${name}`);
    } catch {}
  };

  const updateService = async (id: string, updates: Partial<ServiceItem>) => {
    setServices(prev => prev.map(s => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)));
    try {
      await updateDoc(doc(db, 'services', id), { ...updates, updatedAt: new Date().toISOString() });
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
      await setDoc(doc(db, 'settings', 'general'), updated);
      await logAction('UPDATE_SETTINGS', 'settings', 'general', 'Updated center settings');
    } catch {}
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
    for (const r of generatedRecords.slice(0, 30)) {
      setDoc(doc(db, 'attendance', r.id), r).catch(() => {});
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
