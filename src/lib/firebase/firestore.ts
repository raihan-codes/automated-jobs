import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { CandidateProfileData, MatchAnalysisResult, TailoredResumeContent, ApplicationStatus } from '@/types';

export interface UserJobMatchRecord {
  id: string;
  userId: string;
  jobPostingId: string;
  matchResult: MatchAnalysisResult;
  isStarred?: boolean;
  isDismissed?: boolean;
  updatedAt: string;
}

export interface UserApplicationRecord {
  id: string;
  userId: string;
  jobPostingId: string;
  tailoredResumeId?: string;
  status: ApplicationStatus;
  automationEngine: 'PLAYWRIGHT' | 'API' | 'MANUAL';
  formUrl?: string;
  fields: any[];
  hasSensitiveQuestions: boolean;
  requiresHumanInput: boolean;
  humanReviewNotes?: string;
  approvedAt?: string;
  submittedAt?: string;
  /**
   * External ATS confirmation record — persisted to Firestore.
   * Loaded back into StoredApplication on hydration.
   */
  submissionVerification?: {
    verified: boolean;
    verificationMethod: string | null;
    confirmationText: string | null;
    confirmationId: string | null;
    confirmationUrl: string | null;
    submittedAt: string | null;
    externalDomain: string | null;
    screenshotPath: string | null;
    failureReason?: string | null;
  };
  stage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserResumeRecord {
  id: string;
  userId: string;
  jobPostingId?: string;
  company?: string;
  targetRole?: string;
  content: TailoredResumeContent;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Initializes the entire Firestore document tree and collections for a user
 */
export async function initializeUserDatabaseInFirestore(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}): Promise<boolean> {
  if (!isFirebaseConfigured || !user?.uid) return false;
  try {
    const userId = user.uid;

    // 1. Root User Document (users/{userId})
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      uid: userId,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      role: 'CANDIDATE',
      databaseInitialized: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    // 2. Candidate Master Profile Document (users/{userId}/profile/master)
    const profileRef = doc(db, 'users', userId, 'profile', 'master');
    const existingProfile = await getDoc(profileRef);
    if (!existingProfile.exists()) {
      await setDoc(profileRef, {
        id: `prof_${userId}`,
        userId,
        fullName: user.displayName || '',
        email: user.email || '',
        skills: [],
        experiences: [],
        educations: [],
        desiredTitles: ['Software Engineer', 'Full Stack Developer'],
        preferredLocations: ['Remote', 'India', 'United States'],
        remotePreference: 'ANY',
        yearsOfExperience: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 3. User Preferences Document (users/{userId}/settings/preferences)
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const existingSettings = await getDoc(settingsRef);
    if (!existingSettings.exists()) {
      await setDoc(settingsRef, {
        userId,
        autoMatchOnIngest: true,
        notificationThreshold: 85,
        emailAlerts: false,
        theme: 'dark',
        createdAt: new Date().toISOString()
      });
    }

    // 4. Initial Welcome Notification (users/{userId}/notifications/notif_welcome)
    const notifRef = doc(db, 'users', userId, 'notifications', 'notif_welcome');
    const existingNotif = await getDoc(notifRef);
    if (!existingNotif.exists()) {
      await setDoc(notifRef, {
        id: 'notif_welcome',
        userId,
        type: 'WELCOME',
        title: 'Welcome to your private Career Vault!',
        message: 'Your isolated Cloud Firestore database is initialized. Upload your resume to calculate custom AI job matches.',
        actionUrl: '/upload',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    console.log(`[Firestore] ✓ Database collections successfully initialized for user: ${userId}`);
    return true;
  } catch (error) {
    console.warn('[Firestore] Error initializing user database collections:', error);
    return false;
  }
}

/**
 * Save candidate profile to Firestore under users/{userId}/profile/master
 */
export async function saveProfileToFirestore(userId: string, profile: CandidateProfileData): Promise<boolean> {
  if (!isFirebaseConfigured || !userId) return false;
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'master');
    await setDoc(profileRef, {
      ...profile,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firestore] Error saving profile:', error);
    return false;
  }
}

/**
 * Retrieve candidate profile from Firestore: users/{userId}/profile/master
 */
export async function getProfileFromFirestore(userId: string): Promise<CandidateProfileData | null> {
  if (!isFirebaseConfigured || !userId) return null;
  try {
    const profileRef = doc(db, 'users', userId, 'profile', 'master');
    const snapshot = await getDoc(profileRef);
    if (snapshot.exists()) {
      return snapshot.data() as CandidateProfileData;
    }
    return null;
  } catch (error) {
    console.warn('[Firestore] Error fetching profile:', error);
    return null;
  }
}

/**
 * Save user specific job match calculations to Firestore: users/{userId}/matches/{jobId}
 */
export async function saveUserMatchToFirestore(
  userId: string,
  jobPostingId: string,
  matchResult: MatchAnalysisResult,
  isStarred: boolean = false
): Promise<boolean> {
  if (!isFirebaseConfigured || !userId) return false;
  try {
    const matchRef = doc(db, 'users', userId, 'matches', jobPostingId);
    await setDoc(matchRef, {
      userId,
      jobPostingId,
      matchResult,
      isStarred,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firestore] Error saving match record:', error);
    return false;
  }
}

/**
 * Get all job match calculations for a specific user: users/{userId}/matches
 */
export async function getUserMatchesFromFirestore(userId: string): Promise<Record<string, UserJobMatchRecord>> {
  const matchesMap: Record<string, UserJobMatchRecord> = {};
  if (!isFirebaseConfigured || !userId) return matchesMap;

  try {
    const matchesCol = collection(db, 'users', userId, 'matches');
    const snapshot = await getDocs(matchesCol);
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as UserJobMatchRecord;
      matchesMap[data.jobPostingId || docSnap.id] = data;
    });
    return matchesMap;
  } catch (error) {
    console.warn('[Firestore] Error fetching user matches:', error);
    return matchesMap;
  }
}

/**
 * Save application state to Firestore: users/{userId}/applications/{appId}
 *
 * NOTE: submissionVerification is always persisted as part of the application
 * document. On load, if the field is missing (legacy records), a safe
 * unverified default is supplied by the GET route.
 */
export async function saveApplicationToFirestore(userId: string, application: any): Promise<boolean> {
  if (!isFirebaseConfigured || !userId || !application.id) return false;
  try {
    const appRef = doc(db, 'users', userId, 'applications', application.id);
    await setDoc(appRef, {
      ...application,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firestore] Error saving application:', error);
    return false;
  }
}

/**
 * Get all applications for a specific user: users/{userId}/applications
 */
export async function getUserApplicationsFromFirestore(userId: string): Promise<UserApplicationRecord[]> {
  if (!isFirebaseConfigured || !userId) return [];
  try {
    const appsCol = collection(db, 'users', userId, 'applications');
    const snapshot = await getDocs(appsCol);
    const results: UserApplicationRecord[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data() as UserApplicationRecord);
    });
    return results;
  } catch (error) {
    console.warn('[Firestore] Error fetching user applications:', error);
    return [];
  }
}

/**
 * Save tailored resume to Firestore: users/{userId}/resumes/{resumeId}
 */
export async function saveResumeToFirestore(userId: string, resume: any): Promise<boolean> {
  if (!isFirebaseConfigured || !userId || !resume.id) return false;
  try {
    const resRef = doc(db, 'users', userId, 'resumes', resume.id);
    await setDoc(resRef, {
      ...resume,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firestore] Error saving resume:', error);
    return false;
  }
}

/**
 * Get all resumes for a specific user: users/{userId}/resumes
 */
export async function getUserResumesFromFirestore(userId: string): Promise<UserResumeRecord[]> {
  if (!isFirebaseConfigured || !userId) return [];
  try {
    const resumesCol = collection(db, 'users', userId, 'resumes');
    const snapshot = await getDocs(resumesCol);
    const results: UserResumeRecord[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data() as UserResumeRecord);
    });
    return results;
  } catch (error) {
    console.warn('[Firestore] Error fetching user resumes:', error);
    return [];
  }
}

/**
 * Save notification to Firestore: users/{userId}/notifications/{notifId}
 */
export async function saveNotificationToFirestore(userId: string, notif: any): Promise<boolean> {
  if (!isFirebaseConfigured || !userId || !notif.id) return false;
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notif.id);
    await setDoc(notifRef, {
      ...notif,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firestore] Error saving notification:', error);
    return false;
  }
}

/**
 * Get all notifications for a specific user: users/{userId}/notifications
 */
export async function getUserNotificationsFromFirestore(userId: string): Promise<UserNotificationRecord[]> {
  if (!isFirebaseConfigured || !userId) return [];
  try {
    const notifsCol = collection(db, 'users', userId, 'notifications');
    const snapshot = await getDocs(notifsCol);
    const results: UserNotificationRecord[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data() as UserNotificationRecord);
    });
    return results;
  } catch (error) {
    console.warn('[Firestore] Error fetching user notifications:', error);
    return [];
  }
}
