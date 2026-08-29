/* Strategy Canvas published-schema validator runtime.
   Generated with the exact Draft 2020-12 schema by build.mjs. */
(function exposeStrategyCanvasSchemaValidator(global) {
  'use strict';

  const PUBLISHED_SCHEMA = /*__STRATEGY_CANVAS_SCHEMA__*/ null;
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
    version: '0.2.1',
    schemaId: PUBLISHED_SCHEMA.$id,
    validate
  });
})(typeof window !== 'undefined' ? window : globalThis);
