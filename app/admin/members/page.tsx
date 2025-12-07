'use client'

import DataListPage from '../shared/DataListPage'
import { useLanguage } from '@/lib/LanguageContext'

export default function MembersPage() {
  const { t } = useLanguage()
  return <DataListPage endpoint="/members" title={t('members')} />
}

