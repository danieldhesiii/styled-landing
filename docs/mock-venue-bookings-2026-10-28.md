# Mock venue booking walkthrough

Development-only code fixtures, not published venue records.

- `/venues/demo-oak-barn#enquire`: venue's own supplier network.
- `/venues/demo-manor-orangery#enquire`: venue-approved suppliers on Styled.
- `/venues/demo-city-hall#enquire`: wider Styled catalogue welcome.

Find them in Find venues under **Explore three demo venues**. Each card links directly to a practice request.

## Try it

1. Choose dates or use **Use example dates**, enter guest count and an optional note.
2. **Send practice request** shows the customer waiting for the venue.
3. Switch to **Venue team view** and simulate an agreement or suggest a week later.
4. Customers can request the alternative period, cancel a pending request or restart.
5. After simulated agreement, the next step reflects that venue's supplier policy.

The form uses a fictional customer and React component state only. It never calls booking, payment, email, account or supplier APIs. Requests disappear on page navigation or refresh and are not added to My bookings. No database rows, account links, real availability or calendar blocks are created. Venue fixtures use non-UUID demo identifiers and have no linked real catalogue suppliers or external booking links.

Existing real venue enquiry flows remain separate and retain their authentication, availability and ownership checks. The simulated team view is not access to a real operator workspace. Video and 3D tour areas remain clearly labelled placeholders.

Validation covers future dates, full hire period, bounded hire duration and venue capacity. Checked in browser for all three supplier routes, alternative date negotiation, cancellation and mobile width; automated date/capacity/fixture isolation tests added.
