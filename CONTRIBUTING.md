# Contributing to CSM Desktop

Thanks for your interest in improving CSM Desktop. Bug reports, fixes and well-scoped features are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach before you spend time on it.
- Problems with the `csm` command-line tool or background service belong in the [csm repository](https://github.com/onoja123/csm).
- Report security problems privately, as described in [SECURITY.md](SECURITY.md).

## Development setup

You need:

- macOS 12 or newer (Linux should work but is untested)
- Node.js 22 (see `.nvmrc`)
- Rust: `rust-toolchain.toml` pins the version and `rustup` installs it on first use
- Xcode command line tools
- `csm` itself: `go install github.com/onoja123/csm/cmd/csm@latest`

Then:

```bash
git clone https://github.com/onoja123/csm-desktop.git
cd csm-desktop
npm install
npm run app:dev
```

`npm run app:dev` opens the Tauri window with hot reload. The app starts `csm serve --detach` itself when the service isn't running.

For UI work you can also run the frontend in a normal browser with `npm run dev`. The dev server forwards `/__csm` requests to the csm socket, so the browser shows your real data.

## Checks

CI runs these on every pull request. Run them before you push:

```bash
npm run typecheck
npm test
npm run lint
npm run format:check   # npm run format fixes formatting
cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

## Code conventions

- **One React component per file.** Shared logic belongs in hooks (`src/hooks`), stores (`src/store`) or helpers (`src/lib`).
- **Shared types live in `src/types`**, split into `interfaces/`, `enums/` (string-literal unions, never TypeScript `enum`) and `aliases/`. Import them with `import type { … } from '@/types'`.
- **Icons** come from the free Hugeicons set and render through the `Icon` component in `src/components/ui`.
- **Formatting** is Prettier plus ESLint's blank-line rules. Let `npm run format` and `npm run lint` handle layout instead of formatting by hand.
- **Comments** are rare: write one only when the reason behind the code isn't obvious from the code itself.

## Pull requests

- Keep each pull request to one change, and describe what it does and how you tested it.
- Add or update tests when behavior changes.
- Include before and after screenshots for UI changes.
- Write commit messages as a short imperative summary, for example "Close the palette on Escape".

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
