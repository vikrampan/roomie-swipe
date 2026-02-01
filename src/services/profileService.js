import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashForLocation } from 'geofire-common';
import { compressImage } from './utils';

export const getMyProfile = async (uid) => {
  const docRef = doc(db, "users", uid); 
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const saveProfile = async (uid, formData, imageFiles, existingImages = []) => {
  try {
    const hash = geohashForLocation([formData.lat, formData.lng]);
    let finalImages = existingImages;
    
    // Process new images (Compress -> Base64 String)
    if (imageFiles && imageFiles.length > 0) {
      const newImages = await Promise.all(imageFiles.map(file => compressImage(file)));
      finalImages = [...finalImages, ...newImages];
    }

    const safeImages = finalImages.slice(0, 5); // Limit 5

    const profileData = {
      ...formData,
      images: safeImages,
      img: safeImages[0] || "", 
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

// --- COST-EFFECTIVE CLEANUP ---
export const deleteMyProfile = async (uid) => {
  const batch = writeBatch(db);

  // 1. Delete the User Profile
  const userRef = doc(db, "users", uid);
  batch.delete(userRef);

  // 2. Find & Delete All Matches (So you vanish from other people's chats)
  // This prevents "Ghost Chats" where they can see you but you don't exist.
  const matchesQuery = query(collection(db, "matches"), where("users", "array-contains", uid));
  const matchesSnap = await getDocs(matchesQuery);

  matchesSnap.forEach((matchDoc) => {
    batch.delete(matchDoc.ref);
  });

  // Execute one big delete operation (Cheaper than many small ones)
  await batch.commit();
};