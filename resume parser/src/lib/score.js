// Scoring logic. Pure functions with no React in them, so it is easy to test.

// Multi-word skills are fine. Add your own domain's terms here.
export const SKILLS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust", "ruby",
  "php", "sql", "html", "css", "react", "vue", "angular", "svelte", "node.js",
  "express", "django", "flask", "spring", "tailwind css", "bootstrap", "rest api",
  "graphql", "git", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "ci/cd",
  "postgresql", "mysql", "mongodb", "redis", "machine learning", "deep learning",
  "nlp", "pandas", "numpy", "tensorflow", "pytorch", "agile", "scrum", "testing",
  "jest", "unit testing", "data analysis", "excel", "power bi", "tableau", "figma",
  "accessibility", "security", "microservices", "terraform", "communication",
  "leadership", "project management",
];

// Common words that show up in every job ad and say nothing about the role.
const STOPWORDS = new Set([
  "about", "above", "across", "after", "against", "also", "and", "are", "based",
  "build", "can", "candidate", "company", "work", "working", "will", "with", "that",
  "this", "from", "have", "has", "your", "you", "our", "their", "they", "the", "for",
  "must", "plus", "strong", "good", "ability", "experience", "years", "year", "team",
  "teams", "role", "job", "position", "including", "using", "help", "join", "looking",
  "requirements", "responsibilities", "preferred", "required", "nice", "should",
  "into", "more", "other", "such", "etc", "who", "what", "when", "where", "how",
  "any", "all", "each", "well", "new", "make", "part", "best", "way",
]);

// Highest level first, so the first match is the best degree found.
const DEGREES = [
  { level: 3, label: "PhD", re: /\b(ph\.?\s?d|doctorate)\b/i },
  { level: 2, label: "Master's", re: /\b(master'?s?|m\.?sc|mba|m\.?tech)\b/i },
  { level: 1, label: "Bachelor's", re: /\b(bachelor'?s?|b\.?sc|b\.?tech)\b/i },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// True when `term` appears as a whole word/phrase. The lookarounds stop "go"
// matching inside "good" and "java" matching inside "javascript".
function hasTerm(lowerText, term) {
  return new RegExp(`(?<![a-z0-9+#])${escapeRe(term)}(?![a-z0-9+#])`).test(lowerText);
}

// The most-repeated meaningful words in the job description.
function topKeywords(lowerJd, limit = 25) {
  const counts = new Map();
  for (const word of lowerJd.match(/[a-z][a-z0-9+#-]{2,}/g) ?? []) {
    if (STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

// "5+ years" -> 5. Returns null if the text states no number of years.
function statedYears(lowerText) {
  const found = [...lowerText.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/g)].map((m) => Number(m[1]));
  return found.length ? Math.max(...found) : null;
}

// Rough fallback: years since the earliest year mentioned. It also counts
// education dates, so treat it as an estimate.
function estimatedYears(lowerText) {
  const years = [...lowerText.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  if (!years.length) return 0;
  return Math.max(0, new Date().getFullYear() - Math.min(...years));
}

export const WEIGHTS = { skills: 40, keywords: 35, experience: 15, education: 10 };

export function scoreResume(resumeText, jdText) {
  const resume = resumeText.toLowerCase();
  const jd = jdText.toLowerCase();

  // 1. Skills the job names, and which ones the resume has.
  const wantedSkills = SKILLS.filter((s) => hasTerm(jd, s));
  const matched = wantedSkills.filter((s) => hasTerm(resume, s));
  const missing = wantedSkills.filter((s) => !hasTerm(resume, s));

  // 2. Keyword coverage: the job's most-used words that the resume also uses.
  const jdKeywords = topKeywords(jd);
  const missingKeywords = jdKeywords.filter((w) => !hasTerm(resume, w));
  const keywordRatio = jdKeywords.length
    ? 1 - missingKeywords.length / jdKeywords.length
    : 0;

  // 3. Experience: how much of the asked-for years the resume shows.
  const requiredYears = statedYears(jd);
  const resumeYears = statedYears(resume) ?? estimatedYears(resume);
  const experienceRatio = requiredYears ? Math.min(1, resumeYears / requiredYears) : 1;

  // 4. Education: full credit if the resume meets the degree the job names.
  const jdDegree = DEGREES.find((d) => d.re.test(jd));
  const resumeDegree = DEGREES.find((d) => d.re.test(resume));
  const educationRatio =
    !jdDegree || (resumeDegree && resumeDegree.level >= jdDegree.level) ? 1 : 0;

  // If the job names no specific skills, keyword coverage stands in for them.
  const skillRatio = wantedSkills.length ? matched.length / wantedSkills.length : keywordRatio;

  const ratios = {
    skills: skillRatio,
    keywords: keywordRatio,
    experience: experienceRatio,
    education: educationRatio,
  };
  const overall = Math.round(
    Object.keys(WEIGHTS).reduce((sum, key) => sum + ratios[key] * WEIGHTS[key], 0)
  );

  // 5. Strengths and weaknesses in plain language.
  const strengths = [];
  const weaknesses = [];

  if (matched.length) {
    strengths.push(
      `Covers ${matched.length} of ${wantedSkills.length} skills the job names, including ${matched.slice(0, 4).join(", ")}.`
    );
  }
  for (const section of ["experience", "education", "skills", "projects"]) {
    if (hasTerm(resume, section)) strengths.push(`Has a clear "${section}" section.`);
    else weaknesses.push(`No "${section}" heading found. Recruiters scan for it.`);
  }

  // Count numbers that look like results, skipping years so dates don't inflate the score.
  const metrics = (resumeText.match(/\d+(?:\.\d+)?\s?%|\$\s?\d[\d,]*|\b\d{2,}\+?\b/g) ?? [])
    .filter((m) => !/^(19|20)\d{2}$/.test(m)).length;
  if (metrics >= 3) {
    strengths.push(`Quantifies results (${metrics} numbers, percentages or amounts).`);
  } else {
    weaknesses.push("Few measurable results. Add numbers: percentages, counts, money saved, users served.");
  }

  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 200) {
    weaknesses.push(`Resume is short (${wordCount} words). Expand project and impact detail.`);
  }
  if (missing.length) {
    weaknesses.push(`Missing skills the job names: ${missing.slice(0, 6).join(", ")}.`);
  }
  if (requiredYears && resumeYears < requiredYears) {
    weaknesses.push(`The job asks for ${requiredYears}+ years; your resume shows about ${resumeYears}.`);
  }
  if (jdDegree && educationRatio === 0) {
    weaknesses.push(`The job mentions a ${jdDegree.label} degree and none was found on your resume.`);
  }

  return { overall, ratios, matched, missing, missingKeywords, strengths, weaknesses };
}
