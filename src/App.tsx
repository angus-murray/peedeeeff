import React, { useRef, useState } from 'react';
import { FilePlus, Files, GripVertical, Loader2, Trash2, X } from 'lucide-react';
import { AppHeader, Banner, Dash, ResultsHeader, StatusChip } from 'engineering-ui';
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
  const [dragId, setDragId] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

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

  const move = (from: number, to: number) =>
    setItems((prev) => {
      const next = [...prev];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });

  // Pointer-based dragging (mouse, pen and touch): the dragged row moves live to the slot under the pointer.
  const startDrag = (e: React.PointerEvent<HTMLLIElement>, id: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragId(id);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (dragId === null || !list.current) return;
    const from = items.findIndex((it) => it.id === dragId);
    const rows = Array.from(list.current.children) as HTMLElement[];
    const to = rows.filter((r, k) => {
      const b = r.getBoundingClientRect();
      return k !== from && b.top + b.height / 2 < e.clientY;
    }).length;
    if (to !== from) move(from, to);
  };

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
                if (!e.dataTransfer.types.includes('Files')) return;
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
                  <ul ref={list} className="space-y-1.5">
                    {items.map((it, i) => (
                      <li
                        key={it.id}
                        tabIndex={0}
                        title="Drag to reorder (or focus and use the arrow keys)"
                        onPointerDown={(e) => startDrag(e, it.id)}
                        onPointerMove={onDragMove}
                        onPointerUp={() => setDragId(null)}
                        onPointerCancel={() => setDragId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' && i > 0) move(i, i - 1);
                          else if (e.key === 'ArrowDown' && i < items.length - 1) move(i, i + 1);
                          else return;
                          e.preventDefault();
                        }}
                        className={`flex items-center gap-2 h-10 pl-1.5 pr-1 rounded-lg border bg-white text-xs text-slate-800 tabular-nums select-none touch-none cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          dragId === it.id ? 'relative z-10 border-blue-500 shadow-md cursor-grabbing' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <GripVertical className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="w-5 shrink-0 text-right text-slate-500">{i + 1}</span>
                        <span className="flex-1 min-w-0 truncate font-medium">{it.file.name}</span>
                        <span className="w-16 shrink-0 text-right">
                          {it.error ? (
                            <span className="text-rose-700 font-semibold" title={it.error}>Error</span>
                          ) : it.pages === null ? (
                            <Dash />
                          ) : (
                            `${it.pages} ${it.pages === 1 ? 'page' : 'pages'}`
                          )}
                        </span>
                        <span className="w-16 shrink-0 text-right text-slate-500">{sizeText(it.file.size)}</span>
                        <IconBtn label="Remove" onClick={() => remove(it.id)}>
                          <X className="w-3.5 h-3.5" />
                        </IconBtn>
                      </li>
                    ))}
                  </ul>
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
