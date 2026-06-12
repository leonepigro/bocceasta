'use server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function registerUser(email: string, password: string) {
  if (!email || !password) return { error: 'Email e password obbligatorie' }
  if (password.length < 6) return { error: 'Password min 6 caratteri' }

  const service = await createServiceClient()

  // Controllo se esiste già
  const { data: existingUsers } = await service.auth.admin.listUsers()
  const exists = existingUsers?.users?.some(u => u.email === email)
  if (exists) return { error: 'Email già registrata. Vai al login.' }

  // Crea utente con role=user e email confermata (no doppio opt-in)
  const { error } = await service.auth.admin.createUser({
    email,
    password,
    user_metadata: { role: 'user' },
    email_confirm: true,
  })
  if (error) return { error: error.message }

  // Login immediato con cliente standard
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) return { error: `Registrazione ok, ma login fallito: ${signInErr.message}` }

  return { success: true }
}
