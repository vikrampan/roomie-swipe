import { doc, runTransaction, setDoc, deleteDoc, getDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore'; 
import { db } from '../firebase';

// --- HELPER: Get Minimal Profile Snapshot ---
const getProfileSnapshot = async (uid) => {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            const data = snap.data();
            let displayImage = "https://via.placeholder.com/150";

            if (data.userRole === 'host' && data.roomImages?.length > 0) {
                displayImage = data.roomImages[0]; 
            } else if (data.images?.length > 0) {
                displayImage = data.images[0]; 
            } else if (data.img) {
                displayImage = data.img; 
            }

            return { 
                uid: uid,
                name: data.name || "Unknown", 
                email: data.email || "", 
                age: data.age || "?",
                img: displayImage,
                userRole: data.userRole || "hunter", 
                occupation: data.occupation || "Student",
                city: data.city || ""
            };
        }
    } catch (e) {
        console.warn("Profile snapshot fetch failed", e);
    }
    return { name: "Unknown", img: "https://via.placeholder.com/150", email: "" };
};

// --- 1. SWIPE RIGHT (LIKE & MATCH) ---
export const swipeRight = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return { isMatch: false };

  const matchId = [myUid, targetUid].sort().join("_");
  const myInteractionId = `${myUid}_${targetUid}`;
  const theirInteractionId = `${targetUid}_${myUid}`;

  try {
    const myProfileSnapshot = await getProfileSnapshot(myUid);
    const theirProfileSnapshot = await getProfileSnapshot(targetUid);

    const result = await runTransaction(db, async (transaction) => {
      const reverseLikeRef = doc(db, "interactions", theirInteractionId);
      const reverseLikeSnap = await transaction.get(reverseLikeRef);

      const isMatch = reverseLikeSnap.exists() && reverseLikeSnap.data().type === 'like';

      // Record OUR like
      const likeRef = doc(db, "interactions", myInteractionId);
      transaction.set(likeRef, {
        fromUserId: myUid,
        toUserId: targetUid,
        fromData: myProfileSnapshot,
        type: 'like',
        timestamp: serverTimestamp(),
        isMatch: isMatch,
        isRevealed: false 
      });

      if (isMatch) {
        const matchRef = doc(db, "matches", matchId);
        transaction.set(matchRef, {
          users: [myUid, targetUid], 
          profiles: {
            [myUid]: myProfileSnapshot,
            [targetUid]: theirProfileSnapshot
          },
          lastActivity: serverTimestamp(),
          timestamp: Date.now(),
          lastMsg: "It's a Match! Say hello 👋",
          lastSenderId: "system",
          unreadCount: { [myUid]: 0, [targetUid]: 0 },
          readStatus: { [myUid]: false, [targetUid]: false } 
        });

        transaction.update(reverseLikeRef, { isMatch: true });
        return { isMatch: true, matchData: theirProfileSnapshot };
      }
      
      return { isMatch: false };
    });

    return result;
  } catch (e) {
    console.error("Swipe Error:", e);
    return { isMatch: false };
  }
};

// --- 2. SWIPE LEFT (PASS) ---
export const swipeLeft = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return;
  try {
    const interactionId = `${myUid}_${targetUid}`;
    await setDoc(doc(db, "interactions", interactionId), {
        fromUserId: myUid,
        toUserId: targetUid,
        type: 'nope',
        timestamp: serverTimestamp()
    });
    return { success: true };
  } catch (e) { console.error("Pass Error:", e); }
};

// --- 3. UNMATCH ---
export const unmatchUser = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return false;
  const matchId = [myUid, targetUid].sort().join("_");
  try {
    await deleteDoc(doc(db, "matches", matchId));
    await deleteDoc(doc(db, "interactions", `${myUid}_${targetUid}`));
    await deleteDoc(doc(db, "interactions", `${targetUid}_${myUid}`));
    return true;
  } catch (e) { console.error("Unmatch Error:", e); return false; }
};

// --- 4. SUBMIT BUG REPORT / FEEDBACK (New Feature) ---
export const submitFeedback = async (uid, message) => {
    if (!message || !message.trim()) return;
    try {
        await addDoc(collection(db, "feedback"), {
            uid: uid,
            message: message,
            timestamp: serverTimestamp(),
            status: 'new' // for admin dashboard filtering later
        });
        return true;
    } catch (e) {
        console.error("Feedback Error:", e);
        throw new Error("Could not send feedback");
    }
};