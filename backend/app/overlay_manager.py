from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import Response
from .redis_manager import redis_manager
from .utils.file_validator import validate_file_type, get_content_type
import base64
import json
from datetime import datetime
import uuid

router = APIRouter()

OVERLAY_KEY = "current_overlay_image"

@router.post("/upload-overlay")
async def upload_overlay_image(file: UploadFile = File(...)):
    """Upload and store overlay image/video in Redis - supports all photo and video formats"""
    try:
        content = await file.read()
        
        if len(content) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 100MB)")
        
        # Validate file type
        file_type, mime_type, is_valid = validate_file_type(file.filename or "unknown", content)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Unsupported file format. Supported: photos (JPEG, PNG, GIF, WebP, etc.) and videos (MP4, AVI, MOV, etc.)")
        
        overlay_id = str(uuid.uuid4())[:8]
        image_data = base64.b64encode(content).decode('utf-8')
        
        overlay_data = {
            "id": overlay_id,
            "image_data": image_data,
            "timestamp": datetime.now().isoformat(),
            "filename": file.filename,
            "file_type": file_type,
            "mime_type": mime_type
        }
        
        # Store in Redis (replaces old overlay automatically)
        if redis_manager.redis:
            await redis_manager.redis.set(OVERLAY_KEY, json.dumps(overlay_data))
            print(f"✅ {file_type.title()} overlay stored in Redis - ID: {overlay_id}, Type: {mime_type}")
        else:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        return {
            "status": "overlay_stored", 
            "id": overlay_id, 
            "file_type": file_type,
            "mime_type": mime_type
        }
        
    except Exception as e:
        print(f"❌ Overlay upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Overlay upload failed: {str(e)}")

@router.get("/upload-overlay")
async def get_overlay_image():
    """Get current overlay image/video from Redis as binary file"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        overlay_json = await redis_manager.redis.get(OVERLAY_KEY)
        
        if not overlay_json:
            raise HTTPException(status_code=404, detail="No overlay found")
        
        overlay_data = json.loads(overlay_json)
        image_data = overlay_data.get("image_data")
        filename = overlay_data.get("filename", "overlay")
        file_type = overlay_data.get("file_type", "photo")
        stored_mime_type = overlay_data.get("mime_type")
        
        if not image_data:
            raise HTTPException(status_code=404, detail="No file data found")
        
        # Decode base64 to binary
        file_bytes = base64.b64decode(image_data)
        
        # Get content type (use stored mime_type or detect from filename)
        content_type = stored_mime_type or get_content_type(filename)
        
        print(f"📤 Serving {file_type} overlay - ID: {overlay_data.get('id')}, Type: {content_type}")
        
        return Response(
            content=file_bytes,
            media_type=content_type,
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
        
    except Exception as e:
        print(f"❌ Overlay retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Overlay retrieval failed: {str(e)}")
