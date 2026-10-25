import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FilePlus, Files, Loader2, Trash2, X } from 'lucide-react';
import { AppHeader, Banner, Cols, Dash, ResultsHeader, StatusChip } from 'engineering-ui';
import { mergePdfs, pageCount } from './merge';

interface Item {
  id: number;
  file: File;
  pages: number | null;
  error?: string;
}

let nextId = 1;

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('combined');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const all = Array.from(list);
    const pdfs = all.filter(isPdf);
    setError(all.length > pdfs.length ? `${all.length - pdfs.length} file(s) skipped: not PDF.` : null);
    const added = pdfs.map((file) => ({ id: nextId++, file, pages: null }));
    setItems((prev) => [...prev, ...added]);
    for (const it of added) {
      pageCount(it.file).then(
        (pages) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, pages } : p))),
        () => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, error: 'Cannot be read' } : p)))
      );
    }
  };

  const move = (i: number, d: -1 | 1) =>
    setItems((prev) => {
      const next = [...prev];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  const remove = (id: number) => setItems((prev) => prev.filter((p) => p.id !== id));

  const readable = items.filter((it) => !it.error);
  const totalPages = readable.reduce((s, it) => s + (it.pages ?? 0), 0);
  const loading = items.some((it) => it.pages === null && !it.error);

  const combine = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = await mergePdfs(readable.map((it) => it.file));
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.trim().replace(/\.pdf$/i, '') || 'combined'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setError(`The PDFs could not be combined: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader name="CombinePDF" />
      <main className="max-w-7xl mx-auto p-3">
        <div className="tab-grid">
          <div className="input-column scroll-thin">
            <div className="panel">
              <h2 className="panel-title">Output</h2>
              <div>
                <label className="label" htmlFor="name">File Name</label>
                <div className="flex items-center gap-2">
                  <input id="name" className="control" value={name} onChange={(e) => setName(e.target.value)} />
                  <span className="text-xs text-slate-500">.pdf</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={combine}
                disabled={busy || loading || readable.length < 2}
                title={readable.length < 2 ? 'Add at least two PDFs' : undefined}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Files className="w-3.5 h-3.5" />}
                <span>{busy ? 'Combining…' : 'Combine and Download'}</span>
              </button>
            </div>
          </div>

          <div className="results-column">
            <div
              className={`panel ${dragging ? 'ring-2 ring-blue-500' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <ResultsHeader title="Files">
                {items.length > 0 && (
                  <StatusChip kind="neutral">
                    {readable.length} {readable.length === 1 ? 'file' : 'files'}, {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                  </StatusChip>
                )}
              </ResultsHeader>

              {error && <Banner kind="error" title={error} />}

              <input
                ref={input}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              {items.length === 0 ? (
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-16 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  <FilePlus className="w-8 h-8" strokeWidth={1.5} />
                  <span className="text-sm font-medium">Drop PDFs here or click to choose</span>
                </button>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="rtable min-w-[480px]">
                      <Cols w={[8, 52, 12, 12, 16]} />
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th className="!text-left">File</th>
                          <th>Pages</th>
                          <th>Size</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, i) => (
                          <tr key={it.id}>
                            <td>{i + 1}</td>
                            <td className="!text-left truncate" title={it.file.name}>
                              {it.file.name}
                            </td>
                            <td>
                              {it.error ? (
                                <span className="text-rose-700 font-semibold" title={it.error}>Error</span>
                              ) : it.pages === null ? (
                                <Dash />
                              ) : (
                                it.pages
                              )}
                            </td>
                            <td>{sizeText(it.file.size)}</td>
                            <td>
                              <div className="inline-flex items-center gap-0.5">
                                <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </IconBtn>
                                <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </IconBtn>
                                <IconBtn label="Remove" onClick={() => remove(it.id)}>
                                  <X className="w-3.5 h-3.5" />
                                </IconBtn>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn" onClick={() => input.current?.click()}>
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>Add PDFs</span>
                    </button>
                    <button type="button" className="btn" onClick={() => setItems([])}>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const IconBtn: React.FC<{ label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({
  label,
  disabled,
  onClick,
  children
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="w-7 h-7 inline-flex items-center justify-center rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
  >
    {children}
  </button>
);
