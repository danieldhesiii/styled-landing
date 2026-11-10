# Domain demo release, 10 November 2026

Owner requested publication of the current prodprogress site on styleduk.com, with a separate matching development copy for further work.

## Release layout

- Public demo: styleduk.com and www.styleduk.com, Vercel styled-landing, GitHub danieldhesiii/styled-landing main, database yfwqcidkfjzpwbylgnug.
- Ongoing development: styledukprodprogress.vercel.app, Vercel styledukprodprogress, GitHub danieldhesiii/styledukprodprogress main, database qkyeitvwscrxbiwamxan.
- Application source snapshot: 4924ee5.
- Publish future development to the domain only when the owner explicitly requests it.
- Accounts, orders and saved plans belong to each environment independently.

## Database and demo

The owner explicitly approved the 17 live database updates. They were applied together as styled_domain_demo_release_20261110. Counts remained 18 users, 8 orders, 36 products and 12 suppliers before and after.

STYLED_PUBLIC_DEMO_ENABLED=true enables the server-owned Crescent Moon demo catalogue on the two approved domain hostnames with the live database. Demonstration requests keep their existing snapshot-only restrictions and cannot become payable quotes or confirmed bookings.

Live settings retain the existing live database and OpenAI credentials. Resend and Pinterest configuration must be checked independently before advertising these integrations as available on the public domain. The development integration credentials are not copied by this release.

## Rollback reference

Previous live source: f74cf526990b4e5768607bcc11685c34275c69de.
Previous live deployment: dpl_J6w2mLJ9aCYKLK7Hu5PwJb8zo9gG.
Previous URL: https://styled-landing-2i1e3tp5q-valorax-ai-s-projects.vercel.app.
Restore the retained application deployment if a release defect requires it. Additive database updates remain in place.
