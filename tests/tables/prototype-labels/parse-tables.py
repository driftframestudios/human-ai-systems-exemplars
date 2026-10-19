"""Observe trusted repository fixtures with explicitly closed, unnested tables.

The CLI accepts a JSON list of HTML strings and publishes one complete result.
This observer preserves semantic text, rather than source bytes or browser DOM
recovery. Repository fixture size remains caller-owned; this is a local test
helper rather than an external-input service.
"""
import json
import sys
from html.parser import HTMLParser


class Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.scripts = []
        self.table = None
        self.row = None
        self.cell = None
        self.script = None
        self.section = ""

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "script":
            self.script = {"attrs": attributes, "text": []}
            self.scripts.append(self.script)
        elif self.script is not None:
            return
        elif tag == "table":
            if self.table is not None:
                raise ValueError("nested tables are outside the source-observation contract")
            self.table = {"attrs": attributes, "rows": []}
            self.tables.append(self.table)
        elif self.table is not None and tag in ("thead", "tbody", "tfoot"):
            if self.section or self.row is not None or self.cell is not None:
                raise ValueError("table sections require separately closed sections and rows")
            self.section = tag
        elif self.table is not None and tag == "tr":
            if self.row is not None:
                raise ValueError("table rows require explicit closing tags")
            self.row = {"attrs": attributes, "section": self.section, "cells": []}
            self.table["rows"].append(self.row)
        elif self.table is not None and tag in ("td", "th"):
            if self.row is None:
                raise ValueError("table cells require an enclosing row")
            if self.cell is not None:
                raise ValueError("table cells require explicit closing tags")
            self.cell = {"tag": tag, "attrs": attributes, "text": []}
            self.row["cells"].append(self.cell)
        elif self.cell is not None and tag in ("br", "p", "div"):
            self.cell["text"].append(" ")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in ("br", "input", "img", "meta", "link"):
            self.handle_endtag(tag)

    def handle_data(self, data):
        if self.script is not None:
            self.script["text"].append(data)
        elif self.cell is not None:
            self.cell["text"].append(data)

    def handle_endtag(self, tag):
        if tag == "script":
            self.script = None
        elif self.script is not None:
            return
        elif self.table is not None and tag in ("td", "th"):
            if self.cell is None or self.cell["tag"] != tag:
                raise ValueError("table cell closing tags must match their opening tags")
            self.cell = None
        elif self.table is not None and tag == "tr":
            if self.cell is not None or self.row is None:
                raise ValueError("table rows require explicitly closed cells")
            self.row = None
        elif self.table is not None and tag == "table":
            if self.row is not None or self.cell is not None or self.section:
                raise ValueError("tables require explicitly closed sections, rows, and cells")
            self.table = None
            self.section = ""
        elif self.table is not None and tag in ("thead", "tbody", "tfoot"):
            if self.section != tag or self.row is not None or self.cell is not None:
                raise ValueError("table section closing tags require the matching section and closed rows")
            self.section = ""
        elif self.cell is not None and tag in ("p", "div"):
            self.cell["text"].append(" ")


def parse_sources(sources):
    """Admit list[str], then return invocation-owned semantic observations."""
    if not isinstance(sources, list):
        raise ValueError("source input must be a list of HTML strings")
    for index, source in enumerate(sources):
        if not isinstance(source, str):
            raise ValueError(f"source input item {index} must be an HTML string")
    results = []
    for index, source in enumerate(sources):
        parser = Tables()
        try:
            parser.feed(source)
            parser.close()
            if parser.table is not None or parser.script is not None:
                raise ValueError("tables and scripts require explicit closing tags")
        except ValueError as error:
            raise ValueError(f"source input item {index}: {error}") from error
        for table in parser.tables:
            for row in table["rows"]:
                for cell in row["cells"]:
                    cell["text"] = "".join(cell["text"])
        for script in parser.scripts:
            script["text"] = "".join(script["text"])
        results.append({"tables": parser.tables, "scripts": parser.scripts})
    return results


def main(input_stream, output_stream, error_stream):
    try:
        results = parse_sources(json.load(input_stream))
    except ValueError as error:
        print(f"Table observation input: {error}", file=error_stream)
        return 2
    json.dump(results, output_stream, ensure_ascii=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.stdin, sys.stdout, sys.stderr))
