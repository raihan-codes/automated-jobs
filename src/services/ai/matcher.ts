// Multi-tier Deterministic AI Job Matching & Scoring Engine
// Evaluates real jobs from Adzuna & Jooble against candidate profile across 10 core dimensions
// Produces a genuine, reproducible 0% - 100% match score, matched skills, missing skills, and grounded explanations.

import { CandidateProfileData, NormalizedJobPosting, MatchAnalysisResult } from '@/types';
import { JDAnalyzer } from './jd-analyzer';

export class JobMatcher {
  /**
   * Evaluates match compatibility between a candidate profile and a normalized real job posting.
   * Completely deterministic: no random jitter, no artificial clamping floor.
   */
  public static async analyzeMatch(
    candidate: CandidateProfileData,
    job: NormalizedJobPosting
  ): Promise<MatchAnalysisResult> {
    // ── 1. Hard Filter Pre-Check ─────────────────────────────────────────────
    const filterResult = JDAnalyzer.evaluateHardFilters(candidate, job);
    if (!filterResult.passed) {
      return {
        overallScore: 0,
        matchTier: 'LOW',
        matchTierLabel: 'Filtered (0%)',
        hardFilterPassed: false,
        hardFilterReason: filterResult.reason,
        skillsScore: 0,
        experienceScore: 0,
        domainScore: 0,
        educationScore: 0,
        semanticScore: 0,
        matchedSkills: [],
        missingSkills: [],
        whyMatchReason: `Filtered by candidate preference: ${filterResult.reason}`,
        potentialConcerns: filterResult.reason
      };
    }

    // ── 2. Extract JD Requirements & Skills ─────────────────────────────────
    const combinedJDText = `${job.title}\n${job.company}\n${job.location}\n${job.descriptionRaw || ''}`;
    const jdReqs = JDAnalyzer.extractRequirements(combinedJDText);

    // Also include any pre-extracted skills on the job object
    const allJdSkillsSet = new Set<string>();
    jdReqs.requiredSkills.forEach(s => allJdSkillsSet.add(s));
    (job.extractedSkills || []).forEach(s => allJdSkillsSet.add(s));
    const jdSkills = Array.from(allJdSkillsSet);

    // ── 3. Build Candidate Search Tokens & Skills Corpus ────────────────────
    const candidateSkillNames = (candidate.skills || []).map(s => s.name.toLowerCase());
    const candidateSkillsRaw = (candidate.skills || []).map(s => s.name);

    const candidateCorpusParts: string[] = [
      candidate.fullName || '',
      candidate.headline || '',
      candidate.summary || '',
      ...candidateSkillsRaw,
      ...(candidate.desiredTitles || []),
      ...(candidate.experiences || []).flatMap(e => [
        e.role,
        e.company,
        ...(e.bullets || []),
        ...(e.technologies || [])
      ]),
      ...(candidate.projects || []).flatMap(p => [
        p.title,
        p.description,
        ...(p.bullets || []),
        ...(p.technologies || [])
      ]),
      ...(candidate.educations || []).flatMap(ed => [
        ed.institution,
        ed.degree,
        ed.fieldOfStudy || '',
        ...(ed.highlights || [])
      ]),
      ...(candidate.certifications || []).flatMap(c => [c.name, c.issuer])
    ];

    const candidateCorpus = candidateCorpusParts.join(' ').toLowerCase();

    // ── 4. Skills & Required Technology Overlap (Dimension 1 & 2) ────────────
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    const normalizeSkillName = (s: string) => {
      const lower = s.toLowerCase();
      if (lower.includes('golang') || lower === 'go') return 'go';
      if (lower.includes('react')) return 'react';
      if (lower.includes('next')) return 'next.js';
      if (lower.includes('postgres')) return 'postgresql';
      if (lower.includes('power bi') || lower === 'powerbi') return 'power bi';
      if (lower.includes('machine learning') || lower === 'ml') return 'machine learning';
      if (lower.includes('tailwind')) return 'tailwind css';
      if (lower.includes('spring')) return 'spring boot';
      if (lower.includes('node')) return 'node.js';
      if (lower.includes('aws') || lower.includes('amazon web')) return 'aws';
      if (lower.includes('gcp') || lower.includes('google cloud')) return 'gcp';
      return lower;
    };

    const isCandidateSkillMatched = (jdSkill: string): boolean => {
      const normJd = normalizeSkillName(jdSkill);
      const jdLower = jdSkill.toLowerCase();

      // Check against candidate skill list
      for (const cs of candidateSkillNames) {
        const normCs = normalizeSkillName(cs);
        if (normCs === normJd || cs === jdLower || cs.includes(jdLower) || jdLower.includes(cs)) {
          return true;
        }
      }

      // Check against candidate full resume corpus (projects, experiences, summary)
      const escaped = jdLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(candidateCorpus);
    };

    if (jdSkills.length > 0) {
      for (const skill of jdSkills) {
        if (isCandidateSkillMatched(skill)) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    } else {
      // If JD didn't explicitly list standard keywords, test candidate's skills against JD description
      for (const candSkill of candidateSkillsRaw) {
        const skillLower = candSkill.toLowerCase();
        const escaped = skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(combinedJDText)) {
          matchedSkills.push(candSkill);
        }
      }
    }

    // Skills Score (0 - 100)
    let skillsScore = 0;
    if (jdSkills.length > 0) {
      const ratio = matchedSkills.length / jdSkills.length;
      skillsScore = Math.round(ratio * 100);
    } else if (matchedSkills.length > 0) {
      skillsScore = Math.min(100, matchedSkills.length * 20);
    } else {
      // General title overlap fallback
      skillsScore = 20;
    }

    // ── 5. Job Title & Role Affinity (Dimension 3) ──────────────────────────
    const titleLower = job.title.toLowerCase();
    const candidateDesired = (candidate.desiredTitles || []).map(t => t.toLowerCase());
    const candidateHeadline = (candidate.headline || '').toLowerCase();

    let titleAffinityScore = 15; // default base if completely different

    // Check exact title token overlaps
    const titleTokens = titleLower.split(/[\s,./\-|—()]+/).filter(t => t.length > 2 && !['senior', 'junior', 'lead', 'staff', 'intern', 'developer', 'engineer'].includes(t));
    const candidateTitleTokens = candidateDesired.join(' ').split(/[\s,./\-|—()]+/).filter(t => t.length > 2 && !['senior', 'junior', 'lead', 'staff', 'intern', 'developer', 'engineer'].includes(t));

    const matchesAnyDesired = candidateDesired.some(desired => {
      return titleLower.includes(desired) || desired.includes(titleLower);
    });

    if (matchesAnyDesired) {
      titleAffinityScore = 95;
    } else {
      // Token overlap ratio
      const sharedTokens = titleTokens.filter(t => candidateTitleTokens.includes(t) || candidateCorpus.includes(t));
      if (titleTokens.length > 0) {
        const tokenRatio = sharedTokens.length / titleTokens.length;
        if (tokenRatio >= 0.75) titleAffinityScore = 90;
        else if (tokenRatio >= 0.5) titleAffinityScore = 75;
        else if (tokenRatio >= 0.25) titleAffinityScore = 50;
        else titleAffinityScore = 25;
      }
      // Check headline affinity
      if (candidateHeadline.includes(titleLower) || titleTokens.some(t => candidateHeadline.includes(t))) {
        titleAffinityScore = Math.max(titleAffinityScore, 70);
      }
    }

    // ── 6. Experience & Seniority Level Compatibility (Dimension 4) ─────────
    const candExpYears = candidate.yearsOfExperience || 0;
    const reqYears = jdReqs.yearsRequired;
    const isInternJob = jdReqs.isInternship || job.employmentType === 'INTERNSHIP';
    const isCandIntern = candExpYears <= 1 && (candidate.desiredTitles.some(t => /intern/i.test(t)) || /intern|student/i.test(candidateCorpus));

    let experienceScore = 75;

    if (isInternJob) {
      if (isCandIntern || candExpYears <= 2) {
        experienceScore = 95;
      } else {
        experienceScore = 60; // Overqualified for intern
      }
    } else {
      const expDelta = candExpYears - reqYears;
      if (expDelta >= 0 && expDelta <= 3) {
        experienceScore = 95; // Ideal experience window
      } else if (expDelta > 3) {
        experienceScore = 85; // Slightly more senior than required
      } else if (expDelta === -1) {
        experienceScore = 75; // 1 year under, can easily bridge
      } else if (expDelta === -2) {
        experienceScore = 55;
      } else if (expDelta === -3) {
        experienceScore = 35;
      } else {
        experienceScore = Math.max(10, 30 + expDelta * 10);
      }
    }

    // ── 7. Education & Certification Relevance (Dimension 5 & 7) ────────────
    let educationScore = 70;
    const candDegrees = (candidate.educations || []).map(e => `${e.degree} ${e.fieldOfStudy || ''}`.toLowerCase()).join(' ');
    
    if (jdReqs.requiredDegree) {
      const reqDegLower = jdReqs.requiredDegree.toLowerCase();
      if (candDegrees.includes(reqDegLower) || /b\.?tech|b\.?s|b\.?e|computer\s+science/i.test(candDegrees)) {
        educationScore = 95;
      } else {
        educationScore = 50;
      }
    } else if (candDegrees.length > 0) {
      educationScore = 85;
    }

    // Certifications boost if relevant
    if ((candidate.certifications || []).length > 0) {
      const hasCloudCert = candidate.certifications?.some(c => /aws|azure|gcp|kubernetes|cka/i.test(c.name));
      const jobRequiresCloud = /aws|azure|gcp|cloud|kubernetes/i.test(combinedJDText);
      if (hasCloudCert && jobRequiresCloud) {
        educationScore = Math.min(100, educationScore + 10);
      }
    }

    // ── 8. Project & Semantic Relevance (Dimension 6 & 10) ───────────────────
    const jdTokens = combinedJDText
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter(t => t.length > 3 && !['with', 'from', 'have', 'this', 'that', 'they', 'will', 'about', 'your', 'working'].includes(t));

    const uniqueJdTokens = Array.from(new Set(jdTokens));
    let matchingTokensCount = 0;

    for (const token of uniqueJdTokens.slice(0, 100)) {
      if (candidateCorpus.includes(token)) {
        matchingTokensCount++;
      }
    }

    const semanticRatio = uniqueJdTokens.length > 0
      ? matchingTokensCount / Math.min(uniqueJdTokens.length, 60)
      : 0.5;

    const semanticScore = Math.min(100, Math.round(semanticRatio * 100));

    // ── 9. Location & Employment Type Compatibility (Dimension 8 & 9) ───────
    let locationScore = 80;
    if (job.isRemote) {
      locationScore = 95;
    } else if (candidate.location && job.location) {
      const candLoc = candidate.location.toLowerCase();
      const jobLoc = job.location.toLowerCase();
      if (candLoc.includes(jobLoc) || jobLoc.includes(candLoc) || (candLoc.includes('india') && jobLoc.includes('india'))) {
        locationScore = 95;
      } else {
        locationScore = 65;
      }
    }

    // ── 10. Composite Deterministic Score Calculation (0% - 100%) ───────────
    // Weights:
    // Skills & Required Technologies: 40%
    // Job Title & Role Affinity: 25%
    // Experience & Seniority Level: 15%
    // Semantic / Project / Education Fit: 15%
    // Location & Type Fit: 5%
    const rawScore = (
      skillsScore * 0.40 +
      titleAffinityScore * 0.25 +
      experienceScore * 0.15 +
      ((semanticScore * 0.6 + educationScore * 0.4) * 0.15) +
      locationScore * 0.05
    );

    // If zero skills match and zero title affinity, ensure score drops naturally to low score
    let calculatedScore = Math.round(rawScore);
    if (matchedSkills.length === 0 && titleAffinityScore <= 25) {
      calculatedScore = Math.min(25, calculatedScore);
    }
    if (matchedSkills.length === 0 && missingSkills.length > 3) {
      calculatedScore = Math.min(30, calculatedScore);
    }

    const overallScore = Math.max(0, Math.min(100, calculatedScore));

    // ── 11. Match Tier Classification ───────────────────────────────────────
    let matchTier: 'EXCELLENT' | 'STRONG' | 'GOOD' | 'MODERATE' | 'PARTIAL' | 'LOW' = 'LOW';
    let matchTierLabel = 'Low Match';

    if (overallScore >= 90) {
      matchTier = 'EXCELLENT';
      matchTierLabel = 'Excellent Match';
    } else if (overallScore >= 80) {
      matchTier = 'STRONG';
      matchTierLabel = 'Strong Match';
    } else if (overallScore >= 70) {
      matchTier = 'GOOD';
      matchTierLabel = 'Good Match';
    } else if (overallScore >= 60) {
      matchTier = 'MODERATE';
      matchTierLabel = 'Moderate Match';
    } else if (overallScore >= 40) {
      matchTier = 'PARTIAL';
      matchTierLabel = 'Partial Match';
    } else {
      matchTier = 'LOW';
      matchTierLabel = 'Low Match';
    }

    // ── 12. Grounded Explanation Synthesizer ─────────────────────────────────
    let whyMatchReason = '';
    const topMatched = matchedSkills.slice(0, 5).join(', ');
    const topMissing = missingSkills.slice(0, 3).join(', ');

    if (overallScore >= 80) {
      if (matchedSkills.length > 0) {
        whyMatchReason = `Strong match because your resume contains ${topMatched}, which are relevant to this position at ${job.company}.`;
      } else {
        whyMatchReason = `Strong alignment with ${job.company}'s requirements based on your candidate profile and experience in ${candidate.headline || 'Software Engineering'}.`;
      }
    } else if (overallScore >= 60) {
      if (matchedSkills.length > 0) {
        whyMatchReason = `Good match with technical overlap in ${topMatched}.`;
      } else {
        whyMatchReason = `Moderate alignment with role requirements at ${job.company}.`;
      }
      if (missingSkills.length > 0) {
        whyMatchReason += ` Key skills not found in resume: ${topMissing}.`;
      }
    } else if (overallScore >= 40) {
      if (matchedSkills.length > 0) {
        whyMatchReason = `Partial match with some overlap in ${topMatched}, but position requires additional skills (${topMissing || 'specialized tech'}).`;
      } else {
        whyMatchReason = `Partial match based on general domain experience; required core technologies (${topMissing || 'listed above'}) were not identified in resume.`;
      }
    } else {
      whyMatchReason = `Low match. The role at ${job.company} primarily requires ${topMissing || jdSkills.slice(0, 3).join(', ') || 'skills'} which differ from your resume profile.`;
    }

    const potentialConcerns = missingSkills.length > 0
      ? `Missing/less-matched skill: ${topMissing}.`
      : undefined;

    const suggestedAngle = matchedSkills.length > 0
      ? `Emphasize hands-on experience with ${topMatched} when tailoring your application.`
      : `Highlight transferable engineering and analytical competencies for this role.`;

    return {
      overallScore,
      matchTier,
      matchTierLabel: `${matchTierLabel} (${overallScore}%)`,
      hardFilterPassed: true,
      skillsScore,
      experienceScore,
      domainScore: titleAffinityScore,
      educationScore,
      semanticScore,
      matchedSkills,
      missingSkills,
      whyMatchReason,
      potentialConcerns,
      suggestedAngle
    };
  }
}
