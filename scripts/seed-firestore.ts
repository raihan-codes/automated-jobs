// One-click Firestore Initializer & Seeder for AutoApply AI
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDSK7e6oHRDxbwUl2ji-7TdKGBh90NaW-w',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'automated-jobs-3bb32.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'automated-jobs-3bb32',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'automated-jobs-3bb32.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '592787428837',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:592787428837:web:52619d867b3dc9ca56cb0c'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const CANDIDATES = [
  {
    userId: 'user_raihan_molla',
    name: 'Raihan Molla',
    email: 'raihanmolla9903@gmail.com',
    target: 'Fresher / Internship (₹6 - 12 LPA)',
    role: 'Software Developer & B.Tech CSE (Data Science) Student',
    skills: ['Python', 'Java', 'C', 'C++', 'JavaScript', 'Data Structures & Algorithms', 'DBMS', 'SQL', 'Git', 'REST APIs', 'Web Development', 'IndexedDB', 'Vercel'],
    location: 'Asansol, West Bengal, India'
  },
  {
    userId: 'user_rohan_sharma',
    name: 'Rohan Sharma',
    email: 'rohan.sharma@example.com',
    target: 'Full-Time (₹34 LPA)',
    role: 'SDE-2 Payments & Go Backend',
    skills: ['Go', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 'System Design'],
    location: 'Bengaluru, Karnataka, India'
  },
  {
    userId: 'user_ananya_verma',
    name: 'Ananya Verma',
    email: 'ananya.verma@example.com',
    target: 'Internship (₹18 LPA PPO)',
    role: 'SDE Intern',
    skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'Git'],
    location: 'Hyderabad, Telangana, India'
  }
];

async function seedUserCollections() {
  console.log('🚀 Initializing Firestore collections for AutoApply AI...');
  console.log(`📌 Project ID: ${firebaseConfig.projectId}\n`);

  for (const c of CANDIDATES) {
    console.log(`➡️  Creating collections for candidate: ${c.name} (${c.userId})...`);

    // 1. Root user document
    await setDoc(doc(db, 'users', c.userId), {
      uid: c.userId,
      email: c.email,
      displayName: c.name,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${c.userId}`,
      role: 'CANDIDATE',
      databaseInitialized: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Candidate Master Profile collection (users/{userId}/profile/master)
    await setDoc(doc(db, 'users', c.userId, 'profile', 'master'), {
      id: `prof_${c.userId}`,
      userId: c.userId,
      fullName: c.name,
      email: c.email,
      location: c.location,
      desiredTitles: [c.role, 'Software Engineer'],
      preferredLocations: ['Remote', 'India', 'United States'],
      remotePreference: 'ANY',
      requiresVisa: false,
      yearsOfExperience: 3,
      skills: c.skills.map(s => ({ name: s, level: 'ADVANCED', category: 'TECHNICAL' })),
      experiences: [
        {
          company: 'TechCorp Solutions',
          role: c.role,
          startDate: '2022-01',
          endDate: 'Present',
          isCurrent: true,
          location: c.location,
          bullets: [
            'Architected microservices handling high-throughput traffic with sub-50ms latency.',
            'Engineered modern responsive web applications using React, Next.js, and TypeScript.'
          ]
        }
      ],
      educations: [
        {
          institution: 'National Institute of Technology',
          degree: 'B.Tech in Computer Science',
          startYear: '2017',
          endYear: '2021'
        }
      ],
      projects: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 3. User Preferences collection (users/{userId}/settings/preferences)
    await setDoc(doc(db, 'users', c.userId, 'settings', 'preferences'), {
      userId: c.userId,
      autoMatchOnIngest: true,
      notificationThreshold: 85,
      emailAlerts: false,
      theme: 'dark',
      createdAt: new Date().toISOString()
    }, { merge: true });

    // 4. Initial Welcome Notification (users/{userId}/notifications/notif_welcome)
    await setDoc(doc(db, 'users', c.userId, 'notifications', 'notif_welcome'), {
      id: 'notif_welcome',
      userId: c.userId,
      type: 'WELCOME',
      title: 'Welcome to your isolated Career Vault!',
      message: 'Your Cloud Firestore database collections are active and ready.',
      actionUrl: '/upload',
      isRead: false,
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log(`   ✓ users/${c.userId}`);
    console.log(`   ✓ users/${c.userId}/profile/master`);
    console.log(`   ✓ users/${c.userId}/settings/preferences`);
    console.log(`   ✓ users/${c.userId}/notifications/notif_welcome`);
  }

  console.log('\n🎉 Successfully initialized all Firestore user collections!');
}

seedUserCollections()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  });
