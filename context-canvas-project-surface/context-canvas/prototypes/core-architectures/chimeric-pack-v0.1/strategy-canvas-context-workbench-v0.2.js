(function strategyCanvasContextWorkbench() {
  'use strict';

  const root = document.getElementById('context-workbench-root');
  const Core = window.StrategyCanvasCore;
  if (!root) return;
  if (!Core) return;

  const fallbackMarkup = root.innerHTML;
  try {

  root.innerHTML = `
    <a class="skip-link" href="#strategy-field">Skip to the collaboration field</a>
    <header class="field-header">
      <div>
        <p class="eyebrow">Collaborative instrument · shared-device field</p>
        <h1>Strategy Canvas collaboration field</h1>
        <p class="lede">Name the dimensions that shape the decision, gather independent readings, reveal the group pattern, and carry a reviewed direction into the next collaboration.</p>
      </div>
      <div class="field-header__status" aria-label="Current session state">
        <span class="signal signal--acid"><span aria-hidden="true"></span><strong id="header-phase">Orient</strong></span>
        <span class="signal"><span aria-hidden="true"></span><strong id="header-round">Current reading</strong></span>
        <span class="signal"><span aria-hidden="true"></span><strong id="header-participants">3 participants</strong></span>
      </div>
    </header>

    <main id="strategy-field" class="workbench" tabindex="-1">
      <nav class="phase-rail" aria-label="Collaboration route">
        <ol>
          <li><a href="#stage-orient" data-phase-link="orient"><span>01</span><strong>Orient</strong><small>Name the decision</small></a></li>
          <li><a href="#stage-define" data-phase-link="define"><span>02</span><strong>Define</strong><small>Anchor dimensions</small></a></li>
          <li><a href="#stage-vote" data-phase-link="vote"><span>03</span><strong>Vote</strong><small>Read independently</small></a></li>
          <li><a href="#stage-reveal" data-phase-link="reveal"><span>04</span><strong>Reveal</strong><small>See range and center</small></a></li>
          <li><a href="#stage-shape" data-phase-link="shape"><span>05</span><strong>Shape</strong><small>Move a scenario</small></a></li>
          <li><a href="#stage-act" data-phase-link="act"><span>06</span><strong>Act</strong><small>Choose strategic moves</small></a></li>
          <li><a href="#stage-review" data-phase-link="review"><span>07</span><strong>Review</strong><small>Make a revision</small></a></li>
          <li><a href="#stage-handoff" data-phase-link="handoff"><span>08</span><strong>Handoff</strong><small>Carry the context</small></a></li>
        </ol>
      </nav>

      <section class="operating-field" aria-label="Strategy Canvas workbench">
        <div class="operating-bar">
          <div class="session-title"><span class="kicker">Working session</span><strong id="session-title-display"></strong><span id="decision-display"></span></div>
          <div class="operating-actions">
            <button type="button" class="button button--quiet" data-action="undo">Undo</button>
            <button type="button" class="button button--quiet" data-action="redo">Redo</button>
            <button type="button" class="button button--ink" data-action="presentation" aria-pressed="false">Presentation mode</button>
          </div>
        </div>

        <div class="workbench-grid">
          <aside class="stage-column" aria-label="Current collaboration step">
            <section class="stage-card is-active" id="stage-orient" data-stage="orient" tabindex="-1">
              <p class="stage-number">01 · Orient</p><h2>Name the collaboration</h2>
              <p class="stage-lede">A concise decision object and horizon help every participant read the same field.</p>
              <label class="field-control"><span>Session title</span><input id="session-title-input" type="text" maxlength="160" autocomplete="off" /></label>
              <label class="field-control"><span>Decision this canvas supports</span><textarea id="decision-input" rows="3" maxlength="240"></textarea></label>
              <label class="field-control"><span>Time horizon</span><input id="horizon-input" type="text" maxlength="160" autocomplete="off" /></label>
              <label class="field-control"><span>Canvas posture</span><select id="method-posture"><option value="internal-collaboration">Internal collaboration tuning</option><option value="market-strategy">Market offering comparison</option></select></label>
              <div class="replacement-state"><strong>Shared scale promise</strong><p>Every dimension carries local low, middle, and high anchors. Readings become comparable after the group understands those anchors.</p></div>
              <button type="button" class="button button--primary button--wide" data-go-phase="define">Define the field <span aria-hidden="true">→</span></button>
            </section>

            <section class="stage-card" id="stage-define" data-stage="define" tabindex="-1">
              <p class="stage-number">02 · Define</p><h2>Choose factors that can carry evidence</h2>
              <p class="stage-lede">The factor list is already a strategic finding. Each factor receives local anchors before participants score it.</p>
              <label class="field-control"><span>Dimension starter pack</span><select id="dimension-pack"><option value="collaboration">Human–generative AI workflow</option><option value="general">Product and service</option><option value="enterprise">Enterprise platform</option><option value="research">Research and laboratory</option><option value="education">Education</option><option value="field">Field and manufacturing</option><option value="health">Health and life science</option></select></label>
              <button type="button" class="button button--tiffany button--wide" data-action="preview-pack">Preview selected pack</button>
              <div id="pack-preview" class="pack-preview"></div>
              <div class="selected-dimension-card" id="dimension-editor"></div>
              <div class="inline-actions"><button type="button" class="button button--quiet" data-action="add-dimension">Add dimension</button><button type="button" class="button button--primary" data-go-phase="vote">Prepare participants <span aria-hidden="true">→</span></button></div>
            </section>

            <section class="stage-card" id="stage-vote" data-stage="vote" tabindex="-1">
              <p class="stage-number">03 · Vote</p><h2>Gather independent readings</h2>
              <p class="stage-lede">Each participant receives a private turn. Shared results rest until the facilitator opens the reveal.</p>
              <div id="participant-setup"></div><div id="private-ballot"></div>
              <div class="inline-actions"><button type="button" class="button button--quiet" data-go-phase="define">Refine anchors</button><button type="button" class="button button--primary" data-go-phase="reveal">Open reveal controls <span aria-hidden="true">→</span></button></div>
            </section>

            <section class="stage-card" id="stage-reveal" data-stage="reveal" tabindex="-1">
              <p class="stage-number">04 · Reveal</p><h2>Read center, range, and missingness together</h2>
              <p class="stage-lede">The mean offers one center. Median, range, count, and abstentions keep the group pattern available for interpretation.</p>
              <div id="reveal-controls"></div><div id="aggregate-summary" class="aggregate-summary"></div><div id="ai-shadow-controls"></div>
              <button type="button" class="button button--primary button--wide" data-go-phase="shape">Explore a scenario <span aria-hidden="true">→</span></button>
            </section>

            <section class="stage-card" id="stage-shape" data-stage="shape" tabindex="-1">
              <p class="stage-number">05 · Shape</p><h2>Move a scenario while the group reading stays visible</h2>
              <p class="stage-lede">Large rings carry the working scenario. The revealed group line remains a stable reference.</p>
              <div id="scenario-inspector"></div>
              <div class="choice-stack"><button type="button" class="button button--quiet" data-action="return-scenario-point">Return selected point to group reading</button><button type="button" class="button button--quiet" data-action="return-scenario">Return full curve to group reading</button><button type="button" class="button button--tiffany" data-action="propose-scenario">Open a fresh round from this proposal</button><button type="button" class="button button--primary" data-action="adopt-scenario">Carry scenario into review</button></div>
            </section>

            <section class="stage-card" id="stage-act" data-stage="act" tabindex="-1">
              <p class="stage-number">06 · Act</p><h2>Turn the visible shape into moves</h2>
              <p class="stage-lede">Apply the action lens after the shape is visible. The local Hold and Open extensions keep valued support and inquiry in view.</p>
              <div id="action-editor"></div><div id="action-overview" class="action-overview"></div>
              <button type="button" class="button button--primary button--wide" data-go-phase="review">Review the revision <span aria-hidden="true">→</span></button>
            </section>

            <section class="stage-card" id="stage-review" data-stage="review" tabindex="-1">
              <p class="stage-number">07 · Review</p><h2>Attach evidence, dissent, and a decision receipt</h2>
              <p class="stage-lede">Notes stay attached to dimensions and rounds, so the chart can travel with its reasoning.</p>
              <form id="note-form" class="note-form"><label class="field-control"><span>Note type</span><select id="note-type"><option value="evidence">Evidence</option><option value="observation">Observation</option><option value="assumption">Assumption</option><option value="question">Question</option><option value="dissent">Dissent</option><option value="decision">Decision</option><option value="follow-up">Follow-up</option><option value="ai-proposal">AI proposal</option></select></label><label class="field-control"><span>Author or role</span><input id="note-author" type="text" value="Facilitator" maxlength="120" autocomplete="off" /></label><label class="field-control"><span>Note for <strong id="note-dimension-label">selected dimension</strong></span><textarea id="note-body" rows="3" maxlength="4000" required></textarea></label><button type="submit" class="button button--rose button--wide">Attach note</button></form>
              <div id="note-list" class="note-list"></div>
              <label class="field-control"><span>Decision receipt</span><textarea id="decision-receipt" rows="4" maxlength="4000" placeholder="State the direction, responsibility, evidence needed, and next review point."></textarea></label>
              <button type="button" class="button button--primary button--wide" data-action="review-revision">Mark this revision reviewed</button>
            </section>

            <section class="stage-card" id="stage-handoff" data-stage="handoff" tabindex="-1">
              <p class="stage-number">08 · Handoff</p><h2>Carry enough context for the next collaborator</h2>
              <p class="stage-lede">Choose an output posture. Human readings, derived summaries, scenarios, and AI proposals retain distinct standing.</p>
              <label class="field-control"><span>Collaboration posture</span><select id="prompt-posture"><option value="diagram">Diagram only</option><option value="facilitation">Facilitation brief</option><option value="research">Deep research payload</option><option value="loop">Loop-bearing handoff</option><option value="cross-platform">Cross-platform coordinator</option></select></label>
              <label class="field-control"><span><input id="include-reviewed-state" type="checkbox" /> Include the reviewed state in the AI packet</span></label>
              <div class="choice-stack"><button type="button" class="button button--primary" data-action="assemble-handoff">Assemble current handoff</button><button type="button" class="button button--quiet" data-action="copy-handoff">Copy handoff</button><button type="button" class="button button--quiet" data-action="download-session">Download session JSON</button><button type="button" class="button button--quiet" data-action="print-report">Print collaboration sheet</button></div>
              <pre id="handoff-preview" class="handoff-preview" tabindex="0">Choose a posture and assemble the current handoff.</pre>
            </section>
          </aside>

          <section class="canvas-column" aria-labelledby="canvas-title">
            <div class="canvas-header"><div><p class="kicker">Persistent shared view</p><h2 id="canvas-title">Offering profile and group readings</h2></div><div class="canvas-tools"><button type="button" class="icon-button" data-action="previous-dimension" aria-label="Select previous dimension">←</button><span id="dimension-position"></span><button type="button" class="icon-button" data-action="next-dimension" aria-label="Select next dimension">→</button></div></div>
            <div class="legend" aria-label="Profile legend"><span><i class="marker marker--current"></i> Current seed</span><span><i class="marker marker--threshold"></i> Good enough</span><span><i class="marker marker--desired"></i> Desired direction</span><span><i class="marker marker--aggregate"></i> System-derived group reading</span><span><i class="marker marker--scenario"></i> Working scenario</span><span><i class="marker marker--ai"></i> AI-attributed proposal</span></div>
            <div class="chart-scroll" id="chart-scroll" tabindex="0" aria-label="Scrollable Strategy Canvas plot"><svg id="strategy-chart" class="strategy-chart" viewBox="0 0 1180 650" role="group" aria-labelledby="chart-title chart-description"><title id="chart-title">Strategy Canvas profile</title><desc id="chart-description">Dimensions on a zero-to-ten offering scale with separate human, system-derived, scenario, and AI proposal channels.</desc></svg></div>
            <div id="chart-state-message" class="chart-state-message"></div><div id="dimension-strip" class="dimension-strip" aria-label="Choose a dimension"></div>
            <details class="data-table-disclosure"><summary>Read the complete table</summary><div class="table-scroll" id="semantic-table"></div></details>
            <details class="state-inspector"><summary>Inspect the portable state contract</summary><pre id="state-inspector-output" tabindex="0"></pre></details>
          </section>

          <aside class="ledger-column" aria-label="Selected dimension and session ledger">
            <div class="ledger-tabs" role="tablist" aria-label="Collaboration ledgers"><button type="button" role="tab" aria-selected="true" aria-controls="ledger-dimension" id="tab-dimension" data-ledger-tab="dimension">Dimension</button><button type="button" role="tab" aria-selected="false" aria-controls="ledger-round" id="tab-round" data-ledger-tab="round">Round</button><button type="button" role="tab" aria-selected="false" aria-controls="ledger-notes" id="tab-notes" data-ledger-tab="notes">Notes</button><button type="button" role="tab" aria-selected="false" aria-controls="ledger-session" id="tab-session" data-ledger-tab="session">Session</button></div>
            <section class="ledger-panel is-active" id="ledger-dimension" role="tabpanel" aria-labelledby="tab-dimension" data-ledger-panel="dimension"><div id="dimension-ledger"></div></section>
            <section class="ledger-panel" id="ledger-round" role="tabpanel" aria-labelledby="tab-round" data-ledger-panel="round" hidden><div id="round-ledger"></div></section>
            <section class="ledger-panel" id="ledger-notes" role="tabpanel" aria-labelledby="tab-notes" data-ledger-panel="notes" hidden><div id="notes-ledger"></div></section>
            <section class="ledger-panel" id="ledger-session" role="tabpanel" aria-labelledby="tab-session" data-ledger-panel="session" hidden><div id="session-ledger"></div></section>
          </aside>
        </div>
        <section id="print-report" class="print-report" aria-label="Strategy Canvas collaboration report"></section>
      </section>
      <p class="screen-reader-status" id="workbench-status" role="status" aria-live="polite"></p>
    </main>`;

  const phases = ['orient', 'define', 'vote', 'reveal', 'shape', 'act', 'review', 'handoff'];
  const phaseLabels = { orient: 'Orient', define: 'Define', vote: 'Vote', reveal: 'Reveal', shape: 'Shape', act: 'Act', review: 'Review', handoff: 'Handoff' };
  const seriesLabels = { current: 'Current', goodEnough: 'Good enough', desired: 'Desired' };
  const actionLabels = { eliminate: 'Eliminate', reduce: 'Reduce', raise: 'Raise', create: 'Create', hold: 'Hold', open: 'Open' };
  const noteTypes = ['evidence', 'observation', 'assumption', 'question', 'dissent', 'decision', 'follow-up', 'ai-proposal'];

  const dimension = (id, label, definition, low, middle, high, scores, action, evidenceBasis) => ({
    id, label, definition, anchors: { low, middle, high }, scores, consequenceWeight: 4, action, evidenceBasis
  });

  const packs = {
    collaboration: {
      label: 'Human–generative AI workflow',
      dimensions: [
        dimension('goal-fidelity', 'Goal fidelity', 'The work continues to carry the stated purpose as it moves through people, tools, and revisions.', 'Purpose is reconstructed locally.', 'Purpose appears at selected handoffs.', 'Purpose, boundaries, and revision conditions travel with the work.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Compare recent handoffs with the originating decision.'),
        dimension('evidence-provenance', 'Evidence provenance', 'Claims and decisions carry a visible route back to supporting material and current standing.', 'Evidence is available through individual recollection.', 'Key sources appear beside review-sensitive claims.', 'Source, transformation, confidence, and review standing are inspectable together.', { current: 3, goodEnough: 7, desired: 10 }, 'create', 'Trace material claims to source and interpretation.'),
        dimension('decision-legibility', 'Decision legibility', 'Participants can see what is being decided, what remains open, and who carries the next review.', 'Decision state lives mainly in conversation.', 'Major decisions and owners are captured.', 'Decisions, alternatives, reasons, open conditions, and next review are visible.', { current: 5, goodEnough: 7, desired: 9 }, 'raise', 'Ask participants to describe the current decision and compare accounts.'),
        dimension('participant-reach', 'Participant reach', 'Affected perspectives have meaningful routes to contribute, dissent, abstain, and review.', 'A small central group supplies most framing.', 'Named roles contribute at planned moments.', 'Affected perspectives can enter, dissent, abstain, and verify at useful moments.', { current: 4, goodEnough: 6, desired: 9 }, 'raise', 'Map who can shape framing, scoring, amendment, and acceptance.'),
        dimension('recovery-clarity', 'Recovery clarity', 'A strained outcome has an understandable route toward repair and renewed review.', 'Recovery depends on improvised escalation.', 'Common strains have named owners and routes.', 'Participants can locate the smallest adequate repair path and its receiving surface.', { current: 3, goodEnough: 6, desired: 8 }, 'create', 'Walk a strained outcome back to the earliest practical revision point.'),
        dimension('cross-surface-continuity', 'Cross-surface continuity', 'Meaning remains coherent between workshops, documents, code, and generative AI systems.', 'Each surface requires substantial context reconstruction.', 'Selected artifacts carry reusable context.', 'Stable identities, decisions, evidence, and open conditions remain portable.', { current: 4, goodEnough: 7, desired: 9 }, 'create', 'Compare the same decision across human-facing and machine-readable surfaces.')
      ]
    },
    general: {
      label: 'Product and service',
      dimensions: [
        dimension('access', 'Access', 'People can reach the offering through the channels and conditions that matter.', 'Access is narrow or situational.', 'Primary audiences can enter through supported routes.', 'Relevant audiences can enter, continue, and recover across contexts.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Review entry, continuation, and recovery across audience contexts.'),
        dimension('clarity', 'Clarity', 'People can understand the offering, its promise, and the next meaningful action.', 'Meaning depends on explanation.', 'Core purpose and next actions are visible.', 'Purpose, state, consequences, and next actions are readily understood.', { current: 5, goodEnough: 7, desired: 9 }, 'raise', 'Observe interpretation and next-action selection.'),
        dimension('time-to-value', 'Time to value', 'Useful value appears within a timeframe that fits the participant context.', 'Value arrives after substantial setup.', 'First meaningful value arrives in the primary journey.', 'Useful value compounds early and remains visible.', { current: 4, goodEnough: 7, desired: 8 }, 'reduce', 'Measure time to first and repeated meaningful outcomes.'),
        dimension('reliability', 'Reliability', 'The offering behaves consistently across expected conditions.', 'Outcomes vary in common conditions.', 'Primary paths behave consistently.', 'Expected paths, edge conditions, and recovery are dependable.', { current: 5, goodEnough: 8, desired: 9 }, 'raise', 'Sample primary paths and known edge conditions.'),
        dimension('trust', 'Trust', 'People can inspect standing, provenance, commitments, and recourse.', 'Trust rests mainly on assertion.', 'Material commitments and recourse are visible.', 'Claims, commitments, limitations, and recovery remain inspectable.', { current: 3, goodEnough: 7, desired: 9 }, 'create', 'Trace high-consequence claims and recovery routes.'),
        dimension('continuity', 'Continuity', 'The experience carries context across channels, time, and participants.', 'Context restarts at each handoff.', 'Core context travels through planned handoffs.', 'Identity, state, intent, and evidence travel coherently.', { current: 4, goodEnough: 7, desired: 9 }, 'create', 'Follow representative journeys across surfaces.')
      ]
    },
    enterprise: {
      label: 'Enterprise platform',
      dimensions: [
        dimension('interoperability', 'Interoperability', 'Services exchange meaningful data through stable contracts.', 'Integration depends on bespoke translation.', 'Priority systems use governed interfaces.', 'Contracts, meaning, and evolution remain coherent across the ecosystem.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Inventory contract stability and semantic translation.'),
        dimension('authorization', 'Authorization clarity', 'Access decisions are understandable, reviewable, and proportionate.', 'Access accumulates through local exceptions.', 'Primary roles and sensitive paths are governed.', 'Identity, purpose, scope, and review form one inspectable path.', { current: 4, goodEnough: 8, desired: 10 }, 'create', 'Trace representative access grants and reviews.'),
        dimension('observability', 'Observability', 'Teams can understand system state and user impact in time to act.', 'Signals are fragmented.', 'Core journeys and dependencies have useful signals.', 'Technical, user, and decision signals support timely diagnosis.', { current: 5, goodEnough: 7, desired: 9 }, 'raise', 'Run a recent incident through available telemetry.'),
        dimension('maintainability', 'Maintainability', 'The platform can evolve while vital behavior remains protected.', 'Changes require broad context reconstruction.', 'High-consequence behavior has clear boundaries.', 'Boundaries, tests, ownership, and upgrade paths support safe evolution.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Sample change lead time and regression protection.'),
        dimension('portability', 'Portability', 'Work and meaning can move across approved surfaces.', 'Movement requires manual reconstruction.', 'Priority artifacts use transferable formats.', 'Data, semantics, permissions, and provenance remain portable.', { current: 3, goodEnough: 6, desired: 8 }, 'create', 'Move one representative workflow across surfaces.'),
        dimension('recovery', 'Recovery', 'Services and teams can reach a known stable state after strain.', 'Recovery depends on individual expertise.', 'Common failures have practiced routes.', 'State, responsibility, communication, and verification converge quickly.', { current: 4, goodEnough: 8, desired: 9 }, 'raise', 'Review recovery time and decision quality from recent events.')
      ]
    },
    research: {
      label: 'Research and laboratory',
      dimensions: [
        dimension('sample-traceability', 'Sample traceability', 'Samples carry stable identity and transformation history.', 'Identity relies on local convention.', 'Priority samples have consistent lineage.', 'Identity, custody, transformation, and disposition travel together.', { current: 5, goodEnough: 8, desired: 10 }, 'raise', 'Trace representative samples end to end.'),
        dimension('metadata-quality', 'Metadata quality', 'Data arrives with enough context for interpretation and reuse.', 'Meaning depends on the originating team.', 'Core fields and definitions are present.', 'Context, method, uncertainty, and reuse conditions are inspectable.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Attempt reuse with a researcher outside the originating team.'),
        dimension('reproducibility', 'Reproducibility', 'Methods and environments support credible repetition.', 'Key choices remain tacit.', 'Material steps and parameters are captured.', 'Inputs, versions, decisions, and variance support meaningful repetition.', { current: 3, goodEnough: 7, desired: 9 }, 'create', 'Repeat a representative analysis from its retained record.'),
        dimension('instrument-integration', 'Instrument integration', 'Instrument output enters the research record with identity and context.', 'Transfer is mainly manual.', 'Priority instruments have stable ingestion paths.', 'Output, calibration, metadata, and exceptions remain linked.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Follow one instrument run into downstream analysis.'),
        dimension('review-flow', 'Review flow', 'Evidence reaches qualified review with visible standing.', 'Review state depends on coordination memory.', 'Priority findings have named review points.', 'Standing, alternatives, dissent, and acceptance remain visible.', { current: 4, goodEnough: 7, desired: 9 }, 'create', 'Trace a finding through review and amendment.'),
        dimension('reuse-readiness', 'Reuse readiness', 'Outputs can support future questions within declared conditions.', 'Reuse requires author reconstruction.', 'Priority outputs include context and constraints.', 'Meaning, provenance, permissions, and limitations travel with outputs.', { current: 3, goodEnough: 6, desired: 8 }, 'create', 'Test a representative output against a new question.')
      ]
    },
    education: {
      label: 'Education',
      dimensions: [
        dimension('learner-access', 'Learner access', 'Learners can enter and participate across relevant abilities and contexts.', 'Participation relies on a narrow route.', 'Primary materials support common access needs.', 'Materials, pacing, modalities, and recovery support varied learners.', { current: 5, goodEnough: 8, desired: 10 }, 'raise', 'Review a lesson across learner contexts and modalities.'),
        dimension('planning-support', 'Educator planning support', 'Educators can assemble coherent learning experiences with manageable coordination.', 'Planning draws heavily on individual memory.', 'Core requirements and resources are organized.', 'Standards, materials, grouping, assessment, and adaptation remain coherent.', { current: 4, goodEnough: 7, desired: 9 }, 'create', 'Map planning time and coordination for a representative lesson.'),
        dimension('standards-alignment', 'Standards alignment', 'Learning intent and activities carry an inspectable relation to relevant standards.', 'Alignment is inferred after authoring.', 'Primary outcomes have explicit standards links.', 'Intent, activity, evidence, and adaptation share a visible alignment path.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Trace outcomes and evidence to selected standards.'),
        dimension('grouping-support', 'Grouping support', 'Class composition can inform realistic activity structure and quiet coordination.', 'Grouping is improvised during delivery.', 'Group size and constraints influence the plan.', 'Roles, materials, movement, pacing, and transitions adapt coherently.', { current: 3, goodEnough: 6, desired: 8 }, 'create', 'Simulate grouping, materials, and transitions for the named class.'),
        dimension('formative-evidence', 'Formative evidence', 'Learning signals can guide timely adaptation.', 'Evidence appears mainly at completion.', 'Key checks inform the next instructional move.', 'Varied signals support responsive instruction and learner reflection.', { current: 4, goodEnough: 7, desired: 9 }, 'raise', 'Map evidence to the next instructional choice.'),
        dimension('privacy', 'Learner privacy', 'Data use and sharing remain proportionate and understandable.', 'Data movement is difficult to inspect.', 'Sensitive flows have declared purpose and access.', 'Purpose, minimization, access, retention, and recourse remain visible.', { current: 5, goodEnough: 8, desired: 10 }, 'hold', 'Trace representative learner data through the activity.')
      ]
    },
    field: {
      label: 'Field and manufacturing',
      dimensions: [
        dimension('safety', 'Safety support', 'The work surface supports safe choices under field conditions.', 'Safety depends on memory and local expertise.', 'Critical steps and exceptions are visible.', 'Hazards, state, authority, and recovery remain legible in context.', { current: 5, goodEnough: 9, desired: 10 }, 'raise', 'Walk representative tasks and exceptions in the field.'),
        dimension('capture-speed', 'Capture speed', 'Information can be recorded while preserving task flow and quality.', 'Capture competes strongly with the task.', 'Priority observations have efficient routes.', 'Capture, verification, and reuse fit naturally into the work.', { current: 4, goodEnough: 7, desired: 9 }, 'reduce', 'Time representative capture and correction cycles.'),
        dimension('offline-tolerance', 'Offline tolerance', 'Core work continues through expected connectivity variation.', 'Connectivity variation stops the flow.', 'Priority tasks retain a limited offline path.', 'State, conflict resolution, and synchronization remain understandable.', { current: 3, goodEnough: 7, desired: 9 }, 'create', 'Exercise the workflow through planned connectivity changes.'),
        dimension('traceability', 'Work traceability', 'Material, equipment, action, and decision lineage remain inspectable.', 'Traceability relies on separate records.', 'Priority assets and actions have linked identity.', 'Lineage travels from input through outcome and review.', { current: 4, goodEnough: 8, desired: 10 }, 'raise', 'Trace a representative output to material and action history.'),
        dimension('training-burden', 'Training burden', 'The system supports capable action with proportionate learning effort.', 'Expert coaching carries routine work.', 'Common paths have clear support.', 'Learning, practice, exception handling, and refresh remain integrated.', { current: 4, goodEnough: 7, desired: 8 }, 'reduce', 'Observe a new or infrequent participant completing a task.'),
        dimension('repairability', 'Repairability', 'Equipment and workflow strain can reach an appropriate repair path.', 'Repair begins through broad escalation.', 'Common faults have named checks and owners.', 'Diagnosis, parts, authority, workarounds, and verification converge.', { current: 3, goodEnough: 7, desired: 9 }, 'create', 'Walk a recent fault from signal through verified return.')
      ]
    },
    health: {
      label: 'Health and life science',
      dimensions: [
        dimension('identity-fidelity', 'Identity fidelity', 'The correct person, specimen, record, and action remain coherently linked.', 'Identity assurance varies by handoff.', 'High-consequence handoffs use stable checks.', 'Identity and context remain verified across the full path.', { current: 6, goodEnough: 9, desired: 10 }, 'raise', 'Trace representative identity transitions.'),
        dimension('workflow-continuity', 'Workflow continuity', 'Clinical and operational context travels through the care or research path.', 'Context is repeatedly reconstructed.', 'Priority handoffs carry structured context.', 'Intent, state, evidence, and responsibility remain coherent.', { current: 4, goodEnough: 8, desired: 10 }, 'raise', 'Follow representative work across roles and systems.'),
        dimension('validation-visibility', 'Validation visibility', 'Participants can see what has been validated, under which conditions, and by whom.', 'Validation standing requires expert interpretation.', 'Material validation records are linked.', 'Scope, conditions, evidence, exceptions, and review remain inspectable.', { current: 5, goodEnough: 8, desired: 10 }, 'create', 'Sample claims and trace validation standing.'),
        dimension('consent-clarity', 'Consent clarity', 'Consent state and effects are visible at relevant decisions.', 'Consent context appears late or indirectly.', 'Sensitive paths surface current consent state.', 'Purpose, choice, change effects, and review travel with the work.', { current: 4, goodEnough: 8, desired: 10 }, 'create', 'Trace consent state through representative decisions.'),
        dimension('accessibility', 'Accessibility', 'Participants can perceive, understand, and act through relevant abilities and settings.', 'Access depends on accommodation after strain.', 'Primary paths meet defined access needs.', 'Access is integrated across content, interaction, environment, and recovery.', { current: 5, goodEnough: 8, desired: 10 }, 'raise', 'Review representative journeys with affected participants.'),
        dimension('auditability', 'Auditability', 'Material actions and decisions support proportionate reconstruction and review.', 'Reconstruction requires several disconnected records.', 'High-consequence actions have linked records.', 'Identity, purpose, evidence, decision, and revision remain coherently inspectable.', { current: 5, goodEnough: 9, desired: 10 }, 'raise', 'Reconstruct a representative decision from retained evidence.')
      ]
    }
  };

  const nowIso = () => new Date().toISOString();
  const clone = Core.clone;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const clampScore = (value, state = store.getState()) => Core.clamp(Number(value), state.scale.min, state.scale.max);
  const roundValue = (value) => Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  function initialCollaboration() {
    const participants = [1, 2, 3].map((number) => ({ id: `participant-${number}`, alias: `Participant ${number}`, role: 'Participant' }));
    return {
      session: { phase: 'orient', decisionReceipt: '', includeReviewedStateInAI: false },
      participants,
      rounds: [{ id: 'round-1', label: 'Current reading', target: 'current', status: 'collecting', participantIds: participants.map((participant) => participant.id), createdAt: nowIso(), revealedAt: '' }],
      ballots: {},
      scenarios: [],
      acceptedScenario: null,
      notes: [],
      reviewedSnapshots: [],
      events: []
    };
  }

  function initialAICollaboration() {
    return { promptPreparedAt: '', posture: 'research', proposals: {}, proposalNote: '', standing: 'AI-attributed proposal', networkPolicy: 'local-only', consentScope: [], reviewedRevision: null };
  }

  const initial = Core.normalizeState({
    ...Core.defaultState,
    meta: { ...Core.defaultState.meta, title: 'Shared collaboration surface', decisionObject: 'Shape a visible, evidence-ready next state.', horizon: 'Next responsible phase' },
    extensions: { contextCanvas: { collaboration: initialCollaboration(), aiCollaboration: initialAICollaboration() } }
  });
  const store = Core.createStore(initial, { historyLimit: 120 });
  const ui = { ledger: 'dimension', packPreview: '', privateOpen: false, activeParticipantId: '', ballotDraft: {}, pendingRemoveId: '', handoff: '', drag: null };
  const listenerController = new AbortController();
  const signal = listenerController.signal;

  function currentState() { return store.getState(); }
  function collab(state = currentState()) { return state.extensions.contextCanvas.collaboration; }
  function aiCollab(state = currentState()) { return state.extensions.contextCanvas.aiCollaboration; }
  function orderedDimensions(state = currentState()) { return Core.selectors.orderedDimensions(state); }
  function selectedDimension(state = currentState()) { return Core.selectors.selectedDimension(state); }
  function activeRound(state = currentState()) { return collab(state).rounds[collab(state).rounds.length - 1]; }
  function roundBallots(roundId, state = currentState()) { return collab(state).ballots[roundId] || {}; }
  function submittedCount(round, state = currentState()) { return Object.values(roundBallots(round.id, state)).filter((ballot) => ballot.status === 'submitted').length; }
  function definitionLocked(state = currentState()) {
    const collaboration = collab(state);
    return Object.values(collaboration.ballots).some((ledger) => Object.values(ledger || {}).some((ballot) => ballot.status === 'submitted'))
      || collaboration.scenarios.length > 0
      || collaboration.notes.length > 0
      || Object.values(aiCollab(state).proposals).some(Number.isFinite);
  }

  function replaceState(mutator, options = {}) {
    const next = clone(currentState());
    mutator(next, next.extensions.contextCanvas.collaboration, next.extensions.contextCanvas.aiCollaboration);
    if (options.event) next.extensions.contextCanvas.collaboration.events.push({ id: uid('event'), type: options.event, at: nowIso() });
    if (options.reopens !== false && next.lifecycle.status === 'reviewed') {
      next.meta.revision += 1;
      next.lifecycle.status = 'working';
    }
    store.dispatch({ ...Core.actions.stateReplace(next), meta: { history: options.history !== false } });
  }

  function announce(message) {
    const status = document.getElementById('workbench-status');
    if (status) status.textContent = message;
  }

  function dispatch(action, message, options = {}) {
    const state = currentState();
    if (options.reopens !== false && state.lifecycle.status === 'reviewed') {
      const reopened = Core.reducer(state, Core.actions.lifecycleReopen());
      const next = Core.reducer(reopened, action);
      store.dispatch({ ...Core.actions.stateReplace(next), meta: { history: options.history !== false } });
    } else {
      store.dispatch({ ...action, meta: { ...(action.meta || {}), history: options.history !== false } });
    }
    if (message) announce(message);
  }

  function changePhase(phase, focus = true) {
    if (!phases.includes(phase)) return;
    if (phase === 'shape') ensureScenario();
    replaceState((state, collaboration) => { collaboration.session.phase = phase; }, { history: false, reopens: false });
    if (history.replaceState) history.replaceState({ phase }, '', `#stage-${phase}`);
    if (focus) document.getElementById(`stage-${phase}`)?.focus({ preventScroll: true });
  }

  function computeAggregates(round = activeRound(), state = currentState()) {
    if (!round) return {};
    const ballots = roundBallots(round.id, state);
    const result = {};
    orderedDimensions(state).forEach((dim) => {
      const values = round.participantIds.map((participantId) => ballots[participantId]?.values?.[dim.id]).filter(Number.isFinite);
      const aggregate = Core.aggregate(values);
      result[dim.id] = { ...aggregate, missing: Math.max(0, round.participantIds.length - aggregate.count), values };
    });
    return result;
  }

  function aggregateSeed(round = activeRound(), state = currentState()) {
    const aggregates = round?.status === 'revealed' ? computeAggregates(round, state) : {};
    return Object.fromEntries(orderedDimensions(state).map((dim) => [dim.id, Number.isFinite(aggregates[dim.id]?.mean) ? roundValue(aggregates[dim.id].mean) : dim.scores[round?.target || 'current']]));
  }

  function currentScenario(state = currentState()) { return collab(state).scenarios[collab(state).scenarios.length - 1] || null; }

  function ensureScenario() {
    const state = currentState();
    const round = activeRound(state);
    const existing = currentScenario(state);
    if (existing && existing.sourceRoundId === round?.id) return existing;
    const values = aggregateSeed(round, state);
    replaceState((next, collaboration) => {
      collaboration.scenarios.push({ id: uid('scenario'), label: `Working ${seriesLabels[round?.target || 'current'].toLowerCase()} scenario`, target: round?.target || 'current', sourceRoundId: round?.id || '', values, status: 'working', createdAt: nowIso() });
    }, { event: 'SCENARIO_OPENED', reopens: false });
    return currentScenario();
  }

  function aggregateSpreadLabel(aggregate) {
    if (!aggregate || !aggregate.count) return 'Awaiting readings';
    if (aggregate.range <= 1) return 'Closely grouped';
    if (aggregate.range <= 3) return 'Varied';
    return 'Wide spread';
  }

  function linePoints(dimensions, values, xFor, yFor) {
    return dimensions.map((dim, index) => `${xFor(index)},${yFor(values[dim.id])}`).join(' ');
  }

  function chartGeometry(dimensions, width) {
    const plot = { left: 105, right: width - 115, top: 88, bottom: 470 };
    const columnWidth = (plot.right - plot.left) / Math.max(1, dimensions.length);
    const columnBounds = (index) => ({
      left: plot.left + index * columnWidth,
      right: plot.left + (index + 1) * columnWidth
    });
    const xFor = (index) => plot.left + (index + .5) * columnWidth;
    return { plot, columnWidth, columnBounds, xFor };
  }

  function splitLabel(label, limit = 17) {
    const words = String(label).split(/\s+/);
    const lines = [''];
    words.forEach((word) => {
      const current = lines[lines.length - 1];
      if (current && `${current} ${word}`.length > limit && lines.length < 2) lines.push(word);
      else lines[lines.length - 1] = current ? `${current} ${word}` : word;
    });
    return lines;
  }

  function renderChart() {
    const state = currentState();
    const collaboration = collab(state);
    const dimensions = orderedDimensions(state);
    const selected = selectedDimension(state);
    const round = activeRound(state);
    const privateActive = collaboration.session.phase === 'vote' && round?.status === 'collecting';
    const presentation = state.view.mode === 'presentation';
    const width = Math.max(980, dimensions.length * (presentation ? 190 : 150) + 150);
    const height = 650;
    const { plot, columnBounds, xFor } = chartGeometry(dimensions, width);
    const yFor = (value) => plot.bottom - ((clampScore(value, state) - state.scale.min) / (state.scale.max - state.scale.min)) * (plot.bottom - plot.top);
    const seriesValues = (series) => Object.fromEntries(dimensions.map((dim) => [dim.id, dim.scores[series]]));
    const aggregates = round?.status === 'revealed' ? computeAggregates(round, state) : {};
    const aggregateValues = Object.fromEntries(dimensions.map((dim) => [dim.id, aggregates[dim.id]?.mean]));
    const scenario = currentScenario(state);
    const aiValues = aiCollab(state).proposals || {};
    const markerRadius = presentation ? 31 : 22;
    const aggregateRadius = presentation ? 36 : 25;
    const scenarioRadius = presentation ? 39 : 27;
    const hitRadius = presentation ? 50 : 34;
    const svg = document.getElementById('strategy-chart');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.setProperty('--chart-width', `${width}px`);
    document.getElementById('chart-scroll').style.setProperty('--chart-min-width', `${Math.max(820, width)}px`);

    const grid = Array.from({ length: 6 }, (_, index) => {
      const value = state.scale.max - ((state.scale.max - state.scale.min) / 5) * index;
      const y = yFor(value);
      return `<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" class="grid-line ${index === 0 || index === 5 ? 'grid-line--major' : ''}"/><text x="${plot.left - 18}" y="${y + 5}" text-anchor="end" class="value-label">${roundValue(value)}</text>`;
    }).join('');
    const guides = dimensions.map((dim, index) => `<line x1="${xFor(index)}" y1="${plot.top}" x2="${xFor(index)}" y2="${plot.bottom}" class="dimension-guide" data-dimension-guide="${escapeHtml(dim.id)}"/>`).join('');
    const actionBands = dimensions.map((dim, index) => {
      const bounds = columnBounds(index);
      return `<g data-action-band="${escapeHtml(dim.id)}"><rect x="${bounds.left}" y="24" width="${bounds.right - bounds.left}" height="34" fill="${dim.action === 'create' || dim.action === 'raise' ? 'var(--sc-tiffany)' : dim.action === 'eliminate' || dim.action === 'reduce' ? 'var(--sc-rose)' : 'var(--sc-paper-muted)'}" stroke="var(--sc-ink)"/><text x="${xFor(index)}" y="46" text-anchor="middle" class="action-label">${escapeHtml(actionLabels[dim.action] || dim.action)}</text></g>`;
    }).join('');
    const factorLabels = dimensions.map((dim, index) => {
      const lines = splitLabel(dim.label);
      const noteCount = collaboration.notes.filter((note) => note.dimensionId === dim.id).length;
      return `<g data-factor-label="${escapeHtml(dim.id)}" data-select-dimension="${escapeHtml(dim.id)}" tabindex="0" role="button" aria-label="Select ${escapeHtml(dim.label)}"><text x="${xFor(index)}" y="515" text-anchor="middle" class="factor-label">${lines.map((line, lineIndex) => `<tspan x="${xFor(index)}" dy="${lineIndex ? 18 : 0}">${escapeHtml(line)}</tspan>`).join('')}</text><text x="${xFor(index)}" y="${lines.length > 1 ? 558 : 540}" text-anchor="middle" class="factor-label--detail">weight ${dim.consequenceWeight}/5${noteCount ? ` · ${noteCount} note${noteCount === 1 ? '' : 's'}` : ''}</text></g>`;
    }).join('');
    const polyline = (values, className) => `<polyline points="${linePoints(dimensions, values, xFor, yFor)}" class="series-line ${className}"/>`;
    const circlePoints = (values, className, radius, options = {}) => dimensions.map((dim, index) => {
      const value = values[dim.id];
      if (!Number.isFinite(value)) return '';
      const x = xFor(index), y = yFor(value);
      const halo = dim.id === selected.id ? `<circle cx="${x}" cy="${y}" r="${radius + 9}" class="selected-halo"/>` : '';
      if (options.square) return `<g data-select-dimension="${escapeHtml(dim.id)}" tabindex="0" role="button" aria-label="AI-attributed proposal for ${escapeHtml(dim.label)}: ${roundValue(value)}">${halo}<rect x="${x - radius}" y="${y - radius}" width="${radius * 2}" height="${radius * 2}" class="${className}"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="value-label">${roundValue(value)}</text></g>`;
      return `<g data-select-dimension="${escapeHtml(dim.id)}" tabindex="0" role="button" aria-label="${escapeHtml(options.label || '')} ${escapeHtml(dim.label)}: ${roundValue(value)}">${halo}<circle cx="${x}" cy="${y}" r="${radius}" class="${className}"/>${options.showValue ? `<text x="${x}" y="${y + 5}" text-anchor="middle" class="value-label">${roundValue(value)}</text>` : ''}</g>`;
    }).join('');
    const thresholdPoints = dimensions.map((dim, index) => {
      const x = xFor(index), y = yFor(dim.scores.goodEnough), size = markerRadius * .82;
      return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" transform="rotate(45 ${x} ${y})" class="point-threshold" data-select-dimension="${escapeHtml(dim.id)}" tabindex="0" role="button" aria-label="Good enough ${escapeHtml(dim.label)}: ${dim.scores.goodEnough}"/>`;
    }).join('');
    const scenarioHandles = scenario && !privateActive ? dimensions.map((dim, index) => {
      const value = scenario.values[dim.id], x = xFor(index), y = yFor(value);
      return `<g class="scenario-handle" data-scenario-handle="${escapeHtml(dim.id)}" data-select-dimension="${escapeHtml(dim.id)}" transform="translate(${x} ${y})" tabindex="0" role="slider" aria-label="${escapeHtml(dim.label)} working scenario" aria-valuemin="${state.scale.min}" aria-valuemax="${state.scale.max}" aria-valuenow="${roundValue(value)}" aria-valuetext="${roundValue(value)} of ${state.scale.max}"><circle r="${hitRadius}" class="point-hit"/><circle r="${scenarioRadius}" class="point-scenario"/><text y="5" text-anchor="middle" class="value-label">${roundValue(value)}</text></g>`;
    }).join('') : '';

    const seedLayer = privateActive ? '' : `<g class="series-layer seed-layer">${polyline(seriesValues('current'), 'series-line--current')}${polyline(seriesValues('goodEnough'), 'series-line--threshold')}${polyline(seriesValues('desired'), 'series-line--desired')}${circlePoints(seriesValues('current'), 'point-current', markerRadius, { label: 'Current seed' })}${thresholdPoints}${circlePoints(seriesValues('desired'), 'point-desired', markerRadius, { label: 'Desired direction' })}</g>`;
    const aggregateLayer = !privateActive && round?.status === 'revealed' && Object.values(aggregateValues).some(Number.isFinite) ? `<g class="series-layer aggregate-layer">${polyline(aggregateValues, 'series-line--aggregate')}${circlePoints(aggregateValues, 'point-aggregate', aggregateRadius, { label: 'System-derived group reading', showValue: true })}</g>` : '';
    const scenarioLayer = !privateActive && scenario ? `<g class="series-layer scenario-layer">${polyline(scenario.values, 'series-line--scenario')}${scenarioHandles}</g>` : '';
    const aiLayer = !privateActive && Object.values(aiValues).some(Number.isFinite) ? `<g class="series-layer ai-layer">${polyline(aiValues, 'series-line--ai')}${circlePoints(aiValues, 'point-ai', presentation ? 27 : 19, { square: true })}</g>` : '';
    const privateMessage = privateActive ? `<text x="${(plot.left + plot.right) / 2}" y="${(plot.top + plot.bottom) / 2}" text-anchor="middle" class="plot-message">Independent reading in progress</text><text x="${(plot.left + plot.right) / 2}" y="${(plot.top + plot.bottom) / 2 + 28}" text-anchor="middle" class="factor-label--detail">Shared curves return when the facilitator opens the reveal.</text>` : '';
    svg.innerHTML = `<title id="chart-title">Strategy Canvas profile</title><desc id="chart-description">${escapeHtml(dimensions.length)} dimensions on a ${state.scale.min} to ${state.scale.max} scale. Human ballots, system-derived summaries, working scenarios, and AI-attributed proposals retain separate standing.</desc><g>${actionBands}${grid}${guides}<path d="M${plot.left} ${plot.top}V${plot.bottom}H${plot.right}" class="axis-line"/>${seedLayer}${aggregateLayer}${scenarioLayer}${aiLayer}${privateMessage}${factorLabels}<text x="${(plot.left + plot.right) / 2}" y="620" text-anchor="middle" class="factor-label">Dimensions shaping the collaboration</text><text x="24" y="${(plot.top + plot.bottom) / 2}" text-anchor="middle" class="factor-label" transform="rotate(-90 24 ${(plot.top + plot.bottom) / 2})">Relative level of support</text></g>`;

    const message = document.getElementById('chart-state-message');
    if (privateActive) message.innerHTML = `<p><strong>Human ballot channel:</strong> ${ui.privateOpen ? 'the active participant can read anchors and enter values' : 'the independent round is ready for its next private turn'} while shared curves remain concealed.</p>`;
    else if (round?.status === 'revealed') message.innerHTML = `<p><strong>System-derived channel:</strong> ${escapeHtml(seriesLabels[round.target])} round revealed from ${submittedCount(round, state)} submitted reading${submittedCount(round, state) === 1 ? '' : 's'}. ${scenario ? 'The dashed scenario remains independently editable.' : ''}</p>`;
    else message.innerHTML = '<p><strong>Starting field:</strong> current, good-enough, and desired values support orientation while the independent round is prepared.</p>';
  }

  function renderDimensionStrip() {
    const state = currentState();
    const selected = selectedDimension(state);
    const dimensions = orderedDimensions(state);
    const notes = collab(state).notes;
    document.getElementById('dimension-strip').innerHTML = dimensions.map((dim) => {
      const count = notes.filter((note) => note.dimensionId === dim.id).length;
      return `<button type="button" data-select-dimension="${escapeHtml(dim.id)}" aria-current="${dim.id === selected.id}">${escapeHtml(dim.label)}${count ? `<span class="note-count" aria-label="${count} notes">${count}</span>` : ''}</button>`;
    }).join('');
    const index = dimensions.findIndex((dim) => dim.id === selected.id);
    document.getElementById('dimension-position').textContent = `${index + 1} of ${dimensions.length}`;
  }

  function renderSemanticTable() {
    const state = currentState();
    const round = activeRound(state);
    const aggregates = round?.status === 'revealed' ? computeAggregates(round, state) : {};
    const scenario = currentScenario(state);
    const aiValues = aiCollab(state).proposals;
    document.getElementById('semantic-table').innerHTML = `<table><caption>Strategy Canvas values, anchors, and collaboration channels</caption><thead><tr><th scope="col">Dimension</th><th scope="col">Low anchor</th><th scope="col">Middle anchor</th><th scope="col">High anchor</th><th scope="col">Current</th><th scope="col">Good enough</th><th scope="col">Desired</th><th scope="col">Group mean</th><th scope="col">Median / range / awaiting</th><th scope="col">Scenario</th><th scope="col">AI proposal</th></tr></thead><tbody>${orderedDimensions(state).map((dim) => {
      const agg = aggregates[dim.id];
      return `<tr><th scope="row">${escapeHtml(dim.label)}</th><td>${escapeHtml(dim.anchors.low)}</td><td>${escapeHtml(dim.anchors.middle)}</td><td>${escapeHtml(dim.anchors.high)}</td><td>${dim.scores.current}</td><td>${dim.scores.goodEnough}</td><td>${dim.scores.desired}</td><td>${Number.isFinite(agg?.mean) ? roundValue(agg.mean) : 'Pending reveal'}</td><td>${Number.isFinite(agg?.median) ? `${roundValue(agg.median)} / ${roundValue(agg.range)} / ${agg.missing}` : 'Pending reveal'}</td><td>${Number.isFinite(scenario?.values?.[dim.id]) ? roundValue(scenario.values[dim.id]) : 'Open'}</td><td>${Number.isFinite(aiValues?.[dim.id]) ? roundValue(aiValues[dim.id]) : 'Open'}</td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderDimensionEditor() {
    const state = currentState();
    const dim = selectedDimension(state);
    const pending = ui.pendingRemoveId === dim.id;
    const locked = definitionLocked(state);
    const lockAttribute = locked ? 'disabled' : '';
    document.getElementById('dimension-editor').innerHTML = `<h3>${escapeHtml(dim.label)}</h3>${locked ? '<div class="replacement-state"><strong>Round definition sealed</strong><p>Participant readings now carry these dimensions and anchors. A starter pack can open a fresh field, while Undo restores the current session.</p></div>' : ''}<label class="field-control"><span>Dimension label</span><input data-dimension-field="label" maxlength="120" value="${escapeHtml(dim.label)}" ${lockAttribute} /></label><label class="field-control"><span>Local definition</span><textarea data-dimension-field="definition" rows="3" maxlength="900" ${lockAttribute}>${escapeHtml(dim.definition)}</textarea></label><div class="anchor-stack"><label class="anchor-row"><strong>Low</strong><textarea class="compact-input" rows="2" maxlength="600" data-anchor-field="low" ${lockAttribute}>${escapeHtml(dim.anchors.low)}</textarea></label><label class="anchor-row"><strong>Middle</strong><textarea class="compact-input" rows="2" maxlength="600" data-anchor-field="middle" ${lockAttribute}>${escapeHtml(dim.anchors.middle)}</textarea></label><label class="anchor-row"><strong>High</strong><textarea class="compact-input" rows="2" maxlength="600" data-anchor-field="high" ${lockAttribute}>${escapeHtml(dim.anchors.high)}</textarea></label></div><div class="score-input-grid"><label class="field-control"><span>Current</span><input type="number" min="${state.scale.min}" max="${state.scale.max}" step="${state.scale.step}" data-score-series="current" value="${dim.scores.current}" aria-label="${escapeHtml(dim.label)} current offering level" ${lockAttribute} /></label><label class="field-control"><span>Good enough</span><input type="number" min="${state.scale.min}" max="${state.scale.max}" step="${state.scale.step}" data-score-series="goodEnough" value="${dim.scores.goodEnough}" aria-label="${escapeHtml(dim.label)} good-enough threshold" ${lockAttribute} /></label><label class="field-control"><span>Desired</span><input type="number" min="${state.scale.min}" max="${state.scale.max}" step="${state.scale.step}" data-score-series="desired" value="${dim.scores.desired}" aria-label="${escapeHtml(dim.label)} desired offering level" ${lockAttribute} /></label><label class="field-control"><span>Consequence</span><input type="number" min="0" max="5" step="1" data-dimension-field="consequenceWeight" value="${dim.consequenceWeight}" aria-label="${escapeHtml(dim.label)} consequence weight" ${lockAttribute} /></label></div><label class="field-control"><span>Evidence basis</span><textarea rows="3" maxlength="1200" data-dimension-field="evidenceBasis" ${lockAttribute}>${escapeHtml(dim.evidenceBasis)}</textarea></label><div class="inline-actions"><button type="button" class="button button--quiet" data-action="move-dimension-left" ${lockAttribute}>Move earlier</button><button type="button" class="button button--quiet" data-action="move-dimension-right" ${lockAttribute}>Move later</button><button type="button" class="button ${pending ? 'button--rose' : 'button--quiet'}" data-action="remove-dimension" ${lockAttribute}>${pending ? 'Remove this dimension' : 'Prepare removal'}</button></div>`;
    root.querySelector('[data-action="add-dimension"]').disabled = locked;
  }

  function renderPackPreview() {
    const container = document.getElementById('pack-preview');
    if (!ui.packPreview || !packs[ui.packPreview]) {
      container.innerHTML = '<p>Preview a starter pack, then keep, rename, remove, or extend its dimensions.</p>';
      return;
    }
    const pack = packs[ui.packPreview];
    container.innerHTML = `<strong>${escapeHtml(pack.label)}</strong><p>${pack.dimensions.map((dim) => escapeHtml(dim.label)).join(' · ')}</p><button type="button" class="button button--acid button--wide" data-action="use-pack" data-pack="${escapeHtml(ui.packPreview)}">Use this pack</button><p class="small">Undo restores the current field after a pack change.</p>`;
  }

  function renderParticipantSetup() {
    const state = currentState();
    const collaboration = collab(state);
    const round = activeRound(state);
    const ballots = roundBallots(round.id, state);
    const locked = submittedCount(round, state) > 0;
    document.getElementById('participant-setup').innerHTML = `<label class="field-control"><span>Reading series</span><select id="round-target" ${locked ? 'disabled' : ''}>${Object.entries(seriesLabels).map(([value, label]) => `<option value="${value}" ${round.target === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label><div class="participant-list">${collaboration.participants.map((participant) => `<label class="participant-row"><span><span class="visually-hidden">Participant alias</span><input class="compact-input" data-participant-alias="${escapeHtml(participant.id)}" value="${escapeHtml(participant.alias)}" maxlength="96" ${locked ? 'readonly' : ''} /></span><span class="participant-state ${ballots[participant.id]?.status === 'submitted' ? 'participant-state--submitted' : ''}">${ballots[participant.id]?.status === 'submitted' ? 'sealed' : 'ready'}</span></label>`).join('')}</div><div class="inline-actions"><button type="button" class="button button--quiet" data-action="add-participant" ${locked ? 'disabled' : ''}>Add participant</button><span class="status-chip">${submittedCount(round, state)} / ${round.participantIds.length} sealed</span></div>`;

    const privatePanel = document.getElementById('private-ballot');
    const pending = collaboration.participants.filter((participant) => ballots[participant.id]?.status !== 'submitted');
    if (ui.privateOpen) {
      const participant = collaboration.participants.find((item) => item.id === ui.activeParticipantId);
      privatePanel.innerHTML = `<div class="privacy-curtain"><strong>Private turn · ${escapeHtml(participant?.alias || 'Participant')}</strong><p>Read each local anchor, enter a value from ${state.scale.min} to ${state.scale.max}, and leave a field blank to record an abstention.</p></div><form id="ballot-form" class="vote-list">${orderedDimensions(state).map((dim) => `<div class="vote-row"><label for="ballot-${escapeHtml(dim.id)}">${escapeHtml(dim.label)}<small>${escapeHtml(dim.anchors.low)} ↔ ${escapeHtml(dim.anchors.high)}</small></label><input class="compact-input" id="ballot-${escapeHtml(dim.id)}" name="${escapeHtml(dim.id)}" type="number" min="${state.scale.min}" max="${state.scale.max}" step="${state.scale.step}" inputmode="decimal" value="${Number.isFinite(ui.ballotDraft[dim.id]) ? ui.ballotDraft[dim.id] : ''}" /></div>`).join('')}<button type="submit" class="button button--acid button--wide">Seal this reading</button><button type="button" class="button button--quiet button--wide" data-action="close-private-turn">Return to the privacy curtain</button></form>`;
    } else if (pending.length) {
      privatePanel.innerHTML = `<div class="privacy-curtain"><strong>Pass the device for a private turn</strong><p>Shared curves and earlier readings stay concealed during entry.</p><label class="field-control"><span>Next participant</span><select id="next-participant">${pending.map((participant) => `<option value="${escapeHtml(participant.id)}">${escapeHtml(participant.alias)}</option>`).join('')}</select></label><button type="button" class="button button--acid button--wide" data-action="open-private-turn">Begin private reading</button></div>`;
    } else {
      privatePanel.innerHTML = '<div class="replacement-state"><strong>All scheduled readings are sealed</strong><p>The facilitator can move to Reveal and open the system-derived summary.</p></div>';
    }
  }

  function renderReveal() {
    const state = currentState();
    const round = activeRound(state);
    const submitted = submittedCount(round, state);
    const total = round.participantIds.length;
    document.getElementById('reveal-controls').innerHTML = round.status === 'revealed'
      ? `<div class="replacement-state"><strong>${escapeHtml(round.label)} is revealed</strong><p>${submitted} submitted · ${total - submitted} awaiting or abstained at the round level.</p></div>`
      : `<div class="privacy-curtain"><strong>${submitted} of ${total} readings sealed</strong><p>Reveal opens the group summary for every participant at the same moment.</p><button type="button" class="button button--acid button--wide" data-action="reveal-round" ${submitted ? '' : 'disabled'}>Reveal group reading</button></div>`;
    const summary = document.getElementById('aggregate-summary');
    if (round.status !== 'revealed') {
      summary.innerHTML = '<p>Mean, median, range, submitted count, and missingness appear after reveal.</p>';
    } else {
      const aggregates = computeAggregates(round, state);
      summary.innerHTML = orderedDimensions(state).map((dim) => {
        const aggregate = aggregates[dim.id];
        return `<div class="aggregate-row"><strong>${escapeHtml(dim.label)} · ${escapeHtml(aggregateSpreadLabel(aggregate))}</strong><small>Mean ${Number.isFinite(aggregate.mean) ? roundValue(aggregate.mean) : 'open'} · median ${Number.isFinite(aggregate.median) ? roundValue(aggregate.median) : 'open'} · range ${Number.isFinite(aggregate.range) ? roundValue(aggregate.range) : 'open'} · ${aggregate.count} entered · ${aggregate.missing} awaiting or abstained</small></div>`;
      }).join('');
    }
    renderAIShadowControls();
  }

  function renderAIShadowControls() {
    const state = currentState();
    const collaboration = collab(state);
    const round = activeRound(state);
    const shadow = aiCollab(state);
    const proposalCount = Object.values(shadow.proposals || {}).filter(Number.isFinite).length;
    const container = document.getElementById('ai-shadow-controls');
    if (round.status !== 'revealed') {
      container.innerHTML = '<div class="replacement-state"><strong>Human-first sequence</strong><p>The AI shadow channel becomes available after the first reveal, keeping the initial round free from AI anchoring.</p></div>';
      return;
    }
    container.innerHTML = `<div class="selected-dimension-card"><h3>Optional AI shadow round</h3><p class="small">Prepare a portable prompt for a selected generative AI system. Returned suggestions enter as AI-attributed proposals and remain outside every human aggregate.</p><label class="field-control"><span>Shadow posture</span><select id="ai-shadow-posture"><option value="research" ${shadow.posture === 'research' ? 'selected' : ''}>Research payload</option><option value="facilitation" ${shadow.posture === 'facilitation' ? 'selected' : ''}>Facilitation brief</option><option value="loop" ${shadow.posture === 'loop' ? 'selected' : ''}>Loop-bearing handoff</option><option value="cross-platform" ${shadow.posture === 'cross-platform' ? 'selected' : ''}>Cross-platform coordinator</option></select></label><button type="button" class="button button--rose button--wide" data-action="prepare-ai-shadow">Prepare portable shadow prompt</button>${shadow.promptPreparedAt ? `<p class="small"><span class="status-chip">prompt ready</span> ${proposalCount} AI proposal value${proposalCount === 1 ? '' : 's'} entered.</p><label class="field-control"><span>AI proposal for ${escapeHtml(selectedDimension(state).label)}</span><input id="ai-proposal-value" type="number" min="${state.scale.min}" max="${state.scale.max}" step="${state.scale.step}" value="${Number.isFinite(shadow.proposals[selectedDimension(state).id]) ? shadow.proposals[selectedDimension(state).id] : ''}" /></label><label class="field-control"><span>Attribution or proposal note</span><textarea id="ai-proposal-note" rows="2" maxlength="4000">${escapeHtml(shadow.proposalNote || '')}</textarea></label><button type="button" class="button button--quiet button--wide" data-action="record-ai-proposal">Record attributed proposal</button>` : ''}</div>`;
  }

  function renderScenarioInspector() {
    const state = currentState();
    const dim = selectedDimension(state);
    const round = activeRound(state);
    const scenario = currentScenario(state) || { target: round?.target || 'current', values: aggregateSeed(round, state) };
    const aggregate = round?.status === 'revealed' ? computeAggregates(round, state)[dim.id] : null;
    const value = scenario?.values?.[dim.id] ?? dim.scores[scenario?.target || 'current'];
    document.getElementById('scenario-inspector').innerHTML = `<div class="selected-dimension-card"><span class="status-chip">${escapeHtml(seriesLabels[scenario?.target || 'current'])} scenario</span><h3>${escapeHtml(dim.label)}</h3><p class="small">Group mean: <strong>${Number.isFinite(aggregate?.mean) ? roundValue(aggregate.mean) : 'seed value'}</strong>. Working scenario: <strong>${roundValue(value)}</strong>.</p><div class="scenario-value"><button type="button" class="icon-button" data-action="scenario-decrement" aria-label="Decrease ${escapeHtml(dim.label)} scenario">−</button><input class="compact-input" id="scenario-value" type="number" min="${state.scale.min}" max="${state.scale.max}" step="${state.scale.step}" value="${roundValue(value)}" aria-label="${escapeHtml(dim.label)} working scenario"/><button type="button" class="icon-button" data-action="scenario-increment" aria-label="Increase ${escapeHtml(dim.label)} scenario">+</button></div><p class="small">Drag the large dashed ring on the chart, use these controls, or enter a value directly.</p></div>`;
  }

  function renderActions() {
    const state = currentState();
    const dim = selectedDimension(state);
    document.getElementById('action-editor').innerHTML = `<div class="selected-dimension-card"><h3>${escapeHtml(dim.label)}</h3><p class="small">${escapeHtml(dim.definition)}</p><div class="action-grid">${Object.entries(actionLabels).map(([value, label]) => `<button type="button" data-action-value="${value}" aria-pressed="${dim.action === value}">${escapeHtml(label)}</button>`).join('')}</div></div>`;
    const grouped = Object.keys(actionLabels).map((action) => ({ action, dims: orderedDimensions(state).filter((candidate) => candidate.action === action) })).filter((group) => group.dims.length);
    document.getElementById('action-overview').innerHTML = grouped.map((group) => `<div class="action-band"><strong>${escapeHtml(actionLabels[group.action])}</strong><span>${group.dims.map((item) => escapeHtml(item.label)).join(' · ')}</span></div>`).join('');
  }

  function renderNotes() {
    const state = currentState();
    const dim = selectedDimension(state);
    const notes = collab(state).notes.filter((note) => note.dimensionId === dim.id);
    document.getElementById('note-dimension-label').textContent = dim.label;
    document.getElementById('decision-receipt').value = collab(state).session.decisionReceipt || '';
    document.getElementById('note-list').innerHTML = notes.length ? notes.slice().reverse().map((note) => `<article class="note-card"><header><strong>${escapeHtml(note.type)}</strong><span>${escapeHtml(note.author)}</span></header><p>${escapeHtml(note.body)}</p></article>`).join('') : '<p class="small muted">This dimension is ready for its first note.</p>';
  }

  function renderLedgers() {
    const state = currentState();
    const collaboration = collab(state);
    const dim = selectedDimension(state);
    const round = activeRound(state);
    const aggregate = round?.status === 'revealed' ? computeAggregates(round, state)[dim.id] : null;
    const scenario = currentScenario(state);
    const notes = collaboration.notes.filter((note) => note.dimensionId === dim.id);
    document.getElementById('dimension-ledger').innerHTML = `<p class="kicker">Selected dimension</p><h2>${escapeHtml(dim.label)}</h2><p>${escapeHtml(dim.definition)}</p><h3>Local anchors</h3><ul class="ledger-list"><li><strong>Low · ${state.scale.min}</strong>${escapeHtml(dim.anchors.low)}</li><li><strong>Middle · ${(state.scale.min + state.scale.max) / 2}</strong>${escapeHtml(dim.anchors.middle)}</li><li><strong>High · ${state.scale.max}</strong>${escapeHtml(dim.anchors.high)}</li></ul><h3>Channels</h3><div class="metric-grid"><div class="metric"><span>Human entries</span><strong>${aggregate?.count ?? 0}</strong></div><div class="metric"><span>System mean</span><strong>${Number.isFinite(aggregate?.mean) ? roundValue(aggregate.mean) : '—'}</strong></div><div class="metric"><span>Scenario</span><strong>${Number.isFinite(scenario?.values?.[dim.id]) ? roundValue(scenario.values[dim.id]) : '—'}</strong></div><div class="metric"><span>AI proposal</span><strong>${Number.isFinite(aiCollab(state).proposals[dim.id]) ? roundValue(aiCollab(state).proposals[dim.id]) : '—'}</strong></div></div><h3>Evidence basis</h3><p class="small">${escapeHtml(dim.evidenceBasis || 'Ready for a locally meaningful evidence basis.')}</p>`;
    document.getElementById('round-ledger').innerHTML = `<p class="kicker">Round state</p><h2>${escapeHtml(round.label)}</h2><p><span class="status-chip ${round.status === 'revealed' ? 'status-chip--reviewed' : 'status-chip--working'}">${escapeHtml(round.status)}</span></p><div class="metric-grid"><div class="metric"><span>Invited</span><strong>${round.participantIds.length}</strong></div><div class="metric"><span>Sealed</span><strong>${submittedCount(round, state)}</strong></div><div class="metric"><span>Series</span><strong>${escapeHtml(seriesLabels[round.target])}</strong></div><div class="metric"><span>Range</span><strong>${Number.isFinite(aggregate?.range) ? roundValue(aggregate.range) : '—'}</strong></div></div><h3>Standing</h3><ul class="ledger-list"><li><strong>Human ballots</strong>Entered privately and retained unchanged.</li><li><strong>System-derived aggregate</strong>Calculated from submitted human values after explicit reveal.</li><li><strong>AI-attributed proposal</strong>Portable shadow input that stays outside the aggregate.</li></ul>`;
    document.getElementById('notes-ledger').innerHTML = `<p class="kicker">Attached reasoning</p><h2>${notes.length} note${notes.length === 1 ? '' : 's'}</h2><div class="note-list">${notes.length ? notes.slice().reverse().map((note) => `<article class="note-card"><header><strong>${escapeHtml(note.type)}</strong><span>${escapeHtml(note.author)}</span></header><p>${escapeHtml(note.body)}</p></article>`).join('') : '<p class="small">Notes can carry evidence, dissent, assumptions, decisions, and follow-up.</p>'}</div>`;
    const reviewed = collaboration.reviewedSnapshots[collaboration.reviewedSnapshots.length - 1];
    document.getElementById('session-ledger').innerHTML = `<p class="kicker">Collaboration state</p><h2>Revision ${state.meta.revision}</h2><div class="metric-grid"><div class="metric"><span>Human ballots</span><strong>${Object.values(roundBallots(round.id, state)).filter((ballot) => ballot.status === 'submitted').length}</strong></div><div class="metric"><span>System summaries</span><strong>${round.status === 'revealed' ? orderedDimensions(state).length : 0}</strong></div><div class="metric"><span>AI proposals</span><strong>${Object.values(aiCollab(state).proposals).filter(Number.isFinite).length}</strong></div><div class="metric"><span>Notes</span><strong>${collaboration.notes.length}</strong></div></div><h3>Review standing</h3><p><span class="status-chip ${reviewed ? 'status-chip--reviewed' : 'status-chip--working'}">${reviewed ? 'reviewed' : 'working'}</span></p>${reviewed ? `<div class="review-receipt"><strong>${escapeHtml(reviewed.reviewedBy)}</strong><p>${escapeHtml(reviewed.receipt)}</p></div>` : '<p class="small">A decision receipt and reviewed snapshot can close the current revision.</p>'}`;
  }

  function renderHeaderAndStages() {
    const state = currentState();
    const collaboration = collab(state);
    const phase = collaboration.session.phase;
    const round = activeRound(state);
    document.getElementById('header-phase').textContent = phaseLabels[phase];
    document.getElementById('header-round').textContent = round.label;
    document.getElementById('header-participants').textContent = `${collaboration.participants.length} participant${collaboration.participants.length === 1 ? '' : 's'}`;
    document.getElementById('session-title-display').textContent = state.meta.title;
    document.getElementById('decision-display').textContent = state.meta.decisionObject;
    document.getElementById('session-title-input').value = state.meta.title;
    document.getElementById('decision-input').value = state.meta.decisionObject;
    document.getElementById('horizon-input').value = state.meta.horizon;
    document.getElementById('method-posture').value = state.method.posture;
    root.querySelectorAll('[data-phase-link]').forEach((link) => link.setAttribute('aria-current', link.dataset.phaseLink === phase ? 'step' : 'false'));
    root.querySelectorAll('[data-stage]').forEach((panel) => {
      const active = panel.dataset.stage === phase;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
    root.dataset.privateActive = String(phase === 'vote' && round.status === 'collecting');
    root.dataset.reviewStatus = state.lifecycle.status;
    document.body.classList.toggle('is-presenting', state.view.mode === 'presentation');
    const presentationButton = root.querySelector('[data-action="presentation"]');
    presentationButton.setAttribute('aria-pressed', String(state.view.mode === 'presentation'));
    presentationButton.textContent = state.view.mode === 'presentation' ? 'Exit presentation' : 'Presentation mode';
    root.querySelector('[data-action="undo"]').disabled = !store.canUndo();
    root.querySelector('[data-action="redo"]').disabled = !store.canRedo();
  }

  function renderHandoffPreview() {
    const preview = document.getElementById('handoff-preview');
    if (ui.handoff) preview.textContent = ui.handoff;
    document.getElementById('include-reviewed-state').checked = collab().session.includeReviewedStateInAI;
  }

  function channelSnapshot(state = currentState()) {
    const collaboration = collab(state);
    const round = activeRound(state);
    return {
      humanBallots: clone(collaboration.ballots),
      systemDerivedAggregates: round?.status === 'revealed' ? clone(computeAggregates(round, state)) : {},
      workingScenarios: clone(collaboration.scenarios),
      aiAttributedProposals: clone(aiCollab(state).proposals)
    };
  }

  function renderStateInspector() {
    const state = currentState();
    const inspector = document.getElementById('state-inspector-output');
    inspector.textContent = JSON.stringify({
      schemaVersion: state.schemaVersion,
      extensionNamespace: 'extensions.contextCanvas',
      validation: Core.validateState(state),
      lifecycle: state.lifecycle,
      channels: channelSnapshot(state)
    }, null, 2);
  }

  function reviewedReportSource(state) {
    if (state.lifecycle.status !== 'reviewed') return null;
    const snapshot = state.lifecycle.reviewedSnapshot;
    const snapshotContext = snapshot?.extensions?.contextCanvas;
    const snapshotCollaboration = snapshotContext?.collaboration;
    const snapshotAI = snapshotContext?.aiCollaboration;
    const records = snapshotCollaboration?.reviewedSnapshots;
    const record = Array.isArray(records) ? records[records.length - 1] : null;
    const dimensions = Array.isArray(snapshot?.dimensions) ? orderedDimensions(snapshot) : [];
    const round = Array.isArray(snapshotCollaboration?.rounds) ? activeRound(snapshot) : null;
    const dimensionIds = dimensions.map((dimension) => dimension.id);
    const recordDimensionIds = Array.isArray(record?.dimensionIds) ? record.dimensionIds : [];
    const complete = snapshot
      && snapshot.meta?.revision === state.meta.revision
      && dimensions.length > 0
      && round
      && snapshotCollaboration?.ballots && typeof snapshotCollaboration.ballots === 'object'
      && Array.isArray(snapshotCollaboration.scenarios)
      && snapshotAI?.proposals && typeof snapshotAI.proposals === 'object'
      && record
      && record.aggregates && typeof record.aggregates === 'object'
      && Object.prototype.hasOwnProperty.call(record, 'scenario')
      && Array.isArray(record.noteIds)
      && typeof record.receipt === 'string' && record.receipt.trim()
      && typeof record.reviewedBy === 'string' && record.reviewedBy.trim()
      && typeof record.reviewedAt === 'string' && record.reviewedAt
      && record.roundId === round.id
      && record.reviewedAt === state.lifecycle.reviewedAt
      && record.reviewedBy === state.lifecycle.reviewedBy
      && record.receipt === state.lifecycle.reviewNote
      && dimensionIds.length === recordDimensionIds.length
      && dimensionIds.every((dimensionId, index) => dimensionId === recordDimensionIds[index]);
    return complete ? { state: snapshot, record } : null;
  }

  function reportSource(state = currentState()) {
    const reviewed = reviewedReportSource(state);
    if (reviewed) {
      return {
        standing: 'reviewed',
        source: 'lifecycle-reviewed-snapshot',
        state: reviewed.state,
        record: reviewed.record
      };
    }
    return {
      standing: 'working',
      source: 'current-working-state',
      state,
      record: null
    };
  }

  function reportChart(state, aggregates, scenario) {
    const collaboration = collab(state);
    const dimensions = orderedDimensions(state);
    const width = Math.max(980, dimensions.length * 150 + 150);
    const height = 650;
    const { plot, columnBounds, xFor } = chartGeometry(dimensions, width);
    const yFor = (value) => plot.bottom - ((clampScore(value, state) - state.scale.min) / (state.scale.max - state.scale.min)) * (plot.bottom - plot.top);
    const seriesValues = (series) => Object.fromEntries(dimensions.map((dimension) => [dimension.id, dimension.scores[series]]));
    const aggregateValues = Object.fromEntries(dimensions.map((dimension) => [dimension.id, aggregates[dimension.id]?.mean]));
    const aiValues = aiCollab(state).proposals || {};
    const grid = Array.from({ length: 6 }, (_, index) => {
      const value = state.scale.max - ((state.scale.max - state.scale.min) / 5) * index;
      const y = yFor(value);
      return `<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" class="grid-line ${index === 0 || index === 5 ? 'grid-line--major' : ''}"/><text x="${plot.left - 18}" y="${y + 5}" text-anchor="end" class="value-label">${roundValue(value)}</text>`;
    }).join('');
    const guides = dimensions.map((dimension, index) => `<line x1="${xFor(index)}" y1="${plot.top}" x2="${xFor(index)}" y2="${plot.bottom}" class="dimension-guide"/>`).join('');
    const actionBands = dimensions.map((dimension, index) => {
      const bounds = columnBounds(index);
      return `<rect x="${bounds.left}" y="24" width="${bounds.right - bounds.left}" height="34" fill="${dimension.action === 'create' || dimension.action === 'raise' ? 'var(--sc-tiffany)' : dimension.action === 'eliminate' || dimension.action === 'reduce' ? 'var(--sc-rose)' : 'var(--sc-paper-muted)'}" stroke="var(--sc-ink)"/><text x="${xFor(index)}" y="46" text-anchor="middle" class="action-label">${escapeHtml(actionLabels[dimension.action] || dimension.action)}</text>`;
    }).join('');
    const factorLabels = dimensions.map((dimension, index) => {
      const lines = splitLabel(dimension.label);
      const noteCount = collaboration.notes.filter((note) => note.dimensionId === dimension.id).length;
      return `<text x="${xFor(index)}" y="515" text-anchor="middle" class="factor-label">${lines.map((line, lineIndex) => `<tspan x="${xFor(index)}" dy="${lineIndex ? 18 : 0}">${escapeHtml(line)}</tspan>`).join('')}<tspan x="${xFor(index)}" dy="18" class="factor-label--detail">weight ${dimension.consequenceWeight}/5${noteCount ? ` · ${noteCount} note${noteCount === 1 ? '' : 's'}` : ''}</tspan></text>`;
    }).join('');
    const polyline = (values, className) => dimensions.every((dimension) => Number.isFinite(values[dimension.id]))
      ? `<polyline points="${linePoints(dimensions, values, xFor, yFor)}" class="series-line ${className}"/>`
      : '';
    const circlePoints = (values, className, radius, showValue = false) => dimensions.map((dimension, index) => {
      const value = values[dimension.id];
      if (!Number.isFinite(value)) return '';
      return `<circle cx="${xFor(index)}" cy="${yFor(value)}" r="${radius}" class="${className}"/>${showValue ? `<text x="${xFor(index)}" y="${yFor(value) + 5}" text-anchor="middle" class="value-label">${roundValue(value)}</text>` : ''}`;
    }).join('');
    const squarePoints = (values, className, radius) => dimensions.map((dimension, index) => {
      const value = values[dimension.id];
      if (!Number.isFinite(value)) return '';
      return `<rect x="${xFor(index) - radius}" y="${yFor(value) - radius}" width="${radius * 2}" height="${radius * 2}" class="${className}"/><text x="${xFor(index)}" y="${yFor(value) + 5}" text-anchor="middle" class="value-label">${roundValue(value)}</text>`;
    }).join('');
    const thresholdPoints = dimensions.map((dimension, index) => {
      const x = xFor(index), y = yFor(dimension.scores.goodEnough), size = 18;
      return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" transform="rotate(45 ${x} ${y})" class="point-threshold"/>`;
    }).join('');
    const currentValues = seriesValues('current');
    const thresholdValues = seriesValues('goodEnough');
    const desiredValues = seriesValues('desired');
    const scenarioValues = scenario?.values || {};
    return {
      viewBox: `0 0 ${width} ${height}`,
      markup: `<title>Strategy Canvas collaboration profile</title><desc>${escapeHtml(dimensions.length)} dimensions from the selected report source. Exact values and standing follow in the table.</desc><g>${actionBands}${grid}${guides}<path d="M${plot.left} ${plot.top}V${plot.bottom}H${plot.right}" class="axis-line"/><g class="series-layer seed-layer">${polyline(currentValues, 'series-line--current')}${polyline(thresholdValues, 'series-line--threshold')}${polyline(desiredValues, 'series-line--desired')}${circlePoints(currentValues, 'point-current', 22)}${thresholdPoints}${circlePoints(desiredValues, 'point-desired', 22)}</g>${Object.values(aggregateValues).some(Number.isFinite) ? `<g class="series-layer aggregate-layer">${polyline(aggregateValues, 'series-line--aggregate')}${circlePoints(aggregateValues, 'point-aggregate', 25, true)}</g>` : ''}${scenario && Object.values(scenarioValues).some(Number.isFinite) ? `<g class="series-layer scenario-layer">${polyline(scenarioValues, 'series-line--scenario')}${circlePoints(scenarioValues, 'point-scenario', 27, true)}</g>` : ''}${Object.values(aiValues).some(Number.isFinite) ? `<g class="series-layer ai-layer">${polyline(aiValues, 'series-line--ai')}${squarePoints(aiValues, 'point-ai', 19)}</g>` : ''}${factorLabels}<text x="${(plot.left + plot.right) / 2}" y="620" text-anchor="middle" class="factor-label">Dimensions shaping the collaboration</text><text x="24" y="${(plot.top + plot.bottom) / 2}" text-anchor="middle" class="factor-label" transform="rotate(-90 24 ${(plot.top + plot.bottom) / 2})">Relative level of support</text></g>`
    };
  }

  function renderPrintReport() {
    const current = currentState();
    const reportSourceState = reportSource(current);
    const state = reportSourceState.state;
    const collaboration = collab(state);
    const round = activeRound(state);
    const record = reportSourceState.record;
    const aggregates = reportSourceState.standing === 'reviewed'
      ? clone(record.aggregates || {})
      : round.status === 'revealed' ? computeAggregates(round, state) : {};
    const scenario = reportSourceState.standing === 'reviewed'
      ? clone(record.scenario || null)
      : collaboration.acceptedScenario || currentScenario(state);
    const previousReview = collaboration.reviewedSnapshots[collaboration.reviewedSnapshots.length - 1];
    const currentReceipt = String(collaboration.session.decisionReceipt || '').trim();
    const carriedReceipt = reportSourceState.standing === 'working' && previousReview && currentReceipt === String(previousReview.receipt || '').trim();
    const receipt = reportSourceState.standing === 'reviewed'
      ? record.receipt
      : !carriedReceipt && currentReceipt ? currentReceipt : 'This working revision is open for a current decision receipt.';
    const reviewed = reportSourceState.standing === 'reviewed';
    const standingLabel = reviewed ? 'Reviewed' : 'Working';
    const chart = reportChart(state, aggregates, scenario);
    const report = document.getElementById('print-report');
    report.dataset.reportStanding = reportSourceState.standing;
    report.dataset.reportRevision = String(state.meta.revision);
    report.dataset.reportSource = reportSourceState.source;
    report.setAttribute('aria-label', `${standingLabel} Strategy Canvas report`);
    root.querySelector('[data-action="print-report"]').textContent = `Print ${reportSourceState.standing} sheet`;
    report.innerHTML = `<header><p class="eyebrow" data-report-title>${standingLabel} collaboration sheet · revision <span data-report-revision>${state.meta.revision}</span></p><h1>${escapeHtml(state.meta.title)}</h1><p><strong>Decision:</strong> ${escapeHtml(state.meta.decisionObject)} · <strong>Horizon:</strong> ${escapeHtml(state.meta.horizon)}</p></header><svg class="strategy-chart print-chart" viewBox="${chart.viewBox}" aria-hidden="true">${chart.markup}</svg><table><caption>Dimension readings and standing</caption><thead><tr><th scope="col">Dimension</th><th scope="col">Current</th><th scope="col">Good enough</th><th scope="col">Desired</th><th scope="col">Group mean</th><th scope="col">Median / range</th><th scope="col">Scenario</th><th scope="col">AI proposal</th><th scope="col">Action</th></tr></thead><tbody>${orderedDimensions(state).map((dim) => { const agg = aggregates[dim.id]; return `<tr><th scope="row">${escapeHtml(dim.label)}</th><td>${dim.scores.current}</td><td>${dim.scores.goodEnough}</td><td>${dim.scores.desired}</td><td>${Number.isFinite(agg?.mean) ? roundValue(agg.mean) : 'Open'}</td><td>${Number.isFinite(agg?.median) ? `${roundValue(agg.median)} / ${roundValue(agg.range)}` : 'Open'}</td><td>${Number.isFinite(scenario?.values?.[dim.id]) ? roundValue(scenario.values[dim.id]) : 'Open'}</td><td>${Number.isFinite(aiCollab(state).proposals[dim.id]) ? roundValue(aiCollab(state).proposals[dim.id]) : 'Open'}</td><td>${escapeHtml(actionLabels[dim.action])}</td></tr>`; }).join('')}</tbody></table><section class="print-receipt"><h2>${reviewed ? 'Reviewed decision receipt' : 'Working decision receipt'}</h2><p data-report-receipt>${escapeHtml(receipt)}</p><p><strong>Review standing:</strong> ${standingLabel}${reviewed ? ` · <strong>Reviewed by:</strong> ${escapeHtml(record.reviewedBy)} · <strong>Reviewed at:</strong> ${escapeHtml(record.reviewedAt)}` : ''} · <strong>Human ballots:</strong> ${submittedCount(round, state)} · <strong>Attached notes:</strong> ${reviewed ? record.noteIds.length : collaboration.notes.length}</p></section><footer><p>Human ballots are participant-entered records. Group summaries are system-derived. Scenarios remain facilitation constructs. AI proposals retain attributed proposal standing.</p></footer>`;
  }

  function renderAll() {
    renderHeaderAndStages();
    renderChart();
    renderDimensionStrip();
    renderSemanticTable();
    renderDimensionEditor();
    renderPackPreview();
    renderParticipantSetup();
    renderReveal();
    renderScenarioInspector();
    renderActions();
    renderNotes();
    renderLedgers();
    renderHandoffPreview();
    renderStateInspector();
    renderPrintReport();
    document.getElementById('strategy-jsonld').textContent = JSON.stringify(Core.toJSONLD(currentState()));
  }

  function usePack(packId) {
    const pack = packs[packId];
    if (!pack) return;
    replaceState((state, collaboration) => {
      state.dimensions = clone(pack.dimensions);
      state.view.dimensionOrder = state.dimensions.map((dim) => dim.id);
      state.view.selectedDimensionId = state.dimensions[0].id;
      collaboration.rounds = [{ id: uid('round'), label: 'Current reading', target: 'current', status: 'collecting', participantIds: collaboration.participants.map((participant) => participant.id), createdAt: nowIso(), revealedAt: '' }];
      collaboration.ballots = {};
      collaboration.scenarios = [];
      collaboration.acceptedScenario = null;
      collaboration.notes = [];
      collaboration.session.decisionReceipt = '';
      collaboration.session.includeReviewedStateInAI = false;
      state.extensions.contextCanvas.aiCollaboration = initialAICollaboration();
    }, { event: 'DIMENSION_PACK_APPLIED' });
    ui.packPreview = '';
    renderPackPreview();
    announce(`${pack.label} starter pack applied. Undo restores the prior field.`);
  }

  function openPrivateTurn() {
    const participantId = document.getElementById('next-participant')?.value;
    if (!participantId) return;
    ui.activeParticipantId = participantId;
    ui.ballotDraft = {};
    ui.privateOpen = true;
    renderAll();
    document.getElementById('ballot-form')?.querySelector('input')?.focus();
    announce('Private reading opened. Shared curves are concealed.');
  }

  function sealBallot(form) {
    const state = currentState();
    const round = activeRound(state);
    const values = {};
    orderedDimensions(state).forEach((dim) => {
      const raw = form.elements[dim.id]?.value;
      if (raw !== '' && Number.isFinite(Number(raw))) values[dim.id] = clampScore(raw, state);
    });
    const participantId = ui.activeParticipantId;
    ui.privateOpen = false;
    ui.activeParticipantId = '';
    ui.ballotDraft = {};
    replaceState((next, collaboration) => {
      collaboration.ballots[round.id] = collaboration.ballots[round.id] || {};
      collaboration.ballots[round.id][participantId] = { participantId, values, status: 'submitted', submittedAt: nowIso(), channel: 'human-ballot' };
    }, { event: 'BALLOT_SUBMITTED', reopens: false });
    announce('Reading sealed. Pass the device when the next participant is ready.');
  }

  function revealRound() {
    const round = activeRound();
    if (!submittedCount(round)) return;
    replaceState((state, collaboration) => {
      const target = collaboration.rounds.find((item) => item.id === round.id);
      target.status = 'revealed';
      target.revealedAt = nowIso();
    }, { event: 'ROUND_REVEALED', reopens: false });
    announce('Group reading revealed. Mean, median, range, count, and missingness are available together.');
  }

  function updateScenarioValue(dimensionId, value, announceChange = true) {
    ensureScenario();
    replaceState((state, collaboration) => {
      const scenario = collaboration.scenarios[collaboration.scenarios.length - 1];
      scenario.values[dimensionId] = clampScore(value, state);
      state.view.selectedDimensionId = dimensionId;
    }, { event: 'SCENARIO_POINT_MOVED' });
    if (announceChange) announce(`${selectedDimension().label} scenario moved to ${roundValue(clampScore(value))}. The group aggregate remains unchanged.`);
  }

  function returnScenario(full) {
    ensureScenario();
    const state = currentState();
    const seed = aggregateSeed(activeRound(state), state);
    const selectedId = selectedDimension(state).id;
    replaceState((next, collaboration) => {
      const scenario = collaboration.scenarios[collaboration.scenarios.length - 1];
      if (full) scenario.values = seed;
      else scenario.values[selectedId] = seed[selectedId];
    }, { event: full ? 'SCENARIO_RETURNED' : 'SCENARIO_POINT_RETURNED' });
    announce(full ? 'The working curve returned to the group reading.' : 'The selected point returned to the group reading.');
  }

  function proposeScenario() {
    const state = currentState();
    const scenario = currentScenario(state) || ensureScenario();
    const participantIds = collab(state).participants.map((participant) => participant.id);
    replaceState((next, collaboration) => {
      collaboration.rounds.push({ id: uid('round'), label: `${seriesLabels[scenario.target]} proposal round`, target: scenario.target, status: 'collecting', participantIds, sourceScenarioId: scenario.id, proposalValues: clone(scenario.values), createdAt: nowIso(), revealedAt: '' });
      collaboration.session.phase = 'vote';
    }, { event: 'SCENARIO_PROPOSED_AS_ROUND' });
    ui.privateOpen = false;
    history.replaceState({ phase: 'vote' }, '', '#stage-vote');
    announce('Fresh independent round opened. The proposal remains in the session ledger while participant entry stays unanchored.');
  }

  function adoptScenario() {
    const scenario = currentScenario() || ensureScenario();
    replaceState((state, collaboration) => {
      collaboration.acceptedScenario = { ...clone(scenario), status: 'carried-to-review', acceptedAt: nowIso(), standing: 'facilitated working scenario' };
      collaboration.session.phase = 'review';
    }, { event: 'SCENARIO_CARRIED_TO_REVIEW' });
    history.replaceState({ phase: 'review' }, '', '#stage-review');
    announce('Scenario carried into review. Human ballots and the system-derived aggregate retain their original values.');
  }

  function prepareAIShadow() {
    const posture = document.getElementById('ai-shadow-posture')?.value || 'research';
    replaceState((state, collaboration, aiCollaboration) => {
      aiCollaboration.posture = posture;
      aiCollaboration.promptPreparedAt = nowIso();
    }, { event: 'AI_SHADOW_PROMPT_PREPARED', reopens: false });
    ui.handoff = buildHandoff(posture, { shadow: true });
    announce('Portable AI shadow prompt prepared. The human aggregate remains unchanged.');
  }

  function recordAIProposal() {
    const dim = selectedDimension();
    const valueField = document.getElementById('ai-proposal-value');
    const noteField = document.getElementById('ai-proposal-note');
    if (!valueField || valueField.value === '') return;
    replaceState((state, collaboration, aiCollaboration) => {
      aiCollaboration.proposals[dim.id] = clampScore(valueField.value, state);
      aiCollaboration.proposalNote = noteField?.value || '';
    }, { event: 'AI_PROPOSAL_RECORDED' });
    announce(`AI-attributed proposal recorded for ${dim.label}. It remains outside the group mean.`);
  }

  function reviewRevision() {
    const state = currentState();
    const receipt = document.getElementById('decision-receipt').value.trim();
    const reviewedBy = document.getElementById('note-author').value.trim() || 'Facilitator';
    const round = activeRound(state);
    const snapshot = {
      id: uid('review'),
      reviewedAt: nowIso(),
      reviewedBy,
      receipt: receipt || 'The reviewed curve, actions, evidence notes, and open conditions form the current handoff.',
      dimensionIds: orderedDimensions(state).map((dim) => dim.id),
      roundId: round.id,
      aggregates: round.status === 'revealed' ? computeAggregates(round, state) : {},
      scenario: clone(collab(state).acceptedScenario || null),
      noteIds: collab(state).notes.map((note) => note.id)
    };
    replaceState((next, collaboration, aiCollaboration) => {
      collaboration.session.decisionReceipt = snapshot.receipt;
      collaboration.reviewedSnapshots.push(snapshot);
      if (collaboration.session.includeReviewedStateInAI) aiCollaboration.reviewedRevision = next.meta.revision;
      next.lifecycle.status = 'reviewed';
      next.lifecycle.reviewedBy = reviewedBy;
      next.lifecycle.reviewNote = snapshot.receipt;
      next.lifecycle.reviewedAt = snapshot.reviewedAt;
      next.lifecycle.reviewedSnapshot = clone({ schemaVersion: next.schemaVersion, meta: next.meta, method: next.method, scale: next.scale, dimensions: next.dimensions, view: next.view, extensions: next.extensions });
    }, { event: 'REVISION_REVIEWED', reopens: false });
    announce('Revision reviewed. A stable decision receipt is available for handoff.');
  }

  function postureInstruction(posture) {
    const instructions = {
      diagram: 'Return an accessible diagram and semantic table. Preserve every entered value and standing label.',
      facilitation: 'Return a facilitation brief that protects independent elicitation, defines the reveal moment, and places dissent beside the relevant dimension.',
      research: 'Return a deep research payload with claim questions, primary-source priorities, evidence gaps, falsifiers, and completion gates for disputed dimensions.',
      loop: 'Return a loop-bearing handoff with the smallest responsible next move, receiving surface, revision signal, evidence condition, and recovery route.',
      'cross-platform': 'Return a compact coordinator packet that another human or a generative AI system can use while preserving stable IDs, provenance, standing, open conditions, and review ownership.'
    };
    return instructions[posture] || instructions.diagram;
  }

  function buildHandoff(posture = 'diagram', options = {}) {
    const state = currentState();
    const collaboration = collab(state);
    const round = activeRound(state);
    const aggregates = round.status === 'revealed' ? computeAggregates(round, state) : {};
    const scenario = collaboration.acceptedScenario || currentScenario(state);
    const reviewed = collaboration.reviewedSnapshots[collaboration.reviewedSnapshots.length - 1];
    const includeReviewed = collaboration.session.includeReviewedStateInAI;
    const includeReviewedNotes = includeReviewed && aiCollab(state).consentScope.includes('notes');
    const rows = orderedDimensions(state).map((dim) => {
      const agg = aggregates[dim.id];
      const ai = aiCollab(state).proposals[dim.id];
      return `- ${dim.id} · ${dim.label}\n  anchors: low “${dim.anchors.low}”; middle “${dim.anchors.middle}”; high “${dim.anchors.high}”\n  authored seed: current ${dim.scores.current}; good enough ${dim.scores.goodEnough}; desired ${dim.scores.desired}; consequence ${dim.consequenceWeight}/5\n  human round: ${agg?.count || 0} entered; ${agg?.missing ?? round.participantIds.length} awaiting/abstained\n  system-derived: mean ${Number.isFinite(agg?.mean) ? roundValue(agg.mean) : 'open'}; median ${Number.isFinite(agg?.median) ? roundValue(agg.median) : 'open'}; range ${Number.isFinite(agg?.range) ? roundValue(agg.range) : 'open'}\n  working scenario: ${Number.isFinite(scenario?.values?.[dim.id]) ? roundValue(scenario.values[dim.id]) : 'open'}\n  AI-attributed proposal: ${Number.isFinite(ai) ? roundValue(ai) : 'open'}\n  action: ${actionLabels[dim.action]}; evidence basis: ${dim.evidenceBasis || 'open for review'}`;
    }).join('\n');
    const reviewedSection = includeReviewed && reviewed ? `\nReviewed state authorized for this packet:\n- reviewed by: ${reviewed.reviewedBy}\n- decision receipt: ${reviewed.receipt}\n- reviewed at: ${reviewed.reviewedAt}\n` : '\nReviewed state sharing: reserved by the participants for this packet.\n';
    return `${options.shadow ? 'AI SHADOW ROUND · PORTABLE PROMPT' : 'STRATEGY CANVAS · COLLABORATION HANDOFF'}\n\nPosture: ${posture}\nSession: ${state.meta.title}\nDecision object: ${state.meta.decisionObject}\nHorizon: ${state.meta.horizon}\nMethod posture: ${state.method.posture}\n\nStanding contract:\n- Human ballots are participant-entered records.\n- System-derived aggregates are calculations from submitted human ballots.\n- AI-attributed proposals are a separate proposal channel and remain outside human aggregates.\n- Working scenarios are reversible facilitation constructs.\n- The reviewed state enters this packet only through participant authorization.\n${reviewedSection}\nPacket scope receipt:\n- Included: dimension context, aggregate count and missingness, aggregate summary statistics, allowed scenario context, AI-attributed proposals${includeReviewedNotes ? ', and notes attached to the authorized reviewed record' : ''}.\n- Held local: participant aliases and roles, participant identifiers, per-participant ballots, individual ballot values, raw aggregate value arrays, the local event ledger, and ${includeReviewedNotes ? 'notes outside the authorized reviewed record and their authors' : 'collaboration notes and their authors'}.\n\nDimensions:\n${rows}\n\nRequested collaboration:\n${postureInstruction(posture)}\n\nReturn every proposal with its evidence basis, open conditions, stable dimension IDs, and receiving review surface.`;
  }

  function redactAggregateValues(reviewedSnapshots = []) {
    reviewedSnapshots.forEach((snapshot) => {
      Object.values(snapshot?.aggregates || {}).forEach((aggregate) => {
        aggregate.values = [];
      });
    });
  }

  function holdPrivateElicitation(state) {
    const collaboration = collab(state);
    collaboration.participants = [];
    collaboration.ballots = {};
    collaboration.rounds = collaboration.rounds.map((round) => ({ ...round, participantIds: [] }));
    collaboration.events = [];
    redactAggregateValues(collaboration.reviewedSnapshots);
    return state;
  }

  function packetScopeReceipt(state = currentState()) {
    const collaboration = collab(state);
    const authorized = collaboration.session.includeReviewedStateInAI;
    const reviewedStateIncluded = authorized && Boolean(state.lifecycle.reviewedSnapshot);
    const includeReviewedNotes = reviewedStateIncluded && aiCollab(state).consentScope.includes('notes');
    return {
      policy: 'local-redaction/v1',
      reviewedStateAuthorized: authorized,
      reviewedStateIncluded,
      reviewedRevision: reviewedStateIncluded ? state.lifecycle.reviewedSnapshot.meta.revision : null,
      included: [
        'dimension context and authored seed scores',
        'aggregate count, missingness, and summary statistics',
        'allowed working scenario context',
        'AI-attributed proposals',
        reviewedStateIncluded ? 'authorized reviewed fields named by consentScope' : 'current packet fields outside the reserved reviewed snapshot',
        ...(includeReviewedNotes ? ['notes attached to the authorized reviewed record'] : [])
      ],
      heldLocal: [
        'participant aliases and roles',
        'participant stable identifiers',
        'per-participant ballot records',
        'individual ballot values',
        'raw aggregate value arrays',
        'local collaboration event ledger',
        includeReviewedNotes ? 'notes outside the authorized reviewed record and their authors' : 'all collaboration notes and their authors'
      ]
    };
  }

  function retainReviewedDisclosure(state, reviewedSnapshot, includeNotes) {
    const collaboration = collab(state);
    const reviewedCollaboration = collab(reviewedSnapshot);
    const reviewedRecord = reviewedCollaboration.reviewedSnapshots[reviewedCollaboration.reviewedSnapshots.length - 1];
    if (!reviewedRecord) {
      collaboration.notes = [];
      collaboration.reviewedSnapshots = [];
      reviewedCollaboration.notes = [];
      reviewedCollaboration.reviewedSnapshots = [];
      return;
    }
    const noteIds = new Set(includeNotes ? reviewedRecord.noteIds : []);
    const reviewedNotes = includeNotes ? reviewedCollaboration.notes.filter((note) => noteIds.has(note.id)) : [];
    const retainedRecord = clone(reviewedRecord);
    retainedRecord.noteIds = reviewedNotes.map((note) => note.id);
    collaboration.notes = clone(reviewedNotes);
    collaboration.reviewedSnapshots = [clone(retainedRecord)];
    reviewedCollaboration.notes = clone(reviewedNotes);
    reviewedCollaboration.reviewedSnapshots = [clone(retainedRecord)];
  }

  function stateForAIPacket(state = currentState()) {
    const packetState = clone(state);
    const collaboration = collab(packetState);
    const authorized = collaboration.session.includeReviewedStateInAI;
    const includeNotes = authorized && aiCollab(packetState).consentScope.includes('notes');
    if (!authorized) {
      collaboration.session.decisionReceipt = '';
      collaboration.notes = [];
      collaboration.reviewedSnapshots = [];
      packetState.extensions.contextCanvas.aiCollaboration.reviewedRevision = null;
      packetState.extensions.contextCanvas.aiCollaboration.consentScope = [];
      packetState.lifecycle = { ...packetState.lifecycle, status: 'working', reviewedSnapshot: null, reviewedBy: '', reviewNote: '', reviewedAt: '' };
    } else if (packetState.lifecycle.reviewedSnapshot) {
      const reviewedSnapshot = clone(packetState.lifecycle.reviewedSnapshot);
      retainReviewedDisclosure(packetState, reviewedSnapshot, includeNotes);
      packetState.lifecycle.reviewedSnapshot = holdPrivateElicitation(reviewedSnapshot);
    } else {
      collaboration.notes = [];
      collaboration.reviewedSnapshots = [];
    }
    return holdPrivateElicitation(packetState);
  }

  function downloadSession() {
    const state = currentState();
    const content = JSON.stringify(state, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `strategy-canvas-${state.meta.id}-revision-${state.meta.revision}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    announce('Session JSON prepared for download.');
  }

  function cycleDimension(delta) {
    const state = currentState();
    const dimensions = orderedDimensions(state);
    const currentIndex = dimensions.findIndex((dim) => dim.id === state.view.selectedDimensionId);
    const nextIndex = (currentIndex + delta + dimensions.length) % dimensions.length;
    dispatch(Core.actions.viewSelect(dimensions[nextIndex].id), `${dimensions[nextIndex].label} selected.`, { reopens: false });
  }

  function selectLedger(name) {
    if (!['dimension', 'round', 'notes', 'session'].includes(name)) return;
    ui.ledger = name;
    root.querySelectorAll('[data-ledger-tab]').forEach((tab) => {
      const active = tab.dataset.ledgerTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    root.querySelectorAll('[data-ledger-panel]').forEach((panel) => {
      const active = panel.dataset.ledgerPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  }

  function handleClick(event) {
    const phaseTarget = event.target.closest('[data-phase-link], [data-go-phase]');
    if (phaseTarget) {
      event.preventDefault();
      changePhase(phaseTarget.dataset.phaseLink || phaseTarget.dataset.goPhase);
      return;
    }
    const selectTarget = event.target.closest('[data-select-dimension]');
    if (selectTarget && !selectTarget.dataset.scenarioHandle) {
      dispatch(Core.actions.viewSelect(selectTarget.dataset.selectDimension), `${orderedDimensions().find((dim) => dim.id === selectTarget.dataset.selectDimension)?.label || 'Dimension'} selected.`, { reopens: false });
      return;
    }
    const ledgerTab = event.target.closest('[data-ledger-tab]');
    if (ledgerTab) { selectLedger(ledgerTab.dataset.ledgerTab); return; }
    const actionValue = event.target.closest('[data-action-value]');
    if (actionValue) {
      const dim = selectedDimension();
      dispatch(Core.actions.dimensionUpdate(dim.id, { action: actionValue.dataset.actionValue }), `${dim.label} set to ${actionLabels[actionValue.dataset.actionValue]}.`);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const state = currentState();
    const dim = selectedDimension(state);
    if (action === 'undo') store.undo();
    if (action === 'redo') store.redo();
    if (action === 'presentation') dispatch(Core.actions.viewModeSet(state.view.mode === 'presentation' ? 'working' : 'presentation'), '', { reopens: false });
    if (action === 'previous-dimension') cycleDimension(-1);
    if (action === 'next-dimension') cycleDimension(1);
    if (action === 'preview-pack') { ui.packPreview = document.getElementById('dimension-pack').value; renderPackPreview(); }
    if (action === 'use-pack') usePack(event.target.closest('[data-pack]').dataset.pack);
    if (action === 'add-dimension') dispatch(Core.actions.dimensionAdd(), 'New dimension added and selected.');
    if (action === 'move-dimension-left') dispatch(Core.actions.dimensionMove(dim.id, -1), `${dim.label} moved earlier.`);
    if (action === 'move-dimension-right') dispatch(Core.actions.dimensionMove(dim.id, 1), `${dim.label} moved later.`);
    if (action === 'remove-dimension') {
      if (ui.pendingRemoveId === dim.id) { ui.pendingRemoveId = ''; dispatch(Core.actions.dimensionRemove(dim.id), `${dim.label} removed. Undo restores it.`); }
      else { ui.pendingRemoveId = dim.id; renderDimensionEditor(); announce('Removal prepared. Activate Remove this dimension to continue.'); }
    }
    if (action === 'add-participant') {
      replaceState((next, collaboration) => {
        const participant = { id: uid('participant'), alias: `Participant ${collaboration.participants.length + 1}`, role: 'Participant' };
        collaboration.participants.push(participant);
        activeRound(next).participantIds.push(participant.id);
      }, { event: 'PARTICIPANT_ADDED', reopens: false });
    }
    if (action === 'open-private-turn') openPrivateTurn();
    if (action === 'close-private-turn') { ui.privateOpen = false; ui.activeParticipantId = ''; ui.ballotDraft = {}; renderAll(); announce('Private entry closed.'); }
    if (action === 'reveal-round') revealRound();
    if (action === 'scenario-decrement') updateScenarioValue(dim.id, (currentScenario()?.values?.[dim.id] ?? dim.scores.current) - state.scale.step);
    if (action === 'scenario-increment') updateScenarioValue(dim.id, (currentScenario()?.values?.[dim.id] ?? dim.scores.current) + state.scale.step);
    if (action === 'return-scenario-point') returnScenario(false);
    if (action === 'return-scenario') returnScenario(true);
    if (action === 'propose-scenario') proposeScenario();
    if (action === 'adopt-scenario') adoptScenario();
    if (action === 'prepare-ai-shadow') prepareAIShadow();
    if (action === 'record-ai-proposal') recordAIProposal();
    if (action === 'review-revision') reviewRevision();
    if (action === 'assemble-handoff') { ui.handoff = buildHandoff(document.getElementById('prompt-posture').value); renderHandoffPreview(); announce('Current handoff assembled.'); }
    if (action === 'copy-handoff') {
      const text = ui.handoff || buildHandoff(document.getElementById('prompt-posture').value);
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(() => announce('Handoff copied.')).catch(() => announce('Select the handoff text and use the browser copy command.'));
      } else {
        announce('Select the handoff text and use the browser copy command.');
      }
    }
    if (action === 'download-session') downloadSession();
    if (action === 'print-report') window.print();
  }

  function handleChange(event) {
    const state = currentState();
    const dim = selectedDimension(state);
    if (event.target.id === 'session-title-input') dispatch(Core.actions.metaUpdate({ title: event.target.value }), 'Session title updated.');
    if (event.target.id === 'decision-input') dispatch(Core.actions.metaUpdate({ decisionObject: event.target.value }), 'Decision object updated.');
    if (event.target.id === 'horizon-input') dispatch(Core.actions.metaUpdate({ horizon: event.target.value }), 'Time horizon updated.');
    if (event.target.id === 'method-posture') dispatch(Core.actions.methodUpdate({ posture: event.target.value }), 'Canvas posture updated.');
    if (event.target.dataset.dimensionField) {
      const field = event.target.dataset.dimensionField;
      const value = field === 'consequenceWeight' ? Number(event.target.value) : event.target.value;
      dispatch(Core.actions.dimensionUpdate(dim.id, { [field]: value }), `${dim.label} updated.`);
    }
    if (event.target.dataset.anchorField) dispatch(Core.actions.dimensionUpdate(dim.id, { anchors: { [event.target.dataset.anchorField]: event.target.value } }), `${dim.label} anchor updated.`);
    if (event.target.dataset.scoreSeries) dispatch(Core.actions.scoreSet(dim.id, event.target.dataset.scoreSeries, event.target.value), `${dim.label} ${seriesLabels[event.target.dataset.scoreSeries].toLowerCase()} value updated.`);
    if (event.target.dataset.participantAlias) {
      replaceState((next, collaboration) => { collaboration.participants.find((participant) => participant.id === event.target.dataset.participantAlias).alias = event.target.value; }, { event: 'PARTICIPANT_ALIAS_UPDATED', reopens: false });
    }
    if (event.target.id === 'round-target') {
      replaceState((next, collaboration) => { const round = activeRound(next); round.target = event.target.value; round.label = `${seriesLabels[event.target.value]} reading`; }, { event: 'ROUND_TARGET_UPDATED', reopens: false });
    }
    if (event.target.id === 'scenario-value') updateScenarioValue(dim.id, event.target.value);
    if (event.target.id === 'ai-shadow-posture') replaceState((next, collaboration, aiCollaboration) => { aiCollaboration.posture = event.target.value; }, { history: false, reopens: false });
    if (event.target.id === 'include-reviewed-state') {
      replaceState((next, collaboration, aiCollaboration) => {
        collaboration.session.includeReviewedStateInAI = event.target.checked;
        aiCollaboration.consentScope = event.target.checked ? ['dimensions', 'reviewed-scores', 'aggregates', 'notes', 'evidence-bases', 'scenarios'] : [];
        aiCollaboration.reviewedRevision = event.target.checked && collaboration.reviewedSnapshots.length
          ? next.lifecycle.reviewedSnapshot?.meta?.revision ?? null
          : null;
      }, { event: 'AI_REVIEWED_STATE_PERMISSION_SET', reopens: false });
      ui.handoff = '';
    }
    if (event.target.id === 'decision-receipt') replaceState((next, collaboration) => { collaboration.session.decisionReceipt = event.target.value; }, { history: false });
  }

  function handleSubmit(event) {
    if (event.target.id === 'ballot-form') { event.preventDefault(); sealBallot(event.target); }
    if (event.target.id === 'note-form') {
      event.preventDefault();
      const body = document.getElementById('note-body').value.trim();
      if (!body) return;
      const type = document.getElementById('note-type').value;
      const author = document.getElementById('note-author').value.trim() || 'Participant';
      const dimensionId = selectedDimension().id;
      replaceState((state, collaboration) => {
        collaboration.notes.push({ id: uid('note'), dimensionId, roundId: activeRound(state).id, type: noteTypes.includes(type) ? type : 'observation', author, body, standing: type === 'ai-proposal' ? 'AI-attributed proposal' : 'human-authored note', createdAt: nowIso() });
      }, { event: 'NOTE_ATTACHED' });
      document.getElementById('note-body').value = '';
      announce('Note attached to the selected dimension.');
    }
  }

  function handleKeydown(event) {
    const handle = event.target.closest('[data-scenario-handle]');
    if (handle) {
      const state = currentState();
      const dimId = handle.dataset.scenarioHandle;
      const current = currentScenario()?.values?.[dimId] ?? selectedDimension(state).scores.current;
      let next;
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = current + state.scale.step;
      if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = current - state.scale.step;
      if (event.key === 'PageUp') next = current + state.scale.step * 2;
      if (event.key === 'PageDown') next = current - state.scale.step * 2;
      if (event.key === 'Home') next = state.scale.min;
      if (event.key === 'End') next = state.scale.max;
      if (Number.isFinite(next)) { event.preventDefault(); updateScenarioValue(dimId, next); }
    }
    const dimensionControl = event.target.closest('[data-select-dimension][role="button"]');
    if (dimensionControl && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const dimensionId = dimensionControl.dataset.selectDimension;
      const label = orderedDimensions().find((dimension) => dimension.id === dimensionId)?.label || 'Dimension';
      dispatch(Core.actions.viewSelect(dimensionId), `${label} selected.`, { reopens: false });
      root.querySelector(`#strategy-chart [data-select-dimension="${CSS.escape(dimensionId)}"][role="button"]`)?.focus();
      return;
    }
    const tab = event.target.closest('[data-ledger-tab]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const names = ['dimension', 'round', 'notes', 'session'];
      let index = names.indexOf(tab.dataset.ledgerTab);
      if (event.key === 'ArrowLeft') index = (index - 1 + names.length) % names.length;
      if (event.key === 'ArrowRight') index = (index + 1) % names.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = names.length - 1;
      selectLedger(names[index]);
      root.querySelector(`[data-ledger-tab="${names[index]}"]`)?.focus();
    }
  }

  function pointerToScore(event, svg) {
    const state = currentState();
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    const top = 88, bottom = 470;
    const raw = state.scale.min + ((bottom - local.y) / (bottom - top)) * (state.scale.max - state.scale.min);
    return Math.round(Core.clamp(raw, state.scale.min, state.scale.max) / state.scale.step) * state.scale.step;
  }

  function handlePointerDown(event) {
    const handle = event.target.closest('[data-scenario-handle]');
    if (!handle || collab().session.phase !== 'shape') return;
    const svg = document.getElementById('strategy-chart');
    const dimId = handle.dataset.scenarioHandle;
    ui.drag = { pointerId: event.pointerId, dimId, value: currentScenario()?.values?.[dimId] };
    handle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    const move = (moveEvent) => {
      if (!ui.drag || moveEvent.pointerId !== ui.drag.pointerId) return;
      ui.drag.value = pointerToScore(moveEvent, svg);
      const state = currentState();
      const dimensions = orderedDimensions(state);
      const index = dimensions.findIndex((dim) => dim.id === dimId);
      const width = Number(svg.viewBox.baseVal.width);
      const { plot, xFor } = chartGeometry(dimensions, width);
      const plotTop = plot.top, plotBottom = plot.bottom;
      const x = xFor(index);
      const y = plotBottom - ((ui.drag.value - state.scale.min) / (state.scale.max - state.scale.min)) * (plotBottom - plotTop);
      handle.setAttribute('transform', `translate(${x} ${y})`);
      handle.setAttribute('aria-valuenow', roundValue(ui.drag.value));
      handle.querySelector('text').textContent = roundValue(ui.drag.value);
    };
    const finish = (upEvent) => {
      if (!ui.drag || upEvent.pointerId !== ui.drag.pointerId) return;
      const value = ui.drag.value;
      ui.drag = null;
      handle.releasePointerCapture?.(upEvent.pointerId);
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', finish);
      svg.removeEventListener('pointercancel', cancel);
      updateScenarioValue(dimId, value);
    };
    const cancel = (cancelEvent) => {
      if (!ui.drag || cancelEvent.pointerId !== ui.drag.pointerId) return;
      ui.drag = null;
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerup', finish);
      svg.removeEventListener('pointercancel', cancel);
      renderAll();
      announce('Scenario movement returned to its starting value.');
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', finish);
    svg.addEventListener('pointercancel', cancel);
  }

  root.addEventListener('click', handleClick, { signal });
  root.addEventListener('change', handleChange, { signal });
  root.addEventListener('submit', handleSubmit, { signal });
  root.addEventListener('keydown', handleKeydown, { signal });
  root.addEventListener('pointerdown', handlePointerDown, { signal });
  store.subscribe(() => renderAll());

  const initialHashPhase = location.hash.match(/^#stage-(orient|define|vote|reveal|shape|act|review|handoff)$/)?.[1];
  if (initialHashPhase) replaceState((state, collaboration) => { collaboration.session.phase = initialHashPhase; }, { history: false, reopens: false });
  renderAll();
  window.StrategyCanvasWorkbench = Object.freeze({
    version: '0.2.1',
    schemaVersion: Core.schemaVersion,
    getState: () => clone(currentState()),
    getValidation: () => clone(Core.validateState(currentState())),
    getChannels: () => channelSnapshot(currentState()),
    exportPacket: (posture = 'cross-platform') => {
      const sourceState = currentState();
      const packetState = stateForAIPacket(sourceState);
      return {
      state: packetState,
      validation: clone(Core.validateState(packetState)),
      jsonld: clone(Core.toJSONLD(packetState)),
      handoff: buildHandoff(posture),
      scopeReceipt: packetScopeReceipt(sourceState)
      };
    }
  });
  root.classList.add('is-enhanced');
  } catch (error) {
    root.innerHTML = fallbackMarkup;
    root.classList.remove('is-enhanced');
    console.error('Strategy Canvas workbench retained its static field after an enhancement error.', error);
  }
})();
