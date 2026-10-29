import { CommunicationHome, ConversationDesign, BroadcastComposer, CommunicationReceipts } from './CommunicationExperience';
import { ExperienceTruth } from './TruthExperience';
import { ExperienceSettings, OfflineMaps, BatteryHelp, PrivacyConsent, DriverHelp, ExperienceIntroduction, PaperList, PaperDetail, DriverPapersReview, PaperReviewDetail, UniversalCapture, ExperienceInbox, ConversationPreview, JourneySummary, PreviewActivity, DocumentsExpiry } from './ExperienceExtras';
import { RoadReport, TruckIssue } from './ReportExperience';
export const commonExperienceRoutes = {
 'Crew messages': CommunicationHome, 'Design conversation': ConversationDesign, 'New preview broadcast': BroadcastComposer, 'Preview receipts': CommunicationReceipts,
 'Experience settings': ExperienceSettings, 'Offline maps': OfflineMaps, 'Battery help': BatteryHelp,
 'Privacy & consent': PrivacyConsent, 'Driver help': DriverHelp, 'Experience introduction': ExperienceIntroduction,
 'Preview activity': PreviewActivity, 'Conversation preview': ConversationPreview,
};
export const driverExperienceRoutes = {
 ...commonExperienceRoutes, 'Universal capture': UniversalCapture, 'Road report': RoadReport, 'Truck issue': TruckIssue,
 'Papers & money': PaperList, 'Paper detail': PaperDetail, 'Experience inbox': ExperienceInbox, 'Journey summary': JourneySummary, 'Document reminders': DocumentsExpiry,
};
export const reviewExperienceRoutes = { ...commonExperienceRoutes, 'Driver papers review': DriverPapersReview, 'Paper review detail': PaperReviewDetail, 'Experience truth': ExperienceTruth };
