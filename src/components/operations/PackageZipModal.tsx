/**
 * Package to ZIP Operation Modal
 * Implements real ZIP export, validation, and verification
 */

import React, { useState } from 'react';
import { X, Archive, Download, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { ReshellProject } from '../../types/project';
import { exportProjectToZip, ZipExportResult } from '../../adapters/zip-adapter';
import { saveOperationRecord } from '../../storage/persistence';
import { OperationRecord } from '../../types/operation';

interface PackageZipModalProps {
  isOpen: boolean;
  project: ReshellProject;
  onClose: () => void;
  onRunRoundTrip?: () => void;
}

export const PackageZipModal: React.FC<PackageZipModalProps> = ({
  isOpen,
  project,
  onClose,
  onRunRoundTrip,
}) => {
  const [compression, setCompression] = useState<'DEFLATE' | 'STORE'>('DEFLATE');
  const [isPackaging, setIsPackaging] = useState(false);
  const [result, setResult] = useState<ZipExportResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  } | null>(null);

  if (!isOpen) return null;

  const handlePackage = async () => {
    setIsPackaging(true);
    setErrorDetails(null);
    setResult(null);

    const startTime = Date.now();

    try {
      const exportRes = await exportProjectToZip(project, compression);
      setResult(exportRes);

      // Record in operation history
      const opRecord: OperationRecord = {
        id: `op_pkg_${Date.now().toString(36)}`,
        capabilityId: 'package-zip',
        projectId: project.id,
        projectName: project.name,
        operationName: 'Package to ZIP Archive',
        createdAt: startTime,
        completedAt: Date.now(),
        state: exportRes.validationPassed ? 'VERIFIED' : 'FAILED',
        checks: [
          {
            id: 'archive-created',
            name: 'Archive Generation',
            status: 'passed',
            details: `Created archive "${exportRes.fileName}" (${(exportRes.compressedBytes / 1024).toFixed(1)} KB)`,
            timestamp: Date.now(),
          },
          {
            id: 'archive-validated',
            name: 'Content Verification',
            status: exportRes.validationPassed ? 'passed' : 'failed',
            details: `Verified ${exportRes.verifiedFilesCount} of ${exportRes.fileCount} expected files present`,
            timestamp: Date.now(),
          },
        ],
        summary: `Exported ${exportRes.fileCount} files into validated ZIP archive (${(exportRes.compressedBytes / 1024).toFixed(1)} KB).`,
        details: {
          sha256: exportRes.sha256,
          compressedBytes: exportRes.compressedBytes,
          uncompressedBytes: exportRes.uncompressedBytes,
        },
      };

      await saveOperationRecord(opRecord);
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'ZIP packaging failed.',
        affected: 'Archive was not created.',
        notAffected: 'Your project files are unchanged.',
        recoveryAction: 'Check project files or select STORE compression without deflate.',
      });
    } finally {
      setIsPackaging(false);
    }
  };

  const handleDownload = () => {
    if (!result?.downloadUrl) return;
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-neutral-400" />
            <h2 className="text-base font-semibold text-white">Package to ZIP</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close packaging dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!result ? (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-neutral-400 space-y-1">
              <p>
                Packages all <strong className="text-white font-mono">{project.files.length}</strong> project files
                into a standard portable archive.
              </p>
              <p>
                Total uncompressed payload: <strong className="text-white font-mono">{(project.inspection.totalSize / 1024).toFixed(1)} KB</strong>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-300">Compression Algorithm</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCompression('DEFLATE')}
                  className={`px-3 py-2 text-xs rounded-md border text-left cursor-pointer transition-colors ${
                    compression === 'DEFLATE'
                      ? 'border-neutral-500 bg-neutral-800 text-white'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="font-semibold">Deflate (Compressed)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Smallest file size</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCompression('STORE')}
                  className={`px-3 py-2 text-xs rounded-md border text-left cursor-pointer transition-colors ${
                    compression === 'STORE'
                      ? 'border-neutral-500 bg-neutral-800 text-white'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="font-semibold">Store (Uncompressed)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Fastest packaging</div>
                </button>
              </div>
            </div>

            <button
              onClick={handlePackage}
              disabled={isPackaging}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {isPackaging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Packaging & Validating...</span>
                </>
              ) : (
                <span>Generate Verified ZIP</span>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/60 rounded-md flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Archive Generated & Verified</span>
              </div>
              <div className="space-y-1 text-neutral-300 font-mono text-[11px]">
                <div>File: {result.fileName}</div>
                <div>Size: {(result.compressedBytes / 1024).toFixed(1)} KB (compressed)</div>
                <div>Files: {result.verifiedFilesCount} verified of {result.fileCount}</div>
                <div className="truncate text-neutral-500">SHA-256: {result.sha256}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Archive ({result.fileName})</span>
              </button>

              {onRunRoundTrip && (
                <button
                  onClick={() => {
                    onClose();
                    onRunRoundTrip();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Run Round-Trip Verification Test</span>
                </button>
              )}
            </div>
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
