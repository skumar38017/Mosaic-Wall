from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from .websocket_manager import manager
from .redis_manager import redis_manager
import base64
import asyncio
import random
import numpy as np
from datetime import datetime

app = FastAPI()

# Store photo positions as NumPy array for fast calculations
photo_positions = np.empty((0, 2))  # Empty array for x, y coordinates
position_timestamps = []

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await redis_manager.connect()

@app.on_event("shutdown")
async def shutdown_event():
    await redis_manager.close()

def find_non_overlapping_position():
    """Ultra-fast collision detection using NumPy vectorized operations"""
    global photo_positions
    
    min_distance = 160
    screen_width, screen_height = 1920 - 150, 1080 - 150
    
    for _ in range(100):
        # Generate position
        zone = random.randint(0, 3)
        if zone == 0: x, y = random.random() * (screen_width * 0.6), random.random() * (screen_height * 0.6)
        elif zone == 1: x, y = (screen_width * 0.4) + random.random() * (screen_width * 0.6), random.random() * (screen_height * 0.6)
        elif zone == 2: x, y = random.random() * (screen_width * 0.6), (screen_height * 0.4) + random.random() * (screen_height * 0.6)
        else: x, y = (screen_width * 0.4) + random.random() * (screen_width * 0.6), (screen_height * 0.4) + random.random() * (screen_height * 0.6)
        
        x, y = max(0, min(x, screen_width)), max(0, min(y, screen_height))
        
        # Ultra-fast NumPy collision check
        if len(photo_positions) > 0:
            distances = np.linalg.norm(photo_positions - np.array([x, y]), axis=1)
            if np.any(distances < min_distance):
                continue
        
        # Add position and cleanup
        photo_positions = np.vstack([photo_positions, [x, y]])
        if len(photo_positions) > 200:
            photo_positions = photo_positions[-100:]
        
        return float(x), float(y)
    
    return float(random.random() * screen_width), float(random.random() * screen_height)

@app.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    # Read and process file efficiently
    content = await file.read()
    image_data = base64.b64encode(content).decode('utf-8')
    
    # Generate non-overlapping position
    x, y = find_non_overlapping_position()
    
    message = {
        "image_data": image_data,
        "timestamp": datetime.now().isoformat(),
        "x": x,
        "y": y
    }
    
    # Try Redis first (much faster), fallback to direct WebSocket
    if redis_manager.redis:
        await redis_manager.publish_photo(message)
    else:
        asyncio.create_task(manager.broadcast(message))
    
    return {"status": "accepted"}

@app.post("/cleanup")
async def cleanup_photos(photo_ids: list = []):
    """Clean specific photos from Redis and position tracking"""
    global photo_positions
    
    # Simple cleanup - just keep last 100 positions
    if len(photo_positions) > 200:
        photo_positions = photo_positions[-100:]
    
    if redis_manager.redis:
        await redis_manager.cleanup_photos(photo_ids)
    return {"status": "cleaned", "count": len(photo_ids), "positions_cleaned": True}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
