#!/usr/bin/env python3
"""Project authored simple-table captions/headers into supplemental source labels.

Native markup retains authority. Complex spans keep an explicit review disposition.
HTMLParser supplies text/entity handling; edits preserve surrounding source bytes.
"""
import argparse
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path


class TableContext(HTMLParser):
    def __init__(self, source, classes=()):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.classes = set(classes)
        self.offsets = [0] + [index + 1 for index, char in enumerate(source) if char == "\n"]
        self.tables = []
        self.table = self.row = self.cell = None
        self.caption = False
        self.skipped_depth = 0
        self.feed(source)

    def element(self, tag, attrs):
        line, column = self.getpos()
        return {"tag": tag, "attrs": dict(attrs), "text": [],
                "start": self.offsets[line - 1] + column, "raw": self.get_starttag_text()}

    def handle_starttag(self, tag, attrs):
        if self.skipped_depth:
            self.skipped_depth += tag == "table"
            return
        if tag == "table":
            if self.table is not None:
                raise ValueError("Nested tables require a named semantic owner")
            if self.classes and not self.classes.intersection(dict(attrs).get("class", "").split()):
                self.skipped_depth = 1
                return
            self.table = {**self.element(tag, attrs), "rows": [], "caption": [], "complex": False}
        elif self.table is not None:
            if tag == "caption":
                self.caption = True
            elif tag == "tr":
                self.row = {**self.element(tag, attrs), "cells": []}
            elif tag in ("td", "th") and self.row is not None:
                self.cell = self.element(tag, attrs)
                self.row["cells"].append(self.cell)
                self.table["complex"] |= any(self.cell["attrs"].get(key, "1") != "1" for key in ("colspan", "rowspan"))

    def handle_data(self, data):
        if self.table is not None and self.caption:
            self.table["caption"].append(data)
        if self.cell is not None:
            self.cell["text"].append(data)

    def handle_endtag(self, tag):
        if self.skipped_depth:
            self.skipped_depth -= tag == "table"
            return
        if tag in ("th", "td"):
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.table["rows"].append(self.row)
            self.row = None
        elif tag == "caption":
            self.caption = False
        elif tag == "table" and self.table is not None:
            self.tables.append(self.table)
            self.table = None


def text(parts):
    return " ".join("".join(parts).split())


def with_label(raw, value):
    """Scan actual attributes once; quoted source remains literal content."""
    whitespace = " \t\r\n\f"
    index = 1
    while index < len(raw) and raw[index] not in whitespace + "/>":
        index += 1
    removals = []
    while index < len(raw):
        start = index
        while index < len(raw) and raw[index] in whitespace:
            index += 1
        if index == len(raw) or raw[index] in "/>":
            break
        name_start = index
        while index < len(raw) and raw[index] not in whitespace + "=/>":
            index += 1
        name = raw[name_start:index].lower()
        if not name:
            raise ValueError("An authored attribute requires a name")
        name_end = index
        while index < len(raw) and raw[index] in whitespace:
            index += 1
        if index < len(raw) and raw[index] == "=":
            index += 1
            while index < len(raw) and raw[index] in whitespace:
                index += 1
            if index < len(raw) and raw[index] in "\"'":
                quote = raw[index]
                index += 1
                while index < len(raw) and raw[index] != quote:
                    index += 1
                if index == len(raw):
                    raise ValueError("An authored attribute requires its closing quote")
                index += 1
            else:
                while index < len(raw) and raw[index] not in whitespace + ">":
                    index += 1
        else:
            index = name_end
        if name == "data-label":
            removals.append((start, index))
    pieces, cursor = [], 0
    for start, end in removals:
        pieces.append(raw[cursor:start])
        cursor = end
    pieces.append(raw[cursor:])
    clean = "".join(pieces)
    suffix = "/>" if clean.endswith("/>") else ">"
    return clean[:-len(suffix)] + ' data-label="' + escape(value, quote=True) + '"' + suffix


def project(source, classes=()):
    parsed = TableContext(source, classes)
    edits, dispositions = [], []

    def label(element, value):
        replacement = with_label(element["raw"], value)
        edits.append((element["start"], len(element["raw"]), replacement))

    for table in parsed.tables:
        if parsed.classes and not parsed.classes.intersection(table["attrs"].get("class", "").split()):
            continue
        topic = text(table["caption"])
        headers = [cell for row in table["rows"] for cell in row["cells"] if cell["attrs"].get("scope") == "col"]
        if table["complex"] or not topic or not headers:
            dispositions.append({"topic": topic, "standing": "owner-review", "reason": "span, caption, or column-header contract"})
            continue
        names = [text(cell["text"]) for cell in headers]
        for header, name in zip(headers, names, strict=True):
            label(header, name)
        for row in table["rows"]:
            if not any(cell["tag"] == "td" for cell in row["cells"]):
                continue
            if len(row["cells"]) != len(names):
                raise ValueError("Record cell count must match the simple column-header contract")
            identity = text(row["cells"][0]["text"])
            label(row, topic + ": " + identity)
            for cell, name in zip(row["cells"], names, strict=True):
                label(cell, name)
        dispositions.append({"topic": topic, "standing": "projected"})
    pieces, cursor = [], 0
    for start, length, replacement in sorted(edits):
        if start < cursor:
            raise ValueError("Each source element requires one supplemental label owner")
        pieces.extend((source[cursor:start], replacement))
        cursor = start + length
    pieces.append(source[cursor:])
    return "".join(pieces), dispositions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--table-class", action="append", default=[])
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    for value in args.paths:
        path = (root / value).resolve()
        if not path.is_relative_to(root) or path.suffix != ".html":
            raise ValueError("Choose a repository-owned HTML source")
        with path.open(encoding="utf-8", newline="") as handle:
            source = handle.read()
        result, dispositions = project(source, args.table_class)
        if args.check and result != source:
            raise ValueError("Supplemental table labels need projection from their authored headers")
        if not args.check and result != source:
            with path.open("w", encoding="utf-8", newline="") as handle:
                handle.write(result)
        print(json.dumps({"path": path.relative_to(root).as_posix(), "tables": len(dispositions),
                          "projected": sum(item["standing"] == "projected" for item in dispositions),
                          "owner_review": sum(item["standing"] == "owner-review" for item in dispositions)}))


if __name__ == "__main__":
    main()
