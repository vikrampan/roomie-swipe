import { 
  collection, query, where, getDocs, onSnapshot, doc, getDoc, 
  orderBy, addDoc, updateDoc, serverTimestamp, limit 
} from 'firebase/firestore';
import { db } from '../firebase';

const profileCache = new Map();

// --- 1. GET MATCHES (One-Time Fetch - Saves $$$) ---
export const fetchMatches = async (currentUserId) => {
  try {
    const q = query(
      collection(db, "matches"), 
      where("users", "array-contains", currentUserId),
      orderBy("lastActivity", "desc"), // Ensure you have a composite index for this in Firestore
      limit(50) // Load max 50 recent matches
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return [];

    const results = [];
    const missingProfiles = new Set();

    // Pass 1: Process matches & identify missing profiles
    for (const matchDoc of snapshot.docs) {
      if (!matchDoc.id.includes('_')) continue;
      
      const data = matchDoc.data();
      const theirId = data.users.find(uid => uid !== currentUserId);
      
      if (!theirId) continue;

      // Check if we have denormalized data (The new "Cheap" way)
      if (data.profiles && data.profiles[theirId]) {
        results.push({
          id: matchDoc.id,
          theirId,
          ...data.profiles[theirId], // Name & Img directly from match doc
          lastMsg: data.lastMsg || "",
          lastSenderId: data.lastSenderId || "",
          timestamp: data.lastActivity,
          hasNotification: data.lastMsg && data.lastSenderId !== currentUserId
        });
      } else {
        // Legacy Data: We need to fetch this user's profile
        missingProfiles.add(theirId);
        results.push({
            id: matchDoc.id,
            theirId,
            isLegacy: true, // Marker to merge later
            data
        });
      }
    }

    // Pass 2: Bulk fetch missing profiles (Legacy support)
    const fetchPromises = [];
    missingProfiles.forEach(uid => {
      if (!profileCache.has(uid)) {
        const p = getDoc(doc(db, "users", uid)).then(snap => {
          if (snap.exists()) profileCache.set(uid, snap.data());
          else profileCache.set(uid, { name: "Deleted User", img: "https://via.placeholder.com/150" });
        });
        fetchPromises.push(p);
      }
    });

    if (fetchPromises.length > 0) await Promise.all(fetchPromises);

    // Pass 3: Final Merge
    return results.map(item => {
        if (!item.isLegacy) return item;
        
        const profile = profileCache.get(item.theirId);
        return {
            id: item.id,
            theirId: item.theirId,
            name: profile?.name || "Unknown",
            img: (profile?.images && profile.images[0]) || profile?.img || "https://via.placeholder.com/150",
            lastMsg: item.data.lastMsg || "",
            lastSenderId: item.data.lastSenderId || "",
            timestamp: item.data.lastActivity,
            hasNotification: item.data.lastMsg && item.data.lastSenderId !== currentUserId
        };
    });

  } catch (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
};

// --- 2. SEND MESSAGE ---
export const sendMessage = async (matchId, senderId, text) => {
  if (!text || !text.trim() || !matchId.includes('_')) return;

  try {
    await addDoc(collection(db, "matches", matchId, "messages"), {
      senderId, 
      text, 
      timestamp: serverTimestamp()
    });

    await updateDoc(doc(db, "matches", matchId), {
      lastMsg: text, 
      lastSenderId: senderId, 
      lastActivity: serverTimestamp()
    });
  } catch (error) {
    console.error("Send Failed:", error);
    throw error;
  }
};

// --- 3. SUBSCRIBE TO MESSAGES (Limited) ---
export const subscribeToMessages = (matchId, callback) => {
  if (!matchId || !matchId.includes('_')) {
      callback([]);
      return () => {};
  }

  const q = query(
      collection(db, "matches", matchId, "messages"), 
      orderBy("timestamp", "asc"),
      limit(20) // 🚀 COST OPTIMIZATION: Only load last 20 messages
  );
  
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
    }));
    callback(msgs);
  }, (error) => {
      console.error("Message Listener Error:", error);
      callback([]);
  });
};