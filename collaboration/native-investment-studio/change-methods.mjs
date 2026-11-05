// Guidance supports choosing useful work; accepted sessions retain their existing state and money owners.
export const CHANGE_METHOD_CATALOGUE_VERSION = '1.0.0';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const methods = freeze([
  {
    "id": "practitioner-judgment-probes",
    "label": "Practitioner Judgment Probes",
    "source": "core",
    "displayLabel": "Practitioner Judgment Probes",
    "purpose": "Turn an experienced practitioner's question into a specific concern and a useful check.",
    "useWhen": "The team needs to examine a proposed design or implementation before relying on it.",
    "question": "What would an experienced practitioner ask here, and which consequence does that question reveal?",
    "example": "For a request handoff, ask what happens when the receiving team is unavailable. Inspect who retains responsibility and how the request continues.",
    "sessionLabel": "Examine the decisions that need stronger evidence",
    "bring": [
      "The decision under review, its intended behavior, and the available evidence."
    ],
    "leaveWith": "A question tied to its concern, evidence standing, and next investigation.",
    "sourceNote": "Method guidance adapted from the Practitioner Judgment Probes prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "practitioner-judgment-probes",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/practitioner-judgment-probes-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/practitioner-judgment-probes-chimeric-prototype-v0.1.5.html",
      "label": "Open Practitioner Judgment Probes"
    }
  },
  {
    "id": "field-watch",
    "label": "Field Watch",
    "source": "core",
    "displayLabel": "Field Watch",
    "purpose": "Review relevant field observations and practitioner guidance against the decision at hand.",
    "useWhen": "A change in practice, technology, or working conditions could alter the initiative's direction.",
    "question": "Which observation changes our understanding of the work, and how does it apply here?",
    "example": "Compare recent request-handling observations with the pilot's assumption that every request reaches a clearly named owner.",
    "sessionLabel": "Review field observations that could change the plan",
    "bring": [
      "The current decision, a relevant observation or reading, and its source and date."
    ],
    "leaveWith": "A short account of what the observation changes and what the team should examine next.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "stakeholder-inquiry",
    "label": "stakeholder inquiry",
    "source": "enterprise",
    "displayLabel": "Stakeholder inquiry",
    "purpose": "Learn from the people who experience, support, or decide the work.",
    "useWhen": "The plan depends on assumptions about people's needs, responsibilities, or working conditions.",
    "question": "What would these people need to do differently, and what support would make that possible?",
    "example": "Ask request coordinators and receiving teams to describe a recent handoff and the information each needed.",
    "sessionLabel": "Understand affected people's work and needs",
    "bring": [
      "The affected roles, the decision being considered, and focused questions about their actual work."
    ],
    "leaveWith": "Observed needs and differences that can change the proposed work.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/participatory-design-kit-chimeric-prototype-v0.1.4.html",
      "label": "Explore a participatory workflow example"
    }
  },
  {
    "id": "measurement",
    "label": "measurement",
    "source": "enterprise",
    "displayLabel": "Measurement",
    "purpose": "Choose observations that help the team judge whether the intended change is happening.",
    "useWhen": "The next decision needs evidence of a consequence, improvement, or unresolved condition.",
    "question": "What could we observe that would change the next decision?",
    "example": "Observe whether a coordinator can identify the next owner of a request, then inspect cases where the owner remains unclear.",
    "sessionLabel": "Choose evidence for the next decision",
    "bring": [
      "The desired outcome, a plausible signal, and the person who will use the observation."
    ],
    "leaveWith": "A practical observation plan with interpretation, timing, and a decision it can change.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/heart-chart-chimeric-prototype-v0.1.6.html",
      "label": "Explore a goal, signal, and measure example"
    }
  },
  {
    "id": "participatory-design-kit",
    "label": "Participatory Design Kit",
    "source": "core",
    "displayLabel": "Participatory Design Kit",
    "purpose": "Let participants rearrange a workflow so its timing, dependencies, and support needs become clear.",
    "useWhen": "The people doing the work know details that the current plan has yet to capture.",
    "question": "What becomes clear when participants move, split, annotate, or reconnect the work?",
    "example": "Invite a coordinator and receiving team to rearrange request intake, review, assignment, and follow-up, explaining the changes together.",
    "sessionLabel": "Shape the workflow with the people doing the work",
    "bring": [
      "An initial workflow, the people who perform it, and examples of ordinary work."
    ],
    "leaveWith": "A revised workflow with participant explanations, dependencies, and concrete behavior examples.",
    "sourceNote": "Method guidance adapted from the Participatory Design Kit prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "participatory-design-kit",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/participatory-design-kit-chimeric-prototype-v0.1.4.html",
      "sourceVersion": "0.1.4",
      "receivingVersion": "0.1.4"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/participatory-design-kit-chimeric-prototype-v0.1.4.html",
      "label": "Open Participatory Design Kit"
    }
  },
  {
    "id": "shared-surface-priority-map",
    "label": "Shared Surface Priority Map",
    "source": "core",
    "displayLabel": "Shared Surface Priority Map",
    "purpose": "See where several parts of a service depend on the same support and where attention matters most.",
    "useWhen": "Work across channels or stages relies on shared information, services, or other supporting resources.",
    "question": "Which experiences depend on the same support, and where would improving it matter most?",
    "example": "Connect request intake and follow-up to the same ownership directory, then inspect which stage most needs clearer ownership.",
    "sessionLabel": "Locate shared support and its most important uses",
    "bring": [
      "The process stages, visible experiences, shared resources, and reasons for their relative priority."
    ],
    "leaveWith": "A map connecting priority areas to the shared support they require.",
    "sourceNote": "Method guidance adapted from the Cross-channel Blueprint prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "cross-channel-blueprint",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/shared-surface-priority-map-chimeric-prototype-v0.1.4.html",
      "sourceVersion": "0.1.4",
      "receivingVersion": "0.1.4"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/shared-surface-priority-map-chimeric-prototype-v0.1.4.html",
      "label": "Open Cross-channel Blueprint"
    }
  },
  {
    "id": "ai-systems-service-blueprint",
    "label": "AI Systems Service Blueprint",
    "source": "core",
    "displayLabel": "AI Systems Service Blueprint",
    "purpose": "Connect visible AI behavior to its context, tools, supporting systems, and human review.",
    "useWhen": "An AI-assisted service needs clear responsibilities and inspectable operating boundaries.",
    "question": "What supports this AI behavior, and where can an accountable person review or intervene?",
    "example": "Trace a suggested request summary from source records through generation to a coordinator's review before the summary enters the handoff.",
    "sessionLabel": "Map AI assistance and its human review",
    "bring": [
      "The intended AI behavior, its inputs and tools, supporting services, and accountable reviewers."
    ],
    "leaveWith": "A connected view of the service, its dependencies, review points, and recovery options.",
    "sourceNote": "Method guidance adapted from the AI Systems Service Blueprint prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "ai-systems-service-blueprint",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/ai-systems-service-blueprint-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/ai-systems-service-blueprint-chimeric-prototype-v0.1.5.html",
      "label": "Open AI Systems Service Blueprint"
    }
  },
  {
    "id": "executive-alignment",
    "label": "executive alignment",
    "source": "enterprise",
    "displayLabel": "Executive alignment",
    "purpose": "Agree on the outcome, tradeoffs, and decisions that accountable leaders need to support.",
    "useWhen": "The initiative needs a shared direction or a decision about resources and responsibilities.",
    "question": "What must leaders decide or make available for this work to proceed responsibly?",
    "example": "Compare a small service pilot with a broader rollout and agree which evidence would justify expanding the commitment.",
    "sessionLabel": "Agree on direction and accountable decisions",
    "bring": [
      "The intended outcome, credible options, material consequences, and the decisions that need an owner."
    ],
    "leaveWith": "An agreed direction with decision owners, resource assumptions, and conditions for review.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "operating-model-design",
    "label": "operating-model design",
    "source": "enterprise",
    "displayLabel": "Operating-model design",
    "purpose": "Work out how people, responsibilities, decisions, and resources will support the new practice.",
    "useWhen": "A proposed change needs an ordinary, repeatable way for people to carry it out.",
    "question": "Who does the work, who decides, and what keeps the arrangement working over time?",
    "example": "Agree who receives requests, who assigns them, when specialists join, and who reviews unresolved handoffs.",
    "sessionLabel": "Design how the new practice will operate",
    "bring": [
      "The intended service, current roles and routines, resource constraints, and decision responsibilities."
    ],
    "leaveWith": "A working arrangement with clear ownership, handoffs, and ongoing support.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "expectation-architecture",
    "label": "Expectation Architecture",
    "source": "core",
    "displayLabel": "Expectation Architecture",
    "purpose": "Make the expected minimum, comparison basis, and desired outcome clear enough to review.",
    "useWhen": "Participants need a shared understanding of what the next phase should make possible.",
    "question": "What needs to hold for this phase, what are we comparing, and what stronger outcome do we want?",
    "example": "For the pilot, agree that each request has an accountable owner; compare the handoff with today's practice; describe the improved experience the team wants to pursue.",
    "sessionLabel": "Clarify expectations for the next phase",
    "bring": [
      "The affected people, the condition they need, a useful comparison, and the stronger outcome they seek."
    ],
    "leaveWith": "Explicit expectations with a practical way to examine each one.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "poda",
    "label": "PODA",
    "source": "core",
    "displayLabel": "PODA",
    "purpose": "Connect the reason for the work to what the team needs to learn and the activities that can reveal it.",
    "useWhen": "The team needs shared orientation before committing to a particular artifact or implementation.",
    "question": "What should become discoverable before we commit to an artifact or implementation form?",
    "example": "Purpose: help staff resolve requests confidently. Objective: prepare a useful pilot. Discoverable: where does ownership need clarification? Activity: walk through representative requests with the affected roles.",
    "sessionLabel": "Clarify purpose and next learning",
    "bring": [
      "The larger purpose, goals for this phase, questions to make inspectable, and possible activities."
    ],
    "leaveWith": "A connected Purpose → Objectives → Discoverables → Activities frame that evidence can revise.",
    "sourceNote": "Method guidance adapted from the PODA prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "poda",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/poda-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/poda.html",
      "fragment": "poda-prototype-title",
      "label": "Explore PODA and its prototype"
    }
  },
  {
    "id": "impact-map",
    "label": "Impact Map",
    "source": "core",
    "displayLabel": "Impact Map",
    "purpose": "Connect a goal to the people affected, the change they need, and what the team should investigate.",
    "useWhen": "The team has a goal and needs to understand whose work would change before choosing a solution.",
    "question": "What should become discoverable because this impact matters?",
    "example": "Goal: improve request resolution. Actor: service coordinator. Impact: can identify the next responsible owner. Discoverable: where does a request lose its owner?",
    "sessionLabel": "Map who is affected and what should change",
    "bring": [
      "A goal, affected actors, meaningful changes for each actor, and questions raised by those changes."
    ],
    "leaveWith": "A Goal → Actor → Impact → Discoverable trace with a useful next investigation.",
    "sourceNote": "Method guidance adapted from the Impact Map prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "impact-map",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/impact-map-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/impact-map-chimeric-prototype-v0.1.5.html",
      "label": "Open Impact Map"
    }
  },
  {
    "id": "strategy-canvas",
    "label": "Strategy Canvas",
    "source": "core",
    "displayLabel": "Strategy Canvas",
    "purpose": "Compare current support, the condition needed for the next phase, and the stronger future condition.",
    "useWhen": "People need to compare alternatives or agree what adequate support means for a particular decision.",
    "question": "Which dimensions define stronger support, and what condition is adequate for the next phase?",
    "example": "Describe low, middle, and high handoff clarity before placing current, adequate-for-pilot, and desired readings on the scale. Keep consequence weight separate from the support score.",
    "sessionLabel": "Compare the support needed for the next phase",
    "bring": [
      "Meaningful comparison dimensions, observable scale anchors, evidence, and the decision horizon."
    ],
    "leaveWith": "Current, good-enough, and desired readings whose values retain their definitions and evidence.",
    "sourceNote": "Method guidance adapted from the Strategy Canvas prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "strategy-canvas",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.5.html",
      "sourceVersion": "0.2.5",
      "receivingVersion": "0.2.3"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-chimeric-prototype-v0.2.3.html",
      "label": "Open Strategy Canvas"
    }
  },
  {
    "id": "alignment-worksheet",
    "label": "Alignment Worksheet",
    "source": "core",
    "displayLabel": "Alignment Worksheet",
    "purpose": "Build a shared account of who needs a change, their present approach, and the condition the team wants to create.",
    "useWhen": "Participants hold different assumptions about the situation or the proposed direction.",
    "question": "Which part of the premise needs the most clarification before we proceed?",
    "example": "Compare how coordinators and receiving teams describe today's handoff, then agree what a clear, supported handoff should make possible.",
    "sessionLabel": "Agree on the situation and intended change",
    "bring": [
      "The affected group, desired outcome, present path, reason for change, restored state, and broad approach."
    ],
    "leaveWith": "A connected premise with its most uncertain assumption and a route to clarify it.",
    "sourceNote": "Method guidance adapted from the Alignment Worksheet prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "alignment-worksheet",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/alignment-worksheet-chimeric-prototype-v0.1.4.html",
      "sourceVersion": "0.1.4",
      "receivingVersion": "0.1.4"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/alignment-worksheet-chimeric-prototype-v0.1.4.html",
      "label": "Open Alignment Worksheet"
    }
  },
  {
    "id": "frv-matrix",
    "label": "FRV Matrix",
    "source": "core",
    "displayLabel": "First Responsible Version Matrix",
    "purpose": "Decide what the next version needs, what needs investigation, and what can remain available for later.",
    "useWhen": "The team needs a responsible delivery boundary and reasons that others can examine.",
    "question": "What does this version need to remain responsible, usable, clear, and adaptable?",
    "example": "Place visible request ownership above the pilot boundary, unresolved approval behavior at the boundary, and optional reporting below it with a review trigger.",
    "sessionLabel": "Agree what the next version needs",
    "bring": [
      "Proposed capabilities and support conditions, their consequences, evidence, and review triggers."
    ],
    "leaveWith": "A revisable boundary with items above, at, or below it and a reason for each decision.",
    "sourceNote": "Method guidance adapted from the First Responsible Version Matrix prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "first-responsible-version-matrix",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/first-responsible-version-matrix-chimeric-prototype-v0.1.4.html",
      "sourceVersion": "0.1.4",
      "receivingVersion": "0.1.4"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/first-responsible-version-matrix-chimeric-prototype-v0.1.4.html",
      "label": "Open First Responsible Version Matrix"
    }
  },
  {
    "id": "communications",
    "label": "communications",
    "source": "enterprise",
    "displayLabel": "Communications",
    "purpose": "Help affected people understand the change, what it asks of them, and where they can respond.",
    "useWhen": "People need timely context to participate or prepare for a changed way of working.",
    "question": "What does this audience need to understand or do next, and where can they ask for help?",
    "example": "Explain the pilot's request-handoff process, when it starts, what participants will try, and how their feedback will shape the next revision.",
    "sessionLabel": "Prepare a clear explanation and response route",
    "bring": [
      "The audience, intended change, practical implications, timing, and a person who can receive questions."
    ],
    "leaveWith": "A clear message and response route suited to the people receiving it.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "collaborative-prototypes",
    "label": "Collaborative prototypes",
    "source": "core",
    "displayLabel": "Collaborative prototypes",
    "purpose": "Let people try a proposed workflow together and use what happens to improve it.",
    "useWhen": "A bounded rehearsal would reveal more than another description of the proposed experience.",
    "question": "What changes when people try this task together?",
    "example": "Rehearse a request handoff with role cards and a simple queue, then revise the step where participants need clarification.",
    "sessionLabel": "Try the proposed workflow together",
    "bring": [
      "A useful task, a small representation of the workflow, and participants who can explain the consequences."
    ],
    "leaveWith": "Observed interactions and a focused revision to the proposed work.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/participatory-design-kit-chimeric-prototype-v0.1.4.html",
      "label": "Explore a participatory workflow example"
    }
  },
  {
    "id": "training-enablement",
    "label": "training / enablement",
    "source": "enterprise",
    "displayLabel": "Training and enablement",
    "purpose": "Give people the knowledge, practice, and support they need to carry out the changed work.",
    "useWhen": "A new responsibility or procedure requires preparation before people can use it confidently.",
    "question": "What must people be able to do, and what practice or support will help them do it?",
    "example": "Let a coordinator practice assigning and recovering a request using a representative case, with feedback and a named support contact.",
    "sessionLabel": "Prepare people to carry out the changed work",
    "bring": [
      "The actual task, current knowledge, required support, and an observable practice attempt."
    ],
    "leaveWith": "Useful practice materials and a support route for the conditions people encounter.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "recovery-routing-atlas",
    "label": "Recovery Routing Atlas",
    "source": "core",
    "displayLabel": "Recovery Routing Atlas",
    "purpose": "Connect a strained working situation to the smallest useful way to restore progress.",
    "useWhen": "The collaboration needs a clear next step after confusion, misalignment, or interrupted work.",
    "question": "What is the smallest useful method that can restore the desired state?",
    "example": "When teams describe the pilot differently, return to its purpose and objectives before adding another coordination session.",
    "sessionLabel": "Choose a useful route back to progress",
    "bring": [
      "An observable strain cue, the desired working state, and the current context."
    ],
    "leaveWith": "A reasoned recovery route and the specific condition it should restore.",
    "sourceNote": "Method guidance adapted from the Recovery Routing Atlas prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "recovery-routing-atlas",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/recovery-routing-atlas-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/recovery-routing-atlas-chimeric-prototype-v0.1.5.html",
      "label": "Open Recovery Routing Atlas"
    }
  },
  {
    "id": "upstream-revision-loop",
    "label": "Upstream Revision Loop",
    "source": "core",
    "displayLabel": "Upstream Revision Loop",
    "purpose": "Use new evidence to revise the earlier assumption or planning artifact it changes.",
    "useWhen": "Implementation, testing, or lived experience improves the team's earlier understanding.",
    "question": "Which earlier assumption or artifact does this evidence improve?",
    "example": "A pilot reveals that approval belongs with the receiving team. Revise that ownership assumption in the workflow and record the observation that changed it.",
    "sessionLabel": "Revise the plan using what the team learned",
    "bring": [
      "The new evidence, the earlier artifact, its previous meaning, and the proposed revision."
    ],
    "leaveWith": "A focused revision with its reason, previous state, and next receiving task preserved.",
    "sourceNote": "Method guidance adapted from the Upstream Revision Loop prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "upstream-revision-loop",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/upstream-revision-loop-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/upstream-revision-loop-chimeric-prototype-v0.1.5.html",
      "label": "Open Upstream Revision Loop"
    }
  },
  {
    "id": "pattern-problem-surface-matrix",
    "label": "Pattern–Problem Surface Matrix",
    "source": "core",
    "displayLabel": "Pattern–Problem Surface Matrix",
    "purpose": "Examine whether a design pattern helps with the actual problem different people experience.",
    "useWhen": "A familiar pattern is being proposed and its fit needs to be examined across affected roles.",
    "question": "Which problem does this pattern address for each affected group?",
    "example": "Examine a shared request queue from the coordinator's, receiving team's, accessibility reviewer's, and maintainer's perspectives before accepting it.",
    "sessionLabel": "Check how a design pattern fits the work",
    "bring": [
      "The proposed pattern, the local problem, and the people who would use, build, review, or support it."
    ],
    "leaveWith": "A role-aware account of where the pattern fits and what needs further investigation.",
    "sourceNote": "Method guidance adapted from the Pattern–Problem Surface Matrix prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "pattern-problem-surface-matrix",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/pattern-problem-surface-matrix-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/pattern-problem-surface-matrix-chimeric-prototype-v0.1.5.html",
      "label": "Open Pattern–Problem Surface Matrix"
    }
  },
  {
    "id": "context-tree",
    "label": "Context Tree",
    "source": "core",
    "displayLabel": "Context Tree",
    "purpose": "Clarify what each role needs to know to act and coordinate with others.",
    "useWhen": "The team has identified the people involved and needs to make their working context explicit.",
    "question": "What does this group need to know to act confidently and in coordination with others?",
    "example": "Compare the context a request coordinator, specialist, and reviewer need when a request changes owner.",
    "sessionLabel": "Clarify the context each role needs",
    "bring": [
      "Roles or groups, their relationships, context questions, and current knowledge."
    ],
    "leaveWith": "A role-by-context map with open questions and useful routes for clarification.",
    "sourceNote": "Method guidance adapted from the Context Tree prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "context-tree",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/context-tree-chimeric-prototype-v0.1.7.html",
      "sourceVersion": "0.1.7",
      "receivingVersion": "0.1.7"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/context-tree-chimeric-prototype-v0.1.7.html",
      "label": "Open Context Tree"
    }
  },
  {
    "id": "process-mapping",
    "label": "process mapping",
    "source": "enterprise",
    "displayLabel": "Process mapping",
    "purpose": "Make the actual sequence of work, decisions, waits, and handoffs visible.",
    "useWhen": "People need to understand how work moves before deciding what should change.",
    "question": "Where does this work go next, and what must be true for it to continue?",
    "example": "Follow a request from intake through assignment, review, resolution, and follow-up; identify who accepts each handoff.",
    "sessionLabel": "Map the workflow and its handoffs",
    "bring": [
      "A representative case, the people involved, and the steps and decisions it passes through."
    ],
    "leaveWith": "A shared workflow with clear ownership and specific places to improve.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/service-design-blueprint-chimeric-prototype-v0.2.6.html",
      "label": "Explore a service blueprint example"
    }
  },
  {
    "id": "data-integration-work",
    "label": "data / integration work",
    "source": "enterprise",
    "displayLabel": "Data and integration work",
    "purpose": "Agree how information moves between systems while preserving its meaning and ownership.",
    "useWhen": "The changed workflow depends on records, identifiers, or updates shared across systems.",
    "question": "What must the receiving system know, and how will people recognize and recover an incomplete transfer?",
    "example": "Trace a request identifier and owner update between intake and assignment, including how the team reconciles a delayed update.",
    "sessionLabel": "Agree how shared information will move",
    "bring": [
      "The source and receiving records, identifiers, expected updates, and people responsible for reconciliation."
    ],
    "leaveWith": "An explicit exchange agreement with validation, error handling, and reconciliation needs.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "heart",
    "label": "HEART",
    "source": "core",
    "displayLabel": "HEART Chart",
    "purpose": "Connect an experience goal to signals, measures, and the evidence that could change their interpretation.",
    "useWhen": "The team needs to understand what observations or metrics say about the experience.",
    "question": "What signal is this measure approximating, and what could make it misleading?",
    "example": "Pair request-resolution time with participants' account of handoff clarity so a faster process can be examined for hidden support costs.",
    "sessionLabel": "Connect experience goals to useful evidence",
    "bring": [
      "A goal, a signal, a candidate measure, a qualitative companion, and possible counter-signals."
    ],
    "leaveWith": "A measurement plan that preserves the goal, interpretation, and limits of each measure.",
    "sourceNote": "Method guidance adapted from the HEART Chart prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "heart-chart",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/heart-chart-chimeric-prototype-v0.1.6.html",
      "sourceVersion": "0.1.6",
      "receivingVersion": "0.1.6"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/heart-chart-chimeric-prototype-v0.1.6.html",
      "label": "Open HEART Chart"
    }
  },
  {
    "id": "plus-delta",
    "label": "Plus–Delta",
    "source": "core",
    "displayLabel": "Plus–Delta",
    "purpose": "Separate what is working from what should change, then connect the change to its goal.",
    "useWhen": "A session, prototype, review, or completed task offers evidence for a focused improvement.",
    "question": "What is working, what should change, and which goal does that change support?",
    "example": "Preserve the clear request summary; revise the handoff confirmation because the next owner could not tell when responsibility transferred.",
    "sessionLabel": "Agree what to preserve and what to improve",
    "bring": [
      "Concrete observations, the relevant goal, and the people who can explain the experience."
    ],
    "leaveWith": "A preserve/change review with a useful next action for each accepted observation.",
    "sourceNote": "Method guidance adapted from the Plus / Delta prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "plus-delta",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/plus-delta-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/plus-delta-chimeric-prototype-v0.1.5.html",
      "label": "Open Plus / Delta"
    }
  },
  {
    "id": "specification-by-example",
    "label": "Specification by Example",
    "source": "core",
    "displayLabel": "Specification by Example",
    "purpose": "Turn an agreed rule into concrete examples of context, event, and observable outcome.",
    "useWhen": "People agree in principle and need to make the expected behavior precise enough to build or review.",
    "question": "Given this context, when this event happens, what should a person be able to observe?",
    "example": "Given an assigned request, when its owner becomes unavailable, then the coordinator can see the retained responsibility and choose a new receiving owner.",
    "sessionLabel": "Describe the behavior through concrete examples",
    "bring": [
      "A rule, representative situations, an event or action, and the outcome people should observe."
    ],
    "leaveWith": "Accepted Given / When / Then examples that can guide implementation and tests.",
    "sourceNote": "Method guidance adapted from the Specification-by-Example prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "specification-by-example",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/specification-by-example-chimeric-prototype-v0.1.7.html",
      "sourceVersion": "0.1.7",
      "receivingVersion": "0.1.7"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/specification-by-example-chimeric-prototype-v0.1.7.html",
      "label": "Open Specification-by-Example"
    }
  },
  {
    "id": "unit-test-first",
    "label": "Unit-test-first",
    "source": "core",
    "displayLabel": "Unit-test-first Design",
    "purpose": "Protect an important business rule with an executable check before changing the surrounding system.",
    "useWhen": "A redesign, refactor, or implementation could change behavior people rely on.",
    "question": "Which important behavior should remain trustworthy as the system changes?",
    "example": "Protect the rule that a request retains one accountable owner while a new owner is being proposed.",
    "sessionLabel": "Protect the behavior people rely on",
    "bring": [
      "The consequential rule, a representative example, and an independently stated expected result."
    ],
    "leaveWith": "A focused check that distinguishes the required behavior from a plausible error.",
    "sourceNote": "Method guidance adapted from the Unit-test-first Design prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "unit-test-first-design",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/unit-test-first-design-chimeric-prototype-v0.1.5.html",
      "sourceVersion": "0.1.5",
      "receivingVersion": "0.1.5"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/unit-test-first-design-chimeric-prototype-v0.1.5.html",
      "label": "Open Unit-test-first Design"
    }
  },
  {
    "id": "jtbd-treemap",
    "label": "JTBD Treemap",
    "source": "core",
    "displayLabel": "Jobs-to-be-Done Treemap",
    "purpose": "Compare work by its consequence for the larger purpose.",
    "useWhen": "The team can name many jobs or support needs and needs a useful basis for directing attention.",
    "question": "Which jobs carry the greatest consequence for this purpose, and what supports their weight?",
    "example": "Compare assigning an owner, recording a resolution, and formatting a report by their consequence for reliable request handling.",
    "sessionLabel": "Prioritize work by its consequence",
    "bring": [
      "The overall purpose, specific jobs, one stated weighting basis, and evidence for the relative weights."
    ],
    "leaveWith": "A purpose-weighted view whose job descriptions and reasons remain inspectable.",
    "sourceNote": "Method guidance adapted from the Jobs-to-be-Done Treemap prototype.",
    "provenance": {
      "kind": "prototype-adaptation",
      "semanticId": "jobs-to-be-done-treemap",
      "sourcePath": "core-architectures-chimeric-prototype-current-pack-v0.1/jobs-to-be-done-treemap-chimeric-prototype-v0.1.4.html",
      "sourceVersion": "0.1.4",
      "receivingVersion": "0.1.4"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/jobs-to-be-done-treemap-chimeric-prototype-v0.1.4.html",
      "label": "Open Jobs-to-be-Done Treemap"
    }
  },
  {
    "id": "qa-validation",
    "label": "QA / validation",
    "source": "enterprise",
    "displayLabel": "QA and validation",
    "purpose": "Check whether the proposed work behaves as required in the conditions that matter.",
    "useWhen": "The team needs evidence before accepting a change or expanding its use.",
    "question": "Which observation would demonstrate that this requirement holds for its intended use?",
    "example": "Exercise request assignment, review, and recovery with representative participants and inspect the expected outcomes before expanding the pilot.",
    "sessionLabel": "Verify the conditions needed for acceptance",
    "bring": [
      "Acceptance conditions, consequential risks, representative cases, and an accountable reviewer."
    ],
    "leaveWith": "An evidence-backed acceptance decision with any remaining conditions made clear.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/specification-by-example-chimeric-prototype-v0.1.7.html",
      "label": "Explore concrete behavior examples"
    }
  },
  {
    "id": "narrative-capsules",
    "label": "Narrative Capsules",
    "source": "core",
    "displayLabel": "Narrative Capsules",
    "purpose": "Prepare a compact handoff that preserves settled decisions, open questions, boundaries, and the next useful action.",
    "useWhen": "Another person, team, or AI session needs enough selected context to continue the work.",
    "question": "What does the receiver need to continue this task responsibly?",
    "example": "Prepare a pilot handoff containing the agreed ownership rule, the open approval question, the receiving reviewer, and the decision the next session should return.",
    "sessionLabel": "Prepare a useful handoff for the next collaborator",
    "bring": [
      "Accepted state, source standing, open questions, the receiving task, and the context it needs."
    ],
    "leaveWith": "A targeted handoff with its source context, useful gaps, and return expectations visible.",
    "sourceNote": "Guidance adapted from the Narrative Capsule Composer.",
    "provenance": {
      "kind": "prototype-adaptation",
      "sourcePath": "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsules-chimeric-prototype-v0.1.html",
      "sourceVersion": "0.1",
      "semanticId": "narrative-capsule-composer",
      "receivingVersion": "0.1"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsules-chimeric-prototype-v0.1.html",
      "label": "Open the Narrative Capsule Composer"
    }
  },
  {
    "id": "coordination-horizons",
    "label": "Coordination Horizons",
    "source": "core",
    "displayLabel": "Coordination Horizons",
    "purpose": "Distinguish active work, prepared next steps, and possibilities to revisit later.",
    "useWhen": "The collaboration spans several phases and people need to know what deserves attention now.",
    "question": "What can we act on now, what should be prepared next, and what condition would bring later work forward?",
    "example": "Keep the service pilot active now, prepare a review of its handoffs next, and retain a wider rollout for the evidence-based expansion decision.",
    "sessionLabel": "Agree what happens now, next, and later",
    "bring": [
      "The current commitment, likely next actions, deferred possibilities, and their reopening conditions."
    ],
    "leaveWith": "A Now / Next / Later view with clear continuation and review conditions.",
    "sourceNote": "Guidance adapted from the Threadkeeping Ledger's Now / Next / Later view.",
    "provenance": {
      "kind": "reading-adaptation",
      "sourcePath": "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1/threadkeeping-ledger-chimeric-prototype-v0.1.html",
      "sourceVersion": "0.1"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/metadata-blocks.html",
      "fragment": "threadkeeping-title",
      "label": "Explore coordination and threadkeeping"
    }
  },
  {
    "id": "threadkeeping",
    "label": "threadkeeping",
    "source": "core",
    "displayLabel": "Threadkeeping",
    "purpose": "Preserve decisions, reasons, open questions, and a useful place to resume.",
    "useWhen": "Work continues across sessions, tools, branches, or collaborators.",
    "question": "What will a future collaborator need to continue this work?",
    "example": "Record why the pilot uses explicit handoff acceptance, which approval question remains open, and who should examine the next request example.",
    "sessionLabel": "Preserve decisions and a clear continuation",
    "bring": [
      "Material decisions, why they changed, evidence, provisional states, and the next receiving task."
    ],
    "leaveWith": "A small maintained record that lets the next collaborator continue from current understanding.",
    "sourceNote": "Guidance adapted from the Threadkeeping Ledger.",
    "provenance": {
      "kind": "prototype-adaptation",
      "sourcePath": "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1/threadkeeping-ledger-chimeric-prototype-v0.1.html",
      "sourceVersion": "0.1",
      "semanticId": "threadkeeping-ledger",
      "receivingVersion": "0.1"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/metadata-blocks.html",
      "fragment": "threadkeeping-title",
      "label": "Explore threadkeeping"
    }
  },
  {
    "id": "interstitial-compression",
    "label": "Interstitial Compression",
    "source": "core",
    "displayLabel": "Interstitial Compression",
    "purpose": "Condense the context between working sessions while keeping the next decision understandable.",
    "useWhen": "A pause or handoff needs a shorter working account of the material state and unresolved questions.",
    "question": "What context must travel so the next session can make a sound decision?",
    "example": "Summarize the changed handoff rule and its reason, retain the open approval question, and link the representative request that prompted the change.",
    "sessionLabel": "Prepare concise context for the next session",
    "bring": [
      "The current purpose, material changes, decisions, open questions, source references, and next action."
    ],
    "leaveWith": "A concise continuation note with a route back to the details that support it.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/metadata-blocks.html",
      "fragment": "threadkeeping-title",
      "label": "Read about carrying context between sessions"
    }
  },
  {
    "id": "campaign-shapes",
    "label": "Campaign Shapes",
    "source": "core",
    "displayLabel": "Campaign Shapes",
    "purpose": "Make phase openings, closures, pauses, and alternative continuations explicit.",
    "useWhen": "Work spans several horizons or groups and the next route depends on a review or changed condition.",
    "question": "What opens or closes this phase, and which continuation becomes available afterward?",
    "example": "After the pilot review, choose between expanding the service, revising the ownership approach, or pausing for missing evidence, with a named first action for each route.",
    "sessionLabel": "Plan the phases and their possible continuations",
    "bring": [
      "The phases, participating groups, decision conditions, and possible continuations."
    ],
    "leaveWith": "A phase plan that names when work changes state and what each receiving group does next.",
    "sourceNote": "Guidance adapted from the local reading on phases and possible continuations.",
    "provenance": {
      "kind": "reading-adaptation",
      "sourcePath": "context-canvas-project-surface/context-canvas/ai-systems.html",
      "sourceFragment": "registry-readings-title"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/ai-systems.html",
      "fragment": "registry-readings-title",
      "label": "Read about phase changes and continuations"
    }
  },
  {
    "id": "recovery-routing",
    "label": "Recovery Routing",
    "source": "core",
    "displayLabel": "Recovery Routing",
    "purpose": "Return to a sound working position and agree who can authorize the next action.",
    "useWhen": "Interrupted work or changed evidence requires a deliberate recovery decision.",
    "question": "What can we safely retain, where should we resume, and who decides?",
    "example": "When a receiving team becomes unavailable, retain the accepted requests and ask the coordinator to approve a bounded reassignment plan.",
    "sessionLabel": "Agree a recovery action and its decision owner",
    "bring": [
      "The last sound state, useful work to preserve, the affected decision, and the responsible person."
    ],
    "leaveWith": "An authorized recovery action with a clear scope and continuation.",
    "sourceNote": "Guidance adapted from the local reading on recovery and decision authority.",
    "provenance": {
      "kind": "reading-adaptation",
      "sourcePath": "context-canvas-project-surface/context-canvas/ai-systems.html",
      "sourceFragment": "registry-readings-title"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/ai-systems.html",
      "fragment": "registry-readings-title",
      "label": "Read about recovery and decision authority"
    }
  },
  {
    "id": "runbooks-support",
    "label": "runbooks / support",
    "source": "enterprise",
    "displayLabel": "Runbooks and support",
    "purpose": "Give people a practical route for ordinary operation, help, and recovery.",
    "useWhen": "The changed practice needs support after its initial introduction.",
    "question": "What will the person carrying out this task need when the usual path changes?",
    "example": "Write the steps for checking request ownership and recovering a delayed handoff, with the support owner and conditions for escalation.",
    "sessionLabel": "Prepare operating guidance and support",
    "bring": [
      "The recurring task, prerequisites, expected results, support contacts, and recovery conditions."
    ],
    "leaveWith": "Usable operating guidance with a clear help route and responsible maintainer.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "post-release-learning",
    "label": "post-release learning",
    "source": "enterprise",
    "displayLabel": "Post-release learning",
    "purpose": "Use experience after introduction to decide what to preserve, improve, or investigate next.",
    "useWhen": "The changed practice is in use and its consequences can be observed.",
    "question": "What has use taught us, and what should that change about our next commitment?",
    "example": "Review the pilot's handoff observations and participant feedback before deciding whether to expand, revise, or continue the bounded pilot.",
    "sessionLabel": "Use experience to shape the next commitment",
    "bring": [
      "The original expectations, actual observations, participant feedback, and current operating conditions."
    ],
    "leaveWith": "A reasoned next decision tied to what the team has learned.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/plus-delta-chimeric-prototype-v0.1.5.html",
      "label": "Explore a preserve and change review"
    }
  },
  {
    "id": "provenance-register",
    "label": "Provenance Register",
    "source": "core",
    "displayLabel": "Provenance Register",
    "purpose": "Keep important claims and decisions connected to their sources, authors, and review history.",
    "useWhen": "People need to understand where an account came from and what gives it standing.",
    "question": "Where did this claim come from, and who has reviewed or accepted it?",
    "example": "Keep the pilot's ownership assumption connected to its participant observation and the decision owner who accepted the revised rule.",
    "sessionLabel": "Connect important claims to their sources",
    "bring": [
      "The claim or decision, its source, the responsible contributor, and any review or revision."
    ],
    "leaveWith": "An inspectable record of origin and authority that travels with the material it explains.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/metadata-blocks.html",
      "fragment": "scan-contract-title",
      "label": "Read about source and claim context"
    }
  },
  {
    "id": "value-origin-vocabulary",
    "label": "value-origin vocabulary",
    "source": "core",
    "displayLabel": "Value-origin vocabulary",
    "purpose": "Use clear labels for where planning values came from and how people should interpret them.",
    "useWhen": "A plan combines authored examples, estimates, calculations, or observed results.",
    "question": "Is this value an example, an estimate, a calculation, or an observation, and what does that allow us to conclude?",
    "example": "Describe session duration as a planning estimate and investment as a calculation from those estimates; retain observed pilot duration separately when it becomes available.",
    "sessionLabel": "Clarify where planning values come from",
    "bring": [
      "The important values, their origins, assumptions, and intended use."
    ],
    "leaveWith": "Agreed wording that preserves the standing of each value when the plan is shared.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  },
  {
    "id": "claim-labels",
    "label": "claim labels",
    "source": "core",
    "displayLabel": "Claim labels",
    "purpose": "Make the standing of a statement clear to the person using it.",
    "useWhen": "Observations, assumptions, proposals, and accepted decisions appear together.",
    "question": "What kind of claim is this, and what evidence or authority supports it?",
    "example": "Label the expected improvement in handoff clarity as a hypothesis, the pilot result as an observation, and the rollout choice as a decision.",
    "sessionLabel": "Clarify the standing of important statements",
    "bring": [
      "The statements that matter, their evidence, and the people who can review or accept them."
    ],
    "leaveWith": "Clearly distinguished observations, assumptions, proposals, and decisions with useful review routes.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/metadata-blocks.html",
      "fragment": "scan-contract-title",
      "label": "Read about the standing of claims"
    }
  },
  {
    "id": "version-history",
    "label": "version history",
    "source": "core",
    "displayLabel": "Version history",
    "purpose": "Keep meaningful changes and their reasons available as the plan develops.",
    "useWhen": "People need to understand which decision changed and recover or compare an earlier state.",
    "question": "What changed, why did it change, and when should the earlier decision be revisited?",
    "example": "Preserve the original pilot arrangement beside a revised handoff plan, including the evidence that prompted the new receiving-team responsibility.",
    "sessionLabel": "Record the change and the reason behind it",
    "bring": [
      "The earlier state, accepted revision, reason, and evidence or decision that prompted it."
    ],
    "leaveWith": "A readable change history that supports comparison and informed recovery.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": {
      "path": "context-canvas-project-surface/context-canvas/metadata-blocks.html",
      "fragment": "threadkeeping-title",
      "label": "Read about decisions and revision"
    }
  },
  {
    "id": "risk-review",
    "label": "risk review",
    "source": "enterprise",
    "displayLabel": "Risk review",
    "purpose": "Examine consequential uncertainties and decide what support or evidence they require.",
    "useWhen": "A decision depends on conditions whose consequences need explicit consideration.",
    "question": "What could materially change the outcome, and what should we do or learn before committing?",
    "example": "Examine how the pilot would continue if its specialist became unavailable, then agree a response owner and the condition for pausing new requests.",
    "sessionLabel": "Review consequential uncertainties and responses",
    "bring": [
      "The proposed decision, affected people, uncertain conditions, and practical response options."
    ],
    "leaveWith": "A reasoned decision with specific mitigations, owners, and review conditions.",
    "sourceNote": "Planning guidance authored for this Studio suggestion.",
    "provenance": {
      "kind": "studio-guidance",
      "sourcePath": "collaboration/native-investment-studio/change-methods.mjs",
      "basisPath": "collaboration/native-investment-studio/change-models.mjs"
    },
    "readingRoute": null
  }
]);
const byId = new Map(methods.map(method => [method.id, method]));

export function getChangeMethod(id) {
  return typeof id === 'string' ? byId.get(id) ?? null : null;
}

export function listChangeMethods() { return methods; }
