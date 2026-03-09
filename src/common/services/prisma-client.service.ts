import { Injectable } from '@nestjs/common'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../../../prisma/client/client'

@Injectable()
export class PrismaClientService extends PrismaClient {
  constructor() {
    const PORT = parseInt(process.env['PORT'] ?? '3306')
    const HOST = process.env['HOST']

    const adapter = new PrismaMariaDb({ port: PORT, host: HOST })
    super({ adapter })
  }
}
