export interface TravelResult {
  walk_to_station_kilometers: number;
  walk_to_station_minutes: number;
  stations: {
    code: string;
    name: string;
  }[];
}