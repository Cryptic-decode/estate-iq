import { SITE_URL } from '@/lib/site'

const siteHost = new URL(SITE_URL).hostname

export function EstateIQSocialCard() {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#f4f1e8',
        color: '#123a32',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '68%',
          padding: '64px 66px 58px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="58" height="58" viewBox="0 0 58 58" fill="none">
            <path d="M10 51V14L29 5l19 9v37" stroke="#123a32" strokeWidth="4" strokeLinejoin="round" />
            <path d="M18 51V20l11-5 11 5v31M29 15v28M7 51h44" stroke="#123a32" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="40" cy="20" r="4" fill="#b48a4a" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 38, fontWeight: 700, letterSpacing: '-1.5px' }}>
            Estate<span style={{ color: '#9a743b' }}>IQ</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              marginBottom: 24,
              color: '#8b6a35',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '3px',
            }}
          >
            RENT OPERATIONS, CLEARLY MANAGED
          </div>
          <div style={{ display: 'flex', maxWidth: 690, fontSize: 63, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-3px' }}>
            See the whole portfolio. Act on what matters.
          </div>
          <div style={{ display: 'flex', maxWidth: 650, marginTop: 24, color: '#526059', fontSize: 24, lineHeight: 1.42 }}>
            Property records, rent, payments, reminders and reporting in one dependable workspace.
          </div>
        </div>

        <div style={{ display: 'flex', color: '#66736c', fontSize: 18 }}>
          {siteHost}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '32%',
          padding: '64px 50px 58px',
          background: '#123a32',
          color: '#f4f1e8',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', color: '#d0a35b', fontSize: 18, letterSpacing: '3px' }}>
          ESTATEIQ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(244,241,232,0.35)' }}>
          {['Portfolio', 'Collections', 'Reporting'].map((label, index) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '25px 0',
                borderBottom: '1px solid rgba(244,241,232,0.35)',
                fontSize: 23,
              }}
            >
              <span>{label}</span>
              <span style={{ color: '#d0a35b', fontSize: 18 }}>0{index + 1}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', color: '#c5d0cb', fontSize: 17, lineHeight: 1.45 }}>
          <span>Know what is due.</span>
          <span>Move with clarity.</span>
        </div>
      </div>
    </div>
  )
}
