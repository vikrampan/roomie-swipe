import { 
  doc, getDoc, setDoc, deleteDoc, collection, 
  query, where, getDocs, writeBatch 
} from 'firebase/firestore';
import { 
  ref, uploadBytes, getDownloadURL, deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { geohashForLocation } from 'geofire-common';
import { compressImage } from './utils';

export const getMyProfile = async (uid) => {
  const docRef = doc(db, "users", uid); 
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// ✅ HELPER: Upload single image to Firebase Storage
const uploadImageToStorage = async (blob, uid, index) => {
  try {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `photo_${timestamp}_${index}_${randomId}.jpg`;
    const storageRef = ref(storage, `users/${uid}/${fileName}`);
    
    // Upload the blob
    const snapshot = await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error("Image upload failed");
  }
};

// ✅ UPDATED: Upload to Firebase Storage instead of storing Base64 in Firestore
export const saveProfile = async (uid, formData, imageFiles, existingImages = []) => {
  try {
    const hash = geohashForLocation([formData.lat, formData.lng]);
    let finalImages = existingImages; // These are now URLs, not Base64 strings
    
    // Process new images (Compress -> Upload to Storage -> Get URL)
    if (imageFiles && imageFiles.length > 0) {
      const uploadPromises = imageFiles.map(async (file, index) => {
        try {
          // Compress image to Blob
          const blob = await compressImage(file);
          
          // Upload to Firebase Storage and get URL
          const downloadURL = await uploadImageToStorage(blob, uid, index);
          
          return downloadURL;
        } catch (error) {
          console.error(`Failed to process image ${index}:`, error);
          return null; // Skip failed images
        }
      });
      
      const newImageUrls = await Promise.all(uploadPromises);
      
      // Filter out any failed uploads (null values)
      const validUrls = newImageUrls.filter(url => url !== null);
      
      finalImages = [...finalImages, ...validUrls];
    }

    const safeImages = finalImages.slice(0, 5); // Limit 5

    const profileData = {
      ...formData,
      images: safeImages, // ✅ Now storing URLs instead of Base64
      img: safeImages[0] || "", // First image URL
      uid: uid,
      geohash: hash,
      lastUpdated: Date.now()
    };
    
    delete profileData.rawFiles; 

    await setDoc(doc(db, "users", uid), profileData, { merge: true });
    return profileData;
  } catch (error) {
    console.error("Error saving profile:", error);
    throw new Error("Profile save failed."); 
  }
};

// ✅ HELPER: Extract storage path from Firebase Storage URL
const getStoragePathFromUrl = (url) => {
  try {
    // Firebase Storage URL format:
    // https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=TOKEN
    
    if (!url || !url.includes('firebasestorage.googleapis.com')) {
      return null;
    }
    
    const matches = url.match(/\/o\/(.+?)\?/);
    if (matches && matches[1]) {
      return decodeURIComponent(matches[1]);
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing storage URL:", error);
    return null;
  }
};

// ✅ HELPER: Delete single image from Firebase Storage
const deleteImageFromStorage = async (imageUrl) => {
  try {
    const storagePath = getStoragePathFromUrl(imageUrl);
    
    if (!storagePath) {
      console.warn("Could not extract storage path from URL:", imageUrl);
      return;
    }
    
    const imageRef = ref(storage, storagePath);
    await deleteObject(imageRef);
    console.log("Deleted image:", storagePath);
  } catch (error) {
    // Don't throw - just log. Image might already be deleted.
    console.warn("Failed to delete image:", error.message);
  }
};

// ✅ UPDATED: Complete "Clean Sweep" Deletion
export const deleteMyProfile = async (uid) => {
  try {
    // 1. Get user profile first to access image URLs
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    // 2. Delete all images from Firebase Storage
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      if (userData.images && Array.isArray(userData.images) && userData.images.length > 0) {
        console.log(`Deleting ${userData.images.length} images from storage...`);
        
        // Delete all images in parallel
        const deletePromises = userData.images.map(imageUrl => 
          deleteImageFromStorage(imageUrl)
        );
        
        await Promise.all(deletePromises);
        console.log("All images deleted from storage");
      }
    }
    
    // 3. Initialize Batch Operation
    const batch = writeBatch(db);
    
    // Step A: Delete the user profile document
    batch.delete(userRef);
    
    // Step B: Find & Delete All Matches (Prevention of Ghost Chats)
    const matchesQuery = query(
      collection(db, "matches"), 
      where("users", "array-contains", uid)
    );
    const matchesSnap = await getDocs(matchesQuery);
    console.log(`Deleting ${matchesSnap.size} matches...`);
    matchesSnap.forEach((matchDoc) => {
      batch.delete(matchDoc.ref);
    });

    // Step C: Delete Outgoing Interactions (Prevention of Ghost Cards for others)
    // "I liked them" -> Delete these so I disappear from their likes list
    const outgoingInteractionsQuery = query(
        collection(db, "interactions"),
        where("fromUserId", "==", uid)
    );
    const outgoingSnap = await getDocs(outgoingInteractionsQuery);
    console.log(`Deleting ${outgoingSnap.size} outgoing interactions...`);
    outgoingSnap.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Step D: Delete Incoming Interactions
    // "They liked me" -> Delete these to clean up the database
    const incomingInteractionsQuery = query(
        collection(db, "interactions"),
        where("toUserId", "==", uid)
    );
    const incomingSnap = await getDocs(incomingInteractionsQuery);
    console.log(`Deleting ${incomingSnap.size} incoming interactions...`);
    incomingSnap.forEach((doc) => {
        batch.delete(doc.ref);
    });
    
    // 4. Execute the Batch (Atomic Commit)
    await batch.commit();
    
    console.log("Profile deletion complete!");
  } catch (error) {
    console.error("Error during profile deletion:", error);
    throw new Error("Profile deletion failed");
  }
};