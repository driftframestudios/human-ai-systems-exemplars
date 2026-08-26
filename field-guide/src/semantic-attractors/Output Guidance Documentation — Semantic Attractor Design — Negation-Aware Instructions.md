# Internal — Semantic Attractor Design — Negation-Aware Instructions

> A prohibition can quietly summon the very concept it names. Shape the desired state directly, and let the wanted behavior become the attractor.
> 

<aside>

The core craft move: describe the desired state directly. It holds under repetition, stays legible to the model reading it, and applies to prose, emojis, and code comments alike.

</aside>

## Quick use

Describing the desired state directly is the highest-leverage phrasing move on this guide: it makes instructions hold under repetition, keeps them legible to the AI reading them, and keeps the humans in the loop calmer. Reach for it whenever a rule is tempted into a prohibition.

### Use this when

Writing guidance, prompts, or instructions for an AI collaborator — especially safety, tone, or quality rules that invite phrasing as a prohibition. The same move governs emoji polarity (✅/❌) and the code layer.

### This restores

A calm, affirmative semantic field: the interaction holds a clear sense of what to move *toward*, and a collaborator has a target to climb toward rather than a hazard to avoid.

### Good next question

"What is the desired end state here, and how would a collaborator verify it?"

**Hands to** Core Principles · Welcome Mat Patterns · Failure Geometries.

### Strain cues

Prohibitions stack up; the model keeps producing the forbidden concept; tone drifts punitive; prohibition-style rules outnumber desired-state rules; ✅/❌ banners or `DO NOT` comments pile up in generated code.

## Debrief

A prohibition keeps summoning the concept it names; describing the desired state directly turns guidance into a reliable, AI-legible attractor — and there is a graded ladder for doing it well.

### The snag

A rule lands as a prohibition ("do not be punitive," "avoid non-determinism"), and the unwanted concept keeps surfacing anyway.

### The read

Negation stays weakly represented at both training and inference time — stating a prohibited concept can activate it, and embeddings often blur the "not." This is a faultless gap: a model rarely detects itself doing it.

### The move

Rewrite toward the desired state: name what the interaction should feel like, preserve, and optimize for, and leave a collaborator able to verify it. Then climb the strength ladder — lexicalize the negation, or better, restate it as a wholly positive constitutive predicate. Reserve explicit negation for hard safety and privacy edges, always paired with a replacement state.

### The cure

Guidance becomes a positive-state attractor — reliable under repetition, legible to AI, and calmer for the humans in the loop.

---

# The guidance

Shape desired semantic fields directly — it is the move the rest of this page makes precise.

When writing guidance for AI systems, prefer positive-state attractors:

- what should the interaction feel like?
- what should the output preserve?
- what should the system optimize for?
- what should remain stable under repeated use?
- what should a collaborator be able to verify?

Negation still earns its place at hard safety and privacy edges — and even there, a constitutive form (*"credentials stay server-side"*) is stronger than a bare prohibition; reserve explicit negation for the irreducible edge, always paired with its replacement state.

What follows turns this into something teachable and verifiable: a three-rung strength ladder, the forms worth preserving when a negation carries the meaning, and direct treatment for the emoji and code layers — each with a worked example a collaborator can climb toward.

---

# Patterns — Fragile → Stronger

Each "stronger" form climbs the strength ladder below: lexicalize the negation, or better, restate it as a wholly positive constitutive predicate.

```yaml
rewrite_patterns:
  - fragile: "Do not make the interaction punitive."
    stronger: "The interaction should feel safe, revisable, collaborative, patient, and curiosity-centered."

  - fragile: "Avoid non-determinism."
    stronger: "APIs should be idempotent, replay-safe, and predictable under repeated calls."

  - fragile: "Do not overwhelm the user."
    stronger: "The interface should reveal complexity progressively and preserve cognitive breathability."

  - fragile: "Don't fail to preserve context across a long session."
    stronger: "Context is preserved across the whole session, and each turn can verify it remains intact."
```

