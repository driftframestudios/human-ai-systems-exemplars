# Internal — Semantic Attractor Design — Negation-Aware Instructions

> A prohibition can foreground the very concept it names. Shape the desired state directly when that preserves the rule, and keep exact boundaries local to the action they govern.
> 

<aside>

The core craft move: classify the job of the negation, then describe the desired state directly where the meaning survives. This is a fitted authoring heuristic for prompts, guidance, emoji-led callouts, and code comments—not a claim that every model or task processes negation in one way.

</aside>

## Quick use

Describing the desired state directly is the highest-leverage phrasing move on this guide. It gives a generating system an explicit target and gives a human reader a calmer success condition. Begin by identifying what the negation is doing; a rewrite earns its place only when it preserves the rule.

### Use this when

Writing guidance, prompts, or instructions for an AI system — especially tone, quality, and generative rules that invite phrasing as a prohibition. The same review applies to emoji polarity (✅/❌) and the code layer. Legal, safety, privacy, epistemic, definitional, and compatibility boundaries retain their exact meaning.

### This restores

A calm, affirmative semantic field with exact local boundaries: the interaction holds a clear sense of what to move *toward*, and the receiving system can find the constraint beside the action it governs.

### Good next question

"What job is this negation doing, what desired state can sit beside it, and what receiving-task observation would establish that the rewrite works?"

**Hands to** Core Principles · Welcome Mat Patterns · Failure Geometries.

### Strain cues

Prohibitions stack up; the model keeps producing the forbidden concept; tone drifts punitive; prohibition-style rules outnumber desired-state rules; ✅/❌ banners or `DO NOT` comments pile up in generated code.

## Debrief

A prohibition can leave the unwanted concept prominent; describing the desired state directly creates a clearer generative target. A fitted three-rung ladder helps authors compare forms, while the receiving task decides which form works.

### The snag

A generative rule lands as a prohibition ("do not be punitive," "avoid non-determinism"), and the unwanted concept keeps surfacing in observed output.

### The read

Research shows several distinct negation effects rather than one universal model deficit. Negated-prompt benchmarks expose failures in some tasks and model families; training-time work shows that distant disclaimers can be learned differently from locally negated claims; embedding studies find task-specific similarity problems; multilingual and mechanistic work shows that scale, language, explicitness, architecture, and late-layer behavior all change the result. This is a faultless system gap when it appears, and it is an empirical question in the receiving task.

### The move

Classify before rewriting. Preserve exact boundaries and quoted material. For a generative prohibition, name what the interaction should feel like, preserve, and optimize for. Keep any retained negation local to the claim or action it governs, pair a hard boundary with the permitted replacement behavior, and validate the result with the receiving model, task, or interface.

### The cure

Guidance becomes a positive-state attractor with local boundaries and an observable fit check. The result is easier to inspect, revise, and carry across systems without claiming universal reliability.

---

# The guidance

Shape desired semantic fields directly after identifying the work each negation performs.

When writing guidance for AI systems, prefer positive-state attractors:

- what should the interaction feel like?
- what should the output preserve?
- what should the system optimize for?
- what should remain stable under repeated use?
- what should a collaborator be able to verify?

Negation retains its place at hard safety, privacy, legal, compatibility, definitional, and epistemic edges. Pair the exact boundary with an affirmative operating state—for example, *"credentials stay server-side; client output never contains a credential."* Keep the two clauses adjacent so retrieval or chunking preserves their relation.

What follows turns this into something teachable and testable: classification before rewrite, semantic locality, a fitted three-rung ladder, forms worth preserving, and receiving-task validation across prose, emoji-led callouts, and code.

## Classify before rewriting

| Negation job | Default treatment | Fit check |
| --- | --- | --- |
| Generative or tone prohibition | Lead with the desired state; retain a contrast only when it helps diagnosis. | Does the receiving output produce the desired behavior across representative cases? |
| Hard safety, privacy, legal, or compatibility boundary | Preserve the exact exclusion and place the permitted behavior beside it. | Can a reviewer identify both the forbidden state and the safe route in one reading? |
| Definitional or epistemic negation | Preserve the term or uncertainty boundary; anchor it with the positive claim it qualifies. | Does the rewrite retain the same entailment and claim limit? |
| Test assertion or absent-state check | Preserve executable semantics; explain the positive invariant nearby when useful. | Does the check still reject the same failure state? |
| Quoted, cited, source, or corpus language | Preserve verbatim. Treat the negation as data. | Does the carrier retain source fidelity? |

