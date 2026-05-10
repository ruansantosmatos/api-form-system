import type { CreateSubmissionDto } from '../dto/create-submission.dto'

export interface SubmissionServiceCreate {
  form_id: number
  respondent_id: number
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
