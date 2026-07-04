import fs from 'fs';
import path from 'path';

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

// Function to initialize DB by reading from local file
export async function initDb(): Promise<void> {
  if (isInitialized) return;

  try {
    console.log('Initializing local JSON database from', DB_FILE);
    
    let localDb: DatabaseSchema = { ...DEFAULT_DB };
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        localDb = JSON.parse(fileContent) as DatabaseSchema;
      } catch (err) {
        console.error('Error reading local backup database:', err);
      }
    }

    inMemoryDb = localDb;
    isInitialized = true;
    
    // Ensure structure is correct
    if (!inMemoryDb.users) inMemoryDb.users = [];
    if (!inMemoryDb.redeemCodes) inMemoryDb.redeemCodes = [];
    if (!inMemoryDb.appeals) inMemoryDb.appeals = [];
    if (!inMemoryDb.config) inMemoryDb.config = { ...DEFAULT_DB.config };

    console.log(`Database loaded successfully! Records: ${inMemoryDb.users.length} users, ${inMemoryDb.appeals.length} appeals, ${inMemoryDb.redeemCodes?.length || 0} redeem codes.`);
  } catch (err) {
    console.error('Error during local database initialization:', err);
    inMemoryDb = { ...DEFAULT_DB };
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
  if (!inMemoryDb.appeals) inMemoryDb.appeals = [];
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
}
