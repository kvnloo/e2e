---
"e2e": patch
---

Replay cache entries can now round-trip empty `type` and `typeText` values used to clear text fields. Other replay inputs that require nonempty values keep their existing validation.
