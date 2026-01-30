import { collection, query, where, doc, getDoc, addDoc, updateDoc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Memory cache to prevent re-downloading profile data on every message update
const profileCache = new Map();

// 1. LISTEN TO TOTAL UNREAD COUNT (For the floating UI badge)
export const subscribeToUnreadCount = (currentUserId, callback) => {
  const q = query(
    collection(db, "matches"),
    where("users", "array-contains", currentUserId)
  );

  return onSnapshot(q, (snapshot) => {
    let unreadCount = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // If last message exists and I am NOT the one who sent it, it's unread
      if (data.lastMsg && data.lastSenderId !== currentUserId) {
        unreadCount++;
      }
    });
    callback(unreadCount);
  });
};

// 2. REAL-TIME MATCH LISTENER (Optimized with Caching)
export const subscribeToMatches = (currentUserId, callback) => {
  const q = query(
    collection(db, "matches"), 
    where("users", "array-contains", currentUserId),
    orderBy("lastActivity", "desc")
  );

  return onSnapshot(q, async (snapshot) => {
    const neededIds = new Set();
    const rawMatches = [];

    snapshot.docs.forEach(matchDoc => {
      const data = matchDoc.data();
      const theirId = data.users.find(uid => uid !== currentUserId);
      if (theirId) {
        neededIds.add(theirId);
        rawMatches.push({ id: matchDoc.id, theirId, data });
      }
    });

    // Fetch only profiles not already in memory
    const fetchPromises = [];
    neededIds.forEach(uid => {
      if (!profileCache.has(uid)) {
        const p = getDoc(doc(db, "profiles", uid)).then(snap => {
          if (snap.exists()) {
            profileCache.set(uid, snap.data());
          } else {
            profileCache.set(uid, { name: "Deleted User", img: "https://via.placeholder.com/150", isDeleted: true });
          }
        });
        fetchPromises.push(p);
      }
    });

    if (fetchPromises.length > 0) await Promise.all(fetchPromises);

    const finalMatchList = rawMatches.map(m => {
      const profile = profileCache.get(m.theirId);
      return {
        id: m.id,
        ...profile,
        lastMsg: m.data.lastMsg || "",
        lastSenderId: m.data.lastSenderId || "",
        hasNotification: m.data.lastMsg && m.data.lastSenderId !== currentUserId
      };
    });

    callback(finalMatchList);
  });
};

// 3. SEND MESSAGE
export const sendMessage = async (matchId, senderId, text) => {
  if (!text.trim()) return;

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
};

// 4. SUBSCRIBE TO SPECIFIC CHAT ROOM
export const subscribeToMessages = (matchId, callback) => {
  const q = query(
    collection(db, "matches", matchId, "messages"),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};