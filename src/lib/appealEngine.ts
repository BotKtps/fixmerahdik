import nodemailer from 'nodemailer';
import { loadDb, saveDb, AppealRecord } from './db.ts';

// Dynamic, varying list of South Asian and Indonesian names
const NAMES_POOL = [
  'Arjun Sharma', 'Budi Santoso', 'Aditya Pratama', 'Rian Hidayat', 
  'Dewi Lestari', 'Siti Aminah', 'Rendi Wijaya', 'Surya Saputra',
  'Muhammad Fikri', 'Ahmad Fauzi', 'Gita Permata', 'Agung Prasetyo',
  'Hendra Wijaya', 'Slamet Riyadi', 'Dimas Anggara', 'Chandra Gupta'
];

export interface LanguageTemplate {
  langName: string;
  subject: string;
  body: string;
}

const TEMPLATES: LanguageTemplate[] = [
  {
    langName: 'Indonesian',
    subject: 'Akun WhatsApp Diblokir: Peninjauan Kembali (+{number})',
    body: 'Halo Tim Dukungan, saya {name} asal Indonesia. Akun saya {number} terkena pembatasan dan saya tidak merasa melanggar kebijakan. Mohon untuk melakukan peninjauan kembali dan memulihkan akun saya segera karena sangat penting bagi pekerjaan sehari-hari saya. Terima kasih.'
  },
  {
    langName: 'Indonesian (Formal)',
    subject: 'Permohonan Aktivasi Akun WhatsApp (+{number})',
    body: 'Kepada Tim Dukungan WhatsApp yang terhormat, perkenalkan saya {name}. Nomor telepon saya {number} tiba-tiba tidak dapat diakses dan diblokir. Saya yakin ini adalah kesalahpahaman sistem karena saya selalu mematuhi pedoman komunitas dan kebijakan layanan Anda. Mohon bantuan untuk memulihkan akun tersebut.'
  },
  {
    langName: 'English',
    subject: 'WhatsApp Account Suspended: Review Request (+{number})',
    body: 'Hello Support Team, I am {name} from Indonesia. My WhatsApp account {number} is currently restricted, and I strongly believe I did not violate any policies. Please review my account manually and restore it as soon as possible. Thank you for your assistance.'
  },
  {
    langName: 'English (Urgent)',
    subject: 'Urgent: Request to Restore My Account (+{number})',
    body: 'Dear WhatsApp Support, my name is {name}. My phone number {number} has been suspended without any clear warning. I strictly follow your terms of service. Since I rely heavily on this number for family and work communications, please investigate and restore my access.'
  },
  {
    langName: 'Spanish',
    subject: 'Cuenta de WhatsApp bloqueada por error (+{number})',
    body: 'Hola equipo de soporte de WhatsApp, mi nombre es {name}. Mi número de teléfono {number} ha sido bloqueado de forma repentina. Estoy totalmente seguro de no haber infringido ninguna norma. Les solicito amablemente que revisen mi caso de forma manual y activen mi cuenta. Saludos.'
  },
  {
    langName: 'Portuguese',
    subject: 'Recuperação de conta WhatsApp suspensa (+{number})',
    body: 'Prezada equipe de suporte do WhatsApp, sou {name}. O meu número de telefone {number} foi suspenso recentemente. Acredito que esta suspensão tenha sido um erro, pois sigo à risca todos os termos de serviço. Solicito que verifiquem o meu caso e reativem a minha conta.'
  }
];

export interface AppealResult {
  success: boolean;
  message: string;
  details: AppealRecord;
}

export async function sendAppeal(phoneNumber: string, senderType: 'telegram' | 'web', telegramUser?: { id: string; username?: string }): Promise<AppealResult> {
  const db = loadDb();
  const config = db.config;

  if (!config.gmail_user || !config.gmail_pass) {
    throw new Error('Konfigurasi Gmail belum diatur! Gunakan menu setmail terlebih dahulu.');
  }

  // Format phone number to clean digit-only format but preserve the leading plus
  let formattedNumber = phoneNumber.trim().replace(/[^\d+]/g, '');
  if (!formattedNumber.startsWith('+')) {
    formattedNumber = '+' + formattedNumber;
  }

  // Pick random name and random template
  const name = NAMES_POOL[Math.floor(Math.random() * NAMES_POOL.length)];
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

  // Fill placeholders
  const subject = template.subject.replace(/{number}/g, formattedNumber);
  const bodyText = template.body
    .replace(/{name}/g, name)
    .replace(/{number}/g, formattedNumber);

  // Setup multiple transporter configurations for maximum compatibility on environments like Railway
  const smtpConfigs: any[] = [
    // Strategy 1: Standard built-in 'gmail' service (Nodemailer automatically handles settings)
    {
      service: 'gmail',
      auth: {
        user: config.gmail_user,
        pass: config.gmail_pass,
      }
    },
    // Strategy 2: Direct secure SSL on port 465
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: config.gmail_user,
        pass: config.gmail_pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    },
    // Strategy 3: Alternative STARTTLS on port 587 (Often open when 465 is blocked by cloud firewalls)
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.gmail_user,
        pass: config.gmail_pass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    }
  ];

  const mailOptions = {
    from: `"WhatsApp Support Appeal" <${config.gmail_user}>`,
    to: 'android@support.whatsapp.com',
    subject: subject,
    text: bodyText,
  };

  const digits = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
  const recordId = `LRFM${digits}`;
  const record: AppealRecord = {
    id: recordId,
    phoneNumber: formattedNumber,
    name: name,
    language: template.langName,
    text: bodyText,
    timestamp: new Date().toISOString(),
    status: 'failed',
    sender: senderType,
    userId: telegramUser?.id,
    username: telegramUser?.username,
  };

  let emailSent = false;
  let lastSmtpError = '';

  for (let i = 0; i < smtpConfigs.length; i++) {
    try {
      console.log(`Trying SMTP configuration strategy ${i + 1}...`);
      const transporter = nodemailer.createTransport(smtpConfigs[i]);
      await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`SMTP strategy ${i + 1} succeeded! Email sent successfully.`);
      break;
    } catch (err: any) {
      console.error(`SMTP strategy ${i + 1} failed:`, err.message || err);
      lastSmtpError = err.message || 'Unknown SMTP error';
    }
  }

  try {
    if (!emailSent) {
      throw new Error(`Semua strategi koneksi SMTP gagal. Error terakhir: ${lastSmtpError}`);
    }

    record.status = 'success';
    
    // Save to local database
    db.appeals.unshift(record);
    saveDb(db);

    return {
      success: true,
      message: `Banding berhasil dikirim ke android@support.whatsapp.com menggunakan nama ${name} (${template.langName}).`,
      details: record
    };
  } catch (err: any) {
    record.status = 'failed';
    record.error = err.message || 'Unknown SMTP error';
    
    // Save failed attempt too to show accurate history
    db.appeals.unshift(record);
    saveDb(db);

    return {
      success: false,
      message: `Gagal mengirim email banding: ${err.message}`,
      details: record
    };
  }
}
