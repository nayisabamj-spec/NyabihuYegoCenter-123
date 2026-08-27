import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
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
import { AppNotification, NotificationSettings, NotificationType, NotificationPriority } from '../types';

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notifyNewVisitors: true,
  notifyStaffAttendance: true,
  notifyAdminRequests: true,
  notifyReportsReady: true,
  notifySystemAlerts: true,
  notifyServiceUpdates: false,
  soundEnabled: true,
};

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearReadNotifications: () => Promise<void>;
  sendNotification: (data: {
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    recipientUserId?: string;
    relatedRecordId?: string;
    districtId?: string;
    districtName?: string;
    serviceName?: string;
    metadata?: Record<string, any>;
  }) => Promise<void>;
  pushPermission: NotificationPermission | 'unsupported';
  isPushSubscribed: boolean;
  requestPushPermission: () => Promise<boolean>;
  isOnline: boolean;
  isPwaInstalled: boolean;
  updateAvailable: boolean;
  reloadAppForUpdate: () => void;
  toasts: ToastItem[];
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isDirector, isApproved } = useAuth();

  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('nyabihu_notification_settings');
      return saved ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) } : DEFAULT_NOTIFICATION_SETTINGS;
    } catch {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  });

  // Online / Offline State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Push Permission State
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);

  // PWA State
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Toast Management
  const addToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update Settings
  const updateNotificationSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setNotificationSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('nyabihu_notification_settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Check Online/Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('Online', 'Internet connection restored.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('Offline Mode', 'You are currently offline. Local features remain available.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Standalone PWA detection
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  // Clean Service Worker state
  useEffect(() => {
    setUpdateAvailable(false);
    setWaitingWorker(null);
  }, []);

  const reloadAppForUpdate = () => {
    window.location.reload();
  };

  // Play audio chime
  const playChime = useCallback(() => {
    if (!notificationSettings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {}
  }, [notificationSettings.soundEnabled]);

  // Sync Notifications from Firestore in Real-Time for Approved Staff
  useEffect(() => {
    if (!userProfile || !isApproved) {
      setAllNotifications([]);
      setLoading(false);
      return;
    }

    const notifsRef = collection(db, 'notifications');
    // Fetch last 100 notifications ordered by createdAt desc
    const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AppNotification;
          fetched.push({ ...data, id: docSnap.id });
        });
        setAllNotifications(fetched);
        setLoading(false);
      },
      (error) => {
        console.warn('Notification snapshot note (fallback to local):', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userProfile, isApproved]);

  // Filter notifications relevant to current user
  const userNotifications = useMemo(() => {
    if (!userProfile) return [];

    return allNotifications.filter((n) => {
      // 1. Direct recipient check
      if (n.recipientUserId === userProfile.id) return true;
      if (n.recipientUserId === 'all_approved_admins') {
        // Director gets everything, District admins get their district or central alerts
        if (isDirector) return true;
        if (!n.districtId || n.districtId === 'nyabihu' || n.districtId === userProfile.districtId) return true;
      }
      if (n.recipientUserId === 'director_only') {
        return isDirector;
      }
      return false;
    });
  }, [allNotifications, userProfile, isDirector]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !n.isRead).length;
  }, [userNotifications]);

  // Send Notification (Async Helper)
  const sendNotification = useCallback(
    async (data: {
      type: NotificationType;
      title: string;
      message: string;
      priority?: NotificationPriority;
      recipientUserId?: string;
      relatedRecordId?: string;
      districtId?: string;
      districtName?: string;
      serviceName?: string;
      metadata?: Record<string, any>;
    }) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newNotif: AppNotification = {
        id,
        recipientUserId: data.recipientUserId || 'all_approved_admins',
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'normal',
        relatedRecordId: data.relatedRecordId,
        districtId: data.districtId || 'nyabihu',
        districtName: data.districtName || 'NYABIHU YEGO CENTER',
        serviceName: data.serviceName,
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: data.metadata,
      };

      // Optimistic local state
      setAllNotifications((prev) => [newNotif, ...prev]);

      // Trigger local toast and chime for currently logged in users
      addToast(data.title, data.message, data.priority === 'critical' ? 'warning' : 'info');
      playChime();

      // Show Native Browser Notification if permitted and window in background
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          if (document.hidden || !document.hasFocus()) {
            new Notification(data.title, {
              body: data.message,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: id,
            });
          }
        } catch {}
      }

      // Persist to Firestore asynchronously
      try {
        await setDoc(doc(db, 'notifications', id), newNotif);
      } catch (err) {
        console.warn('Firestore notification save warning:', err);
      }
    },
    [addToast, playChime]
  );

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );

    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, {
        isRead: true,
        readAt: new Date().toISOString(),
      });
    } catch {}
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const unreadIds = userNotifications.filter((n) => !n.isRead).map((n) => n.id);
    const readTimestamp = new Date().toISOString();

    setAllNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: true, readAt: readTimestamp } : n))
    );

    for (const id of unreadIds) {
      try {
        await updateDoc(doc(db, 'notifications', id), {
          isRead: true,
          readAt: readTimestamp,
        });
      } catch {}
    }
  }, [userNotifications]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch {}
  }, []);

  // Clear all read notifications
  const clearReadNotifications = useCallback(async () => {
    const readIds = userNotifications.filter((n) => n.isRead).map((n) => n.id);
    setAllNotifications((prev) => prev.filter((n) => !readIds.includes(n.id)));
    for (const id of readIds) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch {}
    }
  }, [userNotifications]);

  // Request Push Permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushPermission('unsupported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        setIsPushSubscribed(true);
        addToast('Notifications Enabled', 'You will receive updates for new visitors and important events.', 'success');
        playChime();

        // Save device subscription record in Firestore if logged in
        if (userProfile) {
          const deviceId = `sub-${userProfile.id}-${Date.now().toString(36)}`;
          const subRecord = {
            id: deviceId,
            userId: userProfile.id,
            userEmail: userProfile.email,
            deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'pushSubscriptions', deviceId), subRecord).catch(() => {});
        }
        return true;
      } else {
        setIsPushSubscribed(false);
        return false;
      }
    } catch (e) {
      console.warn('Push permission request error:', e);
      return false;
    }
  }, [userProfile, addToast, playChime]);

  const value = useMemo(
    () => ({
      notifications: userNotifications,
      unreadCount,
      loading,
      notificationSettings,
      updateNotificationSettings,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearReadNotifications,
      sendNotification,
      pushPermission,
      isPushSubscribed,
      requestPushPermission,
      isOnline,
      isPwaInstalled,
      updateAvailable,
      reloadAppForUpdate,
      toasts,
      addToast,
      removeToast,
    }),
    [
      userNotifications,
      unreadCount,
      loading,
      notificationSettings,
      updateNotificationSettings,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearReadNotifications,
      sendNotification,
      pushPermission,
      isPushSubscribed,
      requestPushPermission,
      isOnline,
      isPwaInstalled,
      updateAvailable,
      toasts,
      addToast,
      removeToast,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
