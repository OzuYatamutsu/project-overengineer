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

## Status API

### WebSocket
The Status API streams live status of a job over a WebSocket until a result is ready, and then sends the result along with a final event before closing the socket.

The job status may be sent multiple times to the client, functioning as both an update of the current (unchanged) state and as a keepalive.

The `status` field will be one of the following:

- **NEW**: A request for a new job to be created.
- **WAITING**: The job is queued and waiting to be processed by the OCR Core.
- **PROCESSING**: The job is currently being processed by the OCR Core.
- **DONE**: The job is completed, and the results stored in the `result` field.

The `result` field should be unpopulated unless `status` is `DONE`.

#### Sample request
```json
{
    "jobId": "55fa6d48-f4e7-4884-8033-969a4d6ca5d8"
}
```

#### Sample response(s)

**When a job is in progress**
```json
{
    "jobId": "55fa6d48-f4e7-4884-8033-969a4d6ca5d8",
    "status": "PROCESSING",
    "result": ""
}
```

**When a job is completed**
```json
{
    "jobId": "55fa6d48-f4e7-4884-8033-969a4d6ca5d8",
    "status": "DONE",
    "result": "2xLatte Macchiato 9.00\n1xGloki 5.00\n1xSchweinschnitzel 22.00\n1xChässpätzli 18.50\n\nTotal 54.50"
}
```
