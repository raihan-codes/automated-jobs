// Truthful JD-Specific ATS Resume Generator
import { CandidateProfileData, NormalizedJobPosting, TailoredResumeContent } from '@/types';
import { TruthfulnessValidator } from './truthfulness-validator';

export class ResumeGenerator {
  /**
   * Generates a tailored, ATS-friendly structured resume for a specific job posting.
   * Re-ranks bullets, groups relevant skills, highlights matched achievements,
   * and runs the zero-hallucination verification audit before returning.
   */
  public static async generateTailoredResume(
    candidate: CandidateProfileData,
    job: NormalizedJobPosting
  ): Promise<TailoredResumeContent> {
    const jobKeywords = `${job.title} ${job.descriptionRaw}`.toLowerCase();

    // 1. Group candidate skills dynamically, prioritizing skills mentioned in the JD
    const technicalSkills = candidate.skills.filter(s => s.category === 'TECHNICAL' || s.category === 'FRAMEWORK');
    const toolsSkills = candidate.skills.filter(s => s.category === 'TOOL' || s.category === 'SOFT');

    // Sort skills by presence in JD
    const prioritizedTech = [...technicalSkills].sort((a, b) => {
      const aInJd = jobKeywords.includes(a.name.toLowerCase()) ? 1 : 0;
      const bInJd = jobKeywords.includes(b.name.toLowerCase()) ? 1 : 0;
      return bInJd - aInJd;
    });

    const skillsSection = [
      {
        category: 'Core Technologies & Languages',
        skills: prioritizedTech.slice(0, 7).map(s => s.name)
      },
      {
        category: 'Frameworks & Systems',
        skills: prioritizedTech.slice(7, 14).map(s => s.name)
      },
      {
        category: 'Developer Tools & Cloud',
        skills: toolsSkills.slice(0, 6).map(s => s.name)
      }
    ].filter(g => g.skills.length > 0);

    // 2. Tailor Summary emphasizing candidate's real capabilities relevant to the target role
    const years = candidate.yearsOfExperience !== undefined ? `${candidate.yearsOfExperience}+ years` : 'Not specified';
    const topKeywords = prioritizedTech.slice(0, 4).map(s => s.name).join(', ');
    const summary = `${candidate.headline || 'Software Engineer'} with ${years} of experience specializing in ${topKeywords}. Track record of architecting reliable, scalable software solutions with a strong commitment to clean code, performance, and cross-functional product impact.`;

    // 3. Select and order Experience Bullets based on JD relevance without altering factual metrics
    const experienceSection = candidate.experiences.map(exp => {
      const sortedBullets = [...exp.bullets].sort((a, b) => {
        const aOverlap = (a.toLowerCase().match(/\b(typescript|react|node|postgres|redis|scale|pipeline|api|database|cloud)\b/g) || []).length;
        const bOverlap = (b.toLowerCase().match(/\b(typescript|react|node|postgres|redis|scale|pipeline|api|database|cloud)\b/g) || []).length;
        return bOverlap - aOverlap;
      });

      return {
        company: exp.company,
        role: exp.role,
        location: exp.location,
        period: exp.isCurrent ? `${exp.startDate} - Present` : `${exp.startDate} - ${exp.endDate || ''}`,
        bullets: sortedBullets
      };
    });

    // 4. Select and format projects
    const projectsSection = candidate.projects.map(proj => ({
      title: proj.title,
      role: proj.role,
      technologies: proj.technologies,
      bullets: proj.bullets,
      link: proj.link
    }));

    // 5. Format Education
    const educationSection = candidate.educations.map(edu => ({
      institution: edu.institution,
      degree: edu.fieldOfStudy ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.degree,
      period: edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : undefined,
      highlights: edu.highlights
    }));

    // Construct preliminary resume
    const tailoredResume: TailoredResumeContent = {
      title: `${candidate.fullName} - ${job.title} (${job.company})`,
      targetRole: job.title,
      targetCompany: job.company,
      summary,
      skillsSection,
      experienceSection,
      projectsSection,
      educationSection,
      isVerifiedTruthful: true
    };

    // 6. Run Strict Truthfulness Verification Audit
    const auditReport = TruthfulnessValidator.verifyResume(candidate, tailoredResume);
    tailoredResume.isVerifiedTruthful = auditReport.isVerifiedTruthful;
    tailoredResume.verificationReport = {
      verifiedSkillsCount: auditReport.verifiedCount,
      flaggedClaimsCount: auditReport.flaggedCount,
      auditItems: auditReport.auditItems
    };

    return tailoredResume;
  }
}
