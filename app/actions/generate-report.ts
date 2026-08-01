'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateExecutiveSummary(stream: any, clientName: string, timeframe: string, bounds?: any, crmClient?: Partial<import('@/types/database').ClientProfile>, editorInstruction?: string, currentDraft?: any) {
  const { metrics, pastMetrics, campaigns, searchTerms, devices, locations } = stream;
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: 'GEMINI_API_KEY is missing from .env.local' };
  }

  const spendDelta = pastMetrics?.cost ? (((metrics?.cost || 0) - pastMetrics.cost) / pastMetrics.cost * 100).toFixed(1) : 0;
  const clicksDelta = pastMetrics?.clicks ? (((metrics?.clicks || 0) - pastMetrics.clicks) / pastMetrics.clicks * 100).toFixed(1) : 0;
  const impressionsDelta = pastMetrics?.impressions ? (((metrics?.impressions || 0) - pastMetrics.impressions) / pastMetrics.impressions * 100).toFixed(1) : 0;

  const currentCtr = metrics?.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
  const pastCtr = pastMetrics?.impressions > 0 ? (pastMetrics.clicks / pastMetrics.impressions) * 100 : 0;
  const ctrDelta = pastCtr > 0 ? (((currentCtr - pastCtr) / pastCtr) * 100).toFixed(1) : 0;

  const currentCpc = metrics?.clicks > 0 ? metrics.cost / metrics.clicks : 0;
  const pastCpc = pastMetrics?.clicks > 0 ? pastMetrics.cost / pastMetrics.clicks : 0;
  const cpcDelta = pastCpc > 0 ? (((currentCpc - pastCpc) / pastCpc) * 100).toFixed(1) : 0;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const generateWithFallback = async (promptText: string, retryCount = 0): Promise<any> => {
      try {
        const primaryModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        return await primaryModel.generateContent(promptText);
      } catch (e: any) {
        const errMsg = e.message || '';
        const isQuotaExceeded = errMsg.toLowerCase().includes('quota') || errMsg.includes('limit: 0');
        
        if (isQuotaExceeded) {
          console.warn("Gemini Quota Exceeded. Skipping retries/fallback model, using rule-based local generator.");
          throw e;
        }
        
        if (errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('429')) {
          if (retryCount < 3) {
            const waitTime = (retryCount + 1) * 11000;
            console.warn(`Gemini 429 Rate Limit Hit. Waiting ${waitTime/1000}s before retrying (Attempt ${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return generateWithFallback(promptText, retryCount + 1);
          }
          console.warn("Retries exhausted, automatically falling back to gemini-2.0-flash");
          try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            return await fallbackModel.generateContent(promptText);
          } catch (fallbackError: any) {
            console.warn("Fallback model also failed:", fallbackError.message || fallbackError);
            throw fallbackError;
          }
        }
        throw e;
      }
    };

    let dateContext = `timeframe: ${timeframe}`;
    if (bounds) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.round((new Date(bounds.currentEnd).getTime() - new Date(bounds.currentStart).getTime()) / msPerDay) + 1;
      dateContext = `Current Period: ${bounds.currentStart} to ${bounds.currentEnd} (${days} days) | Previous Period: ${bounds.pastStart} to ${bounds.pastEnd} (${days} days)`;
    }

    const contactGreeting = crmClient?.contactName ? `Address the client intimately by their name: ${crmClient.contactName}.` : `Address the client directly as our valued partner.`;
    
    let targetMathInstruction = `
      CRITICAL BUSINESS GOALS (TRAFFIC & CLICKS):
      We are focusing exclusively on Clicks (Prospect Traffic), Impressions (Brand Exposure), Click-Through Rate (CTR / Engagement Rate), and Average Cost Per Click (CPC) for this report. Google Ads conversion/lead tracking is currently not accurate, so you MUST NOT evaluate, mention, or reference conversions, leads, cost per lead, or CPL. 
      Evaluate the efficiency of the spend in generating high-quality traffic, click growth, and average CPC.
      Primary Campaign Goal: ${crmClient?.mainGoal || 'Maximize Clicks and Visibility'}
    `;

    const reportToneInstruction = crmClient?.reportTone ? `The psychological tone of your writing must be strictly: ${crmClient.reportTone}!` : '';

    const internalNotesInstruction = crmClient?.aiBehavioralNotes ? `
      CRITICAL INTERNAL AGENCY CONTEXT:
      The agency owner has provided the following internal psychological notes regarding this specific client right now:
      "${crmClient.aiBehavioralNotes}"
      
      You MUST subtly and professionally weave psychological reassurances or explanations directly targeting these internal notes natively into your report! NEVER mention that you were explicitly given these notes. Keep the illusion that you are naturally reacting to the math.
    ` : '';
    
    const avoidanceInstruction = crmClient?.aiAvoidanceWarnings ? `
      CRITICAL STRICT AVOIDANCE RULES:
      You MUST absolutely avoid mentioning, confirming, or hinting at the following concepts:
      "${crmClient.aiAvoidanceWarnings}"
      Under no circumstances can the above topics be generated in your paragraph.
    ` : '';

    const prompt = editorInstruction && currentDraft ? `
      You are the lead Executive Marketing Director at "North Via Marketing".
      You previously drafted the following performance summary for "${clientName}":
      
      ---
      "${currentDraft}"
      ---
      
      The Human Executive Editor has rejected your draft and provided the following strict instructions for a targeted rewrite:
      "${editorInstruction}"
      
      Rewrite the text enforcing their instructions exactly while gracefully blending the original trajectory if not overridden. 
      Maintain the premium agency tone and keep it to ONE cohesive paragraph (maximum 4 sentences). 
      DO NOT start with salutations (like "Dear Client"). Provide ONLY the raw paragraph text.
    ` : `
      You are the lead Executive Marketing Director at "North Via Marketing", writing a professional summary directly to your client, "${clientName}".
      ${contactGreeting}
      ${reportToneInstruction}
      ${targetMathInstruction}
      ${internalNotesInstruction}
      ${avoidanceInstruction}
      
      You must generate EXACTLY valid JSON, without any markdown code block wrappers (do not use \`\`\`json). 
      The JSON MUST adhere to the following strictly formatted keys, representing four decoupled architectural paragraphs (maximum 3-4 sentences per paragraph, premium tone, VERY precise with dates and the supplied arrays):
      {
        "campaignsInsight": "Extract insights specific to the supplied 'campaigns' array...",
        "keywordsInsight": "Extract insights specific to the 'searchTerms' array...",
        "geoInsight": "Extract insights specific to the 'locations' array...",
        "deviceInsight": "Extract insights specific to the 'devices' array..."
      }
      
      Reviewing Google Ads performance. Time Context:
      ${dateContext}
      
      Metric Data:
      - Current Spend: $${metrics?.cost?.toFixed(2) || 0} (Change: ${spendDelta}%)
      - Clicks: ${metrics?.clicks || 0} (Change: ${clicksDelta}%)
      - Impressions: ${metrics?.impressions || 0} (Change: ${impressionsDelta}%)
      - Click-Through Rate (CTR): ${currentCtr.toFixed(2)}% (Change: ${ctrDelta}%)
      - Average CPC: $${currentCpc.toFixed(2)} (Change: ${cpcDelta}%)
      
      Additional Data Context:
      - Active Campaigns Count: ${campaigns?.length || 0}
      - Search Terms Tracked: ${searchTerms?.length || 0}
      - Locations Mapped: ${locations?.length || 0}
      - Devices Mapped: ${devices?.length || 0}

      Instructions:
      - Adhere to the provided JSON structure natively.
      - NEVER use bullet points inside the JSON values. Do not start with salutations.
      - Drop directly into the professional insight for each respective block.
    `;

    const result = await generateWithFallback(prompt);
    let responseText = result.response.text();
    
    // Clean up markdown payload if the AI wrapped it natively
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/\`\`\`json\n/g, '').replace(/\`\`\`/g, '');
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/\`\`\`\n/g, '').replace(/\`\`\`/g, '');
    }

    try {
      const jsonRes = JSON.parse(responseText.trim());
      return { success: true, summary: jsonRes };
    } catch(err) {
      console.warn("Failed to parse Gemini JSON, forcing fallback rule-based generation. Response was:", responseText);
      throw new Error('AI generated invalid JSON structure.');
    }

  } catch (error: any) {
    console.warn('Gemini Failure, using fallback rule-based generation:', error.message || error);
    
    const clickChangeText = Number(clicksDelta) > 0 ? `an increase of ${clicksDelta}%` : `a change of ${clicksDelta}%`;
    const costChangeText = Number(spendDelta) > 0 ? `increased by ${spendDelta}%` : `changed by ${spendDelta}%`;
    
    const fallbackSummary = {
      campaignsInsight: `Google Ads campaigns generated a total of ${(metrics?.clicks || 0).toLocaleString()} clicks over this period, representing ${clickChangeText} in prospect traffic compared to the preceding period. Spend allocations ${costChangeText} to support volume objectives.`,
      keywordsInsight: `Search query tracking indicates high relevance with an average click-through rate (CTR) of ${currentCtr.toFixed(2)}%. Bid strategy management kept average cost-per-click (CPC) at $${currentCpc.toFixed(2)}, preserving traffic acquisition efficiency.`,
      geoInsight: `Geographic target traffic shows optimal concentration in key market areas. Clicks were successfully distributed to primary locations to capture localized search intent.`,
      deviceInsight: `Mobile devices remain the dominant source of traffic engagement, with desktop supporting research intent. The current device mix maintains performance stability across all channels.`
    };
    
    return { success: true, summary: fallbackSummary, isFallback: true };
  }
}

export async function generateOverallConclusion(
  clientName: string,
  timeframe: string,
  totalSpend: number,
  totalConversions: number,
  crmClient?: Partial<import('@/types/database').ClientProfile>,
  bounds?: any,
  trafficMetrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    avgCpc: number;
  }
) {
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: 'GEMINI_API_KEY is missing' };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const generateWithFallback = async (promptText: string, retryCount = 0): Promise<any> => {
      try {
        const primaryModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        return await primaryModel.generateContent(promptText);
      } catch (e: any) {
        const errMsg = e.message || '';
        const isQuotaExceeded = errMsg.toLowerCase().includes('quota') || errMsg.includes('limit: 0');
        
        if (isQuotaExceeded) {
          console.warn("Gemini Conclusion Quota Exceeded. Skipping retries/fallback model, using rule-based local generator.");
          throw e;
        }
        
        if (errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('429')) {
          if (retryCount < 3) {
            const waitTime = (retryCount + 1) * 11000;
            console.warn(`Gemini Conclusion 429 Rate Limit Hit. Waiting ${waitTime/1000}s before retrying (Attempt ${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return generateWithFallback(promptText, retryCount + 1);
          }
          console.warn("Retries exhausted, automatically falling back to gemini-2.0-flash");
          try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            return await fallbackModel.generateContent(promptText);
          } catch (fallbackError: any) {
            console.warn("Fallback conclusion model also failed:", fallbackError.message || fallbackError);
            throw fallbackError;
          }
        }
        throw e;
      }
    };

    let dateContext = `timeframe: ${timeframe}`;
    if (bounds) {
      dateContext = `Current Period: ${bounds.currentStart} to ${bounds.currentEnd}`;
    }

    const contactGreeting = crmClient?.contactName ? `Address the client intimately by their name: ${crmClient.contactName}.` : `Address the client directly as our valued partner.`;
    
    let targetMathInstruction = `
      CRITICAL BUSINESS GOALS (TRAFFIC & CLICKS):
      We are focusing exclusively on Clicks (Prospect Traffic), Impressions (Brand Exposure), Click-Through Rate (CTR / Engagement Rate), and Average Cost Per Click (CPC) for this report. Google Ads conversion/lead tracking is currently not accurate, so you MUST NOT evaluate, mention, or reference conversions, leads, cost per lead, or CPL. 
      Evaluate the efficiency of the spend in generating high-quality traffic, click growth, and average CPC.
      Primary Campaign Goal: ${crmClient?.mainGoal || 'Maximize Clicks and Visibility'}
      - Service/Target Zones: ${crmClient?.targetCities?.length ? crmClient.targetCities.join(', ') : 'Global / Unrestricted'}
    `;

    const reportToneInstruction = crmClient?.reportTone ? `The psychological tone of your writing must be strictly: ${crmClient.reportTone}!` : '';

    const internalNotesInstruction = crmClient?.aiBehavioralNotes ? `
      CRITICAL INTERNAL AGENCY CONTEXT:
      The agency owner has provided the following internal psychological notes regarding this specific client right now:
      "${crmClient.aiBehavioralNotes}"
      
      You MUST subtly and professionally weave psychological reassurances or explanations directly targeting these internal notes natively into your report! NEVER mention that you were explicitly given these notes. Keep the illusion that you are naturally reacting to the math.
    ` : '';
    
    const avoidanceInstruction = crmClient?.aiAvoidanceWarnings ? `
      CRITICAL STRICT AVOIDANCE RULES:
      You MUST absolutely avoid mentioning, confirming, or hinting at the following concepts:
      "${crmClient.aiAvoidanceWarnings}"
      Under no circumstances can the above topics be generated in your paragraph.
    ` : '';

    const prompt = `
      You are the lead Executive Marketing Director at "North Via Marketing", writing a final concluding summary directly to your client, "${clientName}", wrapping up their multi-account Google Ads report for the timeframe: ${timeframe}.
      ${contactGreeting}
      ${reportToneInstruction}
      ${targetMathInstruction}
      ${internalNotesInstruction}
      ${avoidanceInstruction}
      
      Total Cross-Account Stats:
      - Total Spend combined across all pipelines: $${totalSpend.toFixed(2)}
      - Total Clicks: ${trafficMetrics?.clicks || 0}
      - Total Impressions: ${trafficMetrics?.impressions || 0}
      - Average CTR: ${(trafficMetrics?.ctr || 0).toFixed(2)}%
      - Average CPC: $${(trafficMetrics?.avgCpc || 0).toFixed(2)}
      
      Write a highly professional, reassuring, and strategic closing paragraph (3-4 sentences max) that summarizes the overall holistic trajectory across all their marketing pipelines over this period. Do not just list raw data, provide the final executive closure and next steps based on the internal agency context provided. NEVER use bullet points. Make it read like a premium agency sign-off.
    `;

    const result = await generateWithFallback(prompt);
    const responseText = result.response.text();
    
    return { success: true, summary: responseText };
  } catch (error: any) {
    console.warn('AI Conclusion Engine failed, using fallback rule-based generation:', error.message || error);
    const greeting = crmClient?.contactName ? `Hi ${crmClient.contactName},` : `Dear Partner,`;
    const spendVal = totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const clicksVal = (trafficMetrics?.clicks || 0).toLocaleString();
    const ctrVal = (trafficMetrics?.ctr || 0).toFixed(2);
    const cpcVal = (trafficMetrics?.avgCpc || 0).toFixed(2);
    
    const fallbackConclusion = `${greeting} In summary, our Google Ads initiatives over this period focused on driving high-intent prospect traffic. With a total marketing investment of $${spendVal}, we generated ${clicksVal} clicks at an average CTR of ${ctrVal}% and an average cost-per-click of $${cpcVal}. We will continue optimizing bid distributions to sustain this traffic volume and maximize acquisition efficiency.`;
    
    return { success: true, summary: fallbackConclusion, isFallback: true };
  }
}
