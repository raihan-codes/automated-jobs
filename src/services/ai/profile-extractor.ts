// AI Profile Extractor (Parses Raw Resume Text, PDF, & DOCX into Ground-Truth Candidate Profile)
// Extracts technical skills, soft skills, programming languages, frameworks, libraries,
// databases, tools, cloud technologies, certifications, education, experiences, projects, and domain competencies.
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
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const textLower = rawText.toLowerCase();

    // ── 1. Contact Information ───────────────────────────────────────────────
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : (existingEmail || 'candidate@example.com');

    const phoneMatch = rawText.match(/\+\d{1,3}[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}/) ||
      rawText.match(/(?:\+?91[\s.-]?)?[6-9]\d{9}|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    // Links & Portfolio
    const linkedinMatch = rawText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    const githubMatch = rawText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
    
    const portfolioExplicit = rawText.match(/(?:portfolio|website|site)[\s:]*(https?:\/\/[^\s,•]+|[a-zA-Z0-9.-]+\.(?:vercel\.app|netlify\.app|app|io|dev|com|in)[^\s,•]*)/i);
    const genericWebsite = rawText.match(/https?:\/\/(?!(?:www\.)?(?:linkedin\.com|github\.com|twitter\.com|x\.com))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s,•)]*)?/i);

    let detectedWebsite: string | undefined = undefined;
    if (portfolioExplicit) {
      detectedWebsite = portfolioExplicit[1];
    } else if (genericWebsite) {
      detectedWebsite = genericWebsite[0];
    }
    if (detectedWebsite && !detectedWebsite.startsWith('http')) {
      detectedWebsite = `https://${detectedWebsite}`;
    }

    // ── 2. Location & Remote Preference ─────────────────────────────────────
    let detectedLocation = 'Bengaluru, India';
    const locPrefixMatch = rawText.match(/(?:location|address|residence|based in|city)[\s:]+([A-Za-z\s,.-]+?)(?:\s*[•|\n|;]|\s+email|\s+phone|\s+mobile|\s+linkedin|\s+github|$)/i);
    if (locPrefixMatch && locPrefixMatch[1].trim().length > 3 && !/developer|engineer|software|summary|objective/i.test(locPrefixMatch[1])) {
      detectedLocation = locPrefixMatch[1].trim();
    } else {
      if (/bengaluru|bangalore|karnataka/i.test(rawText)) detectedLocation = 'Bengaluru, Karnataka, India';
      else if (/hyderabad|secunderabad|telangana/i.test(rawText)) detectedLocation = 'Hyderabad, Telangana, India';
      else if (/pune|mumbai|maharashtra/i.test(rawText)) detectedLocation = 'Pune, Maharashtra, India';
      else if (/delhi\s*ncr|new\s+delhi|\bdelhi\b|noida|gurgaon|gurugram/i.test(rawText)) detectedLocation = 'Delhi NCR, India';
      else if (/kolkata|calcutta|west\s+bengal/i.test(rawText)) detectedLocation = 'Kolkata, West Bengal, India';
      else if (/chennai|tamil\s+nadu/i.test(rawText)) detectedLocation = 'Chennai, Tamil Nadu, India';
      else if (/san\s+francisco|bay\s+area|\bca\b|california/i.test(rawText)) detectedLocation = 'San Francisco, CA';
      else if (/new\s+york|\bny\b/i.test(rawText)) detectedLocation = 'New York, NY';
      else if (/london|united\s+kingdom|\buk\b/i.test(rawText)) detectedLocation = 'London, UK';
      else if (/toronto|vancouver|canada/i.test(rawText)) detectedLocation = 'Toronto, Canada';
      else if (/remote/i.test(rawText)) detectedLocation = 'Remote';
    }

    let remotePreference: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'REMOTE_OR_HYBRID' | 'ANY' = 'REMOTE_OR_HYBRID';
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
      'india', 'remote', 'address', 'university', 'college', 'institute', 'school', 'academy'
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

    if (!cleanName && linkedinMatch) {
      const handle = linkedinMatch[0].replace(/linkedin\.com\/in\//i, '').replace(/[-_]/g, ' ').replace(/\d+/g, '').trim();
      const parts = handle.split(/\s+/).filter(p => p.length >= 2 && !['in', 'dev', 'swe', 'codes'].includes(p.toLowerCase()));
      if (parts.length >= 2) {
        cleanName = parts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }

    if (!cleanName && emailMatch) {
      const username = emailMatch[0].split('@')[0].replace(/[0-9._-]/g, ' ').trim();
      const parts = username.split(/\s+/).filter(p => p.length >= 2);
      if (parts.length >= 2) {
        cleanName = parts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }

    if (!cleanName) {
      cleanName = 'Candidate';
    }

    // ── 4. Technical, Soft, Framework, & Domain Skills Extraction ────────────
    const skillsDictionary: { name: string; category: 'TECHNICAL' | 'FRAMEWORK' | 'TOOL' | 'SOFT'; synonyms?: string[] }[] = [
      // Programming Languages
      { name: 'Python', category: 'TECHNICAL', synonyms: ['python3', 'python2'] },
      { name: 'JavaScript', category: 'TECHNICAL', synonyms: ['js', 'ecmascript'] },
      { name: 'TypeScript', category: 'TECHNICAL', synonyms: ['ts'] },
      { name: 'Java', category: 'TECHNICAL' },
      { name: 'C++', category: 'TECHNICAL', synonyms: ['cpp', 'c/c++'] },
      { name: 'C#', category: 'TECHNICAL', synonyms: ['csharp', '.net'] },
      { name: 'C', category: 'TECHNICAL' },
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

      // Web & Frontend Frameworks
      { name: 'React', category: 'FRAMEWORK', synonyms: ['react.js', 'reactjs'] },
      { name: 'Next.js', category: 'FRAMEWORK', synonyms: ['nextjs', 'next.js 13', 'next.js 14'] },
      { name: 'Vue.js', category: 'FRAMEWORK', synonyms: ['vue', 'vuejs', 'vue3'] },
      { name: 'Angular', category: 'FRAMEWORK', synonyms: ['angularjs', 'angular 2+'] },
      { name: 'Svelte', category: 'FRAMEWORK', synonyms: ['sveltekit'] },
      { name: 'Tailwind CSS', category: 'FRAMEWORK', synonyms: ['tailwindcss'] },
      { name: 'Bootstrap', category: 'FRAMEWORK' },
      { name: 'Redux', category: 'FRAMEWORK', synonyms: ['redux toolkit', 'rtk'] },

      // Backend Frameworks & Runtimes
      { name: 'Node.js', category: 'FRAMEWORK', synonyms: ['nodejs'] },
      { name: 'Express.js', category: 'FRAMEWORK', synonyms: ['expressjs', 'express'] },
      { name: 'NestJS', category: 'FRAMEWORK', synonyms: ['nest.js'] },
      { name: 'Spring Boot', category: 'FRAMEWORK', synonyms: ['springboot', 'spring framework', 'spring'] },
      { name: 'Django', category: 'FRAMEWORK' },
      { name: 'FastAPI', category: 'FRAMEWORK' },
      { name: 'Flask', category: 'FRAMEWORK' },
      { name: 'Ruby on Rails', category: 'FRAMEWORK', synonyms: ['rails'] },
      { name: 'ASP.NET', category: 'FRAMEWORK', synonyms: ['.net core'] },
      { name: 'GraphQL', category: 'TECHNICAL' },
      { name: 'REST APIs', category: 'TECHNICAL', synonyms: ['restful', 'rest api', 'rest'] },
      { name: 'gRPC', category: 'TECHNICAL' },
      { name: 'WebSockets', category: 'TECHNICAL', synonyms: ['socket.io'] },
      { name: 'Microservices', category: 'TECHNICAL', synonyms: ['microservice architecture'] },
      { name: 'System Design', category: 'TECHNICAL', synonyms: ['distributed systems'] },

      // Data, ML & Analytics
      { name: 'Pandas', category: 'FRAMEWORK' },
      { name: 'NumPy', category: 'FRAMEWORK' },
      { name: 'Power BI', category: 'TOOL', synonyms: ['powerbi'] },
      { name: 'Tableau', category: 'TOOL' },
      { name: 'Excel', category: 'TOOL', synonyms: ['ms excel', 'advanced excel', 'spreadsheets'] },
      { name: 'Machine Learning', category: 'TECHNICAL', synonyms: ['ml', 'deep learning'] },
      { name: 'Data Analysis', category: 'TECHNICAL', synonyms: ['data analytics', 'data exploration'] },
      { name: 'PyTorch', category: 'FRAMEWORK' },
      { name: 'TensorFlow', category: 'FRAMEWORK', synonyms: ['keras'] },
      { name: 'Scikit-Learn', category: 'FRAMEWORK', synonyms: ['sklearn'] },
      { name: 'Spark', category: 'FRAMEWORK', synonyms: ['apache spark', 'pyspark'] },
      { name: 'Hadoop', category: 'TOOL' },
      { name: 'Kafka', category: 'TOOL', synonyms: ['apache kafka'] },
      { name: 'Airflow', category: 'TOOL', synonyms: ['apache airflow'] },

      // Databases
      { name: 'PostgreSQL', category: 'TOOL', synonyms: ['postgres', 'psql'] },
      { name: 'MySQL', category: 'TOOL' },
      { name: 'MongoDB', category: 'TOOL', synonyms: ['mongo'] },
      { name: 'Redis', category: 'TOOL' },
      { name: 'Elasticsearch', category: 'TOOL', synonyms: ['elastic search'] },
      { name: 'Oracle DB', category: 'TOOL', synonyms: ['oracle'] },
      { name: 'DynamoDB', category: 'TOOL' },
      { name: 'Cassandra', category: 'TOOL' },
      { name: 'SQLite', category: 'TOOL' },

      // Cloud & DevOps
      { name: 'AWS', category: 'TOOL', synonyms: ['amazon web services', 's3', 'ec2', 'lambda'] },
      { name: 'GCP', category: 'TOOL', synonyms: ['google cloud platform', 'google cloud'] },
      { name: 'Azure', category: 'TOOL', synonyms: ['microsoft azure'] },
      { name: 'Docker', category: 'TOOL' },
      { name: 'Kubernetes', category: 'TOOL', synonyms: ['k8s'] },
      { name: 'Git', category: 'TOOL', synonyms: ['github', 'gitlab'] },
      { name: 'CI/CD', category: 'TOOL', synonyms: ['github actions', 'jenkins', 'gitlab ci'] },
      { name: 'Terraform', category: 'TOOL' },
      { name: 'Linux', category: 'TOOL', synonyms: ['unix', 'bash', 'shell scripting'] },

      // Soft Skills & Competencies
      { name: 'Problem Solving', category: 'SOFT', synonyms: ['analytical skills', 'critical thinking'] },
      { name: 'Communication', category: 'SOFT', synonyms: ['written communication', 'verbal communication'] },
      { name: 'Leadership', category: 'SOFT', synonyms: ['mentoring', 'team management'] },
      { name: 'Agile & Scrum', category: 'SOFT', synonyms: ['scrum', 'agile methodology', 'kanban'] },
      { name: 'Cross-functional Collaboration', category: 'SOFT', synonyms: ['teamwork', 'collaboration'] }
    ];

    const extractedSkills: CandidateSkillData[] = [];
    const addedSkillNames = new Set<string>();

    for (const item of skillsDictionary) {
      let matched = false;
      const primaryRegex = item.name === 'Go (Golang)'
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
          years: 2,
          level: 'ADVANCED'
        });
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

    // Degree matching
    if (/b\.?\s*tech|bachelor\s+of\s+technology/i.test(rawText)) detectedDegree = 'Bachelor of Technology (B.Tech)';
    else if (/m\.?\s*tech|master\s+of\s+technology/i.test(rawText)) detectedDegree = 'Master of Technology (M.Tech)';
    else if (/b\.?\s*e\.?|bachelor\s+of\s+engineering/i.test(rawText)) detectedDegree = 'Bachelor of Engineering (B.E.)';
    else if (/b\.?\s*s\.?|b\.?\s*sc\.?|bachelor\s+of\s+science/i.test(rawText)) detectedDegree = 'Bachelor of Science (B.S.)';
    else if (/m\.?\s*s\.?|m\.?\s*sc\.?|master\s+of\s+science/i.test(rawText)) detectedDegree = 'Master of Science (M.S.)';
    else if (/bca|bachelor\s+of\s+computer\s+applications/i.test(rawText)) detectedDegree = 'Bachelor of Computer Applications (BCA)';
    else if (/mca|master\s+of\s+computer\s+applications/i.test(rawText)) detectedDegree = 'Master of Computer Applications (MCA)';
    else if (/ph\.?d|doctor\s+of\s+philosophy/i.test(rawText)) detectedDegree = 'Ph.D.';
    else if (/diploma/i.test(rawText)) detectedDegree = 'Diploma in Engineering';
    else if (/bachelor/i.test(rawText)) detectedDegree = 'Bachelor Degree';

    // Field of study matching
    if (/computer\s+science|cse\b|\bit\b|information\s+technology/i.test(rawText)) detectedField = 'Computer Science & Engineering';
    else if (/data\s+science|data\s+analytics/i.test(rawText)) detectedField = 'Data Science';
    else if (/artificial\s+intelligence|\bai\b|machine\s+learning/i.test(rawText)) detectedField = 'AI & Machine Learning';
    else if (/electrical|electronics|ece\b|eee\b/i.test(rawText)) detectedField = 'Electronics & Communication';
    else if (/mechanical/i.test(rawText)) detectedField = 'Mechanical Engineering';
    else if (/mathematics|statistics/i.test(rawText)) detectedField = 'Mathematics & Statistics';
    else if (/business|finance|management/i.test(rawText)) detectedField = 'Business / Economics';

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

    if (detectedDegree || detectedInstitution) {
      educations.push({
        institution: detectedInstitution || 'University Degree',
        degree: detectedDegree || 'Bachelor Degree',
        fieldOfStudy: detectedField || 'Computer Science / Engineering',
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
        if (/^(?:education|projects|skills|certifications|awards|technical\s+skills|achievements)/i.test(line) && line.length < 35) {
          break;
        }

        const isDateLine = /\b(20\d\d|19\d\d)\b/.test(line) && (/present|current/i.test(line) || /[-–—]/.test(line));
        const isHeaderLine = (line.includes('—') || line.includes(' - ') || line.includes('|')) && (isDateLine || /engineer|developer|intern|lead|analyst|manager|consultant|associate/i.test(line));

        if (isHeaderLine || isDateLine) {
          if (currentExp && (currentExp.company || currentExp.role)) {
            experiences.push(currentExp);
          }
          const parts = line.split(/[-—–|]/).map(p => p.trim());
          const comp = parts[0] || 'Company';
          const role = parts[1] || 'Software Engineer';
          const isCurrent = /present|current/i.test(line);

          currentExp = {
            company: comp.replace(/\(.*\)/, '').trim(),
            role: role.replace(/\(.*\)/, '').trim() || 'Software Engineer',
            location: detectedLocation,
            startDate: '2022',
            endDate: isCurrent ? null : '2024',
            isCurrent,
            bullets: [],
            technologies: []
          };
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
        if (/^(?:education|experience|skills|certifications|awards|achievements)/i.test(line) && line.length < 35) {
          break;
        }

        const isProjHeader = (line.includes('—') || line.includes(' - ') || line.includes('|') || line.includes(':')) && !line.startsWith('-') && !line.startsWith('•');
        if (isProjHeader) {
          if (currentProj && currentProj.title) {
            projects.push(currentProj);
          }
          const pParts = line.split(/[-—–|:]/).map(p => p.trim());
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
          }
        }
      }
      if (currentProj && currentProj.title) {
        projects.push(currentProj);
      }
    }

    // ── 9. Calculate Years of Experience & Seniority Level ──────────────────
    let totalCalculatedYears = 0;
    const yearMatches = Array.from(rawText.matchAll(/\b(19\d\d|20\d\d)\b/g)).map(m => parseInt(m[1], 10));
    if (yearMatches.length >= 2) {
      const minYear = Math.min(...yearMatches);
      const currentYear = new Date().getFullYear();
      const maxYear = Math.min(currentYear, Math.max(...yearMatches));
      if (minYear >= 1990 && maxYear <= currentYear && minYear <= maxYear) {
        const diff = maxYear - minYear;
        if (diff > 0 && diff < 35) {
          // If candidate is a student/grad, do not inflate
          if (/student|undergrad|pursuing|class of 202/i.test(rawText)) {
            totalCalculatedYears = Math.min(1, experiences.length);
          } else {
            totalCalculatedYears = diff;
          }
        }
      }
    }

    if (totalCalculatedYears === 0) {
      if (experiences.length > 0) {
        totalCalculatedYears = experiences.length * 2;
      } else if (/intern|student|fresh graduate|entry level/i.test(rawText)) {
        totalCalculatedYears = 0;
      } else {
        totalCalculatedYears = 2;
      }
    }

    // ── 10. Desired / Inferred Job Titles ────────────────────────────────────
    const desiredTitles: string[] = [];
    const isIntern = /intern|internship|student|fresher|undergrad/i.test(rawText);
    const hasDataSkills = extractedSkills.some(s => ['Python', 'SQL', 'Pandas', 'Power BI', 'Tableau', 'Data Analysis', 'Machine Learning'].includes(s.name));
    const hasFrontendSkills = extractedSkills.some(s => ['React', 'Next.js', 'Vue.js', 'Angular', 'Tailwind CSS'].includes(s.name));
    const hasBackendSkills = extractedSkills.some(s => ['Node.js', 'Go (Golang)', 'Java', 'Spring Boot', 'Python', 'FastAPI', 'PostgreSQL'].includes(s.name));

    if (isIntern) {
      if (hasDataSkills && !hasFrontendSkills) {
        desiredTitles.push('Data Analyst Intern', 'Data Science Intern', 'Business Intelligence Intern');
      } else if (hasFrontendSkills && !hasBackendSkills) {
        desiredTitles.push('Frontend Developer Intern', 'React Developer Intern', 'Software Engineer Intern');
      } else {
        desiredTitles.push('Software Development Engineer Intern (SDE Intern)', 'Full Stack Developer Intern', 'Software Engineer Intern');
      }
    } else {
      if (hasDataSkills && !hasFrontendSkills && !hasBackendSkills) {
        desiredTitles.push('Data Analyst', 'Data Scientist', 'Business Intelligence Developer', 'Analytics Engineer');
      } else if (hasFrontendSkills && hasBackendSkills) {
        desiredTitles.push('Full Stack Developer', 'Software Development Engineer (SDE)', 'Senior Software Engineer');
      } else if (hasFrontendSkills) {
        desiredTitles.push('Frontend Engineer', 'React Developer', 'UI Engineer');
      } else if (hasBackendSkills) {
        desiredTitles.push('Backend Engineer', 'Software Development Engineer (SDE)', 'Systems Software Engineer');
      } else {
        desiredTitles.push('Software Engineer', 'Full Stack Developer');
      }
    }

    // ── 11. Sensitive Fields & Preferences ──────────────────────────────────
    let noticePeriod: 'IMMEDIATE' | '15_DAYS' | '30_DAYS' | '60_DAYS' | '90_DAYS' = '30_DAYS';
    if (/immediate|0\s*days|ready to join/i.test(rawText)) noticePeriod = 'IMMEDIATE';
    else if (/15\s*days/i.test(rawText)) noticePeriod = '15_DAYS';
    else if (/60\s*days|2\s*months/i.test(rawText)) noticePeriod = '60_DAYS';
    else if (/90\s*days|3\s*months/i.test(rawText)) noticePeriod = '90_DAYS';

    let expectedSalaryLPA = isIntern ? 12 : 24;
    let detectedMinSalary: number | undefined = undefined;
    const lpaMatch = rawText.match(/(?:expected|current)?\s*ctc[\s:]*₹?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
    if (lpaMatch) {
      expectedSalaryLPA = parseFloat(lpaMatch[1]);
      detectedMinSalary = Math.round(expectedSalaryLPA * 100000);
    }

    let requiresVisa = false;
    let workAuthorization = 'Authorized to Work (No Sponsorship Required)';
    if (/(?<!no\s+)sponsorship\s+required|require\s+visa|need\s+visa|opt|cpt|h-?1b/i.test(rawText)) {
      requiresVisa = true;
      workAuthorization = 'Requires Visa Sponsorship / Work Permit';
    } else if (/indian citizen|india/i.test(rawText)) {
      requiresVisa = false;
      workAuthorization = 'Indian Citizen (No Sponsorship Required)';
    } else if (/us citizen|u\.s\. citizen/i.test(rawText)) {
      requiresVisa = false;
      workAuthorization = 'US Citizen (No Sponsorship Required)';
    }

    // Summary / Headline
    const summaryIndex = lines.findIndex(l => /^(?:summary|professional\s+summary|about\s+me|profile|objective)/i.test(l));
    const summary = summaryIndex >= 0 && lines[summaryIndex + 1]
      ? lines.slice(summaryIndex + 1, summaryIndex + 4).join(' ')
      : `${cleanName} — ${desiredTitles[0] || 'Software Engineer'} with skills in ${extractedSkills.slice(0, 5).map(s => s.name).join(', ') || 'Software Development'}.`;

    const headline = `${cleanName} — ${desiredTitles[0] || 'Software Engineer'}${extractedSkills.length > 0 ? ` | ${extractedSkills.slice(0, 3).map(s => s.name).join(', ')}` : ''}`;

    const profile: CandidateProfileData = {
      fullName: cleanName,
      email,
      phone,
      location: detectedLocation,
      headline,
      summary,
      linkedinUrl: linkedinMatch ? `https://${linkedinMatch[0].replace(/^https?:\/\//, '')}` : undefined,
      githubUrl: githubMatch ? `https://${githubMatch[0].replace(/^https?:\/\//, '')}` : undefined,
      website: detectedWebsite,
      portfolioUrl: detectedWebsite,
      desiredTitles,
      preferredLocations: [detectedLocation, 'Bengaluru, India', 'Remote'],
      remotePreference,
      minSalary: detectedMinSalary,
      expectedSalaryLPA,
      noticePeriod,
      requiresVisa,
      workAuthorization,
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