---

# The strength ladder — three rungs

The fragile → stronger rewrites above climb a single gradient. Naming the rungs makes the gradient teachable and gives a collaborator a clear target to climb toward. Each rung is more reliable than the one below it because each removes more of the negation an AI has to resolve at inference time.

- **Rung 1 — negation operator + positive token** (weakest). A free-standing negator carries the meaning: *"Governance is not separable," "do not be punitive."* The operator (`not`, `avoid`, `never`) is often processed more like a content word than a logical one, so its scope resolves unreliably; meanwhile the positive token it points at (*separable*, *punitive*) stays active in the field. Pairing the prohibition with a replacement state — the move named in the patterns above — is a real improvement, because it supplies the desired attractor, yet the negator and the unwanted token are both still present.
- **Rung 2 — lexicalized antonym** (stronger). The negation is baked into a single word: *"Governance is inseparable," "the API is idempotent and stable."* Affixal/lexicalized negation is largely resolved in the lexicon rather than composed from a fragile scope operator at inference, and the phrasing is affirmative in polarity, so there is no "not" to drop and no forbidden token left sitting in the field.
- **Rung 3 — wholly positive constitutive predicate** (strongest). No negative morphology at all: *"Governance and UX are one system," "the API returns the same result on every replay."* The sentence states what *is*, constitutively, so there is nothing to negate, no scope to lose, and no rebound token. This is the form the patterns above already reach for, and the form to prefer whenever a constitutive restatement is available.

| Rung | Form | Example | Why it ranks here |
| --- | --- | --- | --- |
| 1 (weakest) | Negation operator + positive token | *"Governance is not separable"* | Operator scope resolves unevenly; the forbidden token stays active. |
| 2 (stronger) | Lexicalized antonym | *"Governance is inseparable"* | Negation resolved in the lexicon; affirmative polarity, nothing to drop. |
| 3 (strongest) | Wholly positive constitutive predicate | *"Governance and UX are one system"* | Nothing to negate, no scope to lose, no token to rebound. |

## Why the rungs hold (mechanism, briefly)

Three converging effects explain the order:

- **Scope fragility** — `not` and other operators resolve unreliably, and the problem multiplies when negation meets quantifiers or other operators (`negation-scope-ambiguities`).
- **Ironic rebound** — naming a forbidden positive token raises its activation rather than lowering it; circuit-level work traces this to mid-layer heads that amplify the very token early layers tried to suppress. *"Not separable"* keeps *separable* on the table; *"inseparable"* never utters it (`ironic-rebound-llms`, `thought-suppression-ironic-process`).
- **Lexical absorption** — affixal negation is largely handled at the lexical level, with minimal performance cost, which is why Rung 2 outperforms Rung 1 (`affixal-negation-llms`).

## A note on the framing of "is"

The lift from *"not separable"* to *"inseparable"* is real, but the active ingredient is **not the word *is** *—* "is separable" *and* "is inseparable" *share the copula and mean opposites. Two mechanisms do the work: lexicalization (the negation is resolved once, in the lexicon, as one stable embedding with its own entailments) and affirmative polarity (a positive assertion has no scope to drop and triggers no negation-induced forgetting). The copula is the* vehicle* for the affirmative restatement, not the cause of the gain. A constitutive predication is entailment-rich and inference-stable; a denial is something a model can locally forget. The intuition — constitutive predication beats denial — is sound; Rung 3 is simply its fullest form.

## Three caveats that keep the rule strong

- **Tokenization** — the Rung-2 benefit depends on the antonym tokenizing as a stable unit. Common forms (*inseparable, unstable, independent*) are safe; rare or coined affix forms (*"non-deprecatable," "un-composable"*) fragment into subwords and lose the advantage. Prefer established antonyms (`affixal-negation-llms`).
- **Fossilized antonyms** — some affixed forms have drifted from compositional meaning: *invaluable* means *very valuable*, *inflammable* means *flammable*, *priceless* is not "without price." Reach for a true compositional antonym instead.
- **Antonym proximity in embeddings** — antonyms can sit close together in vector space, so the gain is mainly a **generation and instruction** win, with **retrieval** gains less assured; embeddings can still blur the contrast (`negation-awareness-embeddings`).

