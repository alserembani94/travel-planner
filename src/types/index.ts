export interface TravelResult {
  walk_to_station: {
    kilometers: number;
    minutes: number;
  };
  walk_from_station: {
    kilometers: number;
    minutes: number;
  };
  total_stops: number;
  total_interchanges: number;
  total_walking: {
    kilometers: number;
    minutes: number;
  };
  stations: {
    code: string;
    name: string;
  }[];
}