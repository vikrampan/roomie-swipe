import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Helper to get the App URL for the CTA buttons
const APP_URL = "https://roomie-swipe.vercel.app"; // Replace with your actual Vercel URL

/**
 * 1. MATCH NOTIFICATION
 * Sent when two users like each other.
 */
export const triggerMatchEmail = async (toEmail, toName, partnerName) => {
  if (!toEmail) return;
  try {
    await addDoc(collection(db, "mail"), {
      to: toEmail,
      message: {
        subject: `New Match: You and ${partnerName}! 🏠`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 16px;">
            <h2 style="color: #db2777;">It's a Match, ${toName}!</h2>
            <p>You and <strong>${partnerName}</strong> liked each other's profiles.</p>
            <p>Ready to discuss the room? Start the conversation now.</p>
            <div style="margin-top: 25px;">
              <a href="${APP_URL}/chat" style="background: #db2777; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Message ${partnerName}</a>
            </div>
          </div>
        `
      },
      timestamp: serverTimestamp()
    });
  } catch (e) { console.error("Match email failed", e); }
};

/**
 * 2. NEW LIKE NOTIFICATION (Secret Admirer)
 * Sent when someone likes you, but you haven't swiped on them yet.
 */
export const triggerLikeEmail = async (toEmail, toName) => {
  if (!toEmail) return;
  try {
    await addDoc(collection(db, "mail"), {
      to: toEmail,
      message: {
        subject: "Someone just liked your profile! ❤️",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 16px;">
            <h2 style="color: #4f46e5;">New Secret Admirer!</h2>
            <p>Hi ${toName}, someone new just liked your profile on RoomieSwipe.</p>
            <p>Swipe through your feed or check the "Who Liked Me" section to find out who it is.</p>
            <div style="margin-top: 25px;">
              <a href="${APP_URL}/likes" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">See Who Liked Me</a>
            </div>
          </div>
        `
      },
      timestamp: serverTimestamp()
    });
  } catch (e) { console.error("Like email failed", e); }
};

/**
 * 3. NEW MESSAGE NOTIFICATION
 * Sent when you receive a message from an existing match.
 */
export const triggerMessageEmail = async (toEmail, fromName, messageSnippet) => {
  if (!toEmail) return;
  try {
    await addDoc(collection(db, "mail"), {
      to: toEmail,
      message: {
        subject: `New message from ${fromName} 💬`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 16px;">
            <h3 style="color: #333;">New Message</h3>
            <p><strong>${fromName}:</strong> "${messageSnippet}"</p>
            <div style="margin-top: 25px;">
              <a href="${APP_URL}/chat" style="background: #111; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reply Now</a>
            </div>
          </div>
        `
      },
      timestamp: serverTimestamp()
    });
  } catch (e) { console.error("Message email failed", e); }
};