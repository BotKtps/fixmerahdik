import nodemailer from 'nodemailer';
import { loadDb, saveDb, AppealRecord } from './db.ts';
import dns from 'dns';

// Force Node.js to resolve IPv4 addresses first.
// Cloud providers like Railway often have IPv6 routing issues or their IPv6 ranges are blacklisted/throttled by Gmail SMTP.
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

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

  // Auto-clean email and app password (remove spaces often copied from Google Account interface)
  const cleanUser = config.gmail_user.trim();
  const cleanPass = config.gmail_pass.trim().replace(/\s+/g, '');

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

  const customHost = (config.smtp_host || '').trim();
  const customPort = Number(config.smtp_port) || 465;
  const customSecure = config.smtp_secure !== undefined ? !!config.smtp_secure : (customPort === 465);

  // Setup multiple transporter configurations for maximum compatibility
  const smtpConfigs: any[] = [];

  // If custom SMTP host is set, prioritize it as Strategy 1
  if (customHost) {
    smtpConfigs.push({
      host: customHost,
      port: customPort,
      secure: customSecure,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
  }

  // Add standard fallback strategies
  smtpConfigs.push(
    // Strategy 2: Standard built-in 'gmail' service (Nodemailer automatically handles settings)
    {
      service: 'gmail',
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    },
    // Strategy 3: Direct secure SSL on port 465
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    },
    // Strategy 4: Alternative STARTTLS on port 587
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    }
  );

  const mailOptions = {
    from: `"WhatsApp Support Appeal" <${cleanUser}>`,
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
      // Analyze SMTP error for user-friendly diagnostics
      let diagnosticMessage = `Semua strategi koneksi SMTP gagal. Error terakhir: ${lastSmtpError}.`;
      
      const lowerError = lastSmtpError.toLowerCase();
      if (lowerError.includes('username and password not accepted') || lowerError.includes('535') || lowerError.includes('auth')) {
        diagnosticMessage = `Gagal Login Gmail (${lastSmtpError}). 
👉 TIPS: Pastikan Anda menggunakan **Sandi Aplikasi (App Password) 16 karakter** dari Akun Google Anda, BUKAN sandi utama Gmail Anda. Dan pastikan fitur Verifikasi 2 Langkah (2-Step Verification) sudah aktif di akun Google Anda.`;
      } else if (lowerError.includes('timeout') || lowerError.includes('refused') || lowerError.includes('conn') || lowerError.includes('socket')) {
        diagnosticMessage = `Koneksi Terblokir (${lastSmtpError}). 
👉 TIPS: Layanan hosting (seperti Railway) terkadang memblokir port keluar SMTP (465/587). Coba periksa apakah Anda menggunakan hosting gratis yang membatasi pengiriman email, atau hubungi support platform hosting Anda.`;
      } else if (lowerError.includes('envelope') || lowerError.includes('sender')) {
        diagnosticMessage = `Alamat email pengirim tidak valid (${lastSmtpError}). 
👉 TIPS: Pastikan Anda menuliskan email Gmail Anda dengan benar tanpa ada spasi atau salah ketik.`;
      }

      throw new Error(diagnosticMessage);
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
