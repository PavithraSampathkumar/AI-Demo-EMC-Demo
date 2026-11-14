import { useState } from "react";

// A drop target that also works as a plain button (click or Enter/Space).
// It only reports the chosen File up to the parent; validation lives in App.
export default function Dropzone({ fileName, onFile }) {
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = (e) => {
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    document.getElementById("file-input").click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={openPicker}
      onDragOver={(e) => {
        e.preventDefault(); // without this, the browser opens the file instead
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
        isDragging
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
      }`}
    >
      <svg className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      <p className="mt-4 font-medium">Drag and drop your resume here</p>
      <p className="mt-1 text-sm text-slate-500">or click to choose a PDF or .docx file</p>
      {fileName && <p className="mt-4 text-sm font-semibold text-indigo-700">{fileName}</p>}
      <input
        id="file-input"
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        // The input sits inside the clickable div. Stop its click bubbling up,
        // or the div's onClick reopens the picker in a loop.
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
    </div>
  );
}
