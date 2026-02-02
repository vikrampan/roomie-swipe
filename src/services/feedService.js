import { collection, query, orderBy, getDocs, startAt, endAt, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { AD_INVENTORY } from '../data/adData'; // Ensure this file exists

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
  // Safety Check: If no user or location, stop immediately.
  if (!currentUser || !location || !location.lat) {
    console.warn("Feed Error: Missing user or location data");
    return [];
  }

  const excludeIds = new Set([...(blockedIds || []), currentUser.uid]);
  const cachedSeen = getCachedIds();

  // A. FETCH RECENT HISTORY (Passes & Likes)
  // We exclude anyone you have interacted with in the last 30 days.
  try {
    const recentLimit = Date.now() - (30 * 24 * 60 * 60 * 1000); 
    
    // Run these in parallel for speed
    const [passes, likes] = await Promise.all([
      getDocs(query(collection(db, "passes"), where("from", "==", currentUser.uid), where("timestamp", ">", recentLimit))),
      getDocs(query(collection(db, "likes"), where("from", "==", currentUser.uid), where("timestamp", ">", recentLimit)))
    ]);

    passes.docs.forEach(d => excludeIds.add(d.data().to));
    likes.docs.forEach(d => excludeIds.add(d.data().to));
  } catch (error) {
    console.warn("History fetch warning:", error);
  }

  // B. GEOHASH QUERY (The Efficient Search Engine)
  const center = [location.lat, location.lng];
  const radiusInM = radiusKm * 1000;
  const bounds = geohashQueryBounds(center, radiusInM);
  
  const results = [];
  const MAX_RESULTS = 50; // Increased to ensure we find people

  // Loop through Geohash bounds
  for (const b of bounds) {
    if (results.length >= MAX_RESULTS) break;

    const q = query(
      collection(db, 'users'), 
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1]),
      limit(50) // Fetch larger batch to allow for filtering
    );

    const snap = await getDocs(q);

    for (const doc of snap.docs) {
      const data = doc.data();
      
      // --- FILTERING LOGIC ---

      // 1. Basic Exclusions (Self, History, Seen Cache)
      if (doc.id === currentUser.uid) continue;
      if (excludeIds.has(doc.id)) continue;
      if (cachedSeen.has(doc.id)) continue; 
      
      // 2. Gender Filter (Only if strictly set)
      if (filters?.gender && filters.gender !== "All" && data.gender !== filters.gender) continue; 

      // 3. ✅ STRICT ROLE FILTER (The Supply vs Demand Fix)
      // If I am a Host, I should NOT see other Hosts.
      // If I am a Hunter, I should NOT see other Hunters.
      if (filters?.role && data.userRole === filters.role) continue;

      // 4. Distance Check (Precise Calculation)
      const userLat = data.lat || data.latitude;
      const userLng = data.lng || data.long || data.longitude;

      if (!userLat || !userLng) continue;

      const distanceInKm = distanceBetween([userLat, userLng], center);
      
      // 5. VISIBILITY CHECK:
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

  // Save new IDs to cache so we don't fetch them again this session
  addToCache(results.map(r => r.id));
  
  return results;
};

// --- 3. SMART AD INJECTION LOGIC (ROTATION ENGINE) ---
export const injectSmartAds = (feedUsers, myProfile) => {
  if (!myProfile) return feedUsers;

  const usersWithAds = [];
  let adCount = 0; // Track how many ads we've inserted to rotate them

  // --- A. DEFINE ROTATION LISTS (Expanded with New Ads) ---
  // Rotation for HOSTS (Need services for their property & lifestyle)
  const hostAds = [
    AD_INVENTORY.cleaning,       // 1. Clean the room
    AD_INVENTORY.quickGrocery,   // 2. Daily essentials
    AD_INVENTORY.premiumFurniture, // 3. Upgrade the room
    AD_INVENTORY.wifi,           // 4. Connectivity
    AD_INVENTORY.foodDelivery    // 5. Lazy dinner
  ];

  // Rotation for HUNTERS (Need services for moving & settling in)
  const hunterAds = [
    AD_INVENTORY.packers,        // 1. Move stuff
    AD_INVENTORY.wifi,           // 2. Get internet
    AD_INVENTORY.foodDelivery,   // 3. No kitchen set up yet
    AD_INVENTORY.budgetFurniture,// 4. Cheap bed/mattress
    AD_INVENTORY.coliving        // 5. Alternative options
  ];

  // --- B. SELECT TARGET LIST ---
  const targetAds = myProfile.userRole === 'host' ? hostAds : hunterAds;

  // --- C. INJECT ADS ---
  feedUsers.forEach((user, index) => {
    usersWithAds.push(user);

    // ✅ CHANGED: Inject an AD after every 3rd user card (High Frequency)
    if ((index + 1) % 3 === 0) {
      
      // Calculate which ad to show using Modulo (%) 
      // This ensures we cycle through the entire list 0 -> 1 -> ... -> 4 -> 0
      const adIndex = adCount % targetAds.length; 
      const selectedAd = targetAds[adIndex];

      if (selectedAd) {
        usersWithAds.push({
          ...selectedAd,
          isAd: true, // Flag for App.jsx to render AdCard instead of Profile Card
          // Unique ID ensures React doesn't glitch when rendering the list
          id: `${selectedAd.id}_${index}_${Date.now()}` 
        });
        
        adCount++; // Increment counter so next ad is different
      }
    }
  });

  return usersWithAds;
};