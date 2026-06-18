import { prismaClient } from '../config/prisma-client'

const categoryTypes: Record<string, string[]> = {
  Texto: ['Campo Simples', 'Campo Longo'],
  Seleção: ['Multipla Escolha', 'Caixa de Seleção'],
  'Data/Horário': ['Data', 'Hora', 'Data e Hora'],
}

export async function categoriesAndTypes() {
  try {
    const categoryNames = Object.keys(categoryTypes)

    await prismaClient.fieldCategory.createMany({
      data: categoryNames.map(name => ({ name })),
      skipDuplicates: true,
    })

    const categories = await prismaClient.fieldCategory.findMany({
      where: { name: { in: categoryNames } },
    })

    const fieldTypes = categories.flatMap(category =>
      (categoryTypes[category.name] ?? []).map(typeName => ({
        category_id: category.id,
        name: typeName,
      })),
    )

    await prismaClient.fieldType.createMany({
      data: fieldTypes,
      skipDuplicates: true,
    })
  } catch (error) {
    console.error('[categoriesAndTypes] Seed failed:', error)
    throw error
  }
}
