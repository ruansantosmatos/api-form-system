import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from 'src/generated/prisma/client'

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.PORT_DATABASE || '3306'),
})

export const prismaClient = new PrismaClient({ adapter: adapter })
