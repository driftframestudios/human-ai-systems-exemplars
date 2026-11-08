// Transform an admitted plan without publishing it. The command owner validates
// the complete result and accepts this removal and its links as one Undo entry.
export function removeWorkAndReferences(state, workId) {
  const withoutWork = ids => ids.filter(id => id !== workId);
  const pruneSupport = rows => rows.map(row => ({ ...row, workIds: withoutWork(row.workIds) }));
  const pruneCapabilities = rows => rows.map(row => ({ ...row, supportBindings: pruneSupport(row.supportBindings) }));
  const score = state.scoreSettings, cadence = score.cadence;
  const isRemovedWork = endpoint => endpoint.kind === 'work' && endpoint.id === workId;
  const removedHandoffs = new Set(cadence?.handoffs
    .filter(row => isRemovedWork(row.from) || isRemovedWork(row.to)).map(row => row.id) ?? []);
  const isRemovedHandoff = endpoint => endpoint.kind === 'handoff' && removedHandoffs.has(endpoint.id);
  const removedAnchors = new Set(cadence?.decisionAnchors.filter(isRemovedHandoff).map(row => row.gateId) ?? []);
  // A decision can keep its explicit stage when its handoff disappears. A
  // handoff-only decision leaves with that relation; proposed work survives.
  const removedGates = new Set(score.gates
    .filter(row => removedAnchors.has(row.id) && row.afterStageId === null).map(row => row.id));
  const assurance = state.assuranceSettings;
  return {
    ...state,
    work: state.work.filter(row => row.id !== workId),
    contributions: pruneSupport(state.contributions),
    connections: pruneSupport(state.connections),
    abilities: pruneCapabilities(state.abilities),
    practices: pruneCapabilities(state.practices),
    changeSettings: { ...state.changeSettings, frameworkMaps: state.changeSettings.frameworkMaps.map(mapping => ({
      ...mapping, components: pruneSupport(mapping.components),
    })) },
    assuranceSettings: { ...assurance,
      quality: { ...assurance.quality, concepts: pruneSupport(assurance.quality.concepts) },
      recoveryEvents: pruneSupport(assurance.recoveryEvents),
      learningActions: pruneSupport(assurance.learningActions),
      rehearsals: pruneSupport(assurance.rehearsals),
    },
    scoreSettings: { ...score,
      dependencies: score.dependencies.filter(row => row.fromWorkId !== workId && row.toWorkId !== workId),
      stages: pruneSupport(score.stages),
      gates: score.gates.filter(row => !removedGates.has(row.id)),
      proposals: score.proposals.map(row => removedGates.has(row.gateId) ? { ...row, gateId: null } : row),
      cadence: cadence === null ? null : { ...cadence,
        placements: cadence.placements.filter(row => row.workId !== workId),
        handoffs: cadence.handoffs.filter(row => !removedHandoffs.has(row.id)),
        decisionAnchors: cadence.decisionAnchors.filter(row => !isRemovedHandoff(row)),
        delays: cadence.delays.filter(row => !isRemovedWork(row.anchor) && !isRemovedHandoff(row.anchor)),
      },
    },
  };
}
