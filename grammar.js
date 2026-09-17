// Tree-sitter grammar for Vix. Mirrors crates/vixen-syntax (the reference
// parser) in the vix repository: same keyword set, same precedence table,
// same contextual keywords.

const PREC = {
  or: 1,
  and: 2,
  compare: 3,
  range: 4,
  add: 5,
  mul: 6,
  unary: 7,
  postfix: 8,
  closure: -1,
};

const IDENT = /[a-zA-Z_][a-zA-Z0-9_]*/;

function sep(rule, delim) {
  return optional(seq(rule, repeat(seq(delim, rule)), optional(delim)));
}

function commaSep(rule) {
  return sep(rule, ",");
}

module.exports = grammar({
  name: "vix",

  extras: ($) => [/[ \t\r\n\f]+/, $.line_comment, $.module_comment],

  externals: ($) => [$.doc_text, $.rule_text, $.template_text, $._error_sentinel],

  supertypes: ($) => [$._expr, $._pattern, $._type, $._item],

  conflicts: ($) => [
    [$.record_field, $._path_expr],
    [$._path_segment, $._path_expr],
    [$.param_list, $._path_segment],
    [$.method_call_expr, $.field_expr],
    [$.annotated_expr],
    [$._path_segment, $.record_field],
    [$.path, $._path_expr],
    [$._path_segment, $.identifier_pattern],
    [$.path],
    [$.record_expr, $._expr],
    [$.record_expr, $._path_expr],
    [$.map_entry, $.record_field],
    [$.anon_record_expr, $.block],
  ],

  rules: {
    source_file: ($) => repeat($._item),

    // ---------------------------------------------------------------- items

    _item: ($) =>
      choice(
        $.doc,
        $.rule,
        $.fn_item,
        $.realizer_item,
        $.process_item,
        $.struct_item,
        $.enum_item,
        $.use_item,
        $.import_item,
        $.namespace_item,
        $.source_item,
        $.ledger_item,
      ),

    visibility: (_) => "pub",

    attribute: ($) =>
      seq("#", "[", field("name", $.identifier), optional($.attribute_args), "]"),

    attribute_args: ($) => seq("{", commaSep($.attribute_arg), "}"),

    attribute_arg: ($) =>
      seq(field("name", $.identifier), ":", field("value", $._expr)),

    doc: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        alias(token(seq("doc", /[ \t]*/, "{")), "doc"),
        repeat(choice($.doc_text, $.example)),
        "}",
      ),

    example: ($) => seq("example", field("name", $.identifier), field("body", $.block)),

    rule: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        "rule",
        field("name", $.identifier),
        "{",
        repeat(choice($.rule_text, $.test)),
        "}",
      ),

    test: ($) => seq("test", field("name", $.identifier), field("body", $.block)),

    fn_item: ($) => seq(repeat($.attribute), optional($.visibility), "fn", $._callable),

    realizer_item: ($) => seq(repeat($.attribute), optional($.visibility), "realizer", $._callable),

    _callable: ($) =>
      seq(
        field("name", $.identifier),
        optional(field("generics", $.generic_params)),
        field("params", $.param_list),
        optional(field("where", $.where_params)),
        optional(seq("->", field("return_type", $._type))),
        choice(field("body", $.block), ";"),
      ),

    process_item: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        "process",
        field("name", $.identifier),
        field("params", $.param_list),
        field("body", $.block),
      ),

    generic_params: ($) =>
      choice(
        seq("<", commaSep($.type_param), ">"),
        seq("[", commaSep($.type_param), "]"),
      ),

    type_param: ($) => $.identifier,

    param_list: ($) => seq("(", commaSep(choice($.self, $.param)), ")"),

    param: ($) =>
      seq(
        repeat($.attribute),
        field("pattern", $._pattern),
        optional(seq(":", field("type", $._type))),
      ),

    where_params: ($) => seq("where", "{", commaSep($.where_param), "}"),

    where_param: ($) => seq(field("name", $.identifier), ":", field("type", $._type)),

    struct_item: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        "struct",
        field("name", $.identifier),
        optional(field("generics", $.generic_params)),
        choice(";", field("fields", $.field_list)),
      ),

    field_list: ($) => seq("{", commaSep($.field_def), "}"),

    field_def: ($) =>
      seq(repeat($.attribute), field("name", $.identifier), ":", field("type", $._type)),

    enum_item: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        "enum",
        field("name", $.identifier),
        optional(field("generics", $.generic_params)),
        "{",
        commaSep($.variant),
        "}",
      ),

    variant: ($) =>
      seq(field("name", $.identifier), optional(choice($.tuple_field_list, $.field_list))),

    tuple_field_list: ($) => seq("(", commaSep($._type), ")"),

    use_item: ($) => seq(repeat($.attribute), optional($.visibility), "use", $.use_tree, ";"),

    import_item: ($) => seq(repeat($.attribute), optional($.visibility), "import", $.use_tree, ";"),

    use_tree: ($) =>
      choice(
        $.use_tree_list,
        seq(
          field("path", $.path),
          optional(seq(".", $.use_tree_list)),
          optional(seq("as", field("alias", $.identifier))),
        ),
      ),

    use_tree_list: ($) => seq("{", commaSep($.use_tree), "}"),

    namespace_item: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        "namespace",
        field("name", $.identifier),
        optional(field("generics", $.generic_params)),
        "{",
        repeat($._item),
        "}",
      ),

    source_item: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        "source",
        field("name", $.identifier),
        field("params", $.param_list),
        "{",
        repeat($.query),
        "}",
      ),

    query: ($) =>
      seq(
        "query",
        field("name", $.identifier),
        field("params", $.param_list),
        optional(seq("->", field("return_type", $._type))),
        ";",
      ),

    ledger_item: ($) =>
      seq(
        repeat($.attribute), optional($.visibility),
        "ledger",
        field("name", $.identifier),
        field("params", $.param_list),
        "using",
        field("codec", $.identifier),
        "{",
        repeat($.resource),
        "}",
      ),

    resource: ($) => seq("resource", $._callable),

    // ---------------------------------------------------------------- paths

    // `a.b.c` or `./module.item` in import, type, and pattern positions.
    path: ($) =>
      seq(optional(seq(".", "/")), $._path_segment, repeat(seq(".", $._path_segment))),

    _path_segment: ($) => choice($.identifier, $.self),

    self: (_) => "self",

    // ---------------------------------------------------------------- types

    _type: ($) => choice($.array_type, $.tuple_type, $.fn_type, $.path_type),

    array_type: ($) => seq("[", $._type, "]"),

    tuple_type: ($) => seq("(", commaSep($._type), ")"),

    fn_type: ($) =>
      seq("fn", "(", commaSep($._type), ")", optional(seq("->", $._type))),

    path_type: ($) => seq(field("path", $.path), optional(field("args", $.generic_args))),

    generic_args: ($) =>
      choice(seq("<", commaSep($._type), ">"), seq("[", commaSep($._type), "]")),

    // ------------------------------------------------------------- patterns

    _pattern: ($) =>
      choice(
        $.wildcard_pattern,
        $.rest_pattern,
        $.tuple_pattern,
        $.literal_pattern,
        $.identifier_pattern,
        $.tuple_struct_pattern,
        $.record_pattern,
        $.path_pattern,
      ),

    wildcard_pattern: (_) => "_",
    rest_pattern: (_) => "..",
    tuple_pattern: ($) => seq("(", commaSep($._pattern), ")"),
    literal_pattern: ($) => seq(optional("-"), $._literal),
    identifier_pattern: ($) => $.identifier,
    tuple_struct_pattern: ($) => seq(field("path", $.path), "(", commaSep($._pattern), ")"),
    record_pattern: ($) =>
      seq(field("path", $.path), "{", commaSep(choice($.record_pattern_field, $.rest_pattern)), "}"),
    record_pattern_field: ($) =>
      seq(field("name", $.identifier), optional(seq(":", field("pattern", $._pattern)))),
    path_pattern: ($) => prec(-1, $.path),

    // ---------------------------------------------------------- expressions

    _expr: ($) =>
      choice(
        $.annotated_expr,
        $.binary_expr,
        $.unary_expr,
        $.request_expr,
        $.call_expr,
        $.index_expr,
        $.try_expr,
        $.method_call_expr,
        $.field_expr,
        $.metadata_expr,
        $.where_expr,
        $.exec_expr,
        $.template,
        $._literal,
        $.symbol_expr,
        $.fn_closure_expr,
        $.partial_expr,
        $.tree_expr,
        $.record_expr,
        $._path_expr,
        $.paren_expr,
        $.tuple_expr,
        $.array_expr,
        $.map_expr,
        $.set_expr,
        $.closure_expr,
        $.anon_record_expr,
        $.block,
        $.if_expr,
        $.match_expr,
        $.fail_expr,
        $.yield_expr,
      ),

    annotated_expr: ($) => prec.right(seq(repeat1($.attribute), $._expr)),

    binary_expr: ($) => {
      const table = [
        [PREC.or, "||"],
        [PREC.and, "&&"],
        [PREC.compare, choice("==", "!=", "<", ">", "<=", ">=", "<=>")],
        [PREC.range, ".."],
        [PREC.add, choice("+", "-", "++")],
        [PREC.mul, choice("*", "/", "%")],
      ];
      return choice(
        ...table.map(([p, op]) =>
          prec.left(p, seq(field("left", $._expr), field("operator", op), field("right", $._expr))),
        ),
      );
    },

    unary_expr: ($) => prec(PREC.unary, seq(field("operator", choice("-", "!")), $._expr)),

    request_expr: ($) => prec(PREC.unary, seq("@", $._expr)),

    call_expr: ($) =>
      prec(PREC.postfix, seq(field("function", $._expr), field("args", $.arg_list))),

    arg_list: ($) => seq("(", commaSep($._expr), ")"),

    index_expr: ($) => prec(PREC.postfix, seq($._expr, "[", $._expr, "]")),

    try_expr: ($) => prec(PREC.postfix, seq($._expr, "?")),

    method_call_expr: ($) =>
      prec(
        PREC.postfix,
        choice(
          seq(
            field("receiver", $._expr),
            ".",
            field("method", $.identifier),
            field("args", $.arg_list),
          ),
          seq(
            field("receiver", $._expr),
            "::",
            "<",
            field("type_args", $._type),
            ">",
            field("args", $.arg_list),
          ),
        ),
      ),

    field_expr: ($) =>
      prec(
        PREC.postfix,
        seq(field("value", $._expr), ".", field("field", choice($.identifier, $.integer))),
      ),

    metadata_expr: ($) =>
      prec(PREC.postfix, seq(field("value", $._expr), "::", field("name", $.identifier))),

    where_expr: ($) =>
      prec(PREC.postfix, seq($._expr, "where", "{", commaSep($.where_arg), "}")),

    where_arg: ($) =>
      seq(field("name", $.identifier), optional(seq(":", field("value", $._expr)))),

    // `cc`-c {src}`` and `exec sh`echo hi``
    exec_expr: ($) =>
      choice(
        prec(PREC.postfix, seq(field("tag", $._expr), field("template", $.template))),
        seq("exec", field("tag", $.path), field("template", $.template)),
      ),

    template: ($) => seq("`", repeat($._template_part), "`"),

    _template_part: ($) =>
      choice($.template_text, $.template_interpolation, $.template_for, $.template_if),

    template_interpolation: ($) => seq("{", $._expr, "}"),

    template_for: ($) =>
      seq(
        "{",
        "for",
        field("binding", $.identifier),
        "in",
        field("collection", $._expr),
        "}",
        repeat($._template_part),
        "{/for}",
      ),

    template_if: ($) =>
      seq(
        "{",
        "if",
        field("condition", $._expr),
        "}",
        repeat($._template_part),
        optional(seq("{else}", repeat($._template_part))),
        "{/if}",
      ),

    _literal: ($) => choice($.integer, $.float, $.string, $.prefixed_string, $.boolean),

    integer: (_) => /[0-9][0-9_]*([a-zA-Z][a-zA-Z0-9_]*)?/,
    float: (_) => /[0-9][0-9_]*\.[0-9][0-9_]*([a-zA-Z][a-zA-Z0-9_]*)?/,
    string: (_) => /"([^"\\]|\\.)*"/,
    prefixed_string: ($) =>
      seq(field("prefix", alias(token(seq(IDENT, /"/)), $.string_prefix)), alias(token.immediate(/([^"\\]|\\.)*"/), $.string_body)),
    boolean: (_) => choice("true", "false"),

    symbol_expr: ($) => seq(":", $.identifier),

    fn_closure_expr: ($) =>
      seq(
        "fn",
        field("params", $.param_list),
        optional(seq("->", field("return_type", $._type))),
        field("body", $.block),
      ),

    partial_expr: ($) => seq("partial", field("path", $.path), $.record_fields),

    tree_expr: ($) =>
      seq(alias(token(seq("tree", /[ \t]*/, "{")), "tree"), commaSep($.map_entry), "}"),

    record_expr: ($) => seq(field("path", $.path), $.record_fields),

    record_fields: ($) => seq("{", commaSep(choice($.spread, $.record_field)), "}"),

    record_field: ($) =>
      seq(
        field("name", choice($.identifier, alias("namespace", $.identifier))),
        optional(seq(":", field("value", $._expr))),
      ),

    spread: ($) => seq("..", $._expr),

    _path_expr: ($) => choice($.identifier, $.self),

    paren_expr: ($) => seq("(", $._expr, ")"),

    tuple_expr: ($) =>
      choice(seq("(", ")"), seq("(", $._expr, ",", commaSep($._expr), ")")),

    array_expr: ($) => seq("[", commaSep(choice($.spread, $._expr)), "]"),

    map_expr: ($) => seq("%{", commaSep($.map_entry), "}"),

    map_entry: ($) =>
      seq(field("key", $._expr), choice("=>", ":"), field("value", $._expr)),

    set_expr: ($) => seq("%[", commaSep($._expr), "]"),

    anon_record_expr: ($) =>
      seq("{", commaSep(choice($.spread, $.record_field, $.map_entry)), "}"),

    closure_expr: ($) =>
      prec.right(
        PREC.closure,
        seq(field("params", $.closure_params), field("body", $._expr)),
      ),

    closure_params: ($) => choice("||", seq("|", commaSep($.closure_param), "|")),

    closure_param: ($) =>
      seq(field("pattern", $._pattern), optional(seq(":", field("type", $._type)))),

    block: ($) => seq("{", repeat($._statement), optional($._expr), "}"),

    _statement: ($) =>
      choice($.doc, $.let_statement, $.contribution, $.expr_statement),

    let_statement: ($) =>
      seq(
        "let",
        field("pattern", $._pattern),
        optional(seq(":", field("type", $._type))),
        "=",
        field("value", $._expr),
        ";",
      ),

    contribution: ($) => seq("@", $._expr, ";"),

    expr_statement: ($) =>
      choice(seq($._expr, ";"), prec(1, choice($.if_expr, $.match_expr, $.block))),

    if_expr: ($) =>
      seq(
        "if",
        field("condition", $._expr),
        field("consequence", $.block),
        optional(seq("else", field("alternative", choice($.if_expr, $.block)))),
      ),

    match_expr: ($) =>
      seq("match", field("value", $._expr), "{", repeat($.match_arm), "}"),

    match_arm: ($) =>
      seq(
        field("pattern", $._pattern),
        optional(seq(":", field("type", $._type))),
        optional($.match_guard),
        "=>",
        field("value", $._expr),
        optional(","),
      ),

    match_guard: ($) => seq("if", $._expr),

    fail_expr: ($) => prec.right(seq("fail", $._expr)),

    yield_expr: ($) => prec.right(seq("yield", $._expr)),

    // --------------------------------------------------------------- tokens

    identifier: (_) => IDENT,

    line_comment: (_) => token(seq("//", /[^!\n][^\n]*|/)),
    module_comment: (_) => token(seq("//!", /[^\n]*/)),
  },
});
