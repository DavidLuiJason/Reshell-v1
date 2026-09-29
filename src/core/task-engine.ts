/**
 * Task Engine
 * Manages background and active operations with real states:
 * QUEUED, RUNNING, PAUSED, CANCELING, CANCELED, COMPLETED, FAILED
 */

import { ReshellTask, TaskLogEntry, TaskStatus } from '../types/task';

type TaskListener = (task: ReshellTask) => void;

class TaskEngine {
  private tasks = new Map<string, ReshellTask>();
  private listeners = new Set<TaskListener>();

  public createTask(operationId: string, title: string, projectId?: string, projectName?: string): ReshellTask {
    const task: ReshellTask = {
      id: `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      operationId,
      projectId,
      projectName,
      title,
      status: 'QUEUED',
      currentStepMessage: 'Queued for execution...',
      logs: [
        {
          timestamp: Date.now(),
          level: 'info',
          message: `Task queued: ${title}`,
        },
      ],
      startedAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    this.notify(task);
    return task;
  }

  public getTask(id: string): ReshellTask | undefined {
    return this.tasks.get(id);
  }

  public getAllTasks(): ReshellTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  public updateStatus(id: string, status: TaskStatus, stepMessage?: string, progressPercent?: number): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = status;
    if (stepMessage) {
      task.currentStepMessage = stepMessage;
      task.logs.push({
        timestamp: Date.now(),
        level: status === 'FAILED' ? 'error' : status === 'COMPLETED' ? 'success' : 'info',
        message: stepMessage,
      });
    }

    if (progressPercent !== undefined) {
      task.progressPercent = progressPercent;
    }

    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELED') {
      task.completedAt = Date.now();
    }

    this.notify(task);
  }

  public addLog(id: string, message: string, level: TaskLogEntry['level'] = 'info'): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.logs.push({ timestamp: Date.now(), level, message });
    this.notify(task);
  }

  public setError(
    id: string,
    error: { message: string; affected: string; notAffected: string; recoveryAction: string }
  ): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = 'FAILED';
    task.completedAt = Date.now();
    task.error = error;
    task.logs.push({
      timestamp: Date.now(),
      level: 'error',
      message: `Failed: ${error.message}`,
    });
    this.notify(task);
  }

  public setCompleted(id: string, summary: string, artifacts?: ReshellTask['artifacts']): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = 'COMPLETED';
    task.completedAt = Date.now();
    task.resultSummary = summary;
    task.artifacts = artifacts;
    task.logs.push({
      timestamp: Date.now(),
      level: 'success',
      message: `Completed: ${summary}`,
    });
    this.notify(task);
  }

  public subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(task: ReshellTask): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...task });
      } catch (err) {
        console.error('Task listener error', err);
      }
    }
  }
}

export const taskEngine = new TaskEngine();
