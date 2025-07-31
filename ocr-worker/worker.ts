import { Redis } from 'ioredis'

const DUMMY_RESULT = `
DUMMY STATIC RESULT

2xLatte Macchiato 9.00
1xGloki 5.00
1xSchweinschnitzel 22.00
1xChässpätzli 18.50

Total 54.50
`;

const redis = new Redis({
    sentinels: [{
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? '26379')
    }],
    name: 'redis-master',
    password: process.env.REDIS_PASSWORD ?? 'b4yscx92yksfyv9c',
    sentinelPassword: process.env.REDIS_PASSWORD ?? 'b4yscx92yksfyv9c',
    db: 0
})

// TODO implement
