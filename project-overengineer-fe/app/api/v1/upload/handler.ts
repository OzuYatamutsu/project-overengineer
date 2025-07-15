import sharp from 'sharp'

const MAX_DIMENSIONS_X_PX = 1000
const MAX_DIMENSIONS_Y_PX = 1000
const IMAGE_QUALITY_PERCENT = 80

export async function standarizeImage(rawImageData: Buffer<ArrayBuffer>): Promise<string> {
    const convertedImageData = await sharp(rawImageData)
        .resize(
            MAX_DIMENSIONS_X_PX, MAX_DIMENSIONS_Y_PX,
            { fit: 'inside', withoutEnlargement: true }
        )
        .jpeg({ quality: IMAGE_QUALITY_PERCENT })
        .toBuffer()
    
    return `data:image/jpeg;base64,${convertedImageData.toString('base64')}`
}