## Double negation

A doubled negation — *"not unimportant," "don't fail to preserve context"* — forces a model to resolve two scopes and two rebound tokens at once, and is the most fragile form of all. It is the clearest argument for Rung 3: the clean repair is almost always a wholly positive constitutive restatement — *"context is preserved," "this matters"* — rather than a careful double negative. Litotes (affirmation-by-denial, *"not unhelpful"*) belongs to the same family and carries the same fragility.

Two boundaries keep the ladder honest: the climb is for guidance and tone, and it leaves the **load-bearing negations** named below intact, while **hard safety and privacy edges** keep their explicit negation, always paired with a replacement state.

---

# When the negation carries the meaning

Some negations are load-bearing: the prohibition is the concept itself, not a stylistic choice. "Non-demographic," "unspecified rather than inferred," and "not a substitute for X" lose meaning when flattened into a bare affirmative. Preserve these forms, and lower neglect risk by stating the positive anchor first and the boundary second.

Three load-bearing forms recur:

- Definitional negation — the term is a "non-X" (non-demographic, non-blocking). Keep the negation, and lead with the positive anchor that the term modifies.
- Epistemic-humility negation — "left unspecified rather than inferred" marks a deliberate boundary on the claims made. Keep this form intact.
- Paired catalog — anti-pattern lists stay legible when each entry sits beside the desired pattern that replaces it. Pair the columns, and state the pairing so chunked retrieval keeps the "instead of" attached.

## Scope note

This terrain was written for guidance and instructions. In expository or research prose, the treatment stays lighter: keep each prohibition beside its replacement and lead each section with the desired state, rather than rewriting analysis into imperatives.

A coverage principle keeps this from becoming a catalog: name the *class* to preserve, not every case. Quoted, cited, and verbatim material — dialogue, transcripts, corpus samples, and the fragile examples on this page — stays exactly as written, because there a negation is data rather than authored guidance. A capable collaborator generalizes from that one statement, so the explicit words are spent where self-detection is hardest — on negation neglect, a faultless gap — and competence is trusted for the rest.

---

## Affirmative evidence boundaries

A test, metric, digest, attestation, or agreement signal leads with the state it establishes. The adjacent claim then receives its own fitting evidence.

Constitutive silence carries an unspecified state. An absent assertion, uncalled schema, quiet tool, or omitted comment leaves the adjacent claim open. The next useful sentence names the observation that can establish it.

- A passing manifest check establishes the declared paths and identities it exercised. Family consistency becomes established through current inventory, governed examples, and the fitting cross-family observations.
- Coverage identifies the program structure exercised by a suite. Behavioral correctness becomes established through assertions and failure cases that express the owned behavior.
- A digest establishes content identity against a trusted value. Semantic quality becomes established through material use, review, and execution.

This form preserves epistemic restraint while keeping the evidence-bearing state as the semantic attractor.

---

# Emojis and the code layer

The ladder governs more than prose. Two surfaces carry negation in their own ways, and each earns explicit treatment.

## Emoji polarity

An emoji can act as a negation operator. ❌ marks a prohibition as surely as the word *avoid*, and a lone ❌ leaves the forbidden concept active in the field much as a bare *not* does. Read ✅ and ❌ as polarity markers: lead with ✅ on the desired state, and where a boundary matters, pair ❌ with the replacement it points toward rather than letting it stand alone. Often the strongest mark is none at all — a constitutive sentence asks for no checkmark.

## Code comments and identifiers (a separate layer)

Comments, docstrings, and identifiers address the code and parser layer, which carries a training distribution of its own: years of forum and repository code dense with emphatic `DO NOT`, `# never`, `assert not`, and ❌ / ✅ banners. That layer can retain negation habits after the prose has already climbed the ladder, so it earns direct specification of its own:

