import type { AiProviderErrorKind } from '../interface/ai-generation.interface'

export class AiProviderError extends Error {
  constructor(
    readonly kind: AiProviderErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'AiProviderError'
  }
}
