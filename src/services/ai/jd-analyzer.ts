// Job Description (JD) Analyzer & Constraint Evaluator
import { CandidateProfileData, NormalizedJobPosting } from '@/types';

export interface HardFilterResult {
  passed: boolean;
  reason?: string;
}

export interface JDRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  yearsRequired: number;
  seniority: 'INTERN' | 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD';
  requiredDegree?: string;
  isInternship: boolean;
  domainKeywords: string[];
}

export class JDAnalyzer {
  /**
   * Fast, low-cost hard filters for candidate preferences (remote, visa, salary, employment type).
   */
  public static evaluateHardFilters(
    candidate: CandidateProfileData,
    job: NormalizedJobPosting
  ): HardFilterResult {
    // 1. Remote / Strict Location Constraints
    if (candidate.remotePreference === 'REMOTE' && !job.isRemote) {
      const jobLoc = (job.location || '').toLowerCase();
      const candLoc = (candidate.location || '').toLowerCase();
      const inSameCity = candLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc));

      if (!inSameCity && !candLoc.includes('remote')) {
        return {
          passed: false,
          reason: `Requires onsite presence in "${job.location}" but candidate preferred remote only.`
        };
      }
    }

    // 2. Visa Sponsorship Requirements
    if (candidate.requiresVisa && job.visaAllowed === false) {
      return {
        passed: false,
        reason: 'Job posting explicitly does not provide visa sponsorship.'
      };
    }

    // 3. Minimum Salary Filter
    if (candidate.minSalary && job.salaryMax && job.salaryMax < candidate.minSalary) {
      return {
        passed: false,
        reason: `Maximum salary (${job.salaryCurrency} ${job.salaryMax.toLocaleString()}) is below candidate's minimum target (${job.salaryCurrency} ${candidate.minSalary.toLocaleString()}).`
      };
    }

    // 4. Internship vs Full-Time
    const isInternJob = job.employmentType === 'INTERNSHIP' || /intern|internship/i.test(job.title);
    const isExperiencedCandidate = candidate.yearsOfExperience >= 3;
    if (isInternJob && isExperiencedCandidate && !candidate.desiredTitles.some(t => /intern/i.test(t))) {
      return {
        passed: false,
        reason: 'Internship role filtered for experienced candidate.'
      };
    }

    return { passed: true };
  }

  /**
   * Extracts comprehensive tech stack, requirements, and keywords from JD title & description
   */
  public static extractRequirements(titleAndDescriptionText: string): JDRequirements {
    const textLower = titleAndDescriptionText.toLowerCase();

    const skillsCatalog = [
      // Languages
      { name: 'Python', regex: /\bpython(?:3|2)?\b/i },
      { name: 'SQL', regex: /\bsql\b|\bstructured query language\b|\bpl\/sql\b|\bt-sql\b/i },
      { name: 'JavaScript', regex: /\bjavascript\b|\bjs\b|\becmascript\b/i },
      { name: 'TypeScript', regex: /\btypescript\b|\bts\b/i },
      { name: 'Java', regex: /\bjava\b(?!\s*script)/i },
      { name: 'C++', regex: /\bc\+\+\b|\bcpp\b/i },
      { name: 'C#', regex: /\bc#\b|\bcsharp\b|\b\.net\b/i },
      { name: 'C', regex: /\bc\b(?=\s*[,/•&+]|\s+programming|\s+language)/i },
      { name: 'Go (Golang)', regex: /\bgolang\b|\bgo\b(?!\s+(?:to|for|with|and|through|ahead))/i },
      { name: 'Rust', regex: /\brust\b/i },
      { name: 'PHP', regex: /\bphp\b/i },
      { name: 'Ruby', regex: /\bruby\b/i },
      { name: 'Swift', regex: /\bswift\b/i },
      { name: 'Kotlin', regex: /\bkotlin\b/i },
      { name: 'Scala', regex: /\bscala\b/i },
      { name: 'R', regex: /\br\b(?=\s*[,/•&+]|\s+programming|\s+language|\s+data)/i },
      { name: 'HTML5', regex: /\bhtml(?:5)?\b/i },
      { name: 'CSS3', regex: /\bcss(?:3)?\b/i },

      // Data, ML & BI
      { name: 'Pandas', regex: /\bpandas\b/i },
      { name: 'NumPy', regex: /\bnumpy\b/i },
      { name: 'Power BI', regex: /\bpower\s*bi\b/i },
      { name: 'Tableau', regex: /\btableau\b/i },
      { name: 'Excel', regex: /\bexcel\b|\bms excel\b|\bspreadsheets\b/i },
      { name: 'Machine Learning', regex: /\bmachine\s+learning\b|\bdeep\s+learning\b|\bml\b/i },
      { name: 'Data Analysis', regex: /\bdata\s+analys(?:is|t)\b|\bdata\s+analytics\b/i },
      { name: 'PyTorch', regex: /\bpytorch\b/i },
      { name: 'TensorFlow', regex: /\btensorflow\b|\bkeras\b/i },
      { name: 'Scikit-Learn', regex: /\bscikit[- ]learn\b|\bsklearn\b/i },
      { name: 'Spark', regex: /\bspark\b|\bpyspark\b/i },
      { name: 'Hadoop', regex: /\bhadoop\b/i },
      { name: 'Airflow', regex: /\bairflow\b/i },

      // Frameworks & Web
      { name: 'React', regex: /\breact(?:js|\.js)?\b/i },
      { name: 'Next.js', regex: /\bnext(?:\.js|js)?\b/i },
      { name: 'Node.js', regex: /\bnode(?:\.js|js)?\b/i },
      { name: 'Express.js', regex: /\bexpress(?:\.js|js)?\b/i },
      { name: 'NestJS', regex: /\bnest(?:\.js|js)?\b/i },
      { name: 'Vue.js', regex: /\bvue(?:\.js|js|3)?\b/i },
      { name: 'Angular', regex: /\bangular(?:js)?\b/i },
      { name: 'Spring Boot', regex: /\bspring\s+boot\b|\bspring\s+framework\b/i },
      { name: 'Django', regex: /\bdjango\b/i },
      { name: 'FastAPI', regex: /\bfastapi\b/i },
      { name: 'Flask', regex: /\bflask\b/i },
      { name: 'Tailwind CSS', regex: /\btailwind(?:css)?\b/i },
      { name: 'GraphQL', regex: /\bgraphql\b/i },
      { name: 'REST APIs', regex: /\brest(?:ful)?\s*(?:api|apis)?\b/i },
      { name: 'WebSockets', regex: /\bwebsockets?\b|\bsocket\.io\b/i },
      { name: 'Microservices', regex: /\bmicroservices?\b/i },
      { name: 'System Design', regex: /\bsystem\s+design\b|\bdistributed\s+systems\b/i },

      // Databases
      { name: 'PostgreSQL', regex: /\bpostgres(?:ql)?\b|\bpsql\b/i },
      { name: 'MySQL', regex: /\bmysql\b/i },
      { name: 'MongoDB', regex: /\bmongodb\b|\bmongo\b/i },
      { name: 'Redis', regex: /\bredis\b/i },
      { name: 'Elasticsearch', regex: /\belasticsearch\b|\belastic\s+search\b/i },
      { name: 'DynamoDB', regex: /\bdynamodb\b/i },
      { name: 'Oracle DB', regex: /\boracle(?:\s+database|\s+db)?\b/i },
      { name: 'Kafka', regex: /\bkafka\b/i },

      // Cloud & Infrastructure
      { name: 'AWS', regex: /\baws\b|\bamazon\s+web\s+services\b/i },
      { name: 'GCP', regex: /\bgcp\b|\bgoogle\s+cloud\b/i },
      { name: 'Azure', regex: /\bazure\b|\bmicrosoft\s+azure\b/i },
      { name: 'Docker', regex: /\bdocker\b/i },
      { name: 'Kubernetes', regex: /\bkubernetes\b|\bk8s\b/i },
      { name: 'Git', regex: /\bgit\b|\bgithub\b|\bgitlab\b/i },
      { name: 'CI/CD', regex: /\bci\/cd\b|\bcontinuous\s+integration\b|\bgithub\s+actions\b|\bjenkins\b/i },
      { name: 'Linux', regex: /\blinux\b|\bunix\b/i }
    ];

    const requiredSkills: string[] = [];
    const preferredSkills: string[] = [];

    for (const item of skillsCatalog) {
      if (item.regex.test(titleAndDescriptionText)) {
        requiredSkills.push(item.name);
      }
    }

    // Extract years of experience
    let years = 1;
    const yearsMatch = titleAndDescriptionText.match(/(\d+)\+?\s*(?:-\s*\d+)?\s*years?(?:\s+of)?\s+(?:relevant\s+)?experience/i);
    if (yearsMatch) {
      years = parseInt(yearsMatch[1], 10);
    }

    // Seniority detection
    let seniority: 'INTERN' | 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD' = 'MID';
    const isInternship = /intern\b|internship\b/i.test(titleAndDescriptionText);
    if (isInternship) {
      seniority = 'INTERN';
      years = 0;
    } else if (/\blead\b|\bprincipal\b|\bstaff\b|\bdirector\b|\bhead\s+of\b|\barchitect\b/i.test(textLower)) {
      seniority = 'LEAD';
      if (!yearsMatch) years = 6;
    } else if (/\bsenior\b|\bsr\.?\b|\bsde[- ]?3\b|\bsde[- ]?iii\b|\blevel\s+3\b/i.test(textLower)) {
      seniority = 'SENIOR';
      if (!yearsMatch) years = 4;
    } else if (/\bjunior\b|\bjr\.?\b|\bentry\b|\bgraduate\b|\bassociate\b|\bfresher\b|\btrainee\b|\bnew grad\b/i.test(textLower)) {
      seniority = 'ENTRY';
      if (!yearsMatch) years = 0;
    }

    // Education degree requirements
    let requiredDegree: string | undefined = undefined;
    if (/ph\.?d|doctorate/i.test(textLower)) requiredDegree = 'Ph.D.';
    else if (/master|m\.?s\.?|m\.?tech|mca/i.test(textLower)) requiredDegree = 'Master Degree';
    else if (/bachelor|b\.?s\.?|b\.?tech|b\.?e\.?|bca/i.test(textLower)) requiredDegree = 'Bachelor Degree';

    // Domain keywords
    const domainKeywords: string[] = [];
    if (/fintech|payments?|banking/i.test(textLower)) domainKeywords.push('Fintech & Payments');
    if (/e-?commerce|retail/i.test(textLower)) domainKeywords.push('E-Commerce');
    if (/healthcare|healthtech|biotech/i.test(textLower)) domainKeywords.push('Healthcare');
    if (/edtech|education/i.test(textLower)) domainKeywords.push('Edtech');
    if (/ai|artificial\s+intelligence|machine\s+learning/i.test(textLower)) domainKeywords.push('AI & ML');
    if (/cloud|saas|infrastructure/i.test(textLower)) domainKeywords.push('Cloud & SaaS');

    return {
      requiredSkills,
      preferredSkills,
      yearsRequired: years,
      seniority,
      requiredDegree,
      isInternship,
      domainKeywords
    };
  }
}