- Phrase comments as the desired state — `// keep this idempotent` over `// don't make this stateful`.
- Name invariants positively — `assert response.is_stable` over `assert not response.is_flaky`.
- Reserve `DO NOT` banners for genuine safety, with the replacement beside them — `# SAFETY: keys stay server-side (the key is never inlined)`.
- Let identifiers carry affirmative polarity — `preserveContext` over `dontDropContext`.

A worked example carries the rule into the code layer more durably than prose alone — an actual code block tends to hold the posture longer, and holds it best when prose and code travel together. The `GUARD` / `TARGET` / `CONTRAST` scaffolding below names the desired state for generation and keeps the fragile form visible only as diagnostic material:

```tsx
/* =============================================================
   GUARD: LLM NEGATION NEGLECT
   Generate from TARGET comments. Treat CONTRAST as diagnostic only.
   Comments name the desired state; identifiers carry affirmative polarity.

   TARGET:
   A session keeps its context intact across every turn, and each
   turn can verify the context still holds before it replies.

   CONTRAST (diagnostic — do not emit as guidance):
   "// don't lose the session context" names the failure, leaves
   "lose context" active in the field, and offers nothing to build toward.
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
version: "2026.06"
last_stabilized: 2026-06-10
section:
  name: "Semantic Attractor Design"
  core_directive: "describe the desired state directly"
  preferred_instruction_style:
    - positive_state_framing
    - replacement_state_guidance
    - verifiable_success_criteria
    - affirmative_evidence_boundaries
  negation_policy:
    use_negation_for: ["hard safety boundaries", "privacy exclusions"]
    pair_with: "desired replacement behavior"
    preserve_when_load_bearing: ["definitional non-X terms", "epistemic-humility scoping", "paired anti-pattern catalogs"]
    applies_to: ["prose", "emoji polarity (✅/❌)", "code comments & identifiers"]
    preserve_verbatim: "quoted, cited, and verbatim material is data rather than authored guidance — preserve as-is"
    coverage_principle: "name the class to preserve, not every case; spend explicit words on negation neglect (a faultless gap) and trust model competence elsewhere"
    strength_ladder:
      - { rung: 1, form: negation_operator_plus_positive_token, example: "Governance is not separable", reliability: weakest }
      - { rung: 2, form: lexicalized_antonym, example: "Governance is inseparable", reliability: stronger }
      - { rung: 3, form: wholly_positive_constitutive_predicate, example: "Governance and UX are one system", reliability: strongest }
    ladder_caveats: ["prefer common antonyms (tokenization)", "use true compositional antonyms over fossilized forms", "antonym embedding proximity favors generation over retrieval"]
    double_negation: "most fragile; repair to a wholly positive constitutive predicate"
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
  - { id: negation-awareness-embeddings, name: negation awareness in embeddings }
  - { id: negation-induced-forgetting, name: negation-induced forgetting }
  - { id: affixal-negation-llms, name: affixal negation (lexicalization) }
  - { id: ironic-rebound-llms, name: ironic rebound / white bear }
  - { id: thought-suppression-ironic-process, name: ironic process theory (Wegner) }
  - { id: negation-scope-ambiguities, name: scope ambiguities }
```

---

# Research Anchors

Full citations live in the canonical Field Guide Research Registry; this page references registry rows so the bibliographic detail stays in one place.

## Negation Neglect (training-time)

Models can fail to robustly learn negated claims during training, sometimes retaining the underlying claim more strongly than its negation.

- `negation-neglect` — training-time negation neglect

## Negation at the Prompt Level

Negation failure spans both training time and inference time. Stating a prohibited concept can activate it in generation, so prompt-level phrasing matters as much as training data.

