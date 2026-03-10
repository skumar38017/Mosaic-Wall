from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .websocket_manager import manager
from .redis_manager import redis_manager
from .overlay_manager import router as overlay_router
from .name_manager import router as name_router
from .shift_manager import router as shift_router
from .display_settings_manager import router as display_router
from .s3_metadata_manager import router as s3_router
from .presigned_url_manager import router as presigned_router
from .config import PORT
import asyncio
from datetime import datetime
import uuid
from asyncio import Semaphore, Queue

app = FastAPI()

# Include routers
app.include_router(overlay_router)
app.include_router(name_router)
app.include_router(shift_router)
app.include_router(display_router)
app.include_router(s3_router)
app.include_router(presigned_router)
app.include_router(shift_router)
app.include_router(display_router)

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
    """Process S3 upload notifications in background"""
    while True:
        try:
            # Get upload notification from queue
            upload_data = await upload_queue.get()
            
            async with processing_semaphore:
                # Process S3 upload notification
                message = {
                    "image_url": upload_data["image_url"],
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

@app.get("/ws-status")
async def websocket_status():
    """WebSocket connection status"""
    return {
        "total_connections": len(manager.connections),
        "redis_connected": redis_manager.redis is not None
    }

@app.get("/health")
async def health_check():
    """Quick health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "queue_size": upload_queue.qsize(),
        "redis_connected": redis_manager.redis is not None
    }

from pydantic import BaseModel

class S3UploadNotification(BaseModel):
    image_url: str
    timestamp: str = None
    upload_id: str = None

@app.post("/notify-upload")
async def notify_s3_upload(notification: S3UploadNotification):
    """Notify about successful S3 upload"""
    try:
        message = {
            "image_url": notification.image_url,
            "timestamp": notification.timestamp or datetime.now().isoformat(),
            "id": notification.upload_id or str(uuid.uuid4())[:8]
        }
        
        # Queue for background processing
        try:
            upload_queue.put_nowait(message)
            print(f"✅ S3 upload notification queued - ID: {message['id']}")
            return {"status": "queued", "id": message['id']}
        except:
            # Queue full - process immediately
            asyncio.create_task(redis_manager.publish_photo(message))
            print(f"⚡ S3 upload notification processed immediately - ID: {message['id']}")
            return {"status": "processed", "id": message['id']}
            
    except Exception as e:
        print(f"❌ S3 upload notification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Notification failed: {str(e)}")

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

async def handle_websocket_connection(websocket: WebSocket):
    """Simplified WebSocket connection handler"""
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60)
                if data in ["ping", "pong", "keepalive"]:
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_text("ping")
            except Exception:
                break
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# Single WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await handle_websocket_connection(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
