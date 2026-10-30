import React from 'react';
import { UnavailableScreen } from './ExperienceUI';
export function truthRoleAllowed(role) { return ['OWNER', 'SUPER_ADMIN', 'SUPERADMIN'].includes(String(role || '').toUpperCase()); }
export function ExperienceTruth(props) { return <UnavailableScreen {...props} />; }
export default ExperienceTruth;
