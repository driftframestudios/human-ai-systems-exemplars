"""Check the declared inline table-policy owners, separately from rendering.

Inspect TABLE_SELECTORS in bare inline CSS (or type=text/css), flat declarations,
and one media level. Only unconditional screen/print groups supply the required
policy. Other selectors and at-rules remain outside this observation, including
complex selectors that could also affect tables. Relevant inline attributes,
aliases and !important require an owner decision. Comments and quoted delimiters
cannot supply active declarations. Source blocks must be lexically balanced.

This establishes the owned declarations, not their effective cascade. External
stylesheets, conditional style elements, class matching, inherited properties,
JS-created styles, and rendered print behavior remain browser observations.
"""

from html.parser import HTMLParser
from pathlib import Path
import re
import unittest


SOURCE = Path(__file__).resolve().parents[2] / "collaboration/hiring-surfaces-talent-agent-intake/index.html"
MAX_SOURCE_BYTES = 1_048_576
MAX_CSS_CHARS = 131_072
MAX_COMPONENT_DEPTH = 16


class PolicyError(ValueError):
    """A supported declaration violates the policy, or a required owner is absent."""


class UnsupportedCSS(PolicyError):
    """The source needs an explicit grammar/ownership decision before clearance."""


WATCHED = frozenset({
    "min-width", "min-inline-size", "width", "inline-size", "overflow",
    "overflow-x", "overflow-y", "overflow-wrap", "word-wrap", "word-break", "all",
    "display", "break-inside", "page-break-inside",
})
TABLE_SELECTORS = frozenset({"table", "th", "td", "tbody th", "tr>:nth-child(4)", ".table-wrap", "table code", ".skip-link", "tbody tr"})
REQUIRED = {
    ("screen", "table", "min-width"): "96rem",
    ("screen", "th", "min-width"): "10rem",
    ("screen", "td", "min-width"): "10rem",
    ("screen", "tbody th", "min-width"): "16rem",
    ("screen", "tr>:nth-child(4)", "min-width"): "18rem",
    **{("print", selector, "min-width"): "0" for selector in TABLE_SELECTORS - {".table-wrap", "table code", ".skip-link", "tbody tr"}},
    ("print", ".table-wrap", "overflow"): "visible",
    **{("print", selector, "overflow-wrap"): "normal" for selector in ("th", "td", "tr>:nth-child(4)")},
    **{("print", selector, "word-break"): "normal" for selector in ("th", "td", "tr>:nth-child(4)")},
    ("print", "table code", "overflow-wrap"): "anywhere",
    ("print", "table code", "word-break"): "normal",
    ("print", ".skip-link", "display"): "none",
    ("print", "tbody tr", "break-inside"): "avoid",
    ("print", "tbody tr", "page-break-inside"): "avoid",
}
ALLOWED = {
    **REQUIRED,
    ("base", ".table-wrap", "overflow-x"): "auto",
    ("base", "table", "width"): "100%",
    **{("base", selector, "overflow-wrap"): "normal" for selector in ("th", "td")},
    **{("base", selector, "word-break"): "normal" for selector in ("th", "td")},
    ("base", "tr>:nth-child(4)", "overflow-wrap"): "anywhere",
}


def read_source(path):
    """Bound bytes before decoding; filesystem failures retain their I/O outcome."""
    with path.open("rb") as stream:
        raw = stream.read(MAX_SOURCE_BYTES + 1)
    if len(raw) > MAX_SOURCE_BYTES:
        raise PolicyError("HTML exceeds the 1 MiB source-byte budget")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise PolicyError("HTML must be UTF-8") from error


