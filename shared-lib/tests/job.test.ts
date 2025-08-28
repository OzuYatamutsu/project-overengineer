import { Job } from '../job'
import { JobStatus } from '../job-status'
import { test, expect } from '@playwright/test'
const testImage =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='

test('can construct a new job directly', () => {
  const job = new Job(testImage)

  expect(job.id).toBeTruthy()
  expect(job.imageDataBase64).toEqual(testImage)
  expect(job.createUtime).toBeLessThan(Date.now() + 1 / 1000)
  expect(job.status).toEqual(JobStatus.NEW)
  expect(job.result).toBeDefined()
})
test('can construct a new job from a redis object', () => {
  const redisObject = new Job(testImage).serialize()
  const job = Job.fromRedisObject(redisObject)

  expect(job.id).toEqual(redisObject['id'])
  expect(job.imageDataBase64).toEqual(redisObject['imageDataBase64'])
  expect(job.createUtime).toEqual(Number(redisObject['createUtime']))
  expect(job.status).toEqual(redisObject['status'] as JobStatus)
  expect(job.result).toEqual(redisObject['result'])
})
test('can serialize a job', () => {
  expect(new Job(testImage).serialize()).toBeTruthy()
})