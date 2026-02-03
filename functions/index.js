// --- MODERN V2 IMPORTS ---
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

admin.initializeApp();
const storage = new Storage();

// We increase memory/cpu because image processing is heavy
exports.optimizeImage = onObjectFinalized({ 
    memory: "1GiB", 
    cpu: 2 
}, async (event) => {
    
    // In v2, the file data is inside event.data
    const object = event.data; 

    // --- 1. THE CHECK (Guard at the Door) ---
    const fileBucket = object.bucket; 
    const filePath = object.name; 
    const contentType = object.contentType; 

    // Exit if this is not an image
    if (!contentType || !contentType.startsWith('image/')) {
        return logger.log('This is not an image. Letting it pass.');
    }

    // Exit if the image is already optimized (Prevent Infinite Loop)
    if (object.metadata && object.metadata.optimized) {
        return logger.log('Image is already optimized. Stopping.');
    }

    // --- 2. THE INTERCEPTION (Grab the file) ---
    const bucket = storage.bucket(fileBucket);
    const fileName = path.basename(filePath);
    const workingDir = path.join(os.tmpdir(), 'thumbs');
    const tempFilePath = path.join(workingDir, fileName);
    
    // Create new name (swap ext to .webp)
    const newFileName = `${path.parse(fileName).name}.webp`;
    const newFilePath = path.join(path.dirname(filePath), newFileName);
    const tempNewPath = path.join(workingDir, newFileName);

    await fs.ensureDir(workingDir);

    // Download
    await bucket.file(filePath).download({ destination: tempFilePath });
    logger.log('Image downloaded locally for processing.');

    // --- 3. THE SHRINK RAY (Resize & Convert) ---
    await sharp(tempFilePath)
        .resize({ width: 1080, withoutEnlargement: true }) 
        .toFormat('webp', { quality: 80 })
        .toFile(tempNewPath);
    
    logger.log('Image optimized and converted to WebP.');

    // --- 4. THE SWAP (Upload New) ---
    // Upload the new WebP file
    await bucket.upload(tempNewPath, {
        destination: newFilePath,
        metadata: {
            contentType: 'image/webp',
            metadata: { 
                optimized: "true"
            }
        }
    });

    // Cleanup local temp files
    await fs.remove(workingDir);

    // *** DELETION LOGIC REMOVED ***
    // We keep the original file so the frontend doesn't 404 immediately.
    // The Database update below will ensure users eventually switch to the WebP version.

    // --- 5. THE NOTIFICATION (Update Database) ---
    const userId = filePath.split('/')[1]; 
    if (userId) {
        // Construct the new public download URL for the WebP version
        const newUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(newFilePath)}?alt=media`;
        
        const userRef = admin.firestore().collection('users').doc(userId);
        
        await userRef.set({ 
            photoURL: newUrl, 
            optimizedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        logger.log(`Database updated for User ${userId}`);
    }

    return logger.log('Optimization Complete.');
});