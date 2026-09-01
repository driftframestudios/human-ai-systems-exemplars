---
name: schema-contract-authoring
description: Authors or revises repository schema families as bounded, legible contracts with distinct identity, authority, retrieval, examples, semantic context, dependency closure, and proportional material-use checks. Applies when a schema root, versioned contract, JSON-LD context, example family, publication route, or cross-repository schema projection enters scope.
---

# Schema contract authoring

## Contract

- **What:** A portable method for shaping a schema family around the objects collaborators need to understand, exchange, validate, and recover.
- **When:** A repository adds or revises a schema root, family version, semantic context, example set, publication route, or linked projection from another authority.
- **Boundaries:** Meaning, schema, content, instance, and publication authority remain explicit. Existing family schemas retain their local authority. Validation stays proportional to a material use, and publication activation follows the named human decision boundary.
- **Result:** A versioned contract whose identity, source, retrieval paths, dependency closure, examples, and intended extension points are easy to find.

## Rules

### Rule: Begin with receiving objects

Name the objects and decisions the schema must carry before selecting fields. A repository orientation schema maps collections and authority. A visitor-surface schema describes experience intent, standing, representations, relations, contracts, and recovery. Each family stays narrower than a union of every object it contains.

### Rule: Keep identity, location, and authority independent

Declare the schema dialect with root `$schema` and record the absolute canonical `$id` separately from repository paths and public retrieval routes. Instance `schemaVersion` or `schemaRef` fields remain family conventions rather than substitutes for either schema keyword. Name semantic owner, schema authority, instance owner, and publication authority when those roles differ. Mirrors of an identity-bearing exact-version resource preserve its identifier and bytes. Any post-publication byte change receives another exact-version path.

### Rule: Select the compatibility direction

Name how present producers and consumers should respond to added, removed, or unknown content before choosing an open or closed object model. When a dependable closed core still needs additive experimentation, a named extension envelope can preserve that movement. Each `enum` represents an intentionally closed compatibility commitment; vocabularies expected to grow remain descriptive strings with examples.

### Rule: Keep reuse flat and private by default

Descriptively named `$defs` and local JSON Pointers carry document-internal reuse. A named anchor becomes part of the contract only when a relocatable public reference target has a receiving use. When the selected compatibility model closes a concrete object, apply closure after applicable composition so reusable definitions do not create extension traps.

### Rule: Let each representation perform one job

JSON Schema defines structural validity. A family README explains use, authority, versioning, retrieval, and extension. Examples demonstrate profiles and edge distinctions with synthetic or repository-truthful data. JSON-LD joins the family when graph semantics materially serve a receiver; another semantic representation can carry that role when it fits the use more directly.

### Rule: Keep semantic relationships literal

A semantic context or `DefinedTermSet` owns only the terms it actually defines. Page topics and referenced subjects remain mentions or subjects rather than vocabulary members. Fragment identifiers point only to declared nodes or targets; a resource without a declared fragment keeps its resource identifier. Canonical identifiers and retrieval URLs can coexist in one graph while identity, availability, and currentness remain independent.

### Rule: Carry dependency closure

Authored schemas may remain modular when that structure improves ownership and revision. A receiving distribution carries the complete dependency closure or a documented resolver contract. A self-contained distribution fits mirrors and local consumers that benefit from one portable resource. A linked family projection records the dependency boundary without copying or silently normalizing the source contract.

### Rule: Name generated projection modes

An authored schema remains a deliberate contract. A generated schema records its generating source and whether it represents validation input, serialization output, or another named projection. One receiving instance tests the mode that downstream work will actually use.

### Rule: Use one material instance early

At least one real instance exercises a new or newly linked family. The use record names schema path, instance path, validation mechanism, result, evidence limit, and revisit condition. One representative use can settle an initial boundary; broader conformance work follows demonstrated need.

### Rule: Make discovery progressively deeper

The root schema index leads to a family README. The family README leads to the versioned schema, semantic context, and examples. Detailed vocabulary and source-family material remain available at the next layer without crowding first contact.

### Rule: Keep validation breathable

One local command uses the strongest validator posture compatible with the selected dialect and inherited contracts, and names any relaxed inherited-contract path. Validator settings state format behavior and keep default insertion, coercion, and property removal disabled. Selected external examples exercise the active contract. Output stays concise and ephemeral. A recurring operational need can later earn wider automation through a separate decision.

## Scenarios

### Scenario: Two retrieval hosts serve one contract

**Given** a canonical first-party host and a GitHub-backed mirror

**When** branch-specific discovery prefers different routes

**Then** both routes serve the same identity-bearing exact-version contract and dependency closure while preference remains deployment metadata

### Scenario: An adjacent family already owns its schema

**Given** a real schema and instance under another package or repository authority

**When** the root collection needs to make that family discoverable

**Then** a provisional projection links the originals, records divided authority and dependency behavior, and leaves source ownership intact

### Scenario: A useful field remains experimental

**Given** a field whose meaning is useful and still settling

**When** an instance needs to carry it before a core version change

**Then** the field enters a namespaced extension and returns as evidence for a later additive or versioned revision

### Scenario: A page declares a published semantic contract

**Given** a page describes both its subject matter and the schema or context that governs its metadata

**When** the canonical host and current retrieval mirror differ

**Then** canonical identifiers remain identities, the mirror remains a retrieval URL, page topics remain mentions, and only defined vocabulary terms join the context term set

## Completion

The contract is ready for its current use when a cold collaborator can locate the family, distinguish identity from retrieval, identify each authority role, understand dependency closure, read representative examples, and run the one proportional check attached to the material boundary.
