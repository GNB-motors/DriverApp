import React from 'react';
import { DriverTrips, DriverMore } from '../screens/DriverScreens';
import { More } from '../screens/ManagerScreens';

export const DriverTripsExperience = DriverTrips;
export const DriverMoreExperience = DriverMore;
export function ManagerMoreExperience(props) { return <More {...props} />; }
