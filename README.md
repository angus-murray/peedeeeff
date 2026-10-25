# PeeDeeEff

Combines several PDF files into one, in the browser. Files are not uploaded anywhere.

Add PDFs (drop them on the Files panel or click to choose), drag them up or down the list to set the order, enter a file name and
click **Combine and Download**. To choose the folder each time, turn on the browser's "ask where to save" setting
(Chrome and Edge: Settings → Downloads → Ask where to save each file before downloading).

Built with React, Vite, Tailwind CSS v4, `pdf-lib` and the shared `engineering-ui` styling.

```bash
bun install
bun run dev      # local server
bun run build    # typecheck and build to dist/
```
