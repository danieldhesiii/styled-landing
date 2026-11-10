# Visualiser design handoff — 8 November 2026

Owned UI changes are complete in RenderStage, BriefStep and LookProducts. No parent prop/API changes are required.

- Connected circular progress rail has active/completed/upcoming states, accessible stage labels, disabled preview navigation until a render exists, and navigation back to selection without generating or clearing the previous image.
- Selection summary uses wrapping thumbnail chips and accessible removal controls. Mode controls remain controlled by the parent; preview removals remain independent of basket actions.
- Event choices are compact pills with descriptions retained as tooltips. Generation controls keep the existing selection-change reopening, input, improvement/undo, error, compare, save and download behavior.
- Existing warm serif palette is retained with quieter borders, more deliberate spacing and restrained transitions. Reduced-motion rules suppress animation/transition effects throughout the stage; image hover effects run only without reduced motion.
- BriefStep has compact two-column mobile photo/style choices, numbered section markers, visible selected states and connected input labels.
- LookProducts uses taller product photography and calmer cards. All recorded chandeliers remain displayed, including price-on-request items. Every card now delegates to ProductPurchase instead of hiding the component for demoOnly products. Request-only availability explanation is shown once by ProductPurchase.

## Banach integration

ProductPurchase stays Banach-owned and was not edited. Its existing canRequestItem/purchaseAvailability support is consumed by LookProducts with unchanged onAdd/onQty/onRemove props. An integration regression renders the real ProductPurchase for a price-on-request Crescent Moon record, confirms the basket action is enabled and invokes the catalogue-record callback. Parent basket/request persistence remains parent-owned.

## Checks

41 focused tests passed across visualiser-selection, catalogue-product-ux and shopping-audit. TypeScript and owned-file whitespace checks passed. New regressions cover rail state/navigation without generation, request-only chandelier basket controls and BriefStep selection/input accessibility. No browser screenshot review was performed in this agent pass. No paid render, Next build, commit or deployment was run.
