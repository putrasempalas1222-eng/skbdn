/*  */
import { initializeApp } from "firebase/app";
import { get, getDatabase, ref, set, onValue, update } from "firebase/database";
import {
  createUserWithEmailAndPassword,
  getAuth,
  PhoneAuthProvider,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePhoneNumber,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { Skbn, Approval, DatabaseUser, NotificationItem, UserRole } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyCMdkeIeIQToOSwO6zRj04rbAvZaI2A5KE",
  authDomain: "play-integrity-2adpr7x4a8xhyex.firebaseapp.com",
  databaseURL: "https://play-integrity-2adpr7x4a8xhyex-default-rtdb.firebaseio.com",
  projectId: "play-integrity-2adpr7x4a8xhyex",
  storageBucket: "play-integrity-2adpr7x4a8xhyex.firebasestorage.app",
  messagingSenderId: "520643585460",
  appId: "1:520643585460:web:e86caf42b27344a2df3ee1",
  measurementId: "G-6GX7G5JDN2"
};

// Initialize Firebase
let app;
let db: any = null;
let auth: ReturnType<typeof getAuth> | null = null;
let isFirebaseConnected = false;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
  isFirebaseConnected = true;
} catch (error) {
  console.warn("Firebase failed to initialize, falling back to LocalStorage:", error);
}

// Initialize Local Storage with empty arrays if not present
if (!localStorage.getItem("skbn_data")) {
  localStorage.setItem("skbn_data", JSON.stringify([]));
}
if (!localStorage.getItem("approval_data")) {
  localStorage.setItem("approval_data", JSON.stringify([]));
}
if (!localStorage.getItem("notification_data")) {
  localStorage.setItem("notification_data", JSON.stringify([]));
}

export const getSkbns = (callback: (data: Skbn[]) => void) => {
  if (isFirebaseConnected && db) {
    const skbnRef = ref(db, 'skbn');
    onValue(skbnRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        callback(list);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error("Firebase read error, using local storage:", error);
      fallbackLocalSkbns(callback);
    });
  } else {
    fallbackLocalSkbns(callback);
  }
};

const fallbackLocalSkbns = (callback: (data: Skbn[]) => void) => {
  const local = localStorage.getItem("skbn_data");
  callback(local ? JSON.parse(local) : []);
};

export const getApprovals = (callback: (data: Approval[]) => void) => {
  if (isFirebaseConnected && db) {
    const approvalRef = ref(db, 'approvals');
    onValue(approvalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        callback(list);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error("Firebase read error, using local storage:", error);
      fallbackLocalApprovals(callback);
    });
  } else {
    fallbackLocalApprovals(callback);
  }
};

const fallbackLocalApprovals = (callback: (data: Approval[]) => void) => {
  const local = localStorage.getItem("approval_data");
  callback(local ? JSON.parse(local) : []);
};

export const getNotifications = (callback: (data: NotificationItem[]) => void) => {
  if (isFirebaseConnected && db) {
    const notificationRef = ref(db, 'notifications');
    onValue(notificationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        callback(list);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error("Firebase notification read error, using local storage:", error);
      fallbackLocalNotifications(callback);
    });
  } else {
    fallbackLocalNotifications(callback);
  }
};

const fallbackLocalNotifications = (callback: (data: NotificationItem[]) => void) => {
  const local = localStorage.getItem("notification_data");
  callback(local ? JSON.parse(local) : []);
};

export const getUsers = (callback: (data: DatabaseUser[]) => void) => {
  if (isFirebaseConnected && db) {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        callback(list);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error("Firebase users read error:", error);
      callback([]);
    });
  } else {
    callback([]);
  }
};

const removeUndefined = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => removeUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefined(entryValue)])
    ) as T;
  }
  return value;
};

const getPhoneUsageKey = (phoneNumber: string) => phoneNumber.replace(/[^\d]/g, '');

const saveVerifiedPhoneForCurrentUser = async (phoneNumber: string) => {
  if (!auth?.currentUser || !db) throw new Error("User Firebase belum tersedia.");

  const usageKey = getPhoneUsageKey(phoneNumber);
  const usageRef = ref(db, `phone_usage/${usageKey}`);
  const snapshot = await get(usageRef);
  const usage = snapshot.val() || {};
  const usedByUserIds = Object.keys(usage);

  if (!usage[auth.currentUser.uid] && usedByUserIds.length >= 3) {
    throw Object.assign(new Error("Nomor HP sudah dipakai 3 akun."), {
      code: "app/phone-limit-reached"
    });
  }

  await set(ref(db, `phone_usage/${usageKey}/${auth.currentUser.uid}`), {
    user_id: auth.currentUser.uid,
    phone: phoneNumber,
    verified_at: new Date().toISOString()
  });
  await set(ref(db, `users/${auth.currentUser.uid}/phone`), phoneNumber);
  await set(ref(db, `users/${auth.currentUser.uid}/phone_verified_at`), new Date().toISOString());
};

export const saveSkbn = async (skbn: Omit<Skbn, 'id'> & { id?: string }): Promise<string> => {
  const id = skbn.id || `skbn-${Date.now()}`;
  const newSkbn = removeUndefined({ ...skbn, id }) as Skbn;

  if (isFirebaseConnected && db) {
    try {
      await set(ref(db, `skbn/${id}`), newSkbn);
    } catch (e) {
      console.warn("Firebase write failed, saving locally:", e);
      saveSkbnLocally(newSkbn);
    }
  } else {
    saveSkbnLocally(newSkbn);
  }
  return id;
};

