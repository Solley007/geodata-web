import { BrowserRouter, Route, Routes, Navigate, useParams, useLocation } from "react-router-dom"; import { useEffect } from "react";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import AuthRedirect from "./pages/auth/Redirect.tsx";
import SignInPage from "./pages/auth/SignIn.tsx";
import Index from "./pages/Index.tsx";
import RealEstateLandingPage, { HomeV2 } from "./pages/home/RealEstateLandingPage.tsx";
import PropertiesPage from "./pages/properties/page.tsx";
import PropertyDetailPage from "./pages/properties/[id]/page.tsx";
import SavedPropertiesPage from "./pages/properties/saved/page.tsx";
import AboutPage from "./pages/about/page.tsx";
import OrgStructurePage from "./pages/about/org-structure.tsx";
import CorporateGovernancePage from "./pages/about/corporate-governance.tsx";
import NewsPage from "./pages/news/page.tsx";
import ContactPage from "./pages/contact/page.tsx";
import GalleryPage from "./pages/gallery/page.tsx";
import ServicesPage from "./pages/services/page.tsx";
import FAQsPage from "./pages/services/faqs.tsx";
import QRVerify from "./pages/verify.tsx";
import EStampVerify from "./pages/verify-stamp.tsx";
import ProfilePage from "./pages/profile/page.tsx";
import ClientPortal from "./pages/client/page.tsx";
// Admin
import AdminLayout from "./pages/admin/_components/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/page.tsx";
import AdminProperties from "./pages/admin/properties.tsx";
import PropertyTourManager from "./pages/admin/PropertyTourManager.tsx";
import AdminEstates from "./pages/admin/estates.tsx";
import AdminInquiries from "./pages/admin/inquiries.tsx";
import AdminUsers from "./pages/admin/users.tsx";
import AdminAnalytics from "./pages/admin/analytics.tsx";
import AdminContent from "./pages/admin/content.tsx";
import AdminSettings from "./pages/admin/settings.tsx";
import AdminSales from "./pages/admin/sales.tsx";
import AdminCorporateMarketing from "./pages/admin/corporate.tsx";
import AdminDiasporaPlatform from "./pages/admin/diaspora.tsx";
import AdminCorporateDirectory from "./pages/admin/corporate-directory.tsx";
import AdminTrackRecord from "./pages/admin/track-record.tsx";
import DownloadsPage from "./pages/downloads/page.tsx";
import AdminPublicDocuments from "./pages/admin/public-documents.tsx";
import AdminTeams from "./pages/admin/teams.tsx";
import TrackRecordPage from "./pages/track-record/page.tsx";
import TrackRecordDetailPage from "./pages/track-record/detail.tsx";
import OngoingProjectsPage from "./pages/ongoing-projects/page.tsx";
import OngoingProjectDetailPage from "./pages/ongoing-projects/detail.tsx";
import DevelopmentPage, { MortgagePage, SouthernBridgeCityPage, UpdatesPage } from "./pages/developments/page.tsx";
import AdminDevelopmentStatus from "./pages/admin/development-status.tsx";
import AdminStaff from "./pages/admin/staff.tsx";
import AdminConstruction from "./pages/admin/construction.tsx";
import AdminReminders from "./pages/admin/reminders.tsx";
import AdminClients from "./pages/admin/clients.tsx";
import AdminGallery from "./pages/admin/gallery.tsx";
import AdminAllocations from "./pages/admin/allocations.tsx";
import AdminPartners from "./pages/admin/partners.tsx";
import AdminCommunications from "./pages/admin/communications.tsx";
import AdminTransactions from "./pages/admin/transactions.tsx";
import AdminKYC from "./pages/admin/KYC.tsx";
import AdminFinance from "./pages/admin/Finance.tsx";
import AdminPaymentGateway from "./pages/admin/PaymentGateway.tsx";
import AdminPayments from "./pages/admin/Payments.tsx";
import AdminDocuments from "./pages/admin/Documents.tsx";
import AdminTasks from "./pages/admin/Tasks.tsx";
import AdminLiveInspections from "./pages/admin/LiveInspections.tsx";
import AdminLiveInspectionDetail from "./pages/admin/LiveInspectionDetail.tsx";
import LiveInspectionGuide from "./pages/admin/LiveInspectionGuide.tsx";
import AdminAudit from "./pages/admin/Audit.tsx";
import AdminBackup from "./pages/admin/Backup.tsx";
import AdminLogin from "./pages/admin/login.tsx";
// Staff Portal
import StaffLayout from "./pages/staff/_components/StaffLayout.tsx";
import StaffOverview from "./pages/staff/page.tsx";
import StaffProfile from "./pages/staff/profile.tsx";
import StaffEmploymentLetter from "./pages/staff/employment-letter.tsx";
import StaffMyTasks from "./pages/staff/tasks.tsx";
import StaffMyClients from "./pages/staff/clients.tsx";
import StaffMyPropertiesSales from "./pages/staff/properties.tsx";
import StaffAttendanceLeave from "./pages/staff/attendance.tsx";
import StaffPerformance from "./pages/staff/performance.tsx";
import PartnerLoginPage from "./pages/partner/login.tsx";
import PartnerApplyPage from "./pages/partner/apply.tsx";
import PartnerPortalPage from "./pages/partner/portal.tsx";
import PrivacyPage from "./pages/legal/privacy.tsx";
import TermsPage from "./pages/legal/terms.tsx";
import SitemapPage from "./pages/legal/sitemap.tsx";
import ArticlePage from "./pages/news/[slug]/page.tsx";
import ReadyMixPage from "./pages/readymix/page.tsx";
import GroupDirectoryPage from "./pages/group/page.tsx";
import InfrastructurePage from "./pages/businesses/infrastructure/page.tsx";
import QuarryPage from "./pages/businesses/quarry/page.tsx";
import EquipmentPage from "./pages/businesses/equipment/page.tsx";
import TechnologyPage from "./pages/businesses/technology/page.tsx";
import DiasporaHub from "./pages/diaspora/page.tsx";
import DiasporaOwnPage from "./pages/diaspora/own.tsx";
import DiasporaInvestPage from "./pages/diaspora/invest.tsx";
import DiasporaPartnerPage from "./pages/diaspora/partner.tsx";
import DiasporaReferPage from "./pages/diaspora/refer.tsx";
import DiasporaCorporatePage from "./pages/diaspora/corporate.tsx";
import DiasporaDownloadsPage from "./pages/diaspora/downloads.tsx";
import DiasporaCampaignPage from "./pages/diaspora/[campaignSlug]/page.tsx";
import PartnersDirectoryPage from "./pages/partners/page.tsx";
import PartnerProfilePage from "./pages/partners/[slug]/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminSeo from "./pages/admin/seo/page.tsx";
import SiteSeoInjector from "./components/SiteSeoInjector.tsx";

