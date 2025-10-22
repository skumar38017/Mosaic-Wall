from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile
from .websocket_manager import manager
import base64
from datetime import datetime

app = FastAPI()

@app.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    image_data = base64.b64encode(await file.read()).decode()
    
    message = {
        "image_data": image_data,
        "timestamp": datetime.now().isoformat()
    }
    
    await manager.broadcast(message)
    return {"status": "Photo broadcasted"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
