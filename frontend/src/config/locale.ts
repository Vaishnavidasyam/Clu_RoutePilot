/**
 * RoutePilot Global Locale & Location Configuration
 * Centralized settings for Location, Timezone, Time Format, and Date Format.
 */

export const APP_TIMEZONE = 'Asia/Kolkata' as const;
export const APP_TIMEZONE_LABEL = 'IST (UTC+05:30)' as const;

export const APP_LOCATION = {
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  fullName: 'Hyderabad, Telangana, India',
  urbanArea: 'Hyderabad Urban Area',
  depotName: 'Hyderabad Central Dispatch Depot',
  defaultCenter: {
    lat: 17.3850 as number,
    lng: 78.4867 as number
  },
  defaultBounds: [
    [17.2000, 78.2500],
    [17.5500, 78.6500]
  ] as [[number, number], [number, number]],
  sampleLocalities: [
    'Banjara Hills',
    'Jubilee Hills',
    'Gachibowli',
    'Madhapur',
    'Hitech City',
    'Kukatpally',
    'Secunderabad',
    'Begumpet',
    'Ameerpet',
    'Mehdipatnam'
  ]
};

export const TIME_FORMAT = '12h' as const;
export const DATE_FORMAT = 'DD MMM YYYY' as const;
