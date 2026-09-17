; Vix highlights

(line_comment) @comment
(module_comment) @comment.documentation
(doc_text) @comment.documentation
(rule_text) @comment.documentation

[
  "fn" "let" "use" "import" "match" "struct" "enum" "if" "else"
  "namespace" "realizer" "where" "exec" "fail" "yield" "process"
  "source" "query" "ledger" "using" "resource" "rule" "test" "example"
  "partial" "as" "in" "for"
] @keyword

(visibility) @keyword
(doc "doc" @keyword)
(tree_expr "tree" @keyword)
(self) @variable.builtin
(boolean) @constant.builtin
(integer) @number
(float) @number.float
(string) @string
(string_body) @string
(string_prefix) @string.special
(symbol_expr) @constant
(wildcard_pattern) @constant.builtin
(rest_pattern) @punctuation.special

; templates
(template "`" @string)
(template_text) @string
(template_interpolation ["{" "}"] @punctuation.special)
(template_for ["{" "}" "{/for}"] @punctuation.special)
(template_if ["{" "}" "{/if}" "{else}"] @punctuation.special)
(exec_expr tag: (identifier) @function.macro)
(exec_expr tag: (path (identifier) @function.macro))

; declarations
(fn_item name: (identifier) @function)
(realizer_item name: (identifier) @function)
(process_item name: (identifier) @function)
(query name: (identifier) @function)
(resource name: (identifier) @function)
(example name: (identifier) @function)
(test name: (identifier) @function)
(rule name: (identifier) @title)
(source_item name: (identifier) @type)
(ledger_item name: (identifier) @type)
(ledger_item codec: (identifier) @function)
(struct_item name: (identifier) @type)
(enum_item name: (identifier) @type)
(namespace_item name: (identifier) @module)
(type_param) @type
(variant name: (identifier) @constructor)
(field_def name: (identifier) @property)
(where_param name: (identifier) @variable.parameter)
(param pattern: (identifier_pattern (identifier) @variable.parameter))
(closure_param pattern: (identifier_pattern (identifier) @variable.parameter))

; references
(call_expr function: (identifier) @function.call)
(method_call_expr method: (identifier) @function.method)
(field_expr field: (identifier) @property)
(metadata_expr name: (identifier) @property)
(record_field name: (identifier) @property)
(record_pattern_field name: (identifier) @property)
(where_arg name: (identifier) @variable.parameter)
(attribute name: (identifier) @attribute)
(attribute ["#" "[" "]"] @attribute)
(attribute_arg name: (identifier) @property)

; types
(path_type (path (identifier) @type))
(record_expr path: (path (identifier) @type))
(partial_expr path: (path (identifier) @type))
(tuple_struct_pattern path: (path (identifier) @constructor))
(record_pattern path: (path (identifier) @type))
(path_pattern (path (identifier) @constructor))
(use_tree path: (path (identifier) @module))
(use_tree alias: (identifier) @module)

; a capitalized bare identifier is a type or a variant constructor
((identifier) @type
  (#match? @type "^[A-Z]"))

[ "->" "=>" "::" "." "," ";" ":" ] @punctuation.delimiter
[ "(" ")" "[" "]" "{" "}" "%{" "%[" "|" "||" ] @punctuation.bracket

[
  "==" "!=" "<" "<=" ">" ">=" "<=>" "&&" "+" "++" "-" "*" "/" "%"
  "=" "!" ".." "@" "?"
] @operator
