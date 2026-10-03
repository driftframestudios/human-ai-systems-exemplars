#!/usr/bin/env python3
"""Derive supplemental table labels while retaining authored source spans.

Offsets count Unicode characters in the exact UTF-8 source, including its BOM.
Native captions and headers retain semantic authority.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass, field, replace
from enum import StrEnum
import errno
from hashlib import sha256
from html import escape, unescape
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import secrets
import stat
from typing import Iterator, Literal, Sequence


class Failure(StrEnum):
    MALFORMED = "unsupported-markup"
    NESTED = "unsupported-nested-table"
    SHAPE = "record-shape"
    LIMIT = "resource-limit"
    ENCODING = "encoding"
    DRIFT = "source-drift"
    EDIT = "invalid-edit-plan"
    PATH = "asset-path"
    IO = "asset-io"


class ProjectionError(ValueError):
    """A recoverable asset condition; ordinary implementation errors propagate."""

    def __init__(self, code: Failure, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class Limits:
    source_chars: int = 2_000_000
    source_bytes: int = 8_000_000
    tag_chars: int = 16_384
    tokens: int = 100_000
    depth: int = 128
    label_chars: int = 8_192

    def __post_init__(self):
        for value in (
            self.source_chars, self.source_bytes, self.tag_chars,
            self.tokens, self.depth, self.label_chars,
        ):
            if type(value) is not int or value < 1:
                raise ValueError("Resource limits require positive integers")


DEFAULT_LIMITS = Limits()
SPACE = " \t\r\n\f"
VOID = frozenset((
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
))
RAW_CLOSE = {
    tag: re.compile(r"</\s*" + tag + r"\s*>", re.IGNORECASE)
    for tag in ("script", "style", "textarea", "title")
}
TAG_NAME = re.compile(r"[A-Za-z][A-Za-z0-9:-]*")
END_TAG = re.compile(r"</[ \t\r\n\f]*[A-Za-z][A-Za-z0-9:-]*[ \t\r\n\f]*>")


@dataclass(frozen=True)
class Attribute:
    name: str
    value: str | None
    start: int
    end: int


@dataclass(frozen=True)
class StartTag:
    name: str
    attributes: tuple[Attribute, ...]
    self_closing: bool


@dataclass(frozen=True)
class Element:
    tag: str
    start: int
    raw: str
    attributes: tuple[Attribute, ...]
    text: tuple[str, ...] = ()

    def attribute(self, name: str, default: str | None = None) -> str | None:
        return next((attr.value for attr in self.attributes if attr.name == name), default)


@dataclass(frozen=True)
class Row:
    element: Element
    cells: tuple[Element, ...]


@dataclass(frozen=True)
class Table:
    element: Element
    rows: tuple[Row, ...]
    caption: tuple[str, ...]


@dataclass(frozen=True)
class ParsedAsset:
    source: str
    digest: str
    tables: tuple[Table, ...]
    limits: Limits


@dataclass(frozen=True)
class Disposition:
    topic: str
    standing: Literal["projected", "owner-review"]
    reason: str | None = None

    def as_dict(self) -> dict[str, str]:
        result = {"topic": self.topic, "standing": self.standing}
        if self.reason is not None:
            result["reason"] = self.reason
        return result


@dataclass(frozen=True)
class ValidTable:
    topic: str
    headers: tuple[Element, ...]
    names: tuple[str, ...]
    records: tuple[Row, ...]


@dataclass(frozen=True)
class ValidatedAsset:
    parsed: ParsedAsset
    tables: tuple[ValidTable, ...]
    dispositions: tuple[Disposition, ...]


@dataclass(frozen=True)
class Label:
    element: Element
    value: str


@dataclass(frozen=True)
class Edit:
    start: int
    end: int
    expected: str
    replacement: str


@dataclass(frozen=True)
class EditPlan:
    source_digest: str
    source_length: int
    edits: tuple[Edit, ...]
    dispositions: tuple[Disposition, ...]
    limits: Limits = DEFAULT_LIMITS


def _source_bytes(source: str, limits: Limits) -> bytes:
    if not isinstance(source, str):
        raise TypeError("Source requires a string")
    if len(source) > limits.source_chars:
        raise ProjectionError(Failure.LIMIT, "Source character budget exceeded")
    try:
        encoded = source.encode("utf-8")
    except UnicodeEncodeError as error:
        raise ProjectionError(Failure.ENCODING, "Source requires UTF-8 scalar text") from error
    if len(encoded) > limits.source_bytes:
        raise ProjectionError(Failure.LIMIT, "Source byte budget exceeded")
    if "\0" in source:
        raise ProjectionError(Failure.MALFORMED, "Source requires explicit text in place of NUL")
    return encoded


def scan_start_tag(raw: str, limits: Limits = DEFAULT_LIMITS) -> StartTag:
    """Advance one cursor; attribute spans include their leading whitespace."""
    if len(raw) > limits.tag_chars:
        raise ProjectionError(Failure.LIMIT, "Start-tag budget exceeded")
    match = TAG_NAME.match(raw, 1) if raw.startswith("<") else None
    if match is None or not raw.endswith(">"):
        raise ProjectionError(Failure.MALFORMED, "An authored start tag requires a name and closing delimiter")
    index = match.end()
    attributes = []
    while index < len(raw):
        start = index
        while index < len(raw) and raw[index] in SPACE:
            index += 1
        if index == len(raw) - 1:
            return StartTag(match.group().lower(), tuple(attributes), False)
        if index == len(raw) - 2 and raw[index] == "/":
            return StartTag(match.group().lower(), tuple(attributes), True)
        if index == start:
            raise ProjectionError(Failure.MALFORMED, "Attributes require a whitespace separator")
        name_start = index
        while index < len(raw) and raw[index] not in SPACE + "=/><\"'\x60":
            index += 1
        if index == name_start:
            raise ProjectionError(Failure.MALFORMED, "An authored attribute requires a name")
        name = raw[name_start:index].lower()
        name_end = index
        while index < len(raw) and raw[index] in SPACE:
            index += 1
        value = None
        if index < len(raw) and raw[index] == "=":
            index += 1
            while index < len(raw) and raw[index] in SPACE:
                index += 1
            if index < len(raw) and raw[index] in "\"'":
                quote = raw[index]
                value_start = index + 1
                index = raw.find(quote, value_start)
                if index == -1:
                    raise ProjectionError(Failure.MALFORMED, "An authored attribute requires its closing quote")
                value = unescape(raw[value_start:index])
                index += 1
            else:
                value_start = index
                while index < len(raw) and raw[index] not in SPACE + ">":
                    if raw[index] in "\"'\x60=<":
                        raise ProjectionError(Failure.MALFORMED, "Use quotes around the authored attribute value")
                    index += 1
                if index == value_start:
                    raise ProjectionError(Failure.MALFORMED, "An assigned attribute requires a value")
                value = unescape(raw[value_start:index])
        else:
            index = name_end
        attributes.append(Attribute(name, value, start, index))
    raise ProjectionError(Failure.MALFORMED, "An authored start tag requires its closing delimiter")


def _markup_end(source: str, start: int, limits: Limits) -> int:
    quote = None
    for index in range(start + 1, min(len(source), start + limits.tag_chars)):
        char = source[index]
        if quote is not None:
            if char == quote:
                quote = None
        elif char in "\"'":
            quote = char
        elif char == ">":
            return index + 1
    if len(source) - start >= limits.tag_chars:
        raise ProjectionError(Failure.LIMIT, "Markup token budget exceeded")
    raise ProjectionError(Failure.MALFORMED, "Markup requires a complete closing delimiter")


def _admit_markup(source: str, limits: Limits) -> None:
    """Bound lexical work before HTMLParser receives the complete asset."""
    cursor = count = 0
    while (start := source.find("<", cursor)) != -1:
        cursor = start + 1
        if source.startswith("<!--", start):
            end = source.find("-->", start + 4)
            if end == -1:
                raise ProjectionError(Failure.MALFORMED, "Comments require their closing delimiter")
            cursor = end + 3
        elif start + 1 == len(source) or source[start + 1] not in "!/?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz":
            continue
        else:
            end = _markup_end(source, start, limits)
            raw = source[start:end]
            if raw.startswith("</"):
                if END_TAG.fullmatch(raw) is None:
                    raise ProjectionError(Failure.MALFORMED, "End tags require a single balanced name")
            elif raw.startswith("<!"):
                if not raw.lower().startswith("<!doctype ") or "[" in raw:
                    raise ProjectionError(Failure.MALFORMED, "Use the ordinary HTML doctype for this source contract")
            elif raw.startswith("<?"):
                raise ProjectionError(Failure.MALFORMED, "Processing instructions require a separate source owner")
            else:
                tag = scan_start_tag(raw, limits)
                if tag.name in RAW_CLOSE:
                    if tag.self_closing:
                        raise ProjectionError(Failure.MALFORMED, "Raw-text elements require explicit paired source tags")
                    close = RAW_CLOSE[tag.name].search(source, end)
                    if close is None:
                        raise ProjectionError(Failure.MALFORMED, "Raw-text elements require their closing tag")
                    end = close.start()
            cursor = end
        count += 1
        if count > limits.tokens:
            raise ProjectionError(Failure.LIMIT, "Markup token count exceeded")


def _unique_attributes(attributes: tuple[Attribute, ...]) -> None:
    seen = set()
    for attribute in attributes:
        if attribute.name in seen and attribute.name != "data-label":
            raise ProjectionError(Failure.MALFORMED, "Native attributes require one authored value per name")
        seen.add(attribute.name)


@dataclass
class _Cell:
    element: Element
    text: list[str] = field(default_factory=list)


@dataclass
class _Row:
    element: Element
    cells: list[Element] = field(default_factory=list)


@dataclass
class _Table:
    element: Element
    rows: list[Row] = field(default_factory=list)
    caption: list[str] = field(default_factory=list)
    caption_seen: bool = False


class _TableParser(HTMLParser):
    CDATA_CONTENT_ELEMENTS = tuple(RAW_CLOSE)

    def __init__(self, source: str, classes: frozenset[str], limits: Limits):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.classes = classes
        self.limits = limits
        self.offsets = [0] + [index + 1 for index, char in enumerate(source) if char == "\n"]
        self.tables: list[Table] = []
        self.table: _Table | None = None
        self.row: _Row | None = None
        self.cell: _Cell | None = None
        self.caption = False
        self.skipped_depth = 0
        self.stack: list[str] = []

    def _element(self, tag: str, *, check_attributes: bool = True) -> Element:
        raw = self.get_starttag_text()
        parsed = scan_start_tag(raw, self.limits)
        if check_attributes:
            _unique_attributes(parsed.attributes)
        line, column = self.getpos()
        return Element(tag, self.offsets[line - 1] + column, raw, parsed.attributes)

    def _push(self, tag: str) -> None:
        self.stack.append(tag)
        if len(self.stack) > self.limits.depth:
            raise ProjectionError(Failure.LIMIT, "Selected table nesting budget exceeded")

    def handle_starttag(self, tag, attrs):
        if self.skipped_depth:
            self.skipped_depth += tag == "table"
            if self.skipped_depth > self.limits.depth:
                raise ProjectionError(Failure.LIMIT, "Unselected table nesting budget exceeded")
            return
        if tag == "table":
            if self.table is not None:
                raise ProjectionError(Failure.NESTED, "Nested tables require a named semantic owner")
            element = self._element(tag, check_attributes=False)
            selected = not self.classes or any(
                self.classes.intersection((attribute.value or "").split())
                for attribute in element.attributes if attribute.name == "class"
            )
            if not selected:
                self.skipped_depth = 1
                return
            _unique_attributes(element.attributes)
            self.table = _Table(element)
            self._push(tag)
            return
        if self.table is None:
            return
        element = self._element(tag)
        parent = self.stack[-1]
        if tag == "caption":
            if parent != "table" or self.table.caption_seen:
                raise ProjectionError(Failure.MALFORMED, "A selected caption requires one direct table owner")
            self.table.caption_seen = self.caption = True
        elif tag in ("thead", "tbody", "tfoot", "colgroup"):
            if parent != "table":
                raise ProjectionError(Failure.MALFORMED, "Table sections require a direct table owner")
        elif tag == "col":
            if parent not in ("table", "colgroup"):
                raise ProjectionError(Failure.MALFORMED, "Columns require a table or column-group owner")
        elif tag == "tr":
            if parent not in ("table", "thead", "tbody", "tfoot"):
                raise ProjectionError(Failure.MALFORMED, "Rows require a table or section owner")
            self.row = _Row(element)
        elif tag in ("td", "th"):
            if parent != "tr" or self.row is None:
                raise ProjectionError(Failure.MALFORMED, "Cells require an explicitly balanced row")
            self.cell = _Cell(element)
        elif tag in RAW_CLOSE or tag == "template":
            raise ProjectionError(Failure.MALFORMED, "Embedded raw or template content requires a separate table owner")
        elif self.cell is None and not self.caption:
            raise ProjectionError(Failure.MALFORMED, "Selected table content requires a caption or cell owner")
        if tag == "br":
            self.handle_data(" ")
        if tag not in VOID:
            self._push(tag)

    def handle_startendtag(self, tag, attrs):
        if tag == "table" or (self.table is not None and tag not in VOID):
            raise ProjectionError(Failure.MALFORMED, "Table content requires explicit paired source tags")
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self.table is None:
            return
        if self.caption:
            self.table.caption.append(data)
        elif self.cell is not None:
            self.cell.text.append(data)
        elif data.strip():
            raise ProjectionError(Failure.MALFORMED, "Table text requires a caption or cell owner")

    def handle_endtag(self, tag):
        if self.skipped_depth:
            self.skipped_depth -= tag == "table"
            return
        if self.table is None:
            if tag == "table":
                raise ProjectionError(Failure.MALFORMED, "A table closing tag requires its opening owner")
            return
        if not self.stack or self.stack[-1] != tag:
            raise ProjectionError(Failure.MALFORMED, "Selected table tags require explicit balanced closure")
        self.stack.pop()
        if tag in ("td", "th"):
            self.row.cells.append(replace(self.cell.element, text=tuple(self.cell.text)))
            self.cell = None
        elif tag == "tr":
            self.table.rows.append(Row(self.row.element, tuple(self.row.cells)))
            self.row = None
        elif tag == "caption":
            self.caption = False
        elif tag == "table":
            self.tables.append(Table(self.table.element, tuple(self.table.rows), tuple(self.table.caption)))
            self.table = None

    def finish(self) -> tuple[Table, ...]:
        self.feed(self.source)
        self.close()
        if self.table is not None or self.skipped_depth:
            raise ProjectionError(Failure.MALFORMED, "Each authored table requires its complete closing tag")
        return tuple(self.tables)


def parse_source(source: str, classes: Sequence[str] = (), *, limits: Limits = DEFAULT_LIMITS) -> ParsedAsset:
    encoded = _source_bytes(source, limits)
    _admit_markup(source, limits)
    tables = _TableParser(source, frozenset(classes), limits).finish()
    return ParsedAsset(source, sha256(encoded).hexdigest(), tables, limits)


def text(parts: Sequence[str]) -> str:
    """Normalize semantic labels while retaining the original source."""
    return " ".join("".join(parts).split())


def validate_tables(parsed: ParsedAsset) -> ValidatedAsset:
    accepted, dispositions = [], []
    for table in parsed.tables:
        topic = text(table.caption)
        headers = tuple(
            cell for row in table.rows for cell in row.cells if cell.attribute("scope") == "col"
        )
        complex_spans = any(
            cell.attribute(name, "1") != "1"
            for row in table.rows for cell in row.cells for name in ("colspan", "rowspan")
        )
        if complex_spans or not topic or not headers:
            dispositions.append(Disposition(topic, "owner-review", "span, caption, or column-header contract"))
            continue
        names = tuple(text(cell.text) for cell in headers)
        header_rows = [row for row in table.rows if any(cell.attribute("scope") == "col" for cell in row.cells)]
        if (
            len(header_rows) != 1 or header_rows[0].cells != headers
            or any(cell.tag != "th" for cell in headers) or not all(names)
        ):
            dispositions.append(Disposition(topic, "owner-review", "one complete native column-header row"))
            continue
        records = tuple(row for row in table.rows if any(cell.tag == "td" for cell in row.cells))
        for row in table.rows:
            if row is not header_rows[0] and len(row.cells) != len(names):
                raise ProjectionError(Failure.SHAPE, "Record cell count must match the simple column-header contract")
        accepted.append(ValidTable(topic, headers, names, records))
        dispositions.append(Disposition(topic, "projected"))
    return ValidatedAsset(parsed, tuple(accepted), tuple(dispositions))


ESCAPED_WIDTHS = {"&": 5, "<": 4, ">": 4, '"': 6, "'": 6}
LABEL_OVERHEAD = len(' data-label=""')


def _label_characters(parts: tuple[str, ...]) -> Iterator[str]:
    """Stream plain label text once; retain other Unicode and defer whitespace.

    The three finite substitutions emit at most four characters per input
    character, including word spacing. Measurement uses this same iterator
    before any expanded label is allocated.
    """
    emitted = pending_space = False
    characters = (char for part in parts for char in part)
    previous = None
    char = next(characters, None)
    while char is not None:
        following = next(characters, None)
        if char.isspace():
            pending_space = True
        elif (
            char == "\u00b7" and previous is not None and following is not None
            and (previous.isspace() or previous == "\u2192")
            and (following.isspace() or following == "\u2192")
        ):
            yield ":"
            emitted = pending_space = True
        else:
            if emitted and (pending_space or char == "\u2192"):
                yield " "
            if char == "\u2192":
                yield "t"
                yield "o"
                pending_space = True
            else:
                yield "-" if char == "\u2014" else char
                pending_space = False
            emitted = True
        previous, char = char, following


def _label_text(parts: tuple[str, ...]) -> str:
    """Materialize only after the caller reserves normalized output sizes."""
    return "".join(_label_characters(parts))


def _utf8_width(char: str) -> int:
    point = ord(char)
    if 0xD800 <= point <= 0xDFFF:
        raise ProjectionError(Failure.ENCODING, "Labels require UTF-8 scalar text")
    return 1 + (point > 0x7F) + (point > 0x7FF) + (point > 0xFFFF)


def _utf8_size(value: str, start: int = 0, end: int | None = None) -> int:
    """Measure an interval without allocating its substring or encoded copy."""
    return sum(_utf8_width(value[index]) for index in range(start, len(value) if end is None else end))


def _replacement_size(
    raw: str, attributes: tuple[Attribute, ...], parts: tuple[str, ...], limits: Limits,
) -> tuple[int, int]:
    if sum(len(part) for part in parts) > limits.label_chars:
        raise ProjectionError(Failure.LIMIT, "Semantic label budget exceeded")
    escaped_chars = escaped_bytes = 0
    for label_chars, char in enumerate(_label_characters(parts), 1):
        if label_chars > limits.label_chars:
            raise ProjectionError(Failure.LIMIT, "Semantic label budget exceeded")
        width = ESCAPED_WIDTHS.get(char)
        escaped_chars += width if width is not None else 1
        escaped_bytes += width if width is not None else _utf8_width(char)
    removed_chars = removed_bytes = 0
    for attribute in attributes:
        if attribute.name == "data-label":
            removed_chars += attribute.end - attribute.start
            removed_bytes += _utf8_size(raw, attribute.start, attribute.end)
    characters = len(raw) - removed_chars + LABEL_OVERHEAD + escaped_chars
    encoded_bytes = _utf8_size(raw) - removed_bytes + LABEL_OVERHEAD + escaped_bytes
    if characters > limits.tag_chars:
        raise ProjectionError(Failure.LIMIT, "Projected start-tag budget exceeded")
    return characters, encoded_bytes


@dataclass
class _LabelBudget:
    """Invocation-local reservations precede label and replacement allocation."""

    limits: Limits
    output_chars: int
    output_bytes: int
    replacement_chars: int = 0
    replacement_bytes: int = 0

    def reserve(self, element: Element, parts: tuple[str, ...]) -> None:
        characters, encoded_bytes = _replacement_size(
            element.raw, element.attributes, parts, self.limits,
        )
        self.replacement_chars += characters
        self.replacement_bytes += encoded_bytes
        if (
            self.replacement_chars > self.limits.source_chars
            or self.replacement_bytes > self.limits.source_bytes
        ):
            raise ProjectionError(Failure.LIMIT, "Projected replacement budget exceeded")
        self.output_chars += characters - len(element.raw)
        self.output_bytes += encoded_bytes - _utf8_size(element.raw)

    def finish(self) -> None:
        if self.output_chars > self.limits.source_chars or self.output_bytes > self.limits.source_bytes:
            raise ProjectionError(Failure.LIMIT, "Projected asset budget exceeded")


def _label_budget(parsed: ParsedAsset) -> _LabelBudget:
    return _LabelBudget(parsed.limits, len(parsed.source), _utf8_size(parsed.source))


def _row_identity(cell: Element) -> str:
    """Use an authored header alternative; keep literal cell content intact."""
    abbreviation = cell.attribute("abbr") if cell.tag == "th" else None
    if abbreviation is not None:
        alternative = text((abbreviation,))
        if alternative:
            return alternative
    return text(cell.text)


def derive_labels(validated: ValidatedAsset) -> tuple[Label, ...]:
    proposals: list[tuple[Element, tuple[str, ...]]] = []
    budget = _label_budget(validated.parsed)

    def add(element: Element, parts: tuple[str, ...]):
        budget.reserve(element, parts)
        proposals.append((element, parts))

    for table in validated.tables:
        for header, name in zip(table.headers, table.names, strict=True):
            add(header, (name,))
        for row in table.records:
            row_headers = tuple(
                cell for cell in row.cells
                if cell.tag == "th" and (cell.attribute("scope") or "").lower() == "row"
            )
            identity_cells = row_headers or row.cells[:1]
            identity_parts = tuple(
                part for cell in identity_cells for part in (": ", _row_identity(cell))
            )
            add(row.element, (table.topic, *identity_parts))
            for cell, name in zip(row.cells, table.names, strict=True):
                add(cell, (name,))
    budget.finish()
    return tuple(Label(element, _label_text(parts)) for element, parts in proposals)


def with_label(raw: str, value: str, *, limits: Limits = DEFAULT_LIMITS) -> str:
    """Replace owned attributes and keep all other attribute source literal."""
    if len(value) > limits.label_chars:
        raise ProjectionError(Failure.LIMIT, "Semantic label budget exceeded")
    tag = scan_start_tag(raw, limits)
    _replacement_size(raw, tag.attributes, (value,), limits)
    value = _label_text((value,))
    pieces, cursor = [], 0
    for attribute in tag.attributes:
        if attribute.name == "data-label":
            pieces.append(raw[cursor:attribute.start])
            cursor = attribute.end
    pieces.append(raw[cursor:])
    clean = "".join(pieces)
    suffix = "/>" if tag.self_closing else ">"
    body = clean[:-len(suffix)]
    insertion = len(body.rstrip(SPACE))
    result = body[:insertion] + ' data-label="' + escape(value, quote=True) + '"' + body[insertion:] + suffix
    if len(result) > limits.tag_chars:
        raise ProjectionError(Failure.LIMIT, "Projected start-tag budget exceeded")
    return result


def plan_edits(validated: ValidatedAsset, labels: tuple[Label, ...]) -> EditPlan:
    edits = []
    limits = validated.parsed.limits
    budget = _label_budget(validated.parsed)
    for label in labels:
        budget.reserve(label.element, (label.value,))
    budget.finish()
    for label in labels:
        element = label.element
        replacement = with_label(element.raw, label.value, limits=limits)
        if replacement == element.raw:
            continue
        edits.append(Edit(element.start, element.start + len(element.raw), element.raw, replacement))
    return EditPlan(
        validated.parsed.digest, len(validated.parsed.source),
        tuple(sorted(edits, key=lambda edit: edit.start)), validated.dispositions, limits,
    )


def prepare_plan(source: str, classes: Sequence[str] = (), *, limits: Limits = DEFAULT_LIMITS) -> EditPlan:
    validated = validate_tables(parse_source(source, classes, limits=limits))
    return plan_edits(validated, derive_labels(validated))


def apply_plan(source: str, plan: EditPlan) -> str:
    encoded = _source_bytes(source, plan.limits)
    if len(source) != plan.source_length or sha256(encoded).hexdigest() != plan.source_digest:
        raise ProjectionError(Failure.DRIFT, "Edit plan requires its original source revision")
    cursor = 0
    output_chars, output_bytes = len(source), len(encoded)
    for edit in plan.edits:
        if not (cursor <= edit.start < edit.end <= len(source)):
            raise ProjectionError(Failure.EDIT, "Edits require ordered, nonoverlapping source spans")
        if source[edit.start:edit.end] != edit.expected:
            raise ProjectionError(Failure.EDIT, "Each edit requires its expected source span")
        output_chars += len(edit.replacement) - len(edit.expected)
        output_bytes += len(edit.replacement.encode("utf-8")) - len(edit.expected.encode("utf-8"))
        cursor = edit.end
    if output_chars > plan.limits.source_chars or output_bytes > plan.limits.source_bytes:
        raise ProjectionError(Failure.LIMIT, "Projected asset budget exceeded")
    pieces, cursor = [], 0
    for edit in plan.edits:
        pieces.extend((source[cursor:edit.start], edit.replacement))
        cursor = edit.end
    pieces.append(source[cursor:])
    return "".join(pieces)


def project(source, classes=()):
    """Compatibility entry point: return source and detached disposition dicts."""
    plan = prepare_plan(source, classes)
    return apply_plan(source, plan), [item.as_dict() for item in plan.dispositions]


@dataclass(frozen=True)
class Snapshot:
    source: str
    digest: str
    identity: tuple[int, ...]
    mode: int


@dataclass(frozen=True)
class AssetOutcome:
    path: str | None
    standing: Literal["updated", "unchanged", "needs-projection", "error"]
    dispositions: tuple[Disposition, ...] = ()
    failure: Failure | None = None

    @property
    def ok(self) -> bool:
        return self.standing in ("updated", "unchanged")

    def as_dict(self) -> dict:
        result = {
            "standing": self.standing,
            "tables": len(self.dispositions),
            "projected": sum(item.standing == "projected" for item in self.dispositions),
            "owner_review": sum(item.standing == "owner-review" for item in self.dispositions),
        }
        if self.path is not None:
            result["path"] = self.path
        if self.failure is not None:
            result["reason"] = self.failure.value
        return result


@contextmanager
def _parent_directory(root: Path, value: str) -> Iterator[tuple[int, str, str]]:
    root = root.resolve(strict=True)
    requested = Path(value)
    try:
        relative = requested.relative_to(root) if requested.is_absolute() else requested
    except ValueError as error:
        raise ProjectionError(Failure.PATH, "Choose a repository-owned HTML source") from error
    if ".." in relative.parts or relative.suffix != ".html" or not relative.name:
        raise ProjectionError(Failure.PATH, "Choose a direct repository-owned HTML path")
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    descriptor = os.open(root, flags)
    try:
        for part in relative.parts[:-1]:
            child = os.open(part, flags, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        yield descriptor, relative.name, relative.as_posix()
    finally:
        os.close(descriptor)


def _identity(info: os.stat_result) -> tuple[int, ...]:
    return (
        info.st_dev, info.st_ino, info.st_mode, info.st_nlink,
        info.st_size, info.st_mtime_ns, info.st_ctime_ns,
    )


def read_snapshot(parent: int, name: str, limits: Limits = DEFAULT_LIMITS) -> Snapshot:
    descriptor = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
    with os.fdopen(descriptor, "rb") as handle:
        before = os.fstat(handle.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
            raise ProjectionError(Failure.PATH, "Choose a regular HTML file with one repository owner")
        if before.st_size > limits.source_bytes:
            raise ProjectionError(Failure.LIMIT, "Asset byte budget exceeded")
        encoded = handle.read(limits.source_bytes + 1)
        after = os.fstat(handle.fileno())
    if len(encoded) > limits.source_bytes:
        raise ProjectionError(Failure.LIMIT, "Asset byte budget exceeded")
    if _identity(before) != _identity(after):
        raise ProjectionError(Failure.DRIFT, "Asset changed while its source was read")
    try:
        source = encoded.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ProjectionError(Failure.ENCODING, "Asset requires UTF-8 text") from error
    return Snapshot(source, sha256(encoded).hexdigest(), _identity(after), stat.S_IMODE(after.st_mode))


def publish_asset(parent: int, name: str, snapshot: Snapshot, plan: EditPlan) -> bool:
    result = apply_plan(snapshot.source, plan)
    if result == snapshot.source:
        return False
    temporary = ".table-context-" + secrets.token_hex(16) + ".tmp"
    descriptor = os.open(
        temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent,
    )
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(result.encode("utf-8"))
            handle.flush()
            os.fchmod(handle.fileno(), snapshot.mode)
            os.fsync(handle.fileno())
        current = read_snapshot(parent, name, plan.limits)
        if current.digest != snapshot.digest or current.identity != snapshot.identity:
            raise ProjectionError(Failure.DRIFT, "Asset changed before publication; prepare a fresh plan")
        os.replace(temporary, name, src_dir_fd=parent, dst_dir_fd=parent)
    finally:
        try:
            os.unlink(temporary, dir_fd=parent)
        except FileNotFoundError:
            pass
    return True


RECOVERABLE_ERRNOS = frozenset((
    errno.ENOENT, errno.ENOTDIR, errno.ELOOP, errno.EACCES, errno.EPERM,
    errno.EISDIR, errno.ENOSPC, errno.EDQUOT, errno.EROFS, errno.EIO,
    errno.ENAMETOOLONG,
))


def process_asset(
    root: Path, value: str, classes: Sequence[str] = (), *, check: bool = False,
    limits: Limits = DEFAULT_LIMITS,
) -> AssetOutcome:
    relative = None
    try:
        with _parent_directory(root, value) as (parent, name, relative):
            snapshot = read_snapshot(parent, name, limits)
            plan = prepare_plan(snapshot.source, classes, limits=limits)
            if check:
                changed = apply_plan(snapshot.source, plan) != snapshot.source
                standing = "needs-projection" if changed else "unchanged"
            else:
                standing = "updated" if publish_asset(parent, name, snapshot, plan) else "unchanged"
            return AssetOutcome(relative, standing, plan.dispositions)
    except ProjectionError as error:
        return AssetOutcome(relative, "error", failure=error.code)
    except OSError as error:
        if error.errno not in RECOVERABLE_ERRNOS:
            raise
        return AssetOutcome(relative, "error", failure=Failure.IO)


def main(argv: Sequence[str] | None = None, *, root: Path | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--table-class", action="append", default=[])
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    root = root if root is not None else Path(__file__).resolve().parents[1]
    failed = False
    for index, value in enumerate(args.paths, 1):
        outcome = process_asset(root, value, args.table_class, check=args.check)
        print(json.dumps({"asset": index, **outcome.as_dict()}))
        failed |= not outcome.ok
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
