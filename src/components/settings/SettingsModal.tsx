/**
 * Application Settings Modal
 * Real settings: GitHub token configuration, storage status, and reset tools.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Key, Database, RefreshCw } from 'lucide-react';
import { AppSettings, loadSettings, saveSettings, clearAllOperations } from '../../storage/persistence';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSamples: () => void;
  onStorageCleared: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetSamples,
  onStorageCleared,
}) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [tokenInput, setTokenInput] = useState('');
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
    login?: string;
  }>({ tested: false });
  const [isTesting, setIsTesting] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = loadSettings();
      setSettings(current);
      setTokenInput(current.githubToken || '');
      setTestStatus({ tested: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveToken = () => {
    const updated = {
      ...settings,
      githubToken: tokenInput.trim() || undefined,
    };
    saveSettings(updated);
    setSettings(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleTestToken = async () => {
    const tok = tokenInput.trim();
    if (!tok) {
      setTestStatus({
        tested: true,
        success: false,
        message: 'Enter a token before testing.',
      });
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${tok}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (res.ok) {
        const user = await res.json();
        setTestStatus({
          tested: true,
          success: true,
          message: `Authenticated as @${user.login} (${user.name || 'User'})`,
          login: user.login,
        });
      } else {
        setTestStatus({
          tested: true,
          success: false,
          message: `GitHub returned status ${res.status}: Invalid or expired token.`,
        });
      }
    } catch (err: any) {
      setTestStatus({
        tested: true,
        success: false,
        message: `Network check failed: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all operation and verification logs? Your projects will remain intact.')) {
      await clearAllOperations();
      onStorageCleared();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-neutral-400" />
            <h2 className="text-base font-semibold text-white">Workbench Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GitHub PAT Section */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-neutral-300">
            GitHub Personal Access Token
          </label>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Required for creating repositories, publishing projects, and bypassing public rate limits.
            Saved only in your browser local storage.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-neutral-600 font-mono"
            />
            <button
              onClick={handleSaveToken}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md transition-colors cursor-pointer shrink-0"
            >
              Save
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleTestToken}
              disabled={isTesting}
              className="text-xs text-neutral-400 hover:text-neutral-200 underline decoration-neutral-700 underline-offset-4 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? 'Testing credentials...' : 'Verify token with GitHub'}
            </button>
            {savedNotice && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved locally
              </span>
            )}
          </div>

          {testStatus.tested && (
            <div
              className={`p-2.5 rounded-md text-xs mt-1 border ${
                testStatus.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/40 border-red-800 text-red-300'
              }`}
            >
              {testStatus.message}
            </div>
          )}
        </div>

        {/* Storage Management */}
        <div className="border-t border-neutral-800 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-neutral-400" />
            <h3 className="text-xs font-semibold text-neutral-300">Local Storage & History</h3>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Reshell stores acquired projects and operation records client-side in browser IndexedDB.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleClearHistory}
              className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-md transition-colors cursor-pointer"
            >
              Clear Operation Logs
            </button>
            <button
              onClick={onResetSamples}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-neutral-400" />
              Load Sample Starters
            </button>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
