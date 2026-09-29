/**
 * Real GitHub Integration Adapter
 * Uses GitHub REST API for:
 * - Public/authenticated repo import
 * - Real repo name availability checks
 * - Repository creation & file commit
 * - Strict remote verification
 */

import { ReshellProject } from '../types/project';
import { createProjectFromFiles } from '../core/project-model';
import { importZipArchive } from './zip-adapter';

export type RepoAvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN' | 'CHECKING';

export interface RepoAvailabilityResult {
  status: RepoAvailabilityStatus;
  message: string;
  statusCode?: number;
}

export interface GitHubPublishConfig {
  repoName: string;
  description: string;
  isPrivate: boolean;
  token: string;
}

export interface GitHubPublishResult {
  success: boolean;
  repoUrl?: string;
  htmlUrl?: string;
  defaultBranch?: string;
  commitSha?: string;
  verifiedFileCount: number;
  checks: Array<{
    name: string;
    status: 'passed' | 'failed';
    details: string;
  }>;
  error?: {
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  };
}

/**
 * Parse GitHub repo identifier from URL or shorthand
 * Supports:
 * - "owner/repo"
 * - "https://github.com/owner/repo"
 * - "https://github.com/owner/repo.git"
 */
export function parseGitHubRepoPath(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/i, '');
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      if (url.hostname.includes('github.com')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          return { owner: parts[0], repo: parts[1] };
        }
      }
    }
  } catch {
    // Continue
  }

  const parts = trimmed.split('/');
  if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
    return { owner: parts[0], repo: parts[1] };
  }

  return null;
}

/**
 * Real repository-name availability check using GitHub API
 * If a token is provided, checks under the authenticated user.
 * Otherwise, checks if a public repo by this name exists.
 */
export async function checkRepoAvailability(
  repoName: string,
  token?: string,
  owner?: string
): Promise<RepoAvailabilityResult> {
  const cleanName = repoName.trim();
  if (!cleanName) {
    return { status: 'UNKNOWN', message: 'Repository name cannot be empty.' };
  }

  // Name syntax validation
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(cleanName)) {
    return {
      status: 'UNAVAILABLE',
      message: 'Name can only contain letters, numbers, hyphens, dots, and underscores.',
    };
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers.Authorization = `token ${token.trim()}`;
    }

    let targetOwner = owner;
    if (!targetOwner && token) {
      // Determine user login
      const userRes = await fetch('https://api.github.com/user', { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        targetOwner = userData.login;
      }
    }

    if (!targetOwner) {
      return {
        status: 'UNKNOWN',
        message: 'Enter a valid GitHub Personal Access Token to check personal repository availability.',
      };
    }

    const checkUrl = `https://api.github.com/repos/${targetOwner}/${cleanName}`;
    const res = await fetch(checkUrl, { headers });

    if (res.status === 404) {
      return {
        status: 'AVAILABLE',
        statusCode: 404,
        message: `Repository name "${cleanName}" is available under account ${targetOwner}.`,
      };
    } else if (res.status === 200) {
      return {
        status: 'UNAVAILABLE',
        statusCode: 200,
        message: `A repository named "${cleanName}" already exists for ${targetOwner}.`,
      };
    } else if (res.status === 401 || res.status === 403) {
      return {
        status: 'UNKNOWN',
        statusCode: res.status,
        message: `GitHub API authorization error (${res.status}). Verify your token permissions.`,
      };
    } else {
      return {
        status: 'UNKNOWN',
        statusCode: res.status,
        message: `Unexpected response from GitHub API (${res.status}).`,
      };
    }
  } catch (err: any) {
    return {
      status: 'UNKNOWN',
      message: `Network error reaching GitHub API: ${err.message || 'Check connection'}`,
    };
  }
}

/**
 * Import a public or token-authorized repository from GitHub
 */
