import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("file-input");
const fileNameEl = $("file-name");
const jdInput = $("jd");
const analyzeBtn = $("analyze");
const statusEl = $("status");
const resultsEl = $("results");

// Create an element with a class and text. Using textContent (not innerHTML)
// means resume or job text can never inject markup into the page.
function el(tag, className = "", text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message, kind = "info") {
  statusEl.textContent = message;
  statusEl.className =
    "min-h-5 text-sm " + (kind === "error" ? "text-rose-600" : "text-slate-600");
}

// ---------- Upload: click, keyboard, or drag and drop ----------
const HIGHLIGHT = ["border-indigo-500", "bg-indigo-50"];

["dragenter", "dragover"].forEach((type) =>
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add(...HIGHLIGHT);
  })
);
["dragleave", "drop"].forEach((type) =>
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.remove(...HIGHLIGHT);
  })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setResume(file);
});
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) setResume(fileInput.files[0]);
});
// Stop the browser opening a file dropped outside the drop zone.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

let resumeFile = null;

function setResume(file) {
  const ext = file.name.toLowerCase().split(".").pop();
  if (!["pdf", "docx"].includes(ext)) {
    setStatus("Only PDF or .docx files work. Save an old .doc as .docx first.", "error");
    return;
  }
  resumeFile = file;
  fileNameEl.textContent = file.name;
  setStatus("");
}

// ---------- Text extraction ----------
async function extractText(file) {
  const buffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  }

  // .docx is a zip of XML; mammoth turns it into plain text.
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

// ---------- Scoring data ----------
// Multi-word skills are fine. Add your own domain's terms here.
const SKILLS = [
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
  "any", "all", "each", "well", "new", "make", "part", "best", "way", "good",
]);

// Highest level first, so the first match is the best degree found.
const DEGREES = [
  { level: 3, label: "PhD", re: /\b(ph\.?\s?d|doctorate)\b/i },
  { level: 2, label: "Master's", re: /\b(master'?s?|m\.?sc|mba|m\.?tech)\b/i },
  { level: 1, label: "Bachelor's", re: /\b(bachelor'?s?|b\.?sc|b\.?tech)\b/i },
];

// ---------- Matching helpers ----------
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

// ---------- The score ----------
function scoreResume(resumeText, jdText) {
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
  const skillRatio = wantedSkills.length
    ? matched.length / wantedSkills.length
    : keywordRatio;

  const ratios = {
    skills: skillRatio,
    keywords: keywordRatio,
    experience: experienceRatio,
    education: educationRatio,
  };
  const weights = { skills: 40, keywords: 35, experience: 15, education: 10 };
  const overall = Math.round(
    Object.keys(weights).reduce((sum, key) => sum + ratios[key] * weights[key], 0)
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

  // Count numbers that look like results (percentages, money, big counts),
  // skipping years so dates don't inflate the score.
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

  return {
    overall,
    ratios,
    matched,
    missing,
    missingKeywords,
    strengths,
    weaknesses,
  };
}

// ---------- Rendering ----------
const BAR_LABELS = [
  ["skills", "Skills match (40%)"],
  ["keywords", "Keyword coverage (35%)"],
  ["experience", "Experience (15%)"],
  ["education", "Education (10%)"],
];

function barRow(label, ratio) {
  const pct = Math.round(ratio * 100);
  const row = el("div");
  const head = el("div", "flex justify-between text-sm font-medium text-slate-700");
  head.append(el("span", "", label), el("span", "", `${pct}%`));
  const track = el("div", "mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-200");
  const fill = el("div", "h-full rounded-full bg-indigo-600 transition-all duration-700");
  fill.style.width = `${pct}%`;
  track.append(fill);
  row.append(head, track);
  return row;
}

function fillList(id, items, emptyText) {
  const list = $(id);
  const rows = items.length ? items : [emptyText];
  list.replaceChildren(...rows.map((text) => el("li", "", text)));
}

const CHIP_TONES = {
  good: "bg-emerald-100 text-emerald-800",
  bad: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
};

function fillChips(id, items, tone) {
  const box = $(id);
  const emptyTone = items.length ? tone : "neutral";
  const chips = items.length ? items : ["None"];
  box.replaceChildren(
    ...chips.map((text) =>
      el("span", `rounded-full px-3 py-1 text-xs font-medium ${CHIP_TONES[emptyTone]}`, text)
    )
  );
}

function scoreColor(score) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-500";
  return "text-rose-600";
}

function verdict(score) {
  if (score >= 75) return "Strong match. Apply with confidence.";
  if (score >= 50) return "Partial match. Close the gaps below before you apply.";
  return "Weak match. This role needs more of the listed skills or a different angle.";
}

function renderResults(r) {
  resultsEl.classList.remove("hidden");

  const scoreEl = $("overall");
  scoreEl.textContent = r.overall;
  scoreEl.className = `mt-2 text-6xl font-extrabold ${scoreColor(r.overall)}`;
  $("verdict").textContent = verdict(r.overall);

  $("breakdown").replaceChildren(
    ...BAR_LABELS.map(([key, label]) => barRow(label, r.ratios[key]))
  );

  fillList("strengths", r.strengths, "No standout strengths detected yet.");
  fillList("weaknesses", r.weaknesses, "Nothing obvious to fix. Nice work.");
  fillChips("matched", r.matched, "good");
  fillChips("missing", r.missing, "bad");
  fillChips("missing-keywords", r.missingKeywords, "bad");

  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- Run ----------
analyzeBtn.addEventListener("click", async () => {
  const jd = jdInput.value.trim();
  if (!resumeFile) return setStatus("Add your resume first.", "error");
  if (jd.length < 40) return setStatus("Paste a fuller job description (a few sentences at least).", "error");

  analyzeBtn.disabled = true;
  setStatus("Reading your resume...");
  try {
    const resumeText = await extractText(resumeFile);
    if (resumeText.trim().length < 50) {
      throw new Error("Could not read text from that file. Scanned PDFs (images) need OCR first.");
    }
    renderResults(scoreResume(resumeText, jd));
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Something went wrong reading that file.", "error");
  } finally {
    analyzeBtn.disabled = false;
  }
});