## Keep the boundary local

Semantic locality means that a constraint appears in the same sentence, bullet, table row, or compact block as the claim or action it governs. Training-time evidence shows a consequential distinction between distant annotations that label a claim false and negation expressed locally inside the claim. That result does not prove a universal prompt rule; it does support keeping qualifications close enough to survive chunking, retrieval, and partial context.

---

# Patterns — Higher burden → clearer target

These rewrites reduce interpretation burden for generative guidance. They are candidates to test, not semantic substitutions to apply mechanically.

```yaml
rewrite_patterns:
  - higher_burden: "Do not make the interaction punitive."
    clearer_target: "The interaction should feel safe, revisable, collaborative, patient, and curiosity-centered."

  - higher_burden: "Avoid non-determinism."
    clearer_target: "APIs should be idempotent, replay-safe, and predictable under repeated calls."

  - higher_burden: "Do not overwhelm the user."
    clearer_target: "The interface should reveal complexity progressively and preserve cognitive breathability."

  - higher_burden: "Don't fail to preserve context across a long session."
    clearer_target: "Context is preserved across the whole session, and each turn can verify it remains intact."
```

---

# The fitted strength ladder — three rungs

The patterns above move from a prohibition toward a directly stated target. Naming the rungs makes this authoring gradient teachable. The ordering expresses expected clarity for generative instructions; it is not a universal ranking of linguistic competence, retrieval quality, safety, or model reliability.

- **Rung 1 — negation operator + positive token.** A free-standing negator carries the meaning: *"Governance is not separable," "do not be punitive."* This form can be exact and necessary, yet a generative rule still needs the reader or model to infer the replacement behavior.
- **Rung 2 — familiar lexicalized antonym.** The contrast is expressed compactly: *"Governance is inseparable," "the API is deterministic."* Modern English LLMs can often recognize affixal negation reliably, although tokenization and task design affect results. This rung can reduce surface complexity; it does not automatically outperform every explicit negation.
- **Rung 3 — wholly positive constitutive predicate.** The sentence states the operating condition: *"Governance and UX are one system," "the API returns the same result on every replay."* For generative guidance, this form usually provides the most concrete target and the clearest verification route.

| Rung | Form | Example | Working fit |
| --- | --- | --- | --- |
| 1 | Negation operator + positive token | *"Governance is not separable"* | Preserve when the exclusion is exact; add the replacement state for generative work. |
| 2 | Familiar lexicalized antonym | *"Governance is inseparable"* | Compact when the word is conventional and its meaning is stable. |
| 3 | Wholly positive constitutive predicate | *"Governance and UX are one system"* | Names the target state and supplies a direct verification route. |

## Why the ladder is useful—and bounded

The ladder synthesizes evidence from different tasks into an authoring heuristic:

- **Prompt-level evaluation.** Negated prompts produced substantial performance gaps and inverse scaling in one nine-task study across the tested model families (`negation-llms-not-naysayers`). This supports testing direct target statements; it does not establish that every larger or newer model handles negation worse.
- **Training-time learning.** Models learned claims from documents whose distant annotations said the claims were false, while locally negated claims largely mitigated the measured effect in the main setup (`negation-neglect`). Training-time belief acquisition and in-context instruction following remain distinct settings.
- **Lexical processing.** Modern English LLMs reliably recognized affixal negation overall in a dedicated study, despite tokenization mismatches (`affixal-negation-llms`). This supports familiar antonyms as legitimate language, not a universal Rung-2-over-Rung-1 performance claim.
- **Multilingual and scaling variation.** Paired multilingual NLI work found that larger tested models handled negation better, with language, premise length, and explicitness affecting robustness (`negation-pink-elephant-multilingual`).
- **Mechanistic variation.** Work on Mistral-7B and Llama-3.1-8B found internal components that processed negation correctly alongside late-layer attention shortcuts that promoted wrong answers; both suppressive and constructive mechanisms appeared (`negation-mechanisms-zhou`). Internal representation and final output can therefore diverge.
- **Embedding and retrieval variation.** Some embedding evaluations find negated and affirmative text too similar. Apply retrieval-specific checks before treating an instruction-writing improvement as a retrieval improvement (`negation-awareness-embeddings`).

The practical synthesis is modest: direct target states reduce the amount a generating system must infer, local boundaries preserve their relation to the governed claim, and representative receiving-task checks decide fit.

