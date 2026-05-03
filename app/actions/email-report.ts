'use server';

import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { ClientProfile } from '@/types/database';

export async function dispatchClientReportEmail(payload: {
  clientId: string;
  timeframeStr: string;
  totalSpend: number;
  totalLeads: number;
  reportUrlPath: string; // The relative or absolute path to view the full report
}) {
  try {
    const doc = await db.collection('clients').doc(payload.clientId).get();
    if (!doc.exists) return { success: false, error: 'Client not found' };

    const client = doc.data() as ClientProfile;
    const emails = client.reportingEmails && client.reportingEmails.length > 0 
      ? client.reportingEmails 
      : (client.email ? [client.email] : []);

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
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">Hi ${client.contactName},</p>
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
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #8b5cf6;">${payload.resolvedStreams?.reduce((acc, s) => acc + (s.metrics?.clicks || 0), 0).toLocaleString() || 0}</p>
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
      subject: `${client.businessName} Performance Report (${payload.timeframeStr})`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error: any) {
    console.error('Report email failed to dispatch:', error);
    return { success: false, error: error.message || 'Email dispatch failed' };
  }
}
