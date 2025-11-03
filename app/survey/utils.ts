import { surveyData } from './data'

export interface SectionScoreDetail {
  score: number
  label: string
  statusStatement: string
  recommendations: string[]
}

export interface ScoreResult {
  overallScore: number
  label: string
  statusStatement: string
  generalRecommendations: string[]
  sectionScores: { [section: string]: number }
  sectionDetails: { [section: string]: SectionScoreDetail }
  flags: string[]
}

// Get label for a given score
function getLabelForScore(score: number): string {
  for (const rule of surveyData.scoring.label_rules) {
    if (score <= rule.max) {
      return rule.label
    }
  }
  return 'Optimized'
}

// Get status statement for overall score
function getOverallStatusStatement(score: number, label: string): string {
  const statements: { [key: string]: string } = {
    'Foundational': 'Your digital marketing foundation is just beginning. This is an exciting opportunity to build a strong base that will drive growth for years to come.',
    'Emerging': 'You\'re taking important steps toward digital maturity. With focused improvements, you can accelerate your growth and competitive advantage.',
    'Established': 'You have a solid digital marketing foundation. Strategic enhancements can help you reach the next level and maximize your return on investment.',
    'Advanced': 'Your digital marketing capabilities are strong. Fine-tuning and optimization can help you achieve industry-leading performance.',
    'Optimized': 'You operate at a sophisticated level with advanced digital marketing practices. Continuous innovation will help maintain your competitive edge.'
  }
  return statements[label] || statements['Foundational']
}

// Get general recommendations based on overall score
function getGeneralRecommendations(score: number, label: string): string[] {
  const allRecommendations: { [key: string]: string[] } = {
    'Foundational': [
      'Establish clear digital marketing goals and KPIs to track progress',
      'Invest in foundational tools: website, basic analytics, and social media presence',
      'Develop a consistent brand identity across all digital touchpoints',
      'Create a basic content strategy that aligns with your business objectives',
      'Consider working with an experienced digital marketing partner to accelerate your growth'
    ],
    'Emerging': [
      'Strengthen your measurement and tracking capabilities to understand what\'s working',
      'Optimize your website for conversions and user experience',
      'Develop a more structured content calendar and posting strategy',
      'Begin testing paid advertising channels to complement organic efforts',
      'Establish clear processes for managing customer relationships and data'
    ],
    'Established': [
      'Implement advanced analytics and attribution modeling to optimize spend',
      'Develop personalized customer journeys and automation workflows',
      'Strengthen your testing and experimentation capabilities',
      'Enhance integration between marketing tools and customer data',
      'Consider strategic partnerships to fill capability gaps and accelerate results'
    ],
    'Advanced': [
      'Implement predictive analytics and AI-powered optimization',
      'Develop sophisticated customer segmentation and personalization strategies',
      'Strengthen cross-channel attribution and unified reporting',
      'Invest in advanced automation and workflow optimization',
      'Partner with experts to explore cutting-edge strategies and technologies'
    ],
    'Optimized': [
      'Focus on continuous innovation and staying ahead of market trends',
      'Explore emerging channels and technologies with a test-and-learn approach',
      'Optimize existing programs for maximum efficiency and ROI',
      'Share best practices across your organization and mentor others',
      'Work with strategic partners to explore new opportunities and advanced capabilities'
    ]
  }
  return allRecommendations[label] || allRecommendations['Foundational']
}

