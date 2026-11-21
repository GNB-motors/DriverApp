import { CommunicationHome } from './CommunicationExperience';
import { ExperienceTruth } from './TruthExperience';
import { ExperienceSettings, BatteryHelp, PaperList, PaperDetail, DriverPapersReview, ExperienceInbox, FuelEntry } from './ExperienceExtras';
import { UnavailableScreen } from './ExperienceUI';
import { RoadReport, TruckIssue } from './ReportExperience';
import { DriverRestHours, PrivacyConsent, DriverHelp } from '../screens/DriverServices';
import { CapturePages, DocumentReminders } from '../screens/DriverIntegrationScreens';
import { DriverBillForm } from '../screens/DriverWalletScreens';
export const commonExperienceRoutes = {
  'Crew messages': CommunicationHome,
  'Experience settings': ExperienceSettings,
  'Offline maps': UnavailableScreen,
  'Battery help': BatteryHelp,
  'Privacy & consent': PrivacyConsent,
};
export const driverExperienceRoutes = {
  ...commonExperienceRoutes,
  'Driver help': DriverHelp,
  'Universal capture': CapturePages,
  'Road report': RoadReport,
  'Truck issue': TruckIssue,
  'Papers & money': PaperList,
  'Paper detail': PaperDetail,
  'Experience inbox': ExperienceInbox,
  'Journey summary': UnavailableScreen,
  'Document reminders': DocumentReminders,
  'Rest & hours': DriverRestHours,
  'My earnings': UnavailableScreen,
  'Log diesel': FuelEntry,
  'Pre-trip check': UnavailableScreen,
  'Confirm delivery': UnavailableScreen,
  'Add expense': DriverBillForm,
};
export const reviewExperienceRoutes = {
  ...commonExperienceRoutes,
  'Driver papers review': DriverPapersReview,
  'Paper review detail': UnavailableScreen,
  'Experience truth': ExperienceTruth,
};
