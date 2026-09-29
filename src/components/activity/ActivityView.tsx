/**
 * Activity View
 * Answers:
 * - What happened?
 * - Is it still running?
 * - Did it succeed?
 * - What should I do next?
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Archive,
  Github,
  Layers,
} from 'lucide-react';
import { OperationRecord } from '../../types/operation';
import { listOperationRecords, clearAllOperations } from '../../storage/persistence';
import { ReshellProject } from '../../types/project';

interface ActivityViewProps {
  onOpenProjectById?: (projectId: string) => void;
  projects: ReshellProject[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({ onOpenProjectById, projects }) => {
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OperationRecord | null>(null);

  const loadOps = async () => {
    const list = await listOperationRecords();
    setOperations(list);
  };

  useEffect(() => {
    loadOps();
  }, []);

  const handleClear = async () => {
    if (confirm('Clear all activity records?')) {
      await clearAllOperations();
      setOperations([]);
      setSelectedRecord(null);
    }
  };

  const getCapabilityIcon = (capId: string) => {
    switch (capId) {
      case 'package-zip':
        return <Archive className="w-4 h-4 text-neutral-400" />;
      case 'publish-github':
        return <Github className="w-4 h-4 text-neutral-400" />;
      case 'transform-static-bundle':
        return <Layers className="w-4 h-4 text-neutral-400" />;
      case 'verify-roundtrip':
        return <ShieldCheck className="w-4 h-4 text-neutral-400" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Activity Log</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Audit trail of operations, packaging results, and verification checks.
          </p>
        </div>

        {operations.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-md transition-colors cursor-pointer self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {operations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Operations List */}
          <div className="lg:col-span-2 border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
            <div className="divide-y divide-neutral-800/80">
              {operations.map((op) => {
                const isSelected = selectedRecord?.id === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedRecord(op)}
                    className={`p-4 hover:bg-neutral-900/60 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected ? 'bg-neutral-900/90 border-l-2 border-white' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">{getCapabilityIcon(op.capabilityId)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {op.operationName}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
                              op.state === 'VERIFIED'
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                : op.state === 'EXECUTED'
                                ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                                : 'bg-red-950/60 border-red-800 text-red-300'
                            }`}
                          >
                            {op.state}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{op.summary}</p>

                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1.5 font-mono">
                          <span>Project: {op.projectName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(op.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-neutral-500 hover:text-white shrink-0 mt-1">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details / Next Steps Pane */}
          <div className="border border-neutral-800 rounded-lg p-5 bg-neutral-900/40 flex flex-col gap-4">
            {selectedRecord ? (
              <>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {selectedRecord.operationName}
                    </h3>
                    <span className="text-xs text-neutral-400 font-mono">
                      {selectedRecord.projectName}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      selectedRecord.state === 'VERIFIED'
                        ? 'text-emerald-400'
                        : selectedRecord.state === 'EXECUTED'
                        ? 'text-blue-400'
                        : 'text-red-400'
                    }`}
                  >
                    {selectedRecord.state}
                  </span>
                </div>

                <div className="text-xs text-neutral-300 space-y-1">
                  <div className="font-semibold text-white">Summary:</div>
                  <p className="leading-relaxed">{selectedRecord.summary}</p>
                </div>

                {selectedRecord.checks && selectedRecord.checks.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-neutral-400">Verified Checks:</span>
                    <div className="space-y-1 bg-neutral-950 border border-neutral-800 rounded p-2.5">
                      {selectedRecord.checks.map((chk, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px]">
                          <span
                            className={`font-mono shrink-0 ${
                              chk.status === 'passed' ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {chk.status === 'passed' ? '✓' : '✗'}
                          </span>
                          <div>
                            <strong className="text-neutral-300">{chk.name}:</strong>{' '}
                            <span className="text-neutral-500">{chk.details}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured Error if Failed */}
                {selectedRecord.error && (
                  <div className="p-3 bg-red-950/30 border border-red-900/60 rounded text-xs space-y-1">
                    <div className="font-semibold text-red-400">{selectedRecord.error.message}</div>
                    <div className="text-neutral-400">
                      <strong>Affected:</strong> {selectedRecord.error.affected}
                    </div>
                    <div className="text-neutral-400">
                      <strong>Not Affected:</strong> {selectedRecord.error.notAffected}
                    </div>
                    <div className="text-neutral-300">
                      <strong>Action:</strong> {selectedRecord.error.recoveryAction}
                    </div>
                  </div>
                )}

                {/* Actionable Next Step */}
                <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
                  {onOpenProjectById && (
                    <button
                      onClick={() => onOpenProjectById(selectedRecord.projectId)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                    >
                      <span>Open Project Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500">
                Select an operation to review its verified checks and execution details.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-neutral-800 rounded-lg bg-neutral-950 flex flex-col items-center gap-2">
          <Clock className="w-8 h-8 text-neutral-600 mb-1" />
          <h2 className="text-sm font-semibold text-white">No activity recorded yet</h2>
          <p className="text-xs text-neutral-400 max-w-sm">
            Operations such as packaging to ZIP, GitHub publishing, and round-trip verification will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
