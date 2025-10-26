import mimetypes
from typing import Tuple

# Supported photo formats
PHOTO_FORMATS = {
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/tiff', 'image/tif', 'image/svg+xml', 'image/ico',
    'image/heic', 'image/heif', 'image/avif', 'image/jfif'
}

# Supported video formats
VIDEO_FORMATS = {
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
    'video/webm', 'video/mkv', 'video/m4v', 'video/3gp', 'video/ogv',
    'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'
}

ALL_SUPPORTED_FORMATS = PHOTO_FORMATS | VIDEO_FORMATS

def validate_file_type(filename: str, content: bytes) -> Tuple[str, str, bool]:
    """
    Validate file type and get mime type
    Returns: (file_type, mime_type, is_valid)
    """
    # Get mime type from filename
    mime_type, _ = mimetypes.guess_type(filename)
    
    # Fallback mime detection from content
    if not mime_type:
        if content.startswith(b'\xff\xd8\xff'):
            mime_type = 'image/jpeg'
        elif content.startswith(b'\x89PNG'):
            mime_type = 'image/png'
        elif content.startswith(b'GIF8'):
            mime_type = 'image/gif'
        elif content.startswith(b'RIFF') and b'WEBP' in content[:12]:
            mime_type = 'image/webp'
        elif content.startswith(b'\x00\x00\x00\x20ftypmp4'):
            mime_type = 'video/mp4'
        elif content.startswith(b'RIFF') and b'AVI ' in content[:12]:
            mime_type = 'video/avi'
        else:
            mime_type = 'application/octet-stream'
    
    # Determine file type
    if mime_type in PHOTO_FORMATS:
        file_type = 'photo'
    elif mime_type in VIDEO_FORMATS:
        file_type = 'video'
    else:
        file_type = 'unknown'
    
    # Check if supported
    is_valid = mime_type in ALL_SUPPORTED_FORMATS
    
    return file_type, mime_type, is_valid

def get_content_type(filename: str) -> str:
    """Get content-type from filename"""
    mime_type, _ = mimetypes.guess_type(filename)
    
    if mime_type and mime_type in ALL_SUPPORTED_FORMATS:
        return mime_type
    
    # Fallback based on extension
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    
    ext_map = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp',
        'mp4': 'video/mp4', 'avi': 'video/avi', 'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv', 'webm': 'video/webm'
    }
    
    return ext_map.get(ext, 'application/octet-stream')
