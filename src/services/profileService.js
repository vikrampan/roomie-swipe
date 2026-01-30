import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashForLocation } from 'geofire-common';
import { compressImage } from './utils';

export const getMyProfile = async (uid) => {
  // ✅ FIX 1: Change "profiles" to "users"
  const docRef = doc(db, "users", uid); 
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const saveProfile = async (uid, formData, imageFiles, existingImages = []) => {
  try {
    const hash = geohashForLocation([formData.lat, formData.lng]);

    let finalImages = existingImages;
    if (imageFiles.length > 0) {
      const newImages = await Promise.all(imageFiles.map(file => compressImage(file)));
      finalImages = [...finalImages, ...newImages];
    }

    const safeImages = finalImages.slice(0, 4);

    const profileData = {
      ...formData,
      images: safeImages,
      img: safeImages[0], 
      uid: uid,
      geohash: hash,
      timestamp: Date.now()
    };

    // ✅ FIX 2: Change "profiles" to "users"
    await setDoc(doc(db, "users", uid), profileData, { merge: true });
    return profileData;
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error; // This allows the UI to stop the spinner and show an error
  }
};

export const deleteMyProfile = async (uid) => {
  // ✅ FIX 3: Change "profiles" to "users"
  await deleteDoc(doc(db, "users", uid));
};