// Get status statement for section
function getSectionStatusStatement(sectionId: string, score: number, label: string): string {
  const sectionMap: { [key: string]: { [key: string]: string } } = {
    'A': {
      'Foundational': 'Your business fundamentals are developing. Focus on defining your structure, processes, and decision-making frameworks.',
      'Emerging': 'You have basic business structures in place. Strengthening clarity and processes will improve your marketing effectiveness.',
      'Established': 'Your business foundation is solid. Clear processes and decision-making structures support your marketing efforts well.',
      'Advanced': 'Your business operates with sophisticated structures and processes that enable strong marketing performance.',
      'Optimized': 'Your business fundamentals are world-class, providing an exceptional foundation for marketing excellence.'
    },
    'B': {
      'Foundational': 'Your online presence needs significant development. A mobile-friendly website with basic SEO should be your first priority.',
      'Emerging': 'You have basic online presence but opportunities exist in mobile optimization, SEO, and conversion elements.',
      'Established': 'Your website performs well with solid technical foundations. Focus on advanced optimization and conversion improvements.',
      'Advanced': 'Your online presence is strong with advanced technical capabilities. Consider predictive and AI-powered enhancements.',
      'Optimized': 'Your website and online presence are industry-leading with exceptional performance and optimization.'
    },
    'C': {
      'Foundational': 'Social media presence is minimal or inconsistent. Developing a regular posting schedule and engagement strategy is essential.',
      'Emerging': 'You have basic social media activity. Consistency, quality content, and community engagement will drive better results.',
      'Established': 'Your social media strategy is solid. Advanced content, UGC, and community management can elevate your presence.',
      'Advanced': 'Your social media presence is sophisticated with strong engagement and brand consistency.',
      'Optimized': 'Your social media strategy is exceptional with outstanding content, engagement, and brand safety measures.'
    },
    'D': {
      'Foundational': 'Paid advertising is limited or not tracked. Establishing tracking and basic campaigns will provide valuable insights.',
      'Emerging': 'You have some paid advertising experience. Improving tracking, testing, and budget optimization will increase ROI.',
      'Established': 'Your advertising programs are well-structured. Advanced testing, cross-channel optimization, and attribution will enhance results.',
      'Advanced': 'Your advertising capabilities are strong with sophisticated testing and optimization in place.',
      'Optimized': 'Your advertising strategy is world-class with continuous optimization and advanced measurement capabilities.'
    },
    'E': {
      'Foundational': 'Customer management is manual or unstructured. A CRM system and basic lead tracking will significantly improve results.',
      'Emerging': 'You have basic customer management in place. Integrating systems and improving data hygiene will unlock more value.',
      'Established': 'Your customer management is well-organized. Advanced segmentation and workflow automation will enhance efficiency.',
      'Advanced': 'Your customer management is sophisticated with strong CRM integration and data quality.',
      'Optimized': 'Your customer management is exceptional with predictive analytics and advanced segmentation capabilities.'
    },
    'F': {
      'Foundational': 'Email marketing and automation are minimal. Basic email campaigns and simple automation workflows can drive immediate results.',
      'Emerging': 'You have basic email marketing in place. Developing triggered journeys and improving deliverability will increase engagement.',
      'Established': 'Your email marketing is well-structured. Advanced personalization and lifecycle tracking will improve performance.',
      'Advanced': 'Your email marketing is sophisticated with strong automation and personalization capabilities.',
      'Optimized': 'Your email marketing is world-class with AI-powered personalization and exceptional deliverability.'
    },
    'G': {
      'Foundational': 'Customer retention strategies are limited. Basic loyalty programs and post-purchase follow-up can improve lifetime value.',
      'Emerging': 'You have some retention efforts in place. Developing structured programs and improving response times will enhance loyalty.',
      'Established': 'Your retention strategy is solid. Advanced programs, omnichannel consistency, and customer feedback systems will improve results.',
      'Advanced': 'Your retention strategies are sophisticated with strong loyalty programs and customer experience management.',
      'Optimized': 'Your customer retention is exceptional with world-class loyalty programs and unified customer experiences.'
    },
    'H': {
      'Foundational': 'Analytics and measurement are basic or missing. Implementing proper tracking and basic dashboards is critical.',
      'Emerging': 'You have basic analytics in place. Improving event tracking, privacy compliance, and data integration will provide better insights.',
      'Established': 'Your analytics setup is solid. Advanced attribution, cross-channel reporting, and data integration will enhance decision-making.',
      'Advanced': 'Your analytics capabilities are strong with sophisticated reporting and data management.',
      'Optimized': 'Your analytics and measurement are world-class with advanced attribution and unified data platforms.'
    },
    'I': {
      'Foundational': 'Strategic planning and processes are informal. Documented strategies and clear processes will improve marketing effectiveness.',
      'Emerging': 'You have basic strategic planning in place. Strengthening documentation, vendor management, and review processes will enhance results.',
      'Established': 'Your strategic planning is solid. Advanced optimization, benchmarking, and capability building will drive growth.',
      'Advanced': 'Your strategic planning is sophisticated with strong processes and organizational alignment.',
      'Optimized': 'Your strategic planning is world-class with exceptional processes and continuous optimization.'
    },
    'J': {
      'Foundational': 'Innovation and technology adoption are limited. Exploring new tools and testing capabilities will keep you competitive.',
      'Emerging': 'You have some innovation efforts in place. Developing structured testing programs and exploring new technologies will drive growth.',
      'Established': 'Your innovation approach is solid. Advanced testing, AI exploration, and change management will enhance capabilities.',
      'Advanced': 'Your innovation capabilities are strong with sophisticated testing and technology adoption.',
      'Optimized': 'Your innovation and technology adoption are world-class with exceptional experimentation and change readiness.'
    },
    'K': {
      'Foundational': 'Growth mindset and marketing beliefs need development. Building confidence and strategic thinking will unlock potential.',
      'Emerging': 'You have positive attitudes toward marketing. Strengthening commitment, customer focus, and growth goals will accelerate results.',
      'Established': 'Your growth mindset is strong. Further investment in tools, customer understanding, and strategic partnerships will enhance success.',
      'Advanced': 'Your growth mindset and marketing beliefs are sophisticated with strong commitment to excellence.',
      'Optimized': 'Your growth mindset is world-class with exceptional commitment to digital leadership and customer-centricity.'
    }
  }
  
  const sectionStatements = sectionMap[sectionId]
  if (!sectionStatements) {
    return `Your ${label.toLowerCase()} performance indicates opportunities for growth.`
  }
  return sectionStatements[label] || sectionStatements['Foundational']
}

