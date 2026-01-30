import { collection, query, where, doc, getDoc, addDoc, updateDoc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const profileCache = new Map();

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

    const fetchPromises = [];
    neededIds.forEach(uid => {
      if (!profileCache.has(uid)) {
        // ✅ Updated from 'profiles' to 'users'
        const p = getDoc(doc(db, "users", uid)).then(snap => {
          if (snap.exists()) {
            profileCache.set(uid, snap.data());
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

export const sendMessage = async (matchId, senderId, text) => {
  if (!text.trim()) return;
  await addDoc(collection(db, "matches", matchId, "messages"), {
    senderId, text, timestamp: serverTimestamp()
  });
  await updateDoc(doc(db, "matches", matchId), {
    lastMsg: text, lastSenderId: senderId, lastActivity: serverTimestamp()
  });
};

export const subscribeToMessages = (matchId, callback) => {
  const q = query(collection(db, "matches", matchId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};