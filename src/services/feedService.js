import { collection, query, orderBy, getDocs, startAt, endAt, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

// Helper to prevent re-reading the same users in one session
const getCachedIds = () => {
  try { return new Set(JSON.parse(sessionStorage.getItem('seen_users') || '[]')); } 
  catch { return new Set(); }
};

const addToCache = (newIds) => {
  const current = getCachedIds();
  newIds.forEach(id => current.add(id));
  sessionStorage.setItem('seen_users', JSON.stringify(Array.from(current)));
};

export const getNearbyUsers = async (currentUser, location, radiusKm, filters, blockedIds) => {
  if (!currentUser || !location || !location.lat) return [];

  const excludeIds = new Set([...(blockedIds || []), currentUser.uid]);
  const cachedSeen = getCachedIds();

  // 1. Get recent interactions to exclude
  try {
    const recentLimit = Date.now() - (30 * 24 * 60 * 60 * 1000); 
    const [passes, likes] = await Promise.all([
      getDocs(query(collection(db, "passes"), where("from", "==", currentUser.uid), where("timestamp", ">", recentLimit))),
      getDocs(query(collection(db, "likes"), where("from", "==", currentUser.uid), where("timestamp", ">", recentLimit)))
    ]);
    passes.docs.forEach(d => excludeIds.add(d.data().to));
    likes.docs.forEach(d => excludeIds.add(d.data().to));
  } catch (error) {
    console.warn("History fetch warning:", error);
  }

  // 2. GEOHASH QUERY
  const center = [location.lat, location.lng];
  const radiusInM = radiusKm * 1000;
  const bounds = geohashQueryBounds(center, radiusInM);
  
  const results = [];
  const MAX_RESULTS = 20; 

  for (const b of bounds) {
    if (results.length >= MAX_RESULTS) break;

    const q = query(
      collection(db, 'users'), 
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1]),
      limit(40)
    );

    const snap = await getDocs(q);

    for (const doc of snap.docs) {
      const data = doc.data();
      
      // --- CRITICAL FILTERS ---
      // 1. Exclude Self (Using Document ID is safer than data.uid)
      if (doc.id === currentUser.uid) continue;

      // 2. Exclude Blocked/Interacted
      if (excludeIds.has(doc.id)) continue;
      
      // 3. Cache Check (Uncomment for production cost saving)
      // if (cachedSeen.has(doc.id)) continue; 
      
      // 4. Gender Filter
      if (filters?.gender && filters.gender !== "All" && data.gender !== filters.gender) continue; 

      // 5. Robust Coordinate Extraction
      const userLat = data.lat || data.latitude;
      const userLng = data.lng || data.long || data.longitude;

      if (!userLat || !userLng) continue;

      // 6. Strict Distance Check
      const distanceInKm = distanceBetween([userLat, userLng], center);
      
      if (distanceInKm <= radiusKm) {
        results.push({ 
            id: doc.id, 
            ...data, 
            distance: distanceInKm.toFixed(1) 
        });
        if (results.length >= MAX_RESULTS) break;
      }
    }
  }

  addToCache(results.map(r => r.id));
  return results;
};