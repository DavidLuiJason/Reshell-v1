/**
 * Real ZIP Adapter
 * Implements safe extraction with Zip-Slip protection, validation, and real export.
 */

import JSZip from 'jszip';
import { ProjectFile, ReshellProject } from '../types/project';
import { createProjectFromFiles, normalizeFilePath } from '../core/project-model';

export interface ZipValidationResult {
  isValid: boolean;
  fileCount: number;
  uncompressedBytes: number;
  compressedBytes: number;
  sha256?: string;
  errors: string[];
}

export interface ZipImportResult {
  success: boolean;
  project?: ReshellProject;
  validation: ZipValidationResult;
  error?: {
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  };
}

export interface ZipExportResult {
  success: boolean;
  blob?: Blob;
  downloadUrl?: string;
  fileName: string;
  fileCount: number;
  uncompressedBytes: number;
  compressedBytes: number;
  sha256: string;
  validationPassed: boolean;
  verifiedFilesCount: number;
}

// Compute SHA-256 hex string using standard Web Crypto API
export async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate and Safely Extract a ZIP file into a ReshellProject
 */
export async function importZipArchive(
  fileOrBuffer: File | Blob | ArrayBuffer,
  defaultProjectName?: string
): Promise<ZipImportResult> {
  const errors: string[] = [];
  let buffer: ArrayBuffer;
  let rawFileName = 'archive.zip';

  if (fileOrBuffer instanceof File) {
    rawFileName = fileOrBuffer.name;
    buffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof Blob) {
    rawFileName = defaultProjectName ? `${defaultProjectName}.zip` : 'archive.zip';
    buffer = await fileOrBuffer.arrayBuffer();
  } else {
    buffer = fileOrBuffer;
  }

  const compressedBytes = buffer.byteLength;
  if (compressedBytes === 0) {
    return {
      success: false,
      validation: {
        isValid: false,
        fileCount: 0,
        uncompressedBytes: 0,
        compressedBytes: 0,
        errors: ['Archive is empty (0 bytes)'],
      },
      error: {
        message: 'The provided ZIP archive contains zero bytes.',
        affected: 'Import process aborted.',
        notAffected: 'No projects were created or modified.',
        recoveryAction: 'Select a valid, non-empty .zip file.',
      },
    };
  }

  let sha256 = '';
  try {
    sha256 = await computeSha256(buffer);
  } catch {
    // Non-fatal if crypto subtle unavailable
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (err: any) {
    return {
      success: false,
      validation: {
        isValid: false,
        fileCount: 0,
        uncompressedBytes: 0,
        compressedBytes,
        sha256,
        errors: [`Failed to parse ZIP structure: ${err.message || 'Invalid format'}`],
      },
      error: {
        message: 'The file is corrupted or not a valid ZIP archive format.',
        affected: 'Extraction halted before any files were read.',
        notAffected: 'Your workspace and projects remain unchanged.',
        recoveryAction: 'Check if the file was downloaded completely and try again.',
      },
    };
  }

  const extractedFiles: Array<{ path: string; content: string; isBinary: boolean; size: number }> = [];
  let totalUncompressedBytes = 0;

  // Process all files with security checks (Zip-Slip protection)
  const entries = Object.keys(zip.files);
  for (const entryName of entries) {
    const entry = zip.files[entryName];
    if (entry.dir) continue; // Skip directories

    // Zip-Slip Traversal Protection
    const normalized = normalizeFilePath(entryName);
    if (
      normalized.includes('../') ||
      normalized.startsWith('..') ||
      normalized.includes('\0') ||
      normalized.startsWith('/')
    ) {
      errors.push(`Ignored unsafe path in archive: ${entryName}`);
      continue;
    }

    // Skip OS junk files
    if (normalized.includes('__MACOSX') || normalized.endsWith('.DS_Store')) {
      continue;
    }

    try {
      const isKnownBinary = /\.(png|jpg|jpeg|gif|webp|ico|wasm|pdf|woff|woff2|ttf|eot|zip|tar|gz)$/i.test(
        normalized
      );

      if (isKnownBinary) {
        const base64Content = await entry.async('base64');
        const binaryBuffer = await entry.async('arraybuffer');
        totalUncompressedBytes += binaryBuffer.byteLength;
        extractedFiles.push({
          path: normalized,
          content: base64Content,
          isBinary: true,
          size: binaryBuffer.byteLength,
        });
      } else {
        const textContent = await entry.async('string');
        const size = new TextEncoder().encode(textContent).length;
        totalUncompressedBytes += size;
        extractedFiles.push({
          path: normalized,
          content: textContent,
          isBinary: false,
          size,
        });
      }
    } catch (err: any) {
      errors.push(`Failed to extract "${entryName}": ${err.message}`);
    }
  }

  if (extractedFiles.length === 0) {
    return {
      success: false,
      validation: {
        isValid: false,
        fileCount: 0,
        uncompressedBytes: totalUncompressedBytes,
        compressedBytes,
        sha256,
        errors: errors.length > 0 ? errors : ['No readable files found in archive'],
      },
      error: {
        message: 'No readable files could be extracted from this ZIP archive.',
        affected: 'No project was created.',
        notAffected: 'No local state was changed.',
        recoveryAction: 'Verify the archive contains project files and is not empty.',
      },
    };
  }

  // Derive project name from file name or package.json
  let derivedName = defaultProjectName || rawFileName.replace(/\.zip$/i, '');
  const pkgFile = extractedFiles.find((f) => f.path === 'package.json');
  if (pkgFile && !pkgFile.isBinary) {
    try {
      const parsed = JSON.parse(pkgFile.content);
      if (parsed.name && typeof parsed.name === 'string') {
        derivedName = parsed.name;
      }
    } catch {
      // Keep filename
    }
  }

  const project = createProjectFromFiles(
    derivedName,
    'zip',
    `zip://${rawFileName}`,
    extractedFiles,
    {
      originalFileName: rawFileName,
      checksumSha256: sha256,
      compressedSize: compressedBytes,
    }
  );

  return {
    success: true,
    project,
    validation: {
      isValid: true,
      fileCount: extractedFiles.length,
      uncompressedBytes: totalUncompressedBytes,
      compressedBytes,
      sha256,
      errors,
    },
  };
}

/**
 * Real ZIP Export: prepares, builds, validates, and verifies contents
 */
export async function exportProjectToZip(
  project: ReshellProject,
  compressionLevel: 'STORE' | 'DEFLATE' = 'DEFLATE'
): Promise<ZipExportResult> {
  const zip = new JSZip();
  let totalUncompressed = 0;

  // Add each project file
  for (const file of project.files) {
    totalUncompressed += file.size;
    if (file.isBinary) {
      zip.file(file.path, file.content, { base64: true });
    } else {
      zip.file(file.path, file.content);
    }
  }

  // Generate archive
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: compressionLevel,
    compressionOptions: { level: compressionLevel === 'DEFLATE' ? 6 : 1 },
  });

  const arrayBuffer = await zipBlob.arrayBuffer();
  const sha256 = await computeSha256(arrayBuffer);
  const compressedBytes = zipBlob.size;

  // Real Validation: re-open the generated ZIP and verify all files are present
  const verifyZip = await JSZip.loadAsync(arrayBuffer);
  const extractedKeys = Object.keys(verifyZip.files).filter((k) => !verifyZip.files[k].dir);

  const verifiedFilesCount = extractedKeys.length;
  const validationPassed = verifiedFilesCount === project.files.length;

  const sanitizedName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const fileName = `${sanitizedName || 'project'}-${Date.now().toString(36)}.zip`;
  const downloadUrl = URL.createObjectURL(zipBlob);

  return {
    success: true,
    blob: zipBlob,
    downloadUrl,
    fileName,
    fileCount: project.files.length,
    uncompressedBytes: totalUncompressed,
    compressedBytes,
    sha256,
    validationPassed,
    verifiedFilesCount,
  };
}
