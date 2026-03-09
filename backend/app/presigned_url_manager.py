from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
from datetime import datetime, timedelta
import os

router = APIRouter()

# AWS S3 Configuration
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'ap-south-1')
)

BUCKET_NAME = os.getenv('AWS_S3_BUCKET_NAME')
DAYSHIFT_FOLDER = os.getenv('AWS_DAYSHIFT_FOLDER', 'dayshift')
NIGHTSHIFT_FOLDER = os.getenv('AWS_NIGHTSHIFT_FOLDER', 'nightshift')

class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str = 'image/jpeg'

def get_ist_folder():
    """Determine folder based on IST time"""
    now = datetime.utcnow()
    # Add 5.5 hours for IST
    ist_time = now + timedelta(hours=5, minutes=30)
    hour = ist_time.hour
    minute = ist_time.minute
    time_in_minutes = hour * 60 + minute
    
    # 11:00 AM to 7:00 PM IST (660 to 1140 minutes)
    if 660 <= time_in_minutes <= 1140:
        return DAYSHIFT_FOLDER
    
    # 10:00 PM to 12:30 AM IST (1320 to 1440 OR 0 to 30)
    if time_in_minutes >= 1320 or time_in_minutes <= 30:
        return NIGHTSHIFT_FOLDER
    
    return ''

@router.get("/get-presigned-url")
async def get_presigned_url_get(filename: str, content_type: str = 'image/jpeg'):
    """Generate presigned URL for S3 upload (GET method for DevTunnel compatibility)"""
    try:
        if not BUCKET_NAME:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")
        
        folder = get_ist_folder()
        timestamp = int(datetime.utcnow().timestamp() * 1000)
        key = f"{folder}/{filename}" if folder else filename
        
        # Generate presigned URL (valid for 5 minutes)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': key,
                'ContentType': content_type
            },
            ExpiresIn=300  # 5 minutes
        )
        
        # Generate the final URL
        final_url = f"https://{BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{key}"
        
        print(f"✅ Generated presigned URL for: {key}")
        
        return {
            "presigned_url": presigned_url,
            "key": key,
            "bucket": BUCKET_NAME,
            "folder": folder,
            "final_url": final_url,
            "expires_in": 300
        }
        
    except Exception as e:
        print(f"❌ Presigned URL generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")

@router.post("/get-presigned-url")
async def get_presigned_url(request: PresignedUrlRequest):
    """Generate presigned URL for S3 upload"""
    try:
        if not BUCKET_NAME:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")
        
        folder = get_ist_folder()
        timestamp = int(datetime.utcnow().timestamp() * 1000)
        key = f"{folder}/{request.filename}" if folder else request.filename
        
        # Generate presigned URL (valid for 5 minutes)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': key,
                'ContentType': request.content_type
            },
            ExpiresIn=300  # 5 minutes
        )
        
        # Generate the final URL
        final_url = f"https://{BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{key}"
        
        print(f"✅ Generated presigned URL for: {key}")
        
        return {
            "presigned_url": presigned_url,
            "key": key,
            "bucket": BUCKET_NAME,
            "folder": folder,
            "final_url": final_url,
            "expires_in": 300
        }
        
    except Exception as e:
        print(f"❌ Presigned URL generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")
