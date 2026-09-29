/**
 * Quiet, Unbloated Footer
 */

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950/80 py-4 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-400">Reshell</span>
          <span aria-hidden="true">·</span>
          <span>Task-Oriented Project Workbench</span>
          <span aria-hidden="true">·</span>
          <span>Deterministic Transport & Verification</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Client Runtime Mode</span>
          <span aria-hidden="true">·</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};
