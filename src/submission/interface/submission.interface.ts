import { Prisma } from 'src/generated/prisma/client'
import type { CreateSubmissionDto } from '../dto/create-submission.dto'

export type SubmissionCreateResult = Prisma.FormSubmissionGetPayload<{
  include: {
    answers: {
      include: {
        options: { select: { option_id: true } }
      }
    }
  }
}> | null

export type SubmissionRespondent = {
  id: number
  name: string
  email: string
}

export type SubmissionListItem = {
  id: number
  form_id: number
  submitted_at: Date
  answer_count: number
  respondent: SubmissionRespondent | null
}

export type SubmissionListResult = {
  data: SubmissionListItem[]
  meta: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export type SubmissionAnswerOption = {
  option_id: number
  label: string
  value: string
}

export type SubmissionAnswer = {
  id: number
  field_id: number
  field_label: string
  value: string | null
  options: SubmissionAnswerOption[]
}

export type SubmissionDetailResult = {
  id: number
  form_id: number
  respondent_id: number | null
  submitted_at: Date
  answers: SubmissionAnswer[]
}

export interface SubmissionServiceCreate {
  form_id: number
  respondent_id: number | null
  answers: CreateSubmissionDto['answers']
}

export interface SubmissionServiceGetAll {
  form_id: number
  user_id: number
  page: number
  limit: number
  sort: 'asc' | 'desc'
}

export interface SubmissionServiceGetOne {
  form_id: number
  submission_id: number
  user_id: number
}

export interface SubmissionServiceGetMySubmission {
  form_id: number
  respondent_id: number
}

export interface SubmissionServiceUpdateMySubmission {
  form_id: number
  submission_id: number
  respondent_id: number
  answers: CreateSubmissionDto['answers']
}
