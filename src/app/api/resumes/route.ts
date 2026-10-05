import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserResumesFromFirestore, saveResumeToFirestore } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const paramUserId = searchParams.get('userId');
  const userId = paramUserId || headerUserId;

  if (!userId) {
    return NextResponse.json({ success: true, userId: null, resumes: [] });
  }

  // 1. Check user resumes in Firestore
  let resumes: any[] = await getUserResumesFromFirestore(userId).catch(() => []);

  // 2. Check memory store for this specific userId
  if (resumes.length === 0) {
    resumes = db.resumes.filter(r => r.userId === userId);
  }

  // 3. If no tailored resumes, synthesize master resume from profile
  if (resumes.length === 0) {
    const { getProfileFromFirestore } = await import('@/lib/firebase/firestore');
    let profile = db.profiles.get(userId);
    if (!profile) {
      profile = await getProfileFromFirestore(userId).catch(() => null) || undefined;
    }

    if (!profile || !profile.fullName) {
      // Trigger default profile setup if needed
      try {
        const profRes = await fetch(`${request.nextUrl.origin}/api/profile?userId=${userId}`);
        const profData = await profRes.json();
        if (profData.profile) profile = profData.profile;
      } catch (err) {}
    }

    if (profile && profile.fullName) {
      const masterResume = {
        id: `resume_master_${userId}`,
        userId,
        targetRole: profile.desiredTitles?.[0] || profile.headline || 'Principal Product Designer',
        company: 'Master Vault Resume',
        content: {
          candidateName: profile.fullName || 'Raihan Molla',
          email: profile.email || 'raihanmolla993@gmail.com',
          phone: profile.phone || '+1 (555) 389-4210',
          location: profile.location || 'San Francisco, CA (PST)',
          headline: profile.headline || 'Principal Product Designer & Systems Architect',
          summary: profile.summary || '',
          skills: (profile.skills || []).map((s: any) => typeof s === 'string' ? s : s.name),
          experiences: (profile.experiences || []).map((e: any) => ({
            role: e.role,
            company: e.company,
            duration: e.isCurrent ? `${e.startDate} - Present` : `${e.startDate || ''} - ${e.endDate || 'Present'}`,
            location: e.location || '',
            bullets: e.bullets || []
          })),
          educations: (profile.educations || []).map((ed: any) => ({
            institution: ed.institution,
            degree: ed.degree,
            year: `${ed.startDate || ed.startYear || ''} - ${ed.endDate || ed.endYear || ''}`,
            gpa: ed.gradeGpa || ed.gpa || ''
          })),
          projects: (profile.projects || []).map((p: any) => ({
            name: p.title,
            technologies: p.technologies || [],
            bullets: p.bullets || []
          }))
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      resumes = [masterResume];
      db.resumes.push(masterResume as any);
    }
  }

  return NextResponse.json({
    success: true,
    userId,
    resumes
  });
}

export async function POST(request: Request) {
  const headerUserId = request.headers.get('x-user-id');
  const body = await request.json();
  const userId = body.userId || headerUserId;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
  }

  const newResume = {
    ...body,
    id: body.id || `resume_${Date.now()}_${userId}`,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.resumes.push(newResume);
  await saveResumeToFirestore(userId, newResume).catch(e => console.warn('Firestore resume save error:', e));

  return NextResponse.json({
    success: true,
    userId,
    resume: newResume
  });
}
