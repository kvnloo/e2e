# Linux virtual desktop

Use this topic when a headed Linux test would otherwise map windows onto the
human desktop. The test surface must be disposable and must not steal the
user's workspace, keyboard focus, or pointer.

This guidance is for compositor/display isolation around e2e. It does not
replace the target engine: keep using `@e2e-dev/web`, a desktop engine, or a
project-specific engine inside the isolated environment.

## Invariants

A run is isolated only when all of these hold:

- record the host workspace/focus/pointer before setup and verify them again
  after teardown;
- create the test display before launching the first test window;
- never launch on the human display and move the window afterward;
- never use host `movecursor`, `focusmonitor`, `ydotool`, or equivalent
  input automation to drive a test;
- give concurrent runs unique output, workspace/socket, port, and window ids;
- use a shell `trap` or an equivalent finally block so processes, outputs,
  sockets, rules, and viewers are removed after failure;
- a screenshot proves rendering; compositor state proves placement; neither
  alone proves input isolation.

A live compositor headless output still shares the human compositor's seat.
Use a nested compositor or a KVM-backed VM when the test needs independent
pointer/keyboard state, compositor/plugin development, untrusted GUI code, or
strong parallel isolation.

## Pick the smallest isolation boundary

1. **KVM / microVM** — strongest boundary. Prefer an existing repository VM
   provider when one is already available. Boot an ephemeral guest/snapshot,
   run the compositor and e2e inside it, expose only a viewer endpoint and test
   artifacts, and tear the guest down after the run. Do not pass the host's
   physical input devices through to the guest.
2. **Nested compositor** — separate Wayland socket and compositor state without
   a whole VM. Target every command at the nested socket/instance; never reuse
   inherited `SWAYSOCK` or `HYPRLAND_INSTANCE_SIGNATURE`.
3. **Live headless output** — lightest lane for rendering, placement, capture,
   VNC, and ordinary headed tests. It is not an independent seat.

Do not build a VM from scratch merely because KVM exists. Reuse the project's
provider/image when present; otherwise the nested compositor is the default
strong-isolation lane.

## Hyprland: live headless output

Hyprland can create a fake headless output directly:

```bash
output="E2E-VIRTUAL-$PPID-$$"
hyprctl -j activeworkspace >"$tmp/host-workspace.before.json"
hyprctl -j activewindow >"$tmp/host-window.before.json"
hyprctl -j cursorpos >"$tmp/host-cursor.before.json"

hyprctl output create headless "$output"
```

Install the exact class/title placement rule **before** launching the app.
Place the test client on a silent workspace owned by `$output` and disable
initial focus. Use the configuration API loaded by that Hyprland version
(classic config, Lua, etc.); do not retry a rejected rule with guessed legacy
syntax.

For a TUI, launch its terminal with a unique title/class. For a browser, give
the headed browser a unique class instead of matching the user's ordinary
browser class.

Collect placement evidence from `hyprctl -j clients` (or layer diagnostics
for layer-shell surfaces) and visual evidence from the test output only:

```bash
grim -o "$output" "$tmp/frame.png"
```

Teardown includes:

```bash
hyprctl output remove "$output"
```

Then compare active workspace, active window, and cursor position with the
baseline. Any unexpected host change makes the isolation check fail.

## Sway: headless output or nested session

For a sidecar output on a running Sway session, snapshot
`swaymsg -t get_outputs -r`, create an output, then diff the output names so
the run records the new `HEADLESS-N` instead of assuming its number:

```bash
swaymsg -t get_outputs -r >"$tmp/outputs.before.json"
swaymsg create_output
swaymsg -t get_outputs -r >"$tmp/outputs.after.json"
```

Preinstall `for_window` placement and `no_focus` rules for the unique test
`app_id` before the application starts. When the run is complete, Sway 1.8+
can remove the synthetic output with:

```bash
swaymsg output "$output" unplug
```

When input or compositor state must be independent, prefer a nested headless
Sway process:

```bash
WLR_BACKENDS=headless WLR_LIBINPUT_NO_DEVICES=1 sway -d -c "$generated_config" &
nested_pid=$!
nested_sock="$XDG_RUNTIME_DIR/sway-ipc.$(id -u).$nested_pid.sock"
```

Wait until `swaymsg -s "$nested_sock" -t get_outputs` succeeds before
launching the app. Every later `swaymsg`, capture, input, and viewer command
must target the nested session. If socket discovery is ambiguous, stop rather
than risking the human compositor.

## Optional viewer: invisible until the user asks

A headless output can be exposed through `wayvnc` without making it the
human's active output. Bind `wayvnc` to loopback and select the test output:

```bash
wayvnc --disable-input --output "$output" 127.0.0.1 "$port"
```

Keep the viewer separate from the test harness. The harness writes a tiny
connection file such as `.e2e/virtual-display.env` containing the loopback
endpoint. A user-owned wrapper (for example,
`~/.local/bin/e2e-view-virtual-display`) reads that file and opens the user's
preferred VNC client. The agent must never invoke the wrapper or press its
keybind. `--disable-input` keeps this viewer observational: input stays with
the isolated test environment.

Example host bindings:

```text
# Hyprland
bind = SUPER SHIFT, E, exec, ~/.local/bin/e2e-view-virtual-display

# Sway
bindsym $mod+Shift+e exec ~/.local/bin/e2e-view-virtual-display
```

This keeps continuous tests invisible while making the current virtual display
one keypress away. The viewer is observational convenience, not part of pass/
fail evidence.

## e2e workflow

1. Read the project's existing e2e config and virtual-display/VM tooling.
2. Pick KVM, nested compositor, or live headless output based on the required
   isolation—not based on what is easiest to start.
3. Freeze host state and install placement/focus rules before first map.
4. Start the isolated environment, then run the ordinary e2e command inside
   that environment. Do not change test semantics just because the display is
   virtual.
5. Record e2e traces plus claim-matched compositor/capture evidence.
6. Tear everything down and prove the host baseline is unchanged.

## Provenance

Adapted from Kevin Rajan's `hyprland-ui-testing` skill and nested Hyprland
lease/isolation experiments. The core rule from that work is preserved here:
display isolation is not seat isolation, and cleanup/baseline preservation are
part of the test.
