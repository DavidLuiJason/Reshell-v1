/**
 * Capability Registry
 * The single source of truth for all actions Reshell can perform.
 */

import { CapabilityDefinition, CapabilityCategory } from '../types/capability';
import { ReshellProject } from '../types/project';

export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  {
    id: 'package-zip',
    name: 'Package to ZIP Archive',
    category: 'package',
    description: 'Compresses project files into a verified portable ZIP distribution archive.',
    supportedProjectTypes: ['web-app', 'node-cli', 'library', 'static-site', 'unknown'],
    supportedInputs: ['project-files'],
    supportedOutputs: ['application/zip'],
    prerequisites: [
      {
        id: 'has-files',
        description: 'Project must contain at least one file.',
        check: (p) => ({
          satisfied: p.files.length > 0,
          reason: p.files.length === 0 ? 'Project contains no files' : undefined,
        }),
      },
    ],
    limitations: [
      'Archives exceeding 100MB may experience browser memory constraints during compression.',
    ],
    isAvailableInCurrentRuntime: true,
  },
  {
    id: 'publish-github',
    name: 'Publish to GitHub',
    category: 'publish',
    description: 'Creates a verified repository on GitHub and pushes all project files with remote confirmation.',
    supportedProjectTypes: ['web-app', 'node-cli', 'library', 'static-site', 'unknown'],
    supportedInputs: ['project-files', 'github-token'],
    supportedOutputs: ['remote-git-repository'],
    prerequisites: [
      {
        id: 'has-files',
        description: 'Project must contain files to publish.',
        check: (p) => ({
          satisfied: p.files.length > 0,
          reason: p.files.length === 0 ? 'Cannot publish empty project' : undefined,
        }),
      },
    ],
    limitations: [
      'Requires a GitHub Personal Access Token (classic or fine-grained with repo permissions) to authenticate write operations.',
      'Subject to standard GitHub REST API rate limits.',
    ],
    isAvailableInCurrentRuntime: true,
  },
  {
    id: 'transform-static-bundle',
    name: 'Transform to Portable Single-File HTML',
    category: 'transform',
    description: 'Generates a standalone single-file HTML bundle embedding all inline scripts, stylesheets, and assets for offline execution.',
    supportedProjectTypes: ['web-app', 'static-site'],
    supportedInputs: ['html-entry', 'project-files'],
    supportedOutputs: ['text/html-single-file'],
    prerequisites: [
      {
        id: 'has-html-entry',
        description: 'Must have an index.html file.',
        check: (p) => ({
          satisfied: p.files.some((f) => f.path === 'index.html' || f.path === 'src/index.html'),
          reason: 'No index.html found in project root or src directory',
        }),
      },
    ],
    limitations: [
      'Complex multi-chunk dynamic imports require static path resolution.',
    ],
    isAvailableInCurrentRuntime: true,
  },
  {
    id: 'verify-roundtrip',
    name: 'Round-Trip Preservation Verification',
    category: 'inspect',
    description: 'Executes automated export-reimport round-trip validation to verify 100% byte and structural fidelity.',
    supportedProjectTypes: ['web-app', 'node-cli', 'library', 'static-site', 'unknown'],
    supportedInputs: ['project-files'],
    supportedOutputs: ['verification-report'],
    prerequisites: [
      {
        id: 'has-files',
        description: 'Project must have files to test round-trip transport.',
        check: (p) => ({
          satisfied: p.files.length > 0,
          reason: 'No files to test',
        }),
      },
    ],
    limitations: [],
    isAvailableInCurrentRuntime: true,
  },
  {
    id: 'build-android-apk',
    name: 'Compile Native Android APK',
    category: 'build',
    description: 'Compiles project into native Android APK / AAB package using Android SDK and Gradle.',
    supportedProjectTypes: ['web-app'],
    supportedInputs: ['project-files', 'android-manifest'],
    supportedOutputs: ['application/vnd.android.package-archive'],
    prerequisites: [
      {
        id: 'android-sdk',
        description: 'Android SDK and Gradle build environment must be installed.',
        check: () => ({
          satisfied: false,
          reason: 'Android SDK, Java JDK, and Gradle build tools are not present in browser client runtime.',
        }),
      },
    ],
    limitations: [
      'Cannot execute native Android compilation without headless container or remote build agent.',
    ],
    isAvailableInCurrentRuntime: false,
    unavailableReason: 'Android SDK, Java JDK, and Gradle build tools are not present in this browser runtime environment. Reshell does not simulate fake APK builds.',
  },
];

/**
 * Filter capabilities genuinely available for the given project in the current runtime.
 */
export function getAvailableCapabilities(project: ReshellProject): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter((cap) => {
    // Must be genuinely available in this runtime
    if (!cap.isAvailableInCurrentRuntime) return false;

    // Check project type match
    if (!cap.supportedProjectTypes.includes(project.projectType) && !cap.supportedProjectTypes.includes('unknown')) {
      return false;
    }

    // Check all prerequisites
    const meetsPrereqs = cap.prerequisites.every((req) => req.check(project).satisfied);
    return meetsPrereqs;
  });
}

/**
 * Get all capabilities by category for inspection / technical disclosure
 */
export function getAllCapabilities(): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY;
}
