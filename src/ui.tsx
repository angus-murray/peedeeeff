import React, { useRef, useState } from 'react';
import { FilePlus } from 'lucide-react';

export const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

export const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;

/** File name without a trailing ".pdf". */
export const baseName = (name: string) => name.trim().replace(/\.pdf$/i, '');

/** Props that make an element accept files dropped from outside the browser, and whether files are over it. */
export function useFileDrop(onFiles: (files: FileList) => void) {
  const [dragging, setDragging] = useState(false);
  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      onFiles(e.dataTransfer.files);
    }
  };
  return { dragging, dropProps };
}

/** Hidden PDF file input and a way to open it. */
export function usePdfPicker(onFiles: (files: FileList) => void, multiple: boolean) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="application/pdf,.pdf"
      multiple={multiple}
      hidden
      onChange={(e) => {
        if (e.target.files) onFiles(e.target.files);
        e.target.value = '';
      }}
    />
  );
  return { input, choose: () => ref.current?.click() };
}

/** Large dashed area shown while no file has been added. */
export const DropArea: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex flex-col items-center justify-center gap-2 py-16 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
  >
    <FilePlus className="w-8 h-8" strokeWidth={1.5} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

/** Thin blue progress bar for a fraction between 0 and 1. */
export const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={`h-1.5 w-full rounded-full bg-slate-100 overflow-hidden ${className ?? ''}`}>
    <div
      className="h-full bg-blue-600 rounded-full transition-[width] duration-150 ease-out"
      style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
    />
  </div>
);

export const IconBtn: React.FC<{ label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({
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
