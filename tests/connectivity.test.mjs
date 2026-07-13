import assert from 'node:assert/strict';
import { test } from 'node:test';
import { API_ROUTES, NAVIGATION } from '../packages/contracts/src/index.ts';
import { createWorkflowPlan } from '../packages/kernel/src/index.ts';
import { renderRoute, webRoutes } from '../apps/web/src/routes.ts';
import { hasMobileScreen } from '../apps/mobile/src/navigation.ts';

test('all frontend and mobile navigation entries are wired', () => {
  assert.equal(webRoutes.length, NAVIGATION.length);
  for (const item of NAVIGATION) {
    assert.match(renderRoute(item.route), new RegExp(item.label));
    assert.equal(hasMobileScreen(item.route), true);
  }
});

test('kernel produces connected workflow with approval for high-risk execution', () => {
  const plan = createWorkflowPlan({ goal: 'Schedule a campaign launch meeting' });
  assert.ok(plan.tasks.every((task) => task.dependsOn.every((dep) => plan.tasks.some((candidate) => candidate.id === dep))));
  assert.ok(plan.approvals.some((approval) => approval.status === 'pending'));
  assert.ok(plan.agents.length >= 5);
});

test('api contract exposes expected backend endpoints', () => {
  assert.deepEqual(Object.keys(API_ROUTES).sort(), ['agents','approvals','architecture','artifacts','health','plan','tasks']);
});
