import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  History, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Key, 
  Bot, 
  Users, 
  TrendingUp, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Globe, 
  Smartphone,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Zap,
  BookOpen
} from 'lucide-react';

interface AppealRecord {
  id: string;
  phoneNumber: string;
  name: string;
  language: string;
  text: string;
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
  sender: 'telegram' | 'web';
  userId?: string;
  username?: string;
}

interface UserRecord {
  userId: string;
  username?: string;
  role: 'free' | 'premium' | 'admin';
  lastAppealTime?: string;
  saldo?: number;
  auto_renew?: boolean;
}

interface SystemStatus {
  config: {
    gmail_user: string;
    gmail_pass: string;
    bot_token: string;
    has_bot_token: boolean;
    custom_success_msg?: string;
    custom_fail_msg?: string;
  };
  stats: {
    totalAppeals: number;
    successCount: number;
    failedCount: number;
    totalUsers?: number;
    premiumCount?: number;
    adminCount?: number;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'history' | 'settings'>('dashboard');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Editing state for user balance
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingSaldoValue, setEditingSaldoValue] = useState<string>('');
  
  // Redeem codes state
  const [redeemCodes, setRedeemCodes] = useState<any[]>([]);
  const [newDays, setNewDays] = useState('30');
  const [newBonus, setNewBonus] = useState('15000');
  const [redeemLoading, setRedeemLoading] = useState(false);

