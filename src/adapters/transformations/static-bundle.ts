/**
 * Real Transformation: Single-File Portable HTML Bundle
 * Transforms a web project with HTML, CSS, and JS into an offline self-contained HTML bundle.
 */

import { ReshellProject } from '../../types/project';

export interface TransformationResult {
  success: boolean;
  outputFileName: string;
  outputContent: string;
  outputSize: number;
  inlinedStyles: number;
  inlinedScripts: number;
  validationPassed: boolean;
  checks: Array<{ name: string; status: 'passed' | 'failed'; details: string }>;
  error?: {
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  };
}

export function transformToSingleFileBundle(project: ReshellProject): TransformationResult {
  const checks: Array<{ name: string; status: 'passed' | 'failed'; details: string }> = [];

  // 1. Locate entry HTML
  const entryHtmlFile = project.files.find(
    (f) => f.path === 'index.html' || f.path === 'src/index.html' || f.path.endsWith('.html')
  );

  if (!entryHtmlFile) {
    return {
      success: false,
      outputFileName: '',
      outputContent: '',
      outputSize: 0,
      inlinedStyles: 0,
      inlinedScripts: 0,
      validationPassed: false,
      checks: [
        {
          name: 'Entry Point Discovery',
          status: 'failed',
          details: 'No valid HTML entry file found in project.',
        },
      ],
      error: {
        message: 'No HTML entry file exists to bundle.',
        affected: 'Transformation aborted.',
        notAffected: 'Original project was not modified.',
        recoveryAction: 'Ensure your project has an index.html file.',
      },
    };
  }

  checks.push({
    name: 'Entry Point Discovery',
    status: 'passed',
    details: `Found entry point at "${entryHtmlFile.path}"`,
  });

  let html = entryHtmlFile.content;
  let inlinedStyles = 0;
  let inlinedScripts = 0;

  // 2. Inline CSS stylesheets
  const linkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
  html = html.replace(linkRegex, (match, href) => {
    const cleanHref = href.replace(/^\.?\//, '');
    const cssFile = project.files.find(
      (f) => f.path === cleanHref || f.path.endsWith(cleanHref) || f.path === `src/${cleanHref}`
    );

    if (cssFile && !cssFile.isBinary) {
      inlinedStyles++;
      return `<style>/* Inlined: ${cssFile.path} */\n${cssFile.content}</style>`;
    }
    return match;
  });

  // Also match any additional project css if not explicitly linked
  if (inlinedStyles === 0) {
    const standaloneCss = project.files.filter((f) => f.extension === '.css');
    if (standaloneCss.length > 0) {
      const injectedCss = standaloneCss
        .map((f) => `/* Inlined: ${f.path} */\n${f.content}`)
        .join('\n\n');
      html = html.replace('</head>', `<style>\n${injectedCss}\n</style>\n</head>`);
      inlinedStyles += standaloneCss.length;
    }
  }

  // 3. Inline scripts
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  html = html.replace(scriptRegex, (match, src) => {
    const cleanSrc = src.replace(/^\.?\//, '');
    const jsFile = project.files.find(
      (f) => f.path === cleanSrc || f.path.endsWith(cleanSrc) || f.path === `src/${cleanSrc}`
    );

    if (jsFile && !jsFile.isBinary) {
      inlinedScripts++;
      return `<script>/* Inlined: ${jsFile.path} */\n${jsFile.content}</script>`;
    }
    return match;
  });

  checks.push({
    name: 'Dependency Inlining',
    status: 'passed',
    details: `Inlined ${inlinedStyles} stylesheet(s) and ${inlinedScripts} script(s).`,
  });

  // 4. Output validation
  const hasDoctype = /<!doctype\s+html>/i.test(html) || /<html/i.test(html);
  const hasClosingHtml = /<\/html>/i.test(html);
  const outputSize = new TextEncoder().encode(html).length;
  const validationPassed = hasDoctype && hasClosingHtml && outputSize > 0;

  checks.push({
    name: 'Output HTML Structure Validation',
    status: validationPassed ? 'passed' : 'failed',
    details: validationPassed
      ? `Validated valid HTML document structure (${outputSize} bytes).`
      : 'HTML document lacks closing tags or doctype.',
  });

  const sanitized = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const outputFileName = `${sanitized}-standalone.html`;

  return {
    success: validationPassed,
    outputFileName,
    outputContent: html,
    outputSize,
    inlinedStyles,
    inlinedScripts,
    validationPassed,
    checks,
  };
}
