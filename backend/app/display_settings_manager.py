from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .redis_manager import redis_manager
import json

router = APIRouter()

DISPLAY_SETTINGS_KEY = "display_settings"

class DisplaySettings(BaseModel):
    show_watermark: bool = True
    show_cell_numbers: bool = True
    grid_cell_percentage: float = 10.0
    overlay_opacity: float = 0.5

@router.post("/set-display-settings")
async def set_display_settings(settings: DisplaySettings):
    """Set display settings for kiosk"""
    try:
        if not redis_manager.redis:
            raise HTTPException(status_code=500, detail="Redis not available")
        
        await redis_manager.redis.set(DISPLAY_SETTINGS_KEY, json.dumps(settings.dict()))
        print(f"✅ Display settings updated: {settings.dict()}")
        
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
            # Return defaults
            return {
                "status": "default_settings",
                "settings": {
                    "show_watermark": True,
                    "show_cell_numbers": True,
                    "grid_cell_percentage": 10.0,
                    "overlay_opacity": 0.5
                }
            }
        
        settings = json.loads(settings_json)
        return {"status": "settings_found", "settings": settings}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get display settings failed: {e}")
        raise HTTPException(status_code=500, detail=f"Get display settings failed: {str(e)}")
