
import React, { useState, useEffect, useRef } from 'react';
import { AuthUser, DatabaseUser, User, UserRole, Skbn, SkbnStatus, Approval, NotificationItem, ToastMessage } from './types';
import {
  getSkbns,
  getApprovals,
  getNotifications,
  getUsers,
  markNotificationRead,
  saveSkbn,
  saveApproval,
  saveNotification,
  updateNotificationEmailStatus,
  checkFirebaseStatus,
  cleanupReadNotifications,
  getBuyerEmailOtpVerified,
  getCurrentFirebaseUser,
  getDatabaseUser,
  loginBuyerWithEmail,
  logoutFirebaseUser,
  registerBuyerWithEmail,
  resetBuyerPassword,
  saveBuyerEmailOtpVerified
} from './firebase';
import { Stats } from './components/Stats';
import { SkbnForm } from './components/SkbnForm';
import { SkbnTable } from './components/SkbnTable';
import homeImage from './assets/skbdn-home.png';

const AUTH_USERS_KEY = 'skbn_auth_users';
const CURRENT_USER_KEY = 'skbn_current_user';
const READ_PENDING_NOTIFICATIONS_KEY = 'skbn_read_pending_notifications';
const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;

const DEFAULT_USERS: AuthUser[] = [
  { id: 'user-ap2', nama: 'Admin AP2', role: UserRole.AP2, username: 'admin', password: 'admin123' },
  { id: 'user-keu', nama: 'Admin Keuangan', role: UserRole.KEUANGAN, username: 'keuangan', password: 'admin123' }
];

const COUNTRY_CODES = [
  { code: '+62', label: 'Indonesia' },
  { code: '+60', label: 'Malaysia' },
  { code: '+65', label: 'Singapore' },
  { code: '+66', label: 'Thailand' },
  { code: '+63', label: 'Philippines' },
  { code: '+84', label: 'Vietnam' },
  { code: '+673', label: 'Brunei' },
  { code: '+855', label: 'Cambodia' },
  { code: '+856', label: 'Laos' },
  { code: '+95', label: 'Myanmar' },
  { code: '+1', label: 'United States / Canada' },
  { code: '+44', label: 'United Kingdom' },
  { code: '+61', label: 'Australia' },
  { code: '+64', label: 'New Zealand' },
  { code: '+81', label: 'Japan' },
  { code: '+82', label: 'South Korea' },
  { code: '+86', label: 'China' },
  { code: '+852', label: 'Hong Kong' },
  { code: '+886', label: 'Taiwan' },
  { code: '+91', label: 'India' },
  { code: '+92', label: 'Pakistan' },
  { code: '+880', label: 'Bangladesh' },
  { code: '+94', label: 'Sri Lanka' },
  { code: '+971', label: 'United Arab Emirates' },
  { code: '+966', label: 'Saudi Arabia' },
  { code: '+974', label: 'Qatar' },
  { code: '+965', label: 'Kuwait' },
  { code: '+973', label: 'Bahrain' },
  { code: '+968', label: 'Oman' },
  { code: '+90', label: 'Turkey' },
  { code: '+49', label: 'Germany' },
  { code: '+33', label: 'France' },
  { code: '+39', label: 'Italy' },
  { code: '+34', label: 'Spain' },
  { code: '+31', label: 'Netherlands' },
  { code: '+32', label: 'Belgium' },
  { code: '+41', label: 'Switzerland' },
  { code: '+46', label: 'Sweden' },
  { code: '+47', label: 'Norway' },
  { code: '+45', label: 'Denmark' },
  { code: '+358', label: 'Finland' },
  { code: '+48', label: 'Poland' },
  { code: '+351', label: 'Portugal' },
  { code: '+30', label: 'Greece' },
  { code: '+7', label: 'Russia / Kazakhstan' },
  { code: '+55', label: 'Brazil' },
  { code: '+52', label: 'Mexico' },
  { code: '+54', label: 'Argentina' },
  { code: '+56', label: 'Chile' },
  { code: '+57', label: 'Colombia' },
  { code: '+51', label: 'Peru' },
  { code: '+27', label: 'South Africa' },
  { code: '+20', label: 'Egypt' },
  { code: '+234', label: 'Nigeria' },
  { code: '+254', label: 'Kenya' },
  { code: '+212', label: 'Morocco' }
];

