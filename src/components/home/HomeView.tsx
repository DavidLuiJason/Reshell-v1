/**
 * Home Screen
 * Focused work tool entry point.
 * NO DASHBOARD CLUTTER, NO FAKE STATS, NO CHARTS.
 * Direct path: Start work -> Acquire project or resume recent project.
 */

import React from 'react';
import { Upload, Github, FolderArchive, ArrowRight, Clock, Plus, Sparkles } from 'lucide-react';
import { ReshellProject } from '../../types/project';

interface HomeViewProps {
  recentProjects: ReshellProject[];
  onOpenAcquire: (initialSource?: 'zip' | 'github' | 'sample') => void;
  onSelectProject: (project: ReshellProject) => void;
  onOpenProjectsList: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  recentProjects,
  onOpenAcquire,
  onSelectProject,
  onOpenProjectsList,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center">
      {/* Central Hero Block: Purpose & Direct Task Callout */}
      <div className="w-full max-w-xl text-center flex flex-col items-center gap-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Work with your project.
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 max-w-md leading-relaxed text-balance">
          Bring a project into Reshell to inspect its composition, package portable distributions,
          and publish verified artifacts.
        </p>

        {/* Primary Central Action (Section 4) */}
        <div className="mt-4 flex flex-col items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onOpenAcquire('zip')}
            className="w-full sm:w-auto px-6 py-3 bg-neutral-100 hover:bg-white text-neutral-900 text-sm font-semibold rounded-lg shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Import Project</span>
          </button>

          {/* Quick source actions */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span>Or acquire from:</span>
            <button
              onClick={() => onOpenAcquire('zip')}
              className="hover:text-white underline decoration-neutral-700 underline-offset-4 cursor-pointer flex items-center gap-1"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              ZIP Archive
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => onOpenAcquire('github')}
              className="hover:text-white underline decoration-neutral-700 underline-offset-4 cursor-pointer flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => onOpenAcquire('sample')}
              className="hover:text-white underline decoration-neutral-700 underline-offset-4 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Starter Template
            </button>
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="w-full max-w-xl mt-12 pt-8 border-t border-neutral-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400">Recent Projects</span>
          {recentProjects.length > 3 && (
            <button
              onClick={onOpenProjectsList}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              View all ({recentProjects.length})
            </button>
          )}
        </div>

        {recentProjects.length > 0 ? (
          <div className="space-y-2">
            {recentProjects.slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="p-3.5 rounded-lg border border-neutral-800/90 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white group-hover:text-neutral-100 truncate">
                    {p.name}
                  </div>
                  {/* Zero-Pill Unboxed Text Metadata (Skill Rule 1A) */}
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                    <span>{p.projectType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.inspection.framework}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{p.files.length} files</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.sourceType.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-neutral-500 group-hover:text-neutral-300 shrink-0">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-lg border border-neutral-800/60 bg-neutral-950 text-center flex flex-col items-center gap-1.5 text-xs text-neutral-400">
            <Clock className="w-5 h-5 text-neutral-600 mb-1" />
            <p>No acquired projects yet.</p>
            <p className="text-neutral-500">
              Import a ZIP archive, load from GitHub, or launch a starter to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
