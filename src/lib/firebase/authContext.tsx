'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from './client';
import { UserProfile, UserStats, ThemeMode, ChatMode } from '@/types';
import {
  calculateLevelFromXP,
  playSoundEffect,
  triggerConfetti,
  updateStreak,
} from '../gamification';
import { getTodayDateString } from '../sm2';

interface AuthContextType {
  user: FirebaseUser | { uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null;
  profile: UserProfile | null;
  stats: UserStats | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  awardXP: (amount: number, reason?: string) => Promise<void>;
  getIdToken: () => Promise<string>;
  levelUpData: { newLevel: number; title: string } | null;
  dismissLevelUp: () => void;
}

const defaultProfile: UserProfile = {
  displayName: 'Petualang',
  photoURL: '',
  email: '',
  language: 'id',
  genLanguage: 'id',
  sttLanguage: 'id-ID',
  theme: 'dark',
  defaultChatMode: 'flexible',
  soundEffects: true,
  reducedAnimations: false,
  createdAt: Date.now(),
};

const defaultStats: UserStats = {
  xp: 0,
  level: 1,
  streakCurrent: 1,
  streakLongest: 1,
  lastActiveDate: getTodayDateString(),
  cardsReviewed: 0,
  perfectQuizzes: 0,
  badges: [],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; title: string } | null>(null);