class InlineStyles(HTMLParser):
    """Collect actual inline CSS; comments/script text cannot supply a stylesheet."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.inert = 0
        self.in_style = False
        self.parts = []
        self.size = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("template", "noscript"):
            self.inert += 1
        if self.inert:
            return
        attributes = dict(attrs)
        table_owner = tag in ("table", "th", "td") or ".table-wrap" in {
            "." + name for name in (attributes.get("class") or "").split()
        }
        if table_owner and "style" in attributes:
            inline_values = [value for name, value in attrs if name == "style"]
            if len(inline_values) != 1 or not isinstance(inline_values[0], str):
                raise UnsupportedCSS("inline style attributes must be unique and carry text")
            inline = inline_values[0]
            self.size += len(inline)
            if self.size > MAX_CSS_CHARS:
                raise PolicyError("inline CSS exceeds the character budget")
            # Only actual table/wrapper attributes enter this source policy.
            for media, selector, declarations in css_rules("inline{" + inline + "}", frozenset({"inline"})):
                if media != "base" or selector != "inline":
                    raise UnsupportedCSS("inline style attributes require flat declarations")
                for name, _value in declarations:
                    if name in WATCHED:
                        raise UnsupportedCSS(f"table-policy inline style declarations are unsupported: {name}")
        if tag == "style":
            if len(attributes) != len(attrs):
                raise UnsupportedCSS("style attributes must be unique")
            self.in_style = not any(
                key != "type" or (value or "").lower() != "text/css"
                for key, value in attrs
            )

    def handle_startendtag(self, tag, attrs):
        if tag in ("style", "template", "noscript"):
            raise UnsupportedCSS("self-closing style/inert containers are unsupported")
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self.in_style and not self.inert:
            self.size += len(data)
            if self.size > MAX_CSS_CHARS:
                raise PolicyError("inline CSS exceeds the character budget")
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag in ("template", "noscript"):
            if self.inert:
                self.inert -= 1
        elif tag == "style" and self.in_style:
            self.in_style = False
            # Parse each stylesheet independently: braces cannot balance across
            # two style elements. A tuple keeps boundaries without concatenation.
            self.parts.append(None)


def css_tokens(css):
    """One forward cursor; strings/comments shield delimiters, groups are capped."""
    tokens, buffer, groups = [], [], []
    quote = None
    i = 0
    while i < len(css):
        char = css[i]
        if quote:
            buffer.append(char)
            if char == "\\":
                i += 1
                if i == len(css):
                    raise UnsupportedCSS("unterminated quoted CSS escape")
                buffer.append(css[i])
            elif char == quote:
                quote = None
        elif css.startswith("/*", i):
            end = css.find("*/", i + 2)
            if end < 0:
                raise UnsupportedCSS("unterminated CSS comment")
            buffer.append(" ")
            i = end + 1
        elif char in "\"'":
            quote = char
            buffer.append(char)
        elif char == "\\":
            buffer.append(char)
            i += 1
            if i == len(css):
                raise UnsupportedCSS("unterminated CSS escape")
            buffer.append(css[i])
        elif char in "([":
            groups.append(char)
            if len(groups) > MAX_COMPONENT_DEPTH:
                raise UnsupportedCSS("CSS component nesting exceeds the depth budget")
            buffer.append(char)
        elif char in ")]":
            if not groups or groups.pop() != {"\u0029": "(", "]": "["}[char]:
                raise UnsupportedCSS("unbalanced CSS component delimiters")
            buffer.append(char)
        elif char in "{};" and not groups:
            text = "".join(buffer).strip()
            if text:
                tokens.append(text)
            tokens.append(char)
            buffer = []
        elif char in "{}":
            raise UnsupportedCSS("braces inside CSS components are unsupported")
        else:
            buffer.append(char)
        i += 1
    if quote or groups:
        raise UnsupportedCSS("unterminated CSS string or component")
    text = "".join(buffer).strip()
    if text:
        tokens.append(text)
    return tokens


def owned_selectors(header, owners=TABLE_SELECTORS):
    """Match only the finite literal owners; complex selectors stay separate."""
    selectors = (re.sub(r"\s*>\s*", ">", " ".join(item.split())) for item in header.split(","))
    return tuple(selector for selector in selectors if selector in owners)


def css_rules(css, owners=TABLE_SELECTORS):
    """Yield owned rules; skip balanced blocks outside this source contract."""
    tokens = css_tokens(css)
    i = 0

    def skip_block():
        nonlocal i
        depth = 1
        while i < len(tokens) and depth:
            depth += (tokens[i] == "{") - (tokens[i] == "}")
            i += 1
        if depth:
            raise UnsupportedCSS("unclosed CSS rule or media block")

    def rules(media, grouped=False):
        nonlocal i
        while i < len(tokens) and tokens[i] != "}":
            header = tokens[i]
            i += 1
            if header.startswith("@") and i < len(tokens) and tokens[i] == ";":
                i += 1
                continue
            if i == len(tokens) or tokens[i] != "{" or header in "{};":
                raise UnsupportedCSS("expected a balanced CSS rule block")
            i += 1
            if header.startswith("@"):
                match = re.fullmatch(r"@media(?=\s|\()\s*(.+)", header, re.IGNORECASE)
                if not match or grouped:
                    skip_block()
                    continue
                condition = " ".join(match[1].lower().split())
                yield from rules(condition, True)
            else:
                if not owned_selectors(header, owners):
                    skip_block()
                    continue
                declarations = []
                while i < len(tokens) and tokens[i] != "}":
                    entry = tokens[i]
                    i += 1
                    if entry == ";":
                        continue
                    name, separator, value = entry.partition(":")
                    name, value = name.strip().lower(), value.strip()
                    if "\\" in name:
                        raise UnsupportedCSS("escapes in owned property names are unsupported")
                    if not separator or not value or not re.fullmatch(r"--[A-Za-z0-9_-]+|-?[a-z][a-z0-9-]*", name):
                        raise UnsupportedCSS("expected a flat property:value declaration; nesting is unsupported")
                    if i < len(tokens) and tokens[i] not in (";", "}"):
                        raise UnsupportedCSS("nested CSS declarations are unsupported")
                    declarations.append((name, value))
                yield media, header, declarations
            if i == len(tokens) or tokens[i] != "}":
                raise UnsupportedCSS("unclosed CSS rule or media block")
            i += 1
        if not grouped and i != len(tokens):
            raise UnsupportedCSS("unexpected closing CSS brace")

    yield from rules("base")


def check_hiring_table_media(source):
    """Return required declaration coverage, or a classified policy exception."""
    if not isinstance(source, str):
        raise PolicyError("HTML source must be text")
    if len(source) > MAX_SOURCE_BYTES:
        raise PolicyError("HTML exceeds the source-character budget")
    parser = InlineStyles()
    parser.feed(source)
    parser.close()
    if parser.in_style:
        raise UnsupportedCSS("unclosed style element")
    seen, print_started, fragments = set(), False, []
    for part in parser.parts:
        if part is not None:
            fragments.append(part)
            continue
        css = "".join(fragments)
        fragments = []
        for media, header, declarations in css_rules(css):
            selectors = owned_selectors(header)
            for name, value in declarations:
                if name not in WATCHED:
                    continue
                for selector in selectors:
                    if media not in ("base", "screen", "print"):
                        raise UnsupportedCSS(f"unsupported relevant media condition: {media}")
                    if "!" in value or name in ("min-inline-size", "inline-size", "word-wrap", "all"):
                        raise UnsupportedCSS(f"relevant aliases/!important are unsupported: {name}")
                    key = (media, selector, name)
                    if key not in ALLOWED or value.lower() != ALLOWED[key]:
                        raise PolicyError(f"unexpected {media} declaration: {selector} {{ {name}: {value} }}")
                    if media == "base" and print_started:
                        raise PolicyError("base table declarations must precede the print policy")
                    print_started |= media == "print"
                    seen.add(key)
    missing = REQUIRED.keys() - seen
    if missing:
        raise PolicyError(f"missing required active declarations: {sorted(missing)}")
    return frozenset(seen & REQUIRED.keys())


# Independent literal fixtures describe the source policy, not generated output
# from ALLOWED/REQUIRED. subTest names keep each counterexample identifiable.
SCREEN = "@media screen{table{min-width:96rem}th,td{min-width:10rem}tbody th{min-width:16rem}tr>:nth-child(4){min-width:18rem}}"
PRINT_DECLARATIONS = ".table-wrap{overflow:visible}table,th,td,tbody th,tr>:nth-child(4){min-width:0}th,td,tr>:nth-child(4){overflow-wrap:normal;word-break:normal}table code{overflow-wrap:anywhere;word-break:normal}.skip-link{display:none}tbody tr{break-inside:avoid;page-break-inside:avoid}"
PRINT = "@media print{" + PRINT_DECLARATIONS + "}"


def document(css):
    return "<html><head><style>" + css + "</style></head><body></body></html>"


class HiringTableMediaContract(unittest.TestCase):
    def test_repository_source_satisfies_policy(self):
        self.assertEqual(len(check_hiring_table_media(read_source(SOURCE))), 22)

    def test_supported_source_variations(self):
        cases = {
            "minimal": document(SCREEN + PRINT),
            "comments_and_whitespace": document((SCREEN + PRINT).replace("{", " /* boundary */ { ").replace(";", ";\n")),
            "quoted_delimiters": document('.note{content:"{ ; } /* literal */ Ren\u00e9e"}' + SCREEN + PRINT),
            "separate_styles": "<style>" + SCREEN + "</style><style>" + PRINT + "</style>",
            "irrelevant_media": document('@media(max-width:620px){.button-group{overflow-x:auto}}' + SCREEN + PRINT),
            "existing_unrelated_inline_styles": document(SCREEN + PRINT) + '<section class="stage" style="margin-top:1.5rem"></section>' * 2,
            "unrelated_inline_table_style": document(SCREEN + PRINT) + '<table style="color:black;padding:1rem"><tr><td style="text-align:left">Example</td></tr></table>',
            "commented_inline_policy": document(SCREEN + PRINT) + '<table style="/* min-width:100rem */ margin-top:1rem"></table>',
            "unrelated_selector": document(SCREEN + PRINT + '.note{width:20rem;overflow:hidden}'),
            "mixed_selector_list": document(SCREEN + PRINT.replace("th,td,tr>:nth-child(4){overflow-wrap", ".note,th,td,tr>:nth-child(4){overflow-wrap")),
            "unrelated_inline_width": document(SCREEN + PRINT) + '<aside style="width:20rem;overflow:hidden"></aside>',
            "unrelated_conditional_rule": document(SCREEN + PRINT + '@supports(display:grid){.note{width:20rem}}'),
            "unrelated_nested_rule": document(SCREEN + PRINT + '.note{& a{width:20rem}}'),
            "unrelated_escaped_selector": document(SCREEN + PRINT + r'.note\:wide{width:20rem}'),
            "external_stylesheet_is_separate_evidence": document(SCREEN + PRINT) + '<link rel="stylesheet" href="other.css">',
            "conditional_stylesheet_is_separate_evidence": document(SCREEN + PRINT) + '<style media="screen">.note{width:20rem}</style>',
        }
        for name, source in cases.items():
            with self.subTest(case=name):
                self.assertEqual(len(check_hiring_table_media(source)), 22)

    def test_print_navigation_and_fitting_rows(self):
        # The owned print declarations hide fixed navigation and request that
        # fitting records retain their row identity on one page. Actual PDF
        # pagination, including oversized rows, remains a browser observation.
        navigation = ".skip-link{display:none}"
        rows = "tbody tr{break-inside:avoid;page-break-inside:avoid}"
        fixtures = {
            "missing_navigation_policy": PRINT.replace(navigation, ""),
            "navigation_only_commented": PRINT.replace(navigation, "/*" + navigation + "*/"),
            "navigation_visible": PRINT.replace(navigation, ".skip-link{display:block}"),
            "missing_row_policy": PRINT.replace(rows, ""),
            "rows_may_split": PRINT.replace("{break-inside:avoid;", "{break-inside:auto;"),
            "legacy_row_policy_allows_split": PRINT.replace("page-break-inside:avoid", "page-break-inside:auto"),
            "navigation_only_on_screen": PRINT.replace(navigation, "") + "@media screen{" + navigation + "}",
            "late_row_split_override": PRINT + "@media print{tbody tr{break-inside:auto}}",
        }
        for name, css in fixtures.items():
            with self.subTest(name=name), self.assertRaises(PolicyError):
                check_hiring_table_media(document(SCREEN + css))

    def test_print_word_and_identifier_boundaries(self):
        # Prose retains ordinary word boundaries; only technical code may wrap
        # arbitrarily. The fourth-column screen policy must be reset in print.
        fixtures = {
            "ordinary_anywhere": PRINT.replace("overflow-wrap:normal", "overflow-wrap:anywhere"),
            "ordinary_break_all": PRINT.replace("word-break:normal", "word-break:break-all", 1),
            "artifact_column_still_anywhere": PRINT.replace("th,td,tr>:nth-child(4){overflow-wrap", "th,td{overflow-wrap"),
            "identifier_wrapping_lost": PRINT.replace("table code{overflow-wrap:anywhere", "table code{overflow-wrap:normal"),
            "identifier_policy_missing": PRINT.replace("table code{overflow-wrap:anywhere;word-break:normal}", ""),
            "late_cell_fragmentation": PRINT + "@media print{td{overflow-wrap:anywhere}}",
        }
        for name, css in fixtures.items():
            with self.subTest(name=name), self.assertRaises(PolicyError):
                check_hiring_table_media(document(SCREEN + css))

    def test_policy_negative_fixtures(self):
        cases = {
            "commented_declarations": document("/* " + SCREEN + PRINT + " */"),
            "screen_only_masquerade": document(SCREEN + "@media print{body{color:black}}@media screen{" + PRINT_DECLARATIONS + "}"),
            "later_print_override": document(SCREEN + PRINT + "@media print{table{min-width:100rem}}"),
            "later_base_override": document(SCREEN + PRINT + "th,td{overflow-wrap:normal}"),
            "later_overflow_override": document(SCREEN + PRINT + "@media print{.table-wrap{overflow-x:hidden}}"),
            "missing_screen_owner": document(PRINT),
            "missing_print_owner": document(SCREEN),
            "html_comment": "<!--" + document(SCREEN + PRINT) + "-->",
            "inert_template": "<template>" + document(SCREEN + PRINT) + "</template>",
            "script_literal": '<script>const fixture = "' + document(SCREEN + PRINT) + '";</script>',
            "misspelled_print_keyword": document(SCREEN + PRINT.replace("@media print", "@mediaprint")),
            "misspelled_screen_keyword": document(SCREEN.replace("@media screen", "@mediascreen") + PRINT),
            "required_policy_only_under_supports": document(SCREEN + '@supports(display:grid){' + PRINT + '}'),
            "required_policy_only_under_nested_media": document(SCREEN + '@media print{' + PRINT + '}'),
            "required_policy_only_in_conditional_style": '<style media="screen">' + SCREEN + PRINT + '</style>',
        }
        for name, source in cases.items():
            with self.subTest(case=name), self.assertRaises(PolicyError):
                check_hiring_table_media(source)

    def test_unsupported_relevant_syntax_is_explicit(self):
        cases = {
            "conditional_print": (document(SCREEN + PRINT.replace("@media print", "@media print and (color)")), "media condition"),
            "nested_rule": (document(SCREEN + PRINT + "table{& td{min-width:0}}"), "nest"),
            "important": (document(SCREEN + PRINT.replace("min-width:0", "min-width:0!important")), "important"),
            "logical_alias": (document(SCREEN + PRINT + "@media print{table{min-inline-size:100rem}}"), "aliases"),
            "escaped_property": (document(SCREEN + PRINT + r"table{min-\77 idth:100rem}"), "escapes"),
            "inline_override": (document(SCREEN + PRINT) + '<table style="min-width:100rem"></table>', "inline style"),
            "inline_logical_override": (document(SCREEN + PRINT) + '<table style="min-inline-size:100rem"></table>', "inline style"),
            "duplicate_inline_attributes": (document(SCREEN + PRINT) + '<table style="min-width:100rem" style="margin:0"></table>', "unique"),
            "valueless_inline_attribute": (document(SCREEN + PRINT) + '<table style></table>', "carry text"),
        }
        for name, (source, message) in cases.items():
            with self.subTest(case=name), self.assertRaisesRegex(UnsupportedCSS, message):
                check_hiring_table_media(source)

    def test_malformed_styles_do_not_clear(self):
        cases = {
            "unclosed_media": document(SCREEN + PRINT[:-1]),
            "extra_brace": document(SCREEN + PRINT + "}"),
            "unclosed_comment": document(SCREEN + PRINT + "/*"),
            "unclosed_string": document(SCREEN + PRINT + '.note{content:"'),
            "unbalanced_component": document(SCREEN + PRINT + ".note{color:var(--ink]}"),
            "cross_stylesheet_balance": "<style>" + SCREEN + "@media print{</style><style>" + PRINT_DECLARATIONS + "}</style>",
            "unclosed_style": "<style>" + SCREEN + PRINT,
        }
        for name, source in cases.items():
            with self.subTest(case=name), self.assertRaises(UnsupportedCSS):
                check_hiring_table_media(source)

    def test_input_and_resource_outcomes(self):
        for source in (None, [], {}, "", " " * (MAX_SOURCE_BYTES + 1)):
            with self.subTest(shape=type(source).__name__), self.assertRaises(PolicyError):
                check_hiring_table_media(source)
        with self.assertRaisesRegex(PolicyError, "CSS exceeds"):
            check_hiring_table_media(document(" " * (MAX_CSS_CHARS + 1)))
        with self.assertRaisesRegex(UnsupportedCSS, "depth budget"):
            check_hiring_table_media(document("a{color:" + "(" * (MAX_COMPONENT_DEPTH + 1)))


if __name__ == "__main__":
    unittest.main()