  // Quick Trigger fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [triggerStatus, setTriggerStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Settings fields
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPass, setGmailPass] = useState('');
  const [botToken, setBotToken] = useState('');
  const [customSuccessMsg, setCustomSuccessMsg] = useState('');
  const [customFailMsg, setCustomFailMsg] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Detail Modal / Drawer field
  const [selectedAppeal, setSelectedAppeal] = useState<AppealRecord | null>(null);

  // Step indicator for direct appeal run
  const [activeStep, setActiveStep] = useState<number>(0);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      if (data.config) {
        setGmailUser(data.config.gmail_user || '');
        setCustomSuccessMsg(data.config.custom_success_msg || '');
        setCustomFailMsg(data.config.custom_fail_msg || '');
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
    }
  };

  const fetchAppeals = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/appeals');
      const data = await res.json();
      setAppeals(data);
    } catch (err) {
      console.error('Error fetching appeals list:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users list:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchRedeemCodes = async () => {
    try {
      const res = await fetch('/api/redeem-codes');
      const data = await res.json();
      setRedeemCodes(data);
    } catch (err) {
      console.error('Error fetching redeem codes:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAppeals();
    fetchUsers();
    fetchRedeemCodes();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'history') {
      fetchAppeals();
    } else if (activeTab === 'dashboard') {
      fetchStatus();
      fetchAppeals();
    } else if (activeTab === 'settings') {
      fetchRedeemCodes();
    }
  }, [activeTab]);

  const handleUpdateConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsStatus(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail_user: gmailUser,
          gmail_pass: gmailPass,
          bot_token: botToken,
          custom_success_msg: customSuccessMsg,
          custom_fail_msg: customFailMsg
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsStatus({ success: true, message: 'Konfigurasi berhasil diperbarui!' });
        fetchStatus();
        // Clear password inputs from state for security
        setGmailPass('');
        setBotToken('');
      } else {
        setSettingsStatus({ success: false, message: data.error || 'Terjadi kesalahan.' });
      }
    } catch (err: any) {
      setSettingsStatus({ success: false, message: err.message });
    }
  };

  const handleUpdateUserRole = async (userId: string, role: 'free' | 'premium' | 'admin') => {
    try {
      const res = await fetch('/api/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      if (res.ok) {
        fetchUsers();
        fetchStatus();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal merubah role user');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini dari database?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
        fetchStatus();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleUpdateUserSaldoSubmit = async (userId: string, newSaldo: number) => {
    try {
      const res = await fetch('/api/users/saldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, saldo: newSaldo }),
      });
      if (res.ok) {
        setEditingUserId(null);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal merubah saldo user');
      }
    } catch (err) {
      console.error('Error updating user saldo:', err);
    }
  };

  const handleDirectAppeal = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setLoading(true);
    setTriggerStatus(null);
    setActiveStep(1);

    // Simulate luxury progress steps for high-fidelity interactive feel
    const timer1 = setTimeout(() => setActiveStep(2), 1000);
    const timer2 = setTimeout(() => setActiveStep(3), 2200);

    try {
      const res = await fetch('/api/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      
      const data = await res.json();
      
      clearTimeout(timer1);
      clearTimeout(timer2);
      
      setActiveStep(4);
      
      if (res.ok && data.success) {
        setTriggerStatus({ success: true, message: data.message });
        setPhoneNumber('');
        fetchStatus();
        fetchAppeals();
      } else {
        setTriggerStatus({ success: false, message: data.error || data.message || 'Gagal mengirim email banding.' });
      }
    } catch (err: any) {
      setTriggerStatus({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus seluruh riwayat banding?')) return;
    try {
      await fetch('/api/clear-history', { method: 'POST' });
      fetchAppeals();
      fetchStatus();
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  const handleCreateRedeemCode = async (e: FormEvent) => {
    e.preventDefault();
    setRedeemLoading(true);
    try {
      const res = await fetch('/api/redeem-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays: newDays, saldoBonus: newBonus })
      });
      if (res.ok) {
        fetchRedeemCodes();
        fetchStatus();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal membuat kode redeem');
      }
    } catch (err) {
      console.error('Error creating redeem code:', err);
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleDeleteRedeemCode = async (code: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus voucher ${code}?`)) return;
    try {
      const res = await fetch(`/api/redeem-codes/${code}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRedeemCodes();
      }
    } catch (err) {
      console.error('Error deleting redeem code:', err);
    }
  };

  const successRate = status?.stats.totalAppeals 
    ? Math.round((status.stats.successCount / status.stats.totalAppeals) * 100) 
    : 0;

  return (
    <div className="min-h-screen relative bg-[#030303] text-white font-sans selection:bg-white/10 overflow-x-hidden">
      
      {/* Dynamic Cinematic Gradient Backgrounds */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-emerald-500/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[50%] bg-blue-500/5 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Top Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono tracking-widest uppercase">
                AeroAppeal System
              </span>
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Control Panel
              </div>
            </div>
            <h1 className="text-3xl font-serif italic tracking-tight flex items-center gap-2">
              AeroAppeal <span className="text-white/30 text-xl not-italic font-sans">Pro</span>
            </h1>
            <p className="text-xs text-white/50 mt-1">
              WhatsApp Account Ban Bypass Automation, Licencing System & Command Panel
            </p>
          </div>

          {/* Luxury Rounded Tab Selector */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5 self-stretch md:self-auto justify-around overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Banding', icon: Send },
              { id: 'users', label: 'Pengguna', icon: Users },
              { id: 'history', label: 'Riwayat', icon: History },
              { id: 'settings', label: 'Konfigurasi', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs font-medium tracking-wide transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white text-black shadow-lg font-semibold' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Stats Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/[0.01] rounded-full group-hover:scale-110 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Total Banding</p>
              <Send className="w-4 h-4 text-white/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light tracking-tight">{status?.stats.totalAppeals || 0}</span>
              <span className="text-xs text-white/30">Email</span>
            </div>
            <p className="text-[10px] text-white/40 mt-2">Sinkronisasi real-time dari database</p>
          </div>

          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/[0.01] rounded-full group-hover:scale-110 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Tingkat Keberhasilan</p>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light tracking-tight text-emerald-400">{successRate}%</span>
              <span className="text-xs text-white/30">Target</span>
            </div>
            <p className="text-[10px] text-white/40 mt-2">Dihitung dari status SMTP transporter</p>
          </div>

          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/[0.01] rounded-full group-hover:scale-110 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Pengguna Bot</p>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light tracking-tight text-blue-400">{status?.stats.totalUsers || 0}</span>
              <span className="text-xs text-white/30">Akun</span>
            </div>
            <p className="text-[10px] text-white/40 mt-2">
              {status?.stats.premiumCount || 0} Premium • {status?.stats.adminCount || 0} Admin
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/[0.01] rounded-full group-hover:scale-110 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Status Bot Token</p>
              <Bot className="w-4 h-4 text-white/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-semibold tracking-wider ${status?.config.has_bot_token ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.config.has_bot_token ? '🟢 TOKEN AKTIF' : '🟡 BELUM DIATUR'}
              </span>
            </div>
            <p className="text-[10px] text-white/40 mt-3 truncate">
              {status?.config.gmail_user || 'SMTP belum terhubung'}
            </p>
          </div>

        </section>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              
              {/* Left Column: Direct Appeal Input */}
              <div className="lg:col-span-7 space-y-8">
                <div className="p-8 rounded-3xl glass-panel relative overflow-hidden">
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Send className="w-4 h-4 text-white/80" />
                    </div>
                    <h3 className="text-lg font-medium tracking-tight">Kirim Banding Instan</h3>
                  </div>

                  <p className="text-xs text-white/50 mb-8 leading-relaxed">
                    Sistem akan secara acak memformulasikan template banding dalam berbagai bahasa, serta melampirkan identitas pengirim acak yang kredibel untuk dikirimkan secara langsung ke tim peninjau WhatsApp.
                  </p>

                  <form onSubmit={handleDirectAppeal} className="space-y-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3">
                        Nomor Telepon Target (Beserta Kode Negara)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: +6282158910417 atau +24166569885"
                          className="w-full bg-[#090909] border border-white/5 rounded-2xl px-5 py-4 text-base outline-none focus:border-white/20 transition-all font-mono placeholder:text-white/20"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !status?.config.gmail_user}
                      className="w-full bg-white hover:bg-white/90 active:scale-[0.99] text-black font-semibold text-sm py-4 rounded-2xl tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Memproses Pengiriman...
                        </>
                      ) : (
                        <>
                          Kirim Sekarang
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {!status?.config.gmail_user && (
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-300/80 leading-relaxed">
                          <b>Perhatian:</b> Anda belum mengonfigurasi email pengirim. Masuk ke tab <b>Konfigurasi</b> untuk menambahkan akun Gmail & App Password sebelum mengirim banding.
                        </p>
                      </div>
                    )}
                  </form>

                  {/* High fidelity stepping visualization while loading */}
                  {loading && (
                    <div className="mt-8 border-t border-white/5 pt-6 space-y-4">
                      <h4 className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Process Stack Activity</h4>
                      
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${activeStep >= 1 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                        <span className={`text-xs ${activeStep >= 1 ? 'text-white' : 'text-white/40'}`}>
                          Memformulasikan template bahasa & pengirim acak...
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${activeStep >= 2 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                        <span className={`text-xs ${activeStep >= 2 ? 'text-white' : 'text-white/40'}`}>
                          Menghubungkan ke layanan SMTP Gmail Secure Node...
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${activeStep >= 3 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                        <span className={`text-xs ${activeStep >= 3 ? 'text-white' : 'text-white/40'}`}>
                          Mengirim paket email ke android@support.whatsapp.com...
                        </span>
                      </div>
                    </div>
                  )}

                  {triggerStatus && (
                    <div className={`mt-6 p-5 rounded-2xl border ${
                      triggerStatus.success 
                        ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300' 
                        : 'bg-red-500/5 border-red-500/15 text-red-300'
                    }`}>
                      <div className="flex gap-3">
                        {triggerStatus.success ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-semibold mb-1">
                            {triggerStatus.success ? 'Banding Terkirim 100% Akurat' : 'Gagal Mengirim Banding'}
                          </p>
                          <p className="text-xs text-white/60 leading-relaxed">{triggerStatus.message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Tutorial / Panduan Bot Telegram */}
                <div className="p-8 rounded-3xl glass-panel relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
                    <h4 className="text-base font-medium">Panduan Penggunaan Bot Telegram</h4>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed mb-6">
                    AeroAppeal Pro dilengkapi dengan Telegram Bot pintar untuk mempermudah operasional bypass langsung dari ponsel Anda.
                  </p>
                  
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="font-semibold text-emerald-400 mb-1">⚙️ /setmail [gmail] [app_password]</p>
                      <p className="text-white/60">Gunakan perintah ini di chat bot untuk memperbarui atau menyetel alamat Gmail pengirim dan App Password Anda.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="font-semibold text-emerald-400 mb-1">⚡ /fix [nomor_wa]</p>
                      <p className="text-white/60">Jalankan banding instan langsung dari Telegram. Bot akan memproses pengiriman dalam waktu kurang dari 3 detik.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="font-semibold text-emerald-400 mb-1">💎 Lisensi FREE vs PREMIUM</p>
                      <ul className="list-disc list-inside space-y-1 mt-1 text-white/50 pl-1">
                        <li><b>Free:</b> Kuota dibatasi 1 kali kirim banding setiap 24 Jam.</li>
                        <li><b>Premium:</b> Unlimited tanpa batas pengiriman.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Mini list of latest history */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs uppercase tracking-wider text-white/40 font-bold">Terakhir Dikirim</h4>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    Selengkapnya
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {logsLoading ? (
                    <div className="p-12 text-center text-white/20 text-xs">Loading logs...</div>
                  ) : appeals.length === 0 ? (
                    <div className="p-12 text-center text-white/20 text-xs border border-dashed border-white/10 rounded-2xl">
                      Belum ada riwayat pengiriman.
                    </div>
                  ) : (
                    appeals.slice(0, 5).map(appeal => (
                      <div 
                        key={appeal.id}
                        onClick={() => setSelectedAppeal(appeal)}
                        className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all cursor-pointer flex justify-between items-center group"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${appeal.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-medium truncate text-white/80">{appeal.phoneNumber}</p>
                            <p className="text-[10px] text-white/40 truncate">{appeal.name} • {appeal.language}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[9px] uppercase tracking-widest bg-white/5 text-white/50 px-2 py-0.5 rounded border border-white/5">
                            {appeal.sender}
                          </span>
                          <Eye className="w-3.5 h-3.5 text-white/0 group-hover:text-white/60 transition-all" />
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-medium">Daftar Pengguna & Manajemen Lisensi</h3>
                  <p className="text-xs text-white/40 mt-1">
                    Berikut adalah seluruh pengguna Telegram Bot yang terdaftar dalam database. Anda dapat mengatur lisensi Premium atau Free secara instan.
                  </p>
                </div>
                
                <button
                  onClick={fetchUsers}
                  className="p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all"
                  title="Refresh List"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {usersLoading ? (
                <div className="p-24 text-center text-white/20 text-sm">Menyelaraskan pengguna...</div>
              ) : users.length === 0 ? (
                <div className="p-24 text-center text-white/20 text-sm border border-dashed border-white/10 rounded-3xl">
                  Belum ada pengguna bot yang terdaftar. Mulailah mengobrol dengan Telegram Bot Anda!
                </div>
              ) : (
                <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-white/40 font-bold bg-white/[0.01]">
                          <th className="px-6 py-4">User ID</th>
                          <th className="px-6 py-4">Username</th>
                          <th className="px-6 py-4">Status Lisensi</th>
                          <th className="px-6 py-4">Saldo</th>
                          <th className="px-6 py-4">Auto Renew</th>
                          <th className="px-6 py-4">Banding Terakhir</th>
                          <th className="px-6 py-4 text-right">Aksi Manajemen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/80">
                        {users.map(u => (
                          <tr key={u.userId} className="hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-4 font-mono font-medium">{u.userId}</td>
                            <td className="px-6 py-4 text-white/90">
                              {u.username ? (
                                <span className="text-emerald-400 font-semibold">@{u.username}</span>
                              ) : (
                                <span className="text-white/30">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                                  : u.role === 'premium'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                                  : 'bg-white/5 text-white/60 border border-white/5'
                              }`}>
                                {u.role === 'admin' && '👑 Admin'}
                                {u.role === 'premium' && '💎 Premium'}
                                {u.role === 'free' && '⚙️ Free'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {editingUserId === u.userId ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={editingSaldoValue}
                                    onChange={(e) => setEditingSaldoValue(e.target.value)}
                                    className="bg-[#090909] border border-white/20 rounded px-1.5 py-0.5 text-xs text-white w-20 outline-none focus:border-emerald-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateUserSaldoSubmit(u.userId, parseInt(editingSaldoValue, 10) || 0);
                                      } else if (e.key === 'Escape') {
                                        setEditingUserId(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleUpdateUserSaldoSubmit(u.userId, parseInt(editingSaldoValue, 10) || 0)}
                                    className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded hover:bg-emerald-500/30 font-bold transition-all"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="text-[10px] text-white/40 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-medium text-white/95">
                                    Rp {(u.saldo || 0).toLocaleString('id-ID')}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(u.userId);
                                      setEditingSaldoValue((u.saldo || 0).toString());
                                    }}
                                    className="text-[9px] uppercase tracking-widest text-white/40 hover:text-emerald-400 transition-all font-bold"
                                  >
                                    [Edit]
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                u.auto_renew 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                                  : 'bg-white/5 text-white/40 border border-white/5'
                              }`}>
                                {u.auto_renew ? '● ON' : '○ OFF'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/40">
                              {u.lastAppealTime ? (
                                new Date(u.lastAppealTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
                              ) : (
                                <span className="text-white/20">Belum pernah</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleUpdateUserRole(u.userId, e.target.value as any)}
                                  className="bg-[#090909] border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-white/30 text-white"
                                >
                                  <option value="free">Free</option>
                                  <option value="premium">Premium</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteUser(u.userId)}
                                  className="p-1.5 hover:bg-red-500/10 text-red-400/70 hover:text-red-400 rounded transition-all"
                                  title="Hapus Pengguna"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-medium">Semua Riwayat Banding</h3>
                  <p className="text-xs text-white/40 mt-1">
                    Berikut adalah data log pengiriman email banding yang disimpan 100% akurat dari database lokal.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={fetchAppeals}
                    className="p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all"
                    title="Refresh Log"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearHistory}
                    disabled={appeals.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Semua Log
                  </button>
                </div>
              </div>

              {logsLoading ? (
                <div className="p-24 text-center text-white/20 text-sm">Menyelaraskan log...</div>
              ) : appeals.length === 0 ? (
                <div className="p-24 text-center text-white/20 text-sm border border-dashed border-white/10 rounded-3xl">
                  Belum ada transaksi banding yang tercatat.
                </div>
              ) : (
                <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-white/40 font-bold bg-white/[0.01]">
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Nomor Target</th>
                          <th className="px-6 py-4">Identitas Acak</th>
                          <th className="px-6 py-4">Bahasa</th>
                          <th className="px-6 py-4">Platform</th>
                          <th className="px-6 py-4">Waktu (GMT+7)</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/80">
                        {appeals.map(appeal => (
                          <tr key={appeal.id} className="hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                                appeal.status === 'success' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/10'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${appeal.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                {appeal.status === 'success' ? 'Sukses' : 'Gagal'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-medium">{appeal.phoneNumber}</td>
                            <td className="px-6 py-4">{appeal.name}</td>
                            <td className="px-6 py-4">{appeal.language}</td>
                            <td className="px-6 py-4">
                              <span className="capitalize px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[10px] text-white/60">
                                {appeal.sender}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/40">
                              {new Date(appeal.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedAppeal(appeal)}
                                className="text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white hover:underline transition-all"
                              >
                                Tinjau
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="p-8 rounded-3xl glass-panel space-y-8">
                <div>
                  <h3 className="text-xl font-medium mb-1">Konfigurasi Pengirim Secure</h3>
                  <p className="text-xs text-white/40">
                    Masukkan kredensial pengirim Gmail dan Token Telegram Anda secara aman. Data disimpan lokal di server Anda.
                  </p>
                </div>

                <form onSubmit={handleUpdateConfig} className="space-y-6">
                  
                  {/* Gmail Address */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-white/50" />
                      Email Gmail Pengirim
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Contoh: user@gmail.com"
                      className="w-full bg-[#090909] border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:border-white/20 transition-all font-mono"
                      value={gmailUser}
                      onChange={(e) => setGmailUser(e.target.value)}
                    />
                    <p className="text-[10px] text-white/40 mt-2">
                      Gunakan akun Gmail utama atau alternatif Anda untuk mengirim email otomatis.
                    </p>
                  </div>

                  {/* Gmail App Password */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3 flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-white/50" />
                      Gmail App Password (16-Digit)
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan App Password baru untuk memperbarui..."
                      className="w-full bg-[#090909] border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:border-white/20 transition-all font-mono"
                      value={gmailPass}
                      onChange={(e) => setGmailPass(e.target.value)}
                    />
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 mt-3 space-y-2">
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        ⚠️ <b>Cara mendapatkan App Password Gmail:</b>
                      </p>
                      <ol className="text-[9px] text-white/40 list-decimal list-inside space-y-1 leading-relaxed">
                        <li>Aktifkan Verifikasi 2 Langkah (2-Step Verification) pada akun Google Anda.</li>
                        <li>Cari kata kunci "Sandi Aplikasi" (App Passwords) di kolom pencarian Akun Google Anda.</li>
                        <li>Pilih opsi "Lainnya (Nama Kustom)" dan buat nama misalnya "AeroAppeal Bot".</li>
                        <li>Salin kode 16 digit yang muncul tanpa spasi dan tempelkan pada kolom di atas.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Telegram Bot Token */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3 flex items-center gap-2">
                      <Bot className="w-3.5 h-3.5 text-white/50" />
                      Telegram Bot Token
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan token BotFather baru untuk memperbarui..."
                      className="w-full bg-[#090909] border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:border-white/20 transition-all font-mono"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                    />
                    <p className="text-[10px] text-white/40 mt-2">
                      Dapatkan Token Bot dari Telegram <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-white hover:underline inline-flex items-center gap-1">@BotFather <ExternalLink className="w-2.5 h-2.5" /></a>.
                    </p>
                  </div>

                  <div className="border-t border-white/5 pt-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">Kustomisasi Teks Bot</h4>
                      <p className="text-[10px] text-white/40">Ganti template pesan balasan bot Telegram di bawah ini agar sesuai dengan selera Anda.</p>
                    </div>

                    {/* Custom Telegram success text */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Template Chat Sukses Bot (/fix)
                      </label>
                      <textarea
                        rows={6}
                        className="w-full bg-[#090909] border border-white/5 rounded-2xl px-5 py-4 text-xs outline-none focus:border-white/20 transition-all font-mono leading-relaxed"
                        value={customSuccessMsg}
                        onChange={(e) => setCustomSuccessMsg(e.target.value)}
                        placeholder="Masukkan template chat bot ketika sukses..."
                      />
                      <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
                        Variabel dinamis: <code className="text-white/60">{`{phone}`}</code>, <code className="text-white/60">{`{name}`}</code>, <code className="text-white/60">{`{language}`}</code>, <code className="text-white/60">{`{text}`}</code>, <code className="text-white/60">{`{role}`}</code>, <code className="text-white/60">{`{total_appeals}`}</code>, <code className="text-white/60">{`{success_appeals}`}</code>. HTML Tag didukung.
                      </p>
                    </div>

                    {/* Custom Telegram failure text */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3 flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        Template Chat Gagal Bot (/fix)
                      </label>
                      <textarea
                        rows={4}
                        className="w-full bg-[#090909] border border-white/5 rounded-2xl px-5 py-4 text-xs outline-none focus:border-white/20 transition-all font-mono leading-relaxed"
                        value={customFailMsg}
                        onChange={(e) => setCustomFailMsg(e.target.value)}
                        placeholder="Masukkan template chat bot ketika gagal..."
                      />
                      <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
                        Variabel dinamis: <code className="text-white/60">{`{phone}`}</code>, <code className="text-white/60">{`{error}`}</code>, <code className="text-white/60">{`{role}`}</code>, <code className="text-white/60">{`{total_appeals}`}</code>, <code className="text-white/60">{`{success_appeals}`}</code>. HTML Tag didukung.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-white hover:bg-white/90 active:scale-[0.99] text-black font-semibold text-sm py-4 rounded-2xl tracking-wide flex items-center justify-center gap-2 transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </form>

                {settingsStatus && (
                  <div className={`p-4 rounded-2xl border ${
                    settingsStatus.success 
                      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300' 
                      : 'bg-red-500/5 border-red-500/15 text-red-300'
                  }`}>
                    <p className="text-xs font-semibold">{settingsStatus.message}</p>
                  </div>
                )}
              </div>

              {/* Redeem Voucher Management Card */}
              <div className="p-8 rounded-3xl glass-panel space-y-6 mt-8">
                <div>
                  <h3 className="text-xl font-medium mb-1">Manajemen Kode Redeem Voucher (Owner Only)</h3>
                  <p className="text-xs text-white/40">
                    Buat voucher VIP Premium instan yang bisa diklaim oleh pembeli atau member Anda di Telegram via <code>/redeem</code>.
                  </p>
                </div>

                <form onSubmit={handleCreateRedeemCode} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">
                      Masa Aktif Premium (Hari)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-[#090909] border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/20 transition-all font-mono text-white"
                      value={newDays}
                      onChange={(e) => setNewDays(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">
                      Bonus Saldo (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-[#090909] border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/20 transition-all font-mono text-white"
                      value={newBonus}
                      onChange={(e) => setNewBonus(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={redeemLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-semibold text-xs py-3.5 rounded-xl tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    >
                      {redeemLoading ? 'Memproses Pembuatan...' : 'Buat Kode Voucher Baru'}
                    </button>
                  </div>
                </form>

                <div className="border-t border-white/5 pt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">Voucher Aktif & Terpakai</h4>
                  {redeemCodes.length === 0 ? (
                    <p className="text-xs text-white/20 text-center py-6 border border-dashed border-white/5 rounded-xl">
                      Belum ada voucher yang dibuat.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] text-white/80">
                        <thead>
                          <tr className="border-b border-white/5 text-white/40 font-mono text-[9px] uppercase tracking-wider">
                            <th className="py-2">Kode Voucher</th>
                            <th className="py-2">Durasi</th>
                            <th className="py-2">Bonus Saldo</th>
                            <th className="py-2">Status</th>
                            <th className="py-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {redeemCodes.map((rc) => (
                            <tr key={rc.code} className="hover:bg-white/[0.01]">
                              <td className="py-3 font-mono font-bold text-emerald-400 select-all">{rc.code}</td>
                              <td className="py-3 font-sans">{rc.durationDays} Hari</td>
                              <td className="py-3 font-sans">Rp {rc.saldoBonus?.toLocaleString('id-ID') || '0'}</td>
                              <td className="py-3 font-sans">
                                {rc.isUsed ? (
                                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] rounded uppercase font-semibold">
                                    Terpakai oleh {rc.usedBy}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] rounded uppercase font-semibold">
                                    Tersedia
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleDeleteRedeemCode(rc.code)}
                                  className="text-red-400 hover:text-red-300 font-bold"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Modal: Appeal Full Review Excerpt */}
        <AnimatePresence>
          {selectedAppeal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl relative"
              >
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        selectedAppeal.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {selectedAppeal.status === 'success' ? 'Sukses' : 'Gagal'}
                      </span>
                      <span className="text-[10px] text-white/40">ID: {selectedAppeal.id}</span>
                    </div>
                    <h3 className="text-lg font-medium font-serif italic">{selectedAppeal.phoneNumber}</h3>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedAppeal(null)}
                    className="text-xs text-white/40 hover:text-white uppercase tracking-widest font-bold"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs">
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-bold mb-1">Pengirim Acak</p>
                      <p className="font-semibold">{selectedAppeal.name}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-bold mb-1">Bahasa Pengiriman</p>
                      <p className="font-semibold">{selectedAppeal.language}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-bold mb-1">Platform Input</p>
                      <p className="font-semibold capitalize">{selectedAppeal.sender}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-bold mb-1">Tujuan</p>
                      <p className="font-semibold">android@support.whatsapp.com</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-[10px] uppercase font-bold mb-2">Teks Log Email Lengkap</p>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/85 leading-relaxed font-mono select-all">
                      {selectedAppeal.text}
                    </div>
                  </div>

                  {selectedAppeal.error && (
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs text-red-400">
                      <p className="font-bold mb-1">Informasi Error SMTP:</p>
                      <p className="font-mono">{selectedAppeal.error}</p>
                    </div>
                  )}

                  {selectedAppeal.userId && (
                    <div className="text-[10px] text-white/30 text-right">
                      Dikirim oleh User Telegram: ID {selectedAppeal.userId} {selectedAppeal.username ? `(@${selectedAppeal.username})` : ''}
                    </div>
                  )}

                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-white/5 text-center text-white/20 text-[10px] uppercase tracking-[0.25em]">
          <p>© 2026 AeroAppeal Pro. Automated Telegram Ban Appeals Bypass System.</p>
        </footer>

      </div>
    </div>
  );
}
