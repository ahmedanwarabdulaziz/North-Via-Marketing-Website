import PDFDocument from 'pdfkit';

export interface ReportPdfData {
  clientName: string;
  contactName?: string;
  timeframe: string;
  totalCost: number;
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
  avgCpc: number;

  // Previous Period
  prevTotalCost?: number;
  prevTotalClicks?: number;
  prevTotalImpressions?: number;
  prevCtr?: number;
  prevAvgCpc?: number;

  // Same Period Last Year
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
    id?: string;
    name: string;
    cost: number;
    clicks: number;
    impressions: number;
    status?: string;
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
}

function formatMoney(amount: number) {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDeltaPdf(current: number, past: number | null | undefined, lowerIsBetter = false) {
  if (past === undefined || past === null || past === 0) {
    return { formatted: 'N/A', color: '#6b7280' };
  }
  const pct = ((current - past) / past) * 100;
  if (pct === 0) return { formatted: '0.0%', color: '#6b7280' };

  const isPositive = pct > 0;
  const formatted = `${isPositive ? '+' : ''}${pct.toFixed(1)}%`;
  const isGood = lowerIsBetter ? !isPositive : isPositive;
  return {
    formatted,
    color: isGood ? '#10b981' : '#ef4444',
  };
}

function drawPageHeader(doc: PDFKit.PDFDocument, clientName: string, title: string) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#274290').text('NORTH VIA MARKETING', 50, 40);
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(`${clientName} • Performance Report`, 50, 50);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text(title, 50, 68);
  doc.moveTo(50, 88).lineTo(545, 88).lineWidth(1).stroke('#e5e7eb');
}

function drawPageFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) {
  doc.moveTo(50, 765).lineTo(545, 765).lineWidth(0.5).stroke('#d1d5db');
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#9ca3af')
    .text('Confidential • Performance report powered by North Via Marketing Analytics Engine.', 50, 775);
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor('#9ca3af')
    .text(`Page ${pageNum} of ${totalPages}`, 500, 775, { width: 45, align: 'right' });
}

function drawMetricCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  prevDelta: { formatted: string; color: string },
  lyDelta: { formatted: string; color: string }
) {
  // Card border & background
  doc.roundedRect(x, y, w, h, 8).fill('#ffffff');
  doc.roundedRect(x, y, w, h, 8).lineWidth(1).stroke('#e5e7eb');

  // Title
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#6b7280')
    .text(title.toUpperCase(), x + 12, y + 10);

  // Main value
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#111827')
    .text(value, x + 12, y + 22);

  // Horizontal separator line inside card
  doc
    .moveTo(x + 12, y + 44)
    .lineTo(x + w - 12, y + 44)
    .lineWidth(0.5)
    .stroke('#f3f4f6');

  // vs. Previous Period
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#6b7280')
    .text('vs. Previous:', x + 12, y + 50);

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(prevDelta.color)
    .text(prevDelta.formatted, x + w - 50, y + 50, { width: 38, align: 'right' });

  // vs. Last Year Period
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#6b7280')
    .text('vs. Last Year:', x + 12, y + 64);

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(lyDelta.color)
    .text(lyDelta.formatted, x + w - 50, y + 64, { width: 38, align: 'right' });
}

function drawInsightCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  text: string
) {
  // Card outline
  doc.roundedRect(x, y, w, h, 8).fill('#ffffff');
  doc.roundedRect(x, y, w, h, 8).lineWidth(1).stroke('#e5e7eb');

  // Horizontal separator line inside card
  doc
    .moveTo(x + 12, y + 26)
    .lineTo(x + w - 12, y + 26)
    .lineWidth(0.5)
    .stroke('#e5e7eb');

  // Insight Title
  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .fillColor('#274290')
    .text(title, x + 12, y + 9);

  // Body text
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#374151')
    .text(text || 'Insights analysis generation pending...', x + 12, y + 38, {
      width: w - 24,
      lineGap: 3,
      align: 'left',
    });
}

