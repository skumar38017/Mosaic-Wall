import { DEFAULT_BACKEND_URL } from '../config/constants'

export const uploadToS3 = async (file: Blob | File, filename?: string) => {
  try {
    const timestamp = Date.now()
    const finalFilename = filename || `photo_${timestamp}.jpg`

    // Get presigned URL from backend
    const response = await fetch(`${DEFAULT_BACKEND_URL}/get-presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: finalFilename })
    })

    if (!response.ok) {
      throw new Error('Failed to get presigned URL')
    }

    const { presigned_url, key, bucket, folder } = await response.json()

    // Upload directly to S3 using presigned URL
    const uploadResponse = await fetch(presigned_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'image/jpeg' }
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload to S3')
    }

    console.log(`✅ Uploaded to S3: ${key}`)
    
    return {
      bucket,
      key,
      url: presigned_url.split('?')[0],
      folder: folder || '',
      timestamp: new Date().toISOString(),
      filename: finalFilename
    }
  } catch (error) {
    console.error('❌ S3 upload failed:', error)
    return null
  }
}
