'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'en' | 'tr'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  mounted: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'loading': 'Loading...',
    'error': 'Error',
    'refresh': 'Refresh',
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'logout': 'Logout',
    'home': 'Home',
    'actions': 'Actions',
    'created': 'Created',
    'noData': 'No data found',
    
    // Header
    'adminDashboard': 'Admin Dashboard',
    'instructorDashboard': 'Instructor Dashboard',
    
    // Navigation
    'organization': 'Organization',
    'classes': 'Classes',
    'sessions': 'Sessions',
    'bookings': 'Bookings',
    'members': 'Members',
    'instructors': 'Instructors',
    'users': 'Users',
    
    // Users
    'name': 'Name',
    'email': 'Email',
    'role': 'Role',
    'memberships': 'Memberships',
    'addUser': 'Add User',
    'createNewInstructor': 'Create New Instructor',
    'createAndSendInvite': 'Create & Send Invite',
    'noName': 'No name',
    'noUsersFound': 'No users found',
    'invitationStatus': 'Invitation Status',
    'checking': 'Checking...',
    'confirmed': 'Confirmed',
    'pending': 'Pending',
    'unknown': 'Unknown',
    'resendInvitation': 'Resend Invitation',
    'sending': 'Sending...',
    'resendInvitationConfirm': 'Resend invitation email to {email}?',
    'invitationSent': 'Invitation sent successfully!',
    'resetPassword': 'Reset Password',
    'resetting': 'Sending...',
    'resetPasswordConfirm': 'Send password reset email to {email}?',
    'passwordResetSent': 'Password reset email sent successfully!',
    'resetLink': 'Reset Link',
    'resetLinkCopied': 'Reset link copied to clipboard!',
    'resetLinkNote': '(Link has been copied to clipboard. Share it with the user if email is not received)',
    
    // Instructors
    'status': 'Status',
    'bio': 'Bio',
    'specialties': 'Specialties',
    'noBio': 'No bio',
    'none': 'None',
    'noInstructorsFound': 'No instructors found',
    'active': 'Active',
    'inactive': 'Inactive',
    'editInstructor': 'Edit Instructor',
    'saving': 'Saving...',
    'deleting': 'Deleting...',
    'deleteConfirm': 'Are you sure you want to delete this instructor? This action cannot be undone.',
    'specialtiesPlaceholder': 'Cycling, Yoga, Pilates',
    'specialtiesCommaSeparated': 'Specialties (comma-separated)',
    'instructorBioPlaceholder': 'Instructor bio...',
    'bookings': 'Bookings',
    
    // Instructor Dashboard
    'welcome': 'Welcome',
    'instructorInformation': 'Instructor Information',
    'noAdditionalInfo': 'No additional information available.',
    
    // Theme
    'dark': 'Dark',
    'light': 'Light',
    
    // Organization
    'editOrganization': 'Edit Organization',
    'basicInformation': 'Basic Information',
    'contactInformation': 'Contact Information',
    'socialMedia': 'Social Media',
    'statistics': 'Statistics',
    'slug': 'Slug',
    'description': 'Description',
    'phone': 'Phone',
    'address': 'Address',
    'website': 'Website',
    'facebook': 'Facebook',
    'twitter': 'Twitter',
    'instagram': 'Instagram',
    'linkedin': 'LinkedIn',
    'tiktok': 'TikTok',
    'latitude': 'Latitude',
    'longitude': 'Longitude',
    'location': 'Location',
    'role': 'Role',
    'failedToFetchOrganization': 'Failed to fetch organization',
    'failedToUpdateOrganization': 'Failed to update organization',
    
    // Data List
    'found': 'Found',
    'noDataAvailable': 'No data available',
    'foundItems': 'Found {count} {item}',
    
    // Classes
    'newClass': 'New Class',
    'createNewClass': 'Create New Class',
    'editClass': 'Edit Class',
    'createClass': 'Create Class',
    'allClasses': 'All Classes',
    'noClassesFound': 'No classes found',
    'duration': 'Duration',
    'minutes': 'minutes',
    'capacity': 'Capacity',
    'maxCapacity': 'Max Capacity',
    'instructor': 'Instructor',
    'optional': 'optional',
    'selectInstructor': 'Select Instructor',
    'archived': 'Archived',
    
    // Sessions
    'newSession': 'New Session',
    'createNewSession': 'Create New Session',
    'editSession': 'Edit Session',
    'createSession': 'Create Session',
    'allSessions': 'All Sessions',
    'noSessionsFound': 'No sessions found',
    'class': 'Class',
    'startTime': 'Start Time',
    'endTime': 'End Time',
    'currentBookings': 'Current Bookings',
    'scheduled': 'Scheduled',
    'inProgress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'selectClass': 'Select Class',
  },
  tr: {
    // Common
    'loading': 'yükleniyor...',
    'error': 'Hata',
    'refresh': 'Yenile',
    'save': 'Kaydet',
    'cancel': 'İptal',
    'delete': 'Sil',
    'edit': 'Düzenle',
    'logout': 'Çıkış',
    'home': 'Ana Sayfa',
    'actions': 'İşlemler',
    'created': 'Oluşturulma',
    'noData': 'Veri bulunamadı',
    
    // Header
    'adminDashboard': 'Yönetici Paneli',
    'instructorDashboard': 'Eğitmen Paneli',
    
    // Navigation
    'organization': 'Organizasyon',
    'classes': 'Sınıflar',
    'sessions': 'Oturumlar',
    'bookings': 'Rezervasyonlar',
    'members': 'Üyeler',
    'instructors': 'Eğitmenler',
    'users': 'Kullanıcılar',
    
    // Users
    'name': 'İsim',
    'email': 'E-posta',
    'role': 'Rol',
    'memberships': 'Üyelikler',
    'addUser': 'Kullanıcı Ekle',
    'createNewInstructor': 'Yeni Eğitmen Oluştur',
    'createAndSendInvite': 'Oluştur ve Davetiye Gönder',
    'noName': 'İsim yok',
    'noUsersFound': 'Kullanıcı bulunamadı',
    'invitationStatus': 'Davet Durumu',
    'checking': 'Kontrol ediliyor...',
    'confirmed': 'Onaylandı',
    'pending': 'Beklemede',
    'unknown': 'Bilinmiyor',
    'resendInvitation': 'Davetiye Yeniden Gönder',
    'sending': 'Gönderiliyor...',
    'resendInvitationConfirm': '{email} adresine davetiye e-postasını yeniden gönder?',
    'invitationSent': 'Davetiye başarıyla gönderildi!',
    'resetPassword': 'Şifre Sıfırla',
    'resetting': 'Gönderiliyor...',
    'resetPasswordConfirm': '{email} adresine şifre sıfırlama e-postası gönder?',
    'passwordResetSent': 'Şifre sıfırlama e-postası başarıyla gönderildi!',
    'resetLink': 'Sıfırlama Bağlantısı',
    'resetLinkCopied': 'Sıfırlama bağlantısı panoya kopyalandı!',
    'resetLinkNote': '(Bağlantı panoya kopyalandı. E-posta alınmadıysa kullanıcıyla paylaşın)',
    
    // Instructors
    'status': 'Durum',
    'bio': 'Biyografi',
    'specialties': 'Uzmanlık Alanları',
    'noBio': 'Biyografi yok',
    'none': 'Yok',
    'noInstructorsFound': 'Eğitmen bulunamadı',
    'active': 'Aktif',
    'inactive': 'Pasif',
    'editInstructor': 'Eğitmeni Düzenle',
    'saving': 'Kaydediliyor...',
    'deleting': 'Siliniyor...',
    'deleteConfirm': 'Bu eğitmeni silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    'specialtiesPlaceholder': 'Bisiklet, Yoga, Pilates',
    'specialtiesCommaSeparated': 'Uzmanlık Alanları (virgülle ayrılmış)',
    'instructorBioPlaceholder': 'Eğitmen biyografisi...',
    'bookings': 'Rezervasyonlar',
    
    // Instructor Dashboard
    'welcome': 'Hoş geldiniz',
    'instructorInformation': 'Eğitmen Bilgileri',
    'noAdditionalInfo': 'Ek bilgi mevcut değil.',
    
    // Theme
    'dark': 'Karanlık',
    'light': 'Aydınlık',
    
    // Organization
    'editOrganization': 'Organizasyonu Düzenle',
    'basicInformation': 'Temel Bilgiler',
    'contactInformation': 'İletişim Bilgileri',
    'socialMedia': 'Sosyal Medya',
    'statistics': 'İstatistikler',
    'slug': 'Kısa Ad',
    'description': 'Açıklama',
    'phone': 'Telefon',
    'address': 'Adres',
    'website': 'Web Sitesi',
    'facebook': 'Facebook',
    'twitter': 'Twitter',
    'instagram': 'Instagram',
    'linkedin': 'LinkedIn',
    'tiktok': 'TikTok',
    'latitude': 'Enlem',
    'longitude': 'Boylam',
    'location': 'Konum',
    'role': 'Rol',
    'failedToFetchOrganization': 'Organizasyon bilgisi alınamadı',
    'failedToUpdateOrganization': 'Organizasyon güncellenemedi',
    
    // Data List
    'found': 'Bulundu',
    'noDataAvailable': 'Veri mevcut değil',
    'foundItems': '{count} {item} bulundu',
    
    // Classes
    'newClass': 'Yeni Sınıf',
    'createNewClass': 'Yeni Sınıf Oluştur',
    'editClass': 'Sınıfı Düzenle',
    'createClass': 'Sınıf Oluştur',
    'allClasses': 'Tüm Sınıflar',
    'noClassesFound': 'Sınıf bulunamadı',
    'duration': 'Süre',
    'minutes': 'dakika',
    'capacity': 'Kapasite',
    'maxCapacity': 'Maksimum Kapasite',
    'instructor': 'Eğitmen',
    'optional': 'isteğe bağlı',
    'selectInstructor': 'Eğitmen Seç',
    'archived': 'Arşivlendi',
    
    // Sessions
    'newSession': 'Yeni Oturum',
    'createNewSession': 'Yeni Oturum Oluştur',
    'editSession': 'Oturumu Düzenle',
    'createSession': 'Oturum Oluştur',
    'allSessions': 'Tüm Oturumlar',
    'noSessionsFound': 'Oturum bulunamadı',
    'class': 'Sınıf',
    'startTime': 'Başlangıç Zamanı',
    'endTime': 'Bitiş Zamanı',
    'currentBookings': 'Mevcut Rezervasyonlar',
    'scheduled': 'Planlandı',
    'inProgress': 'Devam Ediyor',
    'completed': 'Tamamlandı',
    'cancelled': 'İptal Edildi',
    'selectClass': 'Sınıf Seç',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get language from localStorage or default to English
    const savedLanguage = localStorage.getItem('language') as Language | null
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'tr')) {
      setLanguageState(savedLanguage)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    // Save to localStorage
    localStorage.setItem('language', language)
    
    // Dispatch custom event so components can listen
    window.dispatchEvent(new CustomEvent('language-change', { detail: language }))
  }, [language, mounted])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  const t = (key: string): string => {
    return translations[language]?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
