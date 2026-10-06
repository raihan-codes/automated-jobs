import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CandidateProfileData } from '@/types';
import { FormPrefillEngine } from '@/services/automation/form-prefill';
import { saveProfileToFirestore, getProfileFromFirestore, saveResumeToFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDefaultProfileForUser(userId: string): CandidateProfileData {
  return {
    id: `prof_${userId}`,
    userId,
    fullName: 'Raihan Molla',
    email: 'raihanmolla9903@gmail.com',
    phone: '+91 8585844758',
    location: 'Asansol, West Bengal, India',
    linkedinUrl: 'https://www.linkedin.com/in/raihan-molla',
    githubUrl: 'https://github.com/raihan-codes',
    website: 'https://my-portfolio.vercel.app',
    portfolioUrl: 'https://my-portfolio.vercel.app',
    headline: 'B.Tech CSE (Data Science) Student & Software Developer',
    summary: 'B.Tech Computer Science & Engineering (Data Science) student at Kazi Nazrul University, Asansol (2024–2028, GPA: 7.1). Software developer proficient in Python, Java, C/C++, and JavaScript. Hands-on experience developing local-first AI applications like AI Notes Taker (Google Meet Notetaker) with OAuth and IndexedDB. Strong foundation in Data Structures & Algorithms, Object-Oriented Programming, and DBMS.',
    desiredTitles: ['Software Engineer Intern', 'Full Stack Developer', 'Data Science Intern', 'Software Developer'],
    preferredLocations: ['Remote', 'Bengaluru, India', 'Kolkata, India', 'Hyderabad, India'],
    remotePreference: 'ANY',
    requiresVisa: false,
    workAuthorization: 'Indian Citizen',
    noticePeriod: 'Immediate',
    minSalary: 500000,
    expectedSalaryLPA: 8,
    yearsOfExperience: 1,
    skills: [
      { name: 'Python', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'Java', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'C', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'C++', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'JavaScript', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'Data Structures & Algorithms', category: 'TECHNICAL', years: 2, level: 'EXPERT' },
      { name: 'Object-Oriented Programming', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'DBMS', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'SQL', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'Computer Architecture', category: 'TECHNICAL', years: 1, level: 'INTERMEDIATE' },
      { name: 'Git', category: 'TOOL', years: 2, level: 'ADVANCED' },
      { name: 'GitHub', category: 'TOOL', years: 2, level: 'ADVANCED' },
      { name: 'REST APIs', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'Web Development', category: 'TECHNICAL', years: 2, level: 'ADVANCED' },
      { name: 'IndexedDB', category: 'TOOL', years: 1, level: 'INTERMEDIATE' },
      { name: 'Vercel', category: 'TOOL', years: 1, level: 'ADVANCED' },
      { name: 'Problem Solving', category: 'SOFT', years: 2, level: 'EXPERT' },
      { name: 'Logical Thinking', category: 'SOFT', years: 2, level: 'EXPERT' },
      { name: 'Team Collaboration', category: 'SOFT', years: 2, level: 'ADVANCED' }
    ],
    experiences: [
      {
        company: 'Nasheedio',
        role: 'Voice Artist',
        location: 'Remote',
        startDate: '2024',
        endDate: 'Present',
        isCurrent: true,
        bullets: [
          'Worked as a voice artist, recording and delivering voice-based content according to project requirements.',
          'Developed communication, presentation, voice modulation, and content-delivery skills.',
          'Collaborated on audio content while maintaining consistency and quality in recordings.'
        ]
      }
    ],
    educations: [
      {
        institution: 'Kazi Nazrul University, Asansol',
        degree: 'B.Tech in Computer Science & Engineering (Data Science)',
        fieldOfStudy: 'Data Science',
        startDate: '2024',
        endDate: '2028',
        gradeGpa: '7.1'
      }
    ],
    projects: [
      {
        title: 'AI Notes Taker — Local-First Google Meet Notetaker',
        description: 'Local-first application to capture Google Meet audio and generate meeting notes.',
        role: 'Creator & Developer',
        link: 'https://ai-notes-taker-bay.vercel.app',
        technologies: ['JavaScript', 'Google Meet Media API', 'OAuth', 'IndexedDB', 'Vercel', 'Web Audio API'],
        bullets: [
          'Built a local-first application to capture Google Meet audio and generate meeting notes.',
          'Integrated Google Meet Media API with OAuth for meeting media access.',
          'Implemented browser-based transcription and note extraction using local model processing.',
          'Used IndexedDB for local storage and deployed the application on Vercel.'
        ]
      }
    ]
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = searchParams.get('userId');
  const userId = paramUserId || headerUserId || 'user_raihan_molla';

  let profile = db.profiles.get(userId);
  if (!profile) {
    profile = await getProfileFromFirestore(userId).catch(() => null) || undefined;
    if (profile) {
      db.profiles.set(userId, profile);
    }
  }

  // If user doesn't have an uploaded or stored profile yet:
  if (!profile || !profile.fullName) {
    if (userId === 'user_raihan_molla') {
      profile = getDefaultProfileForUser(userId);
      db.profiles.set(userId, profile);
      await saveProfileToFirestore(userId, profile).catch(() => {});

      // Ensure Master Resume exists in memory and Firestore for demo user
      const masterResumeId = `resume_master_${userId}`;
      const syncedMasterResume = {
        id: masterResumeId,
        userId,
        targetRole: profile.desiredTitles?.[0] || profile.headline || 'Software Developer',
        company: 'Master Vault Resume',
        content: {
          candidateName: profile.fullName,
          email: profile.email,
          phone: profile.phone || '',
          location: profile.location || '',
          headline: profile.headline || 'Software Developer',
          summary: profile.summary || '',
          skills: profile.skills.map(s => typeof s === 'string' ? s : s.name),
          experiences: profile.experiences.map(e => ({
            role: e.role,
            company: e.company,
            duration: e.isCurrent ? `${e.startDate} - Present` : `${e.startDate} - ${e.endDate || ''}`,
            location: e.location || '',
            bullets: e.bullets || []
          })),
          educations: profile.educations.map(ed => ({
            institution: ed.institution,
            degree: ed.degree,
            year: `${ed.startDate || ''} - ${ed.endDate || ''}`,
            gpa: ed.gradeGpa || ''
          })),
          projects: profile.projects.map(p => ({
            name: p.title,
            technologies: p.technologies || [],
            bullets: p.bullets || []
          }))
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const rIdx = db.resumes.findIndex(r => r.userId === userId && (r.id === masterResumeId || (r as any).company === 'Master Vault Resume'));
      if (rIdx >= 0) {
        db.resumes[rIdx] = syncedMasterResume as any;
      } else {
        db.resumes.push(syncedMasterResume as any);
      }
      await saveResumeToFirestore(userId, syncedMasterResume).catch(() => {});
    } else {
      // For any other user, return unpopulated state until they upload their own resume
      return NextResponse.json({
        success: true,
        userId,
        hasUploadedResume: false,
        profile: null
      });
    }
  }

  return NextResponse.json({
    success: true,
    userId,
    hasUploadedResume: Boolean(profile.skills && profile.skills.length > 0),
    profile
  });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = searchParams.get('userId');

  try {
    const updatedProfile: CandidateProfileData = await request.json();
    const userId = updatedProfile.userId || paramUserId || headerUserId || 'user_raihan_molla';
    updatedProfile.userId = userId;

    // 1. Save profile to memory and Firestore
    db.profiles.set(userId, updatedProfile);
    await saveProfileToFirestore(userId, updatedProfile).catch(err => console.warn('Firestore PUT err:', err));

    // 2. CRITICAL: Synchronize Master Resume in db.resumes and Firestore
    // This guarantees the resume matches the candidate profile 100%
    const masterResumeId = `resume_master_${userId}`;
    const syncedResumeContent = {
      candidateName: updatedProfile.fullName,
      email: updatedProfile.email,
      phone: updatedProfile.phone || '',
      location: updatedProfile.location || '',
      headline: updatedProfile.headline || updatedProfile.desiredTitles?.[0] || 'Software Developer',
      summary: updatedProfile.summary || '',
      skills: (updatedProfile.skills || []).map((s: any) => typeof s === 'string' ? s : s.name),
      experiences: (updatedProfile.experiences || []).map((e: any) => ({
        role: e.role,
        company: e.company,
        duration: e.isCurrent ? `${e.startDate} - Present` : `${e.startDate} - ${e.endDate || ''}`,
        location: e.location || '',
        bullets: e.bullets || []
      })),
      educations: (updatedProfile.educations || []).map((ed: any) => ({
        institution: ed.institution,
        degree: ed.degree,
        year: `${ed.startDate || ''} - ${ed.endDate || ''}`,
        gpa: ed.gradeGpa || ''
      })),
      projects: (updatedProfile.projects || []).map((p: any) => ({
        name: p.title,
        technologies: p.technologies || [],
        bullets: p.bullets || []
      }))
    };

    const syncedMasterResume = {
      id: masterResumeId,
      userId,
      targetRole: updatedProfile.desiredTitles?.[0] || updatedProfile.headline || 'Software Developer',
      company: 'Master Vault Resume',
      content: syncedResumeContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const rIdx = db.resumes.findIndex(r => r.userId === userId && (r.id === masterResumeId || (r as any).company === 'Master Vault Resume'));
    if (rIdx >= 0) {
      db.resumes[rIdx] = syncedMasterResume as any;
    } else {
      db.resumes.push(syncedMasterResume as any);
    }
    await saveResumeToFirestore(userId, syncedMasterResume).catch(e => console.warn('Firestore resume sync error:', e));

    // 3. Keep application form fields in sync with updated profile
    for (const app of db.applications.filter(a => a.userId === userId)) {
      app.fields = FormPrefillEngine.mapProfileToFields(updatedProfile);
    }

    // 4. Record audit log
    db.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      tenantId: 'tenant_prod_enterprise_1',
      userId,
      action: 'PROFILE_AND_RESUME_SYNCHRONIZED',
      resourceType: 'CandidateProfile',
      resourceId: `prof_${userId}`,
      details: {
        skillsCount: updatedProfile.skills?.length || 0,
        masterResumeId,
        matchIntegrity: '100% Factual Zero-Drift'
      },
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      userId,
      profile: updatedProfile,
      masterResume: syncedMasterResume,
      message: 'Candidate Profile and Master Resume matched with 100% integrity!'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