- `negation-llms-not-naysayers` — LLMs as naysayers (negation benchmarks)
- `negation-probes-kassner-schutze` — negation probing (Kassner & Schütze)
- `negation-hallucinations-varshney` — negation-triggered hallucination (Varshney)
- `negation-benchmark-not-a-dataset` — "not a dataset" negation benchmark
- `negation-pink-elephant-multilingual` — "pink elephant" multilingual negation

## Negation Awareness in Embeddings & Memory

Embedding systems can treat negated and non-negated text as overly similar, and negation can impair what is later recalled.

- `negation-awareness-embeddings` — negation awareness in text embeddings
- `negation-induced-forgetting` — negation-induced forgetting

## The strength ladder, rebound & scope

Why lexicalized antonyms and wholly positive predicates outperform free-standing negation, and where the gains break down.

- `affixal-negation-llms` — affixal negation resolved at the lexical level (Rung 2 > Rung 1)
- `ironic-rebound-llms` — ironic rebound: naming a forbidden token raises its activation
- `thought-suppression-ironic-process` — Wegner's white-bear effect, the cognitive analog
- `negation-scope-ambiguities` — negation × quantifier scope resolves unreliably

### Design consequence (borrowed from the Research Registry)

- Models under-weight negation — state the desired action directly (`negation-neglect`, training-time).
- Prompt-level evidence agrees: LLMs stay insensitive to negation and reason unreliably under it (`negation-llms-not-naysayers`).
- Instruction-tuned models hallucinate heavily on negation tasks (`negation-hallucinations-varshney`).
- Text embeddings under-represent negation, so semantic similarity can quietly blur "not" (`negation-awareness-embeddings`).
- Processing a negation can impair later memory for the affirmed link (`negation-induced-forgetting`).
- Climb the strength ladder: prefer a lexicalized antonym over free-standing negation, and a wholly positive constitutive predicate over both.
- Net move: describe desired behavior directly, use replacement-state framing, and rely on affirmative phrasing rather than negation alone.

---

# Terms at a glance

The salient vocabulary this page relies on; full definitions and instruction-engineering implications live in the Glossary terrain (`@driftframe/field-guide#anthropomorphic-postural-language`).

| Term | In one line |
| --- | --- |
| Negation operator | A free-standing *not / avoid / never*; the weakest rung, its scope resolving unevenly. |
| Lexicalized antonym | Negation folded into one word (*inseparable*); the middle rung. |
| Constitutive predicate | A wholly positive statement of what *is*; the strongest rung. |
| Polarity | Affirmative versus negative; affirmative polarity leaves no scope to drop. |
| Litotes | Affirmation by denial (*not unhelpful*); a mild double negative. |
| Double negation | Two stacked negations; the most fragile form. |
| Ironic rebound | Naming a forbidden token raises its activation — the white-bear effect. |
| Negation scope | The span a negation governs; ambiguous alongside quantifiers. |
| Fossilized antonym | An affix drifted from its meaning (*invaluable*); reach for a true compositional antonym instead. |
| Materially meaningful negation | A negation whose prohibition is the concept itself; preserved intact. |

---

# Ecosystem Inheritance

```yaml
ecosystem_inheritance:
  inherits:
    - positive_state_guidance
    - replacement_state_framing
    - semantic_locality
    - deployment_ethics_awareness

  supported_by:
    - Negation Neglect (training-time)
    - Negation at the Prompt Level
    - Negation Awareness in Embeddings

  interoperates_with:
    - { ref: "@driftframe/field-guide#core-principles", name: Core Principles }
    - { ref: "@driftframe/field-guide#welcome-mat-patterns", name: Welcome Mat Patterns }
    - { ref: "@driftframe/field-guide#research-to-terrain-map", name: Research-to-Terrain Mapping }
```

---

# Deployment ethics

This terrain has ecosystem-wide deployment implications.

Positive-state semantic framing can influence:

- educational environments
- operational calm
- collaboration tone
- error recovery posture
- uncertainty survivability

Negation-heavy interaction surfaces may unintentionally:

- intensify panic
- activate unwanted semantic fields
- increase cognitive friction
- reduce revision safety

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
