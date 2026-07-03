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

export type SubmissionListResult = Prisma.FormSubmissionGetPayload<{
  include: { _count: { select: { answers: true } } }
}>[]

export type SubmissionDetailResult = Prisma.FormSubmissionGetPayload<{
  include: {
    answers: {
      include: {
        field: { select: { id: true; label: true } }
        options: {
          select: {
            option_id: true
            option: { select: { label: true; value: true } }
          }
        }
      }
    }
  }
}>

export interface SubmissionServiceCreate {
  form_id: number
  respondent_id: number | null
  answers: CreateSubmissionDto['answers']
}

export interface SubmissionServiceGetAll {
  form_id: number
  user_id: number
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
