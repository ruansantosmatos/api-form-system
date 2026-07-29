import { AiProviderError } from '../providers/ai-provider.error'
import {
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common'

@Injectable()
export class AiProviderErrorService {
  toHttpException(error: unknown): HttpException {
    if (!(error instanceof AiProviderError)) return new InternalServerErrorException('Unexpected error while calling the AI provider')

    switch (error.kind) {
      case 'auth':
        return new BadRequestException(error.message)
      case 'rate_limit':
        return new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS)
      case 'invalid_output':
        return new UnprocessableEntityException(error.message)
      case 'timeout':
        return new GatewayTimeoutException(error.message)
      case 'insufficient_balance':
        return new HttpException(error.message, HttpStatus.PAYMENT_REQUIRED)
      default:
        return new InternalServerErrorException(error.message)
    }
  }
}