// Get recommendations for section
function getSectionRecommendations(sectionId: string, score: number, label: string): string[] {
  const sectionRecs: { [key: string]: string[] } = {
    'A': [
      'Document your business model and decision-making processes',
      'Clarify your market positioning and target audience',
      'Establish clear roles and responsibilities for marketing',
      'Develop a dedicated marketing budget with clear allocation',
      'Consider strategic guidance to accelerate your business development'
    ],
    'B': [
      'Ensure your website is fully mobile-responsive',
      'Implement basic SEO structure (meta tags, sitemap, schema)',
      'Add clear conversion elements (forms, CTAs, tracking)',
      'Set up basic analytics and conversion tracking',
      'Schedule regular website updates and security checks'
    ],
    'C': [
      'Establish a consistent posting schedule on key platforms',
      'Develop a content calendar aligned with your brand',
      'Improve response times to customer inquiries and comments',
      'Invest in quality visual assets and brand consistency',
      'Consider professional social media management support'
    ],
    'D': [
      'Implement comprehensive tracking (GA4, pixels, conversions)',
      'Define clear KPIs and performance targets',
      'Develop a structured testing program (A/B tests)',
      'Optimize budget allocation based on performance data',
      'Partner with experts to maximize your advertising ROI'
    ],
    'E': [
      'Implement or upgrade your CRM system',
      'Define clear lead lifecycle stages (MQL/SQL)',
      'Establish data hygiene and maintenance processes',
      'Develop customer segmentation strategies',
      'Create sales sequences and automation workflows'
    ],
    'F': [
      'Set up automated email journeys (welcome, nurture, re-engagement)',
      'Improve email deliverability (SPF, DKIM, DMARC)',
      'Implement personalization based on customer data',
      'Track lifecycle KPIs (opt-in rates, engagement, conversions)',
      'Integrate email marketing with your CRM and website'
    ],
    'G': [
      'Develop a structured loyalty or rewards program',
      'Implement automated post-purchase follow-up',
      'Establish customer support response SLAs',
      'Create consistent experiences across all channels',
      'Build systematic customer feedback collection'
    ],
    'H': [
      'Implement comprehensive event and conversion tracking',
      'Create custom dashboards for key stakeholders',
      'Ensure privacy and consent compliance (CMP)',
      'Improve data integration between systems',
      'Consider advanced analytics platforms for deeper insights'
    ],
    'I': [
      'Develop a documented annual marketing strategy',
      'Secure executive sponsorship for marketing initiatives',
      'Create vendor management and SLA frameworks',
      'Establish regular performance review cadences',
      'Build internal capability through training and certifications'
    ],
    'J': [
      'Explore AI tools for content creation and optimization',
      'Develop a structured experimentation backlog',
      'Create change management processes',
      'Test new technologies with pilot programs',
      'Partner with innovators to explore cutting-edge solutions'
    ],
    'K': [
      'Strengthen your commitment to marketing investment',
      'Set clear growth targets and measure progress',
      'Develop deeper customer journey understanding',
      'Build emotional connections with your audience',
      'Consider strategic consulting to accelerate your growth mindset'
    ]
  }
  
  // Adjust recommendations based on score
  const baseRecs = sectionRecs[sectionId] || []
  
  if (label === 'Foundational' || label === 'Emerging') {
    return baseRecs.slice(0, 5)
  } else if (label === 'Established') {
    return baseRecs.slice(0, 4)
  } else {
    return baseRecs.slice(0, 3)
  }
}

