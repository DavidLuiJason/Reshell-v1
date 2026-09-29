/**
 * Universal Project Model for Reshell
 */

export type SourceType = 'zip' | 'github' | 'sample';

export type ProjectType = 'web-app' | 'node-cli' | 'library' | 'static-site' | 'unknown';

export type ProjectPlatform = 'web' | 'node' | 'cross-platform' | 'unknown';

export interface ProjectFile {
  path: string; // Relative path, e.g. "src/index.ts"
  name: string; // File name, e.g. "index.ts"
  extension: string; // e.g. ".ts"
  size: number; // File size in bytes
  isBinary: boolean;
  content: string; // UTF-8 text content or base64 for binary
  lastModified?: number;
}

export interface ProjectMetadata {
  description?: string;
  version?: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
}

export interface ProjectInspection {
  inspectedAt: number;
  framework: string;
  language: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  entryPoints: string[];
  buildConfigs: string[];
  manifests: string[];
  detectedAssets: string[];
  totalFiles: number;
  totalSize: number;
  limitations: string[];
  detectedCapabilities: string[];
}

export interface ProjectProvenance {
  sourceType: SourceType;
  sourceUri: string;
  importedAt: number;
  checksumSha256?: string;
  originalFileName?: string;
  remoteBranch?: string;
  remoteCommit?: string;
}

export interface ReshellProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceType: SourceType;
  sourceUri: string;
  projectType: ProjectType;
  platform: ProjectPlatform;
  files: ProjectFile[];
  directories: string[];
  metadata: ProjectMetadata;
  inspection: ProjectInspection;
  provenance: ProjectProvenance;
  tags?: string[];
}
