const admin = require('firebase-admin');

const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://play-integrity-2adpr7x4a8xhyex-default-rtdb.firebaseio.com';

const getServiceAccount = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (rawBase64) {
    try {
      return JSON.parse(Buffer.from(rawBase64, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }

  if (rawJson) {
    try {
      return JSON.parse(rawJson);
    } catch {
      try {
        return JSON.parse(Buffer.from(rawJson, 'base64').toString('utf8'));
      } catch {
        return null;
      }
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
};

const getFirebaseAdmin = () => {
  if (admin.apps.length) return admin.app();

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
};

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const app = getFirebaseAdmin();
  if (!app) {
    return res.status(503).json({
      error: 'Firebase Admin is not configured.',
      message: 'Set FIREBASE_SERVICE_ACCOUNT_BASE64 in Vercel Environment Variables, then redeploy.'
    });
  }

  const uid = req.query.uid;
  if (!uid || Array.isArray(uid)) {
    return res.status(400).json({ error: 'Buyer uid is required.' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return res.status(401).json({
        error: 'Firebase ID token is required.',
        message: 'Login AP2 harus memakai akun Firebase dengan role admin.'
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const requesterSnapshot = await admin.database().ref(`users/${decodedToken.uid}`).get();
    const requesterRole = String(requesterSnapshot.val()?.role || '').trim().toLowerCase();
    if (requesterRole !== 'admin') {
      return res.status(403).json({
        error: 'Only AP2 admin can delete Buyer accounts.',
        message: 'Akun AP2 harus punya role "admin" di database users.'
      });
    }

    const userSnapshot = await admin.database().ref(`users/${uid}`).get();
    const userData = userSnapshot.val();
    const role = String(userData?.role || '').trim().toLowerCase();
    if (role !== 'buyer') {
      return res.status(403).json({ error: 'Only Buyer accounts can be deleted from this endpoint.' });
    }

    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    await admin.database().ref(`users/${uid}`).remove();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to delete buyer account.',
      message: error?.message || 'Firebase Admin rejected the delete request.'
    });
  }
};