  // Apply theme class to <html>
  useEffect(() => {
    if (!profile) return;
    const root = document.documentElement;
    if (profile.theme === 'dark') {
      root.classList.add('dark');
    } else if (profile.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [profile?.theme]);

  // Load user profile & stats from Firestore or localStorage
  const loadUserData = async (uid: string, initialUser?: any) => {
    if (isFirebaseConfigured && db) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);

        let userProf = defaultProfile;
        let userStats = defaultStats;

        if (snap.exists()) {
          const data = snap.data();
          userProf = { ...defaultProfile, ...data.profile };
          userStats = { ...defaultStats, ...data.stats };
        } else {
          userProf = {
            ...defaultProfile,
            displayName: initialUser?.displayName || 'Pelajar Quest',
            email: initialUser?.email || '',
            photoURL: initialUser?.photoURL || '',
          };
          await setDoc(userDocRef, {
            profile: userProf,
            stats: userStats,
          });
        }

        // Check streak on login
        const streakInfo = updateStreak(userStats);
        if (streakInfo.isFirstActivityToday) {
          userStats = {
            ...userStats,
            streakCurrent: streakInfo.streakCurrent,
            streakLongest: streakInfo.streakLongest,
            lastActiveDate: getTodayDateString(),
            xp: userStats.xp + 5, // Daily streak maintain bonus
          };
          const { level } = calculateLevelFromXP(userStats.xp);
          userStats.level = level;
          await updateDoc(userDocRef, { stats: userStats });
        }

        setProfile(userProf);
        setStats(userStats);
      } catch (err) {
        console.error('Error fetching user data:', err);
        fallbackLocalData(uid, initialUser);
      }
    } else {
      fallbackLocalData(uid, initialUser);
    }
  };

  const fallbackLocalData = (uid: string, initialUser?: any) => {
    try {
      const savedProf = localStorage.getItem(`bq_profile_${uid}`);
      const savedStats = localStorage.getItem(`bq_stats_${uid}`);

      const userProf = savedProf ? JSON.parse(savedProf) : {
        ...defaultProfile,
        displayName: initialUser?.displayName || 'Petualang Belajar',
        email: initialUser?.email || 'user@belajarquest.local',
      };
      let userStats: UserStats = savedStats ? JSON.parse(savedStats) : defaultStats;

      const streakInfo = updateStreak(userStats);
      if (streakInfo.isFirstActivityToday) {
        userStats = {
          ...userStats,
          streakCurrent: streakInfo.streakCurrent,
          streakLongest: streakInfo.streakLongest,
          lastActiveDate: getTodayDateString(),
          xp: userStats.xp + 5,
        };
        const { level } = calculateLevelFromXP(userStats.xp);
        userStats.level = level;
      }

      setProfile(userProf);
      setStats(userStats);
      localStorage.setItem(`bq_profile_${uid}`, JSON.stringify(userProf));
      localStorage.setItem(`bq_stats_${uid}`, JSON.stringify(userStats));
    } catch (e) {
      setProfile(defaultProfile);
      setStats(defaultStats);
    }
  };

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          setUser(fbUser);
          await loadUserData(fbUser.uid, fbUser);
        } else {
          // Check local guest session
          const guestSession = localStorage.getItem('bq_guest_user');
          if (guestSession) {
            const parsed = JSON.parse(guestSession);
            setUser(parsed);
            loadUserData(parsed.uid, parsed);
          } else {
            setUser(null);
            setProfile(null);
            setStats(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const guestSession = typeof window !== 'undefined' ? localStorage.getItem('bq_guest_user') : null;
      if (guestSession) {
        const parsed = JSON.parse(guestSession);
        setUser(parsed);
        loadUserData(parsed.uid, parsed);
      } else {
        // Auto initialize a default user session for instant preview
        const demoUser = {
          uid: 'demo_user_1',
          displayName: 'Nayoga (Petualang)',
          email: 'nayoga@belajarquest.ai',
          photoURL: '',
        };
        setUser(demoUser);
        loadUserData(demoUser.uid, demoUser);
      }
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    if (isFirebaseConfigured && auth && googleProvider) {
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
      await loadUserData(res.user.uid, res.user);
    } else {
      signInAsGuest();
    }
  };

  const signInAsGuest = () => {
    const guestUser = {
      uid: 'guest_user_' + Math.random().toString(36).substring(2, 8),
      displayName: 'Petualang Tamu',
      email: 'guest@belajarquest.local',
      photoURL: '',
    };
    localStorage.setItem('bq_guest_user', JSON.stringify(guestUser));
    setUser(guestUser);
    loadUserData(guestUser.uid, guestUser);
  };

  const signOut = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem('bq_guest_user');
    setUser(null);
    setProfile(null);
    setStats(null);
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const newProf = { ...profile, ...updates };
    setProfile(newProf);

    if (isFirebaseConfigured && db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { profile: newProf });
      } catch (err) {
        console.error('Error updating profile in firestore:', err);
      }
    }
    localStorage.setItem(`bq_profile_${user.uid}`, JSON.stringify(newProf));
  };

  const awardXP = async (amount: number, reason?: string) => {
    if (!user || !stats) return;

    const oldLevel = stats.level;
    const newXp = stats.xp + amount;
    const { level: calculatedNewLevel, title } = calculateLevelFromXP(newXp);

    const isLevelUp = calculatedNewLevel > oldLevel;

    // Check badges
    const newBadges = [...stats.badges];
    if (calculatedNewLevel >= 10 && !newBadges.includes('level_10')) {
      newBadges.push('level_10');
    }

    const updatedStats: UserStats = {
      ...stats,
      xp: newXp,
      level: calculatedNewLevel,
      badges: newBadges,
      lastActiveDate: getTodayDateString(),
    };

    setStats(updatedStats);

    if (isFirebaseConfigured && db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { stats: updatedStats });
      } catch (err) {
        console.error('Error updating stats in Firestore:', err);
      }
    }
    localStorage.setItem(`bq_stats_${user.uid}`, JSON.stringify(updatedStats));

    // Sound & celebratory feedbacks
    if (isLevelUp) {
      playSoundEffect('levelup', profile?.soundEffects);
      triggerConfetti(profile?.reducedAnimations);
      setLevelUpData({ newLevel: calculatedNewLevel, title });
    } else {
      playSoundEffect('xp', profile?.soundEffects);
    }
  };

  const getIdToken = async (): Promise<string> => {
    if (user && 'getIdToken' in user && typeof user.getIdToken === 'function') {
      try {
        return await user.getIdToken();
      } catch (e) {
        return user.uid || 'mock_user';
      }
    }
    return user?.uid || 'mock_user';
  };

  const dismissLevelUp = () => setLevelUpData(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        stats,
        loading,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        updateProfileData,
        awardXP,
        getIdToken,
        levelUpData,
        dismissLevelUp,
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