## A note on the framing of "is"

The word *is* provides no special protection. *"Is separable"* and *"is inseparable"* share the same copula and mean different things. The benefit of a constitutive predicate is practical: it names the state to generate and observe. Treat that as an authoring affordance, then verify the receiving behavior.

## Three caveats that keep the heuristic fitted

- **Tokenization** — affixal negation can cross token boundaries, and tokenization quality does not map cleanly to negation sensitivity. Prefer established words over coined forms such as *"non-deprecatable"*, then test the actual receiver (`affixal-negation-llms`).
- **Lexicalized exceptions** — affixed forms do not always compose predictably: *invaluable* means *very valuable*, *inflammable* means *flammable*, and *priceless* often means *beyond price*. Prefer a familiar term whose meaning is stable for the audience.
- **Task transfer** — prompt following, finetuning, text embedding, multilingual NLI, and mechanistic probes measure different behaviors. Carry a result across these settings only as a hypothesis with a receiving-task check.

## Double negation

A doubled negation—*"not unimportant," "don't fail to preserve context"*—usually adds interpretation work without adding a useful boundary. For operational guidance, test the direct form first: *"this matters," "preserve context."* Preserve litotes, quotations, and other rhetorical forms when their voice or source fidelity matters.

Two boundaries keep the ladder honest: it fits authored generative guidance, and it leaves the **load-bearing negations** named below intact. Hard boundaries keep their explicit exclusion and place the allowed behavior beside it.

---

# When the negation carries the meaning

Some negations are load-bearing: the prohibition is the concept itself, not a stylistic choice. "Non-demographic," "unspecified rather than inferred," and "not a substitute for X" lose meaning when flattened into a bare affirmative. Preserve these forms, and lower neglect risk by stating the positive anchor first and the boundary second.

Four load-bearing forms recur:

- Definitional negation — the term is a "non-X" (non-demographic, non-blocking). Keep the negation, and lead with the positive anchor that the term modifies.
- Epistemic-humility negation — "left unspecified rather than inferred" marks a deliberate boundary on the claims made. Keep this form intact.
- Hard policy boundary — "credentials never enter client output" names a forbidden state whose omission would weaken the rule. Place the allowed route beside it: "credentials stay server-side."
- Paired catalog — anti-pattern lists stay legible when each entry sits beside the desired pattern that replaces it. Pair the columns, and state the pairing so chunked retrieval keeps the "instead of" attached.

## Scope note

This terrain was written for guidance and instructions. In expository or research prose, the treatment stays lighter: keep each prohibition beside its replacement and lead each section with the desired state, rather than rewriting analysis into imperatives.

A coverage principle keeps this from becoming a catalog: name the *class* to preserve, not every case. Quoted, cited, and verbatim material—dialogue, transcripts, corpus samples, and the higher-burden examples on this page—stays exactly as written, because there a negation is data rather than authored guidance. Classification keeps the pass focused on authored instructions whose receiving behavior can improve.

---

## Affirmative evidence boundaries

A test, metric, digest, attestation, or agreement signal leads with the state it establishes. The adjacent claim then receives its own fitting evidence.

Constitutive silence carries an unspecified state. An absent assertion, uncalled schema, quiet tool, or omitted comment leaves the adjacent claim open. The next useful sentence names the observation that can establish it.

- A passing manifest check establishes the declared paths and identities it exercised. Family consistency becomes established through current inventory, governed examples, and the fitting cross-family observations.
- Coverage identifies the program structure exercised by a suite. Behavioral correctness becomes established through assertions and failure cases that express the owned behavior.
- A digest establishes content identity against a trusted value. Semantic quality becomes established through material use, review, and execution.

This form preserves epistemic restraint while keeping the evidence-bearing state as the semantic attractor.

## Receiving-task validation

A polarity rewrite remains a hypothesis until the receiving task shows its effect. Select the smallest observation that matches the risk:

- For a prompt or instruction, run representative positive, edge, and adversarial cases against the intended model configuration.
- For retrieval, compare whether affirmative, negated, and contrastive queries return the intended records.
- For training material, keep qualifiers local to the claims they govern and inspect downstream belief or behavior rather than relying on the document label alone.
- For a human-facing interface, confirm that people can identify the desired state, the exact boundary, and the available next action in one reading.
- For code, preserve executable assertions and test the actual invariant. A prose preference never overrides runtime semantics.

