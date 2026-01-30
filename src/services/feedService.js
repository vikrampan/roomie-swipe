import { collection, query, orderBy, getDocs, startAt, endAt, where } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

export const getNearbyUsers = async (currentUser, location, radiusKm, filters, blockedIds) => {
  // Safety check: Needs user and location to work
  if (!currentUser || !location || !location.lat) {
    console.warn("FeedService: Missing location or user.");
    return [];
  }

  // 1. FILTERING (Fail-Safe Mode)
  // We try to fetch "Likes" and "Passes" to hide them.
  // If the Database Index is missing, we catch the error and PROCEED ANYWAY.
  const excludeIds = new Set();
  
  try {
    // Only check last 7 days to keep it fast
    const recentLimit = Date.now() - (7 * 24 * 60 * 60 * 1000); 

    const passesQuery = query(
      collection(db, "passes"),
      where("from", "==", currentUser.uid),
      where("timestamp", ">", recentLimit)
    );
    
    const likesQuery = query(
      collection(db, "likes"),
      where("from", "==", currentUser.uid),
      where("timestamp", ">", recentLimit)
    );

    // Run parallel
    const [passedSnap, likedSnap] = await Promise.all([
      getDocs(passesQuery),
      getDocs(likesQuery)
    ]);

    passedSnap.docs.forEach(d => excludeIds.add(d.data().to));
    likedSnap.docs.forEach(d => excludeIds.add(d.data().to));

  } catch (error) {
    // ⚠️ THIS IS THE CRITICAL FIX ⚠️
    // If the index is missing, we log it but DO NOT STOP.
    console.warn("⚠️ Feed Filter Warning: Indexes likely missing. Showing all users.", error);
  }

  // 2. GEOFIRE QUERY (Find users nearby)
  const center = [location.lat, location.lng];
  const radiusInM = radiusKm * 1000;
  const bounds = geohashQueryBounds(center, radiusInM);
  
  const promises = [];
  for (const b of bounds) {
    const q = query(
      collection(db, 'profiles'),
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1])
    );
    promises.push(getDocs(q));
  }

  const snapshots = await Promise.all(promises);
  const results = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const data = doc.data();
      
      // 3. FINAL CHECKS
      if (data.uid === currentUser.uid) continue; // Don't show myself
      if (blockedIds.includes(doc.id)) continue;  // Don't show blocked
      if (excludeIds.has(doc.id)) continue;       // Don't show swiped (if filter worked)
      
      // Gender Filter
      if (filters.gender !== "All" && data.gender !== filters.gender) continue; 

      // Precise Distance Logic
      const distanceInKm = distanceBetween([data.lat, data.lng], center);
      if (distanceInKm <= radiusKm) {
        results.push({ id: doc.id, ...data });
      }
    }
  }

  console.log(`FeedService: Found ${results.length} valid profiles near ${location.lat}, ${location.lng}`);
  return results;
};