# @e2e-dev/tern

Tern desktop/TUI engine for [e2e](https://www.npmjs.com/package/e2e).

It reads Tern's structured control surface and drives input through Tern while
keeping the runner on the standard `e2e/engine` contract.

## Usage

```ts
import type { E2EConfig } from 'e2e';
import { ternEngine } from '@e2e-dev/tern';

export default {
  targets: [{
    name: 'tui',
    engine: ternEngine({ pane: process.env.TERN_PANE, control: process.env.TERN_CONTROL }),
    app: {},
  }],
} satisfies E2EConfig;
```

When `pane` is omitted, every attempt gets a fresh Tern tab using `command`
(a shell by default), and teardown closes it.

## Credit

Initial Tern engine implementation by Kevin Rajan ([kvnloo](https://github.com/kvnloo)),
built on e2e's `defineEngine` contract and Tern/TSP's control surface.

## License

Apache-2.0
