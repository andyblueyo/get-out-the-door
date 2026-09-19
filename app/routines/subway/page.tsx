import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StopPicker from '@/components/subway/StopPicker'

export default async function SubwayStopPage() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')
  const userId = claims.sub as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) redirect('/routines')

  return <StopPicker profile={profile} />
}
