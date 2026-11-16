# PeeDeeEff

Combines PDF files and removes password protection, in the browser. Files are not uploaded anywhere.

**Combine:** add PDFs (drop them on the Files panel or click to choose), drag them up or down the list to set the order, enter a file name and
click **Combine and Download**. To choose the folder each time, turn on the browser's "ask where to save" setting
(Chrome and Edge: Settings → Downloads → Ask where to save each file before downloading). A file that needs a
password to open is shown as Locked and left out; unlock it first.

**Unlock:** choose a PDF, enter the password used to open it and click **Unlock and Download** for a copy without the
password or restrictions. A PDF that opens without a password but restricts printing, copying or editing needs no
password to unlock.

A progress bar shows while each file is read, and while combining or unlocking, so large PDFs give feedback instead
of a frozen button.

Built with React, Vite, Tailwind CSS v4, `@cantoo/pdf-lib` (a fork of `pdf-lib` that can decrypt) and the shared `engineering-ui` styling.

```bash
bun install
bun run dev      # local server
bun run build    # typecheck and build to dist/
```
