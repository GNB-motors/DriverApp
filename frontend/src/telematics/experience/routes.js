import { CommunicationHome } from './CommunicationExperience';
import { ExperienceTruth } from './TruthExperience';
import { ExperienceSettings, BatteryHelp, DriverHelp, PaperList, PaperDetail, DriverPapersReview, UniversalCapture, ExperienceInbox, DocumentsExpiry, FuelEntry } from './ExperienceExtras';
import { UnavailableScreen } from './ExperienceUI';
import { RoadReport, TruckIssue } from './ReportExperience';
export const commonExperienceRoutes = {
  'Crew messages': CommunicationHome,
  'Experience settings': ExperienceSettings,
  'Offline maps': UnavailableScreen,
  'Battery help': BatteryHelp,
  'Privacy & consent': UnavailableScreen,
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
  'Rest & hours': UnavailableScreen,
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
