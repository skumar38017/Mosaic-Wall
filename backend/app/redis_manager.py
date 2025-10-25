import redis.asyncio as redis
import json
import asyncio
from typing import Optional
from redis.asyncio.connection import ConnectionPool
from .config import REDIS_URL

class RedisManager:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.pool: Optional[ConnectionPool] = None
        
    async def connect(self):
        try:
            # Create connection pool for better performance
            self.pool = ConnectionPool.from_url(
                REDIS_URL,
                decode_responses=True,
                max_connections=100,  # Increased for 50 background processors + 10 listeners
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={}
            )
            self.redis = redis.Redis(connection_pool=self.pool)
            await self.redis.ping()
            print("Redis connected with optimized connection pool (100 connections)")
            
            # Clean old data on startup
            await self.cleanup_old_data()
            
        except Exception as e:
            print(f"Redis connection failed: {e}")
            self.redis = None
    
    async def cleanup_old_data(self):
        """Clean old Redis data to prevent memory buildup"""
        if self.redis:
            try:
                # Set TTL for photo channel messages (expire after 1 minute)
                await self.redis.config_set('notify-keyspace-events', 'Ex')
                
                # Clean any existing keys that might be old
                keys = await self.redis.keys("photo_*")
                if keys:
                    await self.redis.delete(*keys)
                    print(f"Cleaned {len(keys)} old Redis keys")
                    
            except Exception as e:
                print(f"Redis cleanup failed: {e}")
    
    async def cleanup_photos(self, photo_ids: list):
        """Clean specific photos from Redis when removed from display"""
        if self.redis and photo_ids:
            try:
                # Remove specific photo keys
                keys_to_delete = [f"photo_{photo_id}" for photo_id in photo_ids]
                if keys_to_delete:
                    await self.redis.delete(*keys_to_delete)
                    print(f"Cleaned {len(keys_to_delete)} photos from Redis")
            except Exception as e:
                print(f"Redis photo cleanup failed: {e}")
    
    async def publish_photo(self, photo_data: dict):
        if self.redis:
            try:
                # Ultra-fast publish without semaphore bottleneck
                await self.redis.publish("photo_channel", json.dumps(photo_data))
                print(f"Photo {photo_data.get('id', 'unknown')} published successfully")
            except Exception as e:
                print(f"Redis publish failed: {e}")
    
    async def subscribe_photos(self, callback):
        if self.redis:
            try:
                # Use separate connection for subscription
                sub_redis = redis.Redis(connection_pool=self.pool)
                async with sub_redis.pubsub() as pubsub:
                    await pubsub.subscribe("photo_channel")
                    
                    async for message in pubsub.listen():
                        if message["type"] == "message":
                            photo_data = json.loads(message["data"])
                            await callback(photo_data)
            except Exception as e:
                print(f"Redis subscribe failed: {e}")
    
    async def close(self):
        """Clean shutdown"""
        if self.pool:
            await self.pool.disconnect()
            print("Redis connection pool closed")

redis_manager = RedisManager()