const App: React.FC = () => {
  // App States
  const [skbns, setSkbns] = useState<Skbn[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedSkbn, setSelectedSkbn] = useState<Skbn | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.BUYER);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'create' | 'buyer-register' | 'buyer-list' | 'history'>('home');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [databaseUsers, setDatabaseUsers] = useState<DatabaseUser[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [ap2UploadBuyerId, setAp2UploadBuyerId] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readPendingNotificationIds, setReadPendingNotificationIds] = useState<string[]>([]);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset' | 'phone'>('login');
  const [authForm, setAuthForm] = useState({
    nama: '',
    username: '',
    password: '',
    confirmPassword: '',
    countryCode: '+62',
    phoneNumber: '',
    otpCode: ''
  });
  const [pendingBuyer, setPendingBuyer] = useState<{ id: string; nama: string; email: string } | null>(null);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] = useState(0);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [buyerAccountForm, setBuyerAccountForm] = useState({ nama: '', email: '', password: '' });
  const [isBuyerAccountSubmitting, setIsBuyerAccountSubmitting] = useState(false);
  const [deletingBuyerId, setDeletingBuyerId] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const lastEmailWarningRef = useRef(0);

  // Modals & Rejection Uploads
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<Skbn | null>(null);
  const [detailTarget, setDetailTarget] = useState<Skbn | null>(null);
  const [openHistorySkbnId, setOpenHistorySkbnId] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApprovalSubmitting, setIsApprovalSubmitting] = useState(false);
  const [editingSkbn, setEditingSkbn] = useState<Skbn | null>(null);
  
  // Rejection PDF states
  const [rejectionFile, setRejectionFile] = useState<File | null>(null);
  const [rejectionBase64, setRejectionBase64] = useState<string>('');
  const rejectionFileInputRef = useRef<HTMLInputElement>(null);

  const getAuthUsers = (): AuthUser[] => {
    const stored = localStorage.getItem(AUTH_USERS_KEY);
    if (!stored) {
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }

    const users = (JSON.parse(stored) as AuthUser[]).filter(user =>
      user.role !== UserRole.BUYER && !DEFAULT_USERS.some(defaultUser => defaultUser.id === user.id)
    );
    const merged = [
      ...DEFAULT_USERS.filter(defaultUser => !users.some(user => user.id === defaultUser.id)),
      ...users
    ];
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(merged));
    return merged;
  };

  const setAuthField = (field: keyof typeof authForm, value: string) => {
    setAuthForm(prev => ({ ...prev, [field]: value }));
  };

  const resetAuthForm = () => {
    setAuthForm({
      nama: '',
      username: '',
      password: '',
      confirmPassword: '',
      countryCode: '+62',
      phoneNumber: '',
      otpCode: ''
    });
  };

  const startSession = (user: AuthUser) => {
    const sessionUser: User = { id: user.id, nama: user.nama, role: user.role };
    setCurrentUser(sessionUser);
    setCurrentRole(user.role);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    setActiveTab('home');
    resetAuthForm();
  };

  const startBuyerSession = (id: string, nama: string, email: string, emailVerified = true) => {
    const sessionUser: User = { id, nama, email, email_verified: emailVerified, role: UserRole.BUYER };
    setCurrentUser(sessionUser);
    setCurrentRole(UserRole.BUYER);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    setActiveTab('home');
    resetAuthForm();
  };

  const startRoleSession = (id: string, nama: string, role: UserRole, email?: string) => {
    const sessionUser: User = { id, nama, email, role };
    setCurrentUser(sessionUser);
    setCurrentRole(role);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    setActiveTab('home');
    resetAuthForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;
    const identifier = authForm.username.trim().toLowerCase();

    if (!identifier || !authForm.password) {
      showToast('warning', 'Data Belum Lengkap', 'Email dan password wajib diisi.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const internalUser = getAuthUsers().find(item =>
        item.username.toLowerCase() === identifier &&
        item.password === authForm.password
      );

      if (internalUser) {
        startSession(internalUser);
        showToast('success', 'Login Berhasil', `Selamat datang, ${internalUser.nama}.`);
        return;
      }

      const firebaseUser = await loginBuyerWithEmail(identifier, authForm.password);
      const databaseUser = await getDatabaseUser(firebaseUser.uid);
      const databaseRole = mapDatabaseRoleToUserRole(databaseUser?.role);
      const displayName = databaseUser?.nama || firebaseUser.displayName || firebaseUser.email || 'User';
      const displayEmail = databaseUser?.email || firebaseUser.email || identifier;

      if (databaseRole !== UserRole.BUYER) {
        startRoleSession(firebaseUser.uid, displayName, databaseRole, displayEmail);
        showToast('success', 'Login Berhasil', `Selamat datang, ${displayName}.`);
        return;
      }

      const isEmailOtpVerified = await getBuyerEmailOtpVerified(firebaseUser.uid);
      if (!isEmailOtpVerified) {
        setPendingBuyer({
          id: firebaseUser.uid,
          nama: displayName,
          email: displayEmail
        });
        setAuthMode('phone');
        setIsOtpSent(false);
        setEmailOtpCode('');
        setEmailOtpExpiresAt(0);
        setAuthForm(prev => ({ ...prev, otpCode: '' }));
        showToast('warning', 'Verifikasi Email', 'Kirim dan masukkan kode OTP email sebelum masuk.');
        return;
      }
      startBuyerSession(
        firebaseUser.uid,
        displayName,
        displayEmail,
        true
      );
      showToast('success', 'Login Buyer Berhasil', `Selamat datang, ${displayName}.`);
    } catch (error) {
      showToast('error', 'Login Gagal', 'Email atau password tidak sesuai.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;
    const email = authForm.username.trim().toLowerCase();
    const nama = email.split('@')[0] || 'Buyer';

    if (!email || !authForm.password) {
      showToast('warning', 'Data Belum Lengkap', 'Email dan password wajib diisi.');
      return;
    }
    if (!email.includes('@')) {
      showToast('warning', 'Email Tidak Valid', 'Register buyer wajib memakai email.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const firebaseUser = await registerBuyerWithEmail(nama, email, authForm.password);
      setPendingBuyer({
        id: firebaseUser.uid,
        nama: firebaseUser.displayName || firebaseUser.email || nama,
        email: firebaseUser.email || email
      });
      setAuthMode('phone');
      setIsOtpSent(false);
      setEmailOtpCode('');
      setEmailOtpExpiresAt(0);
      setAuthForm(prev => ({ ...prev, otpCode: '' }));
      showToast('success', 'Register Berhasil', 'Verifikasi email untuk melanjutkan.');
    } catch (error) {
      showToast('error', 'Register Gagal', 'Email sudah dipakai.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleCreateBuyerAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== UserRole.AP2 || isBuyerAccountSubmitting) return;

    const nama = buyerAccountForm.nama.trim();
    const email = buyerAccountForm.email.trim().toLowerCase();
    const password = buyerAccountForm.password;

    if (!nama || !email || !password) {
      showToast('warning', 'Data Belum Lengkap', 'Nama, email, dan password Buyer wajib diisi.');
      return;
    }
    if (!email.includes('@')) {
      showToast('warning', 'Email Tidak Valid', 'Masukkan email Buyer yang valid.');
      return;
    }
    if (password.length < 6) {
      showToast('warning', 'Password Terlalu Pendek', 'Password minimal 6 karakter.');
      return;
    }

    setIsBuyerAccountSubmitting(true);
    try {
      await registerBuyerWithEmail(nama, email, password);
      setBuyerAccountForm({ nama: '', email: '', password: '' });
      showToast('success', 'Akun Buyer Dibuat', `${nama} sudah bisa login. OTP email tetap diminta saat login pertama.`);
    } catch (error) {
      showToast('error', 'Gagal Membuat Akun', 'Email sudah dipakai atau Firebase Auth menolak pembuatan akun.');
    } finally {
      setIsBuyerAccountSubmitting(false);
    }
  };

  const handleDeleteBuyerAccount = async (buyer: DatabaseUser) => {
    if (currentRole !== UserRole.AP2 || deletingBuyerId) return;
    const buyerName = buyer.nama || buyer.email || buyer.id;
    if (!window.confirm(`Hapus akun Buyer ${buyerName} dari Authentication dan Database?`)) return;

    setDeletingBuyerId(buyer.id);
    try {
      const firebaseUser = getCurrentFirebaseUser();
      const idToken = await firebaseUser?.getIdToken();
      if (!idToken) {
        throw new Error('Login AP2 harus memakai akun Firebase agar bisa menghapus akun Buyer dari Auth.');
      }

      const response = await fetch(`/api/buyers/${buyer.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      const responseText = await response.text();
      let data: { message?: string; error?: string } | null = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }
      if (!response.ok) {
        const fallbackMessage = response.status >= 500
          ? 'Backend hapus akun belum aktif. Jalankan backend di port 5000 lalu coba lagi.'
          : 'Gagal menghapus akun Buyer.';
        throw new Error(data?.message || data?.error || fallbackMessage);
      }
      showToast('success', 'Buyer Dihapus', `${buyerName} sudah dihapus dari Auth dan database.`);
    } catch (error) {
      const message = (error as { message?: string })?.message || '';
      showToast(
        'error',
        'Gagal Menghapus Buyer',
        message.includes('Failed to fetch') || message.includes('NetworkError')
          ? 'Backend belum jalan di port 5000. Jalankan backend dulu lalu coba lagi.'
          : message || 'Backend menolak penghapusan akun.'
      );
    } finally {
      setDeletingBuyerId('');
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOtpSubmitting) return;
    if (!pendingBuyer) {
      showToast('warning', 'Akun Belum Siap', 'Silakan login atau register ulang sebelum verifikasi email.');
      setAuthMode('register');
      return;
    }

    setIsOtpSubmitting(true);
    try {
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + EMAIL_OTP_TTL_MS;
      const emailResult = await sendNotificationEmail(
        pendingBuyer.email,
        'Kode OTP Email SKBDN',
        `Kode OTP Anda adalah ${otpCode}. Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.`
      );

      if (!emailResult.ok) {
        throw new Error(emailResult.error || 'Email OTP gagal dikirim.');
      }

      setEmailOtpCode(otpCode);
      setEmailOtpExpiresAt(expiresAt);
      setIsOtpSent(true);
      setAuthField('otpCode', '');
      setOtpResendCooldown(30);
      showToast('success', 'OTP Email Dikirim', `Kode OTP dikirim ke ${pendingBuyer.email}. Berlaku 5 menit.`);
    } catch (error) {
      const errorMessage = (error as { message?: string })?.message;
      console.error('Gagal mengirim OTP email:', error);
      showToast('error', 'OTP Email Gagal', errorMessage || 'SMTP menolak pengiriman OTP email.');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (otpResendCooldown > 0 || isOtpSubmitting) return;
    await handleSendPhoneOtp({ preventDefault: () => undefined } as React.FormEvent);
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingBuyer || !emailOtpCode) return;
    if (!authForm.otpCode.trim()) {
      showToast('warning', 'Kode Belum Diisi', 'Masukkan kode OTP dari email.');
      return;
    }

    setIsOtpSubmitting(true);
    try {
      if (Date.now() > emailOtpExpiresAt) {
        showToast('error', 'OTP Kedaluwarsa', 'Kode OTP sudah lebih dari 5 menit. Kirim ulang kode OTP.');
        setEmailOtpCode('');
        setIsOtpSent(false);
        return;
      }

      if (authForm.otpCode.trim() !== emailOtpCode) {
        showToast('error', 'Kode OTP Salah', 'Periksa kembali 6 digit kode OTP yang dikirim ke email.');
        return;
      }

      await saveBuyerEmailOtpVerified(pendingBuyer.id);
      startBuyerSession(
        pendingBuyer.id,
        pendingBuyer.nama,
        pendingBuyer.email,
        true
      );
      setPendingBuyer(null);
      setEmailOtpCode('');
      setEmailOtpExpiresAt(0);
      setIsOtpSent(false);
      showToast('success', 'Email Terverifikasi', 'Akun buyer sudah aktif.');
    } catch (error) {
      const errorMessage = (error as { message?: string })?.message;
      showToast('error', 'Verifikasi Gagal', errorMessage || 'Gagal menyimpan status verifikasi email.');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;
    const identifier = authForm.username.trim().toLowerCase();

    if (!identifier) {
      showToast('warning', 'Email Belum Diisi', 'Masukkan email akun yang ingin direset.');
      return;
    }

    if (getAuthUsers().some(user => user.username.toLowerCase() === identifier)) {
      showToast('info', 'Akun Internal', 'Password admin dan keuangan diatur oleh sistem.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      await resetBuyerPassword(identifier);
      setAuthMode('login');
      resetAuthForm();
      showToast('success', 'Email Reset Terkirim', 'Cek email untuk mengganti password.');
    } catch (error) {
      showToast('error', 'Reset Gagal', 'Email tidak ditemukan atau Firebase Auth belum aktif.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutFirebaseUser();
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    setSelectedSkbn(null);
    setActiveTab('home');
    showToast('info', 'Logout', 'Anda sudah keluar dari sistem.');
  };

  // Sync with Firebase / LocalStorage
  useEffect(() => {
    getAuthUsers();
    cleanupReadNotifications(7);
    const savedReadPendingNotifications = localStorage.getItem(READ_PENDING_NOTIFICATIONS_KEY);
    setReadPendingNotificationIds(savedReadPendingNotifications ? JSON.parse(savedReadPendingNotifications) : []);

    const restoreSession = async () => {
      const savedUser = localStorage.getItem(CURRENT_USER_KEY);
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser) as User;
        if (parsedUser.role === UserRole.BUYER && !parsedUser.email_verified) {
          const firebaseUser = getCurrentFirebaseUser();
          localStorage.removeItem(CURRENT_USER_KEY);
          const isEmailOtpVerified = firebaseUser ? await getBuyerEmailOtpVerified(firebaseUser.uid) : false;
          if (firebaseUser && isEmailOtpVerified) {
            startBuyerSession(
              firebaseUser.uid,
              firebaseUser.displayName || firebaseUser.email || parsedUser.nama,
              firebaseUser.email || parsedUser.email || '',
              true
            );
          } else if (firebaseUser) {
            setPendingBuyer({
              id: firebaseUser.uid,
              nama: firebaseUser.displayName || firebaseUser.email || parsedUser.nama,
              email: firebaseUser.email || parsedUser.email || ''
            });
            setAuthMode('phone');
            setIsOtpSent(false);
            setEmailOtpCode('');
            setEmailOtpExpiresAt(0);
          } else {
            setAuthMode('login');
          }
        } else {
          setCurrentUser(parsedUser);
          setCurrentRole(parsedUser.role);
        }
      }
    };
    restoreSession();

    getSkbns((data) => {
      setSkbns(data);
    });

    getApprovals((data) => {
      setApprovals(data);
    });

    getNotifications((data) => {
      setNotifications(data);
    });

    getUsers((data) => {
      setDatabaseUsers(data);
    });

    setFirebaseConnected(checkFirebaseStatus());
  }, []);

  useEffect(() => {
    const cleanupTimer = window.setInterval(() => {
      cleanupReadNotifications(7);
    }, 24 * 60 * 60 * 1000);

    return () => window.clearInterval(cleanupTimer);
  }, []);

  // Dark Mode Toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if ((activeTab === 'buyer-register' || activeTab === 'buyer-list') && currentRole !== UserRole.AP2) {
      setActiveTab('home');
    }
  }, [activeTab, currentRole]);

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setOtpResendCooldown(prev => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpResendCooldown]);

  // Toast Helper
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const normalizeDatabaseRole = (role?: string) => role?.trim().toLowerCase().replace(/\s+/g, '') || '';

  const mapDatabaseRoleToUserRole = (role?: string): UserRole => {
    const normalizedRole = normalizeDatabaseRole(role);
    if (normalizedRole === 'admin' || normalizedRole === 'ap2' || normalizedRole === 'adminap2') {
      return UserRole.AP2;
    }
    if (normalizedRole === 'keuangan' || normalizedRole === 'keuangann' || normalizedRole === 'adminkeuangan') {
      return UserRole.KEUANGAN;
    }
    return UserRole.BUYER;
  };

  const isDatabaseUserForRole = (user: DatabaseUser, role: UserRole) => {
    const normalizedRole = normalizeDatabaseRole(user.role);
    if (role === UserRole.BUYER) return normalizedRole === 'buyer';
    return mapDatabaseRoleToUserRole(user.role) === role;
  };

  const getRoleEmails = (role: UserRole) => {
    return databaseUsers
      .filter(user => isDatabaseUserForRole(user, role))
      .map(user => user.email || user.username)
      .filter((email): email is string => Boolean(email && email.includes('@')));
  };

  const buyerAccounts = databaseUsers
    .filter(user => isDatabaseUserForRole(user, UserRole.BUYER))
    .slice()
    .sort((a, b) => {
      const bTime = new Date((b as DatabaseUser & { created_at?: string }).created_at || '').getTime() || 0;
      const aTime = new Date((a as DatabaseUser & { created_at?: string }).created_at || '').getTime() || 0;
      return bTime - aTime;
    });
  const selectedAp2UploadBuyer = buyerAccounts.find(user => user.id === ap2UploadBuyerId) || null;

  useEffect(() => {
    if (currentRole === UserRole.AP2 && buyerAccounts.length > 0 && !buyerAccounts.some(user => user.id === ap2UploadBuyerId)) {
      setAp2UploadBuyerId(buyerAccounts[0].id);
    }
  }, [ap2UploadBuyerId, buyerAccounts, currentRole]);

  const resolveEmailRecipients = (to: string | string[] | undefined) => {
    const recipients = Array.isArray(to) ? to : to ? [to] : [];
    return [...new Set(recipients.filter(email => email.includes('@')))];
  };

  const sendNotificationEmail = async (to: string | string[] | undefined, title: string, message: string) => {
    const uniqueRecipients = resolveEmailRecipients(to);
    if (uniqueRecipients.length === 0) return { ok: false, error: 'Tidak ada email tujuan.' };

    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: uniqueRecipients,
          subject: title,
          title,
          message
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || 'Email notification failed.');
      }

      return { ok: true };
    } catch (error) {
      const rawMessage = (error as { message?: string })?.message || '';
      const errorMessage = rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')
        ? 'API email belum bisa diakses. Di lokal jalankan backend port 5000, di Vercel pastikan env SMTP sudah dipasang.'
        : rawMessage || 'Email notification failed.';
      console.warn('Gagal mengirim email notifikasi:', error);
      const now = Date.now();
      if (now - lastEmailWarningRef.current > 5000) {
        lastEmailWarningRef.current = now;
        showToast(
          'warning',
          'Email Belum Terkirim',
          errorMessage
        );
      }
      return { ok: false, error: errorMessage };
    }
  };

  const createNotification = async (
    recipientRole: UserRole,
    title: string,
    message: string,
    skbnId?: string,
    recipientUserId?: string,
    recipientEmail?: string | string[]
  ) => {
    const emailRecipients = resolveEmailRecipients(recipientEmail || getRoleEmails(recipientRole));
    const notificationId = await saveNotification({
      recipient_role: recipientRole,
      recipient_user_id: recipientUserId,
      recipient_emails: emailRecipients,
      skbn_id: skbnId,
      title,
      message,
      created_at: new Date().toISOString(),
      email_status: emailRecipients.length > 0 ? 'pending' : 'skipped'
    });

    if (emailRecipients.length === 0) return;

    const emailResult = await sendNotificationEmail(emailRecipients, title, message);
    await updateNotificationEmailStatus(
      notificationId,
      emailResult.ok ? 'sent' : 'failed',
      emailResult.ok ? undefined : emailResult.error
    );
  };

  // Create or Edit SKBDN
  const handleSkbnSubmit = async (formData: Omit<Skbn, 'id' | 'created_at'>) => {
    if (!currentUser) return;
    const targetBuyer = currentRole === UserRole.AP2 && !editingSkbn ? selectedAp2UploadBuyer : null;

    if (currentRole === UserRole.AP2 && !editingSkbn && !targetBuyer) {
      showToast('warning', 'Buyer Belum Dipilih', 'Pilih akun Buyer terlebih dahulu sebelum upload dokumen.');
      return;
    }

    const documentOwner = targetBuyer
      ? {
          id: targetBuyer.id,
          nama: targetBuyer.nama || targetBuyer.email || 'Buyer',
          email: targetBuyer.email || targetBuyer.username
        }
      : currentUser;

    let nextStatus = formData.status;
    if (!editingSkbn) {
      nextStatus = SkbnStatus.DRAFT_CREATED;
    } else if (
      editingSkbn.status === SkbnStatus.DRAFT_VERIFIED ||
      editingSkbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 ||
      editingSkbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN
    ) {
      nextStatus = SkbnStatus.FINAL_SENT;
    } else if (
      editingSkbn.status === SkbnStatus.DRAFT_REJECTED_BY_AP2 ||
      editingSkbn.status === SkbnStatus.DRAFT_REJECTED_BY_KEUANGAN
    ) {
      nextStatus = SkbnStatus.DRAFT_CREATED;
    }

    try {
      const { pdf_name, pdf_data, ...documentData } = formData;
      const willSaveFinalPdf = nextStatus === SkbnStatus.FINAL_SENT;
      const id = await saveSkbn({
        ...documentData,
        status: nextStatus,
        buyer: documentOwner.nama,
        buyer_id: documentOwner.id,
        buyer_email: documentOwner.email,
        id: editingSkbn?.id,
        created_at: editingSkbn?.created_at || new Date().toISOString(),
        pdf_name: willSaveFinalPdf ? editingSkbn?.pdf_name : pdf_name,
        pdf_data: willSaveFinalPdf ? editingSkbn?.pdf_data : pdf_data,
        final_pdf_name: willSaveFinalPdf ? pdf_name : editingSkbn?.final_pdf_name,
        final_pdf_data: willSaveFinalPdf ? pdf_data : editingSkbn?.final_pdf_data,
        rejection_pdf_name: undefined,
        rejection_pdf_data: undefined,
        rejection_reason: undefined
      });

      const isFinalUpload = nextStatus === SkbnStatus.FINAL_SENT;
      await createNotification(
        UserRole.AP2,
        isFinalUpload ? 'Final SKBDN Masuk' : 'Permintaan SKBDN Baru',
        isFinalUpload
          ? `Buyer mengirim final ${formData.nomor_skbn}. Mohon review AP2.`
          : targetBuyer
            ? `AP2 mengunggah draft ${formData.nomor_skbn} untuk ${documentOwner.nama}.`
            : `Buyer mengunggah draft ${formData.nomor_skbn}. Mohon review AP2.`,
        id
      );

      if (targetBuyer) {
        await createNotification(
          UserRole.BUYER,
          'Draft SKBDN Dibuat AP2',
          `AP2 mengunggah draft ${formData.nomor_skbn} untuk akun Anda. Silakan cek detail dokumen.`,
          id,
          targetBuyer.id,
          documentOwner.email
        );
      }

      showToast(
        'success', 
        isFinalUpload ? 'Final SKBDN Dikirim' : editingSkbn ? 'SKBDN Direvisi' : 'Draft SKBDN Dibuat',
        isFinalUpload
          ? `Final ${formData.nomor_skbn} berhasil dikirim ke AP2.`
          : targetBuyer
            ? `Dokumen ${formData.nomor_skbn} berhasil dibuat untuk ${documentOwner.nama}.`
            : `Dokumen ${formData.nomor_skbn} berhasil dikirim ke AP2.`
      );

      setEditingSkbn(null);
      setActiveTab('dashboard');
    } catch (error) {
      showToast('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan dokumen.');
    }
  };

  // Send Final SKBDN (Buyer Action)
  const handleSendFinal = async (skbn: Skbn) => {
    setEditingSkbn(skbn);
    setActiveTab('create');
  };

  // Convert Rejection File to Base64
  const handleRejectionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Hanya file PDF yang diperbolehkan!');
        return;
      }
      setRejectionFile(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        setRejectionBase64(base64String);
      };
    }
  };

  // Process Approval (Approve / Reject)
  const handleApprovalSubmit = async (status: 'Approved' | 'Rejected') => {
    if (!approvalTarget || !currentUser || isApprovalSubmitting) return;

    // Validation for Rejection
    if (status === 'Rejected') {
      if (!approvalNotes.trim()) {
        alert('Harap isi catatan alasan penolakan!');
        return;
      }
      if (!rejectionBase64) {
        alert('Harap unggah dokumen PDF bukti/surat tolakan!');
        return;
      }
    }

    setIsApprovalSubmitting(true);

    let nextStatus: SkbnStatus = approvalTarget.status;

    // Workflow State Machine
    if (currentRole === UserRole.AP2) {
      if (approvalTarget.status === SkbnStatus.DRAFT_CREATED) {
        nextStatus = status === 'Approved' ? SkbnStatus.DRAFT_APPROVED_BY_AP2 : SkbnStatus.DRAFT_REJECTED_BY_AP2;
      } else if (approvalTarget.status === SkbnStatus.FINAL_SENT) {
        nextStatus = status === 'Approved' ? SkbnStatus.FINAL_APPROVED_BY_AP2 : SkbnStatus.FINAL_REJECTED_BY_AP2;
      }
    } else if (currentRole === UserRole.KEUANGAN) {
      if (approvalTarget.status === SkbnStatus.DRAFT_APPROVED_BY_AP2) {
        nextStatus = status === 'Approved' ? SkbnStatus.DRAFT_VERIFIED : SkbnStatus.DRAFT_REJECTED_BY_KEUANGAN;
      } else if (approvalTarget.status === SkbnStatus.FINAL_APPROVED_BY_AP2) {
        nextStatus = status === 'Approved' ? SkbnStatus.FINAL_VERIFIED : SkbnStatus.FINAL_REJECTED_BY_KEUANGAN;
      }
    }

    try {
      // Save Approval History
      await saveApproval({
        skbn_id: approvalTarget.id,
        user_id: currentUser.id,
        nama_approver: currentUser.nama,
        role: currentRole,
        status,
        catatan: approvalNotes || 'Disetujui tanpa catatan tambahan.',
        approved_at: new Date().toISOString(),
        rejection_pdf_name: status === 'Rejected' ? rejectionFile?.name : undefined,
        rejection_pdf_data: status === 'Rejected' ? rejectionBase64 : undefined
      });

      // Update SKBDN Status and Rejection details
      await saveSkbn({
        ...approvalTarget,
        status: nextStatus,
        rejection_pdf_name: status === 'Rejected' ? rejectionFile?.name : undefined,
        rejection_pdf_data: status === 'Rejected' ? rejectionBase64 : undefined,
        rejection_reason: status === 'Rejected' ? approvalNotes : undefined
      });

      if (currentRole === UserRole.AP2 && status === 'Approved') {
        await createNotification(
          UserRole.KEUANGAN,
          'SKBDN Menunggu Keuangan',
          `${approvalTarget.nomor_skbn} sudah disetujui AP2 dan perlu diverifikasi Keuangan.`,
          approvalTarget.id
        );
      }

      if (approvalTarget.buyer_id || approvalTarget.buyer_email) {
        const buyerTitle = status === 'Approved' ? 'SKBDN Disetujui' : 'SKBDN Ditolak';
        const buyerMessage = status === 'Approved'
          ? currentRole === UserRole.AP2
            ? `${approvalTarget.nomor_skbn} disetujui AP2 dan diteruskan ke Keuangan.`
            : `${approvalTarget.nomor_skbn} disetujui Keuangan. Silakan cek detail dokumen.`
          : `${approvalTarget.nomor_skbn} ditolak oleh ${currentRole}. Cek catatan dan dokumen tolakan.`;

        await createNotification(
          UserRole.BUYER,
          buyerTitle,
          buyerMessage,
          approvalTarget.id,
          approvalTarget.buyer_id,
          approvalTarget.buyer_email
        );
      }

      let approvalMessage = `Dokumen ${approvalTarget.nomor_skbn} telah di-${status === 'Approved' ? 'setujui' : 'tolak'}.`;
      if (status === 'Approved') {
        if (nextStatus === SkbnStatus.DRAFT_APPROVED_BY_AP2) {
          approvalMessage = `Draft ${approvalTarget.nomor_skbn} disetujui AP2 dan langsung masuk ke Keuangan.`;
        } else if (nextStatus === SkbnStatus.DRAFT_VERIFIED) {
          approvalMessage = `Draft ${approvalTarget.nomor_skbn} diverifikasi Keuangan. Buyer dapat melihat riwayat approve dan upload final.`;
        } else if (nextStatus === SkbnStatus.FINAL_APPROVED_BY_AP2) {
          approvalMessage = `Final ${approvalTarget.nomor_skbn} disetujui AP2 dan langsung masuk ke Keuangan.`;
        } else if (nextStatus === SkbnStatus.FINAL_VERIFIED) {
          approvalMessage = `Final ${approvalTarget.nomor_skbn} diverifikasi Keuangan. Workflow selesai.`;
        }
      }

      showToast(
        status === 'Approved' ? 'success' : 'error',
        status === 'Approved' ? 'Persetujuan Berhasil' : 'Dokumen Ditolak',
        approvalMessage
      );

      setShowApprovalModal(false);
      setApprovalTarget(null);
      setApprovalNotes('');
      setRejectionFile(null);
      setRejectionBase64('');
    } catch (error) {
      showToast('error', 'Gagal Memproses', 'Terjadi kesalahan saat memproses persetujuan.');
    } finally {
      setIsApprovalSubmitting(false);
    }
  };

  const visibleSkbns = currentRole === UserRole.BUYER && currentUser
    ? skbns.filter(skbn => skbn.buyer_id ? skbn.buyer_id === currentUser.id : skbn.buyer === currentUser.nama)
    : skbns;
  const sortedVisibleSkbns = visibleSkbns.slice().sort((a, b) => {
    const bTime = new Date(b.created_at || b.tanggal).getTime();
    const aTime = new Date(a.created_at || a.tanggal).getTime();
    return bTime - aTime;
  });
  const visibleSkbnIds = visibleSkbns.map(skbn => skbn.id);
  const visibleApprovals = (currentRole === UserRole.BUYER
    ? approvals.filter(approval => visibleSkbnIds.includes(approval.skbn_id))
    : approvals
  ).slice().sort((a, b) => {
    const bTime = new Date(b.approved_at).getTime();
    const aTime = new Date(a.approved_at).getTime();
    return bTime - aTime;
  });
  const getSkbnApprovals = (skbnId: string) => approvals
    .filter(approval => approval.skbn_id === skbnId)
    .slice()
    .sort((a, b) => new Date(a.approved_at).getTime() - new Date(b.approved_at).getTime());
  const historyDocuments = sortedVisibleSkbns
    .map((skbn) => {
      const documentApprovals = getSkbnApprovals(skbn.id);
      const latestApproval = documentApprovals[documentApprovals.length - 1];
      const latestTime = new Date(latestApproval?.approved_at || skbn.created_at || skbn.tanggal).getTime() || 0;
      return { skbn, approvals: documentApprovals, latestTime };
    })
    .sort((a, b) => b.latestTime - a.latestTime);

  const getHistorySteps = (skbn: Skbn, documentApprovals: Approval[]) => {
    const steps = [
      {
        id: `${skbn.id}-created`,
        title: skbn.status === SkbnStatus.FINAL_SENT ? 'Final SKBDN Dikirim' : 'Draft SKBDN Dibuat',
        time: skbn.created_at || skbn.tanggal,
        description: `${skbn.buyer || 'Buyer'} mengunggah dokumen ${skbn.nomor_skbn}.`,
        rejectionPdfName: undefined,
        rejectionPdfData: undefined,
        tone: 'blue'
      },
      ...documentApprovals.map((approval) => ({
        id: approval.id,
        title: `${approval.role} ${approval.status === 'Approved' ? 'Menyetujui' : 'Menolak'}`,
        time: approval.approved_at,
        description: approval.catatan || `Dokumen ${approval.status === 'Approved' ? 'disetujui' : 'ditolak'} oleh ${approval.nama_approver}.`,
        rejectionPdfName: approval.rejection_pdf_name,
        rejectionPdfData: approval.rejection_pdf_data,
        tone: approval.status === 'Approved' ? 'green' : 'red'
      }))
    ];

    if (!documentApprovals.length && !skbn.status.includes('Rejected')) {
      steps.push({
        id: `${skbn.id}-waiting`,
        title: 'Menunggu Proses',
        time: skbn.created_at || skbn.tanggal,
        description: 'Dokumen sedang diproses oleh tim terkait.',
        rejectionPdfName: undefined,
        rejectionPdfData: undefined,
        tone: 'slate'
      });
    }

    return steps;
  };

  useEffect(() => {
    if (!currentUser) return;
    if (currentRole === UserRole.BUYER) {
      if (selectedSkbn && !visibleSkbnIds.includes(selectedSkbn.id)) {
        setSelectedSkbn(null);
      }
      return;
    }
    if (!selectedSkbn || !visibleSkbnIds.includes(selectedSkbn.id)) {
      setSelectedSkbn(visibleSkbns[0] || null);
    }
  }, [currentUser, skbns, currentRole]);

  // Count pending documents for current role badge
  const getPendingCount = () => {
    return visibleSkbns.filter(s => {
      if (currentRole === UserRole.AP2) {
        return s.status === SkbnStatus.DRAFT_CREATED || s.status === SkbnStatus.FINAL_SENT;
      }
      if (currentRole === UserRole.KEUANGAN) {
        return s.status === SkbnStatus.DRAFT_APPROVED_BY_AP2 || s.status === SkbnStatus.FINAL_APPROVED_BY_AP2;
      }
      if (currentRole === UserRole.BUYER) {
        return s.status === SkbnStatus.DRAFT_VERIFIED || s.status.includes('Rejected');
      }
      return false;
    }).length;
  };

  const savedNotifications = notifications
    .filter(notification => {
      if (!currentUser || notification.recipient_role !== currentRole) return false;
      return !notification.recipient_user_id || notification.recipient_user_id === currentUser.id;
    });
  const savedNotificationSkbnIds = new Set(savedNotifications.map(notification => notification.skbn_id).filter(Boolean));

  const pendingTaskNotifications: NotificationItem[] = visibleSkbns
    .filter(skbn => {
      if (savedNotificationSkbnIds.has(skbn.id)) return false;
      if (currentRole === UserRole.AP2) {
        return skbn.status === SkbnStatus.DRAFT_CREATED || skbn.status === SkbnStatus.FINAL_SENT;
      }
      if (currentRole === UserRole.KEUANGAN) {
        return skbn.status === SkbnStatus.DRAFT_APPROVED_BY_AP2 || skbn.status === SkbnStatus.FINAL_APPROVED_BY_AP2;
      }
      if (currentRole === UserRole.BUYER) {
        return skbn.status === SkbnStatus.DRAFT_VERIFIED || skbn.status === SkbnStatus.FINAL_VERIFIED || skbn.status.includes('Rejected');
      }
      return false;
    })
    .map(skbn => {
      const id = `pending-${currentRole}-${skbn.id}`;
      let title = 'Update SKBDN';
      let message = `${skbn.nomor_skbn} perlu dicek.`;

      if (currentRole === UserRole.AP2) {
        title = skbn.status === SkbnStatus.FINAL_SENT ? 'Final SKBDN dari Buyer' : 'Permintaan SKBDN dari Buyer';
        message = `${skbn.buyer || 'Buyer'} mengirim ${skbn.status === SkbnStatus.FINAL_SENT ? 'final' : 'draft'} ${skbn.nomor_skbn}. Mohon review AP2.`;
      } else if (currentRole === UserRole.KEUANGAN) {
        title = 'SKBDN Menunggu Keuangan';
        message = `${skbn.nomor_skbn} sudah disetujui AP2 dan menunggu verifikasi Keuangan.`;
      } else if (skbn.status.includes('Rejected')) {
        title = 'SKBDN Ditolak';
        message = `${skbn.nomor_skbn} ditolak. Cek catatan dan dokumen tolakan.`;
      } else {
        title = 'SKBDN Disetujui';
        message = `${skbn.nomor_skbn} sudah disetujui. Silakan cek detail dokumen.`;
      }

      return {
        id,
        recipient_role: currentRole,
        recipient_user_id: currentRole === UserRole.BUYER ? currentUser?.id : undefined,
        skbn_id: skbn.id,
        title,
        message,
        created_at: skbn.created_at || skbn.tanggal,
        read_at: readPendingNotificationIds.includes(id) ? new Date().toISOString() : undefined
      };
    });

  const currentNotifications = [...savedNotifications, ...pendingTaskNotifications]
    .sort((a, b) => {
      const bTime = new Date(b.created_at).getTime();
      const aTime = new Date(a.created_at).getTime();
      return bTime - aTime;
    });
  const unreadNotificationCount = currentNotifications.filter(notification => !notification.read_at).length;

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.id.startsWith('pending-') && !notification.read_at) {
      const nextReadIds = [...new Set([...readPendingNotificationIds, notification.id])];
      setReadPendingNotificationIds(nextReadIds);
      localStorage.setItem(READ_PENDING_NOTIFICATIONS_KEY, JSON.stringify(nextReadIds));
    } else if (!notification.read_at) {
      await markNotificationRead(notification.id);
    }
    if (notification.skbn_id) {
      const target = skbns.find(skbn => skbn.id === notification.skbn_id);
      if (target) {
        setSelectedSkbn(target);
        setActiveTab('dashboard');
      }
    }
    setIsNotificationOpen(false);
  };

  const handleMarkAllNotificationsRead = async () => {
    const pendingUnreadIds = currentNotifications
      .filter(notification => notification.id.startsWith('pending-') && !notification.read_at)
      .map(notification => notification.id);
    if (pendingUnreadIds.length > 0) {
      const nextReadIds = [...new Set([...readPendingNotificationIds, ...pendingUnreadIds])];
      setReadPendingNotificationIds(nextReadIds);
      localStorage.setItem(READ_PENDING_NOTIFICATIONS_KEY, JSON.stringify(nextReadIds));
    }

    await Promise.all(
      currentNotifications
        .filter(notification => !notification.id.startsWith('pending-') && !notification.read_at)
        .map(notification => markNotificationRead(notification.id))
    );
  };

  const handleDownloadPdf = (base64Data: string, fileName: string) => {
    const blob = createPdfBlob(base64Data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'dokumen.pdf';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewPdf = (base64Data: string) => {
    const blob = createPdfBlob(base64Data);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const createPdfBlob = (base64Data: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  };

  const renderAuthForm = () => {
    const isLogin = authMode === 'login';
    const isRegister = authMode === 'register';
    const isReset = authMode === 'reset';
    const isPhone = authMode === 'phone';
    const isFormSubmitting = isPhone ? isOtpSubmitting : isAuthSubmitting;
    const submitLabel = isLogin
      ? 'Login'
      : isRegister
        ? 'Register'
        : isReset
          ? 'Kirim Link Reset Password'
          : isOtpSent
            ? 'Verifikasi OTP'
            : 'Kirim Kode OTP';
    const loadingLabel = isLogin
      ? 'Sedang login...'
      : isRegister
        ? 'Mendaftarkan akun...'
        : isReset
          ? 'Mengirim link...'
          : isOtpSent
            ? 'Memverifikasi OTP...'
            : 'Mengirim kode OTP...';

    return (
      <div className="min-h-screen bg-[#f8fafd] dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 transition-colors duration-300">
        <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-[0_18px_60px_rgba(60,64,67,0.14)]">
          <div className="pb-6 border-b border-slate-200 dark:border-slate-800 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f8fafd] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#34a853]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc04]"></span>
            </div>
            <h1 className="mt-4 font-extrabold text-3xl tracking-tight text-[#202124] dark:text-white">SKBDN</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">Digital Approval Workspace</p>
          </div>

          <form
            onSubmit={
              isPhone
                ? isOtpSent ? handleVerifyPhoneOtp : handleSendPhoneOtp
                : isLogin ? handleLogin : isRegister ? handleRegister : handleResetPassword
            }
            className="space-y-4 pt-5"
          >
            {!isPhone ? (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={authForm.username}
                    onChange={(e) => setAuthField('username', e.target.value)}
                    disabled={isFormSubmitting}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8] disabled:opacity-70"
                    placeholder="Masukkan email"
                  />
                </div>

                {!isReset && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthField('password', e.target.value)}
                  disabled={isFormSubmitting}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8] disabled:opacity-70"
                  placeholder="Masukkan password"
                />
              </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4">
                  <p className="text-xs font-bold text-[#1a73e8] dark:text-blue-300">Verifikasi Email</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Kode OTP akan dikirim ke email akun Buyer dan berlaku selama 5 menit.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Email Tujuan
                  </label>
                  <div className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold text-slate-700 dark:text-slate-200 break-all">
                    {pendingBuyer?.email || '-'}
                  </div>
                </div>

                {isOtpSent && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Kode OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={authForm.otpCode}
                      onChange={(e) => setAuthField('otpCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={isFormSubmitting}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8] disabled:opacity-70"
                      placeholder="Masukkan 6 digit kode"
                    />
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                      Kode berlaku sampai {new Date(emailOtpExpiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.
                    </p>
                  </div>
                )}
              </>
            )}

            {!isPhone && (
            <div className="flex items-center justify-between -mt-1 text-xs font-semibold">
              <button
                type="button"
                disabled={isFormSubmitting}
                onClick={() => { setAuthMode('reset'); resetAuthForm(); }}
                className={`text-slate-500 hover:text-[#1a73e8] disabled:opacity-50 disabled:cursor-not-allowed ${isReset ? 'invisible' : ''}`}
              >
                Lupa Password
              </button>
              {!isLogin && (
                <button
                  type="button"
                  disabled={isFormSubmitting}
                  onClick={() => {
                    setAuthMode('login');
                    resetAuthForm();
                  }}
                  className="text-[#1a73e8] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Login
                </button>
              )}
            </div>
            )}

            {isPhone && isOtpSent && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isOtpSubmitting}
                  onClick={() => {
                    setIsOtpSent(false);
                    setEmailOtpCode('');
                    setEmailOtpExpiresAt(0);
                    setAuthField('otpCode', '');
                    setOtpResendCooldown(0);
                  }}
                  className="text-xs font-bold text-[#1a73e8] hover:text-blue-700 disabled:opacity-60"
                >
                  Kirim kode baru
                </button>
                <button
                  type="button"
                  disabled={isOtpSubmitting || otpResendCooldown > 0}
                  onClick={handleResendPhoneOtp}
                  className="text-xs font-bold text-[#1a73e8] hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {otpResendCooldown > 0 ? `Kirim ulang (${otpResendCooldown}s)` : 'Kirim ulang kode'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isFormSubmitting}
              className="w-full py-3 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isFormSubmitting && <i className="fa-solid fa-spinner animate-spin"></i>}
              <span>{isFormSubmitting ? loadingLabel : submitLabel}</span>
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <>
        {renderAuthForm()}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-lg flex gap-3 max-w-sm animate-slide-in"
            >
              <div className="text-lg">
                {toast.type === 'success' && <i className="fa-solid fa-circle-check text-emerald-500"></i>}
                {toast.type === 'error' && <i className="fa-solid fa-circle-xmark text-rose-500"></i>}
                {toast.type === 'info' && <i className="fa-solid fa-circle-info text-blue-500"></i>}
                {toast.type === 'warning' && <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>}
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{toast.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafd] dark:bg-slate-950 transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-72 shrink-0 self-start bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between p-5 z-20">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-1 py-3 mb-7">
            <div className="min-w-0">
              <h1 className="font-extrabold text-base tracking-tight text-[#202124] dark:text-white">SKBDN</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            <button
              onClick={() => { setActiveTab('home'); setEditingSkbn(null); }}
              className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'home' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
            >
              <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity ${activeTab === 'home' ? 'bg-[#1a73e8] opacity-100' : 'opacity-0'}`}></span>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'home' ? 'bg-white text-[#1a73e8] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#1a73e8] dark:bg-slate-800'}`}>
                <i className="fa-solid fa-house text-sm"></i>
              </span>
              <span>Home</span>
            </button>

            <button
              onClick={() => { setActiveTab('dashboard'); setEditingSkbn(null); }}
              className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
            >
              <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity ${activeTab === 'dashboard' ? 'bg-[#1a73e8] opacity-100' : 'opacity-0'}`}></span>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'dashboard' ? 'bg-white text-[#1a73e8] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#1a73e8] dark:bg-slate-800'}`}>
                <i className="fa-solid fa-chart-pie text-sm"></i>
              </span>
              <span>Ringkasan</span>
            </button>

            {(currentRole === UserRole.BUYER || currentRole === UserRole.AP2) && (
              <button
                onClick={() => { setActiveTab('create'); setEditingSkbn(null); }}
                className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'create' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
              >
                <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity ${activeTab === 'create' ? 'bg-[#34a853] opacity-100' : 'opacity-0'}`}></span>
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'create' ? 'bg-white text-[#34a853] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#34a853] dark:bg-slate-800'}`}>
                  <i className="fa-solid fa-file-arrow-up text-sm"></i>
                </span>
                <span>{currentRole === UserRole.AP2 ? 'Upload untuk Buyer' : 'Unggah Dokumen'}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
            >
              <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity ${activeTab === 'history' ? 'bg-[#fbbc04] opacity-100' : 'opacity-0'}`}></span>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'history' ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-amber-600 dark:bg-slate-800'}`}>
                <i className="fa-solid fa-clock-rotate-left text-sm"></i>
              </span>
              <span>Riwayat</span>
            </button>

            {currentRole === UserRole.AP2 && (
              <>
                <button
                  onClick={() => { setActiveTab('buyer-register'); setEditingSkbn(null); }}
                  className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'buyer-register' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                >
                  <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity ${activeTab === 'buyer-register' ? 'bg-[#34a853] opacity-100' : 'opacity-0'}`}></span>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'buyer-register' ? 'bg-white text-[#34a853] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#34a853] dark:bg-slate-800'}`}>
                    <i className="fa-solid fa-user-plus text-sm"></i>
                  </span>
                  <span>Buat Buyer</span>
                </button>
                <button
                  onClick={() => { setActiveTab('buyer-list'); setEditingSkbn(null); }}
                  className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'buyer-list' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                >
                  <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity ${activeTab === 'buyer-list' ? 'bg-[#1a73e8] opacity-100' : 'opacity-0'}`}></span>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'buyer-list' ? 'bg-white text-[#1a73e8] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#1a73e8] dark:bg-slate-800'}`}>
                    <i className="fa-solid fa-users text-sm"></i>
                  </span>
                  <span>Daftar Buyer</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Account & Theme Toggle */}
        <div className="space-y-4 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-xl bg-[#f8fafd] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Masuk sebagai</label>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.nama}</span>
                <span className="text-xs font-semibold text-slate-500">{currentRole}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 shrink-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#ea4335] hover:border-red-200 flex items-center justify-center transition-all"
                title="Logout"
              >
                <i className="fa-solid fa-right-from-bracket text-xs"></i>
              </button>
            </div>
          </div>

          {/* Theme & Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-[#34a853]' : 'bg-[#fbbc04]'}`}></span>
              <span className="text-xs font-bold text-slate-500">
                {firebaseConnected ? 'Server Aktif' : 'Local Mode'}
              </span>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-8 h-8 rounded-lg bg-[#f8fafd] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </div>
      </aside>

      {isMobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setIsMobileNavOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
          ></button>

          <aside className="relative h-full w-[82vw] max-w-[340px] bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h1 className="font-extrabold text-base text-[#202124] dark:text-white truncate">SKBDN</h1>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all"
                aria-label="Tutup menu"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="mb-4">
                <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Menu</p>
              </div>

              <nav className="space-y-1.5">
                <button
                  onClick={() => { setActiveTab('home'); setEditingSkbn(null); setIsMobileNavOpen(false); }}
                  className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'home' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'home' ? 'bg-white text-[#1a73e8] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#1a73e8] dark:bg-slate-800'}`}>
                    <i className="fa-solid fa-house text-sm"></i>
                  </span>
                  <span>Home</span>
                </button>

                <button
                  onClick={() => { setActiveTab('dashboard'); setEditingSkbn(null); setIsMobileNavOpen(false); }}
                  className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'dashboard' ? 'bg-white text-[#1a73e8] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#1a73e8] dark:bg-slate-800'}`}>
                    <i className="fa-solid fa-chart-pie text-sm"></i>
                  </span>
                  <span>Ringkasan</span>
                </button>

                {(currentRole === UserRole.BUYER || currentRole === UserRole.AP2) && (
                  <button
                    onClick={() => { setActiveTab('create'); setEditingSkbn(null); setIsMobileNavOpen(false); }}
                    className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'create' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'create' ? 'bg-white text-[#34a853] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#34a853] dark:bg-slate-800'}`}>
                      <i className="fa-solid fa-file-arrow-up text-sm"></i>
                    </span>
                    <span>{currentRole === UserRole.AP2 ? 'Upload untuk Buyer' : 'Unggah Dokumen'}</span>
                  </button>
                )}

                <button
                  onClick={() => { setActiveTab('history'); setIsMobileNavOpen(false); }}
                  className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'history' ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-amber-600 dark:bg-slate-800'}`}>
                    <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                  </span>
                  <span>Riwayat</span>
                </button>

                {currentRole === UserRole.AP2 && (
                  <>
                    <button
                      onClick={() => { setActiveTab('buyer-register'); setEditingSkbn(null); setIsMobileNavOpen(false); }}
                      className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'buyer-register' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'buyer-register' ? 'bg-white text-[#34a853] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#34a853] dark:bg-slate-800'}`}>
                        <i className="fa-solid fa-user-plus text-sm"></i>
                      </span>
                      <span>Buat Buyer</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('buyer-list'); setEditingSkbn(null); setIsMobileNavOpen(false); }}
                      className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'buyer-list' ? 'bg-slate-100 text-[#202124] dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'buyer-list' ? 'bg-white text-[#1a73e8] shadow-sm dark:bg-slate-900' : 'bg-slate-50 text-slate-500 group-hover:text-[#1a73e8] dark:bg-slate-800'}`}>
                        <i className="fa-solid fa-users text-sm"></i>
                      </span>
                      <span>Daftar Buyer</span>
                    </button>
                  </>
                )}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="rounded-xl bg-[#f8fafd] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Masuk sebagai</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.nama}</p>
                    <p className="text-xs font-semibold text-slate-500">{currentRole}</p>
                  </div>
                  <button
                    onClick={() => { setIsMobileNavOpen(false); handleLogout(); }}
                    className="w-9 h-9 shrink-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#ea4335] hover:border-red-200 flex items-center justify-center transition-all"
                    title="Logout"
                  >
                    <i className="fa-solid fa-right-from-bracket text-xs"></i>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-[#34a853]' : 'bg-[#fbbc04]'}`}></span>
                  <span className="text-xs font-bold text-slate-500">{firebaseConnected ? 'Server Aktif' : 'Local Mode'}</span>
                </div>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-10 h-10 rounded-xl bg-[#f8fafd] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  aria-label="Ganti tema"
                >
                  <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col">
        
        {/* TOP NAVBAR */}
        <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm shadow-slate-200/40 dark:shadow-none">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="min-w-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl bg-[#f8fafd] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
                aria-label="Buka menu"
              >
                <i className="fa-solid fa-bars"></i>
              </button>
              <div className="lg:hidden min-w-0">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white truncate">SKBDN</h1>
              </div>
              <h2 className="hidden lg:block text-lg font-bold text-slate-800 dark:text-slate-100">
                {activeTab === 'home' && 'Home'}
                {activeTab === 'dashboard' && 'Dashboard SKBDN'}
                {activeTab === 'create' && 'Unggah Dokumen Baru'}
                {activeTab === 'buyer-register' && 'Buat Akun Buyer'}
                {activeTab === 'buyer-list' && 'Daftar Akun Buyer'}
                {activeTab === 'history' && 'Riwayat Persetujuan'}
              </h2>
            </div>

          {/* User Profile & Pending Badge */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Pending Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationOpen(prev => !prev)}
                className="w-10 h-10 rounded-lg bg-[#f8fafd] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                aria-label="Buka notifikasi"
              >
                <i className="fa-solid fa-bell"></i>
              </button>
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
              {isNotificationOpen && (
                <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)] overflow-hidden z-50">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Notifikasi</h3>
                      <p className="text-[11px] text-slate-500">{unreadNotificationCount} belum dibaca</p>
                    </div>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[11px] font-bold text-[#1a73e8] hover:text-blue-700"
                      >
                        Tandai dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {currentNotifications.length === 0 ? (
                      <div className="p-5 text-center">
                        <div className="mx-auto w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400">
                          <i className="fa-solid fa-bell-slash"></i>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-slate-500">Belum ada notifikasi.</p>
                      </div>
                    ) : (
                      currentNotifications.slice(0, 10).map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all ${notification.read_at ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/70 dark:bg-blue-950/20'}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notification.read_at ? 'bg-slate-300 dark:bg-slate-700' : 'bg-[#1a73e8]'}`}></span>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 dark:text-white">{notification.title}</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{notification.message}</p>
                              <p className="mt-2 text-[10px] font-semibold text-slate-400">
                                {new Date(notification.created_at).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-800 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[#1a73e8] dark:text-blue-300 font-bold">
                {currentUser.nama.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currentUser.nama}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{currentUser.role}</p>
              </div>
            </div>
          </div>
          </div>

        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
          {activeTab === 'home' && (
            <div className="space-y-5 lg:space-y-6">
              <section className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  <div className="p-5 sm:p-8 lg:p-10 flex flex-col justify-center">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950 px-3 py-1 text-xs font-bold text-[#1a73e8] dark:text-blue-300 mb-5">
                      <span className="w-2 h-2 rounded-full bg-[#34a853]"></span>
                      SKBDN
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#202124] dark:text-white leading-tight">
                      Kelola SKBDN dari draft sampai final dalam satu alur.
                    </h2>
                    <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-400 max-w-xl">
                      SKBDN membantu Buyer, AP2, dan Keuangan memantau dokumen, approval, revisi, serta bukti tolakan tanpa perlu berpindah-pindah file.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => { setActiveTab('dashboard'); setEditingSkbn(null); }}
                        className="px-5 py-3 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
                      >
                        Lihat Dokumen
                      </button>
                      {(currentRole === UserRole.BUYER || currentRole === UserRole.AP2) && (
                        <button
                          onClick={() => { setActiveTab('create'); setEditingSkbn(null); }}
                          className="px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                          {currentRole === UserRole.AP2 ? 'Upload untuk Buyer' : 'Unggah SKBDN'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#eef5ff] dark:bg-slate-950 p-4 sm:p-6 lg:p-8 flex items-center">
                    <img
                      src={homeImage}
                      alt="Ilustrasi workflow approval SKBDN"
                      className="w-full rounded-2xl object-cover shadow-[0_24px_70px_rgba(60,64,67,0.18)] border border-white/70 dark:border-slate-800"
                    />
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Dokumen Lebih Rapi',
                    text: 'Draft, final, file PDF, dan catatan revisi tersimpan dalam satu tempat.',
                    icon: 'fa-folder-open',
                    color: 'text-[#1a73e8] bg-blue-50 dark:bg-blue-950'
                  },
                  {
                    title: 'Approval Jelas',
                    text: 'AP2 dan Keuangan dapat memproses dokumen sesuai tahapan masing-masing.',
                    icon: 'fa-circle-check',
                    color: 'text-[#34a853] bg-green-50 dark:bg-green-950'
                  },
                  {
                    title: 'Riwayat Tercatat',
                    text: 'Setiap persetujuan, penolakan, dan lampiran tolakan mudah dilacak kembali.',
                    icon: 'fa-clock-rotate-left',
                    color: 'text-amber-600 bg-yellow-50 dark:bg-yellow-950'
                  }
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                      <i className={`fa-solid ${item.icon}`}></i>
                    </div>
                    <h3 className="font-extrabold text-[#202124] dark:text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.text}</p>
                  </div>
                ))}
              </section>

              <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#202124] dark:text-white">Alur SKBDN</h3>
                    <p className="text-sm text-slate-500 mt-1">Dari upload dokumen sampai verifikasi final.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="w-full lg:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Buka Riwayat
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-5">
                  {[
                    ['1', 'Buyer upload draft', 'Dokumen SKBDN masuk ke antrean AP2.'],
                    ['2', 'AP2 review', 'Dokumen disetujui atau dikembalikan dengan catatan.'],
                    ['3', 'Keuangan verifikasi', 'Draft atau final dicek oleh tim Keuangan.'],
                    ['4', 'Final selesai', 'Buyer dapat melihat status akhir dan riwayat lengkap.']
                  ].map(([number, title, text]) => (
                    <div key={number} className="rounded-xl bg-[#f8fafd] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                      <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-sm font-extrabold mb-3">
                        {number}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <>
              {/* Statistics */}
              {currentRole !== UserRole.BUYER && <Stats skbns={sortedVisibleSkbns} />}

              <div className="min-w-0">
                <SkbnTable
                  skbns={sortedVisibleSkbns}
                  onSelect={setSelectedSkbn}
                  selectedId={selectedSkbn?.id}
                  currentRole={currentRole}
                  onViewDetail={setDetailTarget}
                  onApproveClick={(skbn) => {
                    if (skbn.status.includes('Rejected')) {
                      setEditingSkbn(skbn);
                      setActiveTab('create');
                    } else {
                      setIsApprovalSubmitting(false);
                      setApprovalTarget(skbn);
                      setShowApprovalModal(true);
                    }
                  }}
                  onSendFinalClick={handleSendFinal}
                />
              </div>
            </>
          )}

          {activeTab === 'create' && (
            <div className="max-w-3xl mx-auto w-full space-y-4">
              {currentRole === UserRole.AP2 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <label className="flex-1 space-y-1.5">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Upload untuk Buyer</span>
                      <select
                        value={ap2UploadBuyerId}
                        onChange={(e) => setAp2UploadBuyerId(e.target.value)}
                        disabled={buyerAccounts.length === 0}
                        className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950 disabled:opacity-60"
                      >
                        {buyerAccounts.length === 0 ? (
                          <option value="">Belum ada akun Buyer</option>
                        ) : (
                          buyerAccounts.map((buyer) => (
                            <option key={buyer.id} value={buyer.id}>
                              {buyer.nama || buyer.email || buyer.id}{buyer.email ? ` - ${buyer.email}` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    {buyerAccounts.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('buyer-register')}
                        className="min-h-11 px-4 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
                      >
                        Buat Buyer
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Dokumen yang diupload AP2 akan masuk ke daftar dokumen Buyer yang dipilih.
                  </p>
                </div>
              )}
              <SkbnForm 
                onSubmit={handleSkbnSubmit}
                onCancel={() => { setActiveTab('dashboard'); setEditingSkbn(null); }}
                initialData={editingSkbn}
                buyerName={currentRole === UserRole.AP2 ? (selectedAp2UploadBuyer?.nama || selectedAp2UploadBuyer?.email || 'Buyer') : currentUser.nama}
              />
            </div>
          )}

          {activeTab === 'buyer-register' && currentRole === UserRole.AP2 && (
            <div className="max-w-3xl mx-auto w-full space-y-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-950 text-[#34a853] dark:text-green-300 flex items-center justify-center">
                      <i className="fa-solid fa-user-plus"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-[#202124] dark:text-white">Buat Akun Buyer</h3>
                      <p className="text-sm text-slate-500">Akun Buyer dibuat oleh AP2, lalu Buyer verifikasi OTP email saat login pertama.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreateBuyerAccount} className="p-5 sm:p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nama Buyer
                    </label>
                    <input
                      type="text"
                      value={buyerAccountForm.nama}
                      onChange={(e) => setBuyerAccountForm(prev => ({ ...prev, nama: e.target.value }))}
                      disabled={isBuyerAccountSubmitting}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8] disabled:opacity-70"
                      placeholder="Nama lengkap Buyer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Email Buyer
                    </label>
                    <input
                      type="email"
                      value={buyerAccountForm.email}
                      onChange={(e) => setBuyerAccountForm(prev => ({ ...prev, email: e.target.value }))}
                      disabled={isBuyerAccountSubmitting}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8] disabled:opacity-70"
                      placeholder="buyer@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Password Awal
                    </label>
                    <input
                      type="password"
                      value={buyerAccountForm.password}
                      onChange={(e) => setBuyerAccountForm(prev => ({ ...prev, password: e.target.value }))}
                      disabled={isBuyerAccountSubmitting}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8] disabled:opacity-70"
                      placeholder="Minimal 6 karakter"
                    />
                  </div>

                  <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      Setelah akun dibuat, Buyer hanya bisa masuk lewat halaman login. Saat login pertama, sistem mengirim OTP ke email Buyer dan kode berlaku 5 menit.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isBuyerAccountSubmitting}
                      className="w-full sm:w-auto px-5 py-3 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isBuyerAccountSubmitting && <i className="fa-solid fa-spinner animate-spin"></i>}
                      <span>{isBuyerAccountSubmitting ? 'Membuat akun...' : 'Buat Akun Buyer'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'buyer-list' && currentRole === UserRole.AP2 && (
            <div className="max-w-5xl mx-auto w-full">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#202124] dark:text-white">Daftar Akun Buyer</h3>
                      <p className="text-sm text-slate-500">Seluruh akun Buyer yang terdaftar di database.</p>
                    </div>
                    <span className="w-fit px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-[#1a73e8] dark:text-blue-300 text-xs font-extrabold">
                      {buyerAccounts.length} Buyer
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4">Nama</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">OTP Email</th>
                        <th className="p-4">Dibuat</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {buyerAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            Belum ada akun Buyer.
                          </td>
                        </tr>
                      ) : (
                        buyerAccounts.map((buyer) => {
                          const buyerMeta = buyer as DatabaseUser & { created_at?: string; email_otp_verified_at?: string };
                          return (
                            <tr key={buyer.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-800/30">
                              <td className="p-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {buyer.nama || '-'}
                              </td>
                              <td className="p-4 text-sm text-slate-600 dark:text-slate-400 break-all">
                                {buyer.email || buyer.username || '-'}
                              </td>
                              <td className="p-4 text-sm">
                                {buyerMeta.email_otp_verified_at ? (
                                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                                    Terverifikasi
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold">
                                    Belum OTP
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                                {buyerMeta.created_at ? new Date(buyerMeta.created_at).toLocaleString('id-ID') : '-'}
                              </td>
                              <td className="p-4 text-sm text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBuyerAccount(buyer)}
                                  disabled={Boolean(deletingBuyerId)}
                                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Hapus akun Buyer"
                                >
                                  <i className={`fa-solid ${deletingBuyerId === buyer.id ? 'fa-spinner animate-spin' : 'fa-trash'}`}></i>
                                  <span>Hapus</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-[#202124] dark:text-slate-100">Riwayat Approval SKBDN</h3>
                <p className="text-sm text-slate-500 mt-1">Satu dokumen SKBDN ditampilkan sebagai satu list. Buka untuk melihat perjalanan prosesnya.</p>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {historyDocuments.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Belum ada dokumen SKBDN.
                  </div>
                ) : (
                  historyDocuments.map(({ skbn, approvals: documentApprovals }) => {
                    const isOpen = openHistorySkbnId === skbn.id;
                    const latestApproval = documentApprovals[documentApprovals.length - 1];
                    const steps = getHistorySteps(skbn, documentApprovals);

                    return (
                      <div key={skbn.id} className="p-4 sm:p-5">
                        <button
                          type="button"
                          onClick={() => setOpenHistorySkbnId(isOpen ? '' : skbn.id)}
                          className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left"
                        >
                          <div className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">No SKBDN</span>
                            <h4 className="mt-1 text-sm sm:text-base font-extrabold text-[#202124] dark:text-white break-words">{skbn.nomor_skbn}</h4>
                            <p className="mt-1 text-xs text-slate-500 break-words">
                              {skbn.buyer || 'Buyer'} • Update terakhir {new Date(latestApproval?.approved_at || skbn.created_at || skbn.tanggal).toLocaleString('id-ID')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${skbn.status.includes('Rejected') ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : skbn.status.includes('Verified') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-50 text-[#1a73e8] dark:bg-blue-950 dark:text-blue-300'}`}>
                              {skbn.status}
                            </span>
                            <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center">
                              <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`}></i>
                            </span>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="mt-5 pl-2 sm:pl-4">
                            <div className="relative space-y-5">
                              <div className="absolute left-[10px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800"></div>
                              {steps.map((step) => (
                                <div key={step.id} className="relative flex gap-4">
                                  <span className={`relative z-10 mt-1 w-5 h-5 rounded-full border-4 bg-white dark:bg-slate-900 ${step.tone === 'green' ? 'border-emerald-400' : step.tone === 'red' ? 'border-rose-400' : step.tone === 'blue' ? 'border-[#1a73e8]' : 'border-slate-300 dark:border-slate-600'}`}></span>
                                  <div className="min-w-0 pb-1">
                                    <h5 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{step.title}</h5>
                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(step.time).toLocaleString('id-ID')}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 break-words">{step.description}</p>
                                    {step.rejectionPdfData && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleViewPdf(step.rejectionPdfData!)}
                                          className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900 transition-all"
                                        >
                                          <i className="fa-solid fa-eye mr-1"></i> Lihat File Tolakan
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadPdf(step.rejectionPdfData!, step.rejectionPdfName || 'tolakan-skbdn.pdf')}
                                          className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950 transition-all"
                                        >
                                          <i className="fa-solid fa-file-arrow-down mr-1"></i> Unduh File Tolakan
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setOpenHistorySkbnId('')}
                              className="mt-4 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Tutup
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* DETAIL MODAL */}
      {detailTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-[0_24px_70px_rgba(60,64,67,0.22)]">
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#202124] dark:text-white">Detail Lengkap SKBDN</h3>
                <p className="text-xs text-slate-500 mt-0.5 break-words">{detailTarget.nomor_skbn}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['Nomor SKBDN', detailTarget.nomor_skbn],
                  ['Tanggal', detailTarget.tanggal],
                  ['Buyer', detailTarget.buyer],
                  ['Email Buyer', detailTarget.buyer_email || '-'],
                  ['Nama File', detailTarget.vendor],
                  ['Status', detailTarget.status],
                  ['Total Harga', detailTarget.total_harga || '-'],
                  ['Nomor Kontrak', detailTarget.nomor_kontrak || '-'],
                  ['Negara Asal', detailTarget.negara_asal || '-'],
                  ['Bank', detailTarget.bank || '-'],
                  ['Date Of Issue', detailTarget.date_of_issue || '-'],
                  ['Expired Date', detailTarget.expired_date || '-']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 break-words">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenis Barang, Tonase dan Harga per Tonase</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">{detailTarget.barang_tonase_harga || '-'}</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Keterangan</span>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap">{detailTarget.keterangan || '-'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {detailTarget.pdf_data && !(detailTarget.status.includes('Final') && !detailTarget.final_pdf_data) && (
                  <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/20 p-3 space-y-3">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-500">File Draft</span>
                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 break-words">{detailTarget.pdf_name || 'draft-skbdn.pdf'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewPdf(detailTarget.pdf_data!)}
                        className="px-3 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold transition-all"
                      >
                        <i className="fa-solid fa-eye mr-1"></i> Lihat Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(detailTarget.pdf_data!, detailTarget.pdf_name || 'draft-skbdn.pdf')}
                        className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 text-[#1a73e8] dark:text-blue-300 text-xs font-bold transition-all border border-blue-100 dark:border-blue-900"
                      >
                        <i className="fa-solid fa-file-arrow-down mr-1"></i> Unduh
                      </button>
                    </div>
                  </div>
                )}

                {(detailTarget.final_pdf_data || (detailTarget.status.includes('Final') && detailTarget.pdf_data)) && (
                  <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50/70 dark:bg-violet-950/20 p-3 space-y-3">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-500">File Final</span>
                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 break-words">{detailTarget.final_pdf_name || detailTarget.pdf_name || 'final-skbdn.pdf'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewPdf(detailTarget.final_pdf_data || detailTarget.pdf_data!)}
                        className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all"
                      >
                        <i className="fa-solid fa-eye mr-1"></i> Lihat Final
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(detailTarget.final_pdf_data || detailTarget.pdf_data!, detailTarget.final_pdf_name || detailTarget.pdf_name || 'final-skbdn.pdf')}
                        className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 text-xs font-bold transition-all border border-violet-100 dark:border-violet-900"
                      >
                        <i className="fa-solid fa-file-arrow-down mr-1"></i> Unduh
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {detailTarget.status.includes('Rejected') && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/20 p-3 space-y-3">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-red-500">Alasan Penolakan</span>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">{detailTarget.rejection_reason || 'Tidak ada catatan alasan.'}</p>
                  </div>
                  {detailTarget.rejection_pdf_data && (
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(detailTarget.rejection_pdf_data!, detailTarget.rejection_pdf_name || 'rejection.pdf')}
                      className="px-3 py-2 rounded-lg bg-[#ea4335] hover:bg-red-600 text-white text-xs font-bold transition-all"
                    >
                      <i className="fa-solid fa-file-pdf mr-1"></i> Unduh PDF Tolakan
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {showApprovalModal && approvalTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-[0_24px_70px_rgba(60,64,67,0.22)] space-y-4">
            <div className="flex justify-between items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-[#202124] dark:text-slate-100">Proses Persetujuan SKBDN</h3>
              <button
                disabled={isApprovalSubmitting}
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <p className="break-words"><span className="font-semibold text-slate-500">Nomor SKBDN:</span> {approvalTarget.nomor_skbn}</p>
              <p className="break-words"><span className="font-semibold text-slate-500">Nama File:</span> {approvalTarget.vendor}</p>
              <p className="break-words"><span className="font-semibold text-slate-500">Keterangan:</span> {approvalTarget.keterangan}</p>
              
              {approvalTarget.pdf_data && (
                <div className="pt-2">
                  <button
                    onClick={() => handleDownloadPdf(approvalTarget.pdf_data!, approvalTarget.pdf_name || 'skbn.pdf')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1a73e8] dark:bg-blue-950 dark:text-blue-300 text-xs font-bold transition-all"
                  >
                    <i className="fa-solid fa-file-arrow-down"></i>
                    <span>Unduh Dokumen PDF Terlampir</span>
                  </button>
                </div>
              )}
            </div>

            {/* Rejection PDF Upload Section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Catatan Persetujuan / Alasan Penolakan <span className="text-rose-500">*</span>
              </label>
              <textarea
                placeholder="Tuliskan alasan persetujuan atau penolakan di sini..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8] outline-none transition-all text-sm"
              ></textarea>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Unggah PDF Tolakan <span className="text-rose-500">(Wajib jika menolak)</span>
                </label>
                <input
                  ref={rejectionFileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleRejectionFileChange}
                  className="hidden"
                />
                <div 
                  onClick={() => rejectionFileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all text-xs ${
                    rejectionFile 
                      ? 'border-[#34a853] bg-green-50 text-[#34a853] dark:bg-green-950/20 dark:text-green-300' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-[#1a73e8]'
                  }`}
                >
                  {rejectionFile ? (
                    <div className="flex items-center justify-center gap-2 min-w-0">
                      <i className="fa-solid fa-file-pdf text-rose-500"></i>
                      <span className="font-semibold break-all">{rejectionFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <i className="fa-solid fa-cloud-arrow-up mr-1.5"></i>
                      <span>Klik untuk mengunggah PDF Tolakan</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                disabled={isApprovalSubmitting}
                onClick={() => handleApprovalSubmit('Rejected')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#ea4335] hover:bg-red-600 text-white font-semibold text-sm shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i className={`fa-solid ${isApprovalSubmitting ? 'fa-spinner animate-spin' : 'fa-circle-xmark'}`}></i> Tolak (Reject)
              </button>
              <button
                disabled={isApprovalSubmitting}
                onClick={() => handleApprovalSubmit('Approved')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#34a853] hover:bg-green-700 text-white font-semibold text-sm shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i className={`fa-solid ${isApprovalSubmitting ? 'fa-spinner animate-spin' : 'fa-circle-check'}`}></i> Setujui (Approve)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-lg flex gap-3 w-full sm:max-w-sm animate-slide-in"
          >
            <div className="text-lg">
              {toast.type === 'success' && <i className="fa-solid fa-circle-check text-emerald-500"></i>}
              {toast.type === 'error' && <i className="fa-solid fa-circle-xmark text-rose-500"></i>}
              {toast.type === 'info' && <i className="fa-solid fa-circle-info text-blue-500"></i>}
              {toast.type === 'warning' && <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>}
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{toast.title}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default App;
