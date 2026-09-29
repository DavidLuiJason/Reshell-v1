/**
 * Real GitHub Publish Operation Modal
 * Flow:
 * Configuration -> Real Name Availability Check -> Creation & Push -> Remote Verification -> Result
 */

import React, { useState, useEffect } from 'react';
import { X, Github, CheckCircle2, AlertCircle, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import { ReshellProject } from '../../types/project';
import { checkRepoAvailability, publishProjectToGitHub, RepoAvailabilityStatus, GitHubPublishResult } from '../../adapters/github-adapter';
import { loadSettings } from '../../storage/persistence';
import { saveOperationRecord } from '../../storage/persistence';
import { OperationRecord } from '../../types/operation';

interface PublishGitHubModalProps {
  isOpen: boolean;
  project: ReshellProject;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const PublishGitHubModal: React.FC<PublishGitHubModalProps> = ({
  isOpen,
  project,
  onClose,
  onOpenSettings,
}) => {
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Availability check states
  const [availStatus, setAvailStatus] = useState<RepoAvailabilityStatus>('UNKNOWN');
  const [availMessage, setAvailMessage] = useState('');
  const [isCheckingAvail, setIsCheckingAvail] = useState(false);

  // Execution states
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [publishResult, setPublishResult] = useState<GitHubPublishResult | null>(null);

  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const settings = loadSettings();
      setToken(settings.githubToken || '');
      const defaultName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      setRepoName(defaultName);
      setDescription(project.metadata.description || `Exported from Reshell Workbench`);
      setAvailStatus('UNKNOWN');
      setAvailMessage('');
      setPublishResult(null);
      setErrorDetails(null);
      setIsPublishing(false);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleCheckAvailability = async () => {
    if (!repoName.trim()) return;
    setIsCheckingAvail(true);
    setAvailStatus('CHECKING');
    setAvailMessage('Querying GitHub API...');

    const res = await checkRepoAvailability(repoName.trim(), token.trim() || undefined);
    setAvailStatus(res.status);
    setAvailMessage(res.message);
    setIsCheckingAvail(false);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setErrorDetails({
        message: 'GitHub Personal Access Token is required for publishing.',
        affected: 'Publication process did not start.',
        notAffected: 'Your local project files are intact.',
        recoveryAction: 'Configure your Personal Access Token with repo scope.',
      });
      return;
    }

    setIsPublishing(true);
    setErrorDetails(null);
    setPublishResult(null);
    setCurrentStep('Initiating GitHub publication workflow...');

    const startTime = Date.now();

    try {
      const res = await publishProjectToGitHub(
        project,
        {
          repoName: repoName.trim(),
          description: description.trim(),
          isPrivate,
          token: token.trim(),
        },
        (step) => setCurrentStep(step)
      );

      setPublishResult(res);

      // Record in Operation History (Requested -> Executed -> Verified -> Recorded)
      const opRecord: OperationRecord = {
        id: `op_gh_${Date.now().toString(36)}`,
        capabilityId: 'publish-github',
        projectId: project.id,
        projectName: project.name,
        operationName: 'Publish to GitHub',
        createdAt: startTime,
        completedAt: Date.now(),
        state: res.success ? 'VERIFIED' : 'FAILED',
        checks: res.checks.map((c, i) => ({
          id: `check-${i}`,
          name: c.name,
          status: c.status,
          details: c.details,
          timestamp: Date.now(),
        })),
        summary: res.success
          ? `Published ${res.verifiedFileCount} files to GitHub repository ${res.htmlUrl} (commit: ${res.commitSha?.slice(0, 7)}).`
          : `GitHub publication failed: ${res.error?.message}`,
        details: {
          repoUrl: res.repoUrl,
          htmlUrl: res.htmlUrl,
          defaultBranch: res.defaultBranch,
          commitSha: res.commitSha,
        },
        error: res.error,
      };

      await saveOperationRecord(opRecord);

      if (!res.success && res.error) {
        setErrorDetails(res.error);
      }
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Unknown publication failure.',
        affected: 'Publication process halted.',
        notAffected: 'Local project was not changed.',
        recoveryAction: 'Check token validity and network connection.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-neutral-400" />
            <h2 className="text-base font-semibold text-white">Publish to GitHub</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close publish dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!publishResult?.success ? (
          <form onSubmit={handlePublish} className="flex flex-col gap-4">
            {/* Token Prompt */}
            {!token.trim() ? (
              <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-md flex items-start gap-2.5 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1">
                  <p className="font-semibold">GitHub Personal Access Token required</p>
                  <p className="text-neutral-400 mt-0.5">
                    To create repositories and commit files, enter a token below or in Settings.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste GitHub PAT (repo scope)"
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-600 font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>Authenticated via Personal Access Token</span>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-neutral-300 hover:underline cursor-pointer"
                >
                  Change token
                </button>
              </div>
            )}

            {/* Repo Name & Availability Check */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-300">Repository Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => {
                    setRepoName(e.target.value);
                    setAvailStatus('UNKNOWN');
                    setAvailMessage('');
                  }}
                  required
                  placeholder="e.g. my-awesome-project"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs text-white placeholder-neutral-600 font-mono focus:outline-hidden focus:border-neutral-600"
                />
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={isCheckingAvail || !repoName.trim()}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isCheckingAvail ? 'Checking...' : 'Check Availability'}
                </button>
              </div>

              {/* Truthful Availability Status (Rule 16) */}
              {availStatus !== 'UNKNOWN' && (
                <div
                  className={`text-xs p-2 rounded border mt-1 font-mono ${
                    availStatus === 'AVAILABLE'
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : availStatus === 'UNAVAILABLE'
                      ? 'bg-red-950/40 border-red-800 text-red-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <strong>[{availStatus}]</strong> {availMessage}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-300">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief repository description"
                className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-neutral-600"
              />
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private-repo"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded bg-neutral-950 border-neutral-800 text-white focus:ring-0 cursor-pointer"
              />
              <label htmlFor="private-repo" className="text-xs text-neutral-300 cursor-pointer">
                Private repository (only you and collaborators can view)
              </label>
            </div>

            {/* Live Progress Output */}
            {isPublishing && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-md flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-neutral-300 animate-spin shrink-0" />
                <span className="text-xs text-neutral-300 font-mono">{currentStep}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPublishing || !repoName.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50 mt-1"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing & Verifying...</span>
                </>
              ) : (
                <span>Publish to GitHub</span>
              )}
            </button>
          </form>
        ) : (
          /* Result View (Section 17, 22) */
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-emerald-950/30 border border-emerald-900/60 rounded-md flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Published & Remotely Verified</span>
              </div>

              <div className="space-y-1.5 text-neutral-300">
                {publishResult.checks.map((chk, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 font-mono">✓</span>
                    <div>
                      <strong className="text-white">{chk.name}:</strong>{' '}
                      <span className="text-neutral-400">{chk.details}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-emerald-900/40 text-[11px] font-mono text-neutral-400">
                Remote Commit SHA: {publishResult.commitSha?.slice(0, 10)}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={publishResult.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors"
              >
                <span>View Repository on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={onClose}
                className="px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Structured Error Display */}
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
