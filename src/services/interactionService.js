import { doc, runTransaction, setDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../firebase';

export const swipeRight = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return { isMatch: false };

  // 1. ALWAYS SORT IDs to ensure A->B and B->A generate the same Match ID
  const matchId = [myUid, targetUid].sort().join("_");

  try {
    return await runTransaction(db, async (transaction) => {
      // Check if they liked us
      const reverseLikeRef = doc(db, "likes", `${targetUid}_${myUid}`);
      const reverseLikeSnap = await transaction.get(reverseLikeRef);

      // Record our like
      const likeRef = doc(db, "likes", `${myUid}_${targetUid}`);
      transaction.set(likeRef, {
        from: myUid,
        to: targetUid,
        timestamp: Date.now()
      });

      // If Mutual Like -> Create Match
      if (reverseLikeSnap.exists()) {
        const matchRef = doc(db, "matches", matchId);
        
        transaction.set(matchRef, {
          users: [myUid, targetUid], // Necessary for "array-contains" query
          lastActivity: serverTimestamp(),
          timestamp: Date.now(),
          lastMsg: "New Match! Say Hello 👋",
          lastSenderId: "system"
        });
        
        return { isMatch: true };
      }
      
      return { isMatch: false };
    });
  } catch (e) {
    console.error("Swipe Error:", e);
    return { isMatch: false };
  }
};

export const swipeLeft = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return;
  try {
    await setDoc(doc(db, "passes", `${myUid}_${targetUid}`), {
        from: myUid,
        to: targetUid,
        timestamp: Date.now()
    });
  } catch (e) { console.error(e); }
};

export const unmatchUser = async (myUid, targetUid) => {
  const matchId = [myUid, targetUid].sort().join("_");
  try {
    await deleteDoc(doc(db, "matches", matchId));
    // Clean up likes so they don't reappear immediately
    await deleteDoc(doc(db, "likes", `${myUid}_${targetUid}`));
    await deleteDoc(doc(db, "likes", `${targetUid}_${myUid}`));
    return true;
  } catch (e) { return true; }
};