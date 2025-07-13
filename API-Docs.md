# API Documentation

API endpoints for each component are documented here.

## Transformer API

### POST /api/v1/upload
Submits raw image data against the transformer.
The transformer should return a job ID corresponding to the job to be processed.

- Returns `201` if the job was created successfully.
- Returns `400` if the data was in an incorrect format.

#### Sample request
(Raw binary image data)

#### Sample response
```json
{
    "message": "Job created",
    "jobId": "55fa6d48-f4e7-4884-8033-969a4d6ca5d8"
}
```
