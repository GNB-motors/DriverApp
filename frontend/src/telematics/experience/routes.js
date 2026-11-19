import { CommunicationHome } from './CommunicationExperience';
import { ExperienceTruth } from './TruthExperience';
import { ExperienceSettings, BatteryHelp, PaperList, PaperDetail, DriverPapersReview, UniversalCapture, ExperienceInbox, DocumentsExpiry, FuelEntry } from './ExperienceExtras';
import { UnavailableScreen } from './ExperienceUI';
import { RoadReport, TruckIssue } from './ReportExperience';
import { DriverRestHours, PrivacyConsent, DriverHelp } from '../screens/DriverServices';
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
  'Universal capture': UniversalCapture,
  'Road report': RoadReport,
  'Truck issue': TruckIssue,
  'Papers & money': PaperList,
  'Paper detail': PaperDetail,
  'Experience inbox': ExperienceInbox,
  'Journey summary': UnavailableScreen,
  'Document reminders': DocumentsExpiry,
  'Rest & hours': DriverRestHours,
  'My earnings': UnavailableScreen,
  'Log diesel': FuelEntry,
  'Pre-trip check': UnavailableScreen,
  'Confirm delivery': UnavailableScreen,
  'Add expense': UnavailableScreen,
};
export const reviewExperienceRoutes = {
  ...commonExperienceRoutes,
  'Driver papers review': DriverPapersReview,
  'Paper review detail': UnavailableScreen,
  'Experience truth': ExperienceTruth,
};
