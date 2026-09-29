/**
 * Universal Project Model Utilities & Starters
 */

import { ProjectFile, ReshellProject, SourceType } from '../types/project';
import { inspectProjectFiles } from './inspector';

export function normalizeFilePath(rawPath: string): string {
  // Strip leading slash, backslashes to forward slashes, prevent traversal
  let normalized = rawPath.replace(/\\/g, '/');
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  // Remove duplicate slashes
  normalized = normalized.replace(/\/+/g, '/');
  return normalized;
}

export function extractDirectories(files: ProjectFile[]): string[] {
  const dirSet = new Set<string>();
  for (const file of files) {
    const parts = file.path.split('/');
    if (parts.length > 1) {
      let current = '';
      for (let i = 0; i < parts.length - 1; i++) {
        current = current ? `${current}/${parts[i]}` : parts[i];
        dirSet.add(current);
      }
    }
  }
  return Array.from(dirSet).sort();
}

export function createProjectFromFiles(
  name: string,
  sourceType: SourceType,
  sourceUri: string,
  rawFiles: Array<{ path: string; content: string; isBinary?: boolean; size?: number }>,
  provenanceExtra: Record<string, any> = {}
): ReshellProject {
  const cleanFiles: ProjectFile[] = rawFiles
    .filter((f) => {
      const p = normalizeFilePath(f.path);
      // Filter out root directories or empty paths
      return p.length > 0 && !p.endsWith('/');
    })
    .map((f) => {
      const p = normalizeFilePath(f.path);
      const nameOnly = p.split('/').pop() || p;
      const dotIndex = nameOnly.lastIndexOf('.');
      const ext = dotIndex !== -1 ? nameOnly.slice(dotIndex).toLowerCase() : '';
      const size = f.size !== undefined ? f.size : new TextEncoder().encode(f.content).length;

      return {
        path: p,
        name: nameOnly,
        extension: ext,
        size,
        isBinary: !!f.isBinary,
        content: f.content,
        lastModified: Date.now(),
      };
    });

  const directories = extractDirectories(cleanFiles);
  const inspectionResult = inspectProjectFiles(cleanFiles);

  // Extract metadata if package.json exists
  let metadata: Record<string, any> = {};
  const pkgFile = cleanFiles.find((f) => f.path === 'package.json');
  if (pkgFile && !pkgFile.isBinary) {
    try {
      const parsed = JSON.parse(pkgFile.content);
      metadata = {
        description: parsed.description,
        version: parsed.version || '0.1.0',
        author: typeof parsed.author === 'string' ? parsed.author : parsed.author?.name,
        license: parsed.license || 'MIT',
        repository: typeof parsed.repository === 'string' ? parsed.repository : parsed.repository?.url,
        homepage: parsed.homepage,
      };
    } catch {
      // Ignore
    }
  }

  const now = Date.now();
  const id = `prj_${now.toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    name: name.trim() || 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    sourceType,
    sourceUri,
    projectType: inspectionResult.projectType,
    platform: inspectionResult.platform,
    files: cleanFiles,
    directories,
    metadata,
    inspection: inspectionResult.inspection,
    provenance: {
      sourceType,
      sourceUri,
      importedAt: now,
      ...provenanceExtra,
    },
  };
}

/**
 * Built-in real starter projects for immediate testing
 */
export function createStarterViteReactProject(): ReshellProject {
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: 'starter-vite-react',
          private: true,
          version: '1.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            'lucide-react': '^0.546.0',
          },
          devDependencies: {
            '@types/react': '^19.0.0',
            '@types/react-dom': '^19.0.0',
            '@vitejs/plugin-react': '^4.3.0',
            typescript: '^5.7.0',
            vite: '^6.0.0',
          },
        },
        null,
        2
      ),
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starter React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    {
      path: 'src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    },
    {
      path: 'src/App.tsx',
      content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Starter React Application</h1>
      <p>Loaded and verified via Reshell Workbench.</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}`,
    },
    {
      path: 'src/style.css',
      content: `body {
  font-family: system-ui, sans-serif;
  background: #111;
  color: #eee;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}
.container {
  text-align: center;
  padding: 2rem;
  border: 1px solid #333;
  border-radius: 8px;
}
button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}`,
    },
    {
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
          },
          include: ['src'],
        },
        null,
        2
      ),
    },
    {
      path: 'README.md',
      content: `# Starter Vite React Application

A clean starter project imported and inspected within Reshell.
Ready for packaging, single-file transformation, or publishing.`,
    },
  ];

  return createProjectFromFiles(
    'starter-vite-react',
    'sample',
    'internal://starter-vite-react',
    files,
    { description: 'Official starter React Vite app template' }
  );
}

export function createStarterNodeCliProject(): ReshellProject {
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: 'project-inspect-cli',
          version: '0.1.0',
          description: 'A focused command-line utility for source inspection.',
          type: 'module',
          bin: {
            'inspect-tool': './dist/cli.js',
          },
          scripts: {
            build: 'tsc',
            start: 'node dist/cli.js',
          },
          dependencies: {
            commander: '^12.0.0',
            chalk: '^5.3.0',
          },
          devDependencies: {
            typescript: '^5.7.0',
            '@types/node': '^22.0.0',
          },
        },
        null,
        2
      ),
    },
    {
      path: 'src/cli.ts',
      content: `import { Command } from 'commander';

const program = new Command();
program
  .name('inspect-tool')
  .description('Source inspection CLI')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan current directory for source files')
  .action(() => {
    console.log('Scanning target repository...');
  });

program.parse(process.argv);`,
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            outDir: 'dist',
            strict: true,
          },
          include: ['src'],
        },
        null,
        2
      ),
    },
    {
      path: 'README.md',
      content: `# Project Inspect CLI

Command-line workbench utility built in TypeScript.`,
    },
  ];

  return createProjectFromFiles(
    'project-inspect-cli',
    'sample',
    'internal://project-inspect-cli',
    files,
    { description: 'Node.js CLI tool template' }
  );
}
