import { EncryptedPDFError, PDFDocument } from '@cantoo/pdf-lib';

/** How a PDF is protected: not at all, by an owner password only (opens without one), or by an open password. */
export type Protection = 'none' | 'restrictions' | 'password';

/** Called with the fraction (0–1) of a file that has been read. */
export type OnProgress = (fraction: number) => void;

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

/** Reads a file into memory, reporting how much has been read. The read is the slow part for a large PDF. */
export async function readFile(file: File, onProgress?: OnProgress): Promise<Uint8Array> {
  if (!file.stream) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    onProgress?.(1);
    return bytes;
  }
  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  onProgress?.(0);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(file.size ? Math.min(1, loaded / file.size) : 1);
  }
  const bytes = new Uint8Array(loaded);
  let pos = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, pos);
    pos += chunk.length;
  }
  onProgress?.(1);
  return bytes;
}

/**
 * Opens PDF bytes, decrypting them if needed. Bytes with only an owner password open with an empty password; bytes
 * with an open password need `password`.
 */
async function openBytes(bytes: Uint8Array, password?: string): Promise<{ doc: PDFDocument; protection: Protection }> {
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
export async function inspect(file: File, password?: string, onProgress?: OnProgress): Promise<{ pages: number; protection: Protection }> {
  const { doc, protection } = await openBytes(await readFile(file, onProgress), password);
  return { pages: doc.getPageCount(), protection };
}

/** Copies every page of each file, in order, into one new PDF. Progress is weighted by file size. */
export async function mergePdfs(files: File[], onProgress?: OnProgress): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const total = files.reduce((s, f) => s + f.size, 0) || 1;
  let done = 0;
  for (const file of files) {
    const bytes = await readFile(file, (f) => onProgress?.((done + f * file.size) / total));
    const { doc } = await openBytes(bytes);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => out.addPage(p));
    done += file.size;
    onProgress?.(done / total);
  }
  return out.save();
}

/** A copy of the PDF with its password and restrictions removed. */
export async function unlockPdf(file: File, password: string, onProgress?: OnProgress): Promise<Uint8Array> {
  const { doc } = await openBytes(await readFile(file, onProgress), password);
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
