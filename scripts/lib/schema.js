// Minimal JSON Schema validator for pilot's own schemas (draft 2020-12 subset):
// type (incl. arrays of types), enum, required, properties, additionalProperties
// (boolean or schema), items, pattern, minimum. Zero dependencies.
export function validate(schema, value, at = '$') {
  const errors = [];
  const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
  const okType = (t, v) => t === typeOf(v) || (t === 'number' && typeof v === 'number') || (t === 'integer' && Number.isInteger(v));

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(t => okType(t, value))) {
      errors.push(`${at}: expected ${types.join('|')}, got ${typeOf(value)}`);
      return errors;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}: must be one of ${schema.enum.join(', ')}`);
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${at}: does not match ${schema.pattern}`);
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: below minimum ${schema.minimum}`);
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, `${at}[${i}]`)));
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${at}: missing required "${key}"`);
    const props = schema.properties ?? {};
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) errors.push(...validate(props[key], v, `${at}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${at}: unknown property "${key}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') errors.push(...validate(schema.additionalProperties, v, `${at}.${key}`));
    }
  }
  return errors;
}
