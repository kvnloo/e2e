---
"@e2e-dev/sway": minor
"@e2e-dev/tern": patch
---

Add rootless display leases, persistent named-seat keyboard and pointer input, exact process identity cleanup and explicit output capture. Native Tern taps can use the leased pointer; modifier acceptance requires real semantic effects on a surviving client.

Native observations are guarded by the leased client generation, and concurrent real-lease fixtures assert independent values, focus, caret and cleanup. The source injector streams UTF-8 without a whole-message allocation and normalizes chord key spelling without adding an unintended Shift modifier.