Record the model or system, task, examples, and observed difference when the rewrite carries consequential behavior. A stable style preference needs only a proportionate review.

---

# Emojis and the code layer

The same classification applies beyond prose. Two surfaces carry polarity in their own ways, and each earns explicit treatment.

## Emoji polarity

An emoji can visually foreground polarity. A lone ❌ makes the rejected concept prominent while leaving the replacement implicit. Lead with the desired state in words; where a boundary matters, place the exact exclusion and the replacement beside each other. Often the clearest mark is none at all—a constitutive sentence can carry the meaning without a banner.

## Code comments and identifiers (a separate layer)

Comments, docstrings, identifiers, and assertions serve different readers. Comments can name the desired invariant; executable checks retain the exact boolean semantics the program requires:

- Phrase comments as the desired state — `// keep this idempotent` over `// don't make this stateful`.
- Prefer a positive predicate when it truthfully names the same invariant—`assert response.is_stable` over a newly invented negative alias. Preserve `assert not value` when that is the direct executable condition.
- Use emphatic boundary comments for genuine safety, with the replacement beside them—`# SAFETY: keys stay server-side; client output never contains a key`.
- Let identifiers carry affirmative polarity — `preserveContext` over `dontDropContext`.

A worked example makes the intended code posture concrete. The `GUARD` / `TARGET` / `CONTRAST` scaffolding below names the desired state for generation and keeps the higher-burden form visible as diagnostic material:

```tsx
/* =============================================================
   GUARD: LLM NEGATION NEGLECT
   Generate from TARGET comments. Treat CONTRAST as diagnostic only.
   Comments name the desired state; identifiers carry affirmative polarity.

   TARGET:
   A session keeps its context intact across every turn, and each
   turn can verify the context still holds before it replies.

   CONTRAST (diagnostic — do not emit as guidance):
   "// don't lose the session context" names the failure but leaves
   the intended preservation behavior implicit.
   ============================================================= */

export function preserveSessionContext(
  session: Session,
  turn: Turn,
): VerifiedContext {
  // TARGET: context stays intact; verify it before each reply.
  const context = session.contextStaysIntact();

  // SAFETY: credentials stay server-side (the key is never inlined).
  const reply = turn.composeReply(context);

  // TARGET: assert the positive invariant — stable and replay-safe.
  assert(reply.isStable);

  return context.verifiedIntact();
}
```

The full `GUARD` / `TARGET` / `CONTRAST` pattern is worked out across the front-end accessibility probes.

---

# Machine node

```yaml
"@id": @driftframe/field-guide#semantic-attractor-design
type: CollaborationPattern
name: Semantic Attractor Design
version: "2026.10"
last_stabilized: 2026-10-06
section:
  name: "Semantic Attractor Design"
  core_directive: "describe the desired state directly"
  preferred_instruction_style:
    - classification_before_rewrite
    - positive_state_framing
    - replacement_state_guidance
    - semantic_locality
    - verifiable_success_criteria
    - affirmative_evidence_boundaries
    - receiving_task_validation
  negation_policy:
    classify_as: ["generative prohibition", "hard boundary", "definitional or epistemic qualifier", "executable assertion", "source material"]
    use_negation_for: ["hard safety boundaries", "privacy exclusions", "legal and compatibility constraints", "exact executable conditions"]
    pair_with: "desired or permitted replacement behavior"
    keep_local_to: "the claim, action, or state the negation governs"
    preserve_when_load_bearing: ["definitional non-X terms", "epistemic-humility scoping", "hard policy boundaries", "paired anti-pattern catalogs"]
    applies_to: ["prose", "emoji polarity (✅/❌)", "code comments & identifiers"]
    preserve_verbatim: "quoted, cited, and verbatim material is data rather than authored guidance — preserve as-is"
    coverage_principle: "name the class to preserve, then revise only where the negation's job and receiving behavior remain legible"
    strength_ladder:
      scope: "fitted authoring heuristic for generative guidance; not a universal model-performance ranking"
      rungs:
        - { rung: 1, form: negation_operator_plus_positive_token, example: "Governance is not separable", fit: "exact boundary; pair with target state" }
        - { rung: 2, form: familiar_lexicalized_antonym, example: "Governance is inseparable", fit: "compact conventional contrast" }
        - { rung: 3, form: wholly_positive_constitutive_predicate, example: "Governance and UX are one system", fit: "direct generative and verification target" }
    ladder_caveats: ["task families measure different behavior", "prefer established words over coined affixes", "account for lexicalized exceptions", "validate on the receiving model or system"]
    double_negation: "usually higher interpretation burden in operational guidance; preserve when voice, source fidelity, or exact meaning requires it"
references:
  - { ref: "@driftframe/field-guide#core-principles", name: Core Principles }
  - { ref: "@driftframe/field-guide#welcome-mat-patterns", name: Welcome Mat Patterns }
  - { ref: "@driftframe/field-guide#research-to-terrain-map", name: Research-to-Terrain Mapping }
research:
  - { id: negation-neglect, name: negation neglect (training-time) }
  - { id: negation-llms-not-naysayers, name: LLMs as naysayers }
  - { id: negation-probes-kassner-schutze, name: negation probing }
  - { id: negation-hallucinations-varshney, name: negation-triggered hallucination }
  - { id: negation-benchmark-not-a-dataset, name: not-a-dataset negation benchmark }
  - { id: negation-pink-elephant-multilingual, name: pink elephant multilingual negation }
  - { id: negation-mechanisms-zhou, name: suppressive and constructive negation mechanisms }
  - { id: negation-awareness-embeddings, name: negation awareness in embeddings }
  - { id: negation-induced-forgetting, name: negation-induced forgetting }
  - { id: affixal-negation-llms, name: affixal negation (lexicalization) }
  - { id: ironic-rebound-llms, name: ironic rebound / white bear }
  - { id: thought-suppression-ironic-process, name: ironic process theory (Wegner) }
  - { id: negation-scope-ambiguities, name: scope ambiguities }
```

