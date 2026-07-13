import type { Agent, Approval, Artifact, GoalRequest, TaskNode, WorkflowPlan } from '../../contracts/src/index.ts';

const agents: Agent[] = [
  { id: 'agent-pm', name: 'PM Agent', role: 'Decomposes goals and routes work', status: 'running' },
  { id: 'agent-researcher', name: 'Researcher Agent', role: 'Retrieval, analysis, market research', status: 'waiting' },
  { id: 'agent-writer', name: 'Writer Agent', role: 'Documents, reports, content', status: 'waiting' },
  { id: 'agent-coder', name: 'Coder Agent', role: 'Code, tests, debugging', status: 'waiting' },
  { id: 'agent-operator', name: 'Operator Agent', role: 'Deployments and routine operations', status: 'pending_approval' },
];

export const architecture = {
  layers: ['user', 'orchestration', 'execution', 'infrastructure'],
  kernel: ['intent parser', 'task decomposer', 'state manager', 'scheduler', 'approval manager', 'observability'],
  clients: ['web', 'desktop', 'mobile'],
};

export function createWorkflowPlan(input: GoalRequest): WorkflowPlan {
  const goal = input.goal.trim() || 'Prepare everything for next month\'s marketing campaign';
  const tasks: TaskNode[] = [
    { id: 'task-intent', title: 'Parse high-level objective into structured intent', owner: 'agent-pm', status: 'completed', dependsOn: [], risk: 'low' },
    { id: 'task-research', title: 'Retrieve context from Memory Mesh and connected tools', owner: 'agent-researcher', status: 'running', dependsOn: ['task-intent'], risk: 'medium' },
    { id: 'task-plan', title: 'Generate executable DAG and milestones', owner: 'agent-pm', status: 'running', dependsOn: ['task-research'], risk: 'low' },
    { id: 'task-artifacts', title: 'Create deliverable artifacts and status reports', owner: 'agent-writer', status: 'queued', dependsOn: ['task-plan'], risk: 'low' },
    { id: 'task-execute', title: 'Execute approved tool actions in sandbox', owner: 'agent-operator', status: 'blocked', dependsOn: ['task-plan'], risk: 'high' },
  ];
  const artifacts: Artifact[] = [
    { id: 'artifact-plan', name: 'Workflow DAG', type: 'document', route: '/artifacts/artifact-plan' },
    { id: 'artifact-report', name: 'Progress Report', type: 'report', route: '/artifacts/artifact-report' },
  ];
  const approvals: Approval[] = [
    { id: 'approval-execute', taskId: 'task-execute', title: 'Approve sandbox tool execution', reason: 'High-risk or irreversible actions require human confirmation.', status: 'pending' },
  ];
  return { id: `plan-${Date.now()}`, goal, summary: `Proxima decomposed "${goal}" into ${tasks.length} connected tasks.`, tasks, agents, artifacts, approvals };
}

export function getSnapshot(): WorkflowPlan { return createWorkflowPlan({ goal: 'Demo Proxima AI-Native OS workflow' }); }
