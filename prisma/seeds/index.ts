import { prismaClient } from './config/prisma-client'
import { categoriesAndTypes } from './seed/categories-and-types'

async function main() {
  try {
    await categoriesAndTypes()
    await prismaClient.$disconnect()
  } catch (error) {
    console.error('Seed failed:', error)
    await prismaClient.$disconnect()
    process.exit(1)
  }
}

main()
