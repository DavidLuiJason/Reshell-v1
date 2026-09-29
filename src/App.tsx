/**
 * Reshell — Task-Oriented Project Workbench
 *
 * Principles:
 * - RESHELL IS A WORK TOOL, NOT A FEATURE MUSEUM.
 * - Start -> Acquire -> Understand -> Choose Action -> Configure -> Execute -> Verify -> Result.
 * - Minimal permanent navigation: Home, Projects, Activity.
 * - Capability-driven actions only. No fake buttons or mocked builds.
 */

import React, { useState, useEffect } from 'react';
import { ReshellProject } from './types/project';
import { listProjects, saveProject, deleteProject as removeProjectStorage } from './storage/persistence';
import { createStarterViteReactProject, createStarterNodeCliProject } from './core/project-model';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomeView } from './components/home/HomeView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ActivityView } from './components/activity/ActivityView';
import { ProjectWorkspace } from './components/workspace/ProjectWorkspace';
import { AcquireModal } from './components/acquisition/AcquireModal';
import { SettingsModal } from './components/settings/SettingsModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'projects' | 'activity'>('home');
  const [projects, setProjects] = useState<ReshellProject[]>([]);
  const [activeProject, setActiveProject] = useState<ReshellProject | null>(null);

  // Modals
  const [isAcquireOpen, setIsAcquireOpen] = useState(false);
  const [acquireInitialSource, setAcquireInitialSource] = useState<'zip' | 'github' | 'sample'>('zip');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize projects on mount
  useEffect(() => {
    async function init() {
      const stored = await listProjects();
      if (stored.length > 0) {
        setProjects(stored);
      } else {
        // Seed default starter project for immediate first-use productivity
        const defaultSample = createStarterViteReactProject();
        await saveProject(defaultSample);
        setProjects([defaultSample]);
      }
    }
    init();
  }, []);

  const handleOpenAcquire = (initialSource: 'zip' | 'github' | 'sample' = 'zip') => {
    setAcquireInitialSource(initialSource);
    setIsAcquireOpen(true);
  };

  const handleProjectAcquired = async (project: ReshellProject) => {
    await saveProject(project);
    const updated = [project, ...projects.filter((p) => p.id !== project.id)];
    setProjects(updated);
    setActiveProject(project);
    setIsAcquireOpen(false);
  };

  const handleSelectProject = (project: ReshellProject) => {
    setActiveProject(project);
  };

  const handleDeleteProject = async (id: string) => {
    await removeProjectStorage(id);
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    if (activeProject?.id === id) {
      setActiveProject(null);
      setCurrentTab('projects');
    }
  };

  const handleResetSamples = async () => {
    const reactSample = createStarterViteReactProject();
    const cliSample = createStarterNodeCliProject();
    await saveProject(reactSample);
    await saveProject(cliSample);
    setProjects([reactSample, cliSample]);
    setIsSettingsOpen(false);
  };

  const handleStorageCleared = async () => {
    const remaining = await listProjects();
    setProjects(remaining);
  };

  const handleOpenProjectById = (projectId: string) => {
    const found = projects.find((p) => p.id === projectId);
    if (found) {
      setActiveProject(found);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0d0e] text-neutral-100 antialiased font-sans selection:bg-neutral-800 selection:text-white">
      {/* 3-Zone Minimal Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'home' || tab === 'projects' || tab === 'activity') {
            setActiveProject(null);
          }
        }}
        onOpenAcquire={() => handleOpenAcquire('zip')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasActiveProject={!!activeProject}
        activeProjectName={activeProject?.name}
        onOpenActiveProject={() => {
          // Keep active project open
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeProject ? (
          <ProjectWorkspace
            project={activeProject}
            onBackToProjects={() => {
              setActiveProject(null);
              setCurrentTab('projects');
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : currentTab === 'home' ? (
          <HomeView
            recentProjects={projects}
            onOpenAcquire={handleOpenAcquire}
            onSelectProject={handleSelectProject}
            onOpenProjectsList={() => setCurrentTab('projects')}
          />
        ) : currentTab === 'projects' ? (
          <ProjectsView
            projects={projects}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            onOpenAcquire={() => handleOpenAcquire('zip')}
          />
        ) : (
          <ActivityView
            projects={projects}
            onOpenProjectById={handleOpenProjectById}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Acquisition Modal */}
      <AcquireModal
        isOpen={isAcquireOpen}
        onClose={() => setIsAcquireOpen(false)}
        onProjectAcquired={handleProjectAcquired}
        initialSource={acquireInitialSource}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetSamples={handleResetSamples}
        onStorageCleared={handleStorageCleared}
      />
    </div>
  );
}
