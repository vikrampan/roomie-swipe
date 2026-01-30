import { collection, query, orderBy, getDocs, startAt, endAt, where } from 'firebase/firestore';
import { db } from '../firebase';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

export const getNearbyUsers = async (currentUser, location, radiusKm, filters, blockedIds) => {
  if (!currentUser || !location || !location.lat) {
    return [];
  }

  const excludeIds = new Set();
  
  try {
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

    const [passedSnap, likedSnap] = await Promise.all([
      getDocs(passesQuery),
      getDocs(likesQuery)
    ]);

    passedSnap.docs.forEach(d => excludeIds.add(d.data().to));
    likedSnap.docs.forEach(d => excludeIds.add(d.data().to));

  } catch (error) {
    console.warn("Feed Filter Warning: Showing all users.", error);
  }

  const center = [location.lat, location.lng];
  const radiusInM = radiusKm * 1000;
  const bounds = geohashQueryBounds(center, radiusInM);
  
  const promises = [];
  for (const b of bounds) {
    // ✅ Updated from 'profiles' to 'users'
    const q = query(
      collection(db, 'users'), 
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
      
      if (data.uid === currentUser.uid) continue; 
      if (blockedIds?.includes(doc.id)) continue;  
      if (excludeIds.has(doc.id)) continue;       
      
      if (filters?.gender !== "All" && data.gender !== filters.gender) continue; 

      const distanceInKm = distanceBetween([data.lat, data.lng], center);
      if (distanceInKm <= radiusKm) {
        results.push({ id: doc.id, ...data });
      }
    }
  }
  return results;
};