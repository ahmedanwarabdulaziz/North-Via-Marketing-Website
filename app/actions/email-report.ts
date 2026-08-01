'use server';

import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { ClientProfile } from '@/types/database';
import { generateReportPdfBuffer } from '@/lib/report-pdf';

export async function dispatchClientReportEmail(payload: {
  clientId: string;
  timeframeStr: string;
  totalSpend: number;
  totalLeads: number;
  reportUrlPath: string; // The relative or absolute path to view the full report
  resolvedStreams?: Array<any>;
  crmClient?: any;
}) {
  try {
    const doc = await db.collection('clients').doc(payload.clientId).get();
    if (!doc.exists) return { success: false, error: 'Client not found' };

    const client = doc.data() as ClientProfile;
    const emails = (client.email ? [client.email] : []);

    if (emails.length === 0) {
      return { success: false, error: 'Client has no Executive Delivery Emails configured.' };
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.purelymail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const cpl = payload.totalLeads > 0 ? (payload.totalSpend / Math.max(1, payload.totalLeads)).toFixed(2) : '-';
    // Link generation
    const printLink = process.env.NEXT_PUBLIC_BASE_URL 
      ? `${process.env.NEXT_PUBLIC_BASE_URL}${payload.reportUrlPath}`
      : `http://localhost:3000${payload.reportUrlPath}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Automated Performance Matrix</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-top: 5px;">North Via Marketing • ${payload.timeframeStr}</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">Hi ${client.ownerName},</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.5;">
            Your automated Google Ads marketing intelligence report has been generated for <strong>${payload.timeframeStr}</strong>.
          </p>

          <div style="background-color: white; border: 1px solid #e5e7eb; padding: 25px; border-radius: 12px; margin: 30px 0; display: flex; text-align: center;">
            <div style="flex: 1; border-right: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: bold;">Ad Spend</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #111827;">$${payload.totalSpend.toFixed(2)}</p>
            </div>
            ${payload.crmClient?.primaryObjective === 'traffic_optimization' ? `
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: bold;">Total Clicks</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #8b5cf6;">${payload.resolvedStreams?.reduce((acc: number, s: any) => acc + (s.metrics?.clicks || 0), 0).toLocaleString() || 0}</p>
            </div>
            ` : `
            <div style="flex: 1; border-right: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: bold;">Total Leads</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #2563eb;">${payload.totalLeads.toFixed(1)}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: bold;">Avg. CPL</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #111827;">$${cpl}</p>
            </div>
            `}
          </div>

          ${payload.resolvedStreams ? payload.resolvedStreams.map((stream: any, index: number) => `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e5e7eb;">
              <h3 style="color: #111827; font-size: 18px; margin-bottom: 5px;">Node ${index + 1}: ${stream.account?.descriptiveName}</h3>
              
              ${stream.summary?.campaignsInsight ? `
              <div style="margin-top: 20px;">
                <h4 style="color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Active Campaigns Analysis</h4>
                <div style="background-color: white; border-left: 4px solid #3b82f6; padding: 15px 20px; border-radius: 4px; font-style: italic; color: #374151; font-size: 14px; line-height: 1.5;">
                  "${stream.summary.campaignsInsight}"
                </div>
              </div>` : ''}

              ${stream.summary?.keywordsInsight ? `
              <div style="margin-top: 20px;">
                <h4 style="color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Search Term Pulls</h4>
                <div style="background-color: white; border-left: 4px solid #8b5cf6; padding: 15px 20px; border-radius: 4px; font-style: italic; color: #374151; font-size: 14px; line-height: 1.5;">
                  "${stream.summary.keywordsInsight}"
                </div>
              </div>` : ''}

              ${stream.summary?.geoInsight ? `
              <div style="margin-top: 20px;">
                <h4 style="color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Geographic Heatmap</h4>
                <div style="background-color: white; border-left: 4px solid #10b981; padding: 15px 20px; border-radius: 4px; font-style: italic; color: #374151; font-size: 14px; line-height: 1.5;">
                  "${stream.summary.geoInsight}"
                </div>
              </div>` : ''}

              ${stream.summary?.deviceInsight ? `
              <div style="margin-top: 20px;">
                <h4 style="color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Device Funnel Analysis</h4>
                <div style="background-color: white; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 4px; font-style: italic; color: #374151; font-size: 14px; line-height: 1.5;">
                  "${stream.summary.deviceInsight}"
                </div>
              </div>` : ''}

            </div>
          `).join('') : ''}

          <div style="text-align: center; margin-top: 40px;">
            <a href="${printLink}" style="background-color: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
              Access Full Analytics Report
            </a>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">Link provides secure, read-only access to your full PDF Analytics matrix.</p>
          </div>
        </div>

        <div style="text-align: center; padding: 25px; color: #9ca3af; font-size: 11px; background-color: white; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
          <p style="margin: 0;">Strictly Confidential • Data supplied directly by Google Ads API</p>
          <p style="margin: 5px 0 0 0;">North Via Marketing Inc. • info@northviamarketing.com</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
      to: emails.join(', '),
      subject: `${client.brandName} Performance Report (${payload.timeframeStr})`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error: any) {
    console.error('Report email failed to dispatch:', error);
    return { success: false, error: error.message || 'Email dispatch failed' };
  }
}

export async function sendPdfReportEmailAction(payload: {
  clientId: string;
  timeframeStr: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
  avgCpc: number;

  prevTotalCost?: number;
  prevTotalClicks?: number;
  prevTotalImpressions?: number;
  prevCtr?: number;
  prevAvgCpc?: number;

  lyTotalCost?: number;
  lyTotalClicks?: number;
  lyTotalImpressions?: number;
  lyCtr?: number;
  lyAvgCpc?: number;

  aiConclusion: string;
  aiSummary: {
    campaignsInsight: string;
    keywordsInsight: string;
    geoInsight: string;
    deviceInsight: string;
  } | null;

  campaigns: Array<{
    name: string;
    cost: number;
    clicks: number;
    impressions: number;
  }>;

  searchTerms: Array<{
    searchTerm: string;
    clicks: number;
    cost: number;
    impressions?: number;
    ctr?: number;
    averageCpc?: number;
  }>;

  devices: Array<{
    device: string;
    cost: number;
  }>;

  locations: Array<{
    city: string;
    cost: number;
  }>;
}) {
  try {
    const doc = await db.collection('clients').doc(payload.clientId).get();
    if (!doc.exists) {
      return { success: false, error: 'Client profile not found in CRM database.' };
    }

    const client = doc.data() as ClientProfile;
    const emails = (client.email ? [client.email] : []);

    if (emails.length === 0) {
      return { success: false, error: 'Client profile has no reporting or contact email address configured.' };
    }

    // Generate PDF Buffer
    const pdfBuffer = await generateReportPdfBuffer({
      clientName: client.brandName,
      contactName: client.ownerName,
      timeframe: payload.timeframeStr,
      totalCost: payload.totalSpend,
      totalClicks: payload.totalClicks,
      totalImpressions: payload.totalImpressions,
      ctr: payload.ctr,
      avgCpc: payload.avgCpc,
      
      prevTotalCost: payload.prevTotalCost,
      prevTotalClicks: payload.prevTotalClicks,
      prevTotalImpressions: payload.prevTotalImpressions,
      prevCtr: payload.prevCtr,
      prevAvgCpc: payload.prevAvgCpc,
      
      lyTotalCost: payload.lyTotalCost,
      lyTotalClicks: payload.lyTotalClicks,
      lyTotalImpressions: payload.lyTotalImpressions,
      lyCtr: payload.lyCtr,
      lyAvgCpc: payload.lyAvgCpc,
      
      aiConclusion: payload.aiConclusion,
      aiSummary: payload.aiSummary,
      campaigns: payload.campaigns,
      searchTerms: payload.searchTerms,
      devices: payload.devices,
      locations: payload.locations,
    });

    const transporter = nodemailer.createTransport({
      host: 'smtp.purelymail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const cleanTimeframe = payload.timeframeStr.replace(/ /g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanBusiness = client.brandName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const pdfFileName = `${cleanBusiness}_Performance_Report_${cleanTimeframe}.pdf`;

    const greeting = client.ownerName ? `Hi ${client.ownerName},` : `Hi ${client.brandName} Team,`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <div style="background: linear-gradient(135deg, #274290 0%, #1e3a8a 100%); padding: 35px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 0.5px; font-weight: 700;">Performance Matrix Report</h1>
          <p style="color: #bfdbfe; font-size: 13px; margin: 5px 0 0 0; font-weight: 500;">North Via Marketing • ${payload.timeframeStr}</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 30px 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <p style="font-size: 15px; color: #374151; margin-bottom: 20px; font-weight: 600;">${greeting}</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 25px;">
            Your executive performance report has been compiled and is ready for review. A print-ready, high-resolution PDF dossier containing your campaign execution details, keyword query breakdowns, devices share, and locations target analysis has been attached directly to this email.
          </p>

          <!-- Core stats callout box -->
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding: 10px; border-right: 1px solid #f3f4f6; text-align: center;">
                  <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: bold;">Marketing Investment</p>
                  <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 700; color: #111827;">$${payload.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </td>
                <td style="width: 50%; padding: 10px; text-align: center;">
                  <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: bold;">Prospect Clicks</p>
                  <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 700; color: #274290;">${payload.totalClicks.toLocaleString()}</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="border-top: 1px solid #f3f4f6; padding-top: 12px; margin-top: 10px; text-align: center;">
                  <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af;">Avg CPC: $${payload.avgCpc.toFixed(2)}  •  Engagement CTR: ${payload.ctr.toFixed(2)}%</p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Strategy team executive summary -->
          <div style="background-color: #eff6ff; border-left: 4px solid #274290; padding: 15px 20px; border-radius: 4px; margin: 25px 0;">
            <h4 style="color: #1e3a8a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Executive Summary & Strategy Overview</h4>
            <p style="color: #1e40af; font-size: 13.5px; line-height: 1.5; margin: 0; font-style: italic;">
              "${payload.aiConclusion}"
            </p>
          </div>

          <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-top: 30px;">
            Please find the attached PDF file: <strong>${pdfFileName}</strong> for the complete multi-page analysis ledger containing search terms, geographic target allocations, and campaign execution maps.
          </p>
        </div>

        <div style="text-align: center; padding: 25px; color: #9ca3af; font-size: 11px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
          <p style="margin: 0; font-weight: bold; color: #6b7280;">Strictly Confidential • Generated via North Via Marketing Engine</p>
          <p style="margin: 5px 0 0 0;">North Via Marketing Inc. • info@northviamarketing.com • +1 (647) 675-3343</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
      to: emails.join(', '),
      subject: `${client.brandName} Performance Report (${payload.timeframeStr})`,
      html: htmlContent,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    console.error('PDF Report email dispatch failed:', error);
    return { success: false, error: error.message || 'Email dispatch failed' };
  }
}

export async function generatePdfReportAction(payload: {
  clientId: string;
  timeframeStr: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
  avgCpc: number;

  prevTotalCost?: number;
  prevTotalClicks?: number;
  prevTotalImpressions?: number;
  prevCtr?: number;
  prevAvgCpc?: number;

  lyTotalCost?: number;
  lyTotalClicks?: number;
  lyTotalImpressions?: number;
  lyCtr?: number;
  lyAvgCpc?: number;

  aiConclusion: string;
  aiSummary: {
    campaignsInsight: string;
    keywordsInsight: string;
    geoInsight: string;
    deviceInsight: string;
  } | null;

  campaigns: Array<{
    name: string;
    cost: number;
    clicks: number;
    impressions: number;
  }>;

  searchTerms: Array<{
    searchTerm: string;
    clicks: number;
    cost: number;
    impressions?: number;
    ctr?: number;
    averageCpc?: number;
  }>;

  devices: Array<{
    device: string;
    cost: number;
  }>;

  locations: Array<{
    city: string;
    cost: number;
  }>;
}) {
  try {
    const doc = await db.collection('clients').doc(payload.clientId).get();
    if (!doc.exists) {
      return { success: false, error: 'Client profile not found in CRM database.' };
    }

    const client = doc.data() as ClientProfile;

    // Generate PDF Buffer
    const pdfBuffer = await generateReportPdfBuffer({
      clientName: client.brandName,
      contactName: client.ownerName,
      timeframe: payload.timeframeStr,
      totalCost: payload.totalSpend,
      totalClicks: payload.totalClicks,
      totalImpressions: payload.totalImpressions,
      ctr: payload.ctr,
      avgCpc: payload.avgCpc,
      
      prevTotalCost: payload.prevTotalCost,
      prevTotalClicks: payload.prevTotalClicks,
      prevTotalImpressions: payload.prevTotalImpressions,
      prevCtr: payload.prevCtr,
      prevAvgCpc: payload.prevAvgCpc,
      
      lyTotalCost: payload.lyTotalCost,
      lyTotalClicks: payload.lyTotalClicks,
      lyTotalImpressions: payload.lyTotalImpressions,
      lyCtr: payload.lyCtr,
      lyAvgCpc: payload.lyAvgCpc,
      
      aiConclusion: payload.aiConclusion,
      aiSummary: payload.aiSummary,
      campaigns: payload.campaigns,
      searchTerms: payload.searchTerms,
      devices: payload.devices,
      locations: payload.locations,
    });

    const base64 = pdfBuffer.toString('base64');
    return { success: true, base64 };
  } catch (error: any) {
    console.error('PDF Report generation failed:', error);
    return { success: false, error: error.message || 'PDF generation failed' };
  }
}

