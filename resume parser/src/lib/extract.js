import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

// pdf.js does its parsing in a Web Worker. Vite's ?url import gives us the
// worker file's address, so no CDN is needed.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Returns the plain text of a .pdf or .docx File.
export async function extractText(file) {
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
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}
