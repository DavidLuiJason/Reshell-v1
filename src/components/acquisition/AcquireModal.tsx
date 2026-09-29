/**
 * Real Project Acquisition Modal
 * Sources:
 * 1. ZIP Archive (safe extraction, validation, inspection)
 * 2. GitHub (repo verification, tree fetch, download)
 * 3. Sample Starter (built-in full-featured real projects)
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FolderArchive, Github, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { ReshellProject } from '../../types/project';
import { importZipArchive } from '../../adapters/zip-adapter';
import { importGitHubRepo } from '../../adapters/github-adapter';
import { createStarterViteReactProject, createStarterNodeCliProject } from '../../core/project-model';
import { loadSettings } from '../../storage/persistence';

interface AcquireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAcquired: (project: ReshellProject) => void;
  initialSource?: 'zip' | 'github' | 'sample';
}

export const AcquireModal: React.FC<AcquireModalProps> = ({
  isOpen,
  onClose,
  onProjectAcquired,
  initialSource = 'zip',
}) => {
  const [activeSource, setActiveSource] = useState<'zip' | 'github' | 'sample'>(initialSource);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [githubInput, setGithubInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setIsProcessing(false);
    setProgressMessage('');
    setErrorDetails(null);
  };

  const handleZipFile = async (file: File) => {
    resetState();
    setIsProcessing(true);
    setProgressMessage(`Validating archive structure (${(file.size / 1024).toFixed(1)} KB)...`);

    try {
      const result = await importZipArchive(file, customName.trim() || undefined);
      if (result.success && result.project) {
        setProgressMessage('Extraction and inspection complete.');
        onProjectAcquired(result.project);
        onClose();
      } else {
        setErrorDetails(
          result.error || {
            message: 'Failed to extract project from ZIP archive.',
            affected: 'Import halted.',
            notAffected: 'No changes were made to existing projects.',
            recoveryAction: 'Check the archive format and retry.',
          }
        );
      }
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Unexpected extraction failure.',
        affected: 'ZIP extraction process.',
        notAffected: 'Local projects remain intact.',
        recoveryAction: 'Ensure the file is a valid ZIP archive and not password protected.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGitHubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubInput.trim()) return;

    resetState();
    setIsProcessing(true);
    setProgressMessage('Contacting GitHub API...');

    const settings = loadSettings();
    const token = settings.githubToken;

    try {
      const res = await importGitHubRepo(githubInput.trim(), token, (msg) => {
        setProgressMessage(msg);
      });

      if (res.success && res.project) {
        onProjectAcquired(res.project);
        onClose();
      } else {
        setErrorDetails(
          res.error || {
            message: 'Failed to import repository from GitHub.',
            affected: 'Acquisition process.',
            notAffected: 'Your workspace remains unchanged.',
            recoveryAction: 'Verify the repository name or configure a GitHub Token in Settings.',
          }
        );
      }
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'GitHub import error.',
        affected: 'Repository download.',
        notAffected: 'Workspace intact.',
        recoveryAction: 'Check network connectivity or retry with another repository.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = (type: 'react' | 'cli') => {
    resetState();
    setIsProcessing(true);
    setProgressMessage('Generating deterministic project structure...');

    try {
      const sample = type === 'react' ? createStarterViteReactProject() : createStarterNodeCliProject();
      setTimeout(() => {
        onProjectAcquired(sample);
        onClose();
      }, 200);
    } catch (err: any) {
      setErrorDetails({
        message: err.message,
        affected: 'Starter generation.',
        notAffected: 'Workspace intact.',
        recoveryAction: 'Please retry.',
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Acquire Project</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Import a software project into Reshell for inspection, packaging, or publishing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close acquisition modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Segmented Control */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-md">
          <button
            type="button"
            onClick={() => {
              setActiveSource('zip');
              resetState();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
              activeSource === 'zip'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>ZIP Archive</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSource('github');
              resetState();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
              activeSource === 'github'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSource('sample');
              resetState();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
              activeSource === 'sample'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Starter</span>
          </button>
        </div>

        {/* Source 1: ZIP Archive */}
        {activeSource === 'zip' && (
          <div className="flex flex-col gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleZipFile(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-neutral-950/50"
            >
              <Upload className="w-8 h-8 text-neutral-400 mb-2" />
              <p className="text-xs font-medium text-neutral-200">
                Click to browse or drag and drop a <span className="font-mono text-neutral-100">.zip</span> file
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Safe extraction with traversal protection and automated structure inspection.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleZipFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Optional custom project name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Leave blank to infer from package.json or file"
                className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-neutral-600"
              />
            </div>
          </div>
        )}

        {/* Source 2: GitHub Repository */}
        {activeSource === 'github' && (
          <form onSubmit={handleGitHubImport} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Repository Identifier or URL
              </label>
              <input
                type="text"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                placeholder="e.g. facebook/react or https://github.com/vitejs/vite"
                required
                className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-neutral-600 font-mono"
              />
              <p className="text-xs text-neutral-500">
                Fetches tree manifest and source files using real GitHub REST endpoints.
              </p>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !githubInput.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import Repository</span>
              )}
            </button>
          </form>
        )}

        {/* Source 3: Sample Starters */}
        {activeSource === 'sample' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-neutral-400">
              Select a pre-built starter to immediately inspect, package, and verify a real project:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => handleLoadSample('react')}
                className="p-3.5 rounded-lg border border-neutral-800 hover:border-neutral-600 bg-neutral-950/60 cursor-pointer transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Vite + React Starter</span>
                  <span className="text-xs text-neutral-500">Web App</span>
                </div>
                <p className="text-xs text-neutral-400">
                  TypeScript React application with Vite config, tsconfig, CSS, and component structure.
                </p>
                <div className="text-xs text-neutral-500 mt-2 font-mono">8 files · 3 dependencies</div>
              </div>

              <div
                onClick={() => handleLoadSample('cli')}
                className="p-3.5 rounded-lg border border-neutral-800 hover:border-neutral-600 bg-neutral-950/60 cursor-pointer transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Node.js CLI Tool</span>
                  <span className="text-xs text-neutral-500">Node / CLI</span>
                </div>
                <p className="text-xs text-neutral-400">
                  TypeScript CLI project using Commander, build scripts, and bin configuration.
                </p>
                <div className="text-xs text-neutral-500 mt-2 font-mono">4 files · Node target</div>
              </div>
            </div>
          </div>
        )}

        {/* Live Processing Indicator */}
        {isProcessing && (
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-md flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-neutral-300 animate-spin shrink-0" />
            <span className="text-xs text-neutral-300 font-mono">{progressMessage}</span>
          </div>
        )}

        {/* Structured Honest Error Block (Prompt Rule 36) */}
        {errorDetails && (
          <div className="p-3.5 bg-red-950/30 border border-red-900/60 rounded-md flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-red-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorDetails.message}</span>
            </div>
            <div className="text-neutral-400 mt-1 pl-5.5 space-y-1">
              <p>
                <strong className="text-neutral-300">Affected:</strong> {errorDetails.affected}
              </p>
              <p>
                <strong className="text-neutral-300">Not affected:</strong> {errorDetails.notAffected}
              </p>
              <p>
                <strong className="text-neutral-300">Recommended action:</strong> {errorDetails.recoveryAction}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
