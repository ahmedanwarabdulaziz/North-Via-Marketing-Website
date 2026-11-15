// Where the phone's browser lands after reconnecting an account from the Anwarz app.
export const metadata = { title: 'Anwarz · Connection', robots: { index: false } };

export default async function ConnectDone({ searchParams }: { searchParams: Promise<{ status?: string; what?: string }> }) {
  const { status, what } = await searchParams;
  const ok = status === 'connected';
  const title = ok ? '✅ Connected' : status === 'expired' ? '⌛ This link expired' : '⚠️ Not connected';
  const text = ok
    ? `${what ? `${what} is` : 'It’s'} connected again. Go back to the Anwarz app.`
    : status === 'expired'
    ? 'Links from the app work for 15 minutes. Tap Reconnect in the app again.'
    : `${what ? `${what}: ` : ''}the sign-in didn’t finish. Go back to the app and try again.`;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#F4F5F8' }}>
      <div style={{ maxWidth: 420, background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        <h1 style={{ fontSize: 26, margin: '0 0 12px', color: ok ? '#1f7a4d' : '#274290' }}>{title}</h1>
        <p style={{ color: '#444', lineHeight: 1.5, margin: 0 }}>{text}</p>
      </div>
    </main>
  );
}
