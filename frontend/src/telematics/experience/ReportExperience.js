import React from 'react';
import { OperationalForm } from '../workflows/OperationalScreens';
import { UnavailableScreen } from './ExperienceUI';
export const RoadReport = UnavailableScreen;
export function TruckIssue(props) { return <OperationalForm {...props} route={{ ...props.route, name: 'Report issue' }} />; }
