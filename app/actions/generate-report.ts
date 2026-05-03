'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateExecutiveSummary(stream: any, clientName: string, timeframe: string, bounds?: any, crmClient?: Partial<import('@/types/database').ClientProfile>, editorInstruction?: string, currentDraft?: any) {
  const { metrics, pastMetrics, campaigns, searchTerms, devices, locations } = stream;
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: 'GEMINI_API_KEY is missing from .env.local' };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const generateWithFallback = async (promptText: string, retryCount = 0): Promise<any> => {
      try {
        const primaryModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        return await primaryModel.generateContent(promptText);
      } catch (e: any) {
        if (e.message?.includes('503') || e.message?.includes('demand') || e.message?.includes('429')) {
          if (retryCount < 3) {
            const waitTime = (retryCount + 1) * 11000;
            console.warn(`Gemini 429 Rate Limit Hit. Waiting ${waitTime/1000}s before retrying (Attempt ${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return generateWithFallback(promptText, retryCount + 1);
          }
          console.warn("Retries exhausted, automatically falling back to gemini-2.0-flash");
          const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          return await fallbackModel.generateContent(promptText);
        }
        throw e;
      }
    };

    const spendDelta = pastMetrics?.cost ? (((metrics?.cost || 0) - pastMetrics.cost) / pastMetrics.cost * 100).toFixed(1) : 0;
    const leadsDelta = pastMetrics?.conversions ? (((metrics?.conversions || 0) - pastMetrics.conversions) / pastMetrics.conversions * 100).toFixed(1) : 0;

    let dateContext = `timeframe: ${timeframe}`;
    if (bounds) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.round((new Date(bounds.currentEnd).getTime() - new Date(bounds.currentStart).getTime()) / msPerDay) + 1;
      dateContext = `Current Period: ${bounds.currentStart} to ${bounds.currentEnd} (${days} days) | Previous Period: ${bounds.pastStart} to ${bounds.pastEnd} (${days} days)`;
    }

    const contactGreeting = crmClient?.contactName ? `Address the client intimately by their name: ${crmClient.contactName}.` : `Address the client directly as our valued partner.`;
    
    let targetMathInstruction = '';
    const isTraffic = crmClient?.primaryObjective === 'traffic_optimization';

    if (isTraffic) {
      targetMathInstruction = `
      CRITICAL BUSINESS GOALS (TRAFFIC OPTIMIZATION):
      The client's exact CRM designated goal is purely driving website traffic and brand awareness, NOT direct leads/conversions.
      Primary Campaign Goal: ${crmClient.mainGoal || 'Maximize Clicks and Visibility'}
      
      You MUST mathematically assess the actual Traffic volume and Cost Per Click (CPC) generated below. Celebrate massive click volume and highly efficient (low) CPCs. ABSOLUTELY NEVER frame the success around "Leads" or "Cost Per Lead", because conversions are irrelevant to this specific branding campaign. If clicks are dropping, recommend exploring broader top-of-funnel keywords.
      `;
    } else if (crmClient?.targetCostPerLead || crmClient?.mainGoal) {
      targetMathInstruction = `
      CRITICAL BUSINESS GOALS (LEAD GENERATION):
      The client's exact CRM designated goals are:
      - Target Cost Per Lead (CPA/CPL): ${crmClient.targetCostPerLead ? `$${crmClient.targetCostPerLead}` : 'No explicit strict limit sets'}
      - Primary Campaign Goal: ${crmClient.mainGoal || 'Maximize Conversions'}
      
      You MUST mathematically assess the actual Cost Per Lead generated below against their Target CPL. If actual CPL is BELOW their target, aggressively celebrate this extreme efficiency and high ROI. If actual CPL is exactly at or slightly above, frame it around high intent quality. If there are NO leads, heavily focus on traffic volume and recommend tracking review.
      `;
    }

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
      - Conversions: ${metrics?.conversions?.toFixed(1) || 0} (Change: ${leadsDelta}%)
      - Clicks: ${metrics?.clicks || 0}
      - Cost Per Lead: $${metrics?.costPerConversion?.toFixed(2) || 0}
      
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
      console.error("Failed to parse Gemini JSON:", responseText);
      return { success: false, error: 'AI generated invalid JSON structure.' };
    }

  } catch (error: any) {
    console.error('Gemini Failure:', error);
    return { success: false, error: `AI Engine failed: ${error.message || 'Unknown error'}` };
  }
}

export async function generateOverallConclusion(clientName: string, timeframe: string, totalSpend: number, totalConversions: number, crmClient?: Partial<import('@/types/database').ClientProfile>, bounds?: any) {
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
        if (e.message?.includes('503') || e.message?.includes('demand') || e.message?.includes('429')) {
          if (retryCount < 3) {
            const waitTime = (retryCount + 1) * 11000;
            console.warn(`Gemini Conclusion 429 Rate Limit Hit. Waiting ${waitTime/1000}s before retrying (Attempt ${retryCount + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return generateWithFallback(promptText, retryCount + 1);
          }
          console.warn("Retries exhausted, automatically falling back to gemini-2.0-flash");
          const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          return await fallbackModel.generateContent(promptText);
        }
        throw e;
      }
    };

    let dateContext = `timeframe: ${timeframe}`;
    if (bounds) {
      dateContext = `Current Period: ${bounds.currentStart} to ${bounds.currentEnd}`;
    }

    const contactGreeting = crmClient?.contactName ? `Address the client intimately by their name: ${crmClient.contactName}.` : `Address the client directly as our valued partner.`;
    
    let targetMathInstruction = '';
    const isTraffic = crmClient?.primaryObjective === 'traffic_optimization';

    if (isTraffic) {
      targetMathInstruction = `
      CRITICAL BUSINESS GOALS (TRAFFIC OPTIMIZATION):
      The client's exact CRM designated goal is purely driving website traffic and brand awareness, NOT direct leads.
      Primary Campaign Goal: ${crmClient.mainGoal || 'Maximize Clicks and Visibility'}
      - Service/Target Zones: ${crmClient.targetCities?.length ? crmClient.targetCities.join(', ') : 'Global / Unrestricted'}
      
      DO NOT evaluate this account on conversions or leads. Evaluate its success strictly on Traffic Volume, Network Spend, and minimizing CPCs.
      `;
    } else if (crmClient?.targetCostPerLead || crmClient?.mainGoal) {
      targetMathInstruction = `
      CRITICAL BUSINESS GOALS (LEAD GENERATION):
      The client's exact CRM designated goals are:
      - Target Cost Per Lead (CPA/CPL): ${crmClient.targetCostPerLead ? `$${crmClient.targetCostPerLead}` : 'No explicit strict limit sets'}
      - Primary Campaign Goal: ${crmClient.mainGoal || 'Maximize Conversions'}
      - Service/Target Zones: ${crmClient.targetCities?.length ? crmClient.targetCities.join(', ') : 'Global / Unrestricted'}
      `;
    }

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
      - Total Conversions combined across all pipelines: ${totalConversions.toFixed(1)}
      
      Write a highly professional, reassuring, and strategic closing paragraph (3-4 sentences max) that summarizes the overall holistic trajectory across all their marketing pipelines over this period. Do not just list raw data, provide the final executive closure and next steps based on the internal agency context provided. NEVER use bullet points. Make it read like a premium agency sign-off.
    `;

    const result = await generateWithFallback(prompt);
    const responseText = result.response.text();
    
    return { success: true, summary: responseText };
  } catch (error: any) {
    console.error('AI Conclusion Engine failed:', error);
    return { success: false, error: error.message };
  }
}
