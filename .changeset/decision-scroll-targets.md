---
"e2e": minor
"@e2e-dev/web": patch
"@e2e-dev/mobile": patch
"@e2e-dev/decision": minor
---

Semantic observations can now report whether a node owns a scroll surface. The web engine derives this from real overflow geometry and the mobile engine projects agent-device's scroll-container classification. The decision executor uses that evidence to choose between scrolling the viewport and a specific scrollable container instead of always scrolling the page.
