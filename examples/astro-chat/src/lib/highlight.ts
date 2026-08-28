/**
 * A small, dependency-free syntax highlighter.
 *
 * It is a single-pass scanner rather than a regex-replace chain, so a keyword
 * inside a string or a comment is never re-tokenised — the failure mode that
 * makes naive highlighters mangle real code. It covers the languages that
 * actually turn up in a chat answer; anything else falls through as plain
 * text, which looks fine.
 */

export type TokenKind =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "builtin"
  | "function"
  | "operator"
  | "punctuation"
  | "property"
  | "tag"
  | "attr";

export interface Token {
  kind: TokenKind;
  value: string;
}

interface LanguageSpec {
  keywords: Set<string>;
  builtins: Set<string>;
  lineComment?: string[];
  blockComment?: [string, string];
  strings: string[];
  /** Template-literal style quote that spans lines. */
  rawStrings?: string[];
  hashComment?: boolean;
}

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const JS_KEYWORDS = words(`
  abstract as async await break case catch class const continue debugger default
  delete do else enum export extends finally for from function get if implements
  import in instanceof interface let new of package private protected public
  readonly return satisfies set static super switch this throw try type typeof
  var void while with yield declare namespace keyof infer is asserts override
`);

const JS_BUILTINS = words(`
  true false null undefined NaN Infinity console Math JSON Object Array String
  Number Boolean Promise Set Map WeakMap Symbol Date RegExp Error document window
  globalThis process require module exports fetch structuredClone
`);

const PY_KEYWORDS = words(`
  and as assert async await break class continue def del elif else except
  finally for from global if import in is lambda nonlocal not or pass raise
  return try while with yield match case
`);

const PY_BUILTINS = words(`
  True False None self cls print len range list dict set tuple str int float
  bool open enumerate zip map filter sum min max sorted isinstance type super
`);

const SH_KEYWORDS = words(`
  if then else elif fi for while do done case esac function in return export
  local readonly set unset shift trap exit source alias
`);

const SH_BUILTINS = words(`
  echo cd ls cat grep sed awk curl node npm pnpm yarn git docker cp mv rm mkdir
  chmod chown find xargs sort uniq head tail wc jq astro tsc
`);

const GO_KEYWORDS = words(`
  break case chan const continue default defer else fallthrough for func go goto
  if import interface map package range return select struct switch type var
`);

const RUST_KEYWORDS = words(`
  as async await break const continue crate dyn else enum extern fn for if impl
  in let loop match mod move mut pub ref return self Self static struct super
  trait type unsafe use where while
`);

const SQL_KEYWORDS = words(`
  select from where group by having order limit offset insert into values update
  set delete create table alter drop index join left right inner outer on as
  and or not null distinct union all with returning primary key foreign
`);

const LANGUAGES: Record<string, LanguageSpec> = {
  javascript: {
    keywords: JS_KEYWORDS,
    builtins: JS_BUILTINS,
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    strings: ['"', "'"],
    rawStrings: ["`"],
  },
  python: {
    keywords: PY_KEYWORDS,
    builtins: PY_BUILTINS,
    strings: ['"', "'"],
    hashComment: true,
  },
  bash: {
    keywords: SH_KEYWORDS,
    builtins: SH_BUILTINS,
    strings: ['"', "'"],
    hashComment: true,
  },
  go: {
    keywords: GO_KEYWORDS,
    builtins: words(
      "true false nil iota string int int64 float64 bool byte rune error make new len cap append panic recover",
    ),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    strings: ['"', "'"],
    rawStrings: ["`"],
  },
  rust: {
    keywords: RUST_KEYWORDS,
    builtins: words(
      "true false Some None Ok Err String Vec Option Result Box Rc Arc println! format! vec!",
    ),
    lineComment: ["//"],
    blockComment: ["/*", "*/"],
    strings: ['"'],
  },
  sql: {
    keywords: SQL_KEYWORDS,
    builtins: words(
      "count sum avg min max coalesce now current_timestamp cast",
    ),
    lineComment: ["--"],
    blockComment: ["/*", "*/"],
    strings: ["'", '"'],
  },
  json: {
    keywords: new Set<string>(),
    builtins: words("true false null"),
    strings: ['"'],
  },
  css: {
    keywords: new Set<string>(),
    builtins: new Set<string>(),
    blockComment: ["/*", "*/"],
    strings: ['"', "'"],
  },
  yaml: {
    keywords: new Set<string>(),
    builtins: words("true false null yes no"),
    strings: ['"', "'"],
    hashComment: true,
  },
};

const ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "javascript",
  tsx: "javascript",
  typescript: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  terminal: "bash",
  golang: "go",
  rs: "rust",
  postgres: "sql",
  postgresql: "sql",
  psql: "sql",
  yml: "yaml",
  scss: "css",
  json5: "json",
  jsonc: "json",
};

export function normalizeLanguage(lang: string | null | undefined): string {
  if (!lang) return "";
  const key = lang.trim().toLowerCase();
  return ALIASES[key] ?? key;
}

