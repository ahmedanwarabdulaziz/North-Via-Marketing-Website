import React from 'react';
import type { AdsReportData } from '@/lib/ads-report';
import { calculateAdsChange, formatAdsDateRange } from '@/lib/ads-report';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface ClientAdsReportTemplateProps {
  data: AdsReportData;
  clientName: string;
  searchTerms: any[];
  devices: any[];
  ads: any[];
}

const TrendBadge = ({ current, previous }: { current: number; previous: number | null | undefined }) => {
  if (previous === null || previous === undefined) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>N/A</span>;
  const change = calculateAdsChange(current, previous);
  if (change.percentage === null || change.direction === 'flat') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>
        <Minus size={12} />
        0%
      </div>
    );
  }
  
  const isPositive = change.direction === 'up';
  const color = isPositive ? '#16a34a' : '#dc2626';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color, fontSize: '12px', fontWeight: 'bold' }}>
      {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(change.percentage).toFixed(1)}%
    </div>
  );
};

const PageWrapper = ({ children, pageNumber, totalPages }: { children: React.ReactNode, pageNumber: number, totalPages: number }) => (
  <div 
    className="pdf-page"
    style={{
      width: '794px',
      height: '1123px', // Exactly A4
      backgroundColor: '#ffffff',
      position: 'relative',
      color: '#1e293b',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      pageBreakAfter: 'always',
    }}
  >
    {/* Page Content */}
    <div style={{ flex: 1, padding: '60px', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>

    {/* Footer */}
    <div style={{ 
      position: 'absolute', 
      bottom: '30px', 
      left: '60px', 
      right: '60px', 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid #e2e8f0',
      paddingTop: '20px',
      fontSize: '11px',
      color: '#94a3b8'
    }}>
      <div>Generated automatically by North via Marketing.</div>
      <div>Page {pageNumber} of {totalPages}</div>
    </div>
  </div>
);

export const ClientAdsReportTemplate = React.forwardRef<HTMLDivElement, ClientAdsReportTemplateProps>(({ data, clientName, searchTerms, devices, ads }, ref) => {
  const current = data.current;
  const previous = data.previous;
  const lastYear = data.lastYear;

  const currentCpl = current.conversions > 0 ? current.cost / current.conversions : 0;
  const previousCpl = previous.conversions > 0 ? previous.cost / previous.conversions : 0;
  const lastYearCpl = lastYear && lastYear.conversions > 0 ? lastYear.cost / lastYear.conversions : 0;
  
  const hasConversions = current.conversions > 0 || (previous && previous.conversions > 0) || (lastYear && lastYear.conversions > 0);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
      
      {/* PAGE 1: COVER PAGE */}
      <div 
        className="pdf-page"
        style={{
          width: '794px',
          height: '1123px',
          backgroundColor: '#1e293b', // Dark cover
          position: 'relative',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          pageBreakAfter: 'always',
        }}
      >
        <div style={{ position: 'absolute', top: '60px', right: '60px' }}>
          <img src="/Logo-1.png" alt="NVM Logo" style={{ width: '120px', height: '120px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#f8fafc', letterSpacing: '-1px' }}>
            Marketing Performance Report
          </h1>
          <div style={{ width: '60px', height: '4px', backgroundColor: '#3b82f6', margin: '0 auto 30px auto' }}></div>
          <h2 style={{ fontSize: '28px', color: '#94a3b8', margin: '0 0 40px 0', fontWeight: 'normal' }}>
            {clientName}
          </h2>
          
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '24px 40px', borderRadius: '12px', display: 'inline-block' }}>
            <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>
              Reporting Period
            </div>
            <div style={{ fontSize: '20px', color: '#f8fafc', fontWeight: '500' }}>
              {formatAdsDateRange(data.window.currentStart, data.window.currentEnd)}
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '60px', left: '60px', right: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            <strong>Prepared by:</strong><br />
            Ahmed Anwar<br />
            North via Marketing
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'right' }}>
            CONFIDENTIAL<br />
            DO NOT DISTRIBUTE
          </div>
        </div>
      </div>

      {/* PAGE 2: EXECUTIVE SUMMARY (With Dual Comparisons) */}
      <PageWrapper pageNumber={2} totalPages={7}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Executive Summary</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>High-level performance against previous period and last year.</p>
          </div>
          <img src="/Logo-1.png" alt="NVM Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {/* Investment */}
          <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Total Investment</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>${current.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          {hasConversions ? (
            <>
              {/* Leads */}
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>New Leads / Actions</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>{current.conversions.toLocaleString()}</div>
              </div>

              {/* CPL */}
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Cost Per Lead</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>${currentCpl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              {/* Visitors */}
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Website Visitors</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>{current.clicks.toLocaleString()}</div>
              </div>
            </>
          ) : (
            <>
              {/* Visitors */}
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Website Visitors</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>{current.clicks.toLocaleString()}</div>
              </div>

              {/* CPC */}
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Cost Per Click</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>${current.averageCpc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              {/* Impressions */}
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Times Ad Was Seen</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>{current.impressions.toLocaleString()}</div>
              </div>
            </>
          )}
        </div>
      </PageWrapper>

      
      {/* PAGE 3: PERFORMANCE GROWTH & TRENDS */}
      <PageWrapper pageNumber={3} totalPages={7}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Growth & Trends</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>An in-depth look at how your account is evolving.</p>
          </div>
          <img src="/Logo-1.png" alt="NVM Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>

        <div style={{ marginBottom: '50px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>Short-Term Trend (vs. Previous Period)</h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
            We compare your recent performance against the previous period to ensure our optimizations are moving the needle. A green arrow indicates positive momentum (e.g., lower costs, more traffic, or more leads).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Investment</div>
              <div style={{ transform: 'scale(1.2)', transformOrigin: 'right center' }}><TrendBadge current={current.cost} previous={previous.cost} /></div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{hasConversions ? 'Leads' : 'Visitors'}</div>
              <div style={{ transform: 'scale(1.2)', transformOrigin: 'right center' }}><TrendBadge current={hasConversions ? current.conversions : current.clicks} previous={hasConversions ? previous.conversions : previous.clicks} /></div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{hasConversions ? 'Cost Per Lead' : 'Cost Per Click'}</div>
              <div style={{ transform: 'scale(1.2)', transformOrigin: 'right center' }}><TrendBadge current={hasConversions ? currentCpl : current.averageCpc} previous={hasConversions ? previousCpl : previous.averageCpc} /></div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>Long-Term Growth (Year-Over-Year)</h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
            Year-over-Year comparisons help us account for seasonal changes in your industry. By looking at the exact same period last year, we can measure your true long-term business growth.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Investment</div>
              <div style={{ transform: 'scale(1.2)', transformOrigin: 'right center' }}><TrendBadge current={current.cost} previous={lastYear?.cost} /></div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{hasConversions ? 'Leads' : 'Visitors'}</div>
              <div style={{ transform: 'scale(1.2)', transformOrigin: 'right center' }}><TrendBadge current={hasConversions ? current.conversions : current.clicks} previous={lastYear ? (hasConversions ? lastYear.conversions : lastYear.clicks) : null} /></div>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{hasConversions ? 'Cost Per Lead' : 'Cost Per Click'}</div>
              <div style={{ transform: 'scale(1.2)', transformOrigin: 'right center' }}><TrendBadge current={hasConversions ? currentCpl : current.averageCpc} previous={lastYear ? (hasConversions ? lastYearCpl : lastYear.averageCpc) : null} /></div>
            </div>
          </div>
        </div>
      </PageWrapper>

{/* PAGE 4: CAMPAIGNS */}
      <PageWrapper pageNumber={4} totalPages={7}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Campaign Breakdown</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Where your budget was allocated.</p>
          </div>
          <img src="/Logo-1.png" alt="NVM Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>
        
        <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '16px 12px' }}>Campaign Name</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Investment</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Visitors</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>{hasConversions ? 'Leads' : 'Cost Per Click'}</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.length > 0 ? data.campaigns.map((camp, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px 12px', fontWeight: '500' }}>{camp.name}</td>
                <td style={{ padding: '16px 12px', textAlign: 'right' }}>${camp.cost.toFixed(2)}</td>
                <td style={{ padding: '16px 12px', textAlign: 'right' }}>{camp.clicks.toLocaleString()}</td>
                <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                  {hasConversions ? (camp.conversions || 0) : `$${(camp.clicks > 0 ? camp.cost / camp.clicks : 0).toFixed(2)}`}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No campaign data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </PageWrapper>

      {/* PAGE 5: TOP ADS */}
      <PageWrapper pageNumber={5} totalPages={7}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Top Performing Ads</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>The messaging that drove the most interest.</p>
          </div>
          <img src="/Logo-1.png" alt="NVM Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ads.length > 0 ? ads.slice(0, 8).map((ad, i) => (
            <div key={i} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>{String(ad.adType || '').replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{ad.adName}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Campaign: {ad.campaignName}</div>
              </div>
              <div style={{ display: 'flex', gap: '30px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Investment</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>${ad.cost.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Visitors</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{ad.clicks.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>CTR</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{(ad.ctr * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
              No ad creative data available for this period.
            </div>
          )}
        </div>
      </PageWrapper>

      {/* PAGE 6: SEARCH TERMS */}
      <PageWrapper pageNumber={6} totalPages={7}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Search Intent</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>What potential customers typed into Google to find you.</p>
          </div>
          <img src="/Logo-1.png" alt="NVM Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>
        
        <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '16px 12px' }}>Search Phrase</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Investment</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>Visitors</th>
              <th style={{ padding: '16px 12px', textAlign: 'right' }}>{hasConversions ? 'Leads Generated' : 'Cost Per Click'}</th>
            </tr>
          </thead>
          <tbody>
            {searchTerms.length > 0 ? searchTerms.slice(0, 12).map((term, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px 12px', fontWeight: '500' }}>"{term.searchTerm}"</td>
                <td style={{ padding: '16px 12px', textAlign: 'right' }}>${term.cost.toFixed(2)}</td>
                <td style={{ padding: '16px 12px', textAlign: 'right' }}>{term.clicks.toLocaleString()}</td>
                <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: hasConversions && term.conversions > 0 ? 'bold' : 'normal', color: hasConversions && term.conversions > 0 ? '#16a34a' : 'inherit' }}>
                  {hasConversions ? term.conversions.toLocaleString() : `$${(term.clicks > 0 ? term.cost / term.clicks : 0).toFixed(2)}`}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No search term data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </PageWrapper>

      {/* PAGE 7: DEVICES & OUTRO */}
      <PageWrapper pageNumber={7} totalPages={7}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Audience & Devices</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>How your audience interacts with your brand.</p>
          </div>
          <img src="/Logo-1.png" alt="NVM Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>

        <table style={{ width: '100%', fontSize: '14px', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '60px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '20px 16px' }}>Device Type</th>
              <th style={{ padding: '20px 16px', textAlign: 'right' }}>Investment</th>
              <th style={{ padding: '20px 16px', textAlign: 'right' }}>Visitors</th>
              <th style={{ padding: '20px 16px', textAlign: 'right' }}>{hasConversions ? 'Leads' : 'Cost Per Click'}</th>
            </tr>
          </thead>
          <tbody>
            {devices.length > 0 ? devices.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '20px 16px', fontWeight: 'bold', fontSize: '16px' }}>{d.device}</td>
                <td style={{ padding: '20px 16px', textAlign: 'right' }}>${d.cost.toFixed(2)}</td>
                <td style={{ padding: '20px 16px', textAlign: 'right' }}>{d.clicks.toLocaleString()}</td>
                <td style={{ padding: '20px 16px', textAlign: 'right' }}>
                  {hasConversions ? d.conversions.toLocaleString() : `$${(d.clicks > 0 ? d.cost / d.clicks : 0).toFixed(2)}`}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No device data recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div style={{ flex: 1 }}></div>
        
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>Thank you for your business!</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            We're dedicated to helping your business grow. If you have any questions regarding this report, please don't hesitate to reach out.
          </p>
          <div style={{ marginTop: '24px', fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
            Ahmed Anwar — North via Marketing
          </div>
        </div>

      </PageWrapper>

    </div>
  );
});

ClientAdsReportTemplate.displayName = 'ClientAdsReportTemplate';
