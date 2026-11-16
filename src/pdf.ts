import { EncryptedPDFError, PDFDocument } from '@cantoo/pdf-lib';

/** How a PDF is protected: not at all, by an owner password only (opens without one), or by an open password. */
export type Protection = 'none' | 'restrictions' | 'password';

export class PasswordRequiredError extends Error {
  constructor() {
    super('Password protected');
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Incorrect password');
  }
}

/**
 * Opens a PDF, decrypting it if needed. A file with only an owner password opens with an empty password; one with
 * an open password needs `password`.
 */
async function open(file: File, password?: string): Promise<{ doc: PDFDocument; protection: Protection }> {
  const bytes = await file.arrayBuffer();
  try {
    return { doc: await PDFDocument.load(bytes), protection: 'none' };
  } catch (e) {
    if (!(e instanceof EncryptedPDFError)) throw e;
  }
  try {
    return { doc: await PDFDocument.load(bytes, { password: '' }), protection: 'restrictions' };
  } catch (e) {
    if (!isWrongPassword(e)) throw e;
  }
  if (!password) throw new PasswordRequiredError();
  try {
    return { doc: await PDFDocument.load(bytes, { password }), protection: 'password' };
  } catch (e) {
    throw isWrongPassword(e) ? new WrongPasswordError() : e;
  }
}

// The library throws plain errors: "NEEDS PASSWORD" for an empty password, "Password incorrect" for a wrong one.
const isWrongPassword = (e: unknown) => e instanceof Error && (e.message === 'NEEDS PASSWORD' || e.message === 'Password incorrect');

/** Number of pages in a PDF and how it is protected; throws PasswordRequiredError if it needs a password to open. */
export async function inspect(file: File, password?: string): Promise<{ pages: number; protection: Protection }> {
  const { doc, protection } = await open(file, password);
  return { pages: doc.getPageCount(), protection };
}

/** Copies every page of each file, in order, into one new PDF. */
export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const { doc } = await open(file);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** A copy of the PDF with its password and restrictions removed. */
export async function unlockPdf(file: File, password: string): Promise<Uint8Array> {
  const { doc } = await open(file, password);
  return doc.save();
}

/** Downloads PDF bytes under the given file name. */
export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
