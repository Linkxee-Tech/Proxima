'use client';
import { useSyncExternalStore } from 'react';
let graph = { nodes: [], edges: [] }; const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());
export const dagStore = { get: () => graph, set: (next) => { graph = next; notify(); }, subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); } };
export function useDAGStore() { return useSyncExternalStore(dagStore.subscribe, dagStore.get, dagStore.get); }
