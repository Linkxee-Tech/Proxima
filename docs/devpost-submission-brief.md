# Proxima

## A short project brief

Proxima is a workspace for turning everyday work requests into a clear plan, a useful draft, and a set of actions that stay under the user's control. It brings planning, approvals, connected tools, social publishing, and activity history into one place.

The project came from a simple frustration: work often gets scattered between notes, inboxes, calendars, and social accounts. A request such as "plan next week's launch" should not end as a vague checklist. It should become something a person can read, adjust, approve, and follow through on.

## Built with Codex and GPT-5.6

I used Codex throughout the build to work through the frontend and backend request paths, improve the approval and campaign flows, trace integration problems, add regression tests, and keep the README and architecture notes aligned with the code.

GPT-5.6 is used by Proxima to prepare first-pass work drafts and channel-specific social copy when `OPENAI_API_KEY` is configured. These responses are drafts, not automatic decisions: a user can edit them, save them, and decide whether an external action should be approved or scheduled.

The project deliberately keeps this boundary visible. Provider actions require a connected account and the right credentials, while approvals and delivery results make it clear what was requested, what was sent, and what a provider accepted or rejected.

## What you can try

- Give Proxima an open-ended work request. It prepares a structured draft that can be edited before use.
- Review a proposed action in the approval area. Nothing is sent externally until the user approves it.
- Connect supported accounts and send a message or publish a social post from the workspace.
- Prepare a social campaign, choose connected accounts, schedule it, or keep it for review.
- Create a recurring campaign. Proxima breaks a broad topic into smaller angles and continues on the selected schedule until the user stops it.
- Visit History to see completed work and the recorded outcome of supported actions.

## How it was built

The frontend is a Next.js application and the backend is built with FastAPI. The application stores users, work items, approvals, connected-account tokens, campaigns, and activity records in its database. OAuth connections are handled on the backend, and provider tokens are stored encrypted.

OpenAI is used for first-pass work drafts and social copy. The generated text is deliberately presented as a draft: the user can edit it and decide whether it should be approved or scheduled. I used Codex throughout the build to work through the API design, interface changes, integration flows, test coverage, and documentation. GPT-5.6 was used as part of that development process.

## A practical note for reviewers

The core workflow can be explored without connecting an external account. Sending email, calendar events, chat messages, and posts requires the corresponding account to be connected and configured with valid provider credentials. Published social campaigns currently send text; image selection is shown as a preview and is not yet uploaded to a provider. Scheduled and recurring work depends on the backend staying awake, so a host that sleeps can delay a due item until the service wakes again.

## Run it locally

The repository README contains the exact setup steps and environment-variable reference. In short:

1. Start the FastAPI backend on `http://localhost:8000`.
2. Start the Next.js frontend on `http://localhost:3000`.
3. Add the required local environment variables, then register and sign in.

For a complete walkthrough, please see the demo video and the repository README.
