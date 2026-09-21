'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './config';
import { initializeUserDatabaseInFirestore } from './firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo?: boolean;
}

export type AuthModalTab = 'SIGNIN' | 'SIGNUP' | 'DEMO';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  isFirebaseLive: boolean;
  openAuthModal: (tab?: AuthModalTab) => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  loginAsDemoUser: (id: string, name: string, email: string, role?: string) => void;
  // Backward compatibility aliases
  openLoginModal?: () => void;
  closeLoginModal?: () => void;
  signOut?: () => Promise<void>;
  signInWithOAuth?: (provider?: any) => Promise<void>;
  refreshSession?: () => Promise<void>;
  oauthConfig?: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthModalOpen: false,
  authModalTab: 'SIGNIN',
  isFirebaseLive: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOutUser: async () => {},
  loginAsDemoUser: () => {},
  openLoginModal: () => {},
  closeLoginModal: () => {},
  signOut: async () => {},
  signInWithOAuth: async () => {},
  refreshSession: async () => {},
  oauthConfig: null
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('SIGNIN');

  useEffect(() => {
    // Check localStorage for saved session
    const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('autoapply_auth_user') : null;
    let initialSavedUser: AppUser | null = null;
    if (savedUserStr) {
      try {
        initialSavedUser = JSON.parse(savedUserStr);
      } catch (e) {
        initialSavedUser = null;
      }
    }

    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const mapped: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            photoURL: fbUser.photoURL,
            isDemo: false
          };
          setUser(mapped);
          localStorage.setItem('autoapply_auth_user', JSON.stringify(mapped));
          initializeUserDatabaseInFirestore(mapped).catch(() => {});
        } else {
          // If no active Firebase session, check if a demo user was stored
          if (initialSavedUser && initialSavedUser.isDemo) {
            setUser(initialSavedUser);
          } else {
            setUser(null);
            localStorage.removeItem('autoapply_auth_user');
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      if (initialSavedUser) {
        setUser(initialSavedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    }
  }, []);

  const openAuthModal = (tab: AuthModalTab = 'SIGNIN') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signInWithGoogle = async () => {
    try {
      if (isFirebaseConfigured) {
        const result = await signInWithPopup(auth, googleProvider);
        const mapped: AppUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          isDemo: false
        };
        setUser(mapped);
        localStorage.setItem('autoapply_auth_user', JSON.stringify(mapped));
        await initializeUserDatabaseInFirestore(mapped).catch(() => {});
        setIsAuthModalOpen(false);
      } else {
        const mockGoogleUser: AppUser = {
          uid: `google_user_${Date.now().toString(36)}`,
          email: 'google.engineer@gmail.com',
          displayName: 'Google Verified Candidate',
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          isDemo: true
        };
        setUser(mockGoogleUser);
        localStorage.setItem('autoapply_auth_user', JSON.stringify(mockGoogleUser));
        setIsAuthModalOpen(false);
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      if (isFirebaseConfigured) {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        const mapped: AppUser = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || email.split('@')[0],
          photoURL: res.user.photoURL,
          isDemo: false
        };
        setUser(mapped);
        localStorage.setItem('autoapply_auth_user', JSON.stringify(mapped));
        await initializeUserDatabaseInFirestore(mapped).catch(() => {});
        setIsAuthModalOpen(false);
      } else {
        const customUser: AppUser = {
          uid: `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email,
          displayName: email.split('@')[0].toUpperCase(),
          photoURL: null,
          isDemo: true
        };
        setUser(customUser);
        localStorage.setItem('autoapply_auth_user', JSON.stringify(customUser));
        setIsAuthModalOpen(false);
      }
    } catch (error: any) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      if (isFirebaseConfigured) {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        if (name) {
          await updateProfile(res.user, { displayName: name });
        }
        const mapped: AppUser = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: name || email.split('@')[0],
          photoURL: res.user.photoURL,
          isDemo: false
        };
        setUser(mapped);
        localStorage.setItem('autoapply_auth_user', JSON.stringify(mapped));
        await initializeUserDatabaseInFirestore(mapped).catch(() => {});
        setIsAuthModalOpen(false);
      } else {
        const newUser: AppUser = {
          uid: `user_${Date.now().toString(36)}`,
          email,
          displayName: name || email.split('@')[0],
          photoURL: null,
          isDemo: true
        };
        setUser(newUser);
        localStorage.setItem('autoapply_auth_user', JSON.stringify(newUser));
        setIsAuthModalOpen(false);
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      if (isFirebaseConfigured) {
        await fbSignOut(auth);
      }
      setUser(null);
      localStorage.removeItem('autoapply_auth_user');
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  };

  const loginAsDemoUser = (id: string, name: string, email: string) => {
    const demoUser: AppUser = {
      uid: id,
      displayName: name,
      email: email,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      isDemo: true
    };
    setUser(demoUser);
    localStorage.setItem('autoapply_auth_user', JSON.stringify(demoUser));
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authModalTab,
        isFirebaseLive: isFirebaseConfigured,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        loginAsDemoUser,
        openLoginModal: () => openAuthModal('SIGNIN'),
        closeLoginModal: closeAuthModal,
        signOut: signOutUser,
        signInWithOAuth: async () => signInWithGoogle(),
        refreshSession: async () => {},
        oauthConfig: {
          development: true,
          demo: { isConfigured: true, label: 'Demo Sandbox' }
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
