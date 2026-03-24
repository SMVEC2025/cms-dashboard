import DOMPurify from 'dompurify';

const SUPPORTED_DOCX_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const SUPPORTED_PDF_TYPES = new Set([
  'application/pdf',
]);

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'u',
  'blockquote',
  'a',
  'br',
  'hr',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

let pdfJsPromise;

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeImportedHtml(value = '') {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

function getFileExtension(file) {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

function isDocxFile(file) {
  return SUPPORTED_DOCX_TYPES.has(file.type) || getFileExtension(file) === 'docx';
}

function isPdfFile(file) {
  return SUPPORTED_PDF_TYPES.has(file.type) || getFileExtension(file) === 'pdf';
}

async function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist/build/pdf.mjs').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();

      return pdfjs;
    });
  }

  return pdfJsPromise;
}

function normalisePdfLines(items = []) {
  const lines = [];
  let currentLine = [];
  let lastY = null;

  items.forEach((item) => {
    const value = typeof item.str === 'string' ? item.str.trim() : '';
    if (!value) {
      return;
    }

    const y = Math.round(item.transform?.[5] || 0);
    if (lastY !== null && Math.abs(y - lastY) > 4 && currentLine.length) {
      lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
      currentLine = [value];
    } else {
      currentLine.push(value);
    }

    lastY = y;
  });

  if (currentLine.length) {
    lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
  }

  return lines.filter(Boolean);
}

function convertPdfLinesToHtml(lines = []) {
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }

    blocks.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      return;
    }

    const headingCandidate =
      trimmed.length <= 80 &&
      !/[.!?]$/.test(trimmed) &&
      (trimmed === trimmed.toUpperCase() || /^[A-Z][A-Za-z0-9\s\-&,/:()]+$/.test(trimmed));

    if (headingCandidate) {
      flushParagraph();
      blocks.push(`<h2>${escapeHtml(trimmed)}</h2>`);
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();

  return sanitizeImportedHtml(blocks.join(''));
}

async function importDocx(file) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      ignoreEmptyParagraphs: false,
    },
  );

  return {
    html: sanitizeImportedHtml(result.value),
    warnings: result.messages || [],
  };
}

async function importPdf(file) {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
  });
  const pdf = await loadingTask.promise;
  const lines = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    lines.push(...normalisePdfLines(textContent.items));
  }

  return {
    html: convertPdfLinesToHtml(lines),
    warnings: [],
  };
}

export async function importDocumentFile(file) {
  if (!file) {
    throw new Error('Choose a .docx or .pdf file to import.');
  }

  if (isDocxFile(file)) {
    return importDocx(file);
  }

  if (isPdfFile(file)) {
    return importPdf(file);
  }

  throw new Error('Unsupported file type. Please upload a .docx or .pdf document.');
}
