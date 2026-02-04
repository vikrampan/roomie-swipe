const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");
const { defineString } = require('firebase-functions/params');

// 1. Define parameters to read from your functions/.env file
const brevoUser = defineString('BREVO_USER');
const brevoPass = defineString('BREVO_PASS');

/**
 * Configure the Mail Transporter
 * We use Port 465 (Secure) for Brevo
 */
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: true, 
  auth: {
    user: brevoUser.value(),
    pass: brevoPass.value(),
  },
  // ✅ Handle TLS strictness in modern Node runtimes
  tls: {
    rejectUnauthorized: false 
  }
});

/**
 * Cloud Function: sendEmailTrigger
 * Region: asia-south1 (Mumbai) - Matches your Firestore location
 */
exports.sendEmailTrigger = onDocumentCreated({
    document: "mail/{docId}",
    region: "asia-south1" 
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.error("No data found in the event.");
    return null;
  }

  const mailData = snapshot.data();
  const { to, message } = mailData;

  // Validation: Don't attempt to send if 'to' address is missing
  if (!to || !message) {
    console.error("Missing 'to' or 'message' data in Firestore document.");
    return null;
  }

  const mailOptions = {
    from: '"RoomieSwipe" <vs393031@gmail.com>', // Must be your verified Brevo sender
    to: to,
    subject: message.subject,
    html: message.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    
    // Optional: Write success status back to the Firestore document
    await event.data.ref.set({
      delivery: {
        state: "SUCCESS",
        sentAt: new Date().toISOString(),
        messageId: info.messageId
      }
    }, { merge: true });

  } catch (error) {
    console.error("❌ Email delivery failed:", error);

    // Optional: Write error status back to the Firestore document
    await event.data.ref.set({
      delivery: {
        state: "ERROR",
        error: error.message,
        failedAt: new Date().toISOString()
      }
    }, { merge: true });
  }

  return null;
});