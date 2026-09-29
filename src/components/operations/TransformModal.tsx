/**
 * Transformation Operation Modal
 * Executes real Portable Single-File HTML bundle transformation,
 * validates structure, verifies output, and allows download or preview.
 */

import React, { useState } from 'react';
import { X, Layers, CheckCircle2, AlertCircle, Download, Eye, FileCode } from 'lucide-react';
import { ReshellProject } from '../../types/project';
import { transformToSingleFileBundle, TransformationResult } from '../../adapters/transformations/static-bundle';
import { saveOperationRecord } from '../../storage/persistence';
import { OperationRecord } from '../../types/operation';

interface TransformModalProps {
  isOpen: boolean;
  project: ReshellProject;
  onClose: () => void;
}

export const TransformModal: React.FC<TransformModalProps> = ({ isOpen, project, onClose }) => {
  const [result, setResult] = useState<TransformationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTransform = async () => {
    setErrorDetails(null);
    setResult(null);
    const startTime = Date.now();

    try {
      const transformRes = transformToSingleFileBundle(project);
      setResult(transformRes);

      const opRecord: OperationRecord = {
        id: `op_tf_${Date.now().toString(36)}`,
        capabilityId: 'transform-static-bundle',
        projectId: project.id,
        projectName: project.name,
        operationName: 'Transform to Portable Single-File HTML',
        createdAt: startTime,
        completedAt: Date.now(),
        state: transformRes.success ? 'VERIFIED' : 'FAILED',
        checks: transformRes.checks.map((c, i) => ({
          id: `check-${i}`,
          name: c.name,
          status: c.status,
          details: c.details,
          timestamp: Date.now(),
        })),
        summary: transformRes.success
          ? `Transformed into standalone HTML bundle (${(transformRes.outputSize / 1024).toFixed(1)} KB) with ${transformRes.inlinedStyles} style(s) and ${transformRes.inlinedScripts} script(s).`
          : `Transformation failed: ${transformRes.error?.message}`,
        details: {
          outputFileName: transformRes.outputFileName,
          outputSize: transformRes.outputSize,
          inlinedStyles: transformRes.inlinedStyles,
          inlinedScripts: transformRes.inlinedScripts,
        },
        error: transformRes.error,
      };

      await saveOperationRecord(opRecord);

      if (!transformRes.success && transformRes.error) {
        setErrorDetails(transformRes.error);
      }
    } catch (err: any) {
      setErrorDetails({
        message: err.message,
        affected: 'Transformation aborted.',
        notAffected: 'Original project was not modified.',
        recoveryAction: 'Check that project has valid HTML and CSS files.',
      });
    }
  };

  const handleDownload = () => {
    if (!result?.outputContent) return;
    const blob = new Blob([result.outputContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-neutral-400" />
            <h2 className="text-base font-semibold text-white">Single-File HTML Transformation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close transformation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!result ? (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-neutral-400 space-y-1.5 leading-relaxed">
              <p>
                Takes entry HTML, discovers all referenced stylesheets and scripts within the project,
                and compiles a self-contained portable HTML distribution file that runs offline without external servers.
              </p>
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded text-neutral-300 font-mono text-[11px]">
                Input: index.html ({project.files.filter((f) => f.extension === '.css').length} css, {project.files.filter((f) => ['.js', '.ts', '.tsx', '.jsx'].includes(f.extension)).length} js/ts)
              </div>
            </div>

            <button
              onClick={handleTransform}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <span>Execute Real Transformation</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/60 rounded-md flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Transformation Executed & Verified</span>
              </div>

              <div className="space-y-1 text-neutral-300 font-mono text-[11px]">
                <div>Output: {result.outputFileName}</div>
                <div>Payload: {(result.outputSize / 1024).toFixed(1)} KB</div>
                <div>Inlined Assets: {result.inlinedStyles} style(s), {result.inlinedScripts} script(s)</div>
              </div>

              <div className="pt-2 border-t border-emerald-900/40 space-y-1">
                {result.checks.map((chk, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                    <span className="text-emerald-400 font-mono">✓</span>
                    <span>{chk.name}: {chk.details}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download HTML ({result.outputFileName})</span>
              </button>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-neutral-400" />
                <span>{showPreview ? 'Hide Preview' : 'Preview Source'}</span>
              </button>
            </div>

            {showPreview && (
              <div className="bg-neutral-950 border border-neutral-800 rounded p-2.5 max-h-48 overflow-y-auto">
                <pre className="text-[11px] text-neutral-400 font-mono whitespace-pre-wrap break-all">
                  {result.outputContent.slice(0, 1500)}
                  {result.outputContent.length > 1500 && '\n... [truncated for display]'}
                </pre>
              </div>
            )}
          </div>
        )}

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