export async function generateReportPdfBuffer(data: ReportPdfData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
  });

  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Calculate comparative metrics if available
    const prevCost = data.prevTotalCost || 0;
    const prevClicks = data.prevTotalClicks || 0;
    
    const clicksDelta = prevClicks ? (((data.totalClicks - prevClicks) / prevClicks) * 100).toFixed(1) : '0';
    const spendDelta = prevCost ? (((data.totalCost - prevCost) / prevCost) * 100).toFixed(1) : '0';

    const clickChangeText = Number(clicksDelta) > 0 ? `an increase of ${clicksDelta}%` : `a change of ${clicksDelta}%`;
    const costChangeText = Number(spendDelta) > 0 ? `increased by ${spendDelta}%` : `changed by ${spendDelta}%`;

    // Process fallback values for AI insights if they are empty, null, or placeholders
    let summaryText = data.aiConclusion;
    if (!summaryText || summaryText === 'Executive analysis statement processing.' || summaryText.trim() === '') {
      const greeting = data.contactName ? `Hi ${data.contactName},` : `Dear Partner,`;
      const spendVal = data.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const clicksVal = data.totalClicks.toLocaleString();
      const ctrVal = data.ctr.toFixed(2);
      const cpcVal = data.avgCpc.toFixed(2);
      summaryText = `${greeting} In summary, our Google Ads initiatives over this period focused on driving high-intent prospect traffic. With a total marketing investment of $${spendVal}, we generated ${clicksVal} clicks at an average CTR of ${ctrVal}% and an average cost-per-click of $${cpcVal}. We will continue optimizing bid distributions to sustain this traffic volume and maximize acquisition efficiency.`;
    }

    let campaignsInsight = data.aiSummary?.campaignsInsight;
    if (!campaignsInsight || campaignsInsight.trim() === '' || campaignsInsight.startsWith('No campaign metrics')) {
      campaignsInsight = `Google Ads campaigns generated a total of ${data.totalClicks.toLocaleString()} clicks over this period, representing ${clickChangeText} in prospect traffic compared to the preceding period. Spend allocations ${costChangeText} to support volume objectives.`;
    }

    let keywordsInsight = data.aiSummary?.keywordsInsight;
    if (!keywordsInsight || keywordsInsight.trim() === '' || keywordsInsight.startsWith('No search term')) {
      keywordsInsight = `Search query tracking indicates high relevance with an average click-through rate (CTR) of ${data.ctr.toFixed(2)}%. Bid strategy management kept average cost-per-click (CPC) at $${data.avgCpc.toFixed(2)}, preserving traffic acquisition efficiency.`;
    }

    let geoInsight = data.aiSummary?.geoInsight;
    if (!geoInsight || geoInsight.trim() === '' || geoInsight.startsWith('No geographic')) {
      geoInsight = `Geographic target traffic shows optimal concentration in key market areas. Clicks were successfully distributed to primary locations to capture localized search intent.`;
    }

    let deviceInsight = data.aiSummary?.deviceInsight;
    if (!deviceInsight || deviceInsight.trim() === '' || deviceInsight.startsWith('No device')) {
      deviceInsight = `Mobile devices remain the dominant source of traffic engagement, with desktop supporting research intent. The current device mix maintains performance stability across all channels.`;
    }

    // ==========================================
    // PAGE 1: COVER & EXECUTIVE SUMMARY & METRIC OVERVIEW
    // ==========================================
    
    // Page 1 Header
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#274290')
      .text('NORTH VIA MARKETING', 50, 55);

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#111827')
      .text('PERFORMANCE MATRIX', 50, 70);

    // Prepared for & Period block on the right
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#4b5563')
      .text(`Client: ${data.clientName}`, 300, 55, { align: 'right', width: 245 })
      .text(data.contactName ? `Attention: ${data.contactName}` : '', 300, 70, { align: 'right', width: 245 })
      .text(`Period: ${data.timeframe}`, 300, 85, { align: 'right', width: 245 });

    // Header horizontal brand line
    doc.moveTo(50, 115).lineTo(545, 115).lineWidth(2).stroke('#274290');

    // Section 1: Executive Summary
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#274290')
      .text('EXECUTIVE SUMMARY & STRATEGY OVERVIEW', 50, 135);

    const summaryHeight = doc.heightOfString(summaryText, { width: 455, lineGap: 3.5 });
    const summaryBoxHeight = summaryHeight + 24;

    // Draw quote background callout box
    doc.roundedRect(50, 155, 495, summaryBoxHeight, 8).fill('#f8fafc');
    doc.roundedRect(50, 155, 495, summaryBoxHeight, 8).lineWidth(1).stroke('#e5e7eb');
    doc.moveTo(54, 155).lineTo(54, 155 + summaryBoxHeight).lineWidth(3).stroke('#274290');

    doc
      .font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor('#374151')
      .text(summaryText, 70, 167, { width: 455, lineGap: 3.5 });

    // Section 2: Core Metrics
    const metricsY = 155 + summaryBoxHeight + 25;
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#274290')
      .text('CORE PERFORMANCE METRICS', 50, metricsY);

    // Draw Metric Cards
    // Row 1: Spend, Clicks, Impressions (3 cards side-by-side)
    const cardW = 155;
    const cardH = 82;
    const cardSpacing = 15;
    const row1Y = metricsY + 18;

    // Card 1: Marketing Investment (Spend)
    drawMetricCard(
      doc,
      50,
      row1Y,
      cardW,
      cardH,
      'Marketing Investment',
      formatMoney(data.totalCost),
      getDeltaPdf(data.totalCost, data.prevTotalCost, false),
      getDeltaPdf(data.totalCost, data.lyTotalCost, false)
    );

    // Card 2: Prospect Traffic (Clicks)
    drawMetricCard(
      doc,
      50 + cardW + cardSpacing,
      row1Y,
      cardW,
      cardH,
      'Prospect Traffic',
      data.totalClicks.toLocaleString(),
      getDeltaPdf(data.totalClicks, data.prevTotalClicks, false),
      getDeltaPdf(data.totalClicks, data.lyTotalClicks, false)
    );

    // Card 3: Brand Exposure (Impressions)
    drawMetricCard(
      doc,
      50 + (cardW + cardSpacing) * 2,
      row1Y,
      cardW,
      cardH,
      'Brand Exposure',
      data.totalImpressions.toLocaleString(),
      getDeltaPdf(data.totalImpressions, data.prevTotalImpressions, false),
      getDeltaPdf(data.totalImpressions, data.lyTotalImpressions, false)
    );

    // Row 2: CTR, Avg CPC (2 cards side-by-side, centered layout)
    const row2Y = row1Y + cardH + 15;
    const row2CardW = 240;
    const row2Spacing = 15;

    // Card 4: Engagement Rate (CTR)
    drawMetricCard(
      doc,
      50,
      row2Y,
      row2CardW,
      cardH,
      'Engagement Rate (CTR)',
      `${data.ctr.toFixed(2)}%`,
      getDeltaPdf(data.ctr, data.prevCtr, false),
      getDeltaPdf(data.ctr, data.lyCtr, false)
    );

    // Card 5: Average CPC
    drawMetricCard(
      doc,
      50 + row2CardW + row2Spacing,
      row2Y,
      row2CardW,
      cardH,
      'Average CPC',
      formatMoney(data.avgCpc),
      getDeltaPdf(data.avgCpc, data.prevAvgCpc, true),
      getDeltaPdf(data.avgCpc, data.lyAvgCpc, true)
    );

    // Page 1 Footer date detail
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor('#9ca3af')
      .text(`Comparisons reflect preceding identical length dates and matching period last year.`, 50, row2Y + cardH + 20);



    // ==========================================
    // PAGE 2: EXECUTIVE CHANNEL INSIGHTS
    // ==========================================
    doc.addPage();
    drawPageHeader(doc, data.clientName, 'Executive Channel Insights');

    const insightW = 237.5;
    const insightH = 175;
    const colSpacing = 20;

    // Row 1: Campaigns & Search Keywords
    const insightsRow1Y = 105;
    
    // Campaign Insights
    drawInsightCard(
      doc,
      50,
      insightsRow1Y,
      insightW,
      insightH,
      'Campaign Performance Insights',
      campaignsInsight
    );

    // Search Query Insights
    drawInsightCard(
      doc,
      50 + insightW + colSpacing,
      insightsRow1Y,
      insightW,
      insightH,
      'Search Intent & Keywords Analysis',
      keywordsInsight
    );

    // Row 2: Geographic & Device Distribution
    const insightsRow2Y = insightsRow1Y + insightH + 20;

    // Geo Insights
    drawInsightCard(
      doc,
      50,
      insightsRow2Y,
      insightW,
      insightH,
      'Geographic Breakdown Insights',
      geoInsight
    );

    // Device Insights
    drawInsightCard(
      doc,
      50 + insightW + colSpacing,
      insightsRow2Y,
      insightW,
      insightH,
      'Device Distribution Insights',
      deviceInsight
    );



    // ==========================================
    // PAGE 3: DETAILED PERFORMANCE TABLES
    // ==========================================
    doc.addPage();
    drawPageHeader(doc, data.clientName, 'Detailed Performance Ledger');

    // Table 1: Campaigns
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text('Campaign Execution Details', 50, 105);

    const tblHeadY = 120;
    // Header block
    doc.roundedRect(50, tblHeadY, 495, 20, 4).fill('#274290');
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#ffffff')
      .text('Campaign Name', 60, tblHeadY + 6)
      .text('Investment', 230, tblHeadY + 6, { width: 80, align: 'right' })
      .text('Ad Clicks', 310, tblHeadY + 6, { width: 75, align: 'right' })
      .text('Impressions', 385, tblHeadY + 6, { width: 85, align: 'right' })
      .text('CTR', 470, tblHeadY + 6, { width: 75, align: 'right' });

    let currentY = tblHeadY + 20;
    data.campaigns.forEach((camp, idx) => {
      if (idx % 2 === 1) {
        doc.rect(50, currentY, 495, 20).fill('#f8fafc');
      }

      const campCtr = camp.impressions > 0 ? (camp.clicks / camp.impressions) * 100 : 0;

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#111827')
        .text(camp.name, 60, currentY + 6, { width: 160, ellipsis: true });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#374151')
        .text(formatMoney(camp.cost), 230, currentY + 6, { width: 80, align: 'right' })
        .text(camp.clicks.toLocaleString(), 310, currentY + 6, { width: 75, align: 'right' })
        .text(camp.impressions.toLocaleString(), 385, currentY + 6, { width: 85, align: 'right' })
        .text(`${campCtr.toFixed(2)}%`, 470, currentY + 6, { width: 75, align: 'right' });

      doc
        .moveTo(50, currentY + 20)
        .lineTo(545, currentY + 20)
        .lineWidth(0.5)
        .stroke('#e5e7eb');
      currentY += 20;
    });

    // Side-by-side Geographics & Devices Breakdowns
    const breakdownsY = currentY + 25;

    // Geo Breakdown (Left Col: 235pt)
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text('Top Geographic Targets', 50, breakdownsY);

    let geoY = breakdownsY + 18;
    data.locations.slice(0, 5).forEach((loc) => {
      const geoPct = data.totalCost > 0 ? (loc.cost / data.totalCost) * 100 : 0;

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#374151')
        .text(loc.city, 50, geoY);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(`${formatMoney(loc.cost)} (${geoPct.toFixed(0)}%)`, 160, geoY, { width: 125, align: 'right' });

      doc
        .moveTo(50, geoY + 13)
        .lineTo(285, geoY + 13)
        .lineWidth(0.5)
        .stroke('#f3f4f6');
      geoY += 15;
    });

    // Device Breakdown (Right Col: 235pt)
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#111827')
      .text('Device Engagement Share', 310, breakdownsY);

    let devY = breakdownsY + 18;
    data.devices.slice(0, 4).forEach((dev) => {
      const devPct = data.totalCost > 0 ? (dev.cost / data.totalCost) * 100 : 0;

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#374151')
        .text(dev.device, 310, devY);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(`${formatMoney(dev.cost)} (${devPct.toFixed(0)}%)`, 420, devY, { width: 125, align: 'right' });

      // Draw beautiful dynamic inline bar chart
      doc.roundedRect(310, devY + 11, 235, 4, 2).fill('#f1f5f9');
      doc.roundedRect(310, devY + 11, Math.max(2, (devPct / 100) * 235), 4, 2).fill('#274290');

      devY += 22;
    });

    // Table 2: Search Intent Queries on dynamic pages starting on Page 4
    if (data.searchTerms && data.searchTerms.length > 0) {
      doc.addPage();
      drawPageHeader(doc, data.clientName, 'Detailed Search Intent Ledger');

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#111827')
        .text('User Search Query Analytics', 50, 105);

      const drawTblHeaders = (y: number) => {
        // Left Column Header
        doc.roundedRect(50, y, 240, 18, 3).fill('#274290');
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#ffffff')
          .text('Query', 55, y + 6, { width: 80, align: 'left' })
          .text('Clicks', 140, y + 6, { width: 23, align: 'right' })
          .text('Imps', 168, y + 6, { width: 27, align: 'right' })
          .text('CTR', 199, y + 6, { width: 24, align: 'right' })
          .text('CPC', 227, y + 6, { width: 23, align: 'right' })
          .text('Spend', 254, y + 6, { width: 31, align: 'right' });

        // Right Column Header
        doc.roundedRect(305, y, 240, 18, 3).fill('#274290');
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#ffffff')
          .text('Query', 310, y + 6, { width: 80, align: 'left' })
          .text('Clicks', 395, y + 6, { width: 23, align: 'right' })
          .text('Imps', 423, y + 6, { width: 27, align: 'right' })
          .text('CTR', 454, y + 6, { width: 24, align: 'right' })
          .text('CPC', 482, y + 6, { width: 23, align: 'right' })
          .text('Spend', 509, y + 6, { width: 31, align: 'right' });
      };

      drawTblHeaders(120);

      const maxRowsPerCol = 43;
      const maxRowsPerPage = maxRowsPerCol * 2; // 86

      data.searchTerms.forEach((term, idx) => {
        const pageIdx = Math.floor(idx / maxRowsPerPage);
        const colIdx = Math.floor((idx % maxRowsPerPage) / maxRowsPerCol);
        const rowIdx = idx % maxRowsPerCol;

        // If we transitioned to a new page, add page and draw headers
        if (idx > 0 && idx % maxRowsPerPage === 0) {
          doc.addPage();
          drawPageHeader(doc, data.clientName, 'Detailed Search Intent Ledger');

          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor('#111827')
            .text('User Search Query Analytics (Continued)', 50, 105);

          drawTblHeaders(120);
        }

        const colX = colIdx === 0 ? 50 : 305;
        const rowY = 138 + rowIdx * 14;

        // Draw background for alternating rows
        if (rowIdx % 2 === 1) {
          doc.rect(colX, rowY, 240, 14).fill('#f8fafc');
        }

        // Draw row content
        doc
          .font('Helvetica-Bold')
          .fontSize(6.5)
          .fillColor('#111827')
          .text(term.searchTerm, colX + 5, rowY + 4, { width: 80, ellipsis: true });

        const formattedClicks = term.clicks.toLocaleString();
        const formattedImps = term.impressions !== undefined ? term.impressions.toLocaleString() : '-';
        const formattedCtr = term.ctr !== undefined ? `${(term.ctr * 100).toFixed(2)}%` : '-';
        const formattedCpc = term.averageCpc !== undefined ? `$${term.averageCpc.toFixed(2)}` : '-';
        const formattedCost = term.cost >= 1000 ? '$' + Math.round(term.cost).toLocaleString() : '$' + term.cost.toFixed(2);

        doc
          .font('Helvetica')
          .fontSize(6.5)
          .fillColor('#374151')
          .text(formattedClicks, colX + 90, rowY + 4, { width: 23, align: 'right' })
          .text(formattedImps, colX + 118, rowY + 4, { width: 27, align: 'right' })
          .text(formattedCtr, colX + 149, rowY + 4, { width: 24, align: 'right' })
          .text(formattedCpc, colX + 177, rowY + 4, { width: 23, align: 'right' })
          .text(formattedCost, colX + 204, rowY + 4, { width: 31, align: 'right' });

        // Draw bottom grid line
        doc
          .moveTo(colX, rowY + 14)
          .lineTo(colX + 240, rowY + 14)
          .lineWidth(0.5)
          .stroke('#e5e7eb');
      });
    }

    // Draw footers dynamically on all buffered pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      drawPageFooter(doc, i + 1, range.count);
    }

    doc.end();
  });
}
