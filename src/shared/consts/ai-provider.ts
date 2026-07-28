export const AI_PROVIDER = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  DEEPSEEK: 'deepseek',
}

export const AI_API_KEY_PATTERN: Record<string, RegExp> = {
  [AI_PROVIDER.OPENAI]: /^sk-[A-Za-z0-9_-]{20,250}$/,
  [AI_PROVIDER.ANTHROPIC]: /^sk-ant-[A-Za-z0-9_-]{20,250}$/,
  [AI_PROVIDER.GOOGLE]: /^AIza[A-Za-z0-9_-]{30,250}$/,
  [AI_PROVIDER.DEEPSEEK]: /^sk-[A-Za-z0-9]{20,250}$/,
}
