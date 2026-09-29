/**
 * Minimal Top Bar Contract (1 Row, 3 Zones)
 * Zone 1: Single text element wordmark "Reshell"
 * Zone 2: Three minimal text navigation links: Home, Projects, Activity
 * Zone 3: Settings button & New Project CTA
 */

import React from 'react';
import { Settings, Plus } from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'projects' | 'activity';
  onSelectTab: (tab: 'home' | 'projects' | 'activity') => void;
  onOpenAcquire: () => void;
  onOpenSettings: () => void;
  hasActiveProject?: boolean;
  activeProjectName?: string;
  onOpenActiveProject?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAcquire,
  onOpenSettings,
  hasActiveProject,
  activeProjectName,
  onOpenActiveProject,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('home')}
            className="text-base font-semibold tracking-tight text-white hover:text-neutral-200 transition-colors cursor-pointer"
          >
            Reshell
          </button>

          {hasActiveProject && activeProjectName && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 pl-2 border-l border-neutral-800">
              <span className="text-neutral-500">Active:</span>
              <button
                onClick={onOpenActiveProject}
                className="text-neutral-300 hover:text-white font-medium truncate max-w-[160px] underline decoration-neutral-700 underline-offset-4 cursor-pointer"
              >
                {activeProjectName}
              </button>
            </div>
          )}
        </div>

        {/* Zone 2: Primary Destinations (Home, Projects, Activity) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
              currentTab === 'home'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectTab('projects')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
              currentTab === 'projects'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => onSelectTab('activity')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
              currentTab === 'activity'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Activity
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            title="Settings & Storage"
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 rounded-md transition-colors cursor-pointer"
            aria-label="Application Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAcquire}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs sm:text-sm font-medium rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import Project</span>
            <span className="sm:hidden">Import</span>
          </button>
        </div>
      </div>
    </header>
  );
};
