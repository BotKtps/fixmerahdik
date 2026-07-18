import fs from 'fs';
import path from 'path';

export interface AppConfig {
  gmail_user: string;
  gmail_pass: string;
  bot_token: string;
  custom_success_msg?: string;
  custom_fail_msg?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
}

export interface AppealRecord {
  id: string;
  phoneNumber: string;
  name: string;
  language: string;
  text: string;
  subject?: string;
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
  sender: 'telegram' | 'web';
  userId?: string; // Telegram user ID if applicable
  username?: string; // Telegram username if applicable
}

export interface UserRecord {
  userId: string;
  username?: string;
  role: 'free' | 'premium' | 'admin';
  lastAppealTime?: string;
  saldo?: number;
  auto_renew?: boolean;
}

export interface RedeemCode {
  code: string;
  durationDays: number;
  saldoBonus: number;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  config: AppConfig;
  appeals: AppealRecord[];
  users: UserRecord[];
  redeemCodes?: RedeemCode[];
}

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc } from 'firebase/firestore';

const DB_FILE = path.join(process.cwd(), 'data.json');
const FIREBASE_CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');

const DEFAULT_DB: DatabaseSchema = {
  config: {
    gmail_user: '',
    gmail_pass: '',
    bot_token: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_secure: true,
    custom_success_msg: `🔥 <b>[ AEROAPPEAL PRO — BYPASS SUCCESSFUL ]</b> 🔥\n──────────────────────────────\n📱 <b>Nomor WA:</b> <code>{phone}</code>\n⚡️ <b>Status SMTP:</b> 🟢 SECURE DELIVERED\n💎 <b>Jenis Lisensi:</b> <code>{role}</code> (UNLIMITED ACCESS)\n\n📊 <b>Statistik Bot Real-time:</b>\n├ 🚀 Total Banding: <code>{total_appeals}</code>\n└ ✅ Banding Sukses: <code>{success_appeals}</code>\n──────────────────────────────\n✨ <i>Banding berhasil disuntikkan ke server WhatsApp! Silakan periksa status nomor secara berkala.</i>`,
    custom_fail_msg: `🔴 <b>[ AEROAPPEAL PRO — BYPASS FAILED ]</b> 🔴\n──────────────────────────────\n📱 <b>Nomor WA:</b> <code>{phone}</code>\n⚠️ <b>Penyebab:</b> <i>{error}</i>\n──────────────────────────────\n❌ <i>Silakan periksa kredensial SMTP Anda atau coba lagi nanti.</i>`,
  },
  appeals: [],
  users: [],
  redeemCodes: [],
};

// Global in-memory cache to support instant synchronous reads
let inMemoryDb: DatabaseSchema = { ...DEFAULT_DB };
let isInitialized = false;
let db: any = null;

// Initialize Firebase App & Firestore if config is present
try {
  if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
    const configContent = fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf8');
    const firebaseConfig = JSON.parse(configContent);
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log('Firebase Firestore initialized successfully for database:', firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn('firebase-applet-config.json not found! Falling back to local data.json only.');
  }
} catch (err) {
  console.error('Failed to initialize Firebase:', err);
}

// Function to initialize DB by reading from local file and Firestore
export async function initDb(): Promise<void> {
  if (isInitialized) return;

  // 1. Setup local defaults
  inMemoryDb = { ...DEFAULT_DB };

  // 2. Load from local backup JSON file if exists
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileContent = fs.readFileSync(DB_FILE, 'utf8');
      const localDb = JSON.parse(fileContent) as DatabaseSchema;
      inMemoryDb = { ...DEFAULT_DB, ...localDb };
    } catch (err) {
      console.error('Error reading local backup database:', err);
    }
  }

  // 3. Load from Cloud Firestore if initialized (highest priority / source of truth)
  if (db) {
    try {
      console.log('Fetching database records from Firestore...');
      
      // Fetch settings config
      const configDocRef = doc(db, 'config', 'global');
      const configDoc = await getDoc(configDocRef);
      if (configDoc.exists()) {
        inMemoryDb.config = { ...DEFAULT_DB.config, ...configDoc.data() } as AppConfig;
      } else {
        // Bootstrap global config in Firestore
        await setDoc(configDocRef, inMemoryDb.config);
      }

      // Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserRecord[] = [];
      usersSnap.forEach((doc) => {
        fetchedUsers.push(doc.data() as UserRecord);
      });
      inMemoryDb.users = fetchedUsers;

      // Fetch Appeals
      const appealsSnap = await getDocs(collection(db, 'appeals'));
      const fetchedAppeals: AppealRecord[] = [];
      appealsSnap.forEach((doc) => {
        fetchedAppeals.push(doc.data() as AppealRecord);
      });
      inMemoryDb.appeals = fetchedAppeals;

      // Fetch RedeemCodes
      const redeemCodesSnap = await getDocs(collection(db, 'redeemCodes'));
      const fetchedRedeemCodes: RedeemCode[] = [];
      redeemCodesSnap.forEach((doc) => {
        fetchedRedeemCodes.push(doc.data() as RedeemCode);
      });
      inMemoryDb.redeemCodes = fetchedRedeemCodes;

      console.log(`Firestore synchronized successfully! ${inMemoryDb.users.length} users, ${inMemoryDb.appeals.length} appeals, ${inMemoryDb.redeemCodes?.length || 0} redeem codes.`);
    } catch (err) {
      console.error('Error loading database from Firestore:', err);
    }
  }

  isInitialized = true;
}

