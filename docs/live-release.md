# Releasing styleduk.com

Daniel's public styled-landing repository, branch main, feeds the styled-landing Vercel project. Both styleduk.com and www.styleduk.com use this project. The production database is Wedding Planner (yfwqcidkfjzpwbylgnug). Feature development continues in styledukprodprogress with its own database.

1. Bring only the approved change across on a branch. Open a pull request. Record the previous Ready deployment URL and the commit being replaced.
2. Review the diff and the GitHub Live release checks, including the isolated SQL fixtures, TypeScript, build and both sign-in forms. Inspect the Vercel preview. Keep private keys in the relevant provider settings.
3. Obtain the domain owner's release approval. Merge the tested revision. Vercel repeats the fixture tests before building. Verify the resulting deployment has both live aliases, check /api/health, and exercise the changed customer or supplier journey with an authorised test account. Health only indicates that the app responds.
4. If the customer journey fails, stop further releases. In the live Vercel project's Deployments view roll back to the recorded working deployment, check both aliases and the affected journey, then revert the change by pull request before the next deployment.
5. Review database migrations separately. Prefer backwards-compatible additions, verify a restorable backup before destructive changes, and rehearse in development. Rolling back Vercel does not restore database rows or Storage images.

## Operating limits

Require a pull request and the GitHub Actions verify check on main, including for administrators. Keep the branch up to date before merging. Ask another founder to review; assign a mandatory independent reviewer once a second maintainer has accepted write access. Repository owners can edit protections. Before changing repository visibility or ownership, verify both the GitHub protection plan and Vercel integration. This repository and its history are public.

Assign a primary and backup incident owner. Before relying on supplier bookings, test external downtime alerts, an actual supplier inbox delivery, and recovery of both a hosted database backup and its associated Storage images in isolation. Record the evidence and the last drill date. Keep a known working deployment and review support/email queue delays after each release.

The Domain health workflow checks both hostnames twice daily (07:17 and 19:17 UTC), on successful GitHub Production deployment events and on manual dispatch. Review failed Actions notifications and verify both founders receive alerts. This lightweight check does not exercise database operations or replace independent uptime monitoring.
