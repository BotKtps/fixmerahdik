import fs from 'fs';
import path from 'path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export interface AppConfig {
  gmail_user: string;
  gmail_pass: string;
  bot_token: string;
  custom_success_msg?: string;
  custom_fail_msg?: string;
}

export interface AppealRecord {
  id: string;
  phoneNumber: string;
  name: string;
  language: string;
  text: string;
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

const DB_FILE = path.join(process.cwd(), 'data.json');

const DEFAULT_DB: DatabaseSchema = {
  config: {
    gmail_user: '',
    gmail_pass: '',
    bot_token: '',
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

// Firebase configuration
const CONFIG_PATH = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;

try {
  let projectId = process.env.FIREBASE_PROJECT_ID || 'elite-component-hhh41';
  let databaseId = process.env.FIREBASE_DATABASE_ID || 'ai-studio-novadownluxuryai-dac0b0ff-bd7b-4df5-9fd7-eb53d6b8380e';

  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (config.projectId) projectId = config.projectId;
    if (config.firestoreDatabaseId) databaseId = config.firestoreDatabaseId;
  }

  // Support manual overrides from environment variables
  if (process.env.FIREBASE_PROJECT_ID) projectId = process.env.FIREBASE_PROJECT_ID;
  if (process.env.FIREBASE_DATABASE_ID) databaseId = process.env.FIREBASE_DATABASE_ID;

  if (getApps().length === 0) {
    let initOptions: any = { projectId };
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initOptions.credential = cert(serviceAccount);
      } catch (e: any) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', e.message);
      }
    }

    initializeApp(initOptions);
  }

  firestoreDb = getFirestore(databaseId);
  console.log(`Firebase Admin initialized successfully for Firestore database: ${databaseId}`);
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
}

// Function to initialize DB by downloading/syncing with Firestore
export async function initDb(): Promise<void> {
  if (isInitialized) return;

  try {
    console.log('Synchronizing database with Firestore...');
    
    // Default to local backup if any exists
    let localDb: DatabaseSchema = { ...DEFAULT_DB };
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        localDb = JSON.parse(fileContent) as DatabaseSchema;
      } catch (err) {
        console.error('Error reading local backup database:', err);
      }
    }

    if (!firestoreDb) {
      console.warn('Firestore is not initialized. Using local backup database file only.');
      inMemoryDb = localDb;
      isInitialized = true;
      return;
    }

    // Try loading config
    const configDoc = await firestoreDb.collection('config').doc('app').get();
    let config: AppConfig;
    let mustSeed = false;

    if (configDoc.exists) {
      config = configDoc.data() as AppConfig;
    } else {
      config = localDb.config || DEFAULT_DB.config;
      mustSeed = true;
    }

    // Try loading users
    const usersSnapshot = await firestoreDb.collection('users').get();
    const users: UserRecord[] = [];
    if (!usersSnapshot.empty) {
      usersSnapshot.forEach((doc: any) => {
        users.push(doc.data() as UserRecord);
      });
    } else if (localDb.users && localDb.users.length > 0) {
      mustSeed = true;
    }

    // Try loading appeals
    const appealsSnapshot = await firestoreDb.collection('appeals').get();
    const appeals: AppealRecord[] = [];
    if (!appealsSnapshot.empty) {
      appealsSnapshot.forEach((doc: any) => {
        appeals.push(doc.data() as AppealRecord);
      });
    } else if (localDb.appeals && localDb.appeals.length > 0) {
      mustSeed = true;
    }

    // Try loading redeemCodes
    const redeemCodesSnapshot = await firestoreDb.collection('redeemCodes').get();
    const redeemCodes: RedeemCode[] = [];
    if (!redeemCodesSnapshot.empty) {
      redeemCodesSnapshot.forEach((doc: any) => {
        redeemCodes.push(doc.data() as RedeemCode);
      });
    } else if (localDb.redeemCodes && localDb.redeemCodes.length > 0) {
      mustSeed = true;
    }

    if (mustSeed && localDb) {
      console.log('Firestore is empty. Seeding Firestore with local backup data...');
      // Seed config
      await firestoreDb.collection('config').doc('app').set(localDb.config || DEFAULT_DB.config);
      
      // Seed users
      if (localDb.users) {
        for (const user of localDb.users) {
          await firestoreDb.collection('users').doc(user.userId).set(user);
        }
      }

      // Seed appeals
      if (localDb.appeals) {
        for (const appeal of localDb.appeals) {
          await firestoreDb.collection('appeals').doc(appeal.id).set(appeal);
        }
      }

      // Seed redeem codes
      if (localDb.redeemCodes) {
        for (const code of localDb.redeemCodes) {
          await firestoreDb.collection('redeemCodes').doc(code.code).set(code);
        }
      }
      
      inMemoryDb = localDb;
    } else {
      inMemoryDb = {
        config,
        users,
        appeals: appeals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), // Sort newest first
        redeemCodes,
      };
    }

    // Save combined state to local file as backup
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf8');
    isInitialized = true;
    console.log(`Database synchronized successfully! Records: ${inMemoryDb.users.length} users, ${inMemoryDb.appeals.length} appeals, ${inMemoryDb.redeemCodes?.length || 0} redeem codes.`);
  } catch (err) {
    console.error('Error during Firestore database sync:', err);
    // Fallback to local file if Firestore sync fails
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        inMemoryDb = JSON.parse(fileContent) as DatabaseSchema;
      } catch (e) {
        inMemoryDb = { ...DEFAULT_DB };
      }
    }
    isInitialized = true;
  }
}

