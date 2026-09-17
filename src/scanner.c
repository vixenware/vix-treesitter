// External scanner for the three "text" regions of Vix:
//
//   doc { ... }       prose until a line that is only `}` or `example name {`
//   rule name { ... } prose until a line that is only `}` or `test name {`
//   `template`        literal text until `{` (hole) or a closing backtick
//
// Prose lines inside a ``` / ~~~ fence never terminate the block, so a fenced
// code sample may contain a bare `}` line.

#include "tree_sitter/parser.h"
#include <stdlib.h>
#include <string.h>

enum TokenType {
  DOC_TEXT,
  RULE_TEXT,
  TEMPLATE_TEXT,
  ERROR_SENTINEL,
};

typedef struct {
  char fence_char;
  unsigned char fence_len;
} State;

void *tree_sitter_vix_external_scanner_create(void) {
  return calloc(1, sizeof(State));
}

void tree_sitter_vix_external_scanner_destroy(void *payload) { free(payload); }

unsigned tree_sitter_vix_external_scanner_serialize(void *payload, char *buffer) {
  State *s = payload;
  buffer[0] = s->fence_char;
  buffer[1] = (char)s->fence_len;
  return 2;
}

void tree_sitter_vix_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  State *s = payload;
  if (length == 2) {
    s->fence_char = buffer[0];
    s->fence_len = (unsigned char)buffer[1];
  } else {
    s->fence_char = 0;
    s->fence_len = 0;
  }
}

static bool is_ident_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

static bool is_ident_char(int32_t c) { return is_ident_start(c) || (c >= '0' && c <= '9'); }

static bool is_blank(int32_t c) { return c == ' ' || c == '\t'; }

#define LINE_CAP 512

// Reads one line (without terminator), advancing the lexer. Returns the
// number of characters kept in `line`.
static unsigned read_line(TSLexer *lexer, int32_t *line) {
  unsigned n = 0;
  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == '\n') {
      lexer->advance(lexer, false);
      break;
    }
    if (n < LINE_CAP) line[n++] = c;
    lexer->advance(lexer, false);
  }
  return n;
}

// Does the line, after indentation, read `<kw> <ident> {`?
static bool is_header(const int32_t *line, unsigned n, const char *kw) {
  unsigned i = 0;
  while (i < n && is_blank(line[i])) i++;
  for (size_t j = 0, k = strlen(kw); j < k; j++, i++) {
    if (i >= n || line[i] != (int32_t)kw[j]) return false;
  }
  if (i >= n || !is_blank(line[i])) return false;
  while (i < n && is_blank(line[i])) i++;
  if (i >= n || !is_ident_start(line[i])) return false;
  while (i < n && is_ident_char(line[i])) i++;
  while (i < n && is_blank(line[i])) i++;
  return i < n && line[i] == '{';
}

static bool is_close(const int32_t *line, unsigned n) {
  unsigned i = 0;
  while (i < n && is_blank(line[i])) i++;
  if (i >= n || line[i] != '}') return false;
  i++;
  while (i < n && (is_blank(line[i]) || line[i] == '\r')) i++;
  return i == n;
}

// A fence line: returns the run length (>= 3) and its char, else 0.
// `closing` is set when nothing but the fence is on the line.
static unsigned fence(const int32_t *line, unsigned n, char *ch, bool *closing) {
  unsigned i = 0;
  while (i < n && is_blank(line[i])) i++;
  if (i >= n || (line[i] != '`' && line[i] != '~')) return 0;
  *ch = (char)line[i];
  unsigned len = 0;
  while (i < n && line[i] == (int32_t)*ch) {
    i++;
    len++;
  }
  if (len < 3) return 0;
  while (i < n && (is_blank(line[i]) || line[i] == '\r')) i++;
  *closing = i == n;
  return len;
}

// Scans prose lines until a terminator line. A terminator is only known after
// reading it, so we commit (mark_end) after each line that is text.
static bool scan_prose(TSLexer *lexer, State *s, const char *header_kw, TSSymbol sym) {
  int32_t line[LINE_CAP];
  bool any = false;
  lexer->mark_end(lexer);
  while (!lexer->eof(lexer)) {
    unsigned n = read_line(lexer, line);
    char ch;
    bool closing;
    if (s->fence_len == 0) {
      if (is_close(line, n) || is_header(line, n, header_kw)) break;
      unsigned len = fence(line, n, &ch, &closing);
      if (len) {
        s->fence_char = ch;
        s->fence_len = (unsigned char)len;
      }
    } else {
      unsigned len = fence(line, n, &ch, &closing);
      if (len >= s->fence_len && ch == s->fence_char && closing) s->fence_len = 0;
    }
    any = true;
    lexer->mark_end(lexer);
  }
  if (!any) return false;
  lexer->result_symbol = sym;
  return true;
}

static bool scan_template_text(TSLexer *lexer) {
  bool any = false;
  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == '`') break;
    if (c == '{') {
      lexer->mark_end(lexer);
      lexer->advance(lexer, false);
      if (lexer->lookahead != '{') {
        if (!any) return false;
        lexer->result_symbol = TEMPLATE_TEXT;
        return true;
      }
      lexer->advance(lexer, false);
      any = true;
      continue;
    }
    if (c == '}') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '}') lexer->advance(lexer, false);
      any = true;
      continue;
    }
    lexer->advance(lexer, false);
    any = true;
  }
  if (!any) return false;
  lexer->mark_end(lexer);
  lexer->result_symbol = TEMPLATE_TEXT;
  return true;
}

bool tree_sitter_vix_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid) {
  State *s = payload;
  if (valid[ERROR_SENTINEL]) return false;
  if (valid[TEMPLATE_TEXT]) return scan_template_text(lexer);
  if (valid[DOC_TEXT]) return scan_prose(lexer, s, "example", DOC_TEXT);
  if (valid[RULE_TEXT]) return scan_prose(lexer, s, "test", RULE_TEXT);
  return false;
}
