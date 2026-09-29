/**
 * Focused Project Workspace
 * Answers:
 * 1. What is this project?
 * 2. What can I do with it?
 * Capability-driven actions only. No fake buttons. Not an IDE.
 */

import React, { useState } from 'react';
import {
  Archive,
  Github,
  Layers,
  ShieldCheck,
  FileCode,
  Info,
  FolderTree,
  History,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { ProjectFile, ReshellProject } from '../../types/project';
import { getAvailableCapabilities } from '../../core/capabilities-registry';
import { PackageZipModal } from '../operations/PackageZipModal';
import { PublishGitHubModal } from '../operations/PublishGitHubModal';
import { TransformModal } from '../operations/TransformModal';
import { RoundTripModal } from '../operations/RoundTripModal';

interface ProjectWorkspaceProps {
  project: ReshellProject;
  onBackToProjects: () => void;
  onOpenSettings: () => void;
}

type WorkspaceView = 'actions' | 'inspect' | 'files' | 'provenance';

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  onBackToProjects,
  onOpenSettings,
}) => {
  const [currentView, setCurrentView] = useState<WorkspaceView>('actions');

  // Operation Modals
  const [activeModal, setActiveModal] = useState<
    'package' | 'publish' | 'transform' | 'roundtrip' | null
  >(null);

  // File tree selected file
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(
    project.files.find((f) => f.path === 'package.json') || project.files[0] || null
  );

  // Available capabilities according to the Capability System
  const availableCaps = getAvailableCapabilities(project);
  const canPackage = availableCaps.some((c) => c.id === 'package-zip');
  const canPublish = availableCaps.some((c) => c.id === 'publish-github');
  const canTransform = availableCaps.some((c) => c.id === 'transform-static-bundle');
  const canVerify = availableCaps.some((c) => c.id === 'verify-roundtrip');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Workspace Header: Project Identity */}
      <div className="border border-neutral-800 bg-neutral-900/50 rounded-lg p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToProjects}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
              title="Back to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {project.name}
              </h1>
              {/* Zero-Pill Unboxed Metadata with · Separators (Skill Rule 1A) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                <span>{project.projectType}</span>
                <span aria-hidden="true">·</span>
                <span>{project.inspection.framework}</span>
                <span aria-hidden="true">·</span>
                <span>{project.inspection.language}</span>
                <span aria-hidden="true">·</span>
                <span>{project.sourceType.toUpperCase()} source</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{project.files.length} files</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{(project.inspection.totalSize / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          {/* Primary Quick Action on Header */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {canPackage && (
              <button
                onClick={() => setActiveModal('package')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Package ZIP</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 border-t border-neutral-800/80 pt-3">
          <button
            onClick={() => setCurrentView('actions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              currentView === 'actions'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            What Can I Do?
          </button>
          <button
            onClick={() => setCurrentView('inspect')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              currentView === 'inspect'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Inspection Report
          </button>
          <button
            onClick={() => setCurrentView('files')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              currentView === 'files'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Project Files ({project.files.length})
          </button>
          <button
            onClick={() => setCurrentView('provenance')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              currentView === 'provenance'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Provenance
          </button>
        </div>
      </div>

      {/* Main Content Area */}

      {/* VIEW 1: Actions & Capabilities */}
      {currentView === 'actions' && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-white">Genuine Available Actions</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              These operations have real, validated execution pipelines in the current runtime environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action 1: Package ZIP */}
            {canPackage && (
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-neutral-300" />
                    <h3 className="text-xs font-semibold text-white">Package to ZIP Archive</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Generates a validated portable ZIP archive containing all project files with checksum calculation and content verification.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal('package')}
                  className="self-start px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  Configure & Package
                </button>
              </div>
            )}

            {/* Action 2: Publish to GitHub */}
            {canPublish && (
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-neutral-300" />
                    <h3 className="text-xs font-semibold text-white">Publish to GitHub</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Check repository-name availability, create a remote repository, upload project files, and confirm remote commit state.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal('publish')}
                  className="self-start px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  Publish Repository
                </button>
              </div>
            )}

            {/* Action 3: Transform to Single-File HTML Bundle */}
            {canTransform && (
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-neutral-300" />
                    <h3 className="text-xs font-semibold text-white">Single-File HTML Bundle</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Transforms web project entry point and references by inlining CSS and JS into a standalone offline HTML bundle.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal('transform')}
                  className="self-start px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  Execute Transformation
                </button>
              </div>
            )}

            {/* Action 4: Round-Trip Transport Verification */}
            {canVerify && (
              <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-neutral-300" />
                    <h3 className="text-xs font-semibold text-white">Round-Trip Parity Test</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Automated export and re-import verification test that confirms 100% byte-for-byte and structural fidelity.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal('roundtrip')}
                  className="self-start px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  Run Parity Verification
                </button>
              </div>
            )}
          </div>

          {/* Truthful Limitations & Runtime Disclosures (Rules 11, 19, 48) */}
          <div className="border border-neutral-800/80 rounded-lg p-4 bg-neutral-950 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Runtime Capability Disclosures & Limitations</span>
            </div>
            <ul className="text-xs text-neutral-400 space-y-1 list-disc pl-5">
              <li>
                <strong>Android Compilation:</strong> Native APK / AAB compilation requires Android SDK, Java JDK, and Gradle. Because these toolchains do not run inside client-side browser runtimes, Reshell does not expose a mock APK generator.
              </li>
              <li>
                <strong>Client Memory:</strong> In-browser ZIP operations handle archives up to 100MB comfortably.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* VIEW 2: Inspection Report */}
      {currentView === 'inspect' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Project Inspection Results</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Deterministic static inspection of files, dependencies, manifests, and scripts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identity & Structure */}
            <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-neutral-300">Detected Environment</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-neutral-500 font-sans">Framework</span>
                  <span className="text-white">{project.inspection.framework}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-neutral-500 font-sans">Language</span>
                  <span className="text-white">{project.inspection.language}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-neutral-500 font-sans">Package Manager</span>
                  <span className="text-white">{project.inspection.packageManager}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-neutral-500 font-sans">Platform Target</span>
                  <span className="text-white">{project.platform}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-neutral-500 font-sans">Entry Points</span>
                  <span className="text-neutral-300 text-right">
                    {project.inspection.entryPoints.join(', ') || 'unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Build Configs & Manifests */}
            <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-neutral-300">Manifests & Build Configs</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-neutral-500 block mb-1">Manifest Files:</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-neutral-300">
                    {project.inspection.manifests.length > 0 ? (
                      project.inspection.manifests.map((m) => (
                        <span key={m} className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-neutral-500 italic">None detected</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">Build Configurations:</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-neutral-300">
                    {project.inspection.buildConfigs.length > 0 ? (
                      project.inspection.buildConfigs.map((b) => (
                        <span key={b} className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded">
                          {b}
                        </span>
                      ))
                    ) : (
                      <span className="text-neutral-500 italic">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dependencies breakdown */}
          <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-neutral-300">
              Dependencies ({Object.keys(project.inspection.dependencies).length})
            </h3>
            {Object.keys(project.inspection.dependencies).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                {Object.entries(project.inspection.dependencies).map(([name, ver]) => (
                  <div
                    key={name}
                    className="p-2 bg-neutral-950 border border-neutral-800/80 rounded flex items-center justify-between"
                  >
                    <span className="text-neutral-300 truncate">{name}</span>
                    <span className="text-neutral-500 shrink-0">{ver}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic">No production dependencies declared.</p>
            )}

            {Object.keys(project.inspection.devDependencies).length > 0 && (
              <div className="mt-2 pt-3 border-t border-neutral-800 flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-400">
                  Dev Dependencies ({Object.keys(project.inspection.devDependencies).length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                  {Object.entries(project.inspection.devDependencies).map(([name, ver]) => (
                    <div
                      key={name}
                      className="p-2 bg-neutral-950 border border-neutral-800/80 rounded flex items-center justify-between"
                    >
                      <span className="text-neutral-300 truncate">{name}</span>
                      <span className="text-neutral-500 shrink-0">{ver}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scripts breakdown */}
          {Object.keys(project.inspection.scripts).length > 0 && (
            <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-neutral-300">Package Scripts</h3>
              <div className="space-y-1.5 font-mono text-xs">
                {Object.entries(project.inspection.scripts).map(([script, cmd]) => (
                  <div
                    key={script}
                    className="p-2 bg-neutral-950 border border-neutral-800/80 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <span className="text-white font-semibold">{script}</span>
                    <span className="text-neutral-400 text-[11px] truncate max-w-md">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Files (Work tool inspection, NOT an IDE - Section 8) */}
      {currentView === 'files' && (
        <div className="border border-neutral-800 rounded-lg bg-neutral-900/40 grid grid-cols-1 md:grid-cols-3 min-h-[460px] overflow-hidden">
          {/* File Tree Left Pane */}
          <div className="border-b md:border-b-0 md:border-r border-neutral-800 p-3 max-h-[460px] overflow-y-auto">
            <div className="text-xs font-semibold text-neutral-400 px-2 py-1 mb-1">
              Project Structure
            </div>
            <div className="space-y-0.5 text-xs font-mono">
              {project.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 cursor-pointer transition-colors ${
                    selectedFile?.path === file.path
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-950'
                  }`}
                >
                  <File className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                  <span className="truncate">{file.path}</span>
                </button>
              ))}
            </div>
          </div>

          {/* File Preview Right Pane */}
          <div className="md:col-span-2 p-4 flex flex-col gap-3 max-h-[460px] overflow-y-auto">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs font-semibold text-white font-mono">{selectedFile.path}</span>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">
                    {selectedFile.size} bytes {selectedFile.isBinary ? '(binary)' : ''}
                  </span>
                </div>

                {selectedFile.isBinary ? (
                  <div className="p-8 text-center text-xs text-neutral-500">
                    Binary asset ({selectedFile.extension}) — preview not available as plain text.
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-neutral-300 bg-neutral-950 border border-neutral-800/80 rounded p-3 overflow-x-auto whitespace-pre leading-relaxed">
                    {selectedFile.content}
                  </pre>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500">
                Select a file to inspect its content.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: Provenance */}
      {currentView === 'provenance' && (
        <div className="border border-neutral-800 rounded-lg p-5 bg-neutral-900/40 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Project Provenance & Origin</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Technical record of acquisition source, original URI, and import metadata.
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between border-b border-neutral-800 pb-2">
              <span className="text-neutral-500 font-sans">Source Type</span>
              <span className="text-white">{project.sourceType.toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800 pb-2">
              <span className="text-neutral-500 font-sans">Source URI</span>
              <span className="text-neutral-300 truncate max-w-sm">{project.sourceUri}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-800 pb-2">
              <span className="text-neutral-500 font-sans">Acquisition Timestamp</span>
              <span className="text-neutral-300">
                {new Date(project.provenance.importedAt).toLocaleString()}
              </span>
            </div>
            {project.provenance.checksumSha256 && (
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-500 font-sans">Source SHA-256 Checksum</span>
                <span className="text-neutral-400 truncate max-w-xs">
                  {project.provenance.checksumSha256}
                </span>
              </div>
            )}
            {project.provenance.remoteBranch && (
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-500 font-sans">Remote Branch</span>
                <span className="text-white">{project.provenance.remoteBranch}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Operation Modals */}
      <PackageZipModal
        isOpen={activeModal === 'package'}
        project={project}
        onClose={() => setActiveModal(null)}
        onRunRoundTrip={() => setActiveModal('roundtrip')}
      />

      <PublishGitHubModal
        isOpen={activeModal === 'publish'}
        project={project}
        onClose={() => setActiveModal(null)}
        onOpenSettings={onOpenSettings}
      />

      <TransformModal
        isOpen={activeModal === 'transform'}
        project={project}
        onClose={() => setActiveModal(null)}
      />

      <RoundTripModal
        isOpen={activeModal === 'roundtrip'}
        project={project}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};
