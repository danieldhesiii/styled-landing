# Approved live privacy-only release, 2 November 2026

The owner explicitly approved "Publish the privacy page only" after reviewing the development policy. This approval covers this one public policy page, not a general development-to-production release.

- Live repository: danieldhesiii/styled-landing, main.
- Previous main: b533a3fcdd2bb9d9cb636d25a44fedecb329a892.
- Release commit: f74cf526990b4e5768607bcc11685c34275c69de, authored/committed using Daniel's deployment identity.
- Exact changed file: app/(site)/privacy/page.tsx. No other application files, dependencies, environment variables, domain mappings, database schemas or data were changed.
- Deployment: https://styled-landing-2i1e3tp5q-valorax-ai-s-projects.vercel.app, Vercel reported Ready and deployment completed.
- Previous ready deployment, retained for rollback reference: https://styled-landing-galtdhyu6-valorax-ai-s-projects.vercel.app.
- The local live checkout was clean before work and its original dev branch was restored afterwards. The release branch is codex/live-privacy-policy. Remote main contains the release.

## Verification

The live-repository production build, including TypeScript checks, passed before push. The committed tree diff was checked to contain exactly the privacy page. The deployment's logs identify commit f74cf52 and successful completion.

Unauthenticated requests to both https://styleduk.com/privacy and https://www.styleduk.com/privacy returned HTTP 200 and the complete new policy. Title: Privacy policy · Styled UK. Visible heading: Privacy policy. Optional Pinterest connection disclosure present. Canonical URL: https://styleduk.com/privacy. Chrome independently rendered the published page without login. The policy URL already submitted to Pinterest now contains the correction.

The change clarifies identity, company/application association, public policy labelling, Pinterest read-only access, optional secret-board access, selected-image copying, proposed AI-provider transfer, token handling and deletion requests. It does not establish provider approval or launch Pinterest functionality on the live app.

## Pinterest application remains separate

Existing app: StyledUK, ID 1633411. During the latest inspection Pinterest showed Trial access pending and locked the Details fields, including the short original description. No app description was changed or resubmitted in this release. Use the fuller description in pinterest-resubmission-2026-11-02.md when Pinterest allows editing or through an explicitly authorised support request.

Generic API approval alone must not enable the copy/storage/AI workflow without the applicable express permission. All other development changes remain separate; future live releases still need explicit owner approval.

Rollback, if later authorised or required by a verified release failure: revert only commit f74cf526990b4e5768607bcc11685c34275c69de on live main and redeploy, or select the retained previous ready deployment after independently confirming its identity. No rollback was performed or needed.
