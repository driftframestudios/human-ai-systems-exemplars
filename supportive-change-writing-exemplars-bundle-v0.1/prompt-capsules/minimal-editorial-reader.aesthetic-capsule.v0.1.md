---
$schema: "../schema/aesthetic-prompt-capsule.schema.v0.1.json"
schema_version: "0.1"
id: "prompt-capsule:minimal-editorial-reader:v0.1"
title: "Minimal Editorial Reader Aesthetic"
artifact_type: "prompt_capsule"
version: "0.1.0"
status: "curated_exemplar"
capsule_type: "aesthetic"
applies_to: ["testimonial_blurb_reader","branch_readers","comparative_anthology"]
format_summary: "A compact 7 × 10-inch editorial reader with restrained color, generous leading, and stable wayfinding."
content_surface_contract: "Reader pages carry substantive material; running matter carries collection, branch, essay, and folio navigation."
page_system: {"trim_inches":[7,10],"essay_reader_margins_inches":{"side":1.02,"top":0.96,"bottom":0.78},"blurb_reader_margins_inches":{"side":1.0,"top":0.95,"bottom":0.8}}
typography: [{"role":"body","face":"STIX Two Text","size_leading_pt":"10.35/15"},{"role":"subhead","face":"STIX Two Text","size_leading_pt":"14.2/17.2"},{"role":"essay_title","face":"STIX Two Text","size_leading_pt":"23/27"},{"role":"navigation","face":"Helvetica","size_leading_pt":"6.8/9"},{"role":"emphatic_serif","face":"Georgia Bold","size_leading_pt":"hierarchy dependent"}]
composition: ["left_aligned_body","generous_white_space","stable_page_geometry","fine_rules","controlled_widows_and_orphans"]
hierarchy: ["cover","contents","branch_overview","fresh_page_essay_opening","references"]
navigation: ["running_collection_or_branch_label","running_essay_label","folio","pdf_bookmarks","internal_contents_links"]
palette: {"ink":"#25252B","secondary_text":"#66666C","rules":"#D9D7D4","paper":"#FFFFFF","blurb_accent":"#C64F7C"}
verification_targets: ["7_by_10_inch_trim","embedded_body_fonts","live_text","populated_pages","link_only_navigation_annotations","stable_text_boundaries"]
semantic_attractor_contract: {"target_state":"Typography, proportion, spacing, and restrained color create a quiet literary reader that supports sustained attention.","boundary_condition":"The design preserves live text, stable boundaries, clear hierarchy, accessible navigation, and content-centered pages.","replacement_state":"Use the registered page system, typographic scale, accent palette, and navigation pattern.","verification_signals":["Trim measures 7 × 10 inches.","Fonts are embedded where the format supports embedding.","Headers and footers carry wayfinding.","Pages contain live readable text."]}
source_band: ["aesthetic_prompt_capsule","pdf_art_direction","material_fidelity"]
---
# Minimal editorial reader aesthetic

## Aesthetic prompt capsule

Create a compact 7 × 10-inch editorial reader whose typography supports sustained reading. Use generous margins, stable page geometry, a quiet classical serif, generous leading, left-aligned text, restrained hierarchy, and ample white space. Let type, spacing, fine rules, and one controlled accent carry the visual identity.

Apply a Bringhurst-informed discipline: coherent measure, generous leading, quiet hierarchy, stable rhythm, respectful margins, and typography that recedes as the prose becomes absorbing.

## Comparative essay readers

- Page: 7 × 10 inches.
- Margins: 1.02 inches at each side, 0.96 inch at top, 0.78 inch at bottom.
- Body: STIX Two Text, approximately 10.35/15 pt.
- Subheads: approximately 14.2/17.2 pt.
- Essay titles: approximately 23/27 pt.
- Branch titles: approximately 27/31 pt.
- Cover title: approximately 30/33 pt.
- References: approximately 8.65/12.1 pt with compact hanging treatment.
- Weight: Georgia Bold where an emphatic serif form serves the hierarchy.
- Navigation: small Helvetica labels.
- Ink: `#25252B`; secondary text: `#66666C`; fine rules: `#D9D7D4`; paper: white.

Branch accents:

- Executive culture — `#315B73`
- Frontline teams — `#9B612F`
- Cross-functional collaboration — `#39756F`
- Sustainable well-being — `#5F7742`
- Customer and community service — `#75598A`
- Small-business leadership — `#965448`
- Personal-to-work transitions — `#4E6478`

## Testimonial blurb reader

- Page: 7 × 10 inches.
- Margins: 1.00 inch at each side, 0.95 inch at top, 0.80 inch at bottom.
- Body: STIX Two Text, approximately 10.5/14.9 pt.
- Section and branch titles: 14.2–31 pt across the hierarchy.
- Navigation: Helvetica labels and folios.
- Accent: restrained raspberry `#C64F7C` with near-black `#25242A`, muted gray `#68666A`, and fine rule `#D8D3D0`.

## Hierarchy and navigation

Use covers, contents, branch overviews, fresh-page essay openings, and reference sections as the main hierarchy. Running headers carry collection, branch, or essay location. Footers carry a concise document label and folio. PDF bookmarks and internal contents links support orientation where present.

Reader pages carry audience-facing substance. Repository capsules carry art direction and production context. Published testimony uses participant-reviewed wording and attribution.

## Quality signals

- Live text and stable page boundaries.
- Embedded body fonts.
- Populated pages with generous, purposeful white space.
- Clear contents, bookmarks, and link-only annotations where navigation is present.
- Controlled widows and orphans, coherent paragraph measure, and compact references.

## Material exemplars

- [Finished PDF readers](../artifacts/pdf/README.md)
