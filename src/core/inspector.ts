/**
 * Deterministic Project Inspector
 * Inspects a project's files without altering them.
 * If something cannot be determined, marks it as 'unknown'.
 */

import { ProjectFile, ProjectInspection, ProjectPlatform, ProjectType } from '../types/project';

export interface InspectionResult {
  projectType: ProjectType;
  platform: ProjectPlatform;
  inspection: ProjectInspection;
}

export function inspectProjectFiles(files: ProjectFile[]): InspectionResult {
  const filePaths = files.map((f) => f.path);
  const pathSet = new Set(filePaths);

  let framework = 'unknown';
  let language = 'unknown';
  let packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown' = 'unknown';
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const scripts: Record<string, string> = {};
  const entryPoints: string[] = [];
  const buildConfigs: string[] = [];
  const manifests: string[] = [];
  const detectedAssets: string[] = [];
  const limitations: string[] = [];
  const detectedCapabilities: string[] = [];

  let totalSize = 0;
  for (const f of files) {
    totalSize += f.size;
  }

  // 1. Check Lockfiles to determine Package Manager
  if (pathSet.has('pnpm-lock.yaml')) {
    packageManager = 'pnpm';
  } else if (pathSet.has('yarn.lock')) {
    packageManager = 'yarn';
  } else if (pathSet.has('bun.lockb') || pathSet.has('bun.lock')) {
    packageManager = 'bun';
  } else if (pathSet.has('package-lock.json')) {
    packageManager = 'npm';
  }

  // 2. Parse package.json if present
  const pkgFile = files.find((f) => f.path === 'package.json');
  if (pkgFile && !pkgFile.isBinary) {
    manifests.push('package.json');
    try {
      const parsed = JSON.parse(pkgFile.content);
      if (parsed.dependencies && typeof parsed.dependencies === 'object') {
        Object.assign(dependencies, parsed.dependencies);
      }
      if (parsed.devDependencies && typeof parsed.devDependencies === 'object') {
        Object.assign(devDependencies, parsed.devDependencies);
      }
      if (parsed.scripts && typeof parsed.scripts === 'object') {
        Object.assign(scripts, parsed.scripts);
      }
      if (packageManager === 'unknown' && parsed.packageManager) {
        if (parsed.packageManager.startsWith('pnpm')) packageManager = 'pnpm';
        else if (parsed.packageManager.startsWith('yarn')) packageManager = 'yarn';
        else if (parsed.packageManager.startsWith('bun')) packageManager = 'bun';
        else if (parsed.packageManager.startsWith('npm')) packageManager = 'npm';
      }
    } catch {
      limitations.push('Malformed package.json syntax detected');
    }
  }

  // 3. Detect Build Configurations
  const possibleConfigs = [
    'vite.config.ts',
    'vite.config.js',
    'tsconfig.json',
    'webpack.config.js',
    'rollup.config.js',
    'next.config.js',
    'next.config.mjs',
    'astro.config.mjs',
    'tailwind.config.js',
    'tailwind.config.ts',
  ];
  for (const config of possibleConfigs) {
    if (pathSet.has(config)) {
      buildConfigs.push(config);
    }
  }

  // 4. Detect Framework
  const allDeps = { ...dependencies, ...devDependencies };
  if (allDeps['next']) {
    framework = 'Next.js';
  } else if (allDeps['react'] || allDeps['react-dom']) {
    framework = allDeps['vite'] ? 'React (Vite)' : 'React';
  } else if (allDeps['vue']) {
    framework = allDeps['vite'] ? 'Vue (Vite)' : 'Vue';
  } else if (allDeps['svelte']) {
    framework = 'Svelte';
  } else if (allDeps['@angular/core']) {
    framework = 'Angular';
  } else if (allDeps['express'] || allDeps['koa'] || allDeps['fastify']) {
    framework = 'Node Server (Express/Fastify)';
  } else if (pathSet.has('index.html')) {
    framework = 'Static Web';
  }

  // 5. Detect Language
  const hasTs = files.some((f) => f.extension === '.ts' || f.extension === '.tsx');
  const hasJs = files.some((f) => f.extension === '.js' || f.extension === '.jsx' || f.extension === '.mjs');
  const hasHtmlOnly = files.some((f) => f.extension === '.html');
  const hasPython = files.some((f) => f.extension === '.py');
  const hasRust = files.some((f) => f.extension === '.rs');
  const hasGo = files.some((f) => f.extension === '.go');

  if (hasTs) {
    language = hasJs ? 'TypeScript / JavaScript' : 'TypeScript';
  } else if (hasJs) {
    language = 'JavaScript';
  } else if (hasPython) {
    language = 'Python';
  } else if (hasRust) {
    language = 'Rust';
  } else if (hasGo) {
    language = 'Go';
  } else if (hasHtmlOnly) {
    language = 'HTML / CSS';
  }

  // 6. Detect Entry Points
  const commonEntries = [
    'src/main.tsx',
    'src/main.ts',
    'src/index.tsx',
    'src/index.ts',
    'src/App.tsx',
    'src/App.jsx',
    'src/index.js',
    'index.js',
    'src/cli.ts',
    'index.html',
  ];
  for (const entry of commonEntries) {
    if (pathSet.has(entry)) {
      entryPoints.push(entry);
    }
  }

  // 7. Detect Assets
  for (const f of files) {
    if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.gif', '.wasm'].includes(f.extension.toLowerCase())) {
      detectedAssets.push(f.path);
    }
  }

  // 8. Determine Platform and Project Type
  let platform: ProjectPlatform = 'unknown';
  let projectType: ProjectType = 'unknown';

  if (framework.includes('React') || framework.includes('Vue') || framework.includes('Next') || framework === 'Static Web' || pathSet.has('index.html')) {
    platform = 'web';
    projectType = 'web-app';
  } else if (allDeps['express'] || scripts['start']?.includes('node') || pathSet.has('src/cli.ts') || pathSet.has('cli.js')) {
    platform = 'node';
    projectType = pathSet.has('src/cli.ts') || pathSet.has('cli.js') ? 'node-cli' : 'library';
  } else if (language !== 'unknown') {
    platform = 'cross-platform';
    projectType = 'library';
  }

  // 9. Limitations & Capabilities
  if (files.length === 0) {
    limitations.push('Project contains no files');
  }

  // Standard capabilities available in browser environment
  detectedCapabilities.push('package-zip');
  detectedCapabilities.push('inspect-project');
  detectedCapabilities.push('publish-github');
  detectedCapabilities.push('verify-roundtrip');

  if (platform === 'web' && (pathSet.has('index.html') || pathSet.has('src/index.html'))) {
    detectedCapabilities.push('transform-static-bundle');
  }

  // Truthful limitations: Native Android build requires Android SDK/Gradle not present in client runtime
  limitations.push('Native Android / iOS APK/AAB build pipeline is not available in the current browser runtime environment');

  const inspection: ProjectInspection = {
    inspectedAt: Date.now(),
    framework,
    language,
    packageManager,
    dependencies,
    devDependencies,
    scripts,
    entryPoints,
    buildConfigs,
    manifests,
    detectedAssets,
    totalFiles: files.length,
    totalSize,
    limitations,
    detectedCapabilities,
  };

  return {
    projectType,
    platform,
    inspection,
  };
}
