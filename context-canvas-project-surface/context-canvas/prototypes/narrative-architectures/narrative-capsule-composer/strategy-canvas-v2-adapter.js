/* Narrative Capsule Composer ↔ Strategy Canvas 2.0 adapter.
   Dependency-free, deterministic, and local-only. */
(function exposeStrategyCanvasNarrativeAdapter(global) {
  'use strict';

  const SCHEMA_VERSION = 'strategy-canvas/2.0';
  const ADAPTER_ID = 'narrative-now-next-later-to-strategy-canvas-2.0';
  const clone = (value) => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };
  const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
  const normalizeText = (value) => text(value)
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  const boundedText = (value, fallback = '', maxLength = 1200) => Array.from(
    normalizeText(value) || normalizeText(fallback)
  ).slice(0, maxLength).join('');
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max, fallback = min) => Math.min(max, Math.max(min, finite(value, fallback)));
  const stepped = (value, min, max, step = 1, fallback = min) => {
    const numeric = finite(value, fallback);
    return clamp(min + Math.round((numeric - min) / step) * step, min, max, fallback);
  };
  const normalizeAction = (value) => ['eliminate', 'reduce', 'raise', 'create', 'hold', 'open'].includes(value)
    ? value
    : 'open';
  const fnv1a32Utf8 = (value) => {
    let hash = 2166136261;
    for (const byte of new TextEncoder().encode(String(value))) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32-utf8:${(hash >>> 0).toString(16).padStart(8, '0')}`;
  };
  const SAFE_ID = /^[a-z][a-z0-9-]{0,95}$/;
  const slugify = (value, fallback = 'narrative-strategy-canvas-projection') => {
    const slug = boundedText(value, fallback, 512)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) return fallback.slice(0, 96).replace(/-+$/g, '');
    const normalized = /^[a-z]/.test(slug) ? slug : `artifact-${slug}`;
    return normalized.slice(0, 96).replace(/-+$/g, '');
  };

  function uniqueDimensionId(value, index, usedIds) {
    const fallback = `narrative-dimension-${index + 1}`;
    const source = text(value);
    let base = SAFE_ID.test(source) ? source : slugify(source, fallback);
    if (!SAFE_ID.test(base)) base = fallback;
    base = base.slice(0, 96).replace(/-+$/g, '') || fallback;
    let candidate = base;
    let sequence = 2;
    while (usedIds.has(candidate)) {
      const suffix = `-${sequence}`;
      candidate = `${base.slice(0, 96 - suffix.length).replace(/-+$/g, '')}${suffix}`;
      sequence += 1;
    }
    usedIds.add(candidate);
    return candidate;
  }

  function detectDialect(input) {
    if (input?.schemaVersion === SCHEMA_VERSION) return SCHEMA_VERSION;
    if (Array.isArray(input?.strategyDimensions)) return 'narrative-composer/0.1';
    if (Array.isArray(input?.strategy_canvas?.dimensions)) return 'narrative-projection/0.1';
    return 'unknown';
  }

  function dimensionsFromComposer(input) {
    const source = Array.isArray(input?.strategyDimensions)
      ? input.strategyDimensions
      : Array.isArray(input?.strategy_canvas?.dimensions)
        ? input.strategy_canvas.dimensions
        : [];
    const usedIds = new Set();
    return source.slice(0, 24).map((entry, index) => {
      const dimension = entry && typeof entry === 'object' ? entry : {};
      return {
      id: uniqueDimensionId(dimension.id, index, usedIds),
      label: boundedText(dimension.label || dimension.name, `Dimension ${index + 1}`, 120),
      definition: boundedText(
        dimension.definition,
        'Target-local comparison dimension. Review its definition and anchors before a participant round.',
        900
      ),
      anchors: {
        low: boundedText(dimension.anchors?.low, 'Low relative support under the locally reviewed definition.', 600),
        middle: boundedText(dimension.anchors?.middle, 'Partial or variable relative support under the locally reviewed definition.', 600),
        high: boundedText(dimension.anchors?.high, 'High relative support under the locally reviewed definition.', 600)
      },
      scores: {
        current: stepped(dimension.now ?? dimension.scores?.current, 0, 10, 1, 0),
        goodEnough: stepped(dimension.next ?? dimension.scores?.goodEnough, 0, 10, 1, 5),
        desired: stepped(dimension.later ?? dimension.scores?.desired, 0, 10, 1, 8)
      },
      consequenceWeight: stepped(dimension.consequenceWeight ?? dimension.consequence_weight, 0, 5, 1, 3),
      action: normalizeAction(dimension.action),
      evidenceBasis: boundedText(
        dimension.evidenceBasis || dimension.evidence_basis,
        `Origin: ${boundedText(dimension.origin, 'target_local_provisional', 96)}. Attach evidence before consequential review.`,
        1200
      )
      };
    });
  }

  function toStrategyCanvasV2(input) {
    const source = input && typeof input === 'object' ? input : {};
    const dimensions = dimensionsFromComposer(source);
    const capsule = source.capsuleEnvelope || source.capsule_envelope || {};
    const artifact = source.artifactIdentity || source.artifact_identity || {};
    const sourceDialect = detectDialect(source);
    const result = {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        id: slugify(capsule.capsuleId || artifact.id),
        title: boundedText(capsule.displayName || artifact.displayName || artifact.display_name, 'Narrative Strategy Canvas projection', 160),
        subtitle: 'NOW / NEXT / LATER projection with an explicit Strategy Canvas 2.0 mapping receipt.',
        decisionObject: boundedText(capsule.contractNodeRef, 'Target-specific landing decision', 240),
        horizon: boundedText(capsule.reentryPoint, 'Review dimensions and anchors before participant elicitation.', 160),
        revision: 1
      },
      method: {
        posture: 'internal-collaboration',
        scoreMeaning: 'NOW maps to current, NEXT maps to good-enough, and LATER maps to desired through the named Narrative adapter.',
        weightMeaning: 'Consequence weight directs attention and leaves plotted scores unchanged.'
      },
      scale: {
        min: 0,
        max: 10,
        step: 1,
        lowLabel: 'Low relative support',
        middleLabel: 'Partial or variable support',
        highLabel: 'High relative support'
      },
      dimensions: dimensions.length ? dimensions : [{
        id: 'open-dimension',
        label: 'Open dimension',
        definition: 'Define the comparison dimension before participant elicitation.',
        anchors: {
          low: 'Low relative support.',
          middle: 'Partial or variable support.',
          high: 'High relative support.'
        },
        scores: { current: 0, goodEnough: 5, desired: 8 },
        consequenceWeight: 3,
        action: 'open',
        evidenceBasis: 'Evidence standing is open.'
      }],
      view: {
        dimensionOrder: dimensions.map((dimension) => dimension.id),
        selectedDimensionId: dimensions[0]?.id || 'open-dimension',
        mode: 'working'
      },
      lifecycle: {
        status: 'working',
        reviewedSnapshot: null,
        reviewedBy: '',
        reviewNote: 'Review the adapter receipt, definitions, anchors, and evidence basis before opening a human round.',
        reviewedAt: ''
      },
      extensions: {
        narrativeProjection: {
          adapterId: ADAPTER_ID,
          sourceDialect,
          sourceCapsuleId: text(capsule.capsuleId),
          sourceCapsuleVersion: text(capsule.capsuleVersion),
          sourceContractRef: text(capsule.currentContractRef),
          mapping: {
            now: 'dimensions[].scores.current',
            next: 'dimensions[].scores.goodEnough',
            later: 'dimensions[].scores.desired',
            action: 'dimensions[].action'
          },
          provisionalFields: [
            'dimensions[].definition',
            'dimensions[].anchors',
            'dimensions[].scores',
            'dimensions[].evidenceBasis'
          ],
          reviewCondition: 'A human reviewer confirms dimension meaning, anchors, evidence standing, and decision horizon before a participant round.',
          migrationReceipt: {
            adapterId: ADAPTER_ID,
            sourceDialect,
            targetDialect: SCHEMA_VERSION,
            mappedFields: ['id', 'label', 'now→current', 'next→goodEnough', 'later→desired', 'action'],
            synthesizedFields: ['definition', 'anchors', 'consequenceWeight', 'evidenceBasis'],
            preservedExtensions: ['narrativeProjection', 'contextCanvas'],
            reviewRequired: true
          }
        },
        contextCanvas: {
          collaboration: {
            session: {
              phase: 'orient',
              decisionReceipt: 'Review the Narrative adapter receipt, dimension definitions, anchors, evidence, and horizon before opening the first human round.',
              includeReviewedStateInAI: false
            },
            participants: [],
            rounds: [],
            ballots: {},
            scenarios: [],
            acceptedScenario: null,
            notes: [],
            reviewedSnapshots: [],
            events: []
          },
          aiCollaboration: {
            promptPreparedAt: null,
            posture: 'cross-platform',
            proposals: {},
            proposalNote: '',
            standing: 'AI-attributed proposal',
            networkPolicy: 'local-only',
            consentScope: [],
            reviewedRevision: null
          }
        }
      }
    };
    const sourceImportReceipt = source.strategyCanvasAdapterReceipt || source.strategy_canvas_adapter_receipt;
    if (sourceImportReceipt?.sourceArtifactIdentity && sourceImportReceipt?.sourceContentHash) {
      result.extensions.narrativeProjection.sourceImportReceipt = clone(sourceImportReceipt);
      result.extensions.narrativeProjection.upstreamStrategyCanvasIdentity = clone(sourceImportReceipt.sourceArtifactIdentity);
      result.extensions.narrativeProjection.upstreamStrategyCanvasContentHash = sourceImportReceipt.sourceContentHash;
    }
    if (!result.view.dimensionOrder.length) result.view.dimensionOrder = ['open-dimension'];
    return result;
  }

  function sourceDimensionsInDeclaredOrder(input) {
    const dimensionsById = new Map();
    input.dimensions.forEach((dimension) => {
      if (dimensionsById.has(dimension.id)) {
        throw new Error(`Strategy Canvas 2.0 source contract mismatch: dimension id ${JSON.stringify(dimension.id)} must be unique.`);
      }
      dimensionsById.set(dimension.id, dimension);
    });
    const declaredOrder = input.view.dimensionOrder;
    const completeOrder = declaredOrder.length === input.dimensions.length
      && declaredOrder.every((id) => dimensionsById.has(id));
    if (!completeOrder) {
      throw new Error('Strategy Canvas 2.0 source contract mismatch: $.view.dimensionOrder must name every declared dimension exactly once.');
    }
    if (!dimensionsById.has(input.view.selectedDimensionId)) {
      throw new Error('Strategy Canvas 2.0 source contract mismatch: $.view.selectedDimensionId must name a declared dimension.');
    }
    return declaredOrder.map((id) => dimensionsById.get(id));
  }

  function validateStrategyCanvasV2Source(input) {
    if (input?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(input?.dimensions)) {
      throw new Error('Expected a Strategy Canvas 2.0 artifact.');
    }
    const validator = global.StrategyCanvasSchemaValidator;
    if (!validator?.validate) {
      throw new Error('Load the published Strategy Canvas 2.0 validator before importing this artifact.');
    }
    const result = validator.validate(input);
    if (!result.valid) {
      throw new Error(`Strategy Canvas 2.0 source contract mismatch: ${result.errors[0] || 'review the published artifact fields.'}`);
    }
    if (input.scale.min !== 0 || input.scale.max !== 10 || input.scale.step !== 1) {
      throw new Error(`The current Narrative mapping accepts a Strategy Canvas scale of 0–10 in steps of 1; this artifact declares ${input.scale.min}–${input.scale.max} in steps of ${input.scale.step}.`);
    }
    const orderedDimensions = sourceDimensionsInDeclaredOrder(input);
    for (const dimension of orderedDimensions) {
      for (const series of ['current', 'goodEnough', 'desired']) {
        const score = dimension.scores[series];
        if (score < input.scale.min || score > input.scale.max || Math.abs((score - input.scale.min) / input.scale.step % 1) > 1e-8) {
          throw new Error(`Strategy Canvas 2.0 source contract mismatch: dimension ${JSON.stringify(dimension.id)} score ${series} must follow the declared scale.`);
        }
      }
    }
    return orderedDimensions;
  }

  function fromStrategyCanvasV2(input) {
    const orderedDimensions = validateStrategyCanvasV2Source(input);
    const usedIds = new Set();
    const idMappings = [];
    const sourceDimensions = orderedDimensions.slice(0, 24);
    const dimensions = sourceDimensions.map((entry, index) => {
      const dimension = entry && typeof entry === 'object' ? entry : {};
      const sourceId = text(dimension.id).slice(0, 160);
      const id = uniqueDimensionId(dimension.id, index, usedIds);
      idMappings.push({ sourceId, targetId: id, changed: sourceId !== id });
      return {
        id,
        label: boundedText(dimension.label, `Dimension ${index + 1}`, 120),
        definition: boundedText(dimension.definition, 'Target-local comparison dimension. Review its definition and anchors before a participant round.', 900),
        anchors: {
          low: boundedText(dimension.anchors?.low, 'Low relative support under the locally reviewed definition.', 600),
          middle: boundedText(dimension.anchors?.middle, 'Partial or variable relative support under the locally reviewed definition.', 600),
          high: boundedText(dimension.anchors?.high, 'High relative support under the locally reviewed definition.', 600)
        },
        now: stepped(dimension.scores?.current, 0, 10, 1, 0),
        next: stepped(dimension.scores?.goodEnough, 0, 10, 1, 5),
        later: stepped(dimension.scores?.desired, 0, 10, 1, 8),
        consequenceWeight: stepped(dimension.consequenceWeight, 0, 5, 1, 3),
        action: normalizeAction(dimension.action),
        evidenceBasis: boundedText(dimension.evidenceBasis, '', 1200),
        origin: 'strategy_canvas_2_import'
      };
    });
    return {
      strategyDimensions: dimensions,
      targetLocalValues: {
        currentStateStatus: input.lifecycle?.status === 'reviewed' ? 'reviewed' : 'provisional',
        scoreScale: `${finite(input.scale?.min, 0)}–${finite(input.scale?.max, 10)}`
      },
      adapterReceipt: {
        adapterId: ADAPTER_ID,
        sourceDialect: SCHEMA_VERSION,
        targetDialect: 'narrative-composer/0.1',
        sourceArtifactIdentity: {
          schemaVersion: input.schemaVersion,
          id: input.meta.id,
          revision: input.meta.revision
        },
        sourceContentHash: fnv1a32Utf8(JSON.stringify(input)),
        mappedFields: ['dimensions', 'scale', 'lifecycle.status'],
        idMappings,
        heldInSource: [
          input.extensions?.contextCanvas?.collaboration && 'extensions.contextCanvas.collaboration',
          input.extensions?.contextCanvas?.aiCollaboration && 'extensions.contextCanvas.aiCollaboration'
        ].filter(Boolean),
        reviewRequired: true
      }
    };
  }

  global.StrategyCanvasNarrativeAdapter = Object.freeze({
    SCHEMA_VERSION,
    ADAPTER_ID,
    detectDialect,
    uniqueDimensionId,
    toStrategyCanvasV2,
    fromStrategyCanvasV2
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
