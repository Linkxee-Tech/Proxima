export type AgentStatus = 'running' | 'waiting' | 'done' | 'pending_approval';
export type TaskStatus = 'queued' | 'running' | 'blocked' | 'completed';

export interface GoalRequest { goal: string; userId?: string }
export interface TaskNode { id: string; title: string; owner: string; status: TaskStatus; dependsOn: string[]; risk: 'low' | 'medium' | 'high' }
export interface Agent { id: string; name: string; role: string; status: AgentStatus; currentTask?: string }
export interface Artifact { id: string; name: string; type: 'document' | 'code' | 'report' | 'calendar' | 'email'; route: string }
export interface Approval { id: string; taskId: string; title: string; reason: string; status: 'pending' | 'approved' | 'rejected' }
export interface WorkflowPlan { id: string; goal: string; summary: string; tasks: TaskNode[]; agents: Agent[]; artifacts: Artifact[]; approvals: Approval[] }

export const NAVIGATION = [
  { route: '/', label: 'Conversation Hub' },
  { route: '/tasks', label: 'Task Board' },
  { route: '/agents', label: 'Agent Status' },
  { route: '/artifacts', label: 'Artifact Browser' },
  { route: '/approvals', label: 'Approval Center' },
  { route: '/architecture', label: 'Architecture' },
] as const;

export const API_ROUTES = {
  health: '/api/health',
  plan: '/api/kernel/plan',
  tasks: '/api/tasks',
  agents: '/api/agents',
  artifacts: '/api/artifacts',
  approvals: '/api/approvals',
  architecture: '/api/architecture',
} as const;
