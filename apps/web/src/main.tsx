import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AboutPage } from './AboutPage.tsx'
import { AdminDashboardPage } from './AdminDashboardPage.tsx'
import { AgenticPathPage } from './AgenticPathPage.tsx'
import { AnalyticsRouteTracker } from './AnalyticsRouteTracker.tsx'
import App from './App.tsx'
import { AuthProvider } from './auth.tsx'
import { LoginPage, RegisterPage } from './AuthPages.tsx'
import { CompanyPage } from './CompanyPage.tsx'
import { ComparePage } from './ComparePage.tsx'
import { ForCompaniesPage } from './ForCompaniesPage.tsx'
import { InvestorsPage } from './InvestorsPage.tsx'
import { JobsBoardPage } from './JobsBoardPage.tsx'
import { MessagesPage } from './MessagesPage.tsx'
import { NetworkPage } from './NetworkPage.tsx'
import { PersonaProvider } from './persona.tsx'
import { PricingPage } from './PricingPage.tsx'
import { PrivacyPage } from './PrivacyPage.tsx'
import { ProfilePage } from './ProfilePage.tsx'
import { ShareScorecardPage } from './ShareScorecardPage.tsx'
import { SnowflakePathPage } from './SnowflakePathPage.tsx'
import './index.css'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <PersonaProvider>
          <AnalyticsRouteTracker />
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/agentic-path" element={<AgenticPathPage />} />
            <Route path="/snowflake-path" element={<SnowflakePathPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/for-companies" element={<ForCompaniesPage />} />
            <Route path="/jobs" element={<JobsBoardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/investors" element={<InvestorsPage />} />
            <Route path="/scorecard/:id" element={<ShareScorecardPage />} />
            <Route path="/scorecard" element={<ShareScorecardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PersonaProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