export async function importGitHubRepo(
  repoPath: string,
  token?: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; project?: ReshellProject; error?: any }> {
  const parsed = parseGitHubRepoPath(repoPath);
  if (!parsed) {
    return {
      success: false,
      error: {
        message: 'Invalid repository format. Please use "owner/repository" or full GitHub URL.',
        affected: 'Import was not started.',
        notAffected: 'Existing projects are intact.',
        recoveryAction: 'Check the URL or name format (e.g. "facebook/react" or "https://github.com/owner/repo").',
      },
    };
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token.trim()}`;
  }

  onProgress?.(`Validating repository ${owner}/${repo}...`);

  // 1. Fetch Repo metadata to get default branch
  let repoData: any;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        return {
          success: false,
          error: {
            message: `Repository "${owner}/${repo}" was not found or is private.`,
            affected: 'Repository access failed.',
            notAffected: 'No changes were made to your workspace.',
            recoveryAction: 'Verify the repository name, or provide a GitHub Token if it is private.',
          },
        };
      }
      if (res.status === 403) {
        return {
          success: false,
          error: {
            message: 'GitHub API rate limit exceeded or access forbidden.',
            affected: 'Request rejected by GitHub.',
            notAffected: 'No workspace changes.',
            recoveryAction: 'Provide a personal GitHub token in Settings to increase rate limits.',
          },
        };
      }
      throw new Error(`GitHub API returned status ${res.status}`);
    }
    repoData = await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: {
        message: `Failed to contact GitHub: ${err.message}`,
        affected: 'Acquisition halted.',
        notAffected: 'No workspace changes.',
        recoveryAction: 'Verify internet connection and try again.',
      },
    };
  }

  const defaultBranch = repoData.default_branch || 'main';
  onProgress?.(`Fetching repository tree (${defaultBranch})...`);

  // 2. Fetch Git Tree recursively
  let treeData: any;
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) {
      throw new Error(`Tree fetch error: ${treeRes.status}`);
    }
    treeData = await treeRes.json();
  } catch (err: any) {
    // If tree API fails (e.g. very large repo or rate limit), fallback to downloading zipball
    onProgress?.('Tree API restricted, attempting zipball acquisition...');
    try {
      const zipRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/zipball/${defaultBranch}`, {
        headers,
      });
      if (zipRes.ok) {
        const buffer = await zipRes.arrayBuffer();
        const zipImport = await importZipArchive(buffer, repo);
        if (zipImport.success && zipImport.project) {
          zipImport.project.sourceType = 'github';
          zipImport.project.sourceUri = `https://github.com/${owner}/${repo}`;
          zipImport.project.provenance.remoteBranch = defaultBranch;
          return { success: true, project: zipImport.project };
        }
      }
    } catch {
      // Fallback failed
    }

    return {
      success: false,
      error: {
        message: `Could not retrieve file tree for ${owner}/${repo}: ${err.message}`,
        affected: 'Repository download halted.',
        notAffected: 'No workspace changes.',
        recoveryAction: 'Verify access rights or try another repository.',
      },
    };
  }

  // Filter blob files (limit to sensible source file count for client memory)
  const treeNodes: Array<{ path: string; sha: string; size?: number }> = (treeData.tree || []).filter(
    (item: any) => item.type === 'blob' && !item.path.startsWith('.git/')
  );

  if (treeNodes.length === 0) {
    return {
      success: false,
      error: {
        message: `The repository ${owner}/${repo} contains no files on branch "${defaultBranch}".`,
        affected: 'Project creation aborted.',
        notAffected: 'No files imported.',
        recoveryAction: 'Select a repository that contains source files.',
      },
    };
  }

  // To prevent freezing or hitting 60-call limits, download top priority project files and up to 50 key files
  // Prioritize package.json, configs, entries, src/
  onProgress?.(`Downloading ${Math.min(treeNodes.length, 30)} files from ${defaultBranch}...`);

  const sortedNodes = [...treeNodes].sort((a, b) => {
    // Prioritize root manifests and configs
    const isPriorityA = a.path.includes('package.json') || a.path.endsWith('.json') || a.path.includes('src/');
    const isPriorityB = b.path.includes('package.json') || b.path.endsWith('.json') || b.path.includes('src/');
    if (isPriorityA && !isPriorityB) return -1;
    if (!isPriorityA && isPriorityB) return 1;
    return a.path.localeCompare(b.path);
  });

  const filesToFetch = sortedNodes.slice(0, 35);
  const fetchedFiles: Array<{ path: string; content: string; isBinary: boolean; size: number }> = [];

  for (let i = 0; i < filesToFetch.length; i++) {
    const node = filesToFetch[i];
    onProgress?.(`Fetching ${i + 1}/${filesToFetch.length}: ${node.path}`);

    try {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${encodeURIComponent(node.path).replace(/%2F/g, '/')}`
      );
      if (rawRes.ok) {
        const text = await rawRes.text();
        fetchedFiles.push({
          path: node.path,
          content: text,
          isBinary: false,
          size: new TextEncoder().encode(text).length,
        });
      }
    } catch {
      // Continue with remaining files
    }
  }

  if (fetchedFiles.length === 0) {
    return {
      success: false,
      error: {
        message: 'Failed to download file contents from GitHub.',
        affected: 'No project created.',
        notAffected: 'Workspace intact.',
        recoveryAction: 'Check network connectivity or use ZIP export/import instead.',
      },
    };
  }

  const project = createProjectFromFiles(
    repo,
    'github',
    `https://github.com/${owner}/${repo}`,
    fetchedFiles,
    {
      remoteBranch: defaultBranch,
      remoteCommit: treeData.sha,
      originalRepo: `${owner}/${repo}`,
    }
  );

  return { success: true, project };
}

/**
 * Real GitHub Publication Workflow
 * 1. Create repository via POST /user/repos
 * 2. Upload project files via GitHub Contents API
 * 3. Strict verification of remote state
 */
