export type FormGenerationCategory = {
  name: string
  types: string[]
}

const FIELD_OPTION_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['label', 'value'],
  additionalProperties: false,
}

/**
 * Category/type enums are built per request from the DB (FieldCategory/FieldType), so the
 * schema always matches whatever domain values are currently seeded instead of a hardcoded list.
 */
export function buildFormGenerationSchema(categories: FormGenerationCategory[]): Record<string, unknown> {
  const categoryNames = categories.map(category => category.name)
  const typeNames = categories.flatMap(category => category.types)

  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  category: { type: 'string', enum: categoryNames },
                  type: { type: 'string', enum: typeNames },
                  required: { type: 'boolean' },
                  options: { type: 'array', items: FIELD_OPTION_SCHEMA },
                },
                required: ['label', 'category', 'type', 'required', 'options'],
                additionalProperties: false,
              },
            },
          },
          required: ['title', 'description', 'fields'],
          additionalProperties: false,
        },
      },
    },
    required: ['title', 'description', 'sections'],
    additionalProperties: false,
  }
}

export function buildFormGenerationSystemPrompt(categories: FormGenerationCategory[]): string {
  const domainList = categories.map(category => `- "${category.name}": ${category.types.map(type => `"${type}"`).join(', ')}`).join('\n')

  return [
    'You generate the structure of a dynamic form from a user prompt written in natural language (usually Portuguese).',
    'Respond only with the JSON object described by the provided schema — no prose, no markdown fences.',
    '',
    'Rules:',
    '- "category" and "type" must be exactly one of the values listed below. Never invent a category or type that is not listed.',
    '- "type" must belong to the "category" chosen for that field.',
    '- Only fields whose category groups choice-based inputs may have non-empty "options". For every other field, "options" must be an empty array.',
    '- When a field has options, provide at least two, each with a short human-readable "label" and a url-safe "value".',
    '- Split the form into one or more logical sections. If the prompt does not suggest a natural grouping, return a single section with an empty "title" and "description".',
    '- "required" reflects whether the field is mandatory for the form to be considered answered; default to true unless the prompt implies it is optional.',
    '- Keep "title"/"description" of the form and of each section concise and written in the same language as the user prompt.',
    '',
    'Available categories and types:',
    domainList,
  ].join('\n')
}
