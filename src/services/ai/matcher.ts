// Multi-tier Deterministic AI Job Matching & Scoring Engine
// Evaluates real jobs from Adzuna & Jooble against candidate profile across core dimensions
// Produces a genuine, reproducible 0% - 100% match score, matched skills, missing skills, and grounded explanations.
// Strictly prevents hallucinated or false substring skill matches (e.g. 'C' matching 'TypeScript' or 'Java' matching 'JavaScript').

import { CandidateProfileData, NormalizedJobPosting, MatchAnalysisResult } from '@/types';
import { JDAnalyzer } from './jd-analyzer';

export class JobMatcher {
  /**
   * Canonicalizes a skill string to its normalized standard key.
   */
  public static canonicalizeSkill(skill: string): string {
    const s = skill.trim().toLowerCase();
    if (/^python(?:3|2)?$/i.test(s)) return 'python';
    if (/^(?:java\s*script|javascript|js|ecmascript)$/i.test(s)) return 'javascript';
    if (/^(?:typescript|ts)$/i.test(s)) return 'typescript';
    if (/^java$/i.test(s)) return 'java';
    if (/^(?:c\+\+|cpp|c\/c\+\+)$/i.test(s)) return 'c++';
    if (/^(?:c#|csharp|\.net)$/i.test(s)) return 'c#';
    if (/^c$/i.test(s)) return 'c';
    if (/^(?:golang|go|go\s*language)$/i.test(s)) return 'go';
    if (/^rust$/i.test(s)) return 'rust';
    if (/^php$/i.test(s)) return 'php';
    if (/^ruby$/i.test(s)) return 'ruby';
    if (/^swift$/i.test(s)) return 'swift';
    if (/^kotlin$/i.test(s)) return 'kotlin';
    if (/^scala$/i.test(s)) return 'scala';
    if (/^r$/i.test(s)) return 'r';
    if (/^(?:sql|structured\s+query\s+language|pl\/sql|t-sql)$/i.test(s)) return 'sql';
    if (/^html(?:5)?$/i.test(s)) return 'html5';
    if (/^css(?:3)?$/i.test(s)) return 'css3';
    if (/^(?:react|react\.js|reactjs)$/i.test(s)) return 'react';
    if (/^(?:next\.js|nextjs|next)$/i.test(s)) return 'next.js';
    if (/^(?:node\.js|nodejs|node)$/i.test(s)) return 'node.js';
    if (/^(?:express\.js|expressjs|express)$/i.test(s)) return 'express.js';
    if (/^(?:spring\s*boot|spring\s*framework)$/i.test(s)) return 'spring boot';
    if (/^(?:django)$/i.test(s)) return 'django';
    if (/^(?:fastapi)$/i.test(s)) return 'fastapi';
    if (/^(?:flask)$/i.test(s)) return 'flask';
    if (/^(?:postgresql|postgres|psql)$/i.test(s)) return 'postgresql';
    if (/^(?:mysql)$/i.test(s)) return 'mysql';
    if (/^(?:mongodb|mongo)$/i.test(s)) return 'mongodb';
    if (/^(?:redis)$/i.test(s)) return 'redis';
    if (/^(?:indexeddb)$/i.test(s)) return 'indexeddb';
    if (/^(?:kafka|apache\s*kafka)$/i.test(s)) return 'kafka';
    if (/^(?:docker)$/i.test(s)) return 'docker';
    if (/^(?:kubernetes|k8s)$/i.test(s)) return 'kubernetes';
    if (/^(?:aws|amazon\s*web\s*services)$/i.test(s)) return 'aws';
    if (/^(?:gcp|google\s*cloud)$/i.test(s)) return 'gcp';
    if (/^(?:azure|microsoft\s*azure)$/i.test(s)) return 'azure';
    if (/^(?:git|github|gitlab)$/i.test(s)) return 'git';
    if (/^(?:linux|unix)$/i.test(s)) return 'linux';
    if (/^(?:rest\s*apis?|restful|rest\/api|rest\/api\s*fundamentals|api\s*fundamentals)$/i.test(s)) return 'rest apis';
    if (/^(?:data\s*structures\s*&\s*algorithms|data\s*structures|algorithms|dsa)$/i.test(s)) return 'data structures & algorithms';
    if (/^(?:object-?oriented\s*programming|oop|oops|object-oriented\s*design)$/i.test(s)) return 'object-oriented programming';
    if (/^(?:dbms|database\s*management\s*systems?|rdbms)$/i.test(s)) return 'dbms';
    if (/^(?:computer\s*architecture|computer\s*organization)$/i.test(s)) return 'computer architecture';
    if (/^(?:operating\s*systems?|os|operating\/computer\s*fundamentals|operating\s*system\s*fundamentals)$/i.test(s)) return 'operating systems';
    if (/^(?:web\s*development|web\s*development\s*fundamentals)$/i.test(s)) return 'web development';
    if (/^(?:problem\s*solving)$/i.test(s)) return 'problem solving';
    if (/^(?:communication)$/i.test(s)) return 'communication';
    if (/^(?:team\s*collaboration|teamwork|cross-functional\s*collaboration|collaboration)$/i.test(s)) return 'team collaboration';
    if (/^(?:logical\s*thinking)$/i.test(s)) return 'logical thinking';
    if (/^(?:data\s*science|data\s*analytics)$/i.test(s)) return 'data science';
    return s;
  }

  /**
   * Tests whether a specific skill is explicitly present in candidate's profile/skills list or text corpus.
   * Strictly uses word boundaries to prevent substring collisions (e.g. 'c' within 'TypeScript').
   */
  public static isSkillInCandidate(skill: string, candidate: CandidateProfileData, candidateCorpus: string): boolean {
    const canonTarget = JobMatcher.canonicalizeSkill(skill);

    // 1. Direct match against candidate's structured skills list
    for (const candSkill of candidate.skills || []) {
      const canonCand = JobMatcher.canonicalizeSkill(candSkill.name);
      if (canonCand === canonTarget) {
        return true;
      }
    }

    // 2. Strict word boundary check in candidate text corpus
    const escaped = canonTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex: RegExp;
    if (canonTarget === 'c') {
      regex = /\b(?:c\s+language|c\s+programming|\bc\b(?=\s*[,/•&+]|\s+programming|\s+language))\b/i;
    } else if (canonTarget === 'r') {
      regex = /\b(?:r\s+language|r\s+programming|\br\b(?=\s*[,/•&+]|\s+programming|\s+data))\b/i;
    } else if (canonTarget === 'go') {
      regex = /\b(?:golang|go\s+language|\bgo\b(?!\s+(?:to|for|with|and|through|ahead)))\b/i;
    } else if (canonTarget === 'java') {
      regex = /\bjava\b(?!\s*script)/i;
    } else {
      regex = new RegExp(`\\b${escaped}\\b`, 'i');
    }

    return regex.test(candidateCorpus);
  }

  /**
   * Tests whether a skill is required or mentioned in the real Job Description text or title.
   */
  public static isSkillInJob(skill: string, jobTitleAndText: string, jobExtractedSkills: string[]): boolean {
    const canonTarget = JobMatcher.canonicalizeSkill(skill);

    // Check pre-extracted job skills
    for (const js of jobExtractedSkills) {
      if (JobMatcher.canonicalizeSkill(js) === canonTarget) {
        return true;
      }
    }

    // Strict word boundary check in job description
    const escaped = canonTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex: RegExp;
    if (canonTarget === 'c') {
      regex = /\b(?:c\s+language|c\s+programming|\bc\b(?=\s*[,/•&+]|\s+programming|\s+language))\b/i;
    } else if (canonTarget === 'r') {
      regex = /\b(?:r\s+language|r\s+programming|\br\b(?=\s*[,/•&+]|\s+programming|\s+data))\b/i;
    } else if (canonTarget === 'go') {
      regex = /\b(?:golang|go\s+language|\bgo\b(?!\s+(?:to|for|with|and|through|ahead)))\b/i;
    } else if (canonTarget === 'java') {
      regex = /\bjava\b(?!\s*script)/i;
    } else {
      regex = new RegExp(`\\b${escaped}\\b`, 'i');
    }

    return regex.test(jobTitleAndText);
  }

  /**
   * Evaluates match compatibility between a candidate profile and a normalized real job posting.
   * Completely deterministic: no random jitter, no artificial clamping floor, no fabricated skills.
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

    // ── 2. Build Job Requirements Corpus ────────────────────────────────────
    const combinedJDText = `${job.title}\n${job.company}\n${job.location}\n${job.descriptionRaw || ''}`;
    const jdReqs = JDAnalyzer.extractRequirements(combinedJDText);

    const allJdSkillsSet = new Set<string>();
    jdReqs.requiredSkills.forEach(s => allJdSkillsSet.add(s));
    (job.extractedSkills || []).forEach(s => allJdSkillsSet.add(s));
    const jdSkills = Array.from(allJdSkillsSet);

    // ── 3. Build Candidate Search Tokens & Skills Corpus ────────────────────
    const candidateSkillsRaw = (candidate.skills || []).map(s => s.name);

    const candidateCorpusParts: string[] = [
      candidate.fullName || '',
      candidate.headline && candidate.headline !== 'Not specified' ? candidate.headline : '',
      candidate.summary && candidate.summary !== 'Not specified' ? candidate.summary : '',
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

    // ── 4. Strict Skills Overlap Calculation ─────────────────────────────────
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    if (jdSkills.length > 0) {
      for (const skill of jdSkills) {
        if (JobMatcher.isSkillInCandidate(skill, candidate, candidateCorpus)) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    } else {
      // If JD didn't explicitly list discrete taxonomy keywords, evaluate candidate's actual skills against JD text
      for (const candSkill of candidateSkillsRaw) {
        if (JobMatcher.isSkillInJob(candSkill, combinedJDText, job.extractedSkills || [])) {
          matchedSkills.push(candSkill);
        }
      }
    }

    // Compute Skills Score (0 - 100)
    let skillsScore = 0;
    if (jdSkills.length > 0) {
      const ratio = matchedSkills.length / jdSkills.length;
      skillsScore = Math.round(ratio * 100);
    } else if (matchedSkills.length > 0) {
      skillsScore = Math.min(100, matchedSkills.length * 25);
    } else {
      skillsScore = 0;
    }

    // ── 5. Job Title & Role Affinity (Dimension 2) ──────────────────────────
    const titleLower = job.title.toLowerCase();
    const candidateDesired = (candidate.desiredTitles || []).map(t => t.toLowerCase());
    const candEducationTitles = (candidate.educations || []).map(e => `${e.degree} ${e.fieldOfStudy || ''}`.toLowerCase()).join(' ');

    let titleAffinityScore = 15; // default base for different roles

    // Check desired titles or role keywords
    const matchesDesired = candidateDesired.some(desired => desired.length > 2 && (titleLower.includes(desired) || desired.includes(titleLower)));

    if (matchesDesired) {
      titleAffinityScore = 95;
    } else {
      // Check tech student / engineering domain overlap
      const isTechJob = /software|developer|engineer|full\s*stack|frontend|backend|data|python|web|react|node|intern/i.test(titleLower);
      const isTechCandidate = /computer\s*science|data\s*science|engineering|software|developer/i.test(candEducationTitles) ||
        candidateSkillsRaw.some(s => /python|java|javascript|c\+\+|sql|react|node|git/i.test(s));

      if (isTechJob && isTechCandidate) {
        // Specific role alignment
        if (/intern|internship|trainee|apprentice/i.test(titleLower)) {
          titleAffinityScore = 90;
        } else if (/software\s*engineer|developer|full\s*stack|backend|frontend/i.test(titleLower)) {
          titleAffinityScore = 80;
        } else if (/data\s*analyst|data\s*science|ai|ml/i.test(titleLower)) {
          titleAffinityScore = /data/i.test(candEducationTitles) ? 90 : 75;
        } else {
          titleAffinityScore = 50;
        }
      } else if (!isTechJob && isTechCandidate) {
        // e.g. Sales, Marketing, Design Engineer with zero overlap
        titleAffinityScore = 10;
      }
    }

    // ── 6. Experience & Seniority Level Compatibility (Dimension 3) ─────────
    const candExpYears = candidate.yearsOfExperience ?? 0;
    const reqYears = jdReqs.yearsRequired;
    const isInternJob = jdReqs.isInternship || job.employmentType === 'INTERNSHIP' || /intern|internship|trainee/i.test(job.title);
    const isStudentOrNewGrad = candExpYears <= 1 || (candidate.educations || []).some(e => {
      const endYear = parseInt(e.endDate || '0', 10);
      return endYear >= new Date().getFullYear();
    });

    let experienceScore = 50;

    if (isInternJob) {
      if (isStudentOrNewGrad) {
        experienceScore = 95;
      } else {
        experienceScore = 60;
      }
    } else {
      const expDelta = candExpYears - reqYears;
      if (expDelta >= 0 && expDelta <= 2) {
        experienceScore = 90;
      } else if (expDelta === -1) {
        experienceScore = 70;
      } else if (expDelta === -2) {
        experienceScore = 45;
      } else if (expDelta <= -3) {
        experienceScore = 15;
      } else {
        experienceScore = 75;
      }
    }

    // ── 7. Education Relevance (Dimension 4) ─────────────────────────────────
    let educationScore = 60;
    if (/computer\s*science|data\s*science|b\.?tech|b\.?e|engineering/i.test(candEducationTitles)) {
      educationScore = 90;
    } else if (candEducationTitles.length > 0) {
      educationScore = 75;
    }

    // ── 8. Location & Work Mode Fit (Dimension 5) ───────────────────────────
    let locationScore = 50;
    if (job.isRemote && job.remoteType === 'REMOTE') {
      locationScore = 95;
    } else if (candidate.location && candidate.location !== 'Not specified' && job.location && job.location !== 'Not specified') {
      const candLoc = candidate.location.toLowerCase();
      const jobLoc = job.location.toLowerCase();
      if (candLoc.includes(jobLoc) || jobLoc.includes(candLoc) || (candLoc.includes('india') && jobLoc.includes('india'))) {
        locationScore = 90;
      } else {
        locationScore = 30; // On-site in different city/country
      }
    }

    // ── 9. Composite Deterministic Score Calculation ────────────────────────
    // Weights:
    // Skills Overlap: 45%
    // Title & Domain Affinity: 25%
    // Experience Fit: 20%
    // Location & Education: 10%
    let calculatedScore = Math.round(
      skillsScore * 0.45 +
      titleAffinityScore * 0.25 +
      experienceScore * 0.20 +
      ((locationScore * 0.5 + educationScore * 0.5) * 0.10)
    );

    // If zero skills match and title affinity is low, ensure score drops to low match (<35%)
    if (matchedSkills.length === 0) {
      if (skillsScore === 0) {
        calculatedScore = Math.min(30, Math.round(calculatedScore * 0.4));
      }
    }

    const overallScore = Math.max(0, Math.min(100, calculatedScore));

    // ── 10. Match Tier Classification ───────────────────────────────────────
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

    // ── 11. Grounded Explanation Synthesizer ─────────────────────────────────
    let whyMatchReason = '';
    const topMatched = matchedSkills.slice(0, 5).join(', ');
    const topMissing = missingSkills.slice(0, 4).join(', ');

    if (overallScore >= 80) {
      if (matchedSkills.length > 0) {
        whyMatchReason = `Strong match because your resume contains ${topMatched}, which are directly relevant to this position at ${job.company}.`;
      } else {
        whyMatchReason = `Strong alignment with ${job.company}'s requirements based on your engineering background and domain competencies.`;
      }
    } else if (overallScore >= 60) {
      if (matchedSkills.length > 0) {
        whyMatchReason = `Good match with verified skill overlap in ${topMatched}.`;
      } else {
        whyMatchReason = `Moderate alignment with role requirements at ${job.company}.`;
      }
      if (missingSkills.length > 0) {
        whyMatchReason += ` Additional JD requirements: ${topMissing}.`;
      }
    } else if (overallScore >= 40) {
      if (matchedSkills.length > 0) {
        whyMatchReason = `Partial match with some overlap in ${topMatched}, but position requires additional skills (${topMissing || 'specialized tools'}).`;
      } else {
        whyMatchReason = `Partial match based on general domain background; position requires specific skills (${topMissing || 'listed above'}) not found in resume.`;
      }
    } else {
      whyMatchReason = `Low match. The role at ${job.company} primarily requires ${topMissing || jdSkills.slice(0, 3).join(', ') || 'skills'} which differ from your resume profile.`;
    }

    const potentialConcerns = missingSkills.length > 0
      ? `Required skills not in resume: ${topMissing}.`
      : undefined;

    const suggestedAngle = matchedSkills.length > 0
      ? `Emphasize hands-on experience with ${topMatched} when tailoring your application.`
      : `Highlight transferable software engineering competencies and quick-learning aptitude.`;

    return {
      overallScore,
      matchTier,
      matchTierLabel: `${matchTierLabel} (${overallScore}%)`,
      hardFilterPassed: true,
      skillsScore,
      experienceScore,
      domainScore: titleAffinityScore,
      educationScore,
      semanticScore: skillsScore,
      matchedSkills,
      missingSkills,
      whyMatchReason,
      potentialConcerns,
      suggestedAngle
    };
  }
}
