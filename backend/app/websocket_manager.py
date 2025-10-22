from fastapi import WebSocket
from typing import List
import json
import asyncio
from .redis_manager import redis_manager

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis_listener_started = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Start Redis listener if not already started
        if not self.redis_listener_started and len(self.active_connections) == 1:
            await self.start_redis_listener()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def start_redis_listener(self):
        self.redis_listener_started = True
        asyncio.create_task(redis_manager.subscribe_photos(self.broadcast_from_redis))
        print("Redis listener started")

    async def broadcast_from_redis(self, photo_data: dict):
        """Broadcast photo received from Redis to all WebSocket connections"""
        if not self.active_connections:
            return
            
        json_message = json.dumps(photo_data)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(json_message)
            except Exception as e:
                print(f"Failed to send message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
        
        print(f"Broadcasted to {len(self.active_connections)} connections via Redis")

    async def broadcast(self, message: dict):
        """Direct broadcast (fallback if Redis fails)"""
        if not self.active_connections:
            print("No active connections to broadcast to")
            return
            
        print(f"Direct broadcasting to {len(self.active_connections)} connections")
        json_message = json.dumps(message)
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json_message)
            except Exception as e:
                print(f"Failed to send message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()
