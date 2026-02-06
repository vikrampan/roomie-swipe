import { collection, query, orderBy, getDocs, startAt, endAt, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
// ✅ FIX 1: Import the correct name from your new file
import { AFFILIATE_ADS } from '../data/adData'; 

// --- 1. CACHING HELPER ---
const getCachedIds = () => {
  try { 
    return new Set(JSON.parse(sessionStorage.getItem('seen_users') || '[]')); 
  } catch { 
    return new Set(); 
  }
};

const addToCache = (newIds) => {
  const current = getCachedIds();
  newIds.forEach(id => current.add(id));
  sessionStorage.setItem('seen_users', JSON.stringify(Array.from(current)));
};

// --- 2. MAIN FUNCTION: GET NEARBY USERS ---
export const getNearbyUsers = async (currentUser, location, radiusKm, filters, blockedIds) => {
  if (!currentUser || !location || !location.lat) {
    console.warn("Feed Error: Missing user or location data");
    return [];
  }

  const excludeIds = new Set([...(blockedIds || []), currentUser.uid]);
  const cachedSeen = getCachedIds();

  // --- A. FETCH RECENT HISTORY ---
  try {
    const recentLimit = Date.now() - (30 * 24 * 60 * 60 * 1000); 
    
    const q = query(
      collection(db, "interactions"), 
      where("fromUserId", "==", currentUser.uid), 
      where("timestamp", ">", new Date(recentLimit))
    );

    const historySnap = await getDocs(q);
    historySnap.docs.forEach(d => excludeIds.add(d.data().toUserId));
  } catch (error) {
    console.warn("History fetch warning:", error);
  }

  // --- B. GEOHASH QUERY ---
  const center = [location.lat, location.lng];
  const radiusInM = radiusKm * 1000;
  const bounds = geohashQueryBounds(center, radiusInM);
  
  const results = [];
  const MAX_RESULTS = 50; 

  for (const b of bounds) {
    if (results.length >= MAX_RESULTS) break;

    const q = query(
      collection(db, 'users'), 
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1]),
      limit(50) 
    );

    const snap = await getDocs(q);

    for (const doc of snap.docs) {
      const data = doc.data();
      
      // 1. Basic Exclusions
      if (doc.id === currentUser.uid || excludeIds.has(doc.id) || cachedSeen.has(doc.id)) continue;
      
      // 2. Gender Filter
      if (filters?.gender && filters.gender !== "All" && data.gender !== filters.gender) continue; 

      // 3. STRICT ROLE FILTER
      if (filters?.role && data.userRole === filters.role) continue;

      // 4. Distance Calculation
      const userLat = data.lat || data.latitude;
      const userLng = data.lng || data.long || data.longitude;

      if (!userLat || !userLng) continue;

      const distanceInKm = distanceBetween([userLat, userLng], center);
      
      // 5. Visibility Check
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

// --- 3. SMART AD INJECTION LOGIC ---
export const injectSmartAds = (feedUsers, myProfile) => {
  // If no ads available or no profile, return original feed
  if (!myProfile || !AFFILIATE_ADS || AFFILIATE_ADS.length === 0) return feedUsers;

  const usersWithAds = [];
  let adCount = 0; 

  feedUsers.forEach((user, index) => {
    usersWithAds.push(user);

    // ✅ Inject an AD after every 3rd user card (Index 2, 5, 8...)
    if ((index + 1) % 3 === 0) {
      
      // ✅ FIX 2: Simply cycle through the new AFFILIATE_ADS array
      const adIndex = adCount % AFFILIATE_ADS.length; 
      const selectedAd = AFFILIATE_ADS[adIndex];

      if (selectedAd) {
        usersWithAds.push({
          ...selectedAd,
          isAd: true, 
          // Ensure unique ID so React doesn't crash on keys
          id: `ad_${selectedAd.id}_${index}` 
        });
        adCount++; 
      }
    }
  });

  return usersWithAds;
};