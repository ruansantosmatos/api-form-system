import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from 'src/generated/prisma/client'

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string)

export const prismaClient = new PrismaClient({ adapter: adapter })
