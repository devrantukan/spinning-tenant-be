'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'en' | 'tr'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  mounted: boolean
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

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
    'password': 'Password',
    'login': 'Login',
    'signIn': 'Sign In',
    'signingIn': 'Signing in...',
    'redirecting': 'Redirecting...',
    'failedToSignIn': 'Failed to sign in',
    'role': 'Role',
    'memberships': 'Memberships',
    'addUser': 'Add User',
    'addInstructor': 'Add Instructor',
    'createNewInstructor': 'Create New Instructor',
    'createNewInstructorDescription': 'Create a new instructor account. An invitation email will be sent to the provided email address so they can set up their password and access the system.',
    'createAndSendInvite': 'Create & Send Invite',
    'emailPlaceholder': 'instructor@example.com',
    'fullNamePlaceholder': 'Full Name',
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
    'socialMediaLinks': 'Social Media Links',
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
    'failedToFetchOrganization': 'Failed to fetch organization',
    'failedToUpdateOrganization': 'Failed to update organization',
    'organizationUpdatedSuccessfully': 'Organization updated successfully',
    // SMTP Configuration
    'smtpConfiguration': 'SMTP Configuration',
    'smtpConfigurationDescription': 'Configure SMTP settings for sending password reset emails. If not configured, environment variables will be used as fallback.',
    'smtpHost': 'SMTP Host',
    'smtpPort': 'SMTP Port',
    'smtpUser': 'SMTP User',
    'smtpPassword': 'SMTP Password',
    'smtpFromEmail': 'From Email',
    'smtpFromName': 'From Name',
    'leaveBlankToKeepCurrent': 'Leave blank to keep current password',
    'language': 'Language',
    'emailLanguage': 'Email Language',
    'languageDescription': 'Select the language for sending emails to users (password reset, invitations, etc.).',
    'english': 'English',
    'turkish': 'Turkish',
    // Invitation
    'acceptInvitation': 'Accept Invitation',
    'setPasswordDescription': 'Please set a password to complete your account setup.',
    'waitingForInvitation': 'Processing invitation link...',
    'passwordSetSuccess': 'Password Set Successfully!',
    'redirectingToLogin': 'Redirecting to login...',
    'setting': 'Setting...',
    'setPassword': 'Set Password',
    'newPassword': 'New Password',
    'confirmPassword': 'Confirm Password',
    
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
    
    // Members
    'newMember': 'New Member',
    'createNewMember': 'Create New Member',
    'editMember': 'Edit Member',
    'createMember': 'Create Member',
    'noMembersFound': 'No members found',
    'membershipType': 'Membership Type',
    'membershipTypePlaceholder': 'e.g., Premium, Basic, Monthly',
    'selectUser': 'Select User',
    'noAvailableUsers': 'No available users. All users are already members.',
    'user': 'User',
    'confirmDelete': 'Are you sure you want to delete this member? This action cannot be undone.',
    'createNewUser': 'Create New User',
    'isRequired': 'is required',
    'memberCreatedSuccessfully': 'Member created successfully',
    'memberUpdatedSuccessfully': 'Member updated successfully',
    'memberDeletedSuccessfully': 'Member deleted successfully',
    'creditBalance': 'Credit Balance',
    'resetPasswordConfirm': 'Are you sure you want to reset the password for {email}?',
    'resetPasswordNote': 'A password reset email will be sent to this user.',
    'resendInvitationConfirm': 'Are you sure you want to resend the invitation email to {email}?',
    'resendInvitationNote': 'A new invitation email will be sent to this user.',
    'resendInvitation': 'Resend Invitation',
    'deleteMember': 'Delete Member',
    'deleteInstructor': 'Delete Instructor',
    'deleteWarning': 'This action cannot be undone.',
    'resetLinkCopied': 'Link copied to clipboard',
    'resetLink': 'Reset Link',
    'resetLinkNote': 'Note: This link is for development/testing purposes only.',
    'creditTransactionHistory': 'Credit Transaction History',
    'viewHistory': 'History',
    'noTransactions': 'No transactions found',
    'date': 'Date',
    'type': 'Type',
    'amount': 'Amount',
    'balanceBefore': 'Balance Before',
    'balanceAfter': 'Balance After',
    'performedBy': 'Performed By',
    'adjustCreditBalance': 'Adjust Credit Balance',
    'creditChange': 'Credit Change',
    'positiveToAdd': 'Positive to add',
    'negativeToDeduct': 'Negative to deduct',
    'currentBalance': 'Current Balance',
    'newBalance': 'New Balance',
    'transactionDescriptionPlaceholder': 'e.g., Payment received, Refund, Adjustment',
    'description': 'Description',
    'duration': 'Duration',
    'resetPasswordConfirm': '{email} için şifre sıfırlamak istediğinizden emin misiniz?',
    'resetPasswordNote': 'Bu kullanıcıya bir şifre sıfırlama e-postası gönderilecek.',
    'resendInvitationConfirm': '{email} adresine davet e-postasını yeniden göndermek istediğinizden emin misiniz?',
    'resendInvitationNote': 'Bu kullanıcıya yeni bir davet e-postası gönderilecek.',
    'resendInvitation': 'Daveti Yeniden Gönder',
    'deleteMember': 'Üyeyi Sil',
    'deleteInstructor': 'Eğitmeni Sil',
    'deleteWarning': 'Bu işlem geri alınamaz.',
    'resetLinkCopied': 'Bağlantı panoya kopyalandı',
    'resetLink': 'Sıfırlama Bağlantısı',
    'resetLinkNote': 'Not: Bu bağlantı yalnızca geliştirme/test amaçlıdır.',
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
    
    // Pricing
    'pricing': 'Pricing',
    'creditPrice': 'Credit Price',
    'currency': 'Currency',
    'priceChangeReason': 'Price Change Reason',
    'priceChangeReasonPlaceholder': 'e.g., Seasonal adjustment, Market rate change',
    'viewPriceHistory': 'View Price History',
    'hidePriceHistory': 'Hide Price History',
    'priceHistory': 'Price History',
    'noPriceHistory': 'No price history available.',
    'creditPriceBefore': 'Credit Price Before',
    'creditPriceAfter': 'Credit Price After',
    'currencyBefore': 'Currency Before',
    'currencyAfter': 'Currency After',
    'changedBy': 'Changed By',
    'changedOn': 'Changed On',
    'effectiveFrom': 'Effective From',
    'effectiveUntil': 'Effective Until',
    'pricePeriodStart': 'Price Period Start',
    'pricePeriodEnd': 'Price Period End',
    'indefinite': 'Indefinite',
    'reason': 'Reason',
  },
  tr: {
    // Common
    'loading': 'yükleniyor...',
    'emailLanguage': 'E-posta Dili',
    'languageDescription': 'Kullanıcılara gönderilecek e-postalar için dili seçin (şifre sıfırlama, davetiyeler vb.).',
    'english': 'İngilizce',
    'turkish': 'Türkçe',
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
    'password': 'Şifre',
    'login': 'Giriş',
    'signIn': 'Giriş Yap',
    'signingIn': 'Giriş yapılıyor...',
    'redirecting': 'Yönlendiriliyor...',
    'failedToSignIn': 'Giriş başarısız',
    'role': 'Rol',
    'memberships': 'Üyelikler',
    'addUser': 'Kullanıcı Ekle',
    'addInstructor': 'Eğitmen Ekle',
    'createNewInstructor': 'Yeni Eğitmen Oluştur',
    'createNewInstructorDescription': 'Yeni bir eğitmen hesabı oluşturun. Sağlanan e-posta adresine davet e-postası gönderilecek, böylece şifrelerini ayarlayıp sisteme erişebilirler.',
    'createAndSendInvite': 'Oluştur ve Davetiye Gönder',
    'emailPlaceholder': 'egitmen@ornek.com',
    'fullNamePlaceholder': 'Ad Soyad',
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
    'socialMediaLinks': 'Sosyal Medya Bağlantıları',
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
    // SMTP Configuration
    'smtpConfiguration': 'SMTP Yapılandırması',
    'smtpConfigurationDescription': 'Şifre sıfırlama e-postalarını göndermek için SMTP ayarlarını yapılandırın. Yapılandırılmazsa, ortam değişkenleri yedek olarak kullanılacaktır.',
    'smtpHost': 'SMTP Sunucusu',
    'smtpPort': 'SMTP Port',
    'smtpUser': 'SMTP Kullanıcı',
    'smtpPassword': 'SMTP Şifre',
    'smtpFromEmail': 'Gönderen E-posta',
    'smtpFromName': 'Gönderen İsim',
    'leaveBlankToKeepCurrent': 'Mevcut şifreyi korumak için boş bırakın',
    'language': 'Dil',
    // Invitation
    'acceptInvitation': 'Daveti Kabul Et',
    'setPasswordDescription': 'Hesap kurulumunuzu tamamlamak için lütfen bir şifre belirleyin.',
    'waitingForInvitation': 'Davet bağlantısı işleniyor...',
    'passwordSetSuccess': 'Şifre Başarıyla Ayarlandı!',
    'redirectingToLogin': 'Giriş sayfasına yönlendiriliyor...',
    'setting': 'Ayarlandı...',
    'setPassword': 'Şifre Belirle',
    'newPassword': 'Yeni Şifre',
    'confirmPassword': 'Şifreyi Onayla',
    'failedToFetchOrganization': 'Organizasyon bilgisi alınamadı',
    'failedToUpdateOrganization': 'Organizasyon güncellenemedi',
    'organizationUpdatedSuccessfully': 'Organizasyon başarıyla güncellendi',
    
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
    
    // Members
    'newMember': 'Yeni Üye',
    'createNewMember': 'Yeni Üye Oluştur',
    'editMember': 'Üyeyi Düzenle',
    'createMember': 'Üye Oluştur',
    'noMembersFound': 'Üye bulunamadı',
    'membershipType': 'Üyelik Türü',
    'membershipTypePlaceholder': 'örn: Premium, Temel, Aylık',
    'selectUser': 'Kullanıcı Seç',
    'noAvailableUsers': 'Mevcut kullanıcı yok. Tüm kullanıcılar zaten üye.',
    'user': 'Kullanıcı',
    'confirmDelete': 'Bu üyeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    'createNewUser': 'Yeni Kullanıcı Oluştur',
    'isRequired': 'zorunludur',
    'memberCreatedSuccessfully': 'Üye başarıyla oluşturuldu',
    'memberUpdatedSuccessfully': 'Üye başarıyla güncellendi',
    'memberDeletedSuccessfully': 'Üye başarıyla silindi',
    'creditBalance': 'Kredi Bakiyesi',
    'creditTransactionHistory': 'Kredi İşlem Geçmişi',
    'viewHistory': 'Geçmiş',
    'noTransactions': 'İşlem bulunamadı',
    'date': 'Tarih',
    'type': 'Tür',
    'amount': 'Tutar',
    'balanceBefore': 'Önceki Bakiye',
    'balanceAfter': 'Sonraki Bakiye',
    'performedBy': 'İşlemi Yapan',
    'adjustCreditBalance': 'Kredi Bakiyesini Ayarla',
    'creditChange': 'Kredi Değişikliği',
    'positiveToAdd': 'Pozitif ekle',
    'negativeToDeduct': 'Negatif çıkar',
    'currentBalance': 'Mevcut Bakiye',
    'newBalance': 'Yeni Bakiye',
    'transactionDescriptionPlaceholder': 'örn: Ödeme alındı, İade, Düzeltme',
    'description': 'Açıklama',
    
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
    
    // Pricing
    'pricing': 'Fiyatlandırma',
    'creditPrice': 'Kredi Fiyatı',
    'currency': 'Para Birimi',
    'priceChangeReason': 'Fiyat Değişiklik Nedeni',
    'priceChangeReasonPlaceholder': 'örn: Mevsimsel ayarlama, Piyasa fiyatı değişikliği',
    'viewPriceHistory': 'Fiyat Geçmişini Görüntüle',
    'hidePriceHistory': 'Fiyat Geçmişini Gizle',
    'priceHistory': 'Fiyat Geçmişi',
    'noPriceHistory': 'Fiyat geçmişi bulunmamaktadır.',
    'creditPriceBefore': 'Önceki Kredi Fiyatı',
    'creditPriceAfter': 'Sonraki Kredi Fiyatı',
    'currencyBefore': 'Önceki Para Birimi',
    'currencyAfter': 'Sonraki Para Birimi',
    'changedBy': 'Değiştiren',
    'changedOn': 'Değiştirilme Tarihi',
    'effectiveFrom': 'Geçerlilik Başlangıcı',
    'effectiveUntil': 'Geçerlilik Bitişi',
    'pricePeriodStart': 'Fiyat Dönemi Başlangıcı',
    'pricePeriodEnd': 'Fiyat Dönemi Bitişi',
    'indefinite': 'Belirsiz',
    'reason': 'Neden',
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
