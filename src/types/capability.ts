/**
 * Capability System Types
 */

import { ProjectType, ReshellProject } from './project';

export type CapabilityCategory = 'inspect' | 'package' | 'transform' | 'publish' | 'build';

export interface CapabilityPrerequisite {
  id: string;
  description: string;
  check: (project: ReshellProject) => { satisfied: boolean; reason?: string };
}

export interface CapabilityDefinition {
  id: string;
  name: string;
  category: CapabilityCategory;
  description: string;
  supportedProjectTypes: ProjectType[];
  supportedInputs: string[];
  supportedOutputs: string[];
  prerequisites: CapabilityPrerequisite[];
  limitations: string[];
  isAvailableInCurrentRuntime: boolean;
  unavailableReason?: string;
}
