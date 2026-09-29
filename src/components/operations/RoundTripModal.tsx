/**
 * Round-Trip Verification Test Modal
 * Runs automated transport test: Project -> Export ZIP -> Re-import -> Byte/hash comparison -> Verify parity
 */

import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ReshellProject } from '../../types/project';
import { runZipRoundTripVerification, RoundTripResult } from '../../core/verification';

interface RoundTripModalProps {
  isOpen: boolean;
  project: ReshellProject;
  onClose: () => void;
  onVerificationRecorded?: () => void;
}

export const RoundTripModal: React.FC<RoundTripModalProps> = ({
  isOpen,
  project,
  onClose,
  onVerificationRecorded,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<RoundTripResult | null>(null);

  if (!isOpen) return null;

  const handleRunTest = async () => {
    setIsRunning(true);
    setResult(null);
    setCurrentStep('Starting round-trip transport pipeline...');

    try {
      const res = await runZipRoundTripVerification(project, (step) => {
        setCurrentStep(step);
      });
      setResult(res);
      onVerificationRecorded?.();
    } catch (err: any) {
      // Ignored - runZipRoundTripVerification handles its own exceptions
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-400" />
            <h2 className="text-base font-semibold text-white">Round-Trip Transport Verification</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close round-trip verification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!result ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Verifies that Reshell preserves project fidelity across transport boundaries without data loss.
              This test exports the project to a real in-memory ZIP, re-extracts it through the extraction engine,
              and executes byte-level parity checks on all <strong className="text-white font-mono">{project.files.length}</strong> files.
            </p>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-md text-neutral-400 font-mono text-[11px] space-y-1">
              <div>1. Export project into compressed ZIP</div>
              <div>2. Validate archive header and CRC32 checksums</div>
              <div>3. Re-extract into isolated memory sandbox</div>
              <div>4. Diff every file path, size, and UTF-8 / binary payload</div>
              <div>5. Record immutable verification certificate in activity log</div>
            </div>

            {isRunning && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-md flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-neutral-300 animate-spin shrink-0" />
                <span className="text-xs text-neutral-300 font-mono">{currentStep}</span>
              </div>
            )}

            <button
              onClick={handleRunTest}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running Verification Pipeline...</span>
                </>
              ) : (
                <span>Execute Round-Trip Test</span>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div
              className={`p-4 rounded-md border flex flex-col gap-3 text-xs ${
                result.state === 'VERIFIED'
                  ? 'bg-emerald-950/30 border-emerald-900/60'
                  : 'bg-red-950/30 border-red-900/60'
              }`}
            >
              <div
                className={`flex items-center gap-2 font-semibold ${
                  result.state === 'VERIFIED' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {result.state === 'VERIFIED' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {result.state === 'VERIFIED'
                    ? '100% Round-Trip Parity Confirmed'
                    : 'Round-Trip Parity Discrepancy Found'}
                </span>
              </div>

              <div className="space-y-1.5">
                {result.checks.map((chk, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span
                      className={`font-mono shrink-0 ${
                        chk.status === 'passed' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {chk.status === 'passed' ? '✓' : '✗'}
                    </span>
                    <div>
                      <strong className="text-neutral-200">{chk.name}:</strong>{' '}
                      <span className="text-neutral-400">{chk.details}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                <span>Preserved: {result.matchedFiles} / {result.totalFilesTested} files</span>
                <span>Latency: {result.durationMs}ms</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
