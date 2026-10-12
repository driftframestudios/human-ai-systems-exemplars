"""Source-owned top-level labels; browser and iframe owners have separate checks.

Run with Python 3.12 through the repository's isolated uv lane:
python -m unittest discover -s tests/tables/visitor-labels -p 'test_*.py' -v
VISITOR_LABEL_EVIDENCE optionally selects a local per-page checkpoint directory.
"""
from collections import Counter
from dataclasses import dataclass, replace
from functools import partial
from hashlib import sha256
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import json
import os
import sys
import unittest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from tools import project_table_context as projection

CONTRACT = Path(__file__).with_name("coverage.json")


@dataclass(frozen=True)
class TableVariant:
    title: str
    owner: str
    row: int
    cell: int | None
    part: str
    value: str
    rejection: str


def plain(value):
    return projection.scan_start_tag(
        projection.with_label("<td>", value)
    ).attributes[0].value


class NativeInventory(HTMLParser):
    """Independently count native tags while HTMLParser keeps scripts opaque."""

    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.elements = []
        self.ids = []
        self.scripts = []
        self.frames = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag in ("table", "tr", "th", "td"):
            self.elements.append((tag, attrs))
        if "id" in attributes:
            self.ids.append(attributes["id"])
        if tag == "script" and "src" in attributes:
            self.scripts.append(attributes["src"])
        if tag == "iframe":
            self.frames += 1


class PromptConditionLabelContracts(unittest.TestCase):
    """One separately owned iframe table, outside the 43-page visitor count."""

    @classmethod
    def setUpClass(cls):
        cls.source = (
            ROOT / "collaboration/about-prompt-conditions-explorer/index.html"
        ).read_bytes().decode("utf-8")
        cls.parsed = projection.parse_source(cls.source)
        cls.topic = "Prompt-side conditions for a recoverable human\u2013AI handoff"
        cls.fields = [
            "Condition", "What the prompt carries", "Changed work",
            "Named receiver", "Evidence boundary", "Deeper route",
        ]

    def test_complete_native_records_and_supplemental_meaning(self):
        expected = [
            ["Source diet",
             "Named source, era, population, scope, evidence, and exclusions.",
             "The response can return to each source and compare its standing.",
             "Research or domain steward.",
             "Provenance supports comparison; applicability and authority remain source-specific.",
             "Collaboration Cycle"],
            ["Desired state",
             "A positive condition and the replacement behavior that makes a boundary actionable.",
             "Review can test whether the proposed state is present and revise the route directly.",
             "Product or practice owner.",
             "A desired condition supplies an evaluable direction; local evidence establishes whether it was reached.",
             "Hiring Surfaces"],
            ["Role boundary",
             "Register, task, decision standing, and people who retain accountable authority.",
             "Persona shapes conduct while evidence continues to carry truth.",
             "Accountable domain or business owner.",
             "A simulated role supplies perspective and vocabulary; it does not inherit professional standing.",
             "Core Architectures Index"],
            ["Input sanitation",
             "Quoted source, task instructions, tool output, and authority labels kept distinct.",
             "Material remains usable without silently becoming instruction.",
             "Security, privacy, or workflow steward.",
             "Separation limits instruction confusion; named owners still review sensitive or high-consequence use.",
             "Composable Site Readings & Debriefs"],
            ["Working set",
             "Objective, evidence, open conditions, output shape, decision horizon, and receiver.",
             "The named receiver can inspect, compare, resume, and hand off the decision.",
             "Workflow steward or next decision owner.",
             "Compactness supports continuity when provenance and unresolved conditions remain attached.",
             "Metadata Blocks"],
        ]
        self.assertEqual(len(self.parsed.tables), 1)
        table = self.parsed.tables[0]
        self.assertEqual(projection.text(table.caption), self.topic)
        self.assertIsNone(table.element.attribute("data-label"))
        self.assertEqual(len(table.rows), 6)
        self.assertIsNone(table.rows[0].element.attribute("data-label"))
        self.assertEqual([projection.text(c.text) for c in table.rows[0].cells], self.fields)
        for cell, field in zip(table.rows[0].cells, self.fields, strict=True):
            self.assertEqual((cell.tag, cell.attribute("scope")), ("th", "col"))
            self.assertEqual(cell.attribute("data-label"), field)
        for row, values in zip(table.rows[1:], expected, strict=True):
            self.assertEqual([projection.text(c.text) for c in row.cells], values)
            self.assertEqual(row.element.attribute("data-label"),
                             self.topic + ": " + values[0])
            self.assertEqual((row.cells[0].tag, row.cells[0].attribute("scope")),
                             ("th", "row"))
            self.assertTrue(all(cell.tag == "td" for cell in row.cells[1:]))
            self.assertEqual([c.attribute("data-label") for c in row.cells], self.fields)
        native = NativeInventory(self.source)
        self.assertEqual(Counter(tag for tag, _ in native.elements),
                         {"table": 1, "tr": 6, "th": 11, "td": 25})
        labelled = Counter()
        for tag, attributes in native.elements:
            labels = [value for name, value in attributes if name == "data-label"]
            self.assertLessEqual(len(labels), 1, tag)
            if labels:
                self.assertTrue(labels[0])
                labelled[tag] += 1
        self.assertEqual(labelled, {"tr": 5, "th": 11, "td": 25})

    def test_exact_nonlabel_bytes_links_and_projector_idempotence(self):
        table = self.parsed.tables[0]
        elements = [table.element]
        for row in table.rows:
            elements.extend((row.element, *row.cells))
        spans = sorted(
            (element.start + attribute.start, element.start + attribute.end)
            for element in elements for attribute in element.attributes
            if attribute.name == "data-label"
        )
        self.assertEqual(len(spans), 41)
        fragments = []
        cursor = 0
        for start, end in spans:
            fragments.append(self.source[cursor:start])
            cursor = end
        fragments.append(self.source[cursor:])
        original = "".join(fragments)
        # The pre-label owner binds every visible byte, link, scope, style and script.
        self.assertEqual(sha256(original.encode("utf-8")).hexdigest(),
                         "487417f2ba56bf6f7b84fdcaa9bc84cc83a832909c37df2ffa0fb3a9468a21af")
        projected, dispositions = projection.project(original)
        self.assertEqual(dispositions, [{"topic": self.topic, "standing": "projected"}])
        self.assertEqual(projected, self.source)
        self.assertEqual(projection.project(projected)[0], projected)
        for route in (
            "cross-platform-collaboration-cycle.html",
            "hiring-surfaces-talent-agent-intake.html",
            "core-architectures-orientation-index.html",
            "grammar-family.html", "metadata-blocks.html",
        ):
            self.assertIn(
                'href="../../context-canvas-project-surface/context-canvas/' + route + '"',
                original,
            )


class VisitorLabelContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        contract_bytes = CONTRACT.read_bytes()
        cls.contract = json.loads(contract_bytes)
        cls.contract_sha256 = sha256(contract_bytes).hexdigest()
        cls.projector_sha256 = sha256(
            (ROOT / "tools/project_table_context.py").read_bytes()
        ).hexdigest()
        cls.directory = ROOT / cls.contract["root"]
        cls.sources = {
            name: (cls.directory / name).read_bytes().decode("utf-8")
            for name in cls.contract["pages"]
        }
        cls.parsed = {
            name: projection.parse_source(source)
            for name, source in cls.sources.items()
        }
        cls.inventory_sha256 = sha256(json.dumps(
            {name: parsed.digest for name, parsed in sorted(cls.parsed.items())},
            sort_keys=True, separators=(",", ":"),
        ).encode()).hexdigest()

    def table(self, name, ordinal):
        return self.parsed[name].tables[ordinal - 1]

    def test_complete_inventory_and_owner_boundaries(self):
        expected = set(self.contract["pages"]) | set(self.contract["exclusions"])
        self.assertEqual({p.name for p in self.directory.glob("*.html")}, expected)
        self.assertEqual(len(self.sources), 40)
        self.assertEqual(sum(len(a.tables) for a in self.parsed.values()), 147)
        self.assertEqual(sum(not a.tables for a in self.parsed.values()), 3)
        self.assertEqual(set(self.contract["exclusions"]), {
            "distributed-inspection-harness.html",
            "narrative-execution-gap-research-atlas.html",
        })
        for name, source in self.sources.items():
            with self.subTest(source=name):
                native = NativeInventory(source)
                expected_page = self.contract["pages"][name]
                self.assertEqual(native.scripts, expected_page["external_scripts"])
                self.assertEqual(native.frames, expected_page["embedded_documents"])

    def test_every_native_element_and_projector_parity(self):
        counts = Counter()
        dispositions = Counter()
        evidence = os.environ.get("VISITOR_LABEL_EVIDENCE")
        for name, parsed in self.parsed.items():
            with self.subTest(source=name):
                native = NativeInventory(parsed.source)
                expected = self.contract["pages"][name]["tables"]
                self.assertEqual(len(parsed.tables), len(expected))
                for tag, attrs in native.elements:
                    values = [value for key, value in attrs if key == "data-label"]
                    self.assertEqual(len(values), 1, (name, tag, attrs))
                    self.assertTrue(values[0].strip())
                    counts[tag] += 1
                validated = projection.validate_tables(parsed)
                for table, contract, disposition in zip(
                    parsed.tables, expected, validated.dispositions, strict=True
                ):
                    counts_in_table = Counter(c.tag for r in table.rows for c in r.cells)
                    self.assertEqual(len(table.rows), contract["rows"])
                    self.assertEqual(counts_in_table["th"], contract["th"])
                    self.assertEqual(counts_in_table["td"], contract["td"])
                    self.assertEqual(table.element.attribute("data-label"), contract["topic"])
                    self.assertEqual(plain(projection.text(table.caption)), contract["topic"])
                    self.assertEqual(table.rows[0].element.attribute("data-label"),
                                     contract["topic"] + ": column headings")
                    self.assertEqual(disposition.standing,
                                     "projected" if contract["shape"] == "simple" else "owner-review")
                    dispositions[contract["shape"]] += 1
                self.assertEqual(projection.project(parsed.source)[0], parsed.source)
                if evidence:
                    destination = Path(evidence)
                    destination.mkdir(parents=True, exist_ok=True)
                    report = {
                        "file": name, "source_sha256": parsed.digest,
                        "complete_inventory_sha256": self.inventory_sha256,
                        "contract_sha256": self.contract_sha256,
                        "projector_sha256": self.projector_sha256,
                        "native_tables": len(parsed.tables),
                        "labelled_native_elements": len(native.elements),
                        "source_coverage": "pass", "projector_parity": "pass",
                    }
                    target = destination / (name + ".json")
                    temporary = target.with_suffix(".tmp")
                    temporary.write_text(json.dumps(report, indent=2) + "\n")
                    temporary.replace(target)
        self.assertEqual(dict(counts), {"table": 147, "tr": 1046, "th": 1488, "td": 2811})
        self.assertEqual(dict(dispositions), {
            "simple": 143, "empty-register": 2,
            "capital-summary": 1, "grouped-populations": 1,
        })

    def test_coverage_summary_matches_its_declared_tables(self):
        tables = [table for page in self.contract["pages"].values()
                  for table in page["tables"]]
        counts = self.contract["counts"]
        self.assertEqual(counts["owned_pages"], len(self.contract["pages"]))
        self.assertEqual(counts["native_tables"], len(tables))
        self.assertEqual(counts["simple_tables"], sum(t["shape"] == "simple" for t in tables))
        self.assertEqual(counts["explicit_tables"], sum(t["shape"] != "simple" for t in tables))
        self.assertEqual(counts["native_labelled_elements"],
                         sum(1 + t["rows"] + t["th"] + t["td"] for t in tables))
        self.assertEqual(counts["native_labelled_elements"], 5492)
        self.assertEqual(counts["runtime_body_generators"], len(self.contract["runtime"]))

    def _atlas_gallery_records(self, ordinal, fields, records):
        table = self.table("visualization-fidelity-atlas.html", ordinal)
        self.assertEqual(len(table.rows), records + 1)
        self.assertEqual([projection.text(c.text) for c in table.rows[0].cells], fields)
        for cell in table.rows[0].cells:
            self.assertEqual((cell.tag, cell.attribute("scope")), ("th", "col"))
        values = []
        for row in table.rows[1:]:
            self.assertEqual(len(row.cells), len(fields))
            self.assertEqual((row.cells[0].tag, row.cells[0].attribute("scope")), ("th", "row"))
            self.assertTrue(all(c.tag == "td" for c in row.cells[1:]))
            self.assertEqual([c.attribute("data-label") for c in row.cells], fields)
            values.append([projection.text(c.text) for c in row.cells])
        return values

    def test_atlas_gallery_population_and_reconciliation_baselines(self):
        fields = ["Product type", "Recorded rows", "Machine-failure labels",
                  "Machine-failure labels per 100 records", "Availability"]
        expected = [("L", 6000, 235), ("M", 2997, 83), ("H", 1003, 21)]
        for ordinal in (6, 7):
            rows = self._atlas_gallery_records(ordinal, fields, 3)
            for row, (kind, records, labels) in zip(rows, expected, strict=True):
                with self.subTest(table=ordinal, population=kind):
                    self.assertEqual(row[:3], ["Product type " + kind, str(records), str(labels)])
                    self.assertAlmostEqual(float(row[3]), 100 * labels / records, places=12)
                    self.assertEqual(row[4], "Available")
        fields = ["Label / mode relationship", "Machine-failure label", "At least one mode flag",
                  "Records", "Records per 100 selected records", "Availability"]
        rows = self._atlas_gallery_records(8, fields, 4)
        expected = [
            ("Neither label nor mode flag", "0", "No", 9643),
            ("Mode flag only", "0", "Yes", 18),
            ("Machine-failure label only", "1", "No", 9),
            ("Both label and mode flag", "1", "Yes", 330),
        ]
        for row, (name, label, flag, records) in zip(rows, expected, strict=True):
            with self.subTest(relationship=name):
                self.assertEqual(row[:4], [name, label, flag, str(records)])
                self.assertAlmostEqual(float(row[4]), 100 * records / 10000, places=12)
                self.assertEqual(row[5], "Available")

    def test_atlas_gallery_conditions_keep_every_bin_and_its_support(self):
        fields = ["Speed / torque bin", "Recorded rows", "Machine-failure labels",
                  "Machine-failure labels per 100 records", "Availability"]
        rows = self._atlas_gallery_records(9, fields, 100)
        document = json.loads((ROOT / "context-canvas-project-surface/data/visualization-fidelity/"
                               "ai4i/gallery.v1.json").read_text(encoding="utf-8"))
        cells = document["heatmaps"]["all"]["cells"]
        self.assertEqual(len(cells), 100)
        records_total = labels_total = empty_bins = 0
        for index, (row, cell) in enumerate(zip(rows, cells, strict=True)):
            speed, torque = index % 10, index // 10
            speed_end = "]" if speed == 9 else ")"
            torque_end = "]" if torque == 9 else ")"
            identity = (f"Speed [{1000 + 200 * speed}, {1200 + 200 * speed}{speed_end} rpm; "
                        f"torque [{10 * torque}, {10 + 10 * torque}{torque_end} Nm")
            with self.subTest(bin=index):
                self.assertEqual(row[0], identity)
                records, labels = int(row[1]), int(row[2])
                self.assertEqual((records, labels), (cell["records"], cell["failures"]))
                self.assertGreaterEqual(records, 0)
                self.assertGreaterEqual(labels, 0)
                self.assertLessEqual(labels, records)
                if records:
                    self.assertAlmostEqual(float(row[3]), 100 * labels / records, places=12)
                    self.assertEqual(row[4], "Available")
                else:
                    self.assertEqual(row[3:], ["Unavailable", "No records"])
                    empty_bins += 1
                records_total += records
                labels_total += labels
        self.assertEqual((records_total, labels_total), (10000, 339))
        self.assertGreater(empty_bins, 0)
        outside = document["heatmaps"]["all"]["outOfRange"]
        self.assertEqual((outside["records"], outside["failures"]), (0, 0))

    def test_atlas_research_memberships_preserve_the_selected_work_count(self):
        fields = ["Editorial topic", "Empirical study", "Technical guidance",
                  "Practitioner source", "Works in topic"]
        rows = self._atlas_gallery_records(10, fields, 6)
        expected = [
            ("comparison", "Comparison", [1, 1, 3, 5]),
            ("interpretation", "Interpretation", [1, 2, 4, 7]),
            ("distribution-and-uncertainty", "Distribution and uncertainty", [1, 1, 0, 2]),
            ("accessibility", "Accessibility", [0, 1, 1, 2]),
            ("web-delivery-and-state", "Web delivery and state", [0, 2, 0, 2]),
            ("production-and-validation", "Production and validation", [0, 2, 1, 3]),
        ]
        directory = ROOT / "context-canvas-project-surface/data/visualization-fidelity/research"
        records = json.loads((directory / "sources.v1.json").read_text(encoding="utf-8"))["records"]
        summary = json.loads((directory / "summary.v1.json").read_text(encoding="utf-8"))
        kinds = {"empirical-study": 2, "technical-guidance": 6, "practitioner-source": 5}
        self.assertEqual(len(records), 13)
        self.assertEqual(len({record["id"] for record in records}), 13)
        self.assertEqual(sum(len(record["topics"]) for record in records), 21)
        self.assertEqual(sum(len(record["topics"]) > 1 for record in records), 7)
        self.assertEqual(dict(Counter(record["evidenceKind"] for record in records)), kinds)
        self.assertEqual(summary["totals"], {
            "works": 13, "topicMemberships": 21, "multiTopicWorks": 7, "byEvidenceKind": kinds,
        })
        for row, topic, (topic_id, label, counts) in zip(rows, summary["topics"], expected, strict=True):
            with self.subTest(topic=topic_id):
                self.assertEqual(row, [label, *map(str, counts)])
                self.assertEqual(topic["id"], topic_id)
                self.assertEqual(topic["works"], counts[3])
                self.assertEqual(topic["byEvidenceKind"], dict(zip(kinds, counts[:3], strict=True)))
                self.assertEqual(sum(counts[:3]), counts[3])
        self.assertEqual(sum(int(row[-1]) for row in rows), 21)
        native = NativeInventory(self.sources["visualization-fidelity-atlas.html"])
        self.assertEqual(native.ids.count("research-gallery-title"), 1)
        source_ids = [value for value in native.ids
                      if value.startswith("research-") and value != "research-gallery-title"]
        self.assertEqual(len(source_ids), 13)
        self.assertEqual(set(source_ids), {"research-" + record["id"] for record in records})

    def test_empty_registers_are_status_rows(self):
        for name, topic, width in (
            ("concept-nursery.html", "Concept Nursery register", 4),
            ("resting-concepts.html", "Resting Concepts register", 3),
        ):
            with self.subTest(source=name):
                table = self.table(name, 3)
                row = table.rows[1]
                self.assertEqual(len(table.rows), 2)
                self.assertEqual(len(row.cells), 1)
                self.assertEqual(row.cells[0].tag, "td")
                self.assertEqual(row.cells[0].attribute("colspan"), str(width))
                self.assertEqual(projection.text(row.cells[0].text), "(none yet)")
                self.assertEqual(row.element.attribute("data-label"), topic + ": no entries recorded")
                self.assertEqual(row.cells[0].attribute("data-label"), topic + ": entry availability")
                self.assertEqual([c.attribute("data-label") for c in table.rows[0].cells],
                                 [projection.text(c.text) for c in table.rows[0].cells])

    def _assert_column_headings(self, row, fields, topic, owner):
        self.assertEqual(row.element.tag, "tr", f"{owner} heading-row tag")
        self.assertEqual(len(row.cells), len(fields), f"{owner} heading width")
        self.assertEqual(row.element.attribute("data-label"),
                         topic + ": column headings", f"{owner} heading-row identity")
        for column, (cell, field) in enumerate(zip(row.cells, fields, strict=True), 1):
            context = f"{owner} heading {column}"
            self.assertEqual(cell.tag, "th", context + ": tag")
            self.assertEqual(cell.attribute("scope"), "col", context + ": scope")
            self.assertEqual(cell.attribute("colspan", "1"), "1", context + ": colspan")
            self.assertEqual(cell.attribute("rowspan", "1"), "1", context + ": rowspan")
            self.assertEqual(projection.text(cell.text), field, context + ": text")
            self.assertEqual(cell.attribute("data-label"), field, context + ": label")

    def _assert_capital_table(self, table):
        topic = "Current staged-capital bands and the operating result each tranche buys"
        fields = ("Stage", "Operating result", "Planning duration",
                  "Current planning band", "What becomes knowable")
        self.assertEqual(table.element.tag, "table")
        self.assertEqual(projection.text(table.caption), topic)
        self.assertEqual(table.element.attribute("data-label"), topic)
        self.assertEqual(len(table.rows), 7, "capital row count")
        self._assert_column_headings(table.rows[0], fields, topic, "capital")
        for index, row in enumerate(table.rows[1:-1], 1):
            context = f"capital row {index}"
            self.assertEqual(row.element.tag, "tr", context + ": tag")
            self.assertEqual(len(row.cells), len(fields), context + ": width")
            self.assertEqual([cell.tag for cell in row.cells],
                             ["th", "td", "td", "td", "td"], context + ": cell tags")
            self.assertEqual([c.attribute("data-label") for c in row.cells],
                             list(fields), context + ": field labels")
            self.assertEqual(row.cells[0].attribute("scope"), "row", context + ": scope")
            identity = plain(projection.text(row.cells[0].text))
            self.assertTrue(identity, context + ": native identity")
            self.assertEqual(row.element.attribute("data-label"),
                             topic + ": " + identity, context + ": identity")
        summary = table.rows[-1]
        self.assertEqual(summary.element.tag, "tr")
        self.assertEqual(len(summary.cells), 3, "capital summary width")
        self.assertEqual([cell.tag for cell in summary.cells], ["th", "td", "td"])
        self.assertEqual(projection.text(summary.cells[0].text), "Full build envelope")
        self.assertEqual(summary.cells[0].attribute("colspan"), "3")
        self.assertEqual(summary.cells[0].attribute("scope"), "row")
        self.assertEqual([c.attribute("data-label") for c in summary.cells],
                         ["Full build envelope", "Current planning band", "What becomes knowable"])
        self.assertEqual(projection.text(summary.cells[1].text), "USD 95k\u2013167k")
        self.assertEqual(projection.text(summary.cells[2].text),
                         "Shared implementation overlap is reflected; capital remains staged.")
        self.assertEqual(summary.element.attribute("data-label"),
                         topic + ": Full build envelope", "capital summary: identity")

    def _assert_grouped_table(self, table, document_ids):
        topic = "Decisions, changed work, operating load, and signals across nine populations"
        field_names = ("Case vocabulary", "Population", "Decision carried", "Changed work",
                       "Investment or operating load", "Responsibility and useful consequence")
        self.assertEqual(table.element.tag, "table")
        self.assertEqual(projection.text(table.caption), topic)
        self.assertEqual(table.element.attribute("data-label"), topic)
        self.assertEqual(len(table.rows), 10, "grouped row count")
        self._assert_column_headings(table.rows[0], field_names, topic, "grouped")
        fields = table.rows[0].cells
        field_ids = [c.attribute("id") for c in fields]
        self.assertEqual(field_ids, ["comparative-populations-" + word for word in (
            "case", "population", "decision", "work", "investment", "responsibility"
        )])
        groups = (
            ("Humatics \u00b7 site and posture", "comparative-populations-humatics"),
            ("Who To Believe \u00b7 voice and trust", "comparative-populations-who-to-believe"),
            ("FMI \u00b7 partner rule grammar", "comparative-populations-fmi"),
        )
        id_counts = Counter(document_ids)
        for identifier in field_ids + [group[1] for group in groups]:
            self.assertEqual(id_counts[identifier], 1, identifier)
        for index, row in enumerate(table.rows[1:]):
            context = f"grouped row {index + 1}"
            self.assertEqual(row.element.tag, "tr", context + ": tag")
            self.assertEqual(len(row.cells), 6 if index % 3 == 0 else 5, context + ": width")
            display_group, group_id = groups[index // 3]
            group = display_group.replace(" \u00b7 ", ": ")
            if index % 3 == 0:
                group_header = row.cells[0]
                self.assertEqual(group_header.tag, "th")
                self.assertEqual(group_header.attribute("scope"), "rowgroup")
                self.assertEqual(group_header.attribute("rowspan"), "3")
                self.assertEqual(group_header.attribute("id"), group_id)
                self.assertEqual(group_header.attribute("headers"), field_ids[0])
                self.assertEqual(group_header.attribute("data-label"), "Case vocabulary")
                self.assertEqual(projection.text(group_header.text), display_group)
                cells = row.cells[1:]
            else:
                cells = row.cells
            self.assertEqual(len(cells), 5)
            population = projection.text(cells[0].text)
            self.assertTrue(population, context + ": native identity")
            self.assertEqual(row.element.attribute("data-label"),
                             topic + ": " + group + ": " + population, context + ": identity")
            for column, cell in enumerate(cells, 1):
                self.assertEqual(cell.tag, "td")
                self.assertEqual(cell.attribute("headers"), group_id + " " + field_ids[column])
                self.assertEqual(cell.attribute("data-label"), group + ": " + field_names[column])

    def _mutated_table(self, table, variant):
        """Copy one trusted parsed fixture path; source strings remain unchanged."""
        self.assertIn(variant.part, ("tag", "scope", "data-label"), "fixture part")
        self.assertTrue(0 <= variant.row < len(table.rows), "fixture row")
        row = table.rows[variant.row]
        if variant.cell is None:
            element = row.element
        else:
            self.assertTrue(0 <= variant.cell < len(row.cells), "fixture cell")
            element = row.cells[variant.cell]
        if variant.part == "tag":
            prefix = "<" + element.tag
            self.assertTrue(element.raw.startswith(prefix), "fixture tag spelling")
            raw = "<" + variant.value + element.raw[len(prefix):]
        else:
            attributes = [a for a in element.attributes if a.name == variant.part]
            self.assertEqual(len(attributes), 1, "fixture selects one authored attribute")
            attribute = attributes[0]
            raw = (element.raw[:attribute.start] + " " + variant.part + '="' +
                   escape(variant.value, quote=True) + '"' + element.raw[attribute.end:])
        parsed = projection.scan_start_tag(raw)
        changed = replace(element, tag=parsed.name, raw=raw, attributes=parsed.attributes)
        if variant.cell is None:
            changed_row = replace(row, element=changed)
        else:
            cells = row.cells[:variant.cell] + (changed,) + row.cells[variant.cell + 1:]
            changed_row = replace(row, cells=cells)
        rows = table.rows[:variant.row] + (changed_row,) + table.rows[variant.row + 1:]
        return replace(table, rows=rows)

    def test_capital_summary_preserves_currency_and_spanning_meaning(self):
        self._assert_capital_table(self.table("field-inspection-harness-replatform.html", 4))

    def test_grouped_populations_have_exact_native_header_paths(self):
        ids = NativeInventory(self.sources["three-way-comparative-return.html"]).ids
        self._assert_grouped_table(self.table("three-way-comparative-return.html", 6), ids)

    def test_complex_oracles_reject_semantic_mutations(self):
        ids = NativeInventory(self.sources["three-way-comparative-return.html"]).ids
        fixtures = {
            "capital": (self.table("field-inspection-harness-replatform.html", 4),
                        self._assert_capital_table),
            "grouped": (self.table("three-way-comparative-return.html", 6),
                        partial(self._assert_grouped_table, document_ids=ids)),
        }
        for table, oracle in fixtures.values():
            oracle(table)
        variants = (
            TableVariant("capital ordinary identity", "capital", 1, None, "data-label",
                         "Unrelated", "capital row 1: identity"),
            TableVariant("capital heading label", "capital", 0, 0, "data-label",
                         "Unrelated", "capital heading 1: label"),
            TableVariant("capital summary topic", "capital", 6, None, "data-label",
                         "Unrelated: Full build envelope", "capital summary: identity"),
            TableVariant("grouped heading label", "grouped", 0, 0, "data-label",
                         "Unrelated", "grouped heading 1: label"),
            TableVariant("capital column scope", "capital", 0, 0, "scope",
                         "row", "capital heading 1: scope"),
            TableVariant("grouped column scope", "grouped", 0, 0, "scope",
                         "row", "grouped heading 1: scope"),
            TableVariant("capital heading tag", "capital", 0, 0, "tag",
                         "td", "capital heading 1: tag"),
            TableVariant("grouped heading tag", "grouped", 0, 0, "tag",
                         "td", "grouped heading 1: tag"),
            TableVariant("capital row-header tag", "capital", 1, 0, "tag",
                         "td", "capital row 1: cell tags"),
            TableVariant("grouped ordinary identity", "grouped", 2, None, "data-label",
                         "Unrelated", "grouped row 2: identity"),
        )
        for variant in variants:
            with self.subTest(variant=variant.title):
                table, oracle = fixtures[variant.owner]
                changed = self._mutated_table(table, variant)
                with self.assertRaisesRegex(AssertionError, variant.rejection):
                    oracle(changed)

    def test_complex_oracles_reject_incomplete_shapes(self):
        ids = NativeInventory(self.sources["three-way-comparative-return.html"]).ids
        fixtures = (
            ("capital", self.table("field-inspection-harness-replatform.html", 4),
             self._assert_capital_table),
            ("grouped", self.table("three-way-comparative-return.html", 6),
             partial(self._assert_grouped_table, document_ids=ids)),
        )
        for owner, table, oracle in fixtures:
            oracle(table)
            with self.subTest(owner=owner, missing="row"):
                shortened = replace(table, rows=table.rows[:-1])
                with self.assertRaisesRegex(AssertionError, owner + " row count"):
                    oracle(shortened)
            for index, row in enumerate(table.rows):
                with self.subTest(owner=owner, missing="cell", row=index):
                    changed_row = replace(row, cells=row.cells[:-1])
                    rows = table.rows[:index] + (changed_row,) + table.rows[index + 1:]
                    shortened = replace(table, rows=rows)
                    with self.assertRaisesRegex(AssertionError, owner + " .*width"):
                        oracle(shortened)

    def test_break_boundaries_keep_display_names_and_identifiers_distinct(self):
        examples = {
            3: ["Technical or system terrain technical-system", "Narrative thread narrative-thread",
                "Clean session boundary session-boundary", "Configured-system failure configured-system",
                "Reliance boundary reliance-boundary"],
            4: ["Confident Wrong confident-wrong", "Silent Handoff silent-handoff",
                "Vanishing Session vanishing-session"],
            5: ["Human owner human-owner"],
        }
        for ordinal, identities in examples.items():
            table = self.table("registry-goal-fidelity-routing.html", ordinal)
            for row, identity in zip(table.rows[1:], identities):
                with self.subTest(table=ordinal, identity=identity):
                    self.assertEqual(projection.text(row.cells[0].text), identity)
                    self.assertEqual(row.cells[0].attribute("scope"), "row")
                    self.assertEqual(row.element.attribute("data-label"),
                                     projection.text(table.caption) + ": " + identity)

    def test_literal_unicode_and_markup_shaped_values_keep_their_meaning(self):
        table = self.table("fmi-lims-eln-replatforming.html", 5)
        self.assertEqual(projection.text(table.rows[0].cells[1].text), "Then \u00b7 2021\u20132022")
        self.assertEqual(table.rows[0].cells[1].attribute("data-label"), "Then: 2021\u20132022")
        row = self.table("fmi-clinical-trial-coordination.html", 2).rows[1]
        self.assertEqual(projection.text(row.cells[0].text), "SVG + <foreignObject>")
        self.assertTrue(row.element.attribute("data-label").endswith(": SVG + <foreignObject>"))
        self.assertIn("&lt;foreignObject&gt;", row.element.raw)
        row = self.table("shared-machinery.html", 1).rows[-1]
        self.assertEqual(projection.text(row.cells[0].text),
                         "Registry \u00d7 Goal Fidelity \u2014 Recovery & Re-entry")
        self.assertTrue(row.element.attribute("data-label").endswith(
            ": Registry \u00d7 Goal Fidelity - Recovery & Re-entry"))
        table = self.table("index.html", 2)
        self.assertEqual(table.element.attribute("data-label"), "I\u2019ve worked as\u2026")
        row = self.table("ai-systems.html", 5).rows[1]
        self.assertEqual(projection.text(row.cells[0].text), "Prompt craft \u2192 configured-system design")
        self.assertTrue(row.element.attribute("data-label").endswith(
            ": Prompt craft to configured-system design"))

    def test_about_role_table_keeps_the_newest_work_machine_legible(self):
        table = self.table("index.html", 2)
        fields = [
            "Role in the situation",
            "Changed work",
            "Reported consequence",
            "Context",
        ]
        self.assertEqual([projection.text(cell.text) for cell in table.rows[0].cells], fields)
        self.assertEqual(len(table.rows), 5)

        newest = table.rows[1]
        self.assertEqual(
            [projection.text(cell.text) for cell in newest.cells],
            [
                "Designer and Engineer",
                "Fully redesigned and launched an FDA-approved clinical-genomics medical device, including production code that helped teams deliver treatment-decision insights for people with cancer.",
                "Eliminated an entire category of assignment errors, retired a brittle failure-tracking spreadsheet, and saved about 25 minutes per person when querying statistics and sample state.",
                "Genomics · 2022–2025",
            ],
        )
        self.assertEqual(newest.element.attribute("data-label"),
                         "I’ve worked as…: Designer and Engineer")
        self.assertEqual((newest.cells[0].tag, newest.cells[0].attribute("scope")),
                         ("th", "row"))
        self.assertTrue(all(cell.tag == "td" for cell in newest.cells[1:]))
        self.assertEqual([cell.attribute("data-label") for cell in newest.cells], fields)

        product_leader = table.rows[3]
        self.assertEqual(projection.text(product_leader.cells[0].text), "Product leader")
        self.assertIn(
            "equipped designers to participate directly in technical discussions",
            projection.text(product_leader.cells[1].text),
        )

        designer_engineer = table.rows[4]
        self.assertEqual(projection.text(designer_engineer.cells[0].text),
                         "Designer and engineer")
        changed_work = projection.text(designer_engineer.cells[1].text)
        self.assertIn("A shared implementation model replaced design-to-engineering handoffs",
                      changed_work)
        self.assertIn("API constraints shaped feasible features early", changed_work)
        self.assertIn("the design system scaled beyond atomic components", changed_work)
        self.assertNotIn("into engineering handoff", changed_work)

    def test_runtime_fixtures_match_the_native_counterparts(self):
        self.assertEqual(len(self.contract["runtime"]), 2)
        for fixture in self.contract["runtime"]:
            table = self.table(fixture["source"], fixture["table"])
            self.assertEqual([c.attribute("data-label") for c in table.rows[0].cells], fixture["fields"])
            values = [[projection.text(c.text) for c in row.cells] for row in table.rows[1:]]
            digest = sha256(json.dumps(values, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
            self.assertEqual(digest, fixture["normalized_value_sha256"])
            self.assertEqual([row[0] for row in values], fixture["identities"])
            self.assertEqual(len(values), fixture["records"])
            for difference in fixture["text_differences"]:
                row, column = difference["row"] - 1, difference["column"] - 1
                self.assertEqual(values[row][column], difference["native"])
                values[row][column] = difference["runtime"]
            runtime_digest = sha256(json.dumps(
                values, ensure_ascii=False, separators=(",", ":")
            ).encode()).hexdigest()
            self.assertEqual(runtime_digest, fixture["runtime_value_sha256"])
            if fixture["function"] == "buildFailureTable":
                self.assertEqual(fixture["text_differences"], [])
                self.assertEqual(fixture["full_text_parity"], "pass")
                self.assertEqual(runtime_digest, digest)
            else:
                self.assertEqual(fixture["full_text_parity"], "retained-literal-quotation")
                self.assertEqual(len(fixture["text_differences"]), 1)
                difference = fixture["text_differences"][0]
                self.assertEqual((difference["row"], difference["column"]), (1, 5))
                self.assertTrue(difference["native"].startswith("\u201cMe\u201d"))
                self.assertTrue(difference["runtime"].startswith("\u2018Me\u2019"))


if __name__ == "__main__":
    unittest.main()