---

# Research anchors

Full citations live in the canonical Field Guide Research Registry. This page names the evidence class beside each row so findings from one setting do not silently become claims about another.

## Negation Neglect (training-time)

Finetuning experiments found that models could learn a claim as true when surrounding annotations repeatedly said it was false. In the main tested setup, phrasing the negation locally inside the claim largely mitigated the effect. This evidence concerns training-time belief acquisition; it does not by itself establish prompt-following behavior.

- `negation-neglect` — [Mayne et al., training-time negation neglect and semantic locality](https://arxiv.org/abs/2605.13829)

## Negation at the Prompt Level

Prompt-level studies show meaningful failures on specific negated instructions, factual probes, and reasoning benchmarks. One negated-prompt suite found inverse scaling across its tested families. Treat model, task, prompt form, and evaluation as part of the result.

- `negation-llms-not-naysayers` — [Jang et al., negated-prompt benchmarks](https://proceedings.mlr.press/v203/jang23a.html)
- `negation-probes-kassner-schutze` — [Kassner & Schütze, negation probing](https://aclanthology.org/2020.acl-main.698/)
- `negation-hallucinations-varshney` — negation-triggered hallucination (Varshney)
- `negation-benchmark-not-a-dataset` — "not a dataset" negation benchmark

## Multilingual and scaling variation

Paired multilingual NLI work found a different size trend: larger tested models handled negation better, while language, premise length, and explicitness affected robustness. The contrast with the negated-prompt study makes model family, language, task, and evaluation part of the result rather than background detail.

- `negation-pink-elephant-multilingual` — [Vrabcová et al., multilingual paired NLI, scaling, language, premise length, and explicitness](https://arxiv.org/abs/2503.22395)

## Lexical and affixal negation

Modern English LLMs can, on the whole, recognize affixal negation reliably even when tokenizer boundaries are morphologically imperfect. This finding supports the legitimate use of familiar antonyms. It does not establish a universal ordering in which affixal wording always outperforms free-standing negation.

- `affixal-negation-llms` — [Truong et al., affixal negation and subword-tokenization sensitivity](https://aclanthology.org/2024.naacl-long.284/)

## Mechanistic evidence

Mechanistic work on two open-weight models found that correct internal negation-processing components can coexist with late-layer attention behavior that promotes simple wrong-answer shortcuts. The models used both suppressive and constructive mechanisms, with constructive representation more prominent in the tested settings. This evidence explains a bounded model family and task; it does not authorize a universal circuit claim.

- `negation-mechanisms-zhou` — [Zhou et al., suppressive and constructive mechanisms; late-layer shortcut behavior](https://proceedings.mlr.press/v306/zhou26bq.html)
- `ironic-rebound-llms` — emerging transformer evidence on ironic negation under tested cognitive-load conditions
- `thought-suppression-ironic-process` — human ironic-process theory; cognitive analogy rather than an LLM mechanism proof

## Negation Awareness in Embeddings & Memory

Some embedding and memory studies find that negated and non-negated text remain overly similar or that negation changes later recall. These results motivate retrieval- and memory-specific checks; they do not directly rank instruction wording.

- `negation-awareness-embeddings` — negation awareness in text embeddings
- `negation-induced-forgetting` — negation-induced forgetting

## Scope and composition

Negation scope becomes harder to interpret alongside quantifiers and other operators. For operational guidance, a direct target state often reduces composition work. The receiving task still decides whether the rewrite improves behavior.

- `negation-scope-ambiguities` — negation × quantifier combinations can admit competing scope readings

### Design consequence

- Classify the negation by its job before rewriting it.
- State the desired behavior directly when the same rule survives the rewrite.
- Keep qualifiers and exclusions local to the claims or actions they govern.
- Pair a hard boundary with the permitted replacement behavior.
- Preserve quotations, definitions, epistemic limits, and executable conditions.
- Validate consequential rewrites on the receiving model, retrieval system, training process, interface, or runtime check.

---

# Terms at a glance

The salient vocabulary this page relies on; full definitions and instruction-engineering implications live in the Glossary terrain (`@driftframe/field-guide#anthropomorphic-postural-language`).

| Term | In one line |
| --- | --- |
| Negation operator | A free-standing *not / avoid / never*; exact for many boundaries, with additional interpretation work in generative guidance. |
| Lexicalized antonym | A conventional word carrying contrast (*inseparable*); compact when its meaning is stable. |
| Constitutive predicate | A wholly positive statement of the operating state; often the clearest generative target. |
| Polarity | The affirmative or negative form of an expression; one feature among task, locality, language, and model behavior. |
| Litotes | Affirmation by denial (*not unhelpful*); a mild double negative. |
| Double negation | Two stacked negations; usually higher interpretation burden in operational guidance. |
| Ironic rebound | A tested condition in which negated content becomes more behaviorally prominent; bounded evidence, not a universal response. |
| Negation scope | The span a negation governs; ambiguous alongside quantifiers. |
| Lexicalized exception | An affixed form whose familiar meaning does not follow a simple negative-prefix rule; use the stable audience meaning. |
| Materially meaningful negation | A negation whose prohibition is the concept itself; preserved intact. |
| Semantic locality | Placement of a qualifier beside the claim or action it governs. |
| Receiving-task validation | A fitting observation of the model, system, interface, or runtime that will consume the guidance. |

---

# Ecosystem Inheritance

```yaml
ecosystem_inheritance:
  inherits:
    - classification_before_rewrite
    - positive_state_guidance
    - replacement_state_framing
    - semantic_locality
    - receiving_task_validation
    - deployment_ethics_awareness

  supported_by:
    - Negation Neglect (training-time)
    - Negation at the Prompt Level
    - Lexical and Affixal Negation
    - Multilingual and Scaling Variation
    - Mechanistic Evidence
    - Negation Awareness in Embeddings

  interoperates_with:
    - { ref: "@driftframe/field-guide#core-principles", name: Core Principles }
    - { ref: "@driftframe/field-guide#welcome-mat-patterns", name: Welcome Mat Patterns }
    - { ref: "@driftframe/field-guide#research-to-terrain-map", name: Research-to-Terrain Mapping }
```

---

# Deployment ethics

This terrain has ecosystem-wide deployment implications.

Positive-state semantic framing can support:

- educational environments
- operational calm
- collaboration tone
- error recovery posture
- uncertainty survivability

In a receiving context, dense or distant prohibitions may:

- intensify panic
- leave the desired behavior implicit
- increase cognitive friction
- make recovery and revision harder to identify

These are design hypotheses rather than universal cognitive effects. Representative receiving-task observations establish whether a consequential rewrite helps.

---

# Scope & retrieval

This terrain should remain:

- compact
- reusable
- interoperable
- referenceable from other terrains

Large example collections should gradually move into:

- appendix terrains
- specification-by-example libraries
- welcome mat pattern modules

---

::links:: Core Principles · Welcome Mat Patterns · Research-to-Terrain Mapping

::provenance:: Verification and version state live in the Machine Index & Context Tree (`@driftframe/field-guide`). This card is built to be deployed on its own.
