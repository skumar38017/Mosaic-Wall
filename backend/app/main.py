from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .websocket_manager import manager
from .redis_manager import redis_manager
from .config import PORT
import base64
import asyncio
from datetime import datetime

app = FastAPI()

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

@app.on_event("shutdown")
async def shutdown_event():
    await redis_manager.close()



@app.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    # Read and process file efficiently
    content = await file.read()
    
    # Keep file size limit for server protection (100MB max for high quality photos)
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 100MB allowed.")
    
    image_data = base64.b64encode(content).decode('utf-8')
    
    message = {
        "image_data": image_data,
        "timestamp": datetime.now().isoformat()
    }
    
    # Use Redis for ultra-fast broadcasting to millions of users
    if redis_manager.redis:
        # Fire and forget for maximum speed
        asyncio.create_task(redis_manager.publish_photo(message))
    else:
        # Fallback to direct WebSocket
        asyncio.create_task(manager.broadcast(message))
    
    return {"status": "accepted"}

@app.post("/cleanup")
async def cleanup_photos(photo_ids: list = []):
    """Clean specific photos from Redis"""
    if redis_manager.redis:
        await redis_manager.cleanup_photos(photo_ids)
    return {"status": "cleaned", "count": len(photo_ids)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            # Handle ping messages to keep connection alive
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