export function loadDb(): DatabaseSchema {
  // Emergency load fallback if not initialized
  if (!isInitialized) {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        inMemoryDb = JSON.parse(data) as DatabaseSchema;
      }
    } catch (err) {
      console.error('Emergency loadDb fallback failed:', err);
    }
  }

  if (!inMemoryDb.users) inMemoryDb.users = [];
  if (!inMemoryDb.redeemCodes) inMemoryDb.redeemCodes = [];
  if (!inMemoryDb.appeals) inMemoryDb.appeals = [];
  if (!inMemoryDb.config) inMemoryDb.config = { ...DEFAULT_DB.config };
  
  return inMemoryDb;
}

export function saveDb(dbSchema: DatabaseSchema): void {
  const previousDb = { ...inMemoryDb };

  // Update memory cache
  inMemoryDb = {
    config: { ...dbSchema.config },
    users: [...(dbSchema.users || [])],
    appeals: [...(dbSchema.appeals || [])],
    redeemCodes: [...(dbSchema.redeemCodes || [])],
  };

  // 1. Save local backup file synchronously
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local backup data file:', err);
  }

  // 2. Sync asynchronously to Cloud Firestore
  if (db) {
    (async () => {
      try {
        // A. Sync Config if changed
        if (JSON.stringify(previousDb.config) !== JSON.stringify(inMemoryDb.config)) {
          await setDoc(doc(db, 'config', 'global'), inMemoryDb.config);
        }

        // B. Sync Users (differential)
        const prevUsersMap = new Map(previousDb.users?.map(u => [u.userId, u]));
        const currUsersMap = new Map(inMemoryDb.users?.map(u => [u.userId, u]));

        for (const [userId, user] of currUsersMap.entries()) {
          const prevUser = prevUsersMap.get(userId);
          if (!prevUser || JSON.stringify(prevUser) !== JSON.stringify(user)) {
            await setDoc(doc(db, 'users', userId), user);
          }
        }

        for (const userId of prevUsersMap.keys()) {
          if (!currUsersMap.has(userId)) {
            await deleteDoc(doc(db, 'users', userId));
          }
        }

        // C. Sync Appeals (differential)
        const prevAppealsMap = new Map(previousDb.appeals?.map(a => [a.id, a]));
        const currAppealsMap = new Map(inMemoryDb.appeals?.map(a => [a.id, a]));

        for (const [id, appeal] of currAppealsMap.entries()) {
          const prevAppeal = prevAppealsMap.get(id);
          if (!prevAppeal || JSON.stringify(prevAppeal) !== JSON.stringify(appeal)) {
            await setDoc(doc(db, 'appeals', id), appeal);
          }
        }

        for (const id of prevAppealsMap.keys()) {
          if (!currAppealsMap.has(id)) {
            await deleteDoc(doc(db, 'appeals', id));
          }
        }

        // D. Sync Redeem Codes (differential)
        const prevCodesMap = new Map(previousDb.redeemCodes?.map(c => [c.code, c]));
        const currCodesMap = new Map(inMemoryDb.redeemCodes?.map(c => [c.code, c]));

        for (const [code, redeemCode] of currCodesMap.entries()) {
          const prevCode = prevCodesMap.get(code);
          if (!prevCode || JSON.stringify(prevCode) !== JSON.stringify(redeemCode)) {
            await setDoc(doc(db, 'redeemCodes', code), redeemCode);
          }
        }

        for (const code of prevCodesMap.keys()) {
          if (!currCodesMap.has(code)) {
            await deleteDoc(doc(db, 'redeemCodes', code));
          }
        }
        
        console.log('Successfully synced database state to Cloud Firestore.');
      } catch (err) {
        console.error('Error syncing database changes to Firestore:', err);
      }
    })();
  }
}