// Redirects /blog/:slug → /news/:slug so old or shared blog links still work
function BlogRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/news/${slug ?? ""}`} replace />;
}
function ScrollToTop() { const { pathname, hash } = useLocation(); useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]); return null; }
export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <SiteSeoInjector /><ScrollToTop />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/real-estate" element={<RealEstateLandingPage />} />
          <Route path="/home-v2" element={<HomeV2 />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/saved" element={<SavedPropertiesPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/track-record" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<TrackRecordPage />} />
          <Route path="/projects/:slug" element={<TrackRecordDetailPage />} />
          <Route path="/track-record/:slug" element={<TrackRecordDetailPage />} />
          <Route path="/ongoing-projects" element={<OngoingProjectsPage />} />
          <Route path="/ongoing-projects/:id" element={<OngoingProjectDetailPage />} />
          <Route path="/southern-bridge-city" element={<SouthernBridgeCityPage />} />
          <Route path="/development/:slug" element={<DevelopmentPage />} />
          <Route path="/mortgage" element={<MortgagePage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/mreif" element={<Navigate to="/mortgage" replace />} />
          {/* Old URLs still listed in Google, sent to their current pages */}
          <Route path="/southern-bridge" element={<Navigate to="/southern-bridge-city" replace />} />
          <Route path="/southernbridgecity" element={<Navigate to="/southern-bridge-city" replace />} />
          <Route path="/about.html" element={<Navigate to="/about" replace />} />
          <Route path="/index" element={<Navigate to="/" replace />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/villa-royale" element={<Navigate to="/projects" replace />} />
          <Route path="/countrycourt" element={<Navigate to="/track-record/country-court-estate-abuja" replace />} />
          <Route path="/mabushi-mall" element={<Navigate to="/track-record/mabushi-shopping-complex" replace />} />
          <Route path="/property/:id" element={<Navigate to="/properties" replace />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/org-structure" element={<OrgStructurePage />} />
          <Route path="/corporate-governance" element={<CorporateGovernancePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<ArticlePage />} />
          {/* /blog and /blog/:slug are aliases — redirect to /news equivalents */}
          <Route path="/blog" element={<Navigate to="/news" replace />} />
          <Route path="/blog/:slug" element={<BlogRedirect />} />
          <Route path="/readymix" element={<ReadyMixPage />} />
          <Route path="/group" element={<GroupDirectoryPage />} />
          <Route path="/businesses/infrastructure" element={<InfrastructurePage />} />
          <Route path="/businesses/quarry" element={<QuarryPage />} />
          <Route path="/businesses/equipment" element={<EquipmentPage />} />
          <Route path="/businesses/technology" element={<TechnologyPage />} />
          <Route path="/diaspora" element={<DiasporaHub />} />
          <Route path="/diaspora/own" element={<DiasporaOwnPage />} />
          <Route path="/diaspora/invest" element={<DiasporaInvestPage />} />
          <Route path="/diaspora/partner" element={<DiasporaPartnerPage />} />
          <Route path="/diaspora/refer" element={<DiasporaReferPage />} />
          <Route path="/diaspora/corporate" element={<DiasporaCorporatePage />} />
          <Route path="/diaspora/downloads" element={<DiasporaDownloadsPage />} />
          <Route path="/diaspora/:campaignSlug" element={<DiasporaCampaignPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/faqs" element={<FAQsPage />} />
          <Route path="/verify" element={<QRVerify />} />
          <Route path="/verify-stamp" element={<EStampVerify />} />
          <Route path="/client" element={<ClientPortal />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/partner/apply" element={<PartnerApplyPage />} />
          <Route path="/partners" element={<PartnersDirectoryPage />} />
          <Route path="/partners/:slug" element={<PartnerProfilePage />} />
          <Route path="/partner" element={<PartnerPortalPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
          <Route path="/auth/sign-in" element={<SignInPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/redirect" element={<AuthRedirect />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/partner/login" element={<PartnerLoginPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="properties/:propertyId/tour" element={<PropertyTourManager />} />
            <Route path="estates" element={<AdminEstates />} />
            <Route path="inquiries" element={<AdminInquiries />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="corporate" element={<AdminCorporateMarketing />} />
            <Route path="diaspora" element={<AdminDiasporaPlatform />} />
            <Route path="corporate-directory" element={<AdminCorporateDirectory />} />
            <Route path="track-record" element={<AdminTrackRecord />} />
            <Route path="development-status" element={<AdminDevelopmentStatus />} />
            <Route path="public-documents" element={<AdminPublicDocuments />} />
            <Route path="teams" element={<AdminTeams />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="construction" element={<AdminConstruction />} />
            <Route path="reminders" element={<AdminReminders />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="allocations" element={<AdminAllocations />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="gallery" element={<AdminGallery />} />
            <Route path="partners" element={<AdminPartners />} />
            <Route path="communications" element={<AdminCommunications />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="kyc" element={<AdminKYC />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="payment-gateway" element={<AdminPaymentGateway />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="tasks" element={<AdminTasks />} />
            <Route path="live-inspections" element={<AdminLiveInspections />} />
            <Route path="live-inspections/guide" element={<LiveInspectionGuide />} />
            <Route path="live-inspections/:id" element={<AdminLiveInspectionDetail />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="backup" element={<AdminBackup />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="seo" element={<AdminSeo />} />
          </Route>

          {/* Staff Portal routes — self-service view for Officer/Staff/Manager IAM roles */}
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffOverview />} />
            <Route path="profile" element={<StaffProfile />} />
            <Route path="employment-letter" element={<StaffEmploymentLetter />} />
            <Route path="tasks" element={<StaffMyTasks />} />
            <Route path="clients" element={<StaffMyClients />} />
            <Route path="inquiries" element={<StaffMyClients />} />
            <Route path="properties" element={<StaffMyPropertiesSales />} />
            <Route path="sales" element={<StaffMyPropertiesSales />} />
            <Route path="attendance" element={<StaffAttendanceLeave />} />
            <Route path="performance" element={<StaffPerformance />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
