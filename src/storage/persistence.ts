/**
 * IndexedDB & Local Storage persistence for Reshell
 */

import { ReshellProject } from '../types/project';
import { OperationRecord } from '../types/operation';

const DB_NAME = 'reshell_workbench_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_OPERATIONS = 'operations';
const SETTINGS_KEY = 'reshell_settings_v1';

export interface AppSettings {
  githubToken?: string;
  githubUser?: string;
  autoInspect: boolean;
  defaultZipCompression: 'STORE' | 'DEFLATE';
}

const DEFAULT_SETTINGS: AppSettings = {
  autoInspect: true,
  defaultZipCompression: 'DEFLATE',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_OPERATIONS)) {
        db.createObjectStore(STORE_OPERATIONS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: ReshellProject): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.put(project);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for project persistence', err);
    try {
      const existing = listProjectsFromLocalStorage();
      const updated = [project, ...existing.filter((p) => p.id !== project.id)];
      localStorage.setItem('reshell_projects_fallback', JSON.stringify(updated.slice(0, 5)));
    } catch {
      // Ignored if storage full
    }
  }
}

export async function getProject(id: string): Promise<ReshellProject | null> {
  try {
    const db = await openDB();
    return await new Promise<ReshellProject | null>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const local = listProjectsFromLocalStorage();
    return local.find((p) => p.id === id) || null;
  }
}

export async function listProjects(): Promise<ReshellProject[]> {
  try {
    const db = await openDB();
    return await new Promise<ReshellProject[]>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: ReshellProject[] = req.result || [];
        results.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return listProjectsFromLocalStorage();
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const local = listProjectsFromLocalStorage().filter((p) => p.id !== id);
    localStorage.setItem('reshell_projects_fallback', JSON.stringify(local));
  }
}

export async function saveOperationRecord(op: OperationRecord): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_OPERATIONS, 'readwrite');
      const store = tx.objectStore(STORE_OPERATIONS);
      const req = store.put(op);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const existing = listOperationsFromLocalStorage();
      const updated = [op, ...existing.filter((o) => o.id !== op.id)].slice(0, 30);
      localStorage.setItem('reshell_operations_fallback', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }
}

export async function listOperationRecords(): Promise<OperationRecord[]> {
  try {
    const db = await openDB();
    return await new Promise<OperationRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_OPERATIONS, 'readonly');
      const store = tx.objectStore(STORE_OPERATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: OperationRecord[] = req.result || [];
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return listOperationsFromLocalStorage();
  }
}

export async function clearAllOperations(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_OPERATIONS, 'readwrite');
      const store = tx.objectStore(STORE_OPERATIONS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.removeItem('reshell_operations_fallback');
  }
}

function listProjectsFromLocalStorage(): ReshellProject[] {
  try {
    const data = localStorage.getItem('reshell_projects_fallback');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function listOperationsFromLocalStorage(): OperationRecord[] {
  try {
    const data = localStorage.getItem('reshell_operations_fallback');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}
