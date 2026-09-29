/**
 * Operations & Verification Models
 */

export type VerificationState = 'REQUESTED' | 'EXECUTED' | 'VERIFIED' | 'FAILED';

export interface VerificationCheck {
  id: string;
  name: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  details?: string;
  timestamp?: number;
}

export interface OperationRecord {
  id: string;
  capabilityId: string;
  projectId: string;
  projectName: string;
  operationName: string;
  createdAt: number;
  completedAt?: number;
  state: VerificationState;
  checks: VerificationCheck[];
  summary: string;
  details?: Record<string, any>;
  error?: {
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  };
}
