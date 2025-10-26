from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import Response
from .redis_manager import redis_manager
import base64
import json
from datetime import datetime
import uuid

router = APIRouter()

OVERLAY_KEY = "current_overlay_image"

@router.post("/upload-overlay")
async def upload_overlay_image(file: UploadFile = File(...)):
    """Upload and store overlay image in Redis"""
    try:
        content = await file.read()
        
        if len(content) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Overlay file too large")
        
        overlay_id = str(uuid.uuid4())[:8]
        image_data = base64.b64encode(content).decode('utf-8')
        
        overlay_data = {
            "id": overlay_id,
            "image_data": image_data,
            "timestamp": datetime.now().isoformat(),
            "filename": file.filename
        }
        
        # Store in Redis (replaces old overlay automatically)
        if redis_manager.redis:
            await redis_manager.redis.set(OVERLAY_KEY, json.dumps(overlay_data))
            print(f"✅ Overlay stored in Redis - ID: {overlay_id}")
        else:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        return {"status": "overlay_stored", "id": overlay_id}
        
    except Exception as e:
        print(f"❌ Overlay upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Overlay upload failed: {str(e)}")

@router.get("/upload-overlay")
async def get_overlay_image():
    """Get current overlay image from Redis as actual image file"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        overlay_json = await redis_manager.redis.get(OVERLAY_KEY)
        
        if not overlay_json:
            raise HTTPException(status_code=404, detail="No overlay image found")
        
        overlay_data = json.loads(overlay_json)
        image_data = overlay_data.get("image_data")
        filename = overlay_data.get("filename", "overlay.jpg")
        
        if not image_data:
            raise HTTPException(status_code=404, detail="No image data found")
        
        # Decode base64 to binary
        image_bytes = base64.b64decode(image_data)
        
        # Determine content type from filename
        content_type = "image/jpeg"
        if filename.lower().endswith('.png'):
            content_type = "image/png"
        elif filename.lower().endswith('.gif'):
            content_type = "image/gif"
        elif filename.lower().endswith('.webp'):
            content_type = "image/webp"
        
        print(f"📤 Serving overlay image - ID: {overlay_data.get('id')}")
        
        return Response(
            content=image_bytes,
            media_type=content_type,
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
        
    except Exception as e:
        print(f"❌ Overlay retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Overlay retrieval failed: {str(e)}")