export function loadDb(): DatabaseSchema {
  // If not initialized yet, try to load from local file as emergency synchronous load
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
  if (!inMemoryDb.config) inMemoryDb.config = { ...DEFAULT_DB.config };
  
  return inMemoryDb;
}

export function saveDb(db: DatabaseSchema): void {
  // Update local memory cache instantly
  inMemoryDb = db;

  // Save to local backup file synchronously
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local backup data file:', err);
  }

  // Push changes asynchronously to Firestore to keep operations fast and non-blocking
  if (firestoreDb) {
    (async () => {
      try {
        // Save config
        await firestoreDb.collection('config').doc('app').set(db.config);

        // Save users
        if (db.users) {
          for (const user of db.users) {
            await firestoreDb.collection('users').doc(user.userId).set(user);
          }
        }

        // Save appeals
        if (db.appeals) {
          for (const appeal of db.appeals) {
            await firestoreDb.collection('appeals').doc(appeal.id).set(appeal);
          }
        }

        // Save redeem codes
        if (db.redeemCodes) {
          for (const code of db.redeemCodes) {
            await firestoreDb.collection('redeemCodes').doc(code.code).set(code);
          }
        }

        // Handle deleted users
        const localUsers = new Set((db.users || []).map(u => u.userId));
        const usersSnapshot = await firestoreDb.collection('users').get();
        if (!usersSnapshot.empty) {
          for (const doc of usersSnapshot.docs) {
            if (!localUsers.has(doc.id)) {
              await doc.ref.delete();
            }
          }
        }

        // Handle deleted appeals
        const localAppeals = new Set((db.appeals || []).map(a => a.id));
        const appealsSnapshot = await firestoreDb.collection('appeals').get();
        if (!appealsSnapshot.empty) {
          for (const doc of appealsSnapshot.docs) {
            if (!localAppeals.has(doc.id)) {
              await doc.ref.delete();
            }
          }
        }

        // Handle deleted redeem codes
        const localCodes = new Set((db.redeemCodes || []).map(c => c.code));
        const redeemCodesSnapshot = await firestoreDb.collection('redeemCodes').get();
        if (!redeemCodesSnapshot.empty) {
          for (const doc of redeemCodesSnapshot.docs) {
            if (!localCodes.has(doc.id)) {
              await doc.ref.delete();
            }
          }
        }
      } catch (err) {
        console.error('Asynchronous Firestore sync failed:', err);
      }
    })();
  }
}
