# vix-treesitter

Tree-sitter grammar for **vix**, the language of the [vixen](https://vixen.rs)
build system and the [facet](https://facet.rs) toolchain's demand machine.

vix is experimental; this grammar tracks it closely and makes no stability
promises yet.

## Provenance

The grammar's **source of truth** lives in the facet monorepo, next to snark
(the grammar engine that executes it):

```
https://github.com/facet-rs/facet
  playgrounds/snark/src/bundled/vix/grammar.js
  playgrounds/snark/src/bundled/vix/queries/highlights.scm
```

This repository is the *published mirror* for consumers that fetch grammars
from public git — notably Zed (via the `vix-zed` extension) — and ships the
generated parser so consumers don't need the tree-sitter CLI.

## Regenerating

After syncing `grammar.js` from the bundle:

```sh
tree-sitter generate grammar.js
# refresh src/parser.c, src/grammar.json, src/node-types.json,
# src/tree_sitter/*.h from the generated output
```

## Related

- `arborium-vix` on crates.io — the same parser packaged as an
  [arborium](https://github.com/bearcove/arborium)-compatible Rust crate
  (published from the facet monorepo).
- `vixenware/vix-zed` — the Zed extension consuming this grammar.

## License

MIT OR Apache-2.0, matching facet.
