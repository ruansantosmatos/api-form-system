import * as bcrypt from 'bcrypt'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SecurityService {
  private readonly SALT_ROUNDS = 10

  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.SALT_ROUNDS)
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash)
  }
}
