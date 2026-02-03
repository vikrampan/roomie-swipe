// src/services/utils.js

export const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

export const calculateCompatibility = (myTags = [], theirTags = []) => {
  if (!myTags || !theirTags || myTags.length === 0) return 75;
  const common = myTags.filter(tag => theirTags.includes(tag));
  const baseScore = Math.round((common.length / Math.max(myTags.length, theirTags.length)) * 100);
  return Math.min(Math.max(baseScore + 50, 60), 99);
};

// ✅ FIX: Prevents "403 Forbidden" from hanging the location spinner
export const getCityFromCoordinates = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    if (!res.ok) throw new Error("API Limit Reached");
    const data = await res.json();
    return data.address.city || data.address.town || data.address.village || "Local Area";
  } catch (e) { 
    console.warn("Location API blocked. Using fallback.");
    return "Dehradun"; // Default fallback to let users proceed
  }
};

export const triggerHaptic = (type = 'light') => {
  if (!window.navigator?.vibrate) return;
  const patterns = { success: [50, 30, 50], warning: 100, heavy: 80, light: 15 };
  window.navigator.vibrate(patterns[type] || patterns.light);
};

// ✅ NEW: God-Level "Frontend Shrink Ray"
// 1. Resizes to 1080p (HD quality)
// 2. Converts to WebP (Google's super-light format)
// 3. Compresses to 80% quality
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    // 1. Create a Reader
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // 2. Create a Canvas (The drawing board)
        const canvas = document.createElement('canvas');
        
        // 3. Calculate new size (Max width 1080px)
        const MAX_WIDTH = 1080;
        const scaleSize = MAX_WIDTH / img.width;
        
        // If image is already small, don't scale it up
        if (scaleSize >= 1) {
            canvas.width = img.width;
            canvas.height = img.height;
        } else {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
        }

        // 4. Draw image onto canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 5. THE MAGIC: Export as WebP with 80% quality
        // Note: 'image/webp' is supported in all modern browsers (Chrome, Edge, Firefox, Safari 14+)
        canvas.toBlob((blob) => {
            if (blob) {
                // Return the clean Blob ready for Firebase
                resolve(blob);
            } else {
                reject(new Error("Compression failed"));
            }
        }, 'image/webp', 0.8);
      };
      
      img.onerror = (err) => reject(new Error('Failed to load image'));
    };
    
    reader.onerror = (err) => reject(new Error('Failed to read file'));
  });
};

// 🔄 BACKWARD COMPATIBILITY: Old Base64 version (kept for any legacy code)
export const compressImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
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
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};