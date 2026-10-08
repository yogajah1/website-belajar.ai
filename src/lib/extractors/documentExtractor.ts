import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'txt') {
    return await file.text();
  }

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  }

  if (extension === 'pdf') {
    return await extractTextFromPdf(file);
  }

  throw new Error(`Format file .${extension} tidak didukung. Harap gunakan file PDF, DOCX, atau TXT.`);
}

export async function extractTextFromPdf(file: File): Promise<string> {
  if (typeof window === 'undefined') return '';

  const pdfjsLib = await import('pdfjs-dist');
  // Configure worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items
      .map((item: any) => item.str || '')
      .filter(Boolean);
    fullText += pageStrings.join(' ') + '\n\n';
  }

  return fullText.trim();
}
