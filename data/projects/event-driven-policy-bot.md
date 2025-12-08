# Event Driven Policy Bot

**Type:** work
**Status:** in-progress
**Created:** 2025-12-05
**Deadline:** 2025-12-19 (hard)

## Overview

Policy Bot is a GitHub App written in Go that enforces custom approval policies on pull requests using configurable YAML rules. It operates as a long-running HTTP server that:
- Receives GitHub webhook events (directly or via SQS)
- Evaluates pull request state against defined policies
- Posts commit statuses and manages reviewer assignments
- Provides UI for detailed policy evaluation insights

### Key Capabilities
1. **Multi-tenant support**: Handles both GitHub Enterprise Server (GHES) and GitHub Enterprise Cloud (GHEC)
2. **Dual ingestion paths**: HTTP webhooks and/or AWS SQS message queues
3. **Policy engine**: Complex approval rules with predicates, conditions, and logical operators
4. **Auto-reviewer assignment**: Automatically requests reviewers based on rules
5. **Cross-organization support**: Evaluates membership across multiple GitHub organizations

My task was to make it event driven by changing the events it received from webhook events to getting them from SQS. I have implemented the changes, but I need to figure out how to make it Production ready.

## Success Criteria

This will be done when:
- [ ] Fully deployed in production AWS environment
- [ ] New Relic visibility configured (dashboards + alerts)
- [ ] Adequate documentation complete
- [ ] Approved by all stakeholders (Jim + team)
- [ ] Uses Go best practices

## Context

**Where:** computer, office
**Best Time:** morning
**Working Hours:** Monday - Friday, 9am - 5pm

## Constraints

I can only work on this Monday - Friday, 9am - 5pm. I have made most of the changes, I just need to get it to production level readiness.

## Stakeholders

- **Jim** - Senior Lead Engineer (primary approver)
- Rest of the team (need approval via demo)

## Current State (as of 2025-12-05)

| Area | Progress | Notes |
|------|----------|-------|
| Infrastructure | 95% | Just needs code deployed |
| Monitoring | 0% | Metrics in code, no dashboards/alerts |
| Documentation | 80% | Needs cleanup, README update, runbook |
| Testing | 80% | Need manual Automerge test in cof-sandbox |

## Production Readiness Checklist

### Phase 1: Unblock PR (This Week) - HIGH PRIORITY

- [x] Create Production Readiness Checklist
- [ ] **Get 2 PR approvals** - Currently waiting, ping reviewers
- [ ] **Manual test Automerge in cof-sandbox** - REQUIRED before merge
- [ ] **Schedule demo for team + Jim** - Large change needs visibility

### Phase 2: Pre-Deploy (Dec 9-12) - MEDIUM PRIORITY

- [ ] **Update codegenie-car-bridge SNS policy for PROD** - REQUIRED for events to flow
- [ ] **Create New Relic dashboard** - Monitoring at 0%
- [ ] **Set up New Relic alerts** - Error rates, latency, queue depth
- [ ] **Update README with SQS architecture**
- [ ] **Update testing.md**
- [ ] **Create runbook** - Required for on-call support
- [ ] Remove old webhook references from docs

### Phase 3: Deploy & Verify (Dec 16-18) - HIGH PRIORITY

- [ ] **Merge PR to master** - After approvals + testing
- [ ] **Deploy to production AWS**
- [ ] **Verify production deployment** - Check metrics, test real PR

### Phase 4: Final Approval (Dec 19 - Deadline)

- [ ] **Get Jim's final sign-off**

## Critical Path

```
PR Approvals → Automerge Test → SNS Policy Update → Merge → Deploy → Verify → Jim Sign-off
```

## Additional Notes

I have been working on this for several months, and now I'm just trying to tie up the last few ends. But getting it to production ready seems hard. I have a pull request open for it and I am waiting on reviews, but it's a VERY large change with 90 files changed and about 25K lines of documentation, code, tests, etc.

## Progress Log

- 2025-12-05: Project created in Executive Brain
- 2025-12-05: Generated initial 5 tasks
- 2025-12-05: Created comprehensive Production Readiness Checklist through project chat
- 2025-12-05: Updated TickTick with 15+ tasks organized by phase and priority
