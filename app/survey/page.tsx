'use client'

import { useState, useMemo, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, Trophy, BarChart3, TrendingUp, Target, AlertTriangle, Users, MessageSquare, ArrowRight, Mail, Phone } from 'lucide-react'
import { surveyData } from './data'
import { calculateScores, ScoreResult } from './utils'

export default function Survey() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: string]: number }>({})
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [showSectionTransition, setShowSectionTransition] = useState(false)
  const [previousSection, setPreviousSection] = useState<typeof surveyData.sections[0] | null>(null)
  const [shownTransitions, setShownTransitions] = useState<Set<string>>(new Set())
  
  // Email form state
  const [emailForm, setEmailForm] = useState({
    name: '',
    email: '',
    company: ''
  })
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const [emailSubmitStatus, setEmailSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [emailErrorMessage, setEmailErrorMessage] = useState('')
  
  // Get all question IDs in order
  const allQuestionIds = useMemo(() => {
    return surveyData.sections.flatMap(section => section.questions)
  }, [])
  
  const questionId = allQuestionIds[currentQuestion]
  const question = surveyData.questions.find(q => q.id === questionId)
  
  // Get current section info
  const getCurrentSectionInfo = () => {
    for (let i = 0; i < surveyData.sections.length; i++) {
      const section = surveyData.sections[i]
      if (section.questions.includes(questionId)) {
        return { section, index: i }
      }
    }
    return { section: surveyData.sections[0], index: 0 }
  }
  
  const { section: currentSectionInfo, index: currentSectionIndex } = getCurrentSectionInfo()
  
  // Check if we just entered a new section (only on first question, skip first section)
  useEffect(() => {
    if (!questionId || showSectionTransition || showIntro) return
    
    const currentSection = surveyData.sections.find(s => s.questions.includes(questionId))
    if (!currentSection) return
    
    // Check if this is the first question of a section (and not section 1)
    const isFirstQuestion = currentSection.questions[0] === questionId
    
    // Only show transition if we haven't shown it for this section yet
    if (isFirstQuestion && currentSectionIndex > 0 && !shownTransitions.has(currentSection.id)) {
      const prevSection = surveyData.sections[currentSectionIndex - 1]
      setPreviousSection(prevSection)
      setShowSectionTransition(true)
    }
  }, [questionId, currentSectionIndex, showSectionTransition, showIntro, shownTransitions])
  const sectionProgress = useMemo(() => {
    const requiredAnswers = currentSectionInfo.questions.filter(qId => answers[qId] !== undefined).length
    return (requiredAnswers / currentSectionInfo.questions.length) * 100
  }, [answers, currentSectionInfo])
  
  // Calculate if survey is complete (all required sections)
  const isComplete = useMemo(() => {
    const requiredSections = surveyData.sections.filter(s => s.required)
    return requiredSections.every(section => 
      section.questions.every(qId => answers[qId] !== undefined)
    )
  }, [answers])
  
  // Calculate results when complete
  const results: ScoreResult | null = useMemo(() => {
    if (isComplete) {
      return calculateScores(answers)
    }
    return null
  }, [isComplete, answers])

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingEmail(true)
    setEmailSubmitStatus('idle')
    setEmailErrorMessage('')

    if (!emailForm.name || !emailForm.email) {
      setEmailErrorMessage('Name and email are required')
      setIsSubmittingEmail(false)
      return
    }

    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: emailForm.name,
          email: emailForm.email,
          company: emailForm.company || undefined,
          results: results,
          answers: answers
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setEmailSubmitStatus('success')
    } catch (error: any) {
      console.error('Email submission error:', error)
      setEmailSubmitStatus('error')
      setEmailErrorMessage(error.message || 'Something went wrong. Please try again or contact us directly.')
    } finally {
      setIsSubmittingEmail(false)
    }
  }
  
  // Auto-show results when complete
  useEffect(() => {
    if (isComplete && !showResults) {
      const timer = setTimeout(() => setShowResults(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isComplete, showResults])

  const handleOptionSelect = (value: number) => {
    if (!questionId) return
    
    const newAnswers = {
      ...answers,
      [questionId]: value
    }
    setAnswers(newAnswers)
    
    // Check if all required questions are answered
    const requiredSections = surveyData.sections.filter(s => s.required)
    const allRequiredAnswered = requiredSections.every(section => 
      section.questions.every(qId => {
        if (qId === questionId) return value !== undefined
        return newAnswers[qId] !== undefined
      })
    )
    
    // Auto-advance to next question after a short delay (except on last question)
    if (currentQuestion < allQuestionIds.length - 1 && !allRequiredAnswered) {
      setIsAdvancing(true)
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1)
        setIsAdvancing(false)
      }, 400)
    } else if (allRequiredAnswered) {
      // Show results after completing required sections
      setTimeout(() => {
        setShowResults(true)
      }, 500)
    }
  }
  
  const handleComplete = () => {
    if (isComplete) {
      setShowResults(true)
    }
  }

  const handleNext = () => {
    if (questionId && answers[questionId]) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }
  
  const handleSkipSection = () => {
    // Skip to next section if current is optional
    if (!currentSectionInfo.required) {
      const currentSectionIndex = surveyData.sections.findIndex(s => s.id === currentSectionInfo.id)
      if (currentSectionIndex < surveyData.sections.length - 1) {
        const nextSection = surveyData.sections[currentSectionIndex + 1]
        const nextSectionFirstIndex = allQuestionIds.findIndex(qId => nextSection.questions.includes(qId))
        if (nextSectionFirstIndex !== -1) {
          setCurrentQuestion(nextSectionFirstIndex)
        }
      }
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  // Show intro screen - Mobile optimized (fits screen height)
  if (showIntro) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center overflow-hidden">
        <div className="max-w-2xl mx-auto w-full px-4 h-full flex items-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-12 text-center w-full max-h-[95vh] overflow-y-auto">
            <div className="mb-4 md:mb-6">
              <div className="inline-block bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-4 md:px-8 py-3 md:py-4 rounded-full mb-4">
                <h1 className="text-2xl md:text-4xl font-black">Business Marketing Assessment</h1>
              </div>
              <p className="text-lg md:text-2xl text-gray-700 font-medium mb-4 md:mb-6">
                Discover your digital marketing maturity level
              </p>
            </div>
            
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 text-left">
              <div className="flex items-start gap-3 p-3 md:p-4 bg-blue-50 rounded-lg">
                <div className="text-xl md:text-2xl flex-shrink-0">⏱️</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#274290] mb-1 text-sm md:text-base">Takes about 10–15 minutes</div>
                  <div className="text-gray-600 text-xs md:text-sm">You can pause anytime and continue later</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 md:p-4 bg-orange-50 rounded-lg">
                <div className="text-xl md:text-2xl flex-shrink-0">📊</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#274290] mb-1 text-sm md:text-base">Instant summary preview</div>
                  <div className="text-gray-600 text-xs md:text-sm">See your results right away</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 md:p-4 bg-green-50 rounded-lg">
                <div className="text-xl md:text-2xl flex-shrink-0">📧</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#274290] mb-1 text-sm md:text-base">Detailed report by email</div>
                  <div className="text-gray-600 text-xs md:text-sm">Get a comprehensive analysis delivered to your inbox</div>
                </div>
              </div>
            </div>
            
            <div className="mb-4 md:mb-6">
              <div className="text-xs md:text-sm text-gray-600 mb-2">8 sections • 100 questions total</div>
              <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
                {surveyData.sections.map(sec => (
                  <div key={sec.id} className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${
                    sec.required 
                      ? 'bg-[#274290] text-white' 
                      : 'bg-gray-200 text-gray-600 border border-gray-300'
                  }`}>
                    {sec.id}. {sec.title}
                    {!sec.required && <span className="ml-1">(Opt)</span>}
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setShowIntro(false)}
              className="w-full bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show section transition screen
  if (showSectionTransition && previousSection && currentSectionInfo) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center overflow-hidden">
        <div className="max-w-2xl mx-auto w-full px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center">
            {/* Previous Section Summary */}
            <div className="mb-6">
              <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-3">
                ✓ Section {previousSection.id} Complete
              </div>
              <h2 className="text-lg md:text-2xl font-bold text-[#274290] mb-2">
                {previousSection.title}
              </h2>
              <p className="text-sm md:text-base text-gray-600">
                {previousSection.description}
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full"></div>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-gray-300 to-transparent"></div>
            </div>

            {/* Next Section Preview */}
            <div className="mb-6">
              <div className="inline-block bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-3">
                Section {currentSectionInfo.id}
              </div>
              <h2 className="text-lg md:text-2xl font-bold text-[#274290] mb-2">
                {currentSectionInfo.title}
                {!currentSectionInfo.required && <span className="text-sm text-gray-500 ml-2">(Optional)</span>}
              </h2>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                {currentSectionInfo.nextDescription || currentSectionInfo.description}
              </p>
              <div className="text-xs md:text-sm text-gray-500">
                {currentSectionInfo.questions.length} questions
              </div>
            </div>

            <button
              onClick={() => {
                setShowSectionTransition(false)
                // Mark this section transition as shown
                setShownTransitions(prev => new Set([...prev, currentSectionInfo.id]))
              }}
              className="w-full bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Continue to Section {currentSectionInfo.id}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show results preview screen
  if (showResults && results) {
    // Get section mapping for display
    const sectionTitleMap: { [key: string]: string } = {
      'A': 'Business Basics',
      'B': 'Website & Online Presence',
      'C': 'Social Media',
      'D': 'Advertising & Testing',
      'E': 'Customer Management',
      'F': 'Email & Automation',
      'G': 'Customer Retention',
      'H': 'Analytics & Measurement',
      'I': 'Strategy & Planning',
      'J': 'Innovation & Technology',
      'K': 'Growth Mindset'
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 md:py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Results Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-6 py-3 rounded-full mb-4">
              <Trophy className="inline w-6 h-6 mr-2" />
              <span className="font-bold">Assessment Complete</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-[#274290] mb-4">
              Your Business Marketing Assessment Results
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Based on your responses, we've prepared a comprehensive analysis of your digital marketing maturity and opportunities for growth.
            </p>
          </div>

          {/* Overall Score Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 mb-6">
            <div className="text-center mb-6">
              <div className="text-6xl md:text-8xl font-black bg-gradient-to-r from-[#274290] to-[#f27921] bg-clip-text text-transparent mb-2">
                {Math.round((results.overallScore / 5) * 100)}/100
              </div>
              <div className="text-2xl md:text-3xl font-bold text-[#274290] mb-4">
                {results.label} Level
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 max-w-md mx-auto mb-6">
                <div
                  className="bg-gradient-to-r from-[#274290] to-[#f27921] h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${(results.overallScore / 5) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Business Status Statement */}
            <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl p-6 mb-6 border-l-4 border-[#f27921]">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-6 h-6 text-[#f27921] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-[#274290] mb-2">Your Business Status</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {results.statusStatement}
                  </p>
                </div>
              </div>
            </div>

            {/* General Recommendations */}
            <div>
              <h3 className="text-xl font-bold text-[#274290] mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Recommended Next Steps
              </h3>
              <div className="space-y-3">
                {results.generalRecommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-[#274290] to-[#f27921] flex items-center justify-center text-white font-bold text-sm mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 flex-1">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section Breakdown */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-[#274290] mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Detailed Section Analysis
            </h2>
            <p className="text-gray-600 mb-6">
              Here's how each area of your digital marketing is performing, along with specific recommendations for improvement.
            </p>
            
            <div className="space-y-6">
              {Object.keys(surveyData.weights).map(section => {
                const detail = results.sectionDetails[section]
                if (!detail) return null
                
                const sectionTitle = sectionTitleMap[section] || `Section ${section}`
                const weight = surveyData.weights[section as keyof typeof surveyData.weights] || 0
                
                return (
                  <div key={section} className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#274290] transition-all">
                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-[#274290]">{sectionTitle}</h3>
                          <span className="px-3 py-1 bg-gradient-to-r from-[#274290] to-[#f27921] text-white text-sm font-semibold rounded-full">
                            {detail.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-semibold">Score: {Math.round((detail.score / 5) * 100)}/100</span>
                          <span>•</span>
                          <span>Weight: {(weight * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full md:w-32 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-[#274290] to-[#f27921] h-3 rounded-full transition-all duration-500"
                          style={{ width: `${(detail.score / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Statement */}
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-gray-700 leading-relaxed">
                        {detail.statusStatement}
                      </p>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#274290] mb-3 uppercase tracking-wide">
                        Recommendations for {sectionTitle}
                      </h4>
                      <ul className="space-y-2">
                        {detail.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-[#f27921] flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 flex-1">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Flags/Warnings */}
          {results.flags.length > 0 && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Important Considerations
              </h3>
              <ul className="space-y-2">
                {results.flags.map((flag, index) => (
                  <li key={index} className="text-orange-700 flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trust Building & Contact Section */}
          <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-6 md:p-10 text-white mb-6">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Take Your Digital Marketing to the Next Level?
              </h3>
              <p className="text-lg opacity-95 mb-6 leading-relaxed">
                Our team specializes in helping businesses like yours achieve their digital marketing goals. 
                Whether you're just starting out or looking to optimize existing programs, we have the expertise 
                and proven strategies to drive measurable results.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <Target className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Custom Strategies</p>
                  <p className="text-xs opacity-90">Tailored to your business</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Proven Results</p>
                  <p className="text-xs opacity-90">Data-driven approaches</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Expert Guidance</p>
                  <p className="text-xs opacity-90">Dedicated partnership</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#274290] px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Schedule a Free Consultation
                  <MessageSquare className="w-5 h-5" />
                </a>
                <a
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/10 transition-all duration-300"
                >
                  Explore Our Services
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Email Collection Form */}
          {emailSubmitStatus === 'success' ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 md:p-8 text-center mb-6">
              <Mail className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-800 mb-3">✓ Report Sent Successfully!</h3>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Your detailed assessment report has been sent to <strong>{emailForm.email}</strong>. 
                Please check your inbox (and spam folder) for your personalized business marketing roadmap.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 md:p-8 mb-6">
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 text-[#274290] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[#274290] mb-3">Get Your Detailed Report by Email</h3>
                <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                  Enter your email below to receive a comprehensive PDF report with deeper insights, actionable strategies, 
                  and next steps delivered straight to your inbox.
                </p>
              </div>
              
              <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-[#274290] mb-2">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={emailForm.name}
                      onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#274290] focus:outline-none transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-[#274290] mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#274290] focus:outline-none transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="company" className="block text-sm font-semibold text-[#274290] mb-2">
                      Company (Optional)
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={emailForm.company}
                      onChange={(e) => setEmailForm({ ...emailForm, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#274290] focus:outline-none transition-colors"
                      placeholder="Your Company Name"
                    />
                  </div>
                  
                  {emailSubmitStatus === 'error' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <p className="text-red-700 text-sm">{emailErrorMessage}</p>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSubmittingEmail || !emailForm.name || !emailForm.email}
                    className={`w-full bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      isSubmittingEmail || !emailForm.name || !emailForm.email
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-105'
                    }`}
                  >
                    {isSubmittingEmail ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        <span>Send My Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Secondary CTA */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">Want to discuss your results right away?</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-[#274290] border-2 border-[#274290] px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:bg-[#274290] hover:text-white transition-all duration-300"
            >
              Contact Us Today
              <Phone className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Safety check for question
  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#274290] mb-4">Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 md:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header - Compact on Mobile */}
        <div className="text-center mb-4 md:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2 md:mb-4">
            <div className={`inline-block text-white px-3 md:px-6 py-1 md:py-2 rounded-full text-xs md:text-sm font-semibold ${
              currentSectionInfo.required 
                ? 'bg-gradient-to-r from-[#274290] to-[#f27921]' 
                : 'bg-gradient-to-r from-gray-500 to-gray-600'
            }`}>
              Section {currentSectionInfo.id}: {currentSectionInfo.title}
              {!currentSectionInfo.required && <span className="ml-1">(Optional)</span>}
            </div>
          </div>
          <h1 className="text-xl md:text-4xl font-black text-[#274290] mb-1 md:mb-2">
            Business Marketing Assessment
          </h1>
          <p className="text-xs md:text-base text-gray-600">
            Question {currentQuestion + 1} of {allQuestionIds.length}
          </p>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Overall Progress</span>
            <span>{Math.round(((currentQuestion + 1) / allQuestionIds.length) * 100)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#274290] to-[#f27921] h-full transition-all duration-500 ease-out"
              style={{ width: `${((currentQuestion + 1) / allQuestionIds.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Section Progress Bar */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Section Progress</span>
            <span>{Math.round(sectionProgress)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#274290] to-[#f27921] h-full transition-all duration-300 ease-out"
              style={{ width: `${sectionProgress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-xl overflow-hidden mb-4 md:mb-6">
          {/* Card Header with Gradient - Compact on Mobile */}
          <div className="bg-gradient-to-r from-[#274290] to-[#f27921] px-4 md:px-8 py-3 md:py-6">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div className="text-white flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs md:text-sm font-semibold opacity-90 whitespace-nowrap">
                    Section {currentSectionInfo.id} • Q{currentQuestion + 1}
                  </span>
                  <span className="text-xs md:text-sm opacity-75">•</span>
                  <span className="text-xs md:text-sm font-medium opacity-90 truncate">
                    {question.id}
                  </span>
                </div>
                <h2 className="text-base md:text-2xl font-bold leading-tight line-clamp-2">
                  {question.text}
                </h2>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-8 h-8 md:w-12 md:h-12 flex items-center justify-center text-white font-bold text-xs md:text-base flex-shrink-0">
                {currentSectionInfo.id}
              </div>
            </div>
          </div>

          {/* Options - Compact on Mobile */}
          <div className="p-4 md:p-8">
            <div className="space-y-2 md:space-y-3">
              {question.options.map((option, index) => {
                const isSelected = questionId && answers[questionId] === option.value
                return (
                  <button
                    key={`${questionId}-${index}-${option.value}`}
                    onClick={() => handleOptionSelect(option.value)}
                    className={`
                      w-full text-left p-3 md:p-5 rounded-lg md:rounded-xl border-2 transition-all duration-300
                      flex items-center justify-between gap-2 md:gap-4
                      ${
                        isSelected
                          ? 'border-[#f27921] bg-orange-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-[#274290] hover:bg-blue-50 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                      <div className={`
                        flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center
                        ${isSelected 
                          ? 'border-[#f27921] bg-[#f27921]' 
                          : 'border-gray-300 bg-white'
                        }
                      `}>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        ) : (
                          <Circle className={`w-4 h-4 md:w-5 md:h-5 ${isSelected ? 'text-white' : 'text-gray-300'}`} />
                        )}
                      </div>
                      <span className={`
                        text-sm md:text-lg font-medium truncate
                        ${isSelected ? 'text-[#274290]' : 'text-gray-700'}
                      `}>
                        {option.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0 bg-[#f27921] text-white text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Navigation - Compact on Mobile */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`
              flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base transition-all duration-300
              ${
                currentQuestion === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-[#274290] hover:bg-[#274290] hover:text-white shadow-lg hover:shadow-xl'
              }
            `}
          >
            <ChevronLeft size={18} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="text-xs md:text-sm text-gray-600 font-medium text-center flex-1 px-2">
            {isAdvancing ? (
              <span className="text-[#f27921] animate-pulse">Advancing...</span>
            ) : questionId && answers[questionId] ? (
              <span className="text-[#f27921]">✓ Saved</span>
            ) : (
              <span className="hidden md:inline">Please select an option</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!currentSectionInfo.required && (
              <button
                onClick={handleSkipSection}
                className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Skip Section
              </button>
            )}
            <button
              onClick={currentQuestion === allQuestionIds.length - 1 ? handleComplete : handleNext}
              disabled={!questionId || !answers[questionId]}
              className={`
                flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base transition-all duration-300
                ${
                  !questionId || !answers[questionId]
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : currentQuestion === allQuestionIds.length - 1 || isComplete
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-[#274290] to-[#f27921] text-white shadow-lg hover:shadow-xl'
                }
              `}
            >
              <span className="hidden sm:inline">
                {isComplete ? 'View Results' : currentQuestion === allQuestionIds.length - 1 ? 'Complete' : 'Next'}
              </span>
              {currentQuestion === allQuestionIds.length - 1 || isComplete ? (
                <span className="sm:hidden">✓</span>
              ) : (
                <ChevronRight size={18} className="md:w-5 md:h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Scale Note - Compact on Mobile */}
        <div className="mt-4 md:mt-8 text-center">
          <p className="text-xs md:text-sm text-gray-500 italic">
            {surveyData.scale_note}
          </p>
        </div>
      </div>
    </div>
  )
}

