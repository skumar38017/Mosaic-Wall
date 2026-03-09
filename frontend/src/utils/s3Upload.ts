import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { AWS_CONFIG } from '../config/constants'

const s3Client = new S3Client({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: AWS_CONFIG.accessKeyId,
    secretAccessKey: AWS_CONFIG.secretAccessKey,
  },
})

const getIndianTime = () => {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000 // IST is UTC+5:30
  const istTime = new Date(now.getTime() + istOffset)
  return istTime
}

const getS3Folder = () => {
  const istTime = getIndianTime()
  const hours = istTime.getUTCHours()
  const minutes = istTime.getUTCMinutes()
  const timeInMinutes = hours * 60 + minutes

  // 11:00 AM to 7:00 PM IST (660 minutes to 1140 minutes)
  if (timeInMinutes >= 660 && timeInMinutes <= 1140) {
    return AWS_CONFIG.dayShiftFolder
  }
  
  // 10:00 PM to 12:30 AM IST (1320 minutes to 1440 minutes OR 0 to 30 minutes)
  if (timeInMinutes >= 1320 || timeInMinutes <= 30) {
    return AWS_CONFIG.nightShiftFolder
  }
  
  // Outside shift hours - store in root
  return ''
}

export const uploadToS3 = async (file: Blob | File, filename?: string) => {
  try {
    const bucket = AWS_CONFIG.bucketName
    if (!bucket) {
      console.warn('S3 bucket not configured, skipping upload')
      return null
    }

    const folder = getS3Folder()
    const timestamp = Date.now()
    const finalFilename = filename || `photo_${timestamp}.jpg`
    const key = folder ? `${folder}/${finalFilename}` : finalFilename

    // Convert Blob to Buffer for reliable upload
    const buffer = await file.arrayBuffer()

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    })

    await s3Client.send(command)
    console.log(`✅ Uploaded to S3: ${key}`)
    
    const result = {
      bucket,
      key,
      url: `https://${bucket}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`,
      folder,
      timestamp: new Date().toISOString(),
      filename: finalFilename
    }

    return result
  } catch (error) {
    console.error('❌ S3 upload failed:', error)
    return null
  }
}
