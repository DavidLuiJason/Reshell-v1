/**
 * Task Engine Types
 */

export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'CANCELING'
  | 'CANCELED'
  | 'COMPLETED'
  | 'FAILED';

export interface TaskLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface ReshellTask {
  id: string;
  operationId: string;
  projectId?: string;
  projectName?: string;
  title: string;
  status: TaskStatus;
  progressPercent?: number; // Only when mathematically known, otherwise undefined
  currentStepMessage: string;
  logs: TaskLogEntry[];
  startedAt: number;
  completedAt?: number;
  error?: {
    message: string;
    affected: string;
    notAffected: string;
    recoveryAction: string;
  };
  resultSummary?: string;
  artifacts?: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
    data?: any;
  }>;
}
