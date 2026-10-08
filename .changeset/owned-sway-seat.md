---
"@e2e-dev/sway": minor
"@e2e-dev/tern": patch
---

Add rootless display leases, persistent named-seat keyboard and pointer input, exact process identity cleanup and explicit output capture. Native Tern taps can use the leased pointer; modifier acceptance requires real semantic effects on a surviving client.

Native observations are guarded by the leased client generation, and concurrent real-lease fixtures assert independent values, focus, caret and cleanup. The source injector streams UTF-8 without a whole-message allocation and normalizes chord key spelling without adding an unintended Shift modifier.

Required native fixtures also cover deliberately failed/retried bodies, an actual attempt deadline, early abort, partial launch failure and worker SIGKILL/SIGTERM/SIGINT recovery, with exact recorded native-generation and socket cleanup.

Keep cleanup journals host-private across sandbox boundaries, serialize supervisor publication/fork against durable closing, recover interrupted pre-journal allocation, and revalidate descendant PID/start/parent after pidfd acquisition. Cancel buffered injection when its client disconnects and reject post-guard cancellation before dispatch. Require structured intended failure/deadline outcomes and decode nested/styled recorded tool heads.

Guard direct native provider input and output capture against active or unknown Tern vendor gates before/after operations. Require a licensed/preprovisioned isolated test profile independently of native executable delivery; no live host authentication is imported. Strict kernel descendants exclude the pinned parent itself.
