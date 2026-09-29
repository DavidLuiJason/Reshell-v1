/**
 * Projects View
 * Access previously acquired projects with direct actions: Open, Export ZIP, Delete.
 */

import React, { useState } from 'react';
import { ArrowRight, Trash2, Archive, Plus, Search, FolderGit2 } from 'lucide-react';
import { ReshellProject } from '../../types/project';
import { exportProjectToZip } from '../../adapters/zip-adapter';

interface ProjectsViewProps {
  projects: ReshellProject[];
  onSelectProject: (project: ReshellProject) => void;
  onDeleteProject: (id: string) => void;
  onOpenAcquire: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onSelectProject,
  onDeleteProject,
  onOpenAcquire,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.projectType.toLowerCase().includes(q) ||
      p.inspection.framework.toLowerCase().includes(q)
    );
  });

  const handleQuickExport = async (e: React.MouseEvent, project: ReshellProject) => {
    e.stopPropagation();
    try {
      const res = await exportProjectToZip(project, 'DEFLATE');
      if (res.downloadUrl) {
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = res.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      alert('Quick export failed.');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Remove project "${name}" from local workspace?`)) {
      onDeleteProject(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Acquired Projects</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Software projects loaded into your Reshell workbench.
          </p>
        </div>

        <button
          onClick={onOpenAcquire}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Import Project</span>
        </button>
      </div>

      {/* Search Filter */}
      {projects.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600"
          />
        </div>
      )}

      {/* Project List */}
      {filteredProjects.length > 0 ? (
        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
          <div className="divide-y divide-neutral-800/80">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="p-4 hover:bg-neutral-900/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-neutral-100 truncate">
                      {project.name}
                    </span>
                  </div>

                  {/* Clean Unboxed Metadata with · (Skill Rule 1A) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                    <span>{project.projectType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{project.inspection.framework}</span>
                    <span aria-hidden="true">·</span>
                    <span>{project.sourceType.toUpperCase()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{project.files.length} files</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {(project.inspection.totalSize / 1024).toFixed(1)} KB
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Direct Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleQuickExport(e, project)}
                    title="Quick Export ZIP"
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, project.id, project.name)}
                    title="Remove project"
                    className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-400 group-hover:text-white pl-2">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : projects.length > 0 ? (
        <div className="p-8 text-center text-xs text-neutral-500 border border-neutral-800 rounded-lg">
          No projects matched "{searchQuery}".
        </div>
      ) : (
        <div className="p-12 text-center border border-neutral-800 rounded-lg bg-neutral-950 flex flex-col items-center gap-3">
          <FolderGit2 className="w-8 h-8 text-neutral-600 mb-1" />
          <h2 className="text-sm font-semibold text-white">No projects acquired</h2>
          <p className="text-xs text-neutral-400 max-w-sm">
            Import a ZIP archive or clone from GitHub to begin inspecting and packaging projects.
          </p>
          <button
            onClick={onOpenAcquire}
            className="mt-2 px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            Import First Project
          </button>
        </div>
      )}
    </div>
  );
};
