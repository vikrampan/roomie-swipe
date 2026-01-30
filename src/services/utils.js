/**
 * src/services/utils.js
 */

// 1. Precise Distance Calculator (Haversine)
export const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

// 2. Compatibility Algorithm (Vibe Score)
export const calculateCompatibility = (myTags = [], theirTags = []) => {
  if (!myTags || !theirTags || myTags.length === 0) return 60;
  const common = myTags.filter(tag => theirTags.includes(tag));
  const baseScore = Math.round((common.length / Math.max(myTags.length, theirTags.length)) * 100);
  // Psychological padding: keep scores between 60% and 99% for dopamine
  return Math.min(Math.max(baseScore + 50, 60), 99);
};

// 3. Reverse Geocoding
export const getCityFromCoordinates = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return data.address.city || data.address.town || data.address.village || "My Zone";
  } catch (e) { return "Live Zone"; }
};

// 4. Haptic Feedback Engine
export const triggerHaptic = (type = 'light') => {
  if (!window.navigator?.vibrate) return;
  const patterns = { success: [50, 30, 50], warning: 100, heavy: 80, light: 15 };
  window.navigator.vibrate(patterns[type] || patterns.light);
};

// 5. Image Compression
export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 600;
        const scale = MAX / img.width;
        canvas.width = MAX;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};