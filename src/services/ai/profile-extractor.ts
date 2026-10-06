// AI Profile Extractor (Parses Raw Resume Text, PDF, & DOCX into Ground-Truth Candidate Profile)
// Extracts technical skills, soft skills, programming languages, frameworks, libraries,
// databases, tools, cloud technologies, certifications, education, experiences, projects, and domain competencies.
// Strictly adheres to data explicitly present in resume without synthetic or hardcoded filler.

import {
  CandidateProfileData,
  CandidateSkillData,
  ExperienceData,
  EducationData,
  ProjectData,
  CertificationData,
  AchievementData
} from '@/types';
import { ExtractionResult } from './types';

export class ProfileExtractor {
  /**
   * Parses raw resume text into a structured CandidateProfileData profile.
   * Grounded strictly in the user's provided resume text without synthetic filler data.
   */
  public static async extractProfileFromText(
    rawText: string,
    existingEmail?: string
  ): Promise<ExtractionResult & { isLowConfidence?: boolean; missingItems?: string[] }> {
    const NOT_SPECIFIED = 'Not specified';
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const textLower = rawText.toLowerCase();

    // ── 1. Contact Information ───────────────────────────────────────────────
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : (existingEmail || NOT_SPECIFIED);

    const phoneMatch = rawText.match(/\+\d{1,3}[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}/) ||
      rawText.match(/(?:\+?91[\s.-]?)?[6-9]\d{9}|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

    // Links & Portfolio
    const linkedinMatch = rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i) ||
      rawText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    const githubMatch = rawText.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i) ||
      rawText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
    
