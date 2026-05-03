'use server';

import { db } from '@/lib/firebase';
import { generateExecutiveSummary } from './generate-report';
import { dispatchClientReportEmail } from './email-report';

// 1. Used strictly to hit the AI model based on ALREADY fetched locally-resolved data streams
export async function generateDraftInsights(
  streams: Array<any>,
  timeframe: string,
  bounds: any,
  crmClient?: any
) {
  try {
    const draftResults = [];
    
    for (const stream of streams) {
      const { account } = stream;
      const { summary, error } = await generateExecutiveSummary(
        stream, account.descriptiveName, timeframe, bounds, crmClient
      );
      
      draftResults.push({ 
        customerId: account.customerId, 
        summary: summary || {}, 
        summaryError: error 
      });

      // Inject a 1.5 second architectural delay between nodes to prevent Gemini Free-Tier burst rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return { success: true, drafts: draftResults };
  } catch (error: any) {
    console.error('Draft Generation Fail:', error);
    return { success: false, error: error.message };
  }
}

export async function regenerateSingleDraft(
  stream: any,
  timeframe: string,
  bounds: any,
  crmClient: any,
  editorInstruction: string,
  currentDraft: string
) {
  try {
    const { account } = stream;
    const { summary, error } = await generateExecutiveSummary(
      stream, account.descriptiveName, timeframe, bounds, crmClient, editorInstruction, currentDraft
    );
    return { success: true, summary: summary || {}, summaryError: error };
  } catch (error: any) {
    console.error('Single Draft Regen Fail:', error);
    return { success: false, error: error.message };
  }
}

// 2. Used to permanently save the structurally verified UI array into the database and email it natively!
export async function storeSnapshotAndDispatchEmail(
  clientId: string,
  resolvedStreams: Array<any>, 
  timeframe: string,
  bounds: any,
  crmClient?: any
) {
  try {
    let totalCost = 0;
    let totalConversions = 0;

    resolvedStreams.forEach(stream => {
      if (stream.metrics?.cost) totalCost += stream.metrics.cost;
      if (stream.metrics?.conversions) totalConversions += stream.metrics.conversions;
    });

    const fullPayload = {
      resolvedStreams,
      timeframe,
      bounds,
      crmClient,
      totalCost,
      totalConversions
    };

    const snapshotPayload = {
      customerId: clientId,
      dateRangeKey: timeframe,
      reportType: 'summary',
      payloadJson: JSON.stringify(fullPayload),
      fetchedAt: new Date().toISOString()
    };

    const docRef = await db.collection('ads_reports_snapshots').add(snapshotPayload);
    const snapshotId = docRef.id;

    const emailRes = await dispatchClientReportEmail({
      clientId: clientId,
      timeframeStr: timeframe,
      totalSpend: totalCost,
      totalLeads: totalConversions,
      reportUrlPath: `/client-report/${snapshotId}`,
      resolvedStreams: resolvedStreams,
      crmClient: crmClient
    });

    if (!emailRes.success) {
      return { success: false, error: emailRes.error };
    }

    return { success: true, snapshotId };
  } catch (error: any) {
    console.error('Snapshot Dispatch Fail:', error);
    return { success: false, error: error.message };
  }
}