export function calculateScores(answers: { [key: string]: number }): ScoreResult {
  const sectionScores: { [section: string]: number } = {}
  const sectionDetails: { [section: string]: SectionScoreDetail } = {}
  const flags: string[] = []
  
  // Calculate average score for each section
  Object.keys(surveyData.weights).forEach(section => {
    const sectionQuestions = surveyData.questions.filter(q => q.section === section)
    const sectionAnswers = sectionQuestions
      .map(q => answers[q.id])
      .filter(score => score !== undefined)
    
    if (sectionAnswers.length > 0) {
      const avgScore = sectionAnswers.reduce((sum, val) => sum + val, 0) / sectionAnswers.length
      sectionScores[section] = avgScore
      const label = getLabelForScore(avgScore)
      sectionDetails[section] = {
        score: Math.round(avgScore * 100) / 100,
        label,
        statusStatement: getSectionStatusStatement(section, avgScore, label),
        recommendations: getSectionRecommendations(section, avgScore, label)
      }
    } else {
      sectionScores[section] = 0
      sectionDetails[section] = {
        score: 0,
        label: 'Foundational',
        statusStatement: getSectionStatusStatement(section, 0, 'Foundational'),
        recommendations: getSectionRecommendations(section, 0, 'Foundational')
      }
    }
  })
  
  // Calculate weighted overall score
  let overallScore = 0
  Object.keys(sectionScores).forEach(section => {
    overallScore += sectionScores[section] * (surveyData.weights[section as keyof typeof surveyData.weights] || 0)
  })
  
  // Apply label rules
  let label = 'Foundational'
  for (const rule of surveyData.scoring.label_rules) {
    if (overallScore <= rule.max) {
      label = rule.label
      break
    }
  }
  
  // Apply guards (caps)
  for (const guard of surveyData.scoring.guards) {
    if (guard.if.id) {
      const answer = answers[guard.if.id]
      if (answer !== undefined) {
        if (guard.if.lte && answer <= guard.if.lte) {
          const guardLabels = ['Foundational', 'Emerging', 'Established', 'Advanced', 'Optimized']
          const currentIndex = guardLabels.indexOf(label)
          const capIndex = guardLabels.indexOf(guard.cap)
          if (currentIndex > capIndex) {
            label = guard.cap
            flags.push(guard.note)
          }
        }
      }
    }
    if (guard.if.and) {
      const conditions = guard.if.and
      let allMatch = true
      conditions.forEach((cond: { id: string; lte?: number; gte?: number }) => {
        const answer = answers[cond.id]
        if (cond.lte && (answer === undefined || answer > cond.lte)) allMatch = false
        if (cond.gte && (answer === undefined || answer < cond.gte)) allMatch = false
      })
      if (allMatch && guard.flag) {
        flags.push(guard.flag)
      }
    }
  }
  
  return {
    overallScore: Math.round(overallScore * 100) / 100,
    label,
    statusStatement: getOverallStatusStatement(overallScore, label),
    generalRecommendations: getGeneralRecommendations(overallScore, label),
    sectionScores,
    sectionDetails,
    flags
  }
}