/** Languages we can meaningfully colour. */
export function isHighlightable(lang: string | null | undefined): boolean {
  const key = normalizeLanguage(lang);
  return key === "html" || key === "xml" || key === "svelte" || key === "astro"
    ? true
    : key in LANGUAGES;
}

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$!]/;
const DIGIT = /[0-9]/;
const OPERATOR = /[+\-*/%=<>!&|^~?:]/;
const PUNCTUATION = /[{}()[\];,.@#]/;

/**
 * Tokenise `code`. Unknown languages return a single plain token, which the
 * renderer prints verbatim.
 */
export function tokenize(code: string, language?: string | null): Token[] {
  const key = normalizeLanguage(language);

  if (key === "html" || key === "xml" || key === "svelte" || key === "astro") {
    return tokenizeMarkup(code);
  }

  const spec = LANGUAGES[key];
  if (!spec) return [{ kind: "plain", value: code }];

  const tokens: Token[] = [];
  let buf = "";
  let i = 0;

  const flush = () => {
    if (buf) {
      tokens.push({ kind: "plain", value: buf });
      buf = "";
    }
  };
  const push = (kind: TokenKind, value: string) => {
    flush();
    tokens.push({ kind, value });
  };

  const startsWith = (s: string) => code.startsWith(s, i);

  while (i < code.length) {
    const ch = code[i]!;

    // Comments -------------------------------------------------------------
    if (spec.hashComment && ch === "#") {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? code.length : end;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }

    const line = spec.lineComment?.find(startsWith);
    if (line) {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? code.length : end;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }

    if (spec.blockComment && startsWith(spec.blockComment[0])) {
      const close = code.indexOf(
        spec.blockComment[1],
        i + spec.blockComment[0].length,
      );
      const stop =
        close === -1 ? code.length : close + spec.blockComment[1].length;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }

    // Strings --------------------------------------------------------------
    const quote =
      spec.strings.find((q) => ch === q) ??
      spec.rawStrings?.find((q) => ch === q);
    if (quote) {
      const multiline = spec.rawStrings?.includes(quote) ?? false;
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j += 1;
          break;
        }
        if (!multiline && code[j] === "\n") break;
        j += 1;
      }
      push("string", code.slice(i, j));
      i = j;
      continue;
    }

    // Numbers --------------------------------------------------------------
    if (DIGIT.test(ch) || (ch === "." && DIGIT.test(code[i + 1] ?? ""))) {
      let j = i;
      while (j < code.length && /[0-9a-fA-FxXoObB._nel+-]/.test(code[j]!)) {
        // Stop a trailing `-`/`+` from swallowing the next expression unless
        // it is part of an exponent.
        if (
          (code[j] === "+" || code[j] === "-") &&
          !/[eE]/.test(code[j - 1] ?? "")
        )
          break;
        j += 1;
      }
      push("number", code.slice(i, j));
      i = j;
      continue;
    }

    // Identifiers ----------------------------------------------------------
    if (IDENT_START.test(ch)) {
      let j = i;
      while (j < code.length && IDENT_PART.test(code[j]!)) j += 1;
      const word = code.slice(i, j);

      // Look ahead past spaces for `(` to detect a call.
      let k = j;
      while (k < code.length && code[k] === " ") k += 1;
      const isCall = code[k] === "(";
      const isKey = code[k] === ":" && key === "json";

      if (spec.keywords.has(word)) push("keyword", word);
      else if (spec.builtins.has(word)) push("builtin", word);
      else if (isKey) push("property", word);
      else if (isCall) push("function", word);
      else buf += word;

      i = j;
      continue;
    }

    // JSON object keys are quoted, so catch `"key":` after the fact.
    if (key === "json" && ch === ":") {
      const last = tokens[tokens.length - 1];
      if (last?.kind === "string") last.kind = "property";
    }

    if (OPERATOR.test(ch)) {
      push("operator", ch);
      i += 1;
      continue;
    }

    if (PUNCTUATION.test(ch)) {
      push("punctuation", ch);
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  flush();
  return tokens;
}

/** Markup: tags, attribute names, attribute values, comments, text. */
function tokenizeMarkup(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let text = "";

  const flushText = () => {
    if (text) {
      tokens.push({ kind: "plain", value: text });
      text = "";
    }
  };

  while (i < code.length) {
    if (code.startsWith("<!--", i)) {
      const end = code.indexOf("-->", i);
      const stop = end === -1 ? code.length : end + 3;
      flushText();
      tokens.push({ kind: "comment", value: code.slice(i, stop) });
      i = stop;
      continue;
    }

    if (code[i] === "<") {
      const end = code.indexOf(">", i);
      const stop = end === -1 ? code.length : end + 1;
      flushText();
      tokens.push(...tokenizeTag(code.slice(i, stop)));
      i = stop;
      continue;
    }

    text += code[i];
    i += 1;
  }

  flushText();
  return tokens;
}

function tokenizeTag(raw: string): Token[] {
  const tokens: Token[] = [];
  const nameMatch = /^<\/?[A-Za-z][\w.:-]*/.exec(raw);

  if (!nameMatch) return [{ kind: "punctuation", value: raw }];

  tokens.push({ kind: "tag", value: nameMatch[0] });

  const rest = raw.slice(nameMatch[0].length);
  const attr =
    /([\w.:@$-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)?|([^\s]+)|(\s+)/g;
  let m: RegExpExecArray | null;

  while ((m = attr.exec(rest)) !== null) {
    if (m[1]) {
      tokens.push({ kind: "attr", value: m[1] });
      if (m[2]) tokens.push({ kind: "operator", value: m[2] });
      if (m[3]) tokens.push({ kind: "string", value: m[3] });
    } else if (m[4]) {
      tokens.push({ kind: "punctuation", value: m[4] });
    } else {
      tokens.push({ kind: "plain", value: m[0] });
    }
  }

  return tokens;
}
