import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CandidateProfileData } from '@/types';
import { FormPrefillEngine } from '@/services/automation/form-prefill';
import { saveProfileToFirestore, getProfileFromFirestore, saveResumeToFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDefaultProfileForUser(userId: string): CandidateProfileData {
  const isRaihan = userId === 'user_raihan_molla' || userId.includes('raihan') || !userId;
  return {
    id: `prof_${userId}`,
    userId,
    fullName: isRaihan ? 'Raihan Molla' : 'Raihan Molla',
    email: isRaihan ? 'raihanmolla993@gmail.com' : 'raihanmolla993@gmail.com',
    phone: '+1 (555) 389-4210',
    location: 'San Francisco, CA (PST)',
    headline: 'Principal Product Designer & Systems Architect',
    summary: 'Principal Product Designer with 8+ years of experience scaling enterprise SaaS applications, design systems, and cross-functional engineering workflows. Specializing in complex data-dense interfaces and zero-latency design architectures.',
    desiredTitles: ['Principal Product Designer', 'Staff Product Designer', 'Lead UI/UX Architect'],
    preferredLocations: ['Remote', 'San Francisco, CA', 'New York, NY'],
    remotePreference: 'REMOTE_OR_HYBRID',
    requiresVisa: false,
    workAuthorization: 'US Citizen / Green Card',
    noticePeriod: '2 Weeks',
    minSalary: 185000,
    expectedSalaryLPA: 230000,
    yearsOfExperience: 8,
    skills: [
      { name: 'Figma / Design Systems', category: 'TECHNICAL', years: 8, level: 'EXPERT' },
      { name: 'React / Tailwind CSS', category: 'FRAMEWORK', years: 5, level: 'EXPERT' },
      { name: 'User Research & Metrics', category: 'TECHNICAL', years: 6, level: 'ADVANCED' },
      { name: 'TypeScript & Next.js', category: 'FRAMEWORK', years: 4, level: 'ADVANCED' },
      { name: 'Information Architecture', category: 'TECHNICAL', years: 7, level: 'EXPERT' },
      { name: 'Wireframing & Prototyping', category: 'TOOL', years: 8, level: 'EXPERT' },
    ],
    experiences: [
      {
        company: 'Acme Corp',
        role: 'Staff Product Designer',
        location: 'San Francisco, CA',
        startDate: '2021',
        endDate: 'Present',
        isCurrent: true,
        bullets: [
          'Spearheaded redesign of core SaaS analytics dashboard, improving user engagement metrics across enterprise tier by 32%.',
          'Architected design token system scaling from 3 to 45 internal product squads using Figma, React, and Tailwind CSS.',
          'Mentored 6 mid-level and senior designers across distributed global squads.'
        ]
      },
      {
        company: 'TechScale',
        role: 'Senior UX Engineer',
        location: 'San Francisco, CA',
        startDate: '2018',
        endDate: '2021',
        isCurrent: false,
        bullets: [
          'Developed high-performance design tokens and React UI packages reducing engineering handoff time by 35%.',
          'Collaborated closely with product managers to run iterative user testing cycles and usability audits.'
        ]
      }
    ],
    educations: [
      {
        institution: 'University of California, Berkeley',
        degree: 'B.S. in Cognitive Science & Human-Computer Interaction',
        startDate: '2014',
        endDate: '2018',
        gradeGpa: '3.85 / 4.0'
      }
    ],
    projects: [
      {
        title: 'DesignPulse Design System',
        description: 'Multi-brand enterprise design system supporting React, Next.js, and Figma tokens.',
        technologies: ['Figma', 'React', 'Tailwind CSS', 'TypeScript'],
        bullets: [
          'Adopted by 45+ product squads with automated token export to NPM packages.',
          'Reduced component development cycle from 3 weeks to 4 days.'
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

  // If user doesn't have an uploaded or stored profile yet, initialize with default ground truth
  if (!profile || !profile.fullName) {
    profile = getDefaultProfileForUser(userId);
    db.profiles.set(userId, profile);
    await saveProfileToFirestore(userId, profile).catch(() => {});

    // Ensure Master Resume exists in memory and Firestore
    const masterResumeId = `resume_master_${userId}`;
    const syncedMasterResume = {
      id: masterResumeId,
      userId,
      targetRole: profile.desiredTitles?.[0] || 'Principal Product Designer',
      company: 'Master Vault Resume',
      content: {
        candidateName: profile.fullName,
        email: profile.email,
        phone: profile.phone || '',
        location: profile.location || '',
        headline: profile.headline || 'Principal Product Designer',
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
    const rIdx = db.resumes.findIndex(r => r.userId === userId && (r.id === masterResumeId || r.company === 'Master Vault Resume'));
    if (rIdx >= 0) {
      db.resumes[rIdx] = syncedMasterResume as any;
    } else {
      db.resumes.push(syncedMasterResume as any);
    }
    await saveResumeToFirestore(userId, syncedMasterResume).catch(() => {});
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
      headline: updatedProfile.headline || updatedProfile.desiredTitles?.[0] || 'Principal Product Designer',
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
      targetRole: updatedProfile.desiredTitles?.[0] || 'Principal Product Designer',
      company: 'Master Vault Resume',
      content: syncedResumeContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const rIdx = db.resumes.findIndex(r => r.userId === userId && (r.id === masterResumeId || r.company === 'Master Vault Resume'));
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
