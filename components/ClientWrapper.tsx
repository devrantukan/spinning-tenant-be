'use client'

import DynamicTitle from './DynamicTitle'

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DynamicTitle />
      {children}
    </>
  )
}


