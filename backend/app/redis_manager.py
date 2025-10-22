import redis.asyncio as redis
import json
import asyncio
from typing import Optional

class RedisManager:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        
    async def connect(self):
        try:
            self.redis = await redis.Redis(host='localhost', port=6379, decode_responses=True)
            await self.redis.ping()
            print("Redis connected successfully")
        except Exception as e:
            print(f"Redis connection failed: {e}")
            self.redis = None
    
    async def publish_photo(self, photo_data: dict):
        if self.redis:
            try:
                await self.redis.publish("photo_channel", json.dumps(photo_data))
                print("Photo published to Redis")
            except Exception as e:
                print(f"Redis publish failed: {e}")
    
    async def subscribe_photos(self, callback):
        if self.redis:
            try:
                async with self.redis.pubsub() as pubsub:
                    await pubsub.subscribe("photo_channel")
                    
                    async for message in pubsub.listen():
                        if message["type"] == "message":
                            photo_data = json.loads(message["data"])
                            await callback(photo_data)
            except Exception as e:
                print(f"Redis subscribe failed: {e}")

redis_manager = RedisManager()
