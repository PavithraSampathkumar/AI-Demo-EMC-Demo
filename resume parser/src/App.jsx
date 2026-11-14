import { useState } from "react";
import Dropzone from "./components/Dropzone.jsx";
import Scorecard from "./components/Scorecard.jsx";
import { extractText } from "./lib/extract.js";
import { scoreResume } from "./lib/score.js";

export default function App() {
  const [resume, setResume] = useState(null); // the chosen File
  const [jd, setJd] = useState("");
  const [status, setStatus] = useState({ text: "", error: false });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const chooseFile = (file) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx"].includes(ext)) {
      setStatus({ text: "Only PDF or .docx files work. Save an old .doc as .docx first.", error: true });
      return;
    }
    setResume(file);
    setStatus({ text: "", error: false });
  };

  const analyze = async () => {
    const trimmed = jd.trim();
    if (!resume) return setStatus({ text: "Add your resume first.", error: true });
    if (trimmed.length < 40) {
      return setStatus({ text: "Paste a fuller job description (a few sentences at least).", error: true });
    }

    setBusy(true);
    setStatus({ text: "Reading your resume...", error: false });
    try {
      const resumeText = await extractText(resume);
      if (resumeText.trim().length < 50) {
        throw new Error("Could not read text from that file. Scanned PDFs (images) need OCR first.");
      }
      setResult(scoreResume(resumeText, trimmed));
      setStatus({ text: "", error: false });
    } catch (err) {
      console.error(err);
      setStatus({ text: err.message || "Something went wrong reading that file.", error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-indigo-600">Resume Parser</span>
          <span className="text-sm text-slate-500">Runs in your browser. Nothing is uploaded.</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            See how your resume <span className="text-indigo-600">really</span> matches the job
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Drop in your resume (PDF or Word) and paste a job description. You get a score, the skills
            you have, the ones you are missing, and what to fix first.
          </p>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">1. Your resume</h2>
            <div className="mt-4">
              <Dropzone fileName={resume?.name} onFile={chooseFile} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">2. The job description</h2>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={10}
              placeholder="Paste the full job description here..."
              className="mt-4 w-full rounded-xl border border-slate-300 p-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
        </section>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={analyze}
            disabled={busy}
            className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Score my resume
          </button>
          <p className={`min-h-5 text-sm ${status.error ? "text-rose-600" : "text-slate-600"}`}>
            {status.text}
          </p>
        </div>

        {result && <Scorecard result={result} />}
      </main>
    </>
  );
}
