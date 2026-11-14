import { WEIGHTS } from "../lib/score.js";

const BAR_LABELS = {
  skills: "Skills match",
  keywords: "Keyword coverage",
  experience: "Experience",
  education: "Education",
};

const CHIP_TONES = {
  good: "bg-emerald-100 text-emerald-800",
  bad: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
};

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

function Card({ title, titleClass = "", children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 ${className}`}>
      <h3 className={`font-semibold ${titleClass}`}>{title}</h3>
      {children}
    </div>
  );
}

function Chips({ items, tone }) {
  const list = items.length ? items : ["None"];
  const cls = items.length ? CHIP_TONES[tone] : CHIP_TONES.neutral;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {list.map((text) => (
        <span key={text} className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
          {text}
        </span>
      ))}
    </div>
  );
}

function List({ items, empty }) {
  const rows = items.length ? items : [empty];
  return (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
      {rows.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
}

export default function Scorecard({ result }) {
  const pct = (ratio) => Math.round(ratio * 100);

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold">Your scorecard</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Overall match</p>
          <p className={`mt-2 text-6xl font-extrabold ${scoreColor(result.overall)}`}>{result.overall}</p>
          <p className="text-sm text-slate-500">out of 100</p>
          <p className="mt-4 font-medium">{verdict(result.overall)}</p>
        </Card>

        <Card title="Breakdown" className="lg:col-span-2">
          <div className="mt-4 space-y-4">
            {Object.keys(BAR_LABELS).map((key) => (
              <div key={key}>
                <div className="flex justify-between text-sm font-medium text-slate-700">
                  <span>{`${BAR_LABELS[key]} (${WEIGHTS[key]}%)`}</span>
                  <span>{pct(result.ratios[key])}%</span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                    style={{ width: `${pct(result.ratios[key])}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Strengths" titleClass="text-emerald-700">
          <List items={result.strengths} empty="No standout strengths detected yet." />
        </Card>
        <Card title="Weaknesses" titleClass="text-rose-700">
          <List items={result.weaknesses} empty="Nothing obvious to fix. Nice work." />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card title="Skills you have">
          <Chips items={result.matched} tone="good" />
        </Card>
        <Card title="Skills missing">
          <Chips items={result.missing} tone="bad" />
        </Card>
        <Card title="Job keywords not in your resume">
          <Chips items={result.missingKeywords} tone="bad" />
        </Card>
      </div>
    </section>
  );
}
