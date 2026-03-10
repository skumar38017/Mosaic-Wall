from fastapi import WebSocket
from typing import List, Dict
import json
import asyncio
from .redis_manager import redis_manager

class ConnectionManager:
    def __init__(self):
        self.connections: List[WebSocket] = []
        self.redis_listener_started = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)
        print(f"WebSocket connected. Active: {len(self.connections)}")
        
        if not self.redis_listener_started and len(self.connections) == 1:
            await self.start_redis_listener()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)
            print(f"WebSocket disconnected. Active: {len(self.connections)}")

    async def start_redis_listener(self):
        self.redis_listener_started = True
        asyncio.create_task(redis_manager.subscribe_photos(self.broadcast_from_redis))
        print("Started Redis listener")

    async def broadcast_from_redis(self, photo_data: dict):
        if not self.connections:
            return
        
        json_message = json.dumps(photo_data)
        await self._broadcast_to_all(json_message)
        print(f"Broadcasted to {len(self.connections)} connections")

    async def _broadcast_to_all(self, message: str):
        disconnected = []
        for connection in self.connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast(self, message: dict):
        if not self.connections:
            return
        json_message = json.dumps(message)
        await self._broadcast_to_all(json_message)

manager = ConnectionManager()
