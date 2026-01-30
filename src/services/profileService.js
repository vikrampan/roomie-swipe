import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashForLocation } from 'geofire-common';
import { compressImage } from './utils';

export const getMyProfile = async (uid) => {
  const docRef = doc(db, "profiles", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const saveProfile = async (uid, formData, imageFiles, existingImages = []) => {
  const hash = geohashForLocation([formData.lat, formData.lng]);

  let finalImages = existingImages;
  if (imageFiles.length > 0) {
    // Uses the aggressive compressor from utils.js
    const newImages = await Promise.all(imageFiles.map(file => compressImage(file)));
    finalImages = [...finalImages, ...newImages];
  }

  // Ensure we don't exceed 4 images to stay safe on size
  const safeImages = finalImages.slice(0, 4);

  const profileData = {
    ...formData,
    images: safeImages,
    img: safeImages[0], 
    uid: uid,
    geohash: hash,
    timestamp: Date.now()
  };

  await setDoc(doc(db, "profiles", uid), profileData, { merge: true });
  return profileData;
};

export const deleteMyProfile = async (uid) => {
  await deleteDoc(doc(db, "profiles", uid));
  // Note: In a real app, you'd also delete likes/matches here via a Cloud Function
};