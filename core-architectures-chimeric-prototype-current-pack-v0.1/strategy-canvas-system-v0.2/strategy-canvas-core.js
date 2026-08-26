/* Strategy Canvas shared state engine v0.2.0 — dependency-free and DOM-independent. */
(function exposeStrategyCanvasCore(global) {
  'use strict';

  const SCHEMA_VERSION = 'strategy-canvas/2.0';
  const SERIES = Object.freeze(['current', 'goodEnough', 'desired']);
  const ACTIONS = Object.freeze(['eliminate', 'reduce', 'raise', 'create', 'hold', 'open']);

  const clone = (value) => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, finite(value, min)));
  const roundToStep = (value, step, origin = 0) => origin + Math.round((value - origin) / step) * step;
  const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
  const slugify = (value) => text(value, 'dimension')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'dimension';

  const defaultDimensions = [
    {
      id: 'goal-fidelity',
      label: 'Goal fidelity',
      definition: 'The work continues to carry the stated purpose as it moves through people, tools, and revisions.',
      anchors: {
        low: 'Purpose is implicit or reconstructed locally.',
        middle: 'Purpose appears at selected handoffs.',
        high: 'Purpose, boundaries, and revision conditions travel with the work.'
      },
      scores: { current: 4, goodEnough: 7, desired: 9 },
      consequenceWeight: 5,
      action: 'raise',
      evidenceBasis: 'Review recent handoffs and compare their stated purpose with the originating decision.'
    },
    {
      id: 'evidence-provenance',
      label: 'Evidence provenance',
      definition: 'Claims and decisions carry a visible route back to their supporting material and current standing.',
      anchors: {
        low: 'Evidence is available through individual recollection.',
        middle: 'Key sources are linked for review-sensitive claims.',
        high: 'Source, transformation, confidence, and review standing are inspectable together.'
      },
      scores: { current: 3, goodEnough: 7, desired: 10 },
      consequenceWeight: 5,
      action: 'create',
      evidenceBasis: 'Sample decisions and trace each material claim to its source and interpretation.'
    },
    {
      id: 'decision-legibility',
      label: 'Decision legibility',
      definition: 'Participants can see what is being decided, what remains open, and who carries the next review.',
      anchors: {
        low: 'Decision state lives mainly in conversation.',
        middle: 'Major decisions and owners are captured.',
        high: 'Decisions, alternatives, reasons, open conditions, and next review are visible.'
      },
      scores: { current: 5, goodEnough: 7, desired: 9 },
      consequenceWeight: 4,
      action: 'raise',
      evidenceBasis: 'Ask several participants to describe the current decision and compare the resulting accounts.'
    },
    {
      id: 'participant-reach',
      label: 'Participant reach',
      definition: 'The collaboration gives the people affected by the work meaningful routes to contribute and review.',
      anchors: {
        low: 'A small central group supplies most of the framing.',
        middle: 'Named roles contribute at planned moments.',
        high: 'Affected perspectives can enter, dissent, abstain, and verify at useful moments.'
      },
      scores: { current: 4, goodEnough: 6, desired: 9 },
      consequenceWeight: 4,
      action: 'raise',
      evidenceBasis: 'Map who can shape framing, scoring, review, amendment, and acceptance.'
    },
    {
      id: 'recovery-clarity',
      label: 'Recovery clarity',
      definition: 'A strained outcome has an understandable route toward repair, reconsideration, and renewed review.',
      anchors: {
        low: 'Recovery depends on improvised escalation.',
        middle: 'Common strains have named owners and routes.',
        high: 'Participants can locate the smallest adequate repair path and its receiving surface.'
      },
      scores: { current: 3, goodEnough: 6, desired: 8 },
      consequenceWeight: 5,
      action: 'create',
      evidenceBasis: 'Walk a recent strained outcome backward to the earliest practical revision point.'
    },
    {
      id: 'cross-surface-continuity',
      label: 'Cross-surface continuity',
      definition: 'Meaning remains coherent as the work moves between workshops, documents, code, and AI collaborators.',
      anchors: {
        low: 'Each surface requires substantial context reconstruction.',
        middle: 'Selected artifacts carry reusable context.',
        high: 'Stable identities, decisions, evidence, and open conditions remain portable.'
      },
      scores: { current: 4, goodEnough: 7, desired: 9 },
      consequenceWeight: 4,
      action: 'create',
      evidenceBasis: 'Compare the same decision across its human-facing, machine-readable, and implementation surfaces.'
    }
  ];

  const DEFAULT_STATE = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    meta: {
      id: 'strategy-canvas-collaboration-field',
      title: 'Strategy Canvas',
      subtitle: 'A comparative field for current support, good-enough thresholds, and desired support.',
      decisionObject: 'Shared collaboration support',
      horizon: 'Next responsible phase',
      revision: 1
    },
    method: {
      posture: 'internal-collaboration',
      scoreMeaning: 'Relative level of support available on each locally defined dimension.',
      weightMeaning: 'Consequence weight directs attention in discussion and leaves plotted scores unchanged.'
    },
    scale: {
      min: 0,
      max: 10,
      step: 1,
      lowLabel: 'Emerging support',
      middleLabel: 'Partial or variable support',
      highLabel: 'Consistent, inspectable support'
    },
    dimensions: defaultDimensions,
    view: {
      dimensionOrder: defaultDimensions.map((dimension) => dimension.id),
      selectedDimensionId: defaultDimensions[0].id,
      mode: 'working'
    },
    lifecycle: {
      status: 'working',
      reviewedSnapshot: null,
      reviewedBy: '',
      reviewNote: '',
      reviewedAt: ''
    },
    extensions: {}
  });

  function uniqueDimensionId(label, dimensions, preferredId) {
    const used = new Set(dimensions.map((dimension) => dimension.id));
    const base = slugify(preferredId || label);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  function normalizeDimension(input, index, scale, existing = []) {
    const source = input && typeof input === 'object' ? input : {};
    const fallback = defaultDimensions[index % defaultDimensions.length];
    const label = text(source.label || source.name, `Dimension ${index + 1}`);
    const id = text(source.id, '') || uniqueDimensionId(label, existing);
    const rawScores = source.scores && typeof source.scores === 'object' ? source.scores : {};
    const score = (value, fallbackValue) => {
      const stepped = roundToStep(finite(value, fallbackValue), scale.step, scale.min);
      return clamp(stepped, scale.min, scale.max);
    };
    return {
      id,
      label,
      definition: text(source.definition || source.description, fallback?.definition || ''),
      anchors: {
        low: text(source.anchors?.low, fallback?.anchors.low || ''),
        middle: text(source.anchors?.middle, fallback?.anchors.middle || ''),
        high: text(source.anchors?.high, fallback?.anchors.high || '')
      },
      scores: {
        current: score(rawScores.current ?? source.current_score ?? source.currentScore, fallback?.scores.current ?? scale.min),
        goodEnough: score(rawScores.goodEnough ?? source.good_enough_score ?? source.goodEnoughThreshold, fallback?.scores.goodEnough ?? scale.max),
        desired: score(rawScores.desired ?? source.desired_score ?? source.desiredScore, fallback?.scores.desired ?? scale.max)
      },
      consequenceWeight: Math.round(clamp(source.consequenceWeight ?? source.consequence_weight ?? 3, 0, 5)),
      action: ACTIONS.includes(source.action || source.errc_action) ? (source.action || source.errc_action) : 'open',
      evidenceBasis: text(source.evidenceBasis || source.evidence_basis || source.current_rationale, '')
    };
  }

  function normalizeState(input) {
    const source = input && typeof input === 'object' ? input : {};
    const scaleSource = source.scale || source.score_scale || {};
    const min = clamp(scaleSource.min, 0, 99);
    const maxCandidate = clamp(scaleSource.max ?? DEFAULT_STATE.scale.max, 1, 100);
    const max = maxCandidate > min ? maxCandidate : Math.min(100, min + 1);
    const stepCandidate = finite(scaleSource.step, DEFAULT_STATE.scale.step);
    const scale = {
      min,
      max,
      step: stepCandidate > 0 ? Math.min(10, stepCandidate) : DEFAULT_STATE.scale.step,
      lowLabel: text(scaleSource.lowLabel, DEFAULT_STATE.scale.lowLabel),
      middleLabel: text(scaleSource.middleLabel, DEFAULT_STATE.scale.middleLabel),
      highLabel: text(scaleSource.highLabel, DEFAULT_STATE.scale.highLabel)
    };
    const incomingDimensions = Array.isArray(source.dimensions) && source.dimensions.length
      ? source.dimensions
      : DEFAULT_STATE.dimensions;
    const dimensions = [];
    incomingDimensions.forEach((item, index) => {
      const dimension = normalizeDimension(item, index, scale, dimensions);
      if (dimensions.some((candidate) => candidate.id === dimension.id)) {
        dimension.id = uniqueDimensionId(dimension.label, dimensions, dimension.id);
      }
      dimensions.push(dimension);
    });
    const ids = dimensions.map((dimension) => dimension.id);
    const incomingOrder = Array.isArray(source.view?.dimensionOrder)
      ? source.view.dimensionOrder.filter((id, index, order) => ids.includes(id) && order.indexOf(id) === index)
      : [];
    ids.forEach((id) => { if (!incomingOrder.includes(id)) incomingOrder.push(id); });
    const selectedCandidate = text(source.view?.selectedDimensionId, '');
    const metaSource = source.meta || source.artifact_identity || {};
    const methodSource = source.method || {};
    const lifecycleSource = source.lifecycle || {};
    const incomingExtensions = source.extensions && typeof source.extensions === 'object' ? source.extensions : {};
    const legacyCollaboration = incomingExtensions.collaboration || source.collaboration;
    const legacyAiCollaboration = incomingExtensions.aiCollaboration || source.aiCollaboration;
    const extensionSource = { ...incomingExtensions };
    delete extensionSource.collaboration;
    delete extensionSource.aiCollaboration;
    if (!extensionSource.contextCanvas && (legacyCollaboration || legacyAiCollaboration)) {
      extensionSource.contextCanvas = {
        collaboration: legacyCollaboration || { participants: [], rounds: [], ballots: [], aggregates: [], notes: [], scenarios: [] },
        aiCollaboration: legacyAiCollaboration || {
          networkPolicy: 'local-only',
          consent: { status: 'open', scope: [], reviewedRevision: null },
          proposals: [],
          shadowRounds: []
        }
      };
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        id: slugify(text(metaSource.id, DEFAULT_STATE.meta.id)),
        title: text(metaSource.title || metaSource.display_name, DEFAULT_STATE.meta.title),
        subtitle: text(metaSource.subtitle, DEFAULT_STATE.meta.subtitle),
        decisionObject: text(metaSource.decisionObject, DEFAULT_STATE.meta.decisionObject),
        horizon: text(metaSource.horizon, DEFAULT_STATE.meta.horizon),
        revision: Math.max(1, Math.floor(finite(metaSource.revision, 1)))
      },
      method: {
        posture: ['internal-collaboration', 'market-strategy'].includes(methodSource.posture)
          ? methodSource.posture
          : DEFAULT_STATE.method.posture,
        scoreMeaning: text(methodSource.scoreMeaning, DEFAULT_STATE.method.scoreMeaning),
        weightMeaning: text(methodSource.weightMeaning, DEFAULT_STATE.method.weightMeaning)
      },
      scale,
      dimensions,
      view: {
        dimensionOrder: incomingOrder,
        selectedDimensionId: ids.includes(selectedCandidate) ? selectedCandidate : ids[0],
        mode: source.view?.mode === 'presentation' ? 'presentation' : 'working'
      },
      lifecycle: {
        status: lifecycleSource.status === 'reviewed' ? 'reviewed' : 'working',
        reviewedSnapshot: lifecycleSource.reviewedSnapshot && typeof lifecycleSource.reviewedSnapshot === 'object'
          ? lifecycleSource.reviewedSnapshot
          : null,
        reviewedBy: text(lifecycleSource.reviewedBy, ''),
        reviewNote: text(lifecycleSource.reviewNote, ''),
        reviewedAt: text(lifecycleSource.reviewedAt, '')
      },
      extensions: clone(extensionSource)
    };
  }

  function migrateV1(input) {
    const source = input && typeof input === 'object' ? input : {};
    if (source.schemaVersion === SCHEMA_VERSION) return normalizeState(source);
    const dimensions = source.strategy_canvas?.dimensions || source.dimensions || [];
    const activeView = source.view_state?.views?.find((view) => view.id === source.view_state?.active_view_id)
      || source.view_state?.views?.[0]
      || source.view_state
      || {};
    return normalizeState({
      ...source,
      schemaVersion: SCHEMA_VERSION,
      meta: {
        id: source.artifact_identity?.id,
        title: source.artifact_identity?.display_name,
        subtitle: source.artifact_identity?.subtitle,
        revision: 1
      },
      dimensions,
      scale: source.score_scale,
      view: {
        dimensionOrder: activeView.dimension_order || dimensions.map((dimension) => dimension.id),
        selectedDimensionId: activeView.selected_dimension_id,
        mode: 'working'
      },
      lifecycle: { status: 'working', reviewedSnapshot: null },
      extensions: source.extensions || {}
    });
  }

  function validateDomainInvariants(input) {
    const errors = [];
    if (!input || typeof input !== 'object') return { valid: false, errors: ['State must be an object.'] };
    const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
    const idPattern = /^[a-z][a-z0-9-]{0,95}$/;
    const checkKeys = (value, allowed, path) => {
      if (!isObject(value)) {
        errors.push(`${path} must be an object.`);
        return;
      }
      Object.keys(value).forEach((key) => {
        if (!allowed.includes(key)) errors.push(`${path}.${key} is outside the published schema. Place extension data under extensions.<namespace>.`);
      });
    };
    checkKeys(input, ['schemaVersion', 'meta', 'method', 'scale', 'dimensions', 'view', 'lifecycle', 'extensions'], 'state');
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must equal ${SCHEMA_VERSION}.`);
    checkKeys(input.meta, ['id', 'title', 'subtitle', 'decisionObject', 'horizon', 'revision'], 'meta');
    checkKeys(input.method, ['posture', 'scoreMeaning', 'weightMeaning'], 'method');
    checkKeys(input.scale, ['min', 'max', 'step', 'lowLabel', 'middleLabel', 'highLabel'], 'scale');
    checkKeys(input.view, ['dimensionOrder', 'selectedDimensionId', 'mode'], 'view');
    checkKeys(input.lifecycle, ['status', 'reviewedSnapshot', 'reviewedBy', 'reviewNote', 'reviewedAt'], 'lifecycle');
    if (!idPattern.test(input.meta?.id || '')) errors.push('meta.id must be a lowercase, hyphenated stable ID.');
    if (!text(input.meta?.title)) errors.push('meta.title is required.');
    if (!Number.isInteger(input.meta?.revision) || input.meta.revision < 1) errors.push('meta.revision must be an integer of at least 1.');
    if (!['internal-collaboration', 'market-strategy'].includes(input.method?.posture)) errors.push('method.posture must use a published posture.');
    const scale = input.scale || {};
    if (!Number.isFinite(scale.min) || !Number.isFinite(scale.max) || scale.min < 0 || scale.max > 100 || scale.max <= scale.min) {
      errors.push('scale must declare finite bounds from 0 through 100 with max greater than min.');
    }
    if (!Number.isFinite(scale.step) || scale.step <= 0 || scale.step > 10) errors.push('scale.step must be greater than 0 and at most 10.');
    if (Number.isFinite(scale.min) && Number.isFinite(scale.max) && Number.isFinite(scale.step) && scale.step > 0) {
      const intervals = (scale.max - scale.min) / scale.step;
      if (Math.abs(intervals - Math.round(intervals)) > 1e-8) errors.push('scale.step must divide the declared scale range into complete intervals.');
    }
    if (!Array.isArray(input.dimensions) || input.dimensions.length === 0 || input.dimensions.length > 24) {
      errors.push('dimensions must contain between 1 and 24 entries.');
    }
    const ids = new Set();
    (input.dimensions || []).forEach((dimension, index) => {
      const path = `dimensions[${index}]`;
      checkKeys(dimension, ['id', 'label', 'definition', 'anchors', 'scores', 'consequenceWeight', 'action', 'evidenceBasis'], path);
      checkKeys(dimension?.anchors, ['low', 'middle', 'high'], `${path}.anchors`);
      checkKeys(dimension?.scores, SERIES, `${path}.scores`);
      if (!idPattern.test(dimension?.id || '')) errors.push(`${path}.id must be a lowercase, hyphenated stable ID.`);
      if (ids.has(dimension?.id)) errors.push(`${path}.id must be unique.`);
      ids.add(dimension?.id);
      if (!dimension?.label) errors.push(`${path}.label is required.`);
      if (!dimension?.definition) errors.push(`${path}.definition is required.`);
      ['low', 'middle', 'high'].forEach((anchor) => {
        if (!text(dimension?.anchors?.[anchor])) errors.push(`${path}.anchors.${anchor} is required.`);
      });
      SERIES.forEach((series) => {
        const value = dimension?.scores?.[series];
        if (!Number.isFinite(value)) errors.push(`${path}.scores.${series} must be a number.`);
        if (Number.isFinite(value) && (value < scale.min || value > scale.max)) {
          errors.push(`${path}.scores.${series} must be within the declared scale.`);
        }
        if (Number.isFinite(value) && Number.isFinite(scale.step) && scale.step > 0) {
          const units = (value - scale.min) / scale.step;
          if (Math.abs(units - Math.round(units)) > 1e-8) errors.push(`${path}.scores.${series} must align with scale.step.`);
        }
      });
      if (!Number.isInteger(dimension?.consequenceWeight) || dimension.consequenceWeight < 0 || dimension.consequenceWeight > 5) {
        errors.push(`${path}.consequenceWeight must be an integer from 0 through 5.`);
      }
      if (!ACTIONS.includes(dimension?.action)) errors.push(`${path}.action must use a published action.`);
    });

    const order = input.view?.dimensionOrder;
    if (!Array.isArray(order)) errors.push('view.dimensionOrder must be an array.');
    else {
      const orderSet = new Set(order);
      if (orderSet.size !== order.length) errors.push('view.dimensionOrder must contain unique IDs.');
      order.forEach((id) => { if (!ids.has(id)) errors.push(`view.dimensionOrder references unknown dimension ${id}.`); });
      ids.forEach((id) => { if (!orderSet.has(id)) errors.push(`view.dimensionOrder must include dimension ${id}.`); });
    }
    if (!ids.has(input.view?.selectedDimensionId)) errors.push('view.selectedDimensionId must reference a dimension.');
    if (!['working', 'presentation'].includes(input.view?.mode)) errors.push('view.mode must be working or presentation.');
    if (!['working', 'reviewed'].includes(input.lifecycle?.status)) errors.push('lifecycle.status must be working or reviewed.');
    if (input.lifecycle?.status === 'reviewed' && !isObject(input.lifecycle.reviewedSnapshot)) {
      errors.push('A reviewed lifecycle requires reviewedSnapshot.');
    }
    if (!isObject(input.extensions)) errors.push('extensions must be an object.');

    const context = input.extensions?.contextCanvas;
    if (context !== undefined) {
      checkKeys(context, ['collaboration', 'aiCollaboration'], 'extensions.contextCanvas');
      const collaboration = context?.collaboration;
      const ai = context?.aiCollaboration;
      checkKeys(collaboration, ['session', 'participants', 'rounds', 'ballots', 'scenarios', 'acceptedScenario', 'notes', 'reviewedSnapshots', 'events'], 'extensions.contextCanvas.collaboration');
      checkKeys(collaboration?.session, ['phase', 'decisionReceipt', 'includeReviewedStateInAI'], 'extensions.contextCanvas.collaboration.session');
      checkKeys(ai, ['promptPreparedAt', 'posture', 'proposals', 'proposalNote', 'standing', 'networkPolicy', 'consentScope', 'reviewedRevision', 'shadowRounds'], 'extensions.contextCanvas.aiCollaboration');
      const participantIds = new Set();
      const roundIds = new Set();
      const scenarioIds = new Set();
      const noteIds = new Set();
      (collaboration?.participants || []).forEach((participant, index) => {
        if (!idPattern.test(participant?.id || '')) errors.push(`participants[${index}].id must be a stable ID.`);
        if (participantIds.has(participant?.id)) errors.push(`participants[${index}].id must be unique.`);
        participantIds.add(participant?.id);
      });
      (collaboration?.rounds || []).forEach((round, index) => {
        if (!idPattern.test(round?.id || '')) errors.push(`rounds[${index}].id must be a stable ID.`);
        if (roundIds.has(round?.id)) errors.push(`rounds[${index}].id must be unique.`);
        roundIds.add(round?.id);
        if (!SERIES.includes(round?.target)) errors.push(`rounds[${index}].target must use a published series.`);
        if (!['collecting', 'revealed'].includes(round?.status)) errors.push(`rounds[${index}].status must be collecting or revealed.`);
        (round?.participantIds || []).forEach((id) => { if (!participantIds.has(id)) errors.push(`rounds[${index}].participantIds references unknown participant ${id}.`); });
      });
      Object.entries(collaboration?.ballots || {}).forEach(([roundId, ledger]) => {
        if (!roundIds.has(roundId)) errors.push(`ballots.${roundId} must reference a round.`);
        Object.entries(ledger || {}).forEach(([participantId, ballot]) => {
          if (!participantIds.has(participantId)) errors.push(`ballots.${roundId}.${participantId} must reference a participant.`);
          if (ballot?.participantId !== participantId) errors.push(`ballots.${roundId}.${participantId}.participantId must match its ledger key.`);
          if (ballot?.channel !== 'human-ballot' || ballot?.status !== 'submitted') errors.push(`ballots.${roundId}.${participantId} must retain submitted human-ballot standing.`);
          Object.entries(ballot?.values || {}).forEach(([id, value]) => {
            if (!ids.has(id)) errors.push(`ballots.${roundId}.${participantId}.values references unknown dimension ${id}.`);
            if (!Number.isFinite(value) || value < scale.min || value > scale.max) errors.push(`ballots.${roundId}.${participantId}.values.${id} must be within the declared scale.`);
          });
        });
      });
      (collaboration?.scenarios || []).forEach((scenario, index) => {
        if (!idPattern.test(scenario?.id || '') || scenarioIds.has(scenario?.id)) errors.push(`scenarios[${index}].id must be a unique stable ID.`);
        scenarioIds.add(scenario?.id);
        if (!SERIES.includes(scenario?.target) || scenario?.status !== 'working') errors.push(`scenarios[${index}] must retain a working target series.`);
        if (!roundIds.has(scenario?.sourceRoundId)) errors.push(`scenarios[${index}].sourceRoundId must reference a round.`);
        Object.keys(scenario?.values || {}).forEach((id) => { if (!ids.has(id)) errors.push(`scenarios[${index}].values references unknown dimension ${id}.`); });
      });
      if (collaboration?.acceptedScenario) {
        if (!scenarioIds.has(collaboration.acceptedScenario.id)) errors.push('acceptedScenario.id must reference a working scenario.');
        if (collaboration.acceptedScenario.standing !== 'facilitated working scenario') errors.push('acceptedScenario must retain facilitated working scenario standing.');
      }
      (collaboration?.rounds || []).forEach((round, index) => {
        if (round?.sourceScenarioId && !scenarioIds.has(round.sourceScenarioId)) errors.push(`rounds[${index}].sourceScenarioId must reference a scenario.`);
        Object.keys(round?.proposalValues || {}).forEach((id) => { if (!ids.has(id)) errors.push(`rounds[${index}].proposalValues references unknown dimension ${id}.`); });
      });
      (collaboration?.notes || []).forEach((note, index) => {
        if (!idPattern.test(note?.id || '') || noteIds.has(note?.id)) errors.push(`notes[${index}].id must be a unique stable ID.`);
        noteIds.add(note?.id);
        if (note?.dimensionId && !ids.has(note.dimensionId)) errors.push(`notes[${index}].dimensionId must reference a dimension.`);
        if (note?.roundId && !roundIds.has(note.roundId)) errors.push(`notes[${index}].roundId must reference a round.`);
        if (!['human-authored note', 'AI-attributed proposal'].includes(note?.standing)) errors.push(`notes[${index}].standing must retain its authored channel.`);
      });
      const reviewedSnapshotIds = new Set();
      (collaboration?.reviewedSnapshots || []).forEach((snapshot, index) => {
        if (reviewedSnapshotIds.has(snapshot?.id)) errors.push(`reviewedSnapshots[${index}].id must be unique.`);
        reviewedSnapshotIds.add(snapshot?.id);
        const historicalDimensionIds = new Set(snapshot?.dimensionIds || []);
        Object.keys(snapshot?.aggregates || {}).forEach((id) => {
          if (!historicalDimensionIds.has(id)) errors.push(`reviewedSnapshots[${index}].aggregates references a dimension outside its historical receipt.`);
        });
        Object.keys(snapshot?.scenario?.values || {}).forEach((id) => {
          if (!historicalDimensionIds.has(id)) errors.push(`reviewedSnapshots[${index}].scenario.values references a dimension outside its historical receipt.`);
        });
      });
      if (ai?.standing !== 'AI-attributed proposal') errors.push('aiCollaboration.standing must remain AI-attributed proposal.');
      if (!['research', 'facilitation', 'loop', 'cross-platform'].includes(ai?.posture)) errors.push('aiCollaboration.posture must use a published posture.');
      if (ai?.networkPolicy !== undefined && ai.networkPolicy !== 'local-only') errors.push('The embedded Context Canvas prototype uses local-only network policy.');
      Object.entries(ai?.proposals || {}).forEach(([id, value]) => {
        if (!ids.has(id)) errors.push(`aiCollaboration.proposals references unknown dimension ${id}.`);
        if (!Number.isFinite(value) || value < scale.min || value > scale.max) errors.push(`aiCollaboration.proposals.${id} must be within the declared scale.`);
      });
      if (collaboration?.session?.includeReviewedStateInAI === false && ai?.reviewedRevision) {
        errors.push('aiCollaboration.reviewedRevision requires session.includeReviewedStateInAI to be true.');
      }
      if (!['orient', 'define', 'vote', 'reveal', 'shape', 'act', 'review', 'handoff'].includes(collaboration?.session?.phase)) {
        errors.push('collaboration.session.phase must use a published workshop phase.');
      }
      if (typeof collaboration?.session?.includeReviewedStateInAI !== 'boolean') errors.push('collaboration.session.includeReviewedStateInAI must be boolean.');
      if (collaboration?.session?.includeReviewedStateInAI === true && (!Array.isArray(ai?.consentScope) || ai.consentScope.length === 0)) {
        errors.push('AI handoff of reviewed state requires an explicit consentScope.');
      }
      if (Array.isArray(ai?.consentScope)) {
        const allowedScope = ['dimensions', 'reviewed-scores', 'aggregates', 'notes', 'evidence-bases', 'scenarios'];
        ai.consentScope.forEach((item) => {
          if (!allowedScope.includes(item)) errors.push(`aiCollaboration.consentScope contains unknown scope ${item}.`);
        });
      }
      (ai?.shadowRounds || []).forEach((shadowRound, index) => {
        if (!roundIds.has(shadowRound?.sourceRoundId)) errors.push(`aiCollaboration.shadowRounds[${index}].sourceRoundId must reference a human round.`);
        if (shadowRound?.standing !== 'AI shadow round' || shadowRound?.includedInHumanAggregate !== false) {
          errors.push(`aiCollaboration.shadowRounds[${index}] must remain an attributed channel outside human aggregates.`);
        }
      });
      (collaboration?.events || []).forEach((event, index) => {
        if (!idPattern.test(event?.id || '')) {
          errors.push(`events[${index}].id must be a stable ID.`);
        }
      });
    }
    return { valid: errors.length === 0, errors };
  }

  function validateState(input) {
    const validator = global.StrategyCanvasSchemaValidator;
    if (!validator?.validate) {
      return {
        valid: false,
        errors: ['The published Strategy Canvas schema validator must load before validation.']
      };
    }
    const schemaResult = validator.validate(input);
    if (!schemaResult.valid) return schemaResult;
    return validateDomainInvariants(input);
  }

  function reviewSnapshot(state) {
    const normalized = normalizeState(state);
    return clone({
      schemaVersion: normalized.schemaVersion,
      meta: normalized.meta,
      method: normalized.method,
      scale: normalized.scale,
      dimensions: normalized.dimensions,
      view: normalized.view,
      extensions: normalized.extensions
    });
  }

  function reducer(state, action) {
    const current = normalizeState(state);
    if (!action || typeof action.type !== 'string') return current;
    const next = clone(current);
    const dimensionIndex = (id) => next.dimensions.findIndex((dimension) => dimension.id === id);
    switch (action.type) {
      case 'META_UPDATE':
        next.meta = { ...next.meta, ...(action.patch || {}) };
        break;
      case 'METHOD_UPDATE':
        next.method = { ...next.method, ...(action.patch || {}) };
        break;
      case 'DIMENSION_ADD': {
        if (next.dimensions.length >= 24) return current;
        const source = action.dimension || {};
        const id = uniqueDimensionId(source.label || 'New dimension', next.dimensions, source.id);
        const dimension = normalizeDimension({
          label: 'New dimension',
          definition: 'Describe the locally meaningful quality or support condition.',
          anchors: { low: 'Emerging support', middle: 'Partial support', high: 'Consistent support' },
          scores: { current: next.scale.min, goodEnough: (next.scale.min + next.scale.max) / 2, desired: next.scale.max },
          consequenceWeight: 3,
          action: 'open',
          evidenceBasis: '',
          ...source,
          id
        }, next.dimensions.length, next.scale, next.dimensions);
        next.dimensions.push(dimension);
        next.view.dimensionOrder.push(id);
        next.view.selectedDimensionId = id;
        break;
      }
      case 'DIMENSION_UPDATE': {
        const index = dimensionIndex(action.id);
        if (index < 0) return current;
        next.dimensions[index] = normalizeDimension({
          ...next.dimensions[index],
          ...(action.patch || {}),
          anchors: { ...next.dimensions[index].anchors, ...(action.patch?.anchors || {}) },
          scores: { ...next.dimensions[index].scores, ...(action.patch?.scores || {}) }
        }, index, next.scale, next.dimensions.filter((_, itemIndex) => itemIndex !== index));
        next.dimensions[index].id = current.dimensions[index].id;
        break;
      }
      case 'DIMENSION_REMOVE': {
        if (next.dimensions.length <= 1) return current;
        const index = dimensionIndex(action.id);
        if (index < 0) return current;
        next.dimensions.splice(index, 1);
        next.view.dimensionOrder = next.view.dimensionOrder.filter((id) => id !== action.id);
        if (next.view.selectedDimensionId === action.id) next.view.selectedDimensionId = next.view.dimensionOrder[0];
        break;
      }
      case 'DIMENSION_MOVE': {
        const from = next.view.dimensionOrder.indexOf(action.id);
        const to = clamp(from + finite(action.delta, 0), 0, next.view.dimensionOrder.length - 1);
        if (from < 0 || from === to) return current;
        next.view.dimensionOrder.splice(from, 1);
        next.view.dimensionOrder.splice(to, 0, action.id);
        break;
      }
      case 'SCORE_SET': {
        const index = dimensionIndex(action.id);
        if (index < 0 || !SERIES.includes(action.series)) return current;
        next.dimensions[index].scores[action.series] = clamp(
          roundToStep(action.value, next.scale.step, next.scale.min), next.scale.min, next.scale.max
        );
        next.view.selectedDimensionId = action.id;
        break;
      }
      case 'VIEW_SELECT':
        if (next.dimensions.some((dimension) => dimension.id === action.id)) next.view.selectedDimensionId = action.id;
        break;
      case 'VIEW_MODE_SET':
        next.view.mode = action.mode === 'presentation' ? 'presentation' : 'working';
        break;
      case 'LIFECYCLE_REVIEW': {
        next.lifecycle = {
          ...next.lifecycle,
          status: 'reviewed',
          reviewedBy: text(action.reviewedBy, ''),
          reviewNote: text(action.reviewNote, ''),
          reviewedAt: text(action.reviewedAt, new Date().toISOString()),
          reviewedSnapshot: reviewSnapshot(current)
        };
        break;
      }
      case 'LIFECYCLE_REOPEN':
        next.meta.revision = Math.max(1, next.meta.revision + 1);
        next.lifecycle.status = 'working';
        break;
      case 'STATE_REPLACE':
        return action.state?.schemaVersion === SCHEMA_VERSION ? normalizeState(action.state) : migrateV1(action.state);
      default:
        return current;
    }
    if (!['VIEW_SELECT', 'VIEW_MODE_SET', 'LIFECYCLE_REVIEW', 'LIFECYCLE_REOPEN'].includes(action.type)) {
      next.lifecycle.status = 'working';
    }
    return normalizeState(next);
  }

  const actions = Object.freeze({
    metaUpdate: (patch) => ({ type: 'META_UPDATE', patch }),
    methodUpdate: (patch) => ({ type: 'METHOD_UPDATE', patch }),
    dimensionAdd: (dimension) => ({ type: 'DIMENSION_ADD', dimension }),
    dimensionUpdate: (id, patch) => ({ type: 'DIMENSION_UPDATE', id, patch }),
    dimensionRemove: (id) => ({ type: 'DIMENSION_REMOVE', id }),
    dimensionMove: (id, delta) => ({ type: 'DIMENSION_MOVE', id, delta }),
    scoreSet: (id, series, value) => ({ type: 'SCORE_SET', id, series, value }),
    viewSelect: (id) => ({ type: 'VIEW_SELECT', id }),
    viewModeSet: (mode) => ({ type: 'VIEW_MODE_SET', mode }),
    lifecycleReview: (reviewedBy, reviewNote, reviewedAt) => ({ type: 'LIFECYCLE_REVIEW', reviewedBy, reviewNote, reviewedAt }),
    lifecycleReopen: () => ({ type: 'LIFECYCLE_REOPEN' }),
    stateReplace: (state) => ({ type: 'STATE_REPLACE', state })
  });

  function createStore(initialState = DEFAULT_STATE, options = {}) {
    let state = initialState?.schemaVersion === SCHEMA_VERSION ? normalizeState(initialState) : migrateV1(initialState);
    let past = [];
    let future = [];
    const listeners = new Set();
    const historyLimit = Math.max(1, finite(options.historyLimit, 60));
    const snapshot = () => clone(state);
    const notify = (action) => listeners.forEach((listener) => listener(snapshot(), action));
    return Object.freeze({
      getState: snapshot,
      dispatch(action) {
        const next = reducer(state, action);
        if (JSON.stringify(next) === JSON.stringify(state)) return snapshot();
        if (action?.meta?.history !== false) {
          past.push(state);
          if (past.length > historyLimit) past.shift();
          future = [];
        }
        state = next;
        notify(action);
        return snapshot();
      },
      subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      undo() {
        if (!past.length) return snapshot();
        future.unshift(state);
        state = past.pop();
        notify({ type: 'HISTORY_UNDO', meta: { history: false } });
        return snapshot();
      },
      redo() {
        if (!future.length) return snapshot();
        past.push(state);
        state = future.shift();
        notify({ type: 'HISTORY_REDO', meta: { history: false } });
        return snapshot();
      },
      canUndo: () => past.length > 0,
      canRedo: () => future.length > 0
    });
  }

  const selectors = Object.freeze({
    orderedDimensions(state) {
      const normalized = normalizeState(state);
      const byId = new Map(normalized.dimensions.map((dimension) => [dimension.id, dimension]));
      return normalized.view.dimensionOrder.map((id) => byId.get(id)).filter(Boolean);
    },
    selectedDimension(state) {
      const normalized = normalizeState(state);
      return normalized.dimensions.find((dimension) => dimension.id === normalized.view.selectedDimensionId)
        || normalized.dimensions[0];
    },
    series(state, series) {
      if (!SERIES.includes(series)) return [];
      return selectors.orderedDimensions(state).map((dimension) => ({ id: dimension.id, label: dimension.label, value: dimension.scores[series] }));
    },
    reviewedSnapshot(state) {
      return normalizeState(state).lifecycle.reviewedSnapshot;
    }
  });

  function aggregate(values) {
    const numeric = values
      .filter((value) => typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (!numeric.length) return { count: 0, mean: null, median: null, min: null, max: null, range: null };
    const middle = Math.floor(numeric.length / 2);
    const median = numeric.length % 2 ? numeric[middle] : (numeric[middle - 1] + numeric[middle]) / 2;
    const mean = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
    return {
      count: numeric.length,
      mean,
      median,
      min: numeric[0],
      max: numeric[numeric.length - 1],
      range: numeric[numeric.length - 1] - numeric[0]
    };
  }

  function serialize(state, spacing = 2) {
    return JSON.stringify(normalizeState(state), null, spacing);
  }

  function toJSONLD(state) {
    const normalized = normalizeState(state);
    return {
      '@context': {
        schema: 'https://schema.org/',
        sc: 'https://schemas.radiantnull.com/core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas.schema.json#',
        name: 'schema:name',
        description: 'schema:description'
      },
      '@type': ['schema:CreativeWork', 'sc:StrategyCanvas'],
      '@id': `#${normalized.meta.id}`,
      name: normalized.meta.title,
      description: normalized.meta.subtitle,
      'sc:schemaVersion': normalized.schemaVersion,
      'sc:revision': normalized.meta.revision,
      'sc:lifecycleStatus': normalized.lifecycle.status,
      'sc:methodPosture': normalized.method.posture,
      'sc:hasDimension': selectors.orderedDimensions(normalized).map((dimension) => ({
        '@type': 'sc:Dimension',
        '@id': `#${dimension.id}`,
        name: dimension.label,
        description: dimension.definition,
        'sc:currentScore': dimension.scores.current,
        'sc:goodEnoughScore': dimension.scores.goodEnough,
        'sc:desiredScore': dimension.scores.desired,
        'sc:consequenceWeight': dimension.consequenceWeight,
        'sc:action': dimension.action,
        'sc:evidenceBasis': dimension.evidenceBasis
      }))
    };
  }

  function promptCapsule(state) {
    const normalized = normalizeState(state);
    const context = normalized.extensions?.contextCanvas;
    const aiChannel = context?.aiCollaboration;
    const includeReviewed = context?.collaboration?.session?.includeReviewedStateInAI === true;
    const aiScope = includeReviewed && Array.isArray(aiChannel?.consentScope) && aiChannel.consentScope.length
      ? `AI handoff scope: ${aiChannel.consentScope.join(', ')}; reviewed revision ${aiChannel.reviewedRevision ?? 'open'}. Network policy: ${aiChannel.networkPolicy || 'local-only'}.`
      : 'AI handoff scope: the receiving collaborator should ask which reviewed fields are in scope before assembling an external packet.';
    const rows = selectors.orderedDimensions(normalized).map((dimension) =>
      `- ${dimension.label}: current ${dimension.scores.current}; good enough ${dimension.scores.goodEnough}; desired ${dimension.scores.desired}; consequence ${dimension.consequenceWeight}/5; action ${dimension.action}. Evidence basis: ${dimension.evidenceBasis || 'open for the next review'}`
    ).join('\n');
    return `Collaborate with this Strategy Canvas as an inspectable working revision.\n\nDecision object: ${normalized.meta.decisionObject}\nHorizon: ${normalized.meta.horizon}\nMethod posture: ${normalized.method.posture}\nScore meaning: ${normalized.method.scoreMeaning}\nConsequence-weight meaning: ${normalized.method.weightMeaning}\n${aiScope}\n\nCarry these distinctions forward:\n- Current describes the present working reading.\n- Good enough describes the threshold for the named horizon.\n- Desired describes the stronger future condition.\n- Consequence weight directs discussion attention and leaves the score geometry unchanged.\n- Human ballots, system-derived aggregates, and AI-attributed proposals retain distinct standing.\n- AI suggestions enter as visibly attributed proposals outside human aggregates.\n\nDimensions:\n${rows}\n\nReturn proposed interpretations with their evidence basis, open conditions, and receiving review surface. Preserve each stable dimension ID.`;
  }

  global.StrategyCanvasCore = Object.freeze({
    version: '0.2.0',
    schemaVersion: SCHEMA_VERSION,
    series: SERIES,
    errcActions: ACTIONS,
    defaultState: clone(DEFAULT_STATE),
    clone,
    clamp,
    slugify,
    normalizeState,
    migrateV1,
    validateState,
    reducer,
    actions,
    selectors,
    aggregate,
    createStore,
    serialize,
    toJSONLD,
    promptCapsule
  });
})(typeof window !== 'undefined' ? window : globalThis);
