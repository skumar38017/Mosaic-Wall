from fastapi import WebSocket
from typing import List, Dict
import json
import asyncio
from .redis_manager import redis_manager

class ConnectionManager:
    def __init__(self, pool_count: int = 5):
        # Dynamic connection pools based on configuration
        self.pool_count = pool_count
        self.connection_pools: List[List[WebSocket]] = [[] for _ in range(pool_count)]
        self.connection_info: Dict[WebSocket, dict] = {}
        self.redis_listener_started = False

    async def connect(self, websocket: WebSocket, pool_id: int = 0):
        await websocket.accept()
        self.connection_pools[pool_id].append(websocket)
        self.connection_info[websocket] = {
            "pool_id": pool_id,
            "connected_at": asyncio.get_event_loop().time()
        }
        
        total_connections = sum(len(pool) for pool in self.connection_pools)
        print(f"WebSocket connected to pool {pool_id}. Pool: {len(self.connection_pools[pool_id])}, Total: {total_connections}")
        
        # Start Redis listener if not already started
        if not self.redis_listener_started and total_connections == 1:
            await self.start_redis_listeners()

    def disconnect(self, websocket: WebSocket, pool_id: int = None):
        if websocket in self.connection_info:
            if pool_id is None:
                pool_id = self.connection_info[websocket]["pool_id"]
            
            if websocket in self.connection_pools[pool_id]:
                self.connection_pools[pool_id].remove(websocket)
            
            self.connection_info.pop(websocket, None)
            
            total_connections = sum(len(pool) for pool in self.connection_pools)
            print(f"WebSocket disconnected from pool {pool_id}. Pool: {len(self.connection_pools[pool_id])}, Total: {total_connections}")

    async def start_redis_listeners(self):
        """Start Redis listeners based on pool count"""
        self.redis_listener_started = True
        
        # Create Redis listeners - one for each pool
        for i in range(self.pool_count):
            asyncio.create_task(
                redis_manager.subscribe_photos(self.broadcast_from_redis),
                name=f"redis_listener_pool_{i}"
            )
        print(f"Started {self.pool_count} optimized Redis listeners for connection pools")

    async def broadcast_from_redis(self, photo_data: dict):
        """Broadcast photo to all pools with load balancing"""
        all_connections = []
        for pool in self.connection_pools:
            all_connections.extend(pool)
        
        if not all_connections:
            return
        
        # Distribute connections across pools for parallel processing
        connection_chunks = [
            all_connections[i:i+20] 
            for i in range(0, len(all_connections), 20)
        ]
        
        json_message = json.dumps(photo_data)
        tasks = []
        
        # Process chunks in parallel across all pools
        for chunk in connection_chunks:
            task = asyncio.create_task(self._broadcast_to_chunk(chunk, json_message))
            tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        total_connections = len(all_connections)
        print(f"Broadcasted to {total_connections} connections across {self.pool_count} pools (ultra-fast)")

    async def _broadcast_to_chunk(self, connections: List[WebSocket], message: str):
        """Broadcast to a chunk of connections with minimal error handling"""
        disconnected = []
        
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        # Remove disconnected connections from appropriate pools
        for conn in disconnected:
            if conn in self.connection_info:
                pool_id = self.connection_info[conn]["pool_id"]
                self.disconnect(conn, pool_id)

    async def broadcast(self, message: dict):
        """Direct broadcast fallback across all pools"""
        all_connections = []
        for pool in self.connection_pools:
            all_connections.extend(pool)
            
        if not all_connections:
            print("No active connections to broadcast to")
            return
            
        print(f"Direct broadcasting to {len(all_connections)} connections across {self.pool_count} pools")
        json_message = json.dumps(message)
        
        await self._broadcast_to_chunk(all_connections, json_message)

manager = ConnectionManager(pool_count=10)  # Maximum 10 pools for heavy load