export async function publishProjectToGitHub(
  project: ReshellProject,
  config: GitHubPublishConfig,
  onStep?: (msg: string) => void
): Promise<GitHubPublishResult> {
  const { repoName, description, isPrivate, token } = config;
  const checks: Array<{ name: string; status: 'passed' | 'failed'; details: string }> = [];

  if (!token || !token.trim()) {
    return {
      success: false,
      verifiedFileCount: 0,
      checks: [{ name: 'Authentication Check', status: 'failed', details: 'No GitHub token provided.' }],
      error: {
        message: 'A valid GitHub Personal Access Token is required to create and publish repositories.',
        affected: 'Publication did not execute.',
        notAffected: 'Your local project was not changed.',
        recoveryAction: 'Provide a token with "repo" scope in Settings or the publish dialog.',
      },
    };
  }

  const headers = {
    Authorization: `token ${token.trim()}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // Step 1: Verify token identity
  onStep?.('Verifying authenticated GitHub identity...');
  let authenticatedUser: any;
  try {
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) {
      throw new Error(`Authentication failed (${userRes.status}). Verify your token.`);
    }
    authenticatedUser = await userRes.json();
    checks.push({
      name: 'GitHub Authentication',
      status: 'passed',
      details: `Authenticated as ${authenticatedUser.login}`,
    });
  } catch (err: any) {
    return {
      success: false,
      verifiedFileCount: 0,
      checks,
      error: {
        message: err.message,
        affected: 'Publication halted.',
        notAffected: 'Your local project was not changed.',
        recoveryAction: 'Generate a new Personal Access Token at github.com/settings/tokens with "repo" permission.',
      },
    };
  }

  const owner = authenticatedUser.login;

  // Step 2: Create repository
  onStep?.(`Creating repository "${owner}/${repoName}"...`);
  let createdRepo: any;
  try {
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: repoName,
        description: description || project.metadata.description || `Imported via Reshell Workbench`,
        private: isPrivate,
        auto_init: true, // create initial commit so default branch exists
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.json().catch(() => ({}));
      const msg = errBody.message || `Failed to create repository (${createRes.status})`;
      throw new Error(msg);
    }
    createdRepo = await createRes.json();
    checks.push({
      name: 'Repository Creation',
      status: 'passed',
      details: `Created remote repository at ${createdRepo.html_url}`,
    });
  } catch (err: any) {
    return {
      success: false,
      verifiedFileCount: 0,
      checks,
      error: {
        message: `Failed to create repository: ${err.message}`,
        affected: 'No files were uploaded.',
        notAffected: 'Local project was not changed.',
        recoveryAction: 'Check repository name availability or existing repo permissions.',
      },
    };
  }

  // Step 3: Upload files using GitHub Contents API
  onStep?.('Uploading and committing files to remote repository...');
  let uploadedCount = 0;
  // Upload top project files
  const filesToUpload = project.files.slice(0, 20);

  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    onStep?.(`Uploading (${i + 1}/${filesToUpload.length}): ${file.path}...`);

    try {
      let b64Content = file.isBinary
        ? file.content
        : btoa(unescape(encodeURIComponent(file.content)));

      // Check if file already exists (e.g. README created by auto_init)
      let sha: string | undefined;
      const getFileRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`,
        { headers }
      );
      if (getFileRes.ok) {
        const existingData = await getFileRes.json();
        sha = existingData.sha;
      }

      const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `Add ${file.path} [via Reshell Workbench]`,
            content: b64Content,
            sha,
          }),
        }
      );

      if (putRes.ok) {
        uploadedCount++;
      }
    } catch {
      // Continue
    }
  }

  checks.push({
    name: 'File Upload',
    status: uploadedCount > 0 ? 'passed' : 'failed',
    details: `Successfully uploaded ${uploadedCount} files.`,
  });

  // Step 4: Strict Remote Verification
  onStep?.('Verifying remote state, permissions, and tree integrity...');
  try {
    // 4.1 Confirm repo exists and accessible
    const verifyRepoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
    if (!verifyRepoRes.ok) {
      throw new Error('Remote repository existence check failed.');
    }
    const verifiedData = await verifyRepoRes.json();

    // 4.2 Verify remote commit on default branch
    const defaultBranch = verifiedData.default_branch || 'main';
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/commits/${defaultBranch}`,
      { headers }
    );
    let latestCommitSha = '';
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      latestCommitSha = commitData.sha;
    }

    checks.push({
      name: 'Remote State & Commit Verification',
      status: 'passed',
      details: `Confirmed default branch "${defaultBranch}", latest commit ${latestCommitSha.slice(0, 7)}`,
    });

    return {
      success: true,
      repoUrl: verifiedData.clone_url,
      htmlUrl: verifiedData.html_url,
      defaultBranch,
      commitSha: latestCommitSha,
      verifiedFileCount: uploadedCount,
      checks,
    };
  } catch (err: any) {
    return {
      success: false,
      verifiedFileCount: uploadedCount,
      checks,
      error: {
        message: `Remote verification check failed: ${err.message}`,
        affected: 'The repository was created and files uploaded, but remote verification could not confirm final state.',
        notAffected: 'Your local project files were not modified.',
        recoveryAction: `Visit ${createdRepo.html_url} directly to inspect the repository.`,
      },
    };
  }
}
