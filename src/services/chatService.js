import { 
  collection, query, where, getDocs, onSnapshot, doc, getDoc, 
  orderBy, addDoc, updateDoc, serverTimestamp, limit 
} from 'firebase/firestore';
import { db } from '../firebase';
import { triggerMessageEmail } from './emailService';

const profileCache = new Map();

// --- 1. GET MATCHES ---
export const fetchMatches = async (currentUserId) => {
  try {
    const q = query(
      collection(db, "matches"), 
      where("users", "array-contains", currentUserId),
      orderBy("lastActivity", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    const results = [];
    const missingProfiles = new Set();

    for (const matchDoc of snapshot.docs) {
      if (!matchDoc.id.includes('_')) continue;
      const data = matchDoc.data();
      const theirId = data.users.find(uid => uid !== currentUserId);
      if (!theirId) continue;

      if (data.profiles && data.profiles[theirId]) {
        results.push({
          id: matchDoc.id,
          theirId,
          email: data.profiles[theirId].email, // ✅ Accessing denormalized email
          ...data.profiles[theirId],
          lastMsg: data.lastMsg || "",
          lastSenderId: data.lastSenderId || "",
          timestamp: data.lastActivity,
          hasNotification: data.lastMsg && data.lastSenderId !== currentUserId
        });
      } else {
        missingProfiles.add(theirId);
        results.push({ id: matchDoc.id, theirId, isLegacy: true, data });
      }
    }

    const fetchPromises = [];
    missingProfiles.forEach(uid => {
      if (!profileCache.has(uid)) {
        const p = getDoc(doc(db, "users", uid)).then(snap => {
          if (snap.exists()) profileCache.set(uid, snap.data());
          else profileCache.set(uid, { name: "Deleted", img: "" });
        });
        fetchPromises.push(p);
      }
    });
    if (fetchPromises.length > 0) await Promise.all(fetchPromises);

    return results.map(item => {
        if (!item.isLegacy) return item;
        const profile = profileCache.get(item.theirId);
        return {
            id: item.id,
            theirId: item.theirId,
            email: profile?.email || "",
            name: profile?.name || "Unknown",
            img: (profile?.images && profile.images[0]) || profile?.img || "",
            lastMsg: item.data.lastMsg || "",
            lastSenderId: item.data.lastSenderId || "",
            timestamp: item.data.lastActivity,
            hasNotification: item.data.lastMsg && item.data.lastSenderId !== currentUserId
        };
    });
  } catch (error) { console.error("Match fetch failed", error); return []; }
};

// --- 2. SEND MESSAGE (With Email Trigger) ---
export const sendMessage = async (matchId, senderId, text) => {
  if (!text || !text.trim() || !matchId.includes('_')) return;

  try {
    // 1. Save Message to Subcollection
    await addDoc(collection(db, "matches", matchId, "messages"), {
      senderId, 
      text, 
      timestamp: serverTimestamp()
    });

    // 2. Update Match Document
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);
    const matchData = matchSnap.data();

    await updateDoc(matchRef, {
      lastMsg: text, 
      lastSenderId: senderId, 
      lastActivity: serverTimestamp()
    });

    // 3. 🚀 TRIGGER MESSAGE EMAIL
    const recipientId = matchData.users.find(uid => uid !== senderId);
    const recipient = matchData.profiles[recipientId];
    const sender = matchData.profiles[senderId];

    if (recipient?.email) {
        triggerMessageEmail(recipient.email, sender.name, text);
    }

  } catch (error) { console.error("Send Failed", error); throw error; }
};

// --- 3. SUBSCRIBE TO MESSAGES ---
export const subscribeToMessages = (matchId, callback) => {
  if (!matchId || !matchId.includes('_')) { callback([]); return () => {}; }
  const q = query(collection(db, "matches", matchId, "messages"), orderBy("timestamp", "asc"), limit(20));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
      if (error.code === 'permission-denied') console.warn("Listener closed on unmatch.");
      else console.error("Listener Error", error);
      callback([]);
  });
};