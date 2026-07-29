import { Prisma } from 'src/generated/prisma/client'
import type { SubmissionDetailResult } from '../interface/submission.interface'

export const detailInclude = {
  answers: {
    include: {
      field: { select: { id: true, label: true } },
      options: { select: { option_id: true, option: { select: { label: true, value: true } } } },
    },
  },
} satisfies Prisma.FormSubmissionInclude

type SubmissionWithAnswers = {
  id: number
  form_id: number
  respondent_id: number | null
  submitted_at: Date
  answers: {
    id: number
    field_id: number
    value: string | null
    field: { id: number; label: string }
    options: { option_id: number; option: { label: string; value: string } }[]
  }[]
}

export function toDetailResult(submission: SubmissionWithAnswers): SubmissionDetailResult {
  return {
    id: submission.id,
    form_id: submission.form_id,
    respondent_id: submission.respondent_id,
    submitted_at: submission.submitted_at,
    answers: submission.answers.map(answer => ({
      id: answer.id,
      field_id: answer.field_id,
      field_label: answer.field.label,
      value: answer.value,
      options: answer.options.map(o => ({ option_id: o.option_id, label: o.option.label, value: o.option.value })),
    })),
  }
}
