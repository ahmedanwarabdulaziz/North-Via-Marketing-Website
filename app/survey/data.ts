export const surveyData = {
  scale_note: "All answers scored 1–5.",
  sections: [
    { 
      id: "1", 
      title: "Business Basics", 
      questions: ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10"], 
      required: true,
      description: "Understanding your business structure, size, and decision-making process.",
      nextDescription: "We'll explore your website and online presence."
    },
    { 
      id: "2", 
      title: "Website & Online Presence", 
      questions: ["B1","B2","B3","B4","B5","B6","B7","D1","D2","D3"], 
      required: true,
      description: "Reviewing your website's performance, mobile-friendliness, and tracking setup.",
      nextDescription: "We'll examine your social media activity and management."
    },
    { 
      id: "3", 
      title: "Social Media", 
      questions: ["C1","C2","C3","C4","C5","C6","C7","C8","C9","C10"], 
      required: true,
      description: "Evaluating your social media presence, posting frequency, and community engagement.",
      nextDescription: "We'll look at your advertising and testing strategies."
    },
    { 
      id: "4", 
      title: "Advertising & Testing", 
      questions: ["D4","D5","H1","H2","I6","I7","I8","J1","J2","J3"], 
      required: true,
      description: "Assessing your paid ads, testing programs, and analytics dashboards.",
      nextDescription: "We'll dive into customer management and retention."
    },
    { 
      id: "5", 
      title: "Customer Management", 
      questions: ["E1","E2","E3","E4","E5","E6","E7","G1","G2","G3"], 
      required: false,
      description: "Reviewing how you track customers, manage leads, and handle support.",
      nextDescription: "We'll explore email marketing and automation."
    },
    { 
      id: "6", 
      title: "Email & Automation", 
      questions: ["F1","F2","F3","F4","F5","G4","H3","H4","I4","I5"], 
      required: false,
      description: "Evaluating your email campaigns, automation workflows, and personalization.",
      nextDescription: "We'll examine your overall strategy and planning."
    },
    { 
      id: "7", 
      title: "Strategy & Planning", 
      questions: ["I1","I2","I3","J4","K1","K2","K3","K4","K5","K6"], 
      required: true,
      description: "Reviewing your marketing strategy, leadership support, and planning processes.",
      nextDescription: "We'll finish by exploring your growth mindset and openness to change."
    },
    { 
      id: "8", 
      title: "Growth Mindset", 
      questions: ["K7","K8","K9","K10","K11","K12","K13","K14","K15","K16"], 
      required: true,
      description: "Understanding your beliefs about marketing, willingness to adapt, and growth goals.",
      nextDescription: "Congratulations! You've completed all sections."
    }
  ],
  questions: [
    {"id":"A1","section":"A","text":"What type of business do you run?","options":[
      {"label":"Service-based business","value":1},{"label":"Product-based business","value":2},{"label":"Both services and products","value":3},{"label":"Franchise location","value":4},{"label":"Enterprise with multiple locations","value":5}
    ]},
    {"id":"A2","section":"A","text":"How clear is your business position in your industry?","options":[
      {"label":"Not clear at all","value":1},{"label":"Somewhat clear","value":2},{"label":"Pretty clear","value":3},{"label":"Very clear","value":4},{"label":"We have a strong unique position","value":5}
    ]},
    {"id":"A3","section":"A","text":"How long have you been in business?","options":[
      {"label":"Less than 1 year","value":1},{"label":"1–3 years","value":2},{"label":"4–6 years","value":3},{"label":"7–10 years","value":4},{"label":"More than 10 years","value":5}
    ]},
    {"id":"A4","section":"A","text":"How many full-time employees do you have?","options":[
      {"label":"Just me or 1–2 people","value":1},{"label":"3–5 people","value":2},{"label":"6–15 people","value":3},{"label":"16–50 people","value":4},{"label":"51 or more people","value":5}
    ]},
    {"id":"A5","section":"A","text":"What's your annual revenue?","options":[
      {"label":"Under $50,000","value":1},{"label":"$50,000–$250,000","value":2},{"label":"$250,000–$1 million","value":3},{"label":"$1 million–$5 million","value":4},{"label":"Over $5 million","value":5}
    ]},
    {"id":"A6","section":"A","text":"How well-defined is your business model?","options":[
      {"label":"It's not really defined yet","value":1},{"label":"We have a rough idea","value":2},{"label":"It's documented somewhere","value":3},{"label":"It's well thought out","value":4},{"label":"It's optimized and we can scale it","value":5}
    ]},
    {"id":"A7","section":"A","text":"How are decisions usually made in your business?","options":[
      {"label":"On the fly, no real system","value":1},{"label":"I make all the decisions","value":2},{"label":"A small team makes decisions","value":3},{"label":"We have a formal management structure","value":4},{"label":"We have departments or a board structure","value":5}
    ]},
    {"id":"A8","section":"A","text":"How involved are you in day-to-day operations?","options":[
      {"label":"I'm fully hands-off","value":1},{"label":"I mostly let others handle it","value":2},{"label":"I share the workload","value":3},{"label":"I'm mostly hands-on","value":4},{"label":"I run everything myself","value":5}
    ]},
    {"id":"A9","section":"A","text":"How comfortable are you with marketing and digital tools?","options":[
      {"label":"Not comfortable at all","value":1},{"label":"Basic understanding","value":2},{"label":"Pretty comfortable","value":3},{"label":"Very comfortable","value":4},{"label":"I'm an expert","value":5}
    ]},
    {"id":"A10","section":"A","text":"Do you have a dedicated marketing budget?","options":[
      {"label":"No budget set aside","value":1},{"label":"I spend occasionally when needed","value":2},{"label":"I set a yearly budget","value":3},{"label":"I budget monthly for marketing","value":4},{"label":"I adjust my budget based on results","value":5}
    ]},
    {"id":"B1","section":"B","text":"How well does your website work on phones and tablets?","options":[
      {"label":"I don't have a website yet","value":1},{"label":"It looks strange or slow on phones","value":2},{"label":"It works okay on phones","value":3},{"label":"It looks good and loads fine","value":4},{"label":"It looks great and loads super fast on all devices","value":5}
    ]},
    {"id":"B2","section":"B","text":"When was the last time you updated your website?","options":[
      {"label":"More than 2 years ago","value":1},{"label":"1–2 years ago","value":2},{"label":"6–12 months ago","value":3},{"label":"Every few months","value":4},{"label":"Monthly or continuously","value":5}
    ]},
    {"id":"B3","section":"B","text":"How often do you check your website's speed, errors, or security?","options":[
      {"label":"Never","value":1},{"label":"Maybe once a year","value":2},{"label":"Every 6 months","value":3},{"label":"Every few months","value":4},{"label":"Monthly and I fix issues","value":5}
    ]},
    {"id":"B4","section":"B","text":"How well is your website set up for search engines (SEO)?","options":[
      {"label":"Not set up at all","value":1},{"label":"Basic setup only","value":2},{"label":"Standard SEO with a sitemap","value":3},{"label":"Standard SEO plus structured data","value":4},{"label":"Advanced SEO with topic organization","value":5}
    ]},
    {"id":"B5","section":"B","text":"What tools do you have to capture leads on your website?","options":[
      {"label":"Nothing","value":1},{"label":"Just a basic contact form","value":2},{"label":"Forms plus clear call-to-action buttons","value":3},{"label":"Forms, chat, and tracking","value":4},{"label":"Tested funnels with ongoing A/B testing","value":5}
    ]},
    {"id":"B6","section":"B","text":"Is your website accessible to people with disabilities?","options":[
      {"label":"Not accessible","value":1},{"label":"I fix issues occasionally","value":2},{"label":"I do basic accessibility checks","value":3},{"label":"I check it regularly","value":4},{"label":"I have a policy and get regular audits","value":5}
    ]},
    {"id":"B7","section":"B","text":"How well do you collect and track visitor data on your website?","options":[
      {"label":"I don't track anything","value":1},{"label":"I collect emails only","value":2},{"label":"I use Google Analytics and track campaigns","value":3},{"label":"I track events and conversions","value":4},{"label":"I have advanced tracking with privacy compliance","value":5}
    ]},
    {"id":"C1","section":"C","text":"How many social media platforms are you actively using?","options":[
      {"label":"None","value":1},{"label":"1 platform","value":2},{"label":"2 platforms","value":3},{"label":"3 platforms","value":4},{"label":"4 or more platforms","value":5}
    ]},
    {"id":"C2","section":"C","text":"Who usually handles your social media posts?","options":[
      {"label":"No one really manages it","value":1},{"label":"I post things myself","value":2},{"label":"Someone from my team posts","value":3},{"label":"I work with a freelancer","value":4},{"label":"I have a marketing agency managing everything","value":5}
    ]},
    {"id":"C3","section":"C","text":"If you work with someone external, what type of help do you have?","options":[
      {"label":"I don't work with anyone","value":1},{"label":"An occasional freelancer","value":2},{"label":"One freelancer I work with regularly","value":3},{"label":"A small agency","value":4},{"label":"A specialized agency with clear goals","value":5}
    ]},
    {"id":"C4","section":"C","text":"How often do you post on social media?","options":[
      {"label":"Less than once a month","value":1},{"label":"About once a month","value":2},{"label":"About once a week","value":3},{"label":"2–4 times per week","value":4},{"label":"Daily or more","value":5}
    ]},
    {"id":"C5","section":"C","text":"Do you plan your social media posts in advance?","options":[
      {"label":"No plan at all","value":1},{"label":"I plan occasionally","value":2},{"label":"I plan monthly","value":3},{"label":"I plan weekly","value":4},{"label":"I have a rolling 6–12 week plan","value":5}
    ]},
    {"id":"C6","section":"C","text":"How professional and consistent are your social media images and branding?","options":[
      {"label":"Poor quality","value":1},{"label":"Inconsistent style","value":2},{"label":"Acceptable quality","value":3},{"label":"Good quality and mostly consistent","value":4},{"label":"Studio-quality and very consistent","value":5}
    ]},
    {"id":"C7","section":"C","text":"How quickly do you respond to comments and messages on social media?","options":[
      {"label":"I don't reply or it takes over 3 days","value":1},{"label":"Within 3 days","value":2},{"label":"Within 1–2 days","value":3},{"label":"Within 24 hours","value":4},{"label":"Within 4 hours and I track sentiment","value":5}
    ]},
    {"id":"C8","section":"C","text":"When did you last review your social media performance?","options":[
      {"label":"Never","value":1},{"label":"More than a year ago","value":2},{"label":"6–12 months ago","value":3},{"label":"Less than 6 months ago","value":4},{"label":"Every few months with action plans","value":5}
    ]},
    {"id":"C9","section":"C","text":"Do you use customer photos or work with influencers?","options":[
      {"label":"Not at all","value":1},{"label":"Rarely","value":2},{"label":"Occasionally","value":3},{"label":"Regularly","value":4},{"label":"Yes, with a structured program and contracts","value":5}
    ]},
    {"id":"C10","section":"C","text":"Do you have rules for what you post and how you handle negative comments?","options":[
      {"label":"No rules","value":1},{"label":"Informal guidelines","value":2},{"label":"Basic policy written down","value":3},{"label":"Documented policy","value":4},{"label":"Documented policy with tools to enforce it","value":5}
    ]},
    {"id":"D1","section":"D","text":"Are you running paid ads online?","options":[
      {"label":"No paid ads","value":1},{"label":"Just testing occasionally","value":2},{"label":"Seasonal or occasional campaigns","value":3},{"label":"Always running ads","value":4},{"label":"Always running ads with an experimentation plan","value":5}
    ]},
    {"id":"D2","section":"D","text":"How well do you track what happens after someone clicks your ads?","options":[
      {"label":"I don't track anything","value":1},{"label":"I only see how many people visited","value":2},{"label":"I track when someone fills a form or buys","value":3},{"label":"I track across all my channels","value":4},{"label":"I have a unified system showing all results","value":5}
    ]},
    {"id":"D3","section":"D","text":"How clear are you on which numbers matter most for your ads?","options":[
      {"label":"Not clear at all","value":1},{"label":"I look at likes and shares mostly","value":2},{"label":"I track clicks and conversions per channel","value":3},{"label":"I track the full customer journey","value":4},{"label":"I track business goals with clear targets","value":5}
    ]},
    {"id":"D4","section":"D","text":"Do you test different ad versions to see what works better?","options":[
      {"label":"No testing","value":1},{"label":"Occasional testing","value":2},{"label":"I test every few months","value":3},{"label":"I test monthly","value":4},{"label":"I test continuously","value":5}
    ]},
    {"id":"D5","section":"D","text":"How do you usually manage your marketing budget?","options":[
      {"label":"I set a budget and don't change it","value":1},{"label":"I adjust it a few times a year","value":3},{"label":"I review it every month","value":4},{"label":"I review it every week","value":4},{"label":"I adjust it regularly based on what works best","value":5}
    ]},
    {"id":"E1","section":"E","text":"Do you have a system to track customers and leads (like a CRM)?","options":[
      {"label":"No, I track things manually or not at all","value":1},{"label":"I use a spreadsheet or notes","value":2},{"label":"I use a simple CRM tool","value":3},{"label":"I use a CRM with some automation","value":4},{"label":"I have a CRM connected to my website and ads","value":5}
    ]},
    {"id":"E2","section":"E","text":"Do you have clear definitions for different types of leads?","options":[
      {"label":"No definitions","value":1},{"label":"Loose ideas about what's a good lead","value":2},{"label":"Clear definitions written down","value":3},{"label":"Definitions with agreed timelines for follow-up","value":4},{"label":"Definitions with dashboards and tracking","value":5}
    ]},
    {"id":"E3","section":"E","text":"How often do you clean up your customer data?","options":[
      {"label":"Never","value":1},{"label":"Maybe once a year","value":2},{"label":"Every few months","value":3},{"label":"Monthly","value":4},{"label":"Ongoing with automatic rules","value":5}
    ]},
    {"id":"E4","section":"E","text":"How well do you organize customers into groups?","options":[
      {"label":"I don't organize them","value":1},{"label":"Basic lists","value":2},{"label":"By profile and behavior","value":3},{"label":"By value and lifetime customer worth","value":4},{"label":"With predictive scoring","value":5}
    ]},
    {"id":"E5","section":"E","text":"Do you have email sequences or sales follow-up processes?","options":[
      {"label":"No sequences","value":1},{"label":"I send occasional emails","value":2},{"label":"I have email sequences","value":3},{"label":"I have multi-step sequences","value":4},{"label":"I have personalized sequences based on customer type","value":5}
    ]},
    {"id":"E6","section":"E","text":"How many of your team members actively use your CRM?","options":[
      {"label":"Less than 25% use it","value":1},{"label":"25–49% use it","value":2},{"label":"50–74% use it","value":3},{"label":"75–89% use it","value":4},{"label":"90% or more use it","value":5}
    ]},
    {"id":"E7","section":"E","text":"Does your team agree on what success looks like for your CRM?","options":[
      {"label":"No agreement","value":1},{"label":"Mixed opinions","value":2},{"label":"Drafted but not finalized","value":3},{"label":"Agreed upon","value":4},{"label":"Agreed and reported monthly","value":5}
    ]},
    {"id":"F1","section":"F","text":"Do you use an email marketing platform for automation?","options":[
      {"label":"No automation platform","value":1},{"label":"Just tried it out","value":2},{"label":"Basic setup","value":3},{"label":"Advanced setup","value":4},{"label":"Fully integrated with my CRM and website","value":5}
    ]},
    {"id":"F2","section":"F","text":"Do your emails or messages send automatically (like welcome emails or reminders)?","options":[
      {"label":"No automated messages at all","value":1},{"label":"I have one automatic email or message","value":2},{"label":"I have a few automatic messages","value":3},{"label":"I have a full set of welcome and reminder emails","value":4},{"label":"My system sends the right message based on each customer's actions","value":5}
    ]},
    {"id":"F3","section":"F","text":"How personalized are your marketing emails?","options":[
      {"label":"Not personalized","value":1},{"label":"By channel only","value":2},{"label":"Basic personalization with names","value":3},{"label":"Dynamic content blocks","value":4},{"label":"Predictive or AI-powered personalization","value":5}
    ]},
    {"id":"F4","section":"F","text":"How do you ensure your emails actually reach customers' inboxes?","options":[
      {"label":"I don't check deliverability","value":1},{"label":"I just maintain my list","value":2},{"label":"I've set up email authentication","value":3},{"label":"I manage list hygiene and email security","value":4},{"label":"I do regular audits and use advanced security","value":5}
    ]},
    {"id":"F5","section":"F","text":"How well do you track email campaign performance?","options":[
      {"label":"I don't track email performance","value":1},{"label":"I track some things","value":2},{"label":"I track opens, clicks, and conversions","value":3},{"label":"I track those plus customer groups over time","value":4},{"label":"I track lifetime value and retention","value":5}
    ]},
    {"id":"G1","section":"G","text":"Do you reward returning customers?","options":[
      {"label":"Not yet","value":1},{"label":"I track repeat buyers manually","value":2},{"label":"I give discount codes to regulars","value":3},{"label":"I use a loyalty app or platform","value":4},{"label":"I have a system that automatically tracks and rewards loyal customers","value":5}
    ]},
    {"id":"G2","section":"G","text":"How do you measure customer satisfaction after they buy?","options":[
      {"label":"I don't measure it","value":1},{"label":"Occasionally I ask","value":2},{"label":"Every few months","value":3},{"label":"About once a month","value":4},{"label":"Automatically after every order","value":5}
    ]},
    {"id":"G3","section":"G","text":"How quickly do you respond to customer support requests?","options":[
      {"label":"No set response time","value":1},{"label":"Over 3 days","value":2},{"label":"1–2 days","value":3},{"label":"Within 24 hours","value":4},{"label":"Within 4 hours with clear escalation","value":5}
    ]},
    {"id":"G4","section":"G","text":"How consistent is the customer experience across all your channels?","options":[
      {"label":"Not consistent","value":1},{"label":"Low consistency","value":2},{"label":"Medium consistency","value":3},{"label":"High consistency","value":4},{"label":"Unified experience everywhere","value":5}
    ]},
    {"id":"H1","section":"H","text":"How well do you track what visitors do on your website?","options":[
      {"label":"I don't track anything","value":1},{"label":"I only see how many people visit","value":2},{"label":"I track clicks or form fills","value":3},{"label":"I track the whole journey from visit to sale","value":4},{"label":"I have advanced tracking showing clear results and trends","value":5}
    ]},
    {"id":"H2","section":"H","text":"What kind of dashboards or reports do you use?","options":[
      {"label":"No dashboards","value":1},{"label":"Just Google Analytics","value":2},{"label":"I use a business intelligence tool","value":3},{"label":"I have cross-channel dashboards","value":4},{"label":"I have executive-level scorecards","value":5}
    ]},
    {"id":"H3","section":"H","text":"How do you handle privacy and consent for tracking?","options":[
      {"label":"I don't handle it","value":1},{"label":"Basic cookie banner","value":2},{"label":"I have a consent management system","value":3},{"label":"Consent system with records","value":4},{"label":"Audited compliance program","value":5}
    ]},
    {"id":"H4","section":"H","text":"How do you connect data from different tools?","options":[
      {"label":"I export files manually","value":1},{"label":"I use Zapier or similar","value":2},{"label":"I use an integration platform","value":3},{"label":"I use a customer data platform","value":4},{"label":"I use a customer data platform with identity resolution","value":5}
    ]},
    {"id":"I1","section":"I","text":"Do you have a documented digital marketing strategy?","options":[
      {"label":"No strategy document","value":1},{"label":"Draft only","value":2},{"label":"Approved plan","value":3},{"label":"Plan with quarterly reviews","value":4},{"label":"Plan with quarterly reviews linked to budget","value":5}
    ]},
    {"id":"I2","section":"I","text":"How much support do you get from leadership for data-driven marketing?","options":[
      {"label":"No support","value":1},{"label":"Occasional support","value":2},{"label":"Functional manager supports it","value":3},{"label":"Executive supports it","value":4},{"label":"CEO-level support","value":5}
    ]},
    {"id":"I3","section":"I","text":"How do you keep your team's marketing skills up to date?","options":[
      {"label":"No training plan","value":1},{"label":"Occasional training","value":2},{"label":"Annual training plan","value":3},{"label":"Quarterly training plan","value":4},{"label":"Ongoing training with clear objectives","value":5}
    ]},
    {"id":"I4","section":"I","text":"How do you manage your marketing vendors and partners?","options":[
      {"label":"No vendor management","value":1},{"label":"Single vendor","value":2},{"label":"2–3 vendors","value":3},{"label":"Clear roles and agreements","value":4},{"label":"Scorecards and quarterly reviews","value":5}
    ]},
    {"id":"I5","section":"I","text":"How do you balance brand building vs performance marketing?","options":[
      {"label":"I don't know the balance","value":1},{"label":"It varies randomly","value":2},{"label":"Rough split","value":3},{"label":"Planned mix","value":4},{"label":"Optimized through testing and analysis","value":5}
    ]},
    {"id":"I6","section":"I","text":"How often do you compare yourself to competitors?","options":[
      {"label":"Never","value":1},{"label":"Yearly","value":2},{"label":"Twice a year","value":3},{"label":"Quarterly","value":4},{"label":"Ongoing tracking of share and creative","value":5}
    ]},
    {"id":"I7","section":"I","text":"How well are your marketing processes documented?","options":[
      {"label":"Not documented","value":1},{"label":"Partial notes","value":2},{"label":"Some departments documented","value":3},{"label":"Mostly documented","value":4},{"label":"Fully standardized and documented","value":5}
    ]},
    {"id":"I8","section":"I","text":"How often do you review marketing performance?","options":[
      {"label":"Never","value":1},{"label":"Annually","value":2},{"label":"Quarterly","value":3},{"label":"Monthly","value":4},{"label":"Weekly or real-time","value":5}
    ]},
    {"id":"J1","section":"J","text":"Are you using AI for content, ads, or operations?","options":[
      {"label":"Not using AI","value":1},{"label":"Just testing","value":2},{"label":"Limited pilots","value":3},{"label":"Multiple pilots","value":4},{"label":"Embedded with safeguards","value":5}
    ]},
    {"id":"J2","section":"J","text":"How often do you run experiments to improve things?","options":[
      {"label":"No experiments","value":1},{"label":"Occasionally","value":2},{"label":"Every few months","value":3},{"label":"Monthly","value":4},{"label":"Continuously with a learning plan","value":5}
    ]},
    {"id":"J3","section":"J","text":"How do you approach new technology?","options":[
      {"label":"I prefer traditional methods","value":1},{"label":"I test new things occasionally","value":2},{"label":"I'm open but cautious","value":3},{"label":"I actively try new tools","value":4},{"label":"I'm an early adopter","value":5}
    ]},
    {"id":"J4","section":"J","text":"How open are you and your team to trying new ideas or tools?","options":[
      {"label":"We don't like changing how we work","value":1},{"label":"We prefer to stick to what we know","value":2},{"label":"Depends on the idea","value":3},{"label":"We're open to new ideas","value":4},{"label":"We love testing and improving things often","value":5}
    ]},
    {"id":"K1","section":"K","text":"Do you believe better marketing can help your business earn more?","options":[
      {"label":"No, I don't think marketing makes a big difference","value":1},{"label":"Not really sure","value":2},{"label":"Maybe a little","value":3},{"label":"Yes, it probably would","value":4},{"label":"Definitely — marketing is key to growth","value":5}
    ]},
    {"id":"K2","section":"K","text":"How much revenue growth do you expect from better marketing?","options":[
      {"label":"0–5% increase","value":1},{"label":"6–15% increase","value":2},{"label":"16–30% increase","value":3},{"label":"31–50% increase","value":4},{"label":"Over 50% increase","value":5}
    ]},
    {"id":"K3","section":"K","text":"How confident are you adapting to digital changes?","options":[
      {"label":"Not confident","value":1},{"label":"Slightly confident","value":2},{"label":"Neutral","value":3},{"label":"Quite confident","value":4},{"label":"Very confident","value":5}
    ]},
    {"id":"K4","section":"K","text":"How proud are you of your current online presence?","options":[
      {"label":"Not proud","value":1},{"label":"Slightly proud","value":2},{"label":"Somewhat proud","value":3},{"label":"Very proud","value":4},{"label":"Extremely proud","value":5}
    ]},
    {"id":"K5","section":"K","text":"How much time does marketing take away from other work?","options":[
      {"label":"No time drain","value":1},{"label":"Low time drain","value":2},{"label":"Moderate time drain","value":3},{"label":"High time drain","value":4},{"label":"Very high time drain","value":5}
    ]},
    {"id":"K6","section":"K","text":"How often do you worry competitors are ahead digitally?","options":[
      {"label":"Never worry","value":1},{"label":"Rarely worry","value":2},{"label":"Sometimes worry","value":3},{"label":"Often worry","value":4},{"label":"Constantly worry","value":5}
    ]},
    {"id":"K7","section":"K","text":"How urgent is improving customer retention and loyalty?","options":[
      {"label":"Not urgent","value":1},{"label":"Low urgency","value":2},{"label":"Moderate urgency","value":3},{"label":"High urgency","value":4},{"label":"Critical priority","value":5}
    ]},
    {"id":"K8","section":"K","text":"Do you feel your current setup limits growth?","options":[
      {"label":"Not at all","value":1},{"label":"A little","value":2},{"label":"Somewhat","value":3},{"label":"Significantly","value":4},{"label":"Severely","value":5}
    ]},
    {"id":"K9","section":"K","text":"How important is understanding your customer journey?","options":[
      {"label":"Not important","value":1},{"label":"Low importance","value":2},{"label":"Medium importance","value":3},{"label":"High importance","value":4},{"label":"Top priority","value":5}
    ]},
    {"id":"K10","section":"K","text":"How often do you check what customers say about your business?","options":[
      {"label":"I never look at feedback","value":1},{"label":"Once in a while","value":2},{"label":"Every few months","value":3},{"label":"About once a month","value":4},{"label":"I always keep an eye on it and respond quickly","value":5}
    ]},
    {"id":"K11","section":"K","text":"How emotionally connected do customers feel to your brand?","options":[
      {"label":"No connection","value":1},{"label":"Little connection","value":2},{"label":"Some connection","value":3},{"label":"Strong connection","value":4},{"label":"Very strong connection","value":5}
    ]},
    {"id":"K12","section":"K","text":"How willing are you to change your business model if needed?","options":[
      {"label":"Not willing","value":1},{"label":"Slightly willing","value":2},{"label":"Neutral","value":3},{"label":"Willing","value":4},{"label":"Fully willing","value":5}
    ]},
    {"id":"K13","section":"K","text":"How committed are you to investing in new tools in the next year?","options":[
      {"label":"Not committed","value":1},{"label":"Slightly committed","value":2},{"label":"Somewhat committed","value":3},{"label":"Very committed","value":4},{"label":"Absolutely committed","value":5}
    ]},
    {"id":"K14","section":"K","text":"How much do you want to be seen as a digital leader?","options":[
      {"label":"Not at all","value":1},{"label":"A little","value":2},{"label":"Moderate","value":3},{"label":"High priority","value":4},{"label":"Top priority","value":5}
    ]},
    {"id":"K15","section":"K","text":"What growth do you expect from digital marketing next year?","options":[
      {"label":"0–5% growth","value":1},{"label":"6–15% growth","value":2},{"label":"16–30% growth","value":3},{"label":"31–50% growth","value":4},{"label":"Over 50% growth","value":5}
    ]},
    {"id":"K16","section":"K","text":"How open are you to mentoring or consulting help?","options":[
      {"label":"Not open","value":1},{"label":"Slightly open","value":2},{"label":"Neutral","value":3},{"label":"Open","value":4},{"label":"Very open","value":5}
    ]}
  ],
  weights: {"A":0.10,"B":0.15,"C":0.10,"D":0.10,"E":0.10,"F":0.10,"G":0.10,"H":0.10,"I":0.08,"J":0.02,"K":0.05},
  scoring: {
    label_rules: [
      {"max":2.099,"label":"Foundational"},
      {"max":3.099,"label":"Emerging"},
      {"max":4.099,"label":"Established"},
      {"max":4.599,"label":"Advanced"},
      {"max":5.000,"label":"Optimized"}
    ],
    guards: [
      {"if":{"id":"D2","lte":2},"cap":"Established","note":"Weak tracking caps level at Established."},
      {"if":{"id":"H3","lte":2},"cap":"Advanced","note":"Weak privacy/consent caps level at Advanced."},
      {"if":{"and":[{"id":"E1","lte":2},{"id":"F2","gte":3}]},"flag":"Automation without CRM backbone."}
    ]
  }
}
