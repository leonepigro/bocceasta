import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RegisterForm } from './_components/RegisterForm'
import Image from 'next/image'
import Link from 'next/link'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-2">
          <Image src="/fc-boccea-logo_ufficiale.png" alt="FC Boccea" width={64} height={64}
            className="mx-auto rounded-full bg-white p-1 shadow" />
          <h1 className="font-black text-xl" style={{ color: 'var(--boccea-red)' }}>FC Boccea</h1>
          <p className="text-sm text-gray-500">Registra il tuo account partecipante</p>
        </div>
        <RegisterForm />
        <p className="text-center text-xs text-gray-500">
          Già registrato? <Link href="/login" className="text-blue-600 underline">Vai al login</Link>
        </p>
        <p className="text-center text-[11px] text-gray-400">
          Dopo la registrazione l&apos;admin ti assocerà a una squadra.
        </p>
      </div>
    </div>
  )
}
