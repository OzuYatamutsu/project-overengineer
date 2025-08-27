import { JobStatus, JobUpdate } from '../job-status'
import { test, expect } from '@playwright/test'
const TEST_JOB_ID = '7f8e21a8-40b9-42a6-9143-d769f8295a3a'

test('can construct a new job update directly', () => {
  expect(new JobUpdate(TEST_JOB_ID, JobStatus.NEW, "")).toBeTruthy()
})
test('can serialize a job update', () => {
  expect(new JobUpdate(TEST_JOB_ID, JobStatus.NEW, "").serialize()).toBeTruthy()
})
test('can construct a new job update from json', async () => {
  expect(JobUpdate.fromJsonString(
    new JobUpdate(TEST_JOB_ID, JobStatus.NEW, "").serialize()
  )).toBeTruthy()
})