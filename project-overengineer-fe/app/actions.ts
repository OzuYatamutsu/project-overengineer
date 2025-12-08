'use server'

import { generateJwt } from "@project-overengineer/shared-lib/vault"

const _IS_UNIT_TESTING = !!process.env["_IS_UNIT_TESTING"]

export async function createJwt(jobId: string) {
  return await generateJwt("project-overengineer-fe", jobId, _IS_UNIT_TESTING)
}
