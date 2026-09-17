# vix-treesitter

Tree-sitter grammar for **Vix**, the language of the vixen build system.

Vix is experimental; this grammar tracks the reference parser and makes no stability promises.

## Layout

- `grammar.js` — the grammar
- `src/scanner.c` — external scanner for `doc { … }` / `rule name { … }` prose and backtick template text
- `queries/` — `highlights.scm`, `brackets.scm`, `indents.scm`
- `test/corpus/` — parse-tree snapshots
- `src/parser.c` — generated; committed so consumers do not need the tree-sitter CLI

## Developing

```sh
tree-sitter generate
tree-sitter test
tree-sitter parse path/to/file.vix
```

## Related

- `vixenware/vix-zed` — Zed extension consuming this grammar.

## License

MIT OR Apache-2.0
