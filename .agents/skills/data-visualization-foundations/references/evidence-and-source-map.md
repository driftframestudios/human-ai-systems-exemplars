# Visualization evidence and source map

This map preserves decision-changing research, practitioner guidance, and local
implementation boundaries for the four visualization skills. Read the relevant
row before extending a rule; a bibliography is a discovery route rather than
evidence that every listed work was independently reassessed.

Source review for this draft: 2026-10-04. The skills are research-informed draft
contracts. Scenario exercises establish the choices exercised; rendered use,
cross-context effectiveness, accessibility, and hosted publication have their own
observations. Public Registry pages named here were located through the Notion
connector under the Enterprise Human-AI Practitioner Registry. Workspace URLs
and private operating material remain with their authorized owners.

## Working evidence and bounded design consequences

| Source and standing | Contribution | Skill consequence and transfer boundary |
| --- | --- | --- |
| Cleveland and McGill (1984), [Graphical Perception](https://doi.org/10.1080/01621459.1984.10478080), controlled perceptual research | Examines elementary quantitative encodings. | Aligned position and length are useful starting points for comparison; the task, audience, and context still determine fit. |
| Heer and Bostock (2010), [Crowdsourcing Graphical Perception](https://vis.stanford.edu/papers/crowdsourcing-graphical-perception), empirical research | Studies graphical judgments using web-based experiments. | Tie an encoding recommendation to the measured operation; broad interface success needs its own evidence. |
| Munzner (2009), [A Nested Model for Visualization Design and Validation](https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/), design/validation framework; [Visualization Analysis and Design](https://www.cs.ubc.ca/~tmm/vadbook/) (2014) | Separates domain problem, data/task abstraction, encoding/interaction, and algorithm. | Choose the question and meaning before rendering; arithmetic, geometry, usability, and domain interpretation establish different claims. |
| Ajani, Lee, Xiong, Knaflic, Kemper and Franconeri, [Declutter and Focus](https://cyxiong.com/wp-content/uploads/2021/04/Declutter_2020_TVCG.pdf), empirical study; DOI [10.1109/TVCG.2021.3068337](https://doi.org/10.1109/TVCG.2021.3068337) | Decluttering and selective focus affected subjective ratings and remembered patterns under the study conditions. | Distinguish professionalism/clarity/recall from correctness or trust. Preserve context around a highlighted finding. The study supplies neither a universal aesthetic law nor a blanket ban on every shadow. |
| Cole Nussbaumer Knaflic, [two tips for better graphs](https://www.storytellingwithdata.com/blog/two-tips-for-better-graphs), practitioner guidance connected to the study above | Explains selective emphasis and reduction of distracting visual detail. | Make a supported explanatory reading easy to find while retaining comparison context; exploratory figures can retain a question-led title. |
| Stephen Few, [Bullet Graph Design Specification](https://perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf), revised 2013, practitioner specification | Compact linear comparison of a measure with supplied references and optional qualitative ranges. | Use aligned reference comparisons where their meaning is defined. Thresholds and targets come from the data/domain contract. |
| Stephen Few, [The Role of Software and the Importance of Thoughtful Defaults](https://www.perceptualedge.com/articles/visual_business_intelligence/thoughtful_defaults.pdf) (2007), practitioner guidance | Gives concrete defaults for quantitative charts, including zero-based bars and subdued scaffolding. | Prefer a dot plot when a restricted range serves the question; retain fitting axes and guides rather than treating every detail as clutter. |
| Matt Harrison, [Effective Viz](https://store.metasnake.com/effective-viz), practitioner Python-visualization methodology | This source expands CLEAR as Color, Limited types of visualizations, Explanatory titles and subtitles, Audience targeting, References. | Use the named edition's formulation as a composition lens. It is practitioner guidance, not an empirical guarantee or a universal acronym. Python is a production option, not evidence of quality. |
| W3C WAI, [Complex Images](https://www.w3.org/WAI/tutorials/images/complex/), accessibility guidance | Concise alternatives and fuller descriptions/data help convey complex images. | Pair the visual with a fitting text/value route. A companion or named SVG alone establishes neither complete accessibility nor conformance. |
| W3C, [SVG processing/conformance modes](https://www.w3.org/TR/SVG/conform.html), specification | Image delivery and document interaction have distinct processing modes. | Select static image, inline SVG, or separately governed interactive SVG from required behavior. |
| Matplotlib, [fonts](https://matplotlib.org/stable/users/explain/text/fonts.html) and [savefig](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.savefig.html), implementation documentation | Describes font and format-dependent export behavior. | Inspect actual output and placement; text preservation, font portability, and PDF document semantics remain separate. Match options to the installed version. |
| D3, [scales](https://d3js.org/d3-scale) and [data joins](https://d3js.org/d3-selection/joining), implementation documentation | Provides explicit mappings and keyed correspondence for rendered records. | Reuse existing scales/identity ownership when D3 is already fitting; the library supplies mechanisms rather than a mandatory platform. |
| [Evaluating Graphical Perception with Multimodal LLMs](https://arxiv.org/abs/2504.04221) and [Towards Understanding Graphical Perception in Large Multimodal Models](https://arxiv.org/abs/2503.10857), model/task-specific research | Examines graphical interpretation in studied model and task settings. | Preserve exact companions and qualify transfer by model, version, task, and raster/source delivery. Source-readable SVG does not imply that a receiving chat inspects its markup. |

### Consequential distinctions preserved from the Atlas work

The flat treatment in the current Atlas series is a local accepted visual
contract. Practitioner guidance supports purposeful emphasis and simpler
quantitative reading; attributing a universal shadow prohibition to CLEAR would
overstate the inspected source. The original workflow exemplar and the current
SECOM figure have different populations and measures. A design comparison can
show both while naming that difference; numerical before/after claims require
compatible records and definitions.

The UCI sources carry separate identities: [SECOM](https://doi.org/10.24432/C54305)
and [AI4I 2020](https://doi.org/10.24432/C5HS5C). Source byte identity, published
label counts, mode memberships, and domain interpretation remain separate
claims. Their repository source READMEs hold the dataset-specific license,
derivation, and meaning contracts.

## Public Registry and repository guidance

- [Designing AI Skills as Situated Collaboration Affordances - Guidance for Notion Workspaces and Beyond](https://kindlight.systems/human-ai-collaboration-field-guide/designing-ai-skills-as-situated-collaboration-affordances-guidance-for-notion-workspaces-and-beyond) supplies one coherent job, fit, input/default/result, progressive disclosure, recovery, and material-use evaluation.
- **Skills as Situated Collaboration Affordances - Deep Research Payload**, public handle `@driftframe/deep-research/skills-as-situated-collaboration-affordances`, supplies the research frame and claim classes. A research agenda identifies observations to make; it supplies no completed experiment by itself.
- **Semantic Attractor Design - Negation-Aware Instructions**, in the public Human-AI Collaboration Field Guide, supplies desired-state-first guidance, adjacent hard boundaries, and task-dependent evidence calibration. Its updated public treatment explicitly preserves model/task variability.
- [Visualization Fidelity Atlas - Data Shape to Cognitive Move to Visual Form](https://kindlight.systems/research-atlas-observatory/visualization-fidelity-atlas-data-shape-cognitive-move-visual-form) supplies the five inputs, contextual recommendation classes, F0-F3 production commitment, and evidence companions.
- **Visual & Data Communication Stabilizers - Cognitive Moves for Visual Forms**, cited at the bottom of the repository Atlas page, supplies the conceptual selection practice. The operational Atlas carries its public route and working interpretation.
- **SVG - Enterprise Front-End Practitioner Probes** supplies coordinate, label, delivery, accessibility, export, and measured-performance questions. The [web reference](../../web-data-visualization/references/svg-and-coordinated-views.md) preserves the source-supported versus draft/local-measurement distinctions.
- [Declarative skill authoring](../../declarative-skill-authoring/SKILL.md), [supportive change writing](../../supportive-change-writing/SKILL.md), and [semantic table design](../../semantic-table-design/SKILL.md) retain their repository ownership. The tone-goal index and evidence-and-structural-balance profile remain the writing register owners.

The four skill contracts and their packaged references carry the actionable
method. Private workspace access is optional background, not a prerequisite for
first useful use. Public-page names above are allowed Registry lineage; private
research material travels only as an approved public extract with primary
citations.

## Atlas source owners

- [Visitor Atlas](../../../../context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html): visitor question, current static source-backed figure, native tables, qualitative selector, and bottom-of-page source basis.
- [Full Atlas prototype](../../../../visualization-fidelity-atlas-bundle-v0.1/visualization-fidelity-atlas-chimeric-prototype-v0.1.html): nine exemplars, data/form mappings, state, citations, and source data. Its `citationFooter` and `citations` collection own the bibliography indexed below.
- [Qualitative selector](../../../../collaboration/shared-machinery/visualization-fidelity-selector/index.html): contextual form selection; distinct from the full Atlas instrument.
- [Companion design essay](../../../../context-canvas-project-surface/context-canvas/one-figure-several-readings.html): design practice, preserved original reference, and the source-backed rate/volume reading.
- [SECOM source contract](../../../../context-canvas-project-surface/data/visualization-fidelity/README.md) and [AI4I source contract](../../../../context-canvas-project-surface/data/visualization-fidelity/ai4i/README.md): byte-preserved inputs and deterministic meaning owners.

## Complete prototype-footer bibliography index

This index preserves all current citation keys for retrieval. Entries absent
from the working-evidence table above retain **catalogue standing** here: inspect
the primary work and verify bibliographic details before making a new claim.
The original collection remains the bibliographic owner; this map adds a
decision-oriented route rather than silently upgrading every entry's evidence.

| Citation key | Work named by the Atlas | Load when the decision concerns |
| --- | --- | --- |
| `cleveland-mcgill-1984` | Graphical Perception (1984) | Quantitative encoding and comparison. |
| `cleveland-mcgill-1985` | Graphical Perception and Graphical Methods for Analyzing Scientific Data (1985) | Scientific-data perceptual comparisons. |
| `heer-bostock-2010` | Crowdsourcing Graphical Perception (2010) | Empirical graphical judgments and web experiments. |
| `simkin-hastie-1987` | An Information-Processing Analysis of Graph Perception (1987) | Task-dependent graph reading. |
| `spence-1990` | Displaying Proportions and Percentages (1990) | Proportion reading. |
| `skau-kosara-2016` | Arcs, Angles, or Areas (2016) | Pie/donut encoding tradeoffs. |
| `mackinlay-1986` | Automating the Design of Graphical Presentations of Relational Information (1986) | Data-to-encoding selection. |
| `ware-information-vis` | Information Visualization: Perception for Design | Perceptual mechanisms; verify the edition used. |
| `ware-visual-thinking` | Visual Thinking for Design (2008) | Attention and visual reasoning. |
| `tufte-1983` | The Visual Display of Quantitative Information (1983) | Evidence-rich quantitative composition. |
| `munzner-2014` | Visualization Analysis and Design (2014) | Data/task abstraction and validation. |
| `schwabish-2021` | Better Data Visualizations (2021) | Practical form selection and communication. |
| `evergreen` | Effective Data Visualization | Applied communication; verify the edition used. |
| `davis-risks-ranking` | The Risks of Ranking (2022) | Individual differences and limits of chart rankings. |
| `visualization-perception-survey` | A Survey of Perception-Based Visualization Studies by Task (2021) | Evidence discovery by reader task. |
| `zeng-battle-2021` | A Review and Collation of Graphical Perception Knowledge for Visualization Recommendation (2021) | Recommendation evidence and its conditions. |
| `lo-misinformed-vis` | Misinformed by Visualization (2022) | Misleading visual claims. |
| `pandey-deceptive-2015` | How Deceptive Are Deceptive Visualizations? (2015) | Distorted quantitative interpretation. |
| `cairo-2019` | How Charts Lie (2019) | Evidence and public interpretation. |
| `waldner-2019` | A Comparison of Radial and Linear Charts for Visualizing Daily Patterns (2019) | Cyclic patterns and task-dependent geometry. |
| `inselberg-2009` | Parallel Coordinates (2009) | Multivariate geometry and profile reading. |
| `w3c-informative-images` | WAI Informative Images | Meaningful versus decorative image alternatives. |
| `w3c-complex-images` | WAI Complex Images | Text/value companions for complex figures. |
| `nguyen-llm-graphical-2025` | Evaluating Graphical Perception with Multimodal LLMs (2025) | Studied model/task behavior. |
| `zhang-llm-graphical-2025` | Towards Understanding Graphical Perception in Large Multimodal Models (2025) | Model-specific graphical interpretation. |
| `chartqa-2022` | ChartQA (2022) | Chart question-answering benchmark conditions. |
| `few-bullet-chart` | Bullet Graph Design Specification | Compact measure/reference comparison. |

## Reopening the map

A new source earns a row when it changes a material instruction, representation,
test, boundary, or release condition. New evidence can narrow a rule as readily
as extend it. Keep a claim beside the supporting source and its transfer limit;
additional reading rests when it leaves the next design decision unchanged.
