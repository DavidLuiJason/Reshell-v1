/**
 * Verification Engine & Round-Trip Test Runner
 * Implements strict REQUESTED -> EXECUTED -> VERIFIED -> RECORDED lifecycle.
 */

import { ReshellProject } from '../types/project';
import { OperationRecord, VerificationCheck, VerificationState } from '../types/operation';
import { exportProjectToZip, importZipArchive } from '../adapters/zip-adapter';
import { saveOperationRecord } from '../storage/persistence';

export interface RoundTripResult {
  state: VerificationState;
  checks: VerificationCheck[];
  totalFilesTested: number;
  matchedFiles: number;
  mismatchedFiles: string[];
  summary: string;
  durationMs: number;
}

export async function runZipRoundTripVerification(
  project: ReshellProject,
  onProgress?: (msg: string) => void
): Promise<RoundTripResult> {
  const startTime = Date.now();
  const checks: VerificationCheck[] = [];
  const mismatchedFiles: string[] = [];

  // 1. REQUESTED
  checks.push({
    id: 'req-init',
    name: 'Verification Requested',
    status: 'passed',
    details: `Initiated round-trip transport test for "${project.name}" (${project.files.length} files).`,
    timestamp: Date.now(),
  });
  onProgress?.('Preparing project export...');

  // 2. EXECUTED: Step 1 - Export to real ZIP
  let exportRes;
  try {
    exportRes = await exportProjectToZip(project, 'DEFLATE');
    if (!exportRes.success || !exportRes.blob) {
      throw new Error('ZIP export failed.');
    }
    checks.push({
      id: 'exec-export',
      name: 'Archive Creation & Integrity',
      status: 'passed',
      details: `Generated valid archive (${exportRes.compressedBytes} bytes, SHA-256: ${exportRes.sha256.slice(0, 10)}...)`,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    checks.push({
      id: 'exec-export',
      name: 'Archive Creation',
      status: 'failed',
      details: err.message,
      timestamp: Date.now(),
    });
    return finalizeVerification(project, checks, 0, 0, [err.message], startTime, 'FAILED');
  }

  // EXECUTED: Step 2 - Re-import from generated ZIP
  onProgress?.('Re-importing generated archive into isolated test sandbox...');
  let importRes;
  try {
    importRes = await importZipArchive(exportRes.blob, `${project.name}-test`);
    if (!importRes.success || !importRes.project) {
      throw new Error(importRes.error?.message || 'Failed to extract archive.');
    }
    checks.push({
      id: 'exec-reimport',
      name: 'Safe Archive Re-Extraction',
      status: 'passed',
      details: `Successfully extracted ${importRes.project.files.length} files with path safety checks.`,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    checks.push({
      id: 'exec-reimport',
      name: 'Safe Archive Re-Extraction',
      status: 'failed',
      details: err.message,
      timestamp: Date.now(),
    });
    return finalizeVerification(project, checks, project.files.length, 0, [err.message], startTime, 'FAILED');
  }

  // 3. VERIFIED: Compare file-by-file
  onProgress?.('Executing byte-level fidelity comparison...');
  const reimportedProject = importRes.project;
  const originalFileMap = new Map(project.files.map((f) => [f.path, f]));
  const reimportedFileMap = new Map(reimportedProject.files.map((f) => [f.path, f]));

  let matchedCount = 0;

  for (const [path, original] of originalFileMap.entries()) {
    const reimported = reimportedFileMap.get(path);
    if (!reimported) {
      mismatchedFiles.push(`Missing file after transport: ${path}`);
      continue;
    }

    if (original.content !== reimported.content) {
      mismatchedFiles.push(`Content mismatch in file: ${path}`);
      continue;
    }

    matchedCount++;
  }

  const allMatched = matchedCount === project.files.length && mismatchedFiles.length === 0;

  checks.push({
    id: 'verify-parity',
    name: 'Byte & Structural Parity Check',
    status: allMatched ? 'passed' : 'failed',
    details: allMatched
      ? `100% parity verified across all ${matchedCount} project files.`
      : `Discrepancies found: ${mismatchedFiles.join('; ')}`,
    timestamp: Date.now(),
  });

  const finalState: VerificationState = allMatched ? 'VERIFIED' : 'FAILED';

  return finalizeVerification(
    project,
    checks,
    project.files.length,
    matchedCount,
    mismatchedFiles,
    startTime,
    finalState
  );
}

async function finalizeVerification(
  project: ReshellProject,
  checks: VerificationCheck[],
  total: number,
  matched: number,
  mismatches: string[],
  startTime: number,
  state: VerificationState
): Promise<RoundTripResult> {
  const durationMs = Date.now() - startTime;
  const summary =
    state === 'VERIFIED'
      ? `Verified round-trip transport fidelity. All ${total} files preserved byte-for-byte in ${durationMs}ms.`
      : `Round-trip verification failed: ${mismatches.length} file issue(s) detected.`;

  // 4. RECORDED: Save to persistent operation history
  const record: OperationRecord = {
    id: `op_verify_${Date.now().toString(36)}`,
    capabilityId: 'verify-roundtrip',
    projectId: project.id,
    projectName: project.name,
    operationName: 'Round-Trip Verification',
    createdAt: startTime,
    completedAt: Date.now(),
    state,
    checks,
    summary,
    details: {
      totalFiles: total,
      matchedFiles: matched,
      mismatches,
      durationMs,
    },
  };

  await saveOperationRecord(record);

  return {
    state,
    checks,
    totalFilesTested: total,
    matchedFiles: matched,
    mismatchedFiles: mismatches,
    summary,
    durationMs,
  };
}