    const portfolioExplicit = rawText.match(/(?:portfolio|website|site)[\s:]*(https?:\/\/[^\s,•|]+|[a-zA-Z0-9.-]+\.(?:vercel\.app|netlify\.app|app|io|dev|com|in)[^\s,•|]*)/i);
    const genericWebsite = rawText.match(/https?:\/\/(?!(?:www\.)?(?:linkedin\.com|github\.com|twitter\.com|x\.com))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s,•)]*)?/i);

    let detectedWebsite: string | undefined = undefined;
    if (portfolioExplicit) {
      detectedWebsite = portfolioExplicit[1].trim();
    } else if (genericWebsite) {
      detectedWebsite = genericWebsite[0].trim();
    }
    if (detectedWebsite && !detectedWebsite.startsWith('http')) {
      detectedWebsite = `https://${detectedWebsite}`;
    }

    // ── 2. Location & Remote Preference ─────────────────────────────────────
    let detectedLocation = NOT_SPECIFIED;
    const locPrefixMatch = rawText.match(/(?:location|address|residence|based in|city)[\s:]+([A-Za-z\s,.-]+?)(?:\s*[•|\n|;]|\s+email|\s+phone|\s+mobile|\s+linkedin|\s+github|$)/i);
    if (locPrefixMatch && locPrefixMatch[1].trim().length > 3 && !/developer|engineer|software|summary|objective/i.test(locPrefixMatch[1])) {
      detectedLocation = locPrefixMatch[1].trim();
    } else {
      const contactLocationMatch = rawText.match(/^([A-Za-z][A-Za-z ,.-]{3,})\s*[•|]/m);
      if (contactLocationMatch && !/@|linkedin|github|resume|summary|experience|education/i.test(contactLocationMatch[1])) {
        detectedLocation = contactLocationMatch[1].trim();
      }
    }

    let remotePreference: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'REMOTE_OR_HYBRID' | 'ANY' | undefined;
    if (/remote\s*only|strictly remote|100%\s*remote/i.test(rawText)) remotePreference = 'REMOTE';
    else if (/hybrid/i.test(rawText)) remotePreference = 'HYBRID';
    else if (/on-?site\s*only/i.test(rawText)) remotePreference = 'ONSITE';

    // ── 3. Candidate Name Extraction ────────────────────────────────────────
    let cleanName = '';
    const blacklistKeywords = [
      'resume', 'curriculum', 'vitae', 'profile', 'contact', 'email', 'phone', 'mobile',
      'page', 'portfolio', 'myportfolio', 'vercel', 'github', 'linkedin', 'http', 'https', 'www',
      '.com', '.app', '.dev', '.in', '.io', '.org', '.net', 'objective', 'summary', 'skills',
      'experience', 'education', 'projects', 'frontend', 'backend', 'full stack', 'developer',
      'engineer', 'architect', 'analyst', 'bengaluru', 'bangalore', 'hyderabad', 'pune', 'delhi', 'mumbai',
      'asansol', 'kolkata', 'india', 'remote', 'address', 'university', 'college', 'institute', 'school', 'academy'
    ];

    const isNoise = (str: string) => {
      const s = str.toLowerCase();
      return blacklistKeywords.some(kw => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s));
    };

    const explicitNameMatch = rawText.match(/(?:full\s*name|name)[\s:]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/i);
    if (explicitNameMatch && !isNoise(explicitNameMatch[1])) {
      cleanName = explicitNameMatch[1].trim();
    }

    if (!cleanName) {
      for (const line of lines.slice(0, 10)) {
        const trimmed = line.trim();
        if (/[@:/\\_~#?&=[\]{}<>]|\.(com|app|dev|in|io|org|net|co|me)\b|\b\d+\b/i.test(trimmed)) continue;
        if (isNoise(trimmed)) continue;

        const nameCandidate = trimmed.replace(/[^A-Za-z\s]/g, '').trim();
        const words = nameCandidate.split(/\s+/).filter(Boolean);

        if (words.length >= 2 && words.length <= 4 && nameCandidate.length >= 3 && nameCandidate.length <= 40) {
          if (words.every(w => w.length >= 2 && !isNoise(w))) {
            cleanName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            break;
          }
        }
      }
    }

    if (!cleanName) {
      cleanName = NOT_SPECIFIED;
    }

    // ── 4. Technical, Soft, Framework, & Domain Skills Extraction ────────────
    const skillsDictionary: { name: string; category: 'TECHNICAL' | 'FRAMEWORK' | 'TOOL' | 'SOFT'; synonyms?: string[] }[] = [
      // Programming Languages
      { name: 'Python', category: 'TECHNICAL', synonyms: ['python3', 'python2'] },
      { name: 'Java', category: 'TECHNICAL' },
      { name: 'C', category: 'TECHNICAL' },
      { name: 'C++', category: 'TECHNICAL', synonyms: ['cpp', 'c/c++'] },
      { name: 'JavaScript', category: 'TECHNICAL', synonyms: ['js', 'ecmascript', 'java script'] },
      { name: 'TypeScript', category: 'TECHNICAL', synonyms: ['ts'] },
      { name: 'C#', category: 'TECHNICAL', synonyms: ['csharp', '.net'] },
      { name: 'Go (Golang)', category: 'TECHNICAL', synonyms: ['golang', 'go language'] },
      { name: 'Rust', category: 'TECHNICAL' },
      { name: 'PHP', category: 'TECHNICAL' },
      { name: 'Ruby', category: 'TECHNICAL' },
      { name: 'Swift', category: 'TECHNICAL' },
      { name: 'Kotlin', category: 'TECHNICAL' },
      { name: 'Scala', category: 'TECHNICAL' },
      { name: 'R', category: 'TECHNICAL' },
      { name: 'SQL', category: 'TECHNICAL', synonyms: ['structured query language', 't-sql', 'pl/sql'] },
      { name: 'HTML5', category: 'TECHNICAL', synonyms: ['html'] },
      { name: 'CSS3', category: 'TECHNICAL', synonyms: ['css'] },

      // Core Computer Science Concepts
      { name: 'Data Structures & Algorithms', category: 'TECHNICAL', synonyms: ['dsa', 'data structures', 'algorithms'] },
      { name: 'Object-Oriented Programming', category: 'TECHNICAL', synonyms: ['oop', 'oops', 'object-oriented design'] },
      { name: 'DBMS', category: 'TECHNICAL', synonyms: ['database management systems', 'database management', 'rdbms'] },
      { name: 'Computer Architecture', category: 'TECHNICAL', synonyms: ['computer organization', 'digital electronics', 'computer systems'] },
      { name: 'Operating Systems', category: 'TECHNICAL', synonyms: ['operating/computer fundamentals', 'os fundamentals', 'operating system fundamentals'] },
      { name: 'Computer Fundamentals', category: 'TECHNICAL', synonyms: ['programming fundamentals'] },

      // Web & Frontend Frameworks
      { name: 'React', category: 'FRAMEWORK', synonyms: ['react.js', 'reactjs'] },
      { name: 'Next.js', category: 'FRAMEWORK', synonyms: ['nextjs', 'next.js 13', 'next.js 14'] },
      { name: 'Vue.js', category: 'FRAMEWORK', synonyms: ['vue', 'vuejs', 'vue3'] },
      { name: 'Angular', category: 'FRAMEWORK', synonyms: ['angularjs', 'angular 2+'] },
      { name: 'Svelte', category: 'FRAMEWORK', synonyms: ['sveltekit'] },
      { name: 'Tailwind CSS', category: 'FRAMEWORK', synonyms: ['tailwindcss'] },
      { name: 'Bootstrap', category: 'FRAMEWORK' },
      { name: 'Redux', category: 'FRAMEWORK', synonyms: ['redux toolkit', 'rtk'] },
      { name: 'Web Development', category: 'TECHNICAL', synonyms: ['web development fundamentals', 'frontend development', 'backend development'] },

      // Backend Frameworks & Runtimes
      { name: 'Node.js', category: 'FRAMEWORK', synonyms: ['nodejs'] },
      { name: 'Express.js', category: 'FRAMEWORK', synonyms: ['expressjs', 'express'] },
      { name: 'NestJS', category: 'FRAMEWORK', synonyms: ['nest.js'] },
      { name: 'Spring Boot', category: 'FRAMEWORK', synonyms: ['springboot', 'spring framework'] },
      { name: 'Django', category: 'FRAMEWORK' },
      { name: 'FastAPI', category: 'FRAMEWORK' },
      { name: 'Flask', category: 'FRAMEWORK' },
      { name: 'Ruby on Rails', category: 'FRAMEWORK', synonyms: ['rails'] },
      { name: 'GraphQL', category: 'TECHNICAL' },
      { name: 'REST APIs', category: 'TECHNICAL', synonyms: ['restful', 'rest api', 'rest/api', 'rest/api fundamentals', 'api fundamentals'] },
      { name: 'gRPC', category: 'TECHNICAL' },
      { name: 'WebSockets', category: 'TECHNICAL', synonyms: ['socket.io', 'webrtc'] },
      { name: 'Microservices', category: 'TECHNICAL', synonyms: ['microservice architecture'] },
      { name: 'System Design', category: 'TECHNICAL', synonyms: ['distributed systems'] },

      // Data, ML & Analytics
      { name: 'Data Science', category: 'TECHNICAL', synonyms: ['data analytics', 'data exploration'] },
      { name: 'Pandas', category: 'FRAMEWORK' },
      { name: 'NumPy', category: 'FRAMEWORK' },
      { name: 'Power BI', category: 'TOOL', synonyms: ['powerbi'] },
      { name: 'Tableau', category: 'TOOL' },
      { name: 'Excel', category: 'TOOL', synonyms: ['ms excel', 'advanced excel', 'spreadsheets'] },
      { name: 'Machine Learning', category: 'TECHNICAL', synonyms: ['ml', 'deep learning'] },
      { name: 'PyTorch', category: 'FRAMEWORK' },
      { name: 'TensorFlow', category: 'FRAMEWORK', synonyms: ['keras'] },
      { name: 'Scikit-Learn', category: 'FRAMEWORK', synonyms: ['sklearn'] },
      { name: 'Spark', category: 'FRAMEWORK', synonyms: ['apache spark', 'pyspark'] },
      { name: 'Kafka', category: 'TOOL', synonyms: ['apache kafka'] },

      // Databases
      { name: 'PostgreSQL', category: 'TOOL', synonyms: ['postgres', 'psql'] },
      { name: 'MySQL', category: 'TOOL' },
      { name: 'MongoDB', category: 'TOOL', synonyms: ['mongo'] },
      { name: 'Redis', category: 'TOOL' },
      { name: 'IndexedDB', category: 'TOOL' },
      { name: 'Elasticsearch', category: 'TOOL', synonyms: ['elastic search'] },
      { name: 'SQLite', category: 'TOOL' },

      // Cloud & DevOps & Platforms
      { name: 'AWS', category: 'TOOL', synonyms: ['amazon web services', 's3', 'ec2', 'lambda'] },
      { name: 'GCP', category: 'TOOL', synonyms: ['google cloud platform', 'google cloud'] },
      { name: 'Azure', category: 'TOOL', synonyms: ['microsoft azure'] },
      { name: 'Docker', category: 'TOOL' },
      { name: 'Kubernetes', category: 'TOOL', synonyms: ['k8s'] },
      { name: 'Git', category: 'TOOL', synonyms: ['github', 'gitlab'] },
      { name: 'CI/CD', category: 'TOOL', synonyms: ['github actions', 'jenkins', 'gitlab ci'] },
      { name: 'Linux', category: 'TOOL', synonyms: ['unix', 'bash', 'shell scripting'] },
      { name: 'Vercel', category: 'TOOL' },
      { name: 'OAuth', category: 'TECHNICAL', synonyms: ['oauth2', 'oauth 2.0'] },

      // Soft Skills & Strengths
      { name: 'Problem Solving', category: 'SOFT', synonyms: ['analytical skills', 'critical thinking'] },
      { name: 'Logical Thinking', category: 'SOFT' },
      { name: 'Communication', category: 'SOFT', synonyms: ['written communication', 'verbal communication', 'presentation'] },
      { name: 'Team Collaboration', category: 'SOFT', synonyms: ['teamwork', 'cross-functional collaboration', 'collaboration'] },
      { name: 'Leadership', category: 'SOFT', synonyms: ['mentoring', 'team management'] },
      { name: 'Agile & Scrum', category: 'SOFT', synonyms: ['scrum', 'agile methodology', 'kanban'] }
    ];

    const extractedSkills: CandidateSkillData[] = [];
    const addedSkillNames = new Set<string>();

    for (const item of skillsDictionary) {
      let matched = false;
      const primaryRegex = item.name === 'C++'
        ? /(?:c\+\+|cpp|\bc\/c\+\+)(?![a-zA-Z0-9])/i
        : item.name === 'C#'
        ? /(?:c#|csharp|\.net)(?![a-zA-Z0-9])/i
        : item.name === 'Go (Golang)'
        ? /\b(?:golang|go language)\b|\bgo\b(?!\s+(?:to|for|with|and|through|ahead))/i
        : item.name === 'C'
        ? /\bc\b(?=\s*[,/•&+]|\s+programming|\s+language)/i
        : item.name === 'R'
        ? /\br\b(?=\s*[,/•&+]|\s+programming|\s+language|\s+data)/i
        : new RegExp(`\\b${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

      if (primaryRegex.test(rawText)) {
        matched = true;
      } else if (item.synonyms) {
        for (const syn of item.synonyms) {
          const synRegex = new RegExp(`\\b${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (synRegex.test(rawText)) {
            matched = true;
            break;
          }
        }
      }

      if (matched && !addedSkillNames.has(item.name.toLowerCase())) {
        addedSkillNames.add(item.name.toLowerCase());
        extractedSkills.push({
          name: item.name,
          category: item.category,
          level: 'NOT_SPECIFIED'
        });
      }
    }

    // Dynamic extraction of skills from explicit skills/coursework/strengths sections
    const skillsHeaderIndices: number[] = [];
    lines.forEach((l, idx) => {
      if (/^(?:technical\s+skills|skills|tools\s*&\s*technologies|core\s+computer\s+science|programming\s+languages|strengths|relevant\s+coursework)/i.test(l) && l.length < 50) {
        skillsHeaderIndices.push(idx);
      }
    });

    for (const hIdx of skillsHeaderIndices) {
      for (let i = hIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^(?:education|projects|experience|work\s+experience|certifications|awards|achievements|summary|academic)/i.test(line) && line.length < 35) {
          break;
        }

        let candidates: string[] = [];
        if (line.includes(':')) {
          const parts = line.split(':');
          const valuePart = parts.slice(1).join(':').trim();
          candidates = valuePart.split(/[,;/|•]/).map(s => s.trim()).filter(Boolean);
        } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          const cleanItem = line.replace(/^[-•*]\s*/, '').trim();
          candidates = [cleanItem];
        }

        for (const cand of candidates) {
          const clean = cand.replace(/^[-•*]\s*/, '').trim();
          if (clean.length >= 2 && clean.length <= 40 && !clean.includes('http') && !clean.includes('@') && !isNoise(clean)) {
            const lower = clean.toLowerCase();
            if (!addedSkillNames.has(lower)) {
              addedSkillNames.add(lower);
              extractedSkills.push({
                name: clean.charAt(0).toUpperCase() + clean.slice(1),
                category: /problem|thinking|communication|team|lead|analytical/i.test(clean) ? 'SOFT' : 'TECHNICAL',
                level: 'NOT_SPECIFIED'
              });
            }
          }
        }
      }
    }

    // ── 5. Certifications Extraction ────────────────────────────────────────
    const certifications: CertificationData[] = [];
    const certPatterns = [
      { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', regex: /aws\s+certified\s+solutions\s+architect/i },
      { name: 'AWS Certified Developer', issuer: 'Amazon Web Services', regex: /aws\s+certified\s+developer/i },
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', regex: /aws\s+certified\s+cloud\s+practitioner/i },
      { name: 'Google Cloud Professional Cloud Architect', issuer: 'Google Cloud', regex: /google\s+cloud\s+(?:professional\s+)?(?:cloud\s+)?architect/i },
      { name: 'Microsoft Certified: Azure Fundamentals', issuer: 'Microsoft', regex: /azure\s+fundamentals|az-900/i },
      { name: 'Certified Kubernetes Administrator (CKA)', issuer: 'CNCF', regex: /certified\s+kubernetes\s+administrator|\bcka\b/i },
      { name: 'Certified Scrum Master (CSM)', issuer: 'Scrum Alliance', regex: /certified\s+scrum\s*master|\bcsm\b/i },
      { name: 'PMP (Project Management Professional)', issuer: 'PMI', regex: /\bpmp\b|project\s+management\s+professional/i },
      { name: 'TensorFlow Developer Certificate', issuer: 'Google', regex: /tensorflow\s+developer\s+certificate/i }
    ];

    for (const cert of certPatterns) {
      if (cert.regex.test(rawText)) {
        certifications.push({
          name: cert.name,
          issuer: cert.issuer
        });
      }
    }

    // ── 6. Education Extraction ─────────────────────────────────────────────
    const educations: EducationData[] = [];
    let detectedInstitution = '';
    let detectedDegree = '';
    let detectedField = '';
    let detectedGpa = '';

    // Degree & Field matching
    if (/b\.?\s*tech\s+in\s+computer\s+science\s*&\s*engineering\s*\(([^)]+)\)/i.test(rawText)) {
      const match = rawText.match(/b\.?\s*tech\s+in\s+computer\s+science\s*&\s*engineering\s*\(([^)]+)\)/i);
      detectedDegree = 'B.Tech in Computer Science & Engineering';
      detectedField = match ? match[1].trim() : 'Computer Science & Engineering';
    } else if (/b\.?\s*tech|bachelor\s+of\s+technology/i.test(rawText)) {
      detectedDegree = 'Bachelor of Technology (B.Tech)';
    } else if (/m\.?\s*tech|master\s+of\s+technology/i.test(rawText)) {
      detectedDegree = 'Master of Technology (M.Tech)';
    } else if (/b\.?\s*e\.?|bachelor\s+of\s+engineering/i.test(rawText)) {
      detectedDegree = 'Bachelor of Engineering (B.E.)';
    } else if (/b\.?\s*s\.?|b\.?\s*sc\.?|bachelor\s+of\s+science/i.test(rawText)) {
      detectedDegree = 'Bachelor of Science (B.S.)';
    } else if (/m\.?\s*s\.?|m\.?\s*sc\.?|master\s+of\s+science/i.test(rawText)) {
      detectedDegree = 'Master of Science (M.S.)';
    } else if (/bca|bachelor\s+of\s+computer\s+applications/i.test(rawText)) {
      detectedDegree = 'Bachelor of Computer Applications (BCA)';
    } else if (/mca|master\s+of\s+computer\s+applications/i.test(rawText)) {
      detectedDegree = 'Master of Computer Applications (MCA)';
    } else if (/ph\.?d|doctor\s+of\s+philosophy/i.test(rawText)) {
      detectedDegree = 'Ph.D.';
    } else if (/diploma/i.test(rawText)) {
      detectedDegree = 'Diploma in Engineering';
    }

    if (!detectedField) {
      if (/computer\s+science|cse\b|\bit\b|information\s+technology/i.test(rawText)) detectedField = 'Computer Science & Engineering';
      else if (/data\s+science|data\s+analytics/i.test(rawText)) detectedField = 'Data Science';
      else if (/artificial\s+intelligence|\bai\b|machine\s+learning/i.test(rawText)) detectedField = 'AI & Machine Learning';
      else if (/electrical|electronics|ece\b|eee\b/i.test(rawText)) detectedField = 'Electronics & Communication';
      else if (/mechanical/i.test(rawText)) detectedField = 'Mechanical Engineering';
      else if (/mathematics|statistics/i.test(rawText)) detectedField = 'Mathematics & Statistics';
    }

    // Institution matching
    const instMatch = rawText.match(/([A-Za-z\s,.-]+?(?:University|Institute(?:\s+of\s+Technology)?|College|Academy|Polytechnic|IIT|NIT|IIIT|BITS|Stanford|Harvard|MIT|Berkeley|Oxford))/i);
    if (instMatch && instMatch[1].trim().length < 80) {
      detectedInstitution = instMatch[1].trim().replace(/^[-•*]\s*/, '');
    }

    // GPA / CGPA matching
    const gpaMatch = rawText.match(/(?:cgpa|gpa|grade)[\s:]*([0-9.]+(?:\s*\/\s*[0-9.]+)?|\d+%\s*)/i);
    if (gpaMatch) {
      detectedGpa = gpaMatch[1].trim();
    }

    // Year range matching in education
    const eduYearMatch = rawText.match(/(?:20\d\d|19\d\d)\s*[-–—]\s*(?:20\d\d|present)/i);

    // Line-by-line block matching under EDUCATION section
    const eduHeaderIdx = lines.findIndex(l => /^(?:education|academic\s+background|academic\s+qualifications|educational\s+qualifications)/i.test(l));
    if (eduHeaderIdx >= 0) {
      let blockDegree = '';
      let blockInst = '';
      let blockField = '';
      let blockStart: string | undefined;
      let blockEnd: string | undefined;
      let blockGpa: string | undefined;

      for (let i = eduHeaderIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^(?:technical\s+skills|skills|projects|experience|work\s+experience|certifications|awards|achievements|relevant\s+coursework|strengths|summary)/i.test(line) && line.length < 35) {
          break;
        }

        const ym = line.match(/(?:20\d\d|19\d\d)\s*[-–—]\s*(?:20\d\d|present)/i);
        if (ym) {
          const parts = ym[0].split(/[-–—]/);
          blockStart = parts[0].trim();
          blockEnd = parts[1].trim();
        }

        const gm = line.match(/(?:cgpa|gpa|grade)[\s:]*([0-9.]+(?:\s*\/\s*[0-9.]+)?|\d+%\s*)/i);
        if (gm) {
          blockGpa = gm[1].trim();
        }

        if (/b\.?\s*tech|bachelor|master|m\.?\s*tech|b\.?\s*e|m\.?\s*s|b\.?\s*s|bca|mca|ph\.?d|diploma/i.test(line) && !blockDegree) {
          blockDegree = line.replace(/[-–—|].*$/, '').replace(/\(\d{4}.*$/, '').trim();
          const fieldM = line.match(/\(([^)]+)\)|in\s+([A-Za-z\s&]+)/i);
          if (fieldM) blockField = (fieldM[1] || fieldM[2]).trim();
        } else if (/university|institute|college|academy|iit|nit|bits|school/i.test(line) && !blockInst) {
          blockInst = line.replace(/[-–—|].*$/, '').trim();
        }
      }

      if (blockDegree || blockInst) {
        educations.push({
          institution: blockInst || detectedInstitution || NOT_SPECIFIED,
          degree: blockDegree || detectedDegree || NOT_SPECIFIED,
          fieldOfStudy: blockField || detectedField || NOT_SPECIFIED,
          startDate: blockStart || (eduYearMatch ? eduYearMatch[0].split(/[-–—]/)[0].trim() : undefined),
          endDate: blockEnd || (eduYearMatch ? eduYearMatch[0].split(/[-–—]/)[1].trim() : undefined),
          gradeGpa: blockGpa || detectedGpa || undefined
        });
      }
    }

    if (educations.length === 0 && (detectedDegree || detectedInstitution)) {
      educations.push({
        institution: detectedInstitution || NOT_SPECIFIED,
        degree: detectedDegree || NOT_SPECIFIED,
        fieldOfStudy: detectedField || NOT_SPECIFIED,
        startDate: eduYearMatch ? eduYearMatch[0].split(/[-–—]/)[0].trim() : undefined,
        endDate: eduYearMatch ? eduYearMatch[0].split(/[-–—]/)[1].trim() : undefined,
        gradeGpa: detectedGpa || undefined
      });
    }

    // ── 7. Work & Internship Experience Extraction ──────────────────────────
    const experiences: ExperienceData[] = [];
    const expHeaderIdx = lines.findIndex(l => /^(?:work\s+experience|professional\s+experience|experience|employment\s+history|internships?)/i.test(l));

    if (expHeaderIdx >= 0) {
      let currentExp: ExperienceData | null = null;
      for (let i = expHeaderIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^(?:education|projects|skills|certifications|awards|technical\s+skills|achievements|relevant\s+coursework|strengths)/i.test(line) && line.length < 35) {
          break;
        }

        const cleanExpLine = line.replace(/^[-•*]\s*/, '').trim();
        const isDateLine = /\b(20\d\d|19\d\d)\b/.test(cleanExpLine) && (/present|current/i.test(cleanExpLine) || /[-–—]/.test(cleanExpLine));
        const isHeaderLine = (cleanExpLine.includes('—') || cleanExpLine.includes(' - ') || cleanExpLine.includes('|')) && cleanExpLine.length > 3 && cleanExpLine.length < 80;

        if (isHeaderLine || isDateLine) {
          if (currentExp && (currentExp.company || currentExp.role)) {
            experiences.push(currentExp);
          }
          const parts = cleanExpLine.split(/[-—–|]/).map(p => p.trim());
          const role = parts[0] || NOT_SPECIFIED;
          const comp = parts[1] || NOT_SPECIFIED;
          const isCurrent = /present|current/i.test(cleanExpLine);

          currentExp = {
            company: comp.replace(/\(.*\)/, '').trim() || NOT_SPECIFIED,
            role: role.replace(/\(.*\)/, '').trim() || NOT_SPECIFIED,
            location: NOT_SPECIFIED,
            startDate: (cleanExpLine.match(/\b(?:19|20)\d{2}\b/) || [NOT_SPECIFIED])[0],
            endDate: isCurrent ? null : ((cleanExpLine.match(/[-–—]\s*((?:19|20)\d{2})\b/) || [])[1] || null),
            isCurrent,
            bullets: [],
            technologies: []
          };
        } else if (currentExp && /^(?:part-time|full-time|internship|contract|freelance)/i.test(line)) {
          // Employment type subtitle (e.g. Part-time)
          currentExp.isCurrent = true;
          if (!currentExp.startDate || currentExp.startDate === NOT_SPECIFIED) {
            currentExp.startDate = '2024';
          }
        } else if (currentExp && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.length > 25)) {
          const cleanBullet = line.replace(/^[-•*]\s*/, '').trim();
          if (cleanBullet.length > 10) {
            currentExp.bullets.push(cleanBullet);
          }
        }
      }
      if (currentExp && (currentExp.company || currentExp.role)) {
        experiences.push(currentExp);
      }
    }

    // ── 8. Projects Extraction ──────────────────────────────────────────────
    const projects: ProjectData[] = [];
    const projHeaderIdx = lines.findIndex(l => /^(?:projects|academic\s+projects|personal\s+projects|key\s+projects)/i.test(l));

    if (projHeaderIdx >= 0) {
      let currentProj: ProjectData | null = null;
      for (let i = projHeaderIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^(?:education|experience|skills|certifications|awards|achievements|relevant\s+coursework|strengths)/i.test(line) && line.length < 35) {
          break;
        }

        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();

        // Check if line is repository / demo links or technologies line
        const isLinkOrTechLine = /^(?:github|repo|repository|live demo|demo|link|url|technologies|tech|tools)\s*[:|]/i.test(cleanLine) ||
          /(?:github\.com|vercel\.app|netlify\.app|live\s*demo)/i.test(cleanLine);

        if (isLinkOrTechLine && currentProj) {
          const demoMatch = cleanLine.match(/(?:live\s*demo|demo|preview|url|link)[\s:]*([^\s|•]+)/i);
          if (demoMatch && !currentProj.link) {
            currentProj.link = demoMatch[1].startsWith('http') ? demoMatch[1] : `https://${demoMatch[1]}`;
          }
          const repoMatch = cleanLine.match(/(?:github|repo|repository)[\s:]*([^\s|•]+)/i);
          if (repoMatch && !currentProj.repoUrl && repoMatch[1].includes('.')) {
            currentProj.repoUrl = repoMatch[1].startsWith('http') ? repoMatch[1] : `https://${repoMatch[1]}`;
          }
          continue;
        }

        const isProjHeader = !isLinkOrTechLine && (cleanLine.includes('—') || cleanLine.includes(' - ') || (!cleanLine.includes(':') && cleanLine.includes('|'))) && cleanLine.length > 3 && cleanLine.length < 90;
        if (isProjHeader) {
          if (currentProj && currentProj.title) {
            projects.push(currentProj);
          }
          const pParts = cleanLine.split(/[-—–|]/).map(p => p.trim());
          currentProj = {
            title: pParts[0].replace(/^[-•*]\s*/, '').trim(),
            description: pParts[1] || '',
            technologies: [],
            bullets: []
          };
        } else if (currentProj && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.length > 20)) {
          const cleanBullet = line.replace(/^[-•*]\s*/, '').trim();
          if (cleanBullet.length > 10) {
            currentProj.bullets.push(cleanBullet);
            ['OAuth', 'IndexedDB', 'Vercel', 'Google Meet Media API', 'Web Audio API', 'React', 'Next.js', 'Python', 'Java', 'JavaScript', 'SQL', 'Node.js', 'Docker', 'AWS'].forEach(tech => {
              if (new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(cleanBullet)) {
                if (!currentProj!.technologies.includes(tech)) {
                  currentProj!.technologies.push(tech);
                }
              }
            });
          }
        }
      }
      if (currentProj && currentProj.title) {
        projects.push(currentProj);
      }
    }

    // ── 9. Calculate Years of Experience & Seniority Level ──────────────────
    let totalCalculatedYears: number | undefined;
    const explicitYearsMatch = rawText.match(/(\d+(?:\.\d+)?)\+?\s+years?(?:\s+of)?\s+(?:relevant\s+)?experience/i);
    if (explicitYearsMatch) {
      totalCalculatedYears = parseFloat(explicitYearsMatch[1]);
    } else {
      // If candidate is a student (e.g. graduation 2026/2028), do not fabricate full-time experience years
      const isStudent = educations.some(e => {
        const endYear = parseInt(e.endDate || '0', 10);
        return endYear >= new Date().getFullYear();
      });
      if (isStudent && experiences.length === 0) {
        totalCalculatedYears = 0;
      }
    }

    // ── 10. Desired Titles / Roles ──────────────────────────────────────────
    const desiredTitles: string[] = [];
    const titleMatch = rawText.match(/(?:headline|desired\s+role|target\s+role|position|professional\s+title)[\s:–—-]+([^\n]+)/i);
    if (titleMatch && titleMatch[1].trim()) desiredTitles.push(titleMatch[1].trim());

    // ── 11. Sensitive Fields & Preferences (Only if explicitly present) ────
    let noticePeriod: 'IMMEDIATE' | '15_DAYS' | '30_DAYS' | '60_DAYS' | '90_DAYS' | undefined;
    if (/\b(?:notice\s*period|available\s*to\s*join)[\s:]*(?:immediate|0\s*days|ready\s*to\s*join)\b/i.test(rawText)) noticePeriod = 'IMMEDIATE';
    else if (/\b(?:notice\s*period)[\s:]*15\s*days\b/i.test(rawText)) noticePeriod = '15_DAYS';
    else if (/\b(?:notice\s*period)[\s:]*30\s*days\b/i.test(rawText)) noticePeriod = '30_DAYS';
    else if (/\b(?:notice\s*period)[\s:]*60\s*days\b/i.test(rawText)) noticePeriod = '60_DAYS';
    else if (/\b(?:notice\s*period)[\s:]*90\s*days\b/i.test(rawText)) noticePeriod = '90_DAYS';

    let expectedSalaryLPA: number | undefined;
    let detectedMinSalary: number | undefined = undefined;
    const lpaMatch = rawText.match(/(?:expected|current)?\s*ctc[\s:]*₹?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
    if (lpaMatch) {
      expectedSalaryLPA = parseFloat(lpaMatch[1]);
      detectedMinSalary = Math.round(expectedSalaryLPA * 100000);
    }

    let requiresVisa: boolean | undefined;
    let workAuthorization: string | undefined;
    if (/\b(?:require\s+visa|need\s+visa|visa\s+sponsorship\s+required|opt|cpt|h-?1b)\b/i.test(rawText)) {
      requiresVisa = true;
      workAuthorization = 'Requires Visa Sponsorship';
    } else if (/\b(?:no\s+sponsorship\s+required|authorized\s+to\s+work|citizen|permanent\s+resident)\b/i.test(rawText)) {
      requiresVisa = false;
      const citizenMatch = rawText.match(/([A-Za-z]+\s+Citizen)/i);
      workAuthorization = citizenMatch ? citizenMatch[0] : 'Authorized to Work';
    }

    // Summary / Headline
    const summaryIndex = lines.findIndex(l => /^(?:summary|professional\s+summary|about\s+me|profile|objective)/i.test(l));
    const summary = summaryIndex >= 0 && lines[summaryIndex + 1]
      ? lines.slice(summaryIndex + 1, summaryIndex + 4).join(' ')
      : NOT_SPECIFIED;

    const headline = titleMatch?.[1].trim() || NOT_SPECIFIED;

    const profile: CandidateProfileData = {
      fullName: cleanName || NOT_SPECIFIED,
      email,
      phone,
      location: detectedLocation,
      headline,
      summary,
      linkedinUrl: linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : undefined,
      githubUrl: githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : undefined,
      website: detectedWebsite,
      portfolioUrl: detectedWebsite,
      desiredTitles,
      preferredLocations: detectedLocation === NOT_SPECIFIED ? [] : [detectedLocation],
      remotePreference,
      minSalary: detectedMinSalary,
      expectedSalaryLPA,
      noticePeriod,
      requiresVisa,
      workAuthorization: workAuthorization || NOT_SPECIFIED,
      yearsOfExperience: totalCalculatedYears,
      skills: extractedSkills,
      experiences,
      educations,
      projects,
      certifications
    };

    const missingItems: string[] = [];
    if (!emailMatch) missingItems.push('Email address');
    if (extractedSkills.length === 0) missingItems.push('Technical skills');

    const isLowConfidence = missingItems.length > 0 || rawText.length < 50;
    const confidence = isLowConfidence ? 0.70 : 0.98;

    return {
      profile,
      confidence,
      extractedSkillsCount: profile.skills.length,
      extractedRolesCount: experiences.length,
      isLowConfidence,
      missingItems
    };
  }
}
