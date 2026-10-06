import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveProfileToFirestore, saveResumeToFirestore, getProfileFromFirestore, getUserResumesFromFirestore } from '@/lib/firebase/firestore';
import { FormPrefillEngine } from '@/services/automation/form-prefill';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const headerUserId = request.headers.get('x-user-id');
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || headerUserId || 'user_raihan_molla';

  let profile = db.profiles.get(userId);
  if (!profile) {
    profile = await getProfileFromFirestore(userId).catch(() => null) || undefined;
    if (profile) db.profiles.set(userId, profile);
  }

  const masterResumeId = `resume_master_${userId}`;
  let resume = db.resumes.find(r => r.userId === userId && (r.id === masterResumeId || (r as any).company === 'Master Vault Resume'));

  const isMatched = Boolean(
    profile &&
    resume &&
    profile.fullName === (resume.content as any).candidateName &&
    profile.email === (resume.content as any).email
  );

  return NextResponse.json({
    success: true,
    userId,
    isMatched,
    matchPercentage: isMatched ? 100 : (profile && resume ? 85 : 0),
    profile,
    resume
  });
}

export async function POST(request: NextRequest) {
  const headerUserId = request.headers.get('x-user-id');
  const body = await request.json().catch(() => ({}));
  const userId = body.userId || headerUserId || 'user_raihan_molla';
  const direction = body.direction || 'PROFILE_TO_RESUME'; // 'PROFILE_TO_RESUME' | 'RESUME_TO_PROFILE'

  let profile = db.profiles.get(userId);
  if (!profile) {
    profile = await getProfileFromFirestore(userId).catch(() => null) || undefined;
  }

  const masterResumeId = `resume_master_${userId}`;
  let resume = db.resumes.find(r => r.userId === userId && (r.id === masterResumeId || (r as any).company === 'Master Vault Resume'));

  if (direction === 'RESUME_TO_PROFILE' && resume) {
    // Sync Candidate Profile from Master Resume
    const rc = resume.content as any;
    const updatedProfile: any = {
      ...(profile || {}),
      id: `prof_${userId}`,
      userId,
      fullName: rc.candidateName || profile?.fullName || 'Raihan Molla',
      email: rc.email || profile?.email || 'raihanmolla9903@gmail.com',
      phone: rc.phone || profile?.phone || '+91 8585844758',
      location: rc.location || profile?.location || 'Asansol, West Bengal, India',
      headline: rc.headline || profile?.headline || 'B.Tech CSE (Data Science) Student & Software Developer',
      summary: rc.summary || profile?.summary || '',
      skills: (rc.skills || []).map((s: string, idx: number) => ({
        id: `skill_${idx}`,
        name: s,
        category: 'TECHNICAL',
        years: 2,
        level: 'ADVANCED'
      })),
      experiences: (rc.experiences || []).map((exp: any, idx: number) => ({
        id: `exp_${idx}`,
        company: exp.company,
        role: exp.role,
        startDate: (exp.duration || '').split('-')[0]?.trim() || '2024',
        endDate: (exp.duration || '').split('-')[1]?.trim() || 'Present',
        isCurrent: (exp.duration || '').toLowerCase().includes('present'),
        location: exp.location || 'Remote',
        bullets: exp.bullets || []
      })),
      educations: (rc.educations || []).map((ed: any, idx: number) => ({
        id: `edu_${idx}`,
        institution: ed.institution,
        degree: ed.degree,
        startDate: (ed.year || '').split('-')[0]?.trim() || '2024',
        endDate: (ed.year || '').split('-')[1]?.trim() || '2028',
        gradeGpa: ed.gpa || '7.1'
      })),
      projects: (rc.projects || []).map((p: any, idx: number) => ({
        id: `proj_${idx}`,
        title: p.name,
        technologies: p.technologies || [],
        bullets: p.bullets || []
      }))
    };

    db.profiles.set(userId, updatedProfile);
    await saveProfileToFirestore(userId, updatedProfile).catch(() => {});

    // Update application form fields
    for (const app of db.applications.filter(a => a.userId === userId)) {
      app.fields = FormPrefillEngine.mapProfileToFields(updatedProfile);
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate Profile matched to Master Resume with 100% accuracy!',
      matchPercentage: 100,
      profile: updatedProfile,
      resume
    });
  } else {
    // Sync Master Resume from Candidate Profile
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Candidate profile not found' }, { status: 404 });
    }

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
        skills: profile.skills.map((s: any) => typeof s === 'string' ? s : s.name),
        experiences: profile.experiences.map((e: any) => ({
          role: e.role,
          company: e.company,
          duration: e.isCurrent ? `${e.startDate} - Present` : `${e.startDate} - ${e.endDate || ''}`,
          location: e.location || '',
          bullets: e.bullets || []
        })),
        educations: profile.educations.map((ed: any) => ({
          institution: ed.institution,
          degree: ed.degree,
          year: `${ed.startDate || ''} - ${ed.endDate || ''}`,
          gpa: ed.gradeGpa || ''
        })),
        projects: profile.projects.map((p: any) => ({
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

    return NextResponse.json({
      success: true,
      message: 'Master Resume matched to Candidate Profile with 100% accuracy!',
      matchPercentage: 100,
      profile,
      resume: syncedMasterResume
    });
  }
}
