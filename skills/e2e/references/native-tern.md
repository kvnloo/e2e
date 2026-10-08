# Native Tern tests

Use `@e2e-dev/tern` only with explicit session ownership. A borrowed single-pane window is already internally focused and is never closed, restarted or desktop-focused. Native actions use fresh AX/tree/dump state and a unique current hit; `getByRole`, labels and actual values use ordinary runner locators. Secure values are omitted. Pure focus is an accessibility action, not a click.

A capture lease is observation-only, truncated text. It cannot perform native actions or keyboards, and is not an AX or native-input proof. Do not silently fall back after a native control error. `ACTION_MAY_HAVE_COMMITTED` must not be replayed; stale identities can be retried by the runner.

Default native modifier delivery is refused. Select a provider with a real isolated keyboard for chords. Never discover the operator's control socket, dispatch host keyboard input, move physical focus, or reuse private profile credentials. Screenshot capture has no secret mask and is not advertised by this engine.

`apps/tern-testbed` is a real SDK fixture with inert controls. Its unit tests complement, not replace, the required real native CI job. The SDK is public; native Tern delivery is currently closed beta. A permitted reproducible pinned executable is a prerequisite, not a mockable test detail. No workstation paths, profiles, private binaries or histories belong in a contribution.

Native Tern 0.6 must explicitly report `state.gate.applies === false` before and after app observation/input/capture. Active or unknown vendor gates are a hard stop, even if AX exposes underlying controls. A vendor-supported licensed/preprovisioned isolated test profile is a separate prerequisite from executable delivery. Never automate sign-in/account actions, copy live host credentials or use underlying AX to bypass a covering gate. Fresh empty provider profiles may remain blocked until that prerequisite is supplied.

## Owned Linux input

Use `@e2e-dev/sway.sway` for a fresh headless pixman compositor and private runtime/profile. Pin absolute binary paths and explicitly build the shipped C source with its `build-input.mjs` script; no install hook, service change or permission grant is required. Input binds the generated seat by exact name, creates and retains keyboard/pointer capabilities before Tern starts, and rejects a missing manager or mismatched client generation. Never take the first available seat or sleep to pretend a client is ready.

Run the owned fixture through `e2e.sway.config.ts` with explicit `E2E_SWAY_BINARY`, `E2E_SWAYMSG_BINARY`, `E2E_GRIM_BINARY`, `E2E_TERN_BINARY` and `E2E_INPUT_BINARY`. Control+A must actually replace the native editor's selected text; following ordinary text must prove modifier release. The counter must change from a named-seat pointer click on that surviving client. A zero exit code is not that proof. The separate lifecycle fixture kills only its fresh worker and requires target-finish sweep to remove the recorded native client and sockets. Capture is opt-in and unmasked; keep real application artifacts private.

## Explicit Hyprland containment

Use `@e2e-dev/hyprland.hyprland` only with an exact approved parent instance/runtime/display/controller, explicit protected output names and protected workspace ids/names. Source-reviewed APIs are 0.53.0 and 0.56.2; the real disposable fixture pins 0.56.2. Stock Sway's `wlroots` app id is not unique: use the provider's generated exact tag, same-PID start identity, owned visible workspace/output, measured geometry and no-focus readback. Never create a broad `wlroots` rule, restore focus, reload configuration, activate a protected workspace or dispatch host-seat input.

Run `scripts/hyprland.ts` only in the approved disposable environment with explicit binaries and an already-readable render-only node. It creates a fresh GLES Sway parent and rootless bubblewrap fixture with no KMS/card, logind/seatd, system/auth sockets or host profile. PID coordinates stay shared for ownership checks. Missing user namespaces, dmabuf, permitted native runtime delivery or exact source version must fail, never fall back to physical devices. No permission change, provider credentials or GUI launches on the operator's desktop are required.

The real boundary proof is actual native AX plus rendered values, inert human value/focus and caret insertion, real chord/pointer effects, same client generation, owned PNG dimensions, parallel public CLI runs and SIGKILL/SIGTERM/SIGINT cleanup recovery. Separate Sway lease isolation is separate-compositor proof, not a claim of independently driven human seats inside one compositor. Raw capture is private and unmasked. Preserve durable records when ownership changes; never remove foreign resources or publish workstation artifacts/history.

