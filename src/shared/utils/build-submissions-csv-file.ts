import { once } from 'events'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createWriteStream } from 'fs'
import { finished } from 'stream/promises'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'

const BATCH_SIZE = 200

type SubmissionField = { id: number; label: string }

type SubmissionAnswer = {
  field_id: number
  value: string | null
  options: { option: { label: string } }[]
}

type SubmissionRow = {
  id: number
  submitted_at: Date
  respondent: { name: string; email: string } | null
  answers: SubmissionAnswer[]
}

/** Streams a form's submissions into a temp CSV file in batches and returns the file path. */
export async function buildSubmissionsCsvFile(prisma: PrismaClientService, form_id: number): Promise<string> {
  const fields = await prisma.formField.findMany({
    where: { OR: [{ form_id }, { section: { form_id } }] },
    orderBy: { order: 'asc' },
    select: { id: true, label: true },
  })

  const filePath = join(tmpdir(), `form-${form_id}-submissions-${randomUUID()}.csv`)
  const stream = createWriteStream(filePath, { encoding: 'utf8' })

  const headers = ['Usuário', 'Data de Envio', ...dedupeLabels(fields.map(field => field.label))]
  await writeRow(stream, headers, { withBom: true })

  let cursor: number | undefined
  while (true) {
    const submissions = await fetchBatch(prisma, form_id, cursor)
    if (submissions.length === 0) break

    for (const submission of submissions) {
      await writeRow(stream, buildRow(submission, fields), { withBom: false })
    }

    cursor = submissions[submissions.length - 1].id
    if (submissions.length < BATCH_SIZE) break
  }

  stream.end()
  await finished(stream)

  return filePath
}

/** Fetches one page of submissions (with answers) after the given cursor id. */
function fetchBatch(prisma: PrismaClientService, form_id: number, cursor: number | undefined): Promise<SubmissionRow[]> {
  return prisma.formSubmission.findMany({
    where: { form_id },
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'asc' },
    select: {
      id: true,
      submitted_at: true,
      respondent: { select: { name: true, email: true } },
      answers: {
        select: {
          field_id: true,
          value: true,
          options: { select: { option: { select: { label: true } } } },
        },
      },
    },
  })
}

/** Turns one submission into an ordered CSV row: user, submission date, then one cell per field. */
function buildRow(submission: SubmissionRow, fields: SubmissionField[]): string[] {
  const answerByField = new Map(submission.answers.map(answer => [answer.field_id, answer]))

  return [
    submission.respondent ? `${submission.respondent.name} <${submission.respondent.email}>` : 'Anônimo',
    submission.submitted_at.toISOString(),
    ...fields.map(field => formatAnswerValue(answerByField.get(field.id))),
  ]
}

/** Renders one field's answer as text: joined option labels for choice fields, raw value otherwise, empty if unanswered. */
function formatAnswerValue(answer?: SubmissionAnswer): string {
  if (!answer) return ''
  if (answer.options.length) return answer.options.map(option => option.option.label).join('; ')
  return answer.value ?? ''
}

/** Appends " (2)", " (3)", etc. to repeated labels so CSV headers stay unique. */
function dedupeLabels(labels: string[]): string[] {
  const seen = new Map<string, number>()

  return labels.map(label => {
    const count = seen.get(label) ?? 0
    seen.set(label, count + 1)
    return count === 0 ? label : `${label} (${count + 1})`
  })
}

/** Quotes and escapes a value per RFC 4180 if it contains a comma, quote, or newline. */
function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Writes one CSV line (optionally BOM-prefixed for the header) and waits out backpressure. */
async function writeRow(stream: NodeJS.WritableStream, values: string[], { withBom }: { withBom: boolean }): Promise<void> {
  const bom = String.fromCharCode(0xfeff)
  const line = (withBom ? bom : '') + values.map(escapeCsvField).join(',') + '\r\n'
  if (!stream.write(line)) await once(stream, 'drain')
}
