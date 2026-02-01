import { 
  collection, query, where, onSnapshot, doc, getDoc, 
  orderBy, addDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

const profileCache = new Map();

// --- 1. LOAD MATCH LIST ---
export const subscribeToMatches = (currentUserId, callback) => {
  // Query: Find all matches where 'users' array contains my ID
  const q = query(
    collection(db, "matches"), 
    where("users", "array-contains", currentUserId),
    
  );

  return onSnapshot(q, async (snapshot) => {
    const rawMatches = [];
    const neededIds = new Set();

    snapshot.docs.forEach(matchDoc => {
      // 🛡️ Safety: Filter out bad data instantly
      if (!matchDoc.id.includes('_')) return;

      const data = matchDoc.data();
      const theirId = data.users.find(uid => uid !== currentUserId);
      
      if (theirId) {
        neededIds.add(theirId);
        rawMatches.push({ id: matchDoc.id, theirId, data });
      }
    });

    // Fetch Profiles
    const fetchPromises = [];
    neededIds.forEach(uid => {
      if (!profileCache.has(uid)) {
        const p = getDoc(doc(db, "users", uid)).then(snap => {
          if (snap.exists()) profileCache.set(uid, snap.data());
          else profileCache.set(uid, { name: "Deleted User", img: "https://via.placeholder.com/150" });
        });
        fetchPromises.push(p);
      }
    });

    if (fetchPromises.length > 0) await Promise.all(fetchPromises);

    // Merge Data
    const results = rawMatches.map(m => {
      const profile = profileCache.get(m.theirId);
      return {
        id: m.id,
        theirId: m.theirId,
        name: profile?.name || "Unknown",
        img: profile?.img || "https://via.placeholder.com/150",
        lastMsg: m.data.lastMsg || "",
        lastSenderId: m.data.lastSenderId || "",
        hasNotification: m.data.lastMsg && m.data.lastSenderId !== currentUserId
      };
    });
    results.sort((a, b) => {
       const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
       const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
       return tB - tA; // Newest on top
    });

    callback(results);
  });
};

// --- 2. SEND MESSAGE ---
export const sendMessage = async (matchId, senderId, text) => {
  if (!text.trim()) return;

  try {
    // A. Add message to subcollection
    await addDoc(collection(db, "matches", matchId, "messages"), {
      senderId, 
      text, 
      timestamp: serverTimestamp()
    });

    // B. Update dashboard preview
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

// --- 3. LOAD MESSAGES ---
export const subscribeToMessages = (matchId, callback) => {
  const q = query(
      collection(db, "matches", matchId, "messages"),
      orderBy("timestamp", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(msgs);
  }, (error) => {
    // If you see "Missing Permissions" here, it means the Match ID is wrong
    console.error("Message Listener Error:", error);
    callback([]);
  });
};