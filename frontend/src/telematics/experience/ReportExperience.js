import React from 'react';
import { OperationalForm } from '../workflows/OperationalScreens';
export { RoadReport } from '../screens/DriverServices';
export function TruckIssue(props) { return <OperationalForm {...props} route={{ ...props.route, name: 'Report issue' }} />; }
