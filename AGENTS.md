# Basis Theory CLI

TypeScript CLI built with oclif. This is a public repository; keep guidance and contributions useful to contributors without access to internal systems.

## Project and Layout

- Command entry points live in `src/commands/`; shared credential flags, SDK setup, and API error handling live in `src/base.ts`.
- Shared runtime behavior lives outside command entry points, such as `src/logs/`, `src/reactors/`, and `src/proxies/`.
- Unit tests and their helpers live in `test/unit/`.
- Reuse `BaseCommand`, oclif parsing, and existing runtime helpers. Follow neighboring commands and tests rather than introducing parallel conventions.

## Development and Validation

- Use the existing Yarn dependencies and lockfile; keep dependency changes scoped to the requested work.
- Run `yarn build`, `yarn lint`, and relevant tests for code changes. Use `yarn test` for the complete test suite.
- For CLI behavior changes, also exercise the built command through `node bin/run`. Build first so validation does not use stale `dist/` output.
- Prefer synthetic fixtures and loopback HTTP for API-boundary validation. Do not require real credentials or mutate remote resources without explicit authorization.
- Report the checks actually run and any remaining limitations. Documentation-only changes do not require rebuilding unchanged runtime code.

## Public CLI Contracts

- Preserve existing flags, defaults, output formats, and exit behavior unless the requested change explicitly calls for a compatibility break.
- Keep descriptions, arguments, flags, and examples accurate in the command modules. Document required permissions and prerequisites when relevant.
- Never commit API keys, tokens, real customer identifiers, or customer payloads. Never expose credentials or customer data in logs, errors, examples, or fixtures.
- Use clearly synthetic values in tests and placeholders for credentials and other user-supplied values in documentation.
- Keep changes scoped; do not include unrelated refactors, dependency updates, or generated artifacts.

## Generated Documentation and Releases

- For command changes, update descriptions, flags, arguments, and examples in `src/commands/`. Do not regenerate or edit the generated usage, table of contents, or command reference in `README.md` as part of normal feature work.
- Release and packaging own README generation: `package.json`'s `version` and `prepack` scripts run `oclif readme`, and `.releaserc.json` includes `README.md` in the release commit. A release after merge generates the command reference from the command metadata.
- Edit `README.md` only when explicitly requested or when changing hand-authored content outside its generated sections. Keep machine-specific regeneration churn out of feature changes.

## Git and PR Workflow

- Use descriptive branch names. An internal ticket ID is not required.
- Use Conventional Commits for commit messages. When a PR title becomes the squash commit message, use the same format for the title.
- Mark intentional compatibility breaks with `!` or a `BREAKING CHANGE:` footer so automated releases can identify them. Release behavior is configured in `.releaserc.json`.
- Follow `.github/PULL_REQUEST_TEMPLATE.md`. Explain the user-visible change, validation performed, any manual testing required, and rollback or rollforward considerations.
- Keep PR descriptions self-contained. Public contributors and reviewers must not need access to private tickets or internal systems. Do not include private infrastructure details, workstation paths, or unapproved roadmap claims.
- Do not stage, commit, push, or publish a PR unless explicitly requested.
