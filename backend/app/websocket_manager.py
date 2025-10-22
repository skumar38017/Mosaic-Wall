from fastapi import WebSocket
from typing import List
import json
import asyncio
from .redis_manager import redis_manager

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis_listener_started = False
        self.connection_pools = []  # Multiple connection pools for load balancing

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Start Redis listener if not already started
        if not self.redis_listener_started and len(self.active_connections) == 1:
            await self.start_redis_listeners()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def start_redis_listeners(self):
        """Start multiple Redis listeners for load distribution"""
        self.redis_listener_started = True
        
        # Create 10 Redis listeners for maximum load distribution
        for i in range(10):
            asyncio.create_task(
                redis_manager.subscribe_photos(self.broadcast_from_redis),
                name=f"redis_listener_{i}"
            )
        print("Started 10 Redis listeners for maximum load distribution")

    async def broadcast_from_redis(self, photo_data: dict):
        """Broadcast photo received from Redis to all WebSocket connections"""
        if not self.active_connections:
            return
        
        # Use connection pooling for ultra-fast performance
        connection_chunks = [
            self.active_connections[i:i+50] 
            for i in range(0, len(self.active_connections), 50)
        ]
        
        json_message = json.dumps(photo_data)
        tasks = []
        
        # Process connections in chunks of 50 for maximum speed
        for chunk in connection_chunks:
            task = asyncio.create_task(self._broadcast_to_chunk(chunk, json_message))
            tasks.append(task)
        
        # Execute all chunks concurrently
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        print(f"Broadcasted to {len(self.active_connections)} connections via Redis (ultra-fast)")

    async def _broadcast_to_chunk(self, connections: List[WebSocket], message: str):
        """Broadcast to a chunk of connections"""
        disconnected = []
        
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast(self, message: dict):
        """Direct broadcast (fallback if Redis fails)"""
        if not self.active_connections:
            print("No active connections to broadcast to")
            return
            
        print(f"Direct broadcasting to {len(self.active_connections)} connections")
        json_message = json.dumps(message)
        
        # Use chunked broadcasting for better performance
        await self._broadcast_to_chunk(self.active_connections, json_message)

manager = ConnectionManager()
