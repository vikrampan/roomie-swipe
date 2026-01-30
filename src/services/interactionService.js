import { doc, getDoc, setDoc, addDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'; // Added deleteDoc
import { db } from '../firebase';

export const swipeRight = async (myUid, targetUid) => {
  await setDoc(doc(db, "likes", `${myUid}_${targetUid}`), {
    from: myUid,
    to: targetUid,
    timestamp: Date.now()
  });

  const reverseLikeSnap = await getDoc(doc(db, "likes", `${targetUid}_${myUid}`));

  if (reverseLikeSnap.exists()) {
    const matchId = [myUid, targetUid].sort().join("_");
    await setDoc(doc(db, "matches", matchId), {
      users: [myUid, targetUid],
      lastActivity: serverTimestamp(),
      timestamp: Date.now()
    }, { merge: true });
    return { isMatch: true };
  }

  return { isMatch: false };
};

export const swipeLeft = async (myUid, targetUid) => {
  await setDoc(doc(db, "passes", `${myUid}_${targetUid}`), {
    from: myUid,
    to: targetUid,
    timestamp: Date.now()
  });
};

// LOGIC FIX: Updated Report function to DESTROY the match
export const reportUser = async (reporterUid, offenderId, offenderName, reason) => {
  // 1. Create the report
  await addDoc(collection(db, "reports"), { 
    reporterId: reporterUid,
    offenderId: offenderId, 
    offenderName: offenderName, 
    reason: reason, 
    timestamp: serverTimestamp() 
  });

  // 2. LOGIC FIX: Check if a match exists and DELETE it to stop chatting
  const matchId = [reporterUid, offenderId].sort().join("_");
  const matchRef = doc(db, "matches", matchId);
  
  try {
    // We try to delete the match document. 
    // Even if it doesn't exist (they just swiped left), this is safe to run.
    await deleteDoc(matchRef);
  } catch (e) {
    // Ignore error if match didn't exist
    console.log("No match found to delete, just reporting.");
  }
};