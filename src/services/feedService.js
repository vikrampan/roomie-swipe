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

      // 3. Distance Check (Precise Calculation)
      const userLat = data.lat || data.latitude;
      const userLng = data.lng || data.long || data.longitude;

      if (!userLat || !userLng) continue;

      const distanceInKm = distanceBetween([userLat, userLng], center);
      
      // 4. VISIBILITY CHECK:
      // We do NOT filter by Role here.
      // Hosts see Hunters. Hunters see Hosts. Everyone sees everyone within range.
      // The UI (Badges) will distinguish them.
      
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

// --- 3. SMART AD INJECTION LOGIC (Monetization Engine) ---
export const injectSmartAds = (feedUsers, myProfile) => {
  if (!myProfile) return feedUsers;

  const usersWithAds = [];
  
  feedUsers.forEach((user, index) => {
    usersWithAds.push(user);

    // Inject an AD after every 5th user card
    if ((index + 1) % 5 === 0) {
      
      let selectedAd = AD_INVENTORY.wifi; // Default Fallback Ad

      // --- LOGIC: HOST VS HUNTER ---

      if (myProfile?.userRole === 'host') {
        // --- HOST LOGIC (Has Room) ---
        // If room is Unfurnished/Semi -> Show Furniture Rental Ad
        if (myProfile.furnishing === 'Unfurnished' || myProfile.furnishing === 'Semi-Furnished') {
             selectedAd = AD_INVENTORY.premiumFurniture;
        } 
        // If room is fully furnished -> Show Cleaning Services Ad
        else {
             selectedAd = AD_INVENTORY.cleaning;
        }

      } else {
        // --- HUNTER LOGIC (Needs Room) ---
        
        // 1. Check Move-in Date (Urgency Trigger)
        if (myProfile?.moveInDate) {
            const moveDate = new Date(myProfile.moveInDate);
            const today = new Date();
            const diffDays = Math.ceil((moveDate - today) / (1000 * 60 * 60 * 24));
            
            // Moving in less than 10 days? -> PACKERS & MOVERS AD
            if (diffDays > 0 && diffDays < 10) {
                selectedAd = AD_INVENTORY.packers;
            }
        }

        // 2. Check Budget (If no urgency trigger)
        // Only override if we are currently falling back to Wifi
        if (selectedAd === AD_INVENTORY.wifi && myProfile?.rent) {
            // Safety: Ensure rent is a number
            const rent = parseInt(myProfile.rent, 10); 
            
            if (!isNaN(rent)) {
                if (rent > 20000) {
                    selectedAd = AD_INVENTORY.premiumFurniture; // Rich user -> Expensive Furniture
                } else if (rent < 8000) {
                    selectedAd = AD_INVENTORY.budgetFurniture; // Student -> Cheap Furniture
                }
            }
        }
      }

      // Add unique ID so React doesn't crash during rendering
      usersWithAds.push({
        ...selectedAd,
        isAd: true, // Flag for App.jsx to render AdCard instead of Profile Card
        id: selectedAd.id + `_${index}_${Date.now()}` 
      });
    }
  });

  return usersWithAds;
};