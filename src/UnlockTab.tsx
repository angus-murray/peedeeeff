import React, { useState } from 'react';
import { Eye, EyeOff, FileText, Loader2, LockOpen, X } from 'lucide-react';
import { Banner, Dash, ResultsHeader, StatusChip } from 'engineering-ui';
import { PasswordRequiredError, Protection, WrongPasswordError, downloadPdf, inspect, unlockPdf } from './pdf';
import { DropArea, IconBtn, baseName, isPdf, sizeText, useFileDrop, usePdfPicker } from './ui';

interface Picked {
  file: File;
  pages: number | null;
  protection: Protection | null;
}

const PROTECTION: Record<Protection, { kind: 'neutral' | 'warn'; text: string; tip: string }> = {
  none: { kind: 'neutral', text: 'Not Protected', tip: 'This PDF has no password or restrictions.' },
  restrictions: {
    kind: 'warn',
    text: 'Restrictions Only',
    tip: 'Opens without a password but has an owner password restricting printing, copying or editing. No password is needed to remove it.'
  },
  password: { kind: 'warn', text: 'Password Protected', tip: 'Enter the password used to open this PDF.' }
};

export default function UnlockTab() {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pick = (files: FileList) => {
    const file = Array.from(files).find(isPdf);
    setError(file ? null : 'Not a PDF file.');
    if (!file) return;
    setPicked({ file, pages: null, protection: null });
    setName(`${baseName(file.name)}-unlocked`);
    setPassword('');
    setDone(false);
    inspect(file).then(
      ({ pages, protection }) => setPicked((p) => (p?.file === file ? { ...p, pages, protection } : p)),
      (e) => {
        if (e instanceof PasswordRequiredError) setPicked((p) => (p?.file === file ? { ...p, protection: 'password' } : p));
        else {
          setPicked(null);
          setError('The PDF cannot be read.');
        }
      }
    );
  };

  const { dragging, dropProps } = useFileDrop(pick);
  const picker = usePdfPicker(pick, false);

  const protection = picked?.protection ?? null;
  const needsPassword = protection === 'password';
  const canUnlock = !busy && (protection === 'restrictions' || (needsPassword && password !== ''));

  const unlock = async () => {
    if (!picked || !canUnlock) return;
    setBusy(true);
    setError(null);
    try {
      downloadPdf(await unlockPdf(picked.file, password), `${baseName(name) || 'unlocked'}.pdf`);
      setDone(true);
      if (picked.pages === null) inspect(picked.file, password).then(({ pages }) => setPicked((p) => (p ? { ...p, pages } : p)));
    } catch (e) {
      setError(e instanceof WrongPasswordError ? 'Incorrect password.' : `The PDF could not be unlocked: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tab-grid">
      <div className="input-column scroll-thin">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            unlock();
          }}
        >
          <h2 className="panel-title">Unlock</h2>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                className="control pr-8"
                type={show ? 'text' : 'password'}
                autoComplete="off"
                value={needsPassword ? password : ''}
                placeholder={protection && !needsPassword ? '–' : ''}
                disabled={!needsPassword}
                title={protection === 'restrictions' ? 'No password is needed for this PDF' : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
              {needsPassword && (
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  title={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center text-slate-500 hover:text-blue-600"
                >
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="unlock-name">File Name</label>
            <div className="flex items-center gap-2">
              <input id="unlock-name" className="control" value={name} disabled={!picked} onChange={(e) => setName(e.target.value)} />
              <span className="text-xs text-slate-500">.pdf</span>
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!canUnlock}
            title={!picked ? 'Choose a PDF' : protection === 'none' ? PROTECTION.none.tip : needsPassword && !password ? 'Enter the password' : undefined}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LockOpen className="w-3.5 h-3.5" />}
            <span>{busy ? 'Unlocking…' : 'Unlock and Download'}</span>
          </button>
        </form>
      </div>

      <div className="results-column">
        <div className={`panel ${dragging ? 'ring-2 ring-blue-500' : ''}`} {...dropProps}>
          <ResultsHeader title="File">
            {done ? (
              <StatusChip kind="pass">Unlocked</StatusChip>
            ) : (
              protection && (
                <span title={PROTECTION[protection].tip}>
                  <StatusChip kind={PROTECTION[protection].kind}>{PROTECTION[protection].text}</StatusChip>
                </span>
              )
            )}
          </ResultsHeader>

          {error && <Banner kind="error" title={error} />}

          {picker.input}

          {!picked ? (
            <DropArea label="Drop a PDF here or click to choose" onClick={picker.choose} />
          ) : (
            <>
              <div className="flex items-center gap-2 h-10 pl-2 pr-1 rounded-lg border border-slate-200 text-xs text-slate-800 tabular-nums">
                <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="flex-1 min-w-0 truncate font-medium">{picked.file.name}</span>
                <span className="w-16 shrink-0 text-right">
                  {picked.pages === null ? <Dash /> : `${picked.pages} ${picked.pages === 1 ? 'page' : 'pages'}`}
                </span>
                <span className="w-16 shrink-0 text-right text-slate-500">{sizeText(picked.file.size)}</span>
                <IconBtn
                  label="Remove"
                  onClick={() => {
                    setPicked(null);
                    setError(null);
                    setDone(false);
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </IconBtn>
              </div>
              <div>
                <button type="button" className="btn" onClick={picker.choose}>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Choose Another PDF</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
