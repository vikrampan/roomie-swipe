import { collection, query, orderBy, getDocs, startAt, endAt, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { AD_INVENTORY } from '../data/adData'; 

// --- 1. CACHING HELPER ---
// Prevents re-reading the same users from Firestore in one session to save costs.
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

  // --- A. FETCH RECENT HISTORY (RESIFIED FOR INTERACTIONS COLLECTION) ---
  // ✅ FIX: No longer querying non-existent 'passes' or 'likes' collections.
  // This resolves the "insufficient permissions" error.
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
      
      // 1. Basic Exclusions (Self, History, Seen Cache)
      if (doc.id === currentUser.uid || excludeIds.has(doc.id) || cachedSeen.has(doc.id)) continue;
      
      // 2. Gender Filter
      if (filters?.gender && filters.gender !== "All" && data.gender !== filters.gender) continue; 

      // 3. STRICT ROLE FILTER (Host sees Hunters, Hunter sees Hosts)
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
  if (!myProfile) return feedUsers;

  const usersWithAds = [];
  let adCount = 0; 

  const hostAds = [
    AD_INVENTORY.cleaning,       
    AD_INVENTORY.quickGrocery,   
    AD_INVENTORY.premiumFurniture, 
    AD_INVENTORY.wifi,           
    AD_INVENTORY.foodDelivery    
  ];

  const hunterAds = [
    AD_INVENTORY.packers,        
    AD_INVENTORY.wifi,           
    AD_INVENTORY.foodDelivery,   
    AD_INVENTORY.budgetFurniture,
    AD_INVENTORY.coliving        
  ];

  const targetAds = myProfile.userRole === 'host' ? hostAds : hunterAds;

  feedUsers.forEach((user, index) => {
    usersWithAds.push(user);

    // ✅ Inject an AD after every 3rd user card
    if ((index + 1) % 3 === 0) {
      const adIndex = adCount % targetAds.length; 
      const selectedAd = targetAds[adIndex];

      if (selectedAd) {
        usersWithAds.push({
          ...selectedAd,
          isAd: true, 
          id: `${selectedAd.id}_${index}_${Date.now()}` 
        });
        adCount++; 
      }
    }
  });

  return usersWithAds;
};