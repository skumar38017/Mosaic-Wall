from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .redis_manager import redis_manager
import json
import os
from .websocket_manager import manager

router = APIRouter()

DISPLAY_SETTINGS_KEY = "display_settings"

# Get defaults from environment variables
DEFAULT_GRID_CELL_PERCENTAGE = float(os.getenv("VITE_GRID_CELL_PERCENTAGE", "10"))
DEFAULT_OVERLAY_OPACITY = float(os.getenv("VITE_OVERLAY_OPACITY", "0.5"))
DEFAULT_POPUP_DURATION = int(os.getenv("VITE_POPUP_DURATION", "2000"))

class DisplaySettings(BaseModel):
    show_watermark: bool = True
    show_cell_numbers: bool = True
    grid_cell_percentage: float = 10.0
    overlay_opacity: float = 0.5
    popup_duration: int = 2000

@router.post("/set-display-settings")
async def set_display_settings(settings: DisplaySettings):
    """Set display settings for kiosk"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        await redis_manager.redis.set(DISPLAY_SETTINGS_KEY, json.dumps(settings.dict()))
        print(f"✅ Display settings updated: {settings.dict()}")
        
        # Broadcast to all WebSocket clients
        await manager.broadcast({
            "type": "settings_update",
            "settings": settings.dict()
        })
        
        return {"status": "settings_updated", "settings": settings.dict()}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Set display settings failed: {e}")
        raise HTTPException(status_code=500, detail=f"Set display settings failed: {str(e)}")

@router.get("/get-display-settings")
async def get_display_settings():
    """Get display settings for kiosk"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        settings_json = await redis_manager.redis.get(DISPLAY_SETTINGS_KEY)
        
        if not settings_json:
            # Return defaults from environment variables
            return {
                "status": "default_settings",
                "settings": {
                    "show_watermark": True,
                    "show_cell_numbers": True,
                    "grid_cell_percentage": DEFAULT_GRID_CELL_PERCENTAGE,
                    "overlay_opacity": DEFAULT_OVERLAY_OPACITY,
                    "popup_duration": DEFAULT_POPUP_DURATION
                }
            }
        
        settings = json.loads(settings_json)
        return {"status": "settings_found", "settings": settings}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get display settings failed: {e}")
        raise HTTPException(status_code=500, detail=f"Get display settings failed: {str(e)}")
