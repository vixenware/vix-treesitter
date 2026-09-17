# Agent guidance

## Canonical project notes

Repository-local grammar and implementation documentation belongs in this repository. Cross-repository Vixenware architecture and durable engineering notes live in `~/w/vixenware/vixen-central`; start with `kb/README.md`. Infrastructure and operations live under `infra/notes/` there.

If work required guessing or asking for project information, update the canonical note after resolving it. Merge or restructure existing notes rather than adding another isolated account.

## Grammar source of truth

The reference parser is `crates/vixen-syntax` in the private `vixenware/vix` repository (`src/lexer.rs`, `src/kind.rs`, `src/parser/grammar/`). Mirror its keyword set, precedence table and contextual keywords; do not invent syntax here. After changing `grammar.js` or `src/scanner.c`, run `tree-sitter generate && tree-sitter test`, commit the regenerated `src/`, and copy `queries/*.scm` into `vixenware/vix-zed/languages/vix/` with a `rev` bump.
