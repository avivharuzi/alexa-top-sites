import * as redis from 'redis';

export class Redis {
    private static instance: Redis;
    
    private static readonly HOSTNAME: string = process.env.REDIS_HOSTNAME;
    private static readonly PORT: number = parseInt(process.env.REDIS_PORT);
    
    private redisClient: redis.RedisClient;
    
    private constructor() {
        this.redisClient = redis.createClient(Redis.PORT, Redis.HOSTNAME);
        
        this.redisClient.on('error', (err) => {
            console.log(`Error: ${err}`);
        });
    }
    
    public static getInstance(): Redis {
        if (!Redis.instance) {
            Redis.instance = new Redis();
        }
        return Redis.instance;
    }
    
    public get(key: string): Promise<any> {
        return new Promise((resolve, reject) => {
           this.redisClient.get(key, (error, result) => {
              if (error) {
                  reject(error);
              } else {
                  resolve(result);
              }
           });
        });
    }
    
    public set(key: string, value: any): Promise<any> {
        let valueStr: string = JSON.stringify(value);
        
        return new Promise((resolve, reject) => {
            this.redisClient.set(key,  valueStr, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
    
    public expire(key: string, time: number = 86400): Promise<any> {
        return new Promise((resolve, reject) => {
            this.redisClient.expire(key,  time, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
}