const saveSkbnLocally = (skbn: Skbn) => {
  const local = localStorage.getItem("skbn_data");
  const list: Skbn[] = local ? JSON.parse(local) : [];
  const index = list.findIndex(item => item.id === skbn.id);
  if (index > -1) {
    list[index] = skbn;
  } else {
    list.push(skbn);
  }
  localStorage.setItem("skbn_data", JSON.stringify(list));
};

export const saveApproval = async (approval: Omit<Approval, 'id'>): Promise<string> => {
  const id = `app-${Date.now()}`;
  const newApproval = removeUndefined({ ...approval, id }) as Approval;

  if (isFirebaseConnected && db) {
    try {
      await set(ref(db, `approvals/${id}`), newApproval);
    } catch (e) {
      console.warn("Firebase write failed, saving approval locally:", e);
      saveApprovalLocally(newApproval);
    }
  } else {
    saveApprovalLocally(newApproval);
  }
  return id;
};

const saveApprovalLocally = (approval: Approval) => {
  const local = localStorage.getItem("approval_data");
  const list: Approval[] = local ? JSON.parse(local) : [];
  list.push(approval);
  localStorage.setItem("approval_data", JSON.stringify(list));
};

export const saveNotification = async (notification: Omit<NotificationItem, 'id'>): Promise<string> => {
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newNotification = removeUndefined({ ...notification, id }) as NotificationItem;

  if (isFirebaseConnected && db) {
    try {
      await set(ref(db, `notifications/${id}`), newNotification);
    } catch (e) {
      console.warn("Firebase write failed, saving notification locally:", e);
      saveNotificationLocally(newNotification);
    }
  } else {
    saveNotificationLocally(newNotification);
  }
  return id;
};

const saveNotificationLocally = (notification: NotificationItem) => {
  const local = localStorage.getItem("notification_data");
  const list: NotificationItem[] = local ? JSON.parse(local) : [];
  list.push(notification);
  localStorage.setItem("notification_data", JSON.stringify(list));
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  const readAt = new Date().toISOString();
  if (isFirebaseConnected && db) {
    try {
      await update(ref(db, `notifications/${notificationId}`), { read_at: readAt });
      return;
    } catch (e) {
      console.warn("Firebase update failed, marking notification locally:", e);
    }
  }

  const local = localStorage.getItem("notification_data");
  const list: NotificationItem[] = local ? JSON.parse(local) : [];
  localStorage.setItem(
    "notification_data",
    JSON.stringify(list.map(item => item.id === notificationId ? { ...item, read_at: readAt } : item))
  );
};

export const loginBuyerWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
  if (!auth) throw new Error("Firebase Auth belum tersedia.");
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const getBuyerVerifiedPhone = async (uid: string): Promise<string | null> => {
  if (!db) return null;
  const snapshot = await get(ref(db, `users/${uid}/phone`));
  return snapshot.val() || null;
};

export const getDatabaseUser = async (uid: string): Promise<DatabaseUser | null> => {
  if (!db) return null;
  const snapshot = await get(ref(db, `users/${uid}`));
  const data = snapshot.val();
  return data ? { id: uid, ...data } : null;
};

export const registerBuyerWithEmail = async (nama: string, email: string, password: string): Promise<FirebaseUser> => {
  if (!auth || !db) throw new Error("Firebase belum tersedia.");
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: nama });
  await set(ref(db, `users/${credential.user.uid}`), {
    id: credential.user.uid,
    nama,
    email,
    role: UserRole.BUYER,
    created_at: new Date().toISOString()
  });
  return credential.user;
};

export const createFirebasePhoneVerifier = (containerId: string): RecaptchaVerifier => {
  if (!auth) throw new Error("Firebase Auth belum tersedia.");
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible"
  });
};

export const sendBuyerPhoneOtp = async (phoneNumber: string, verifier: RecaptchaVerifier): Promise<string> => {
  if (!auth) throw new Error("Firebase Auth belum tersedia.");
  const provider = new PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber(phoneNumber, verifier);
};

export const confirmBuyerPhoneOtp = async (verificationId: string, code: string, phoneNumber: string): Promise<FirebaseUser> => {
  if (!auth?.currentUser || !db) throw new Error("User Firebase belum tersedia.");
  if (auth.currentUser.phoneNumber === phoneNumber) {
    await saveVerifiedPhoneForCurrentUser(phoneNumber);
    return auth.currentUser;
  }
  const credential = PhoneAuthProvider.credential(verificationId, code);
  try {
    await updatePhoneNumber(auth.currentUser, credential);
  } catch (error) {
    const errorCode = (error as { code?: string })?.code;
    if (
      errorCode !== "auth/account-exists-with-different-credential" &&
      errorCode !== "auth/credential-already-in-use"
    ) {
      throw error;
    }
  }
  await saveVerifiedPhoneForCurrentUser(phoneNumber);
  return auth.currentUser;
};

export const resetBuyerPassword = async (email: string): Promise<void> => {
  if (!auth) throw new Error("Firebase Auth belum tersedia.");
  await sendPasswordResetEmail(auth, email);
};

export const logoutFirebaseUser = async (): Promise<void> => {
  if (auth?.currentUser) {
    await signOut(auth);
  }
};

export const getCurrentFirebaseUser = (): FirebaseUser | null => auth?.currentUser || null;

export const checkFirebaseStatus = () => isFirebaseConnected;
