import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Builder from '@/components/builder/Builder'
import './builder.css'

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login')

  // RLS scopes this to the signed-in user; someone else's id comes back empty.
  const { data: routine } = await supabase
    .from('routines')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!routine) notFound()

  return <Builder routine={routine} />
}
