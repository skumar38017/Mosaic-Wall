from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from .websocket_manager import manager
from .redis_manager import redis_manager
import base64
import asyncio
from datetime import datetime

app = FastAPI()

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

@app.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    # Read and process file efficiently
    content = await file.read()
    image_data = base64.b64encode(content).decode('utf-8')
    
    message = {
        "image_data": image_data,
        "timestamp": datetime.now().isoformat()
    }
    
    # Try Redis first (much faster), fallback to direct WebSocket
    if redis_manager.redis:
        await redis_manager.publish_photo(message)
    else:
        asyncio.create_task(manager.broadcast(message))
    
    return {"status": "accepted"}

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
