/* Strategy Canvas published-schema validator runtime.
   Generated with the exact Draft 2020-12 schema by build.mjs. */
(function exposeStrategyCanvasSchemaValidator(global) {
  'use strict';

  const PUBLISHED_SCHEMA = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://schemas.radiantnull.com/core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas.schema.json","title":"Strategy Canvas collaboration state","description":"Closed canonical state with an explicit namespace for compatible collaboration extensions.","type":"object","required":["schemaVersion","meta","method","scale","dimensions","view","lifecycle","extensions"],"properties":{"schemaVersion":{"const":"strategy-canvas/2.0"},"meta":{"$ref":"#/$defs/meta"},"method":{"$ref":"#/$defs/method"},"scale":{"$ref":"#/$defs/scale"},"dimensions":{"type":"array","minItems":1,"maxItems":24,"items":{"$ref":"#/$defs/dimension"}},"view":{"$ref":"#/$defs/view"},"lifecycle":{"$ref":"#/$defs/lifecycle"},"extensions":{"$ref":"#/$defs/extensions"}},"additionalProperties":false,"$defs":{"id":{"type":"string","minLength":1,"maxLength":96,"pattern":"^[a-z][a-z0-9-]*$"},"meta":{"type":"object","required":["id","title","subtitle","decisionObject","horizon","revision"],"properties":{"id":{"$ref":"#/$defs/id"},"title":{"type":"string","minLength":1,"maxLength":160},"subtitle":{"type":"string","maxLength":360},"decisionObject":{"type":"string","maxLength":240},"horizon":{"type":"string","maxLength":160},"revision":{"type":"integer","minimum":1}},"additionalProperties":false},"method":{"type":"object","required":["posture","scoreMeaning","weightMeaning"],"properties":{"posture":{"enum":["internal-collaboration","market-strategy"]},"scoreMeaning":{"type":"string","minLength":1,"maxLength":500},"weightMeaning":{"type":"string","minLength":1,"maxLength":500}},"additionalProperties":false},"scale":{"type":"object","required":["min","max","step","lowLabel","middleLabel","highLabel"],"properties":{"min":{"type":"number","minimum":0,"maximum":100},"max":{"type":"number","exclusiveMinimum":0,"maximum":100},"step":{"type":"number","exclusiveMinimum":0,"maximum":10},"lowLabel":{"type":"string","minLength":1,"maxLength":160},"middleLabel":{"type":"string","minLength":1,"maxLength":160},"highLabel":{"type":"string","minLength":1,"maxLength":160}},"additionalProperties":false},"anchors":{"type":"object","required":["low","middle","high"],"properties":{"low":{"type":"string","minLength":1,"maxLength":600},"middle":{"type":"string","minLength":1,"maxLength":600},"high":{"type":"string","minLength":1,"maxLength":600}},"additionalProperties":false},"scores":{"type":"object","required":["current","goodEnough","desired"],"properties":{"current":{"type":"number"},"goodEnough":{"type":"number"},"desired":{"type":"number"}},"additionalProperties":false},"dimension":{"type":"object","required":["id","label","definition","anchors","scores","consequenceWeight","action","evidenceBasis"],"properties":{"id":{"$ref":"#/$defs/id"},"label":{"type":"string","minLength":1,"maxLength":120},"definition":{"type":"string","minLength":1,"maxLength":900},"anchors":{"$ref":"#/$defs/anchors"},"scores":{"$ref":"#/$defs/scores"},"consequenceWeight":{"type":"integer","minimum":0,"maximum":5},"action":{"enum":["eliminate","reduce","raise","create","hold","open"]},"evidenceBasis":{"type":"string","maxLength":1200}},"additionalProperties":false},"view":{"type":"object","required":["dimensionOrder","selectedDimensionId","mode"],"properties":{"dimensionOrder":{"type":"array","items":{"$ref":"#/$defs/id"},"uniqueItems":true},"selectedDimensionId":{"$ref":"#/$defs/id"},"mode":{"enum":["working","presentation"]}},"additionalProperties":false},"reviewedSnapshot":{"type":"object","required":["schemaVersion","meta","method","scale","dimensions","view","extensions"],"properties":{"schemaVersion":{"const":"strategy-canvas/2.0"},"meta":{"$ref":"#/$defs/meta"},"method":{"$ref":"#/$defs/method"},"scale":{"$ref":"#/$defs/scale"},"dimensions":{"type":"array","minItems":1,"maxItems":24,"items":{"$ref":"#/$defs/dimension"}},"view":{"$ref":"#/$defs/view"},"extensions":{"$ref":"#/$defs/extensions"}},"additionalProperties":false},"lifecycle":{"type":"object","required":["status","reviewedSnapshot","reviewedBy","reviewNote","reviewedAt"],"properties":{"status":{"enum":["working","reviewed"]},"reviewedSnapshot":{"oneOf":[{"$ref":"#/$defs/reviewedSnapshot"},{"type":"null"}]},"reviewedBy":{"type":"string","maxLength":160},"reviewNote":{"type":"string","maxLength":1200},"reviewedAt":{"type":"string","maxLength":64}},"additionalProperties":false},"extensions":{"type":"object","properties":{"contextCanvas":{"$ref":"#/$defs/contextCanvasExtension"},"narrativeProjection":{"type":"object"}},"patternProperties":{"^[a-z][a-zA-Z0-9]*$":{"type":"object"}},"additionalProperties":false},"contextCanvasExtension":{"type":"object","required":["collaboration","aiCollaboration"],"properties":{"collaboration":{"$ref":"#/$defs/collaborationExtension"},"aiCollaboration":{"$ref":"#/$defs/aiCollaborationExtension"}},"additionalProperties":false},"collaborationExtension":{"type":"object","required":["session","participants","rounds","ballots","scenarios","acceptedScenario","notes","reviewedSnapshots","events"],"properties":{"session":{"$ref":"#/$defs/session"},"participants":{"type":"array","items":{"$ref":"#/$defs/participant"}},"rounds":{"type":"array","items":{"$ref":"#/$defs/round"}},"ballots":{"$ref":"#/$defs/ballotLedger"},"scenarios":{"type":"array","items":{"$ref":"#/$defs/scenario"}},"acceptedScenario":{"oneOf":[{"$ref":"#/$defs/acceptedScenario"},{"type":"null"}]},"notes":{"type":"array","items":{"$ref":"#/$defs/note"}},"reviewedSnapshots":{"type":"array","items":{"$ref":"#/$defs/collaborationSnapshot"}},"events":{"type":"array","items":{"$ref":"#/$defs/event"}}},"additionalProperties":false},"session":{"type":"object","required":["phase","decisionReceipt","includeReviewedStateInAI"],"properties":{"phase":{"enum":["orient","define","vote","reveal","shape","act","review","handoff"]},"decisionReceipt":{"type":"string","maxLength":4000},"includeReviewedStateInAI":{"type":"boolean"}},"additionalProperties":false},"participant":{"type":"object","required":["id","alias","role"],"properties":{"id":{"$ref":"#/$defs/id"},"alias":{"type":"string","minLength":1,"maxLength":96},"role":{"type":"string","maxLength":120}},"additionalProperties":false},"round":{"type":"object","required":["id","label","target","status","participantIds","createdAt","revealedAt"],"properties":{"id":{"$ref":"#/$defs/id"},"label":{"type":"string","minLength":1,"maxLength":160},"target":{"enum":["current","goodEnough","desired"]},"status":{"enum":["collecting","revealed"]},"participantIds":{"type":"array","items":{"$ref":"#/$defs/id"},"uniqueItems":true},"createdAt":{"type":"string","maxLength":64},"revealedAt":{"type":["string","null"],"maxLength":64},"sourceScenarioId":{"$ref":"#/$defs/id"},"proposalValues":{"$ref":"#/$defs/valueMap"}},"additionalProperties":false},"valueMap":{"type":"object","propertyNames":{"$ref":"#/$defs/id"},"additionalProperties":{"type":"number"}},"ballotEntry":{"type":"object","required":["participantId","values","status","submittedAt","channel"],"properties":{"participantId":{"$ref":"#/$defs/id"},"values":{"$ref":"#/$defs/valueMap"},"status":{"const":"submitted"},"submittedAt":{"type":"string","maxLength":64},"channel":{"const":"human-ballot"}},"additionalProperties":false},"ballotLedger":{"type":"object","propertyNames":{"$ref":"#/$defs/id"},"additionalProperties":{"type":"object","propertyNames":{"$ref":"#/$defs/id"},"additionalProperties":{"$ref":"#/$defs/ballotEntry"}}},"aggregateReading":{"type":"object","required":["count","mean","median","min","max","range","missing","values"],"properties":{"count":{"type":"integer","minimum":0},"mean":{"type":["number","null"]},"median":{"type":["number","null"]},"min":{"type":["number","null"]},"max":{"type":["number","null"]},"range":{"type":["number","null"]},"missing":{"type":"integer","minimum":0},"values":{"type":"array","items":{"type":"number"}}},"additionalProperties":false},"note":{"type":"object","required":["id","dimensionId","roundId","type","author","body","standing","createdAt"],"properties":{"id":{"$ref":"#/$defs/id"},"dimensionId":{"type":["string","null"],"maxLength":96},"roundId":{"type":["string","null"],"maxLength":96},"type":{"enum":["evidence","observation","assumption","question","dissent","decision","follow-up","ai-proposal"]},"author":{"type":"string","minLength":1,"maxLength":120},"body":{"type":"string","minLength":1,"maxLength":4000},"standing":{"enum":["human-authored note","AI-attributed proposal"]},"createdAt":{"type":"string","maxLength":64}},"additionalProperties":false},"scenario":{"type":"object","required":["id","label","target","sourceRoundId","values","status","createdAt"],"properties":{"id":{"$ref":"#/$defs/id"},"label":{"type":"string","minLength":1,"maxLength":120},"target":{"enum":["current","goodEnough","desired"]},"sourceRoundId":{"$ref":"#/$defs/id"},"values":{"$ref":"#/$defs/valueMap"},"status":{"const":"working"},"createdAt":{"type":"string","maxLength":64}},"additionalProperties":false},"acceptedScenario":{"type":"object","required":["id","label","target","sourceRoundId","values","status","createdAt","acceptedAt","standing"],"properties":{"id":{"$ref":"#/$defs/id"},"label":{"type":"string","minLength":1,"maxLength":120},"target":{"enum":["current","goodEnough","desired"]},"sourceRoundId":{"$ref":"#/$defs/id"},"values":{"$ref":"#/$defs/valueMap"},"status":{"const":"carried-to-review"},"createdAt":{"type":"string","maxLength":64},"acceptedAt":{"type":"string","maxLength":64},"standing":{"const":"facilitated working scenario"}},"additionalProperties":false},"collaborationSnapshot":{"type":"object","required":["id","reviewedAt","reviewedBy","receipt","dimensionIds","roundId","aggregates","scenario","noteIds"],"properties":{"id":{"$ref":"#/$defs/id"},"reviewedAt":{"type":"string","maxLength":64},"reviewedBy":{"type":"string","maxLength":160},"receipt":{"type":"string","maxLength":4000},"dimensionIds":{"type":"array","items":{"$ref":"#/$defs/id"},"uniqueItems":true},"roundId":{"type":["string","null"],"maxLength":96},"aggregates":{"type":"object","propertyNames":{"$ref":"#/$defs/id"},"additionalProperties":{"$ref":"#/$defs/aggregateReading"}},"scenario":{"oneOf":[{"$ref":"#/$defs/acceptedScenario"},{"type":"null"}]},"noteIds":{"type":"array","items":{"$ref":"#/$defs/id"},"uniqueItems":true}},"additionalProperties":false},"event":{"type":"object","required":["id","type","at"],"properties":{"id":{"$ref":"#/$defs/id"},"type":{"type":"string","minLength":1,"maxLength":120},"at":{"type":"string","maxLength":64}},"additionalProperties":false},"aiCollaborationExtension":{"type":"object","required":["promptPreparedAt","posture","proposals","proposalNote","standing"],"properties":{"promptPreparedAt":{"type":["string","null"],"maxLength":64},"posture":{"enum":["research","facilitation","loop","cross-platform"]},"proposals":{"$ref":"#/$defs/valueMap"},"proposalNote":{"type":"string","maxLength":4000},"standing":{"const":"AI-attributed proposal"},"networkPolicy":{"const":"local-only"},"consentScope":{"type":"array","items":{"enum":["dimensions","reviewed-scores","aggregates","notes","evidence-bases","scenarios"]},"uniqueItems":true},"reviewedRevision":{"type":["integer","null"],"minimum":1},"shadowRounds":{"type":"array","items":{"$ref":"#/$defs/aiShadowRound"}}},"additionalProperties":false},"aiShadowRound":{"type":"object","required":["id","sourceRoundId","promptPacket","standing","includedInHumanAggregate","createdAt"],"properties":{"id":{"$ref":"#/$defs/id"},"sourceRoundId":{"$ref":"#/$defs/id"},"promptPacket":{"type":"object"},"standing":{"const":"AI shadow round"},"includedInHumanAggregate":{"const":false},"createdAt":{"type":"string","maxLength":64}},"additionalProperties":false}}};
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const codePointLength = (value) => Array.from(value).length;
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const joinPath = (path, key) => /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

  function resolvePointer(pointer) {
    if (!pointer.startsWith('#/')) throw new Error(`Only local schema references are supported: ${pointer}`);
    return pointer.slice(2).split('/').reduce((value, token) => value?.[token.replace(/~1/g, '/').replace(/~0/g, '~')], PUBLISHED_SCHEMA);
  }

  function typeMatches(value, type) {
    if (type === 'null') return value === null;
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return isObject(value);
    if (type === 'integer') return Number.isInteger(value);
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
    return typeof value === type;
  }

  function validateNode(value, schema, path, errors) {
    if (!schema || typeof schema !== 'object') return;
    if (schema.$ref) {
      const target = resolvePointer(schema.$ref);
      if (!target) errors.push(`${path} references an unavailable schema node ${schema.$ref}.`);
      else validateNode(value, target, path, errors);
      return;
    }
    if (Array.isArray(schema.oneOf)) {
      const branches = schema.oneOf.map((candidate) => {
        const branchErrors = [];
        validateNode(value, candidate, path, branchErrors);
        return branchErrors;
      });
      const passing = branches.filter((branchErrors) => branchErrors.length === 0);
      if (passing.length !== 1) errors.push(`${path} must match exactly one published shape.`);
      return;
    }
    if (own(schema, 'const') && !equal(value, schema.const)) errors.push(`${path} must equal ${JSON.stringify(schema.const)}.`);
    if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => equal(value, candidate))) errors.push(`${path} must use a published value.`);

    if (schema.type) {
      const acceptedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!acceptedTypes.some((type) => typeMatches(value, type))) {
        errors.push(`${path} must be ${acceptedTypes.join(' or ')}.`);
        return;
      }
    }

    if (typeof value === 'string') {
      const length = codePointLength(value);
      if (schema.minLength !== undefined && length < schema.minLength) errors.push(`${path} must contain at least ${schema.minLength} character${schema.minLength === 1 ? '' : 's'}.`);
      if (schema.maxLength !== undefined && length > schema.maxLength) errors.push(`${path} must contain at most ${schema.maxLength} characters.`);
      if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) errors.push(`${path} must match ${schema.pattern}.`);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}.`);
      if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be at most ${schema.maximum}.`);
      if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push(`${path} must be greater than ${schema.exclusiveMinimum}.`);
      if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) errors.push(`${path} must be less than ${schema.exclusiveMaximum}.`);
      if (schema.multipleOf !== undefined) {
        const units = value / schema.multipleOf;
        if (Math.abs(units - Math.round(units)) > 1e-8) errors.push(`${path} must be a multiple of ${schema.multipleOf}.`);
      }
    }

    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} must contain at least ${schema.minItems} item${schema.minItems === 1 ? '' : 's'}.`);
      if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} must contain at most ${schema.maxItems} items.`);
      if (schema.uniqueItems) {
        for (let index = 0; index < value.length; index += 1) {
          if (value.slice(0, index).some((candidate) => equal(candidate, value[index]))) {
            errors.push(`${path}[${index}] must be unique.`);
          }
        }
      }
      if (schema.items) value.forEach((item, index) => validateNode(item, schema.items, `${path}[${index}]`, errors));
    }

    if (isObject(value)) {
      (schema.required || []).forEach((key) => {
        if (!own(value, key)) errors.push(`${joinPath(path, key)} is required.`);
      });
      const properties = schema.properties || {};
      const patterns = Object.entries(schema.patternProperties || {}).map(([pattern, contract]) => [new RegExp(pattern), contract]);
      Object.entries(value).forEach(([key, child]) => {
        const childPath = joinPath(path, key);
        if (schema.propertyNames) validateNode(key, schema.propertyNames, `${childPath} (property name)`, errors);
        let matched = false;
        if (own(properties, key)) {
          matched = true;
          validateNode(child, properties[key], childPath, errors);
        }
        patterns.forEach(([pattern, contract]) => {
          if (pattern.test(key)) {
            matched = true;
            validateNode(child, contract, childPath, errors);
          }
        });
        if (!matched) {
          if (schema.additionalProperties === false) errors.push(`${childPath} is outside the published schema.`);
          else if (isObject(schema.additionalProperties)) validateNode(child, schema.additionalProperties, childPath, errors);
        }
      });
    }
  }

  function validate(value) {
    const errors = [];
    validateNode(value, PUBLISHED_SCHEMA, '$', errors);
    return { valid: errors.length === 0, errors };
  }

  global.StrategyCanvasSchemaValidator = Object.freeze({
    version: '0.2.2',
    schemaId: PUBLISHED_SCHEMA.$id,
    validate
  });
})(typeof window !== 'undefined' ? window : globalThis);
