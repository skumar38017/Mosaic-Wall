from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .websocket_manager import manager
from .redis_manager import redis_manager
from .config import PORT
import base64
import asyncio
from datetime import datetime
import uuid
from asyncio import Semaphore, Queue

app = FastAPI()

# High-load processing infrastructure
upload_queue = Queue(maxsize=1000000)  # Queue for millions of requests (10 lakh)
processing_semaphore = Semaphore(200)  # Increased concurrent processing
background_processors = []

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins including dev tunnels
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await redis_manager.connect()
    # Start 50 background processors for extreme load (1M+ requests)
    for i in range(50):
        task = asyncio.create_task(background_processor(f"processor_{i}"))
        background_processors.append(task)
    print("Started 50 background processors for extreme load handling (1M+ requests)")

async def background_processor(name: str):
    """Process uploads in background for extreme load handling"""
    while True:
        try:
            # Get upload task from queue
            upload_data = await upload_queue.get()
            
            async with processing_semaphore:
                # Process upload
                message = {
                    "image_data": upload_data["image_data"],
                    "timestamp": upload_data["timestamp"],
                    "id": upload_data["id"]
                }
                
                # Ultra-fast Redis publish
                if redis_manager.redis:
                    asyncio.create_task(redis_manager.publish_photo(message))
                else:
                    asyncio.create_task(manager.broadcast(message))
            
            upload_queue.task_done()
            
        except Exception as e:
            print(f"Background processor {name} error: {e}")
            await asyncio.sleep(0.1)

@app.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    # Ultra-fast request acceptance for millions of requests
    try:
        content = await file.read()
        
        # Quick size check
        if len(content) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large")
        
        # Generate unique ID and prepare data
        upload_id = str(uuid.uuid4())[:8]
        image_data = base64.b64encode(content).decode('utf-8')
        
        upload_data = {
            "image_data": image_data,
            "timestamp": datetime.now().isoformat(),
            "id": upload_id
        }
        
        # Queue for background processing (non-blocking)
        try:
            upload_queue.put_nowait(upload_data)
            return {"status": "queued", "id": upload_id}
        except:
            # Queue full - process immediately as fallback
            message = {
                "image_data": image_data,
                "timestamp": upload_data["timestamp"],
                "id": upload_id
            }
            asyncio.create_task(redis_manager.publish_photo(message))
            return {"status": "processed", "id": upload_id}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail="Upload failed")

@app.on_event("shutdown")
async def shutdown_event():
    # Cancel background processors
    for task in background_processors:
        task.cancel()
    await redis_manager.close()

@app.post("/cleanup")
async def cleanup_photos(photo_ids: list = []):
    """Clean specific photos from Redis"""
    if redis_manager.redis:
        await redis_manager.cleanup_photos(photo_ids)
    return {"status": "cleaned", "count": len(photo_ids)}

async def handle_websocket_connection(websocket: WebSocket, pool_id: int):
    """Shared WebSocket connection handler"""
    try:
        while True:
            try:
                message = await websocket.receive_text()
                if message in ["ping", "keepalive"]:
                    await websocket.send_text("pong")
            except Exception:
                await asyncio.sleep(0.1)
                continue
    except WebSocketDisconnect:
        manager.disconnect(websocket, pool_id)
    except Exception as e:
        print(f"WebSocket pool {pool_id} error: {e}")
        manager.disconnect(websocket, pool_id)

# Dynamic WebSocket endpoint creation
WEBSOCKET_POOLS = 10  # Maximum connection pools for heavy load

def create_websocket_endpoint(pool_id: int):
    """Factory function to create WebSocket endpoints"""
    async def websocket_handler(websocket: WebSocket):
        await manager.connect(websocket, pool_id)
        await handle_websocket_connection(websocket, pool_id)
    return websocket_handler

# Create WebSocket endpoints dynamically
for i in range(WEBSOCKET_POOLS):
    endpoint_path = "/ws" if i == 0 else f"/ws{i}"
    app.add_websocket_route(endpoint_path, create_websocket_endpoint(i))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
