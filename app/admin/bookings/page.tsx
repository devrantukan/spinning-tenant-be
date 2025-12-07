'use client'

import DataListPage from '../shared/DataListPage'
import { useLanguage } from '@/lib/LanguageContext'

export default function BookingsPage() {
  const { t } = useLanguage()
  return <DataListPage endpoint="/bookings" title={t('bookings')} />
}

