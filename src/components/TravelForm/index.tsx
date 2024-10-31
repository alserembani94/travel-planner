import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Footprints, Train, MapPin, ChevronDown, ChevronUp, ArrowDownCircle, ArrowUpCircle, LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';
import { config } from '../../config';
import { TravelResult } from '../../types';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { useDebounce } from '../../hooks/useDebounce';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface TravelFormProps {
  layout: "default" | "compact"
}

export function TravelForm({ layout }: TravelFormProps) {
  const isGoogleMapsLoaded = useGoogleMaps();
  
  const [fromLocation, setFromLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [fromQuery, setFromQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [fromPredictions, setFromPredictions] = useState<PlacePrediction[]>([]);
  const [destPredictions, setDestPredictions] = useState<PlacePrediction[]>([]);
  const [result, setResult] = useState<TravelResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
  const [expandedLines, setExpandedLines] = useState<string[]>([]);

  const debouncedFromQuery = useDebounce(fromQuery, 300);
  const debouncedDestQuery = useDebounce(destQuery, 300);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isGoogleMapsLoaded && !autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      mapRef.current = document.createElement('div');
      placesService.current = new window.google.maps.places.PlacesService(mapRef.current);
    }
  }, [isGoogleMapsLoaded]);

  useEffect(() => {
    if (debouncedFromQuery) {
      getPlacePredictions(debouncedFromQuery, setFromPredictions);
    } else {
      setFromPredictions([]);
    }
  }, [debouncedFromQuery]);

  useEffect(() => {
    if (debouncedDestQuery) {
      getPlacePredictions(debouncedDestQuery, setDestPredictions);
    } else {
      setDestPredictions([]);
    }
  }, [debouncedDestQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeInput && !(event.target as Element).closest('.location-input-container')) {
        setActiveInput(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeInput]);

  const getPlacePredictions = async (input: string, setter: (places: PlacePrediction[]) => void) => {
    if (!input.trim() || !autocompleteService.current || !isGoogleMapsLoaded) {
      setter([]);
      return;
    }

    try {
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
        (resolve, reject) => {
          autocompleteService.current?.getPlacePredictions(
            {
              input,
              componentRestrictions: { country: 'MY' },
              types: ['establishment', 'geocode']
            },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                resolve(results);
              } else {
                reject(status);
              }
            }
          );
        }
      );
      setter(predictions as PlacePrediction[]);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setter([]);
    }
  };

  const handlePlaceSelect = async (place: PlacePrediction, type: 'from' | 'to') => {
    try {
      const details = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.current?.getDetails(
          {
            placeId: place.place_id,
            fields: ['formatted_address', 'name']
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(status);
            }
          }
        );
      });

      if (type === 'from') {
        setFromLocation(details.formatted_address || '');
        setFromQuery(details.formatted_address || '');
        setFromPredictions([]);
      } else {
        setDestination(details.formatted_address || '');
        setDestQuery(details.formatted_address || '');
        setDestPredictions([]);
      }
      setActiveInput(null);
    } catch (error) {
      console.error('Error fetching place details:', error);
      toast.error('Error selecting location');
    }
  };

  const handleSubmit = async () => {
    if (!fromLocation || !destination) {
      toast.error('Please select both locations');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/journey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromLocation, destination })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch travel information');
      }

      const data = await response.json();
      setResult(data);
      toast.success('Route calculated successfully!');
    } catch (error) {
      console.error('Error fetching travel data:', error);
      toast.error('Failed to calculate route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const processStations = (stations: Array<{ code: string; name: string }>) => {
    const lines: Array<{
      lineCode: string;
      stations: Array<{ code: string; name: string }>;
    }> = [];
    
    let currentLine = stations[0].code.charAt(0);
    let currentStations = [];
  
    for (const station of stations) {
      if (station.code.charAt(0) !== currentLine) {
        lines.push({
          lineCode: currentLine,
          stations: [...currentStations]
        });
        currentLine = station.code.charAt(0);
        currentStations = [];
      }
      currentStations.push(station);
    }
    
    if (currentStations.length > 0) {
      lines.push({
        lineCode: currentLine,
        stations: currentStations
      });
    }
  
    return lines;
  };

  const toggleLineExpansion = (lineId: string) => {
    setExpandedLines(current => 
      current.includes(lineId)
        ? current.filter(id => id !== lineId)
        : [...current, lineId]
    );
  };

  const renderSearchForm = () => (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2 relative location-input-container">
        <label className="text-sm font-medium">From</label>
        <Input
          type="text"
          placeholder="Enter starting location"
          value={fromQuery}
          onChange={(e) => setFromQuery(e.target.value)}
          onFocus={() => setActiveInput('from')}
          className="w-full"
        />
        {activeInput === 'from' && fromPredictions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background rounded-md shadow-lg border border-border">
            {fromPredictions.map((place) => (
              <div
                key={place.place_id}
                className="px-4 py-2 hover:bg-muted cursor-pointer flex items-start gap-2"
                onClick={() => handlePlaceSelect(place, 'from')}
              >
                <MapPin className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">{place.structured_formatting.main_text}</div>
                  <div className="text-sm text-muted-foreground">{place.structured_formatting.secondary_text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 relative location-input-container">
        <label className="text-sm font-medium">To</label>
        <Input
          type="text"
          placeholder="Enter destination"
          value={destQuery}
          onChange={(e) => setDestQuery(e.target.value)}
          onFocus={() => setActiveInput('to')}
          className="w-full"
        />
        {activeInput === 'to' && destPredictions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background rounded-md shadow-lg border border-border">
            {destPredictions.map((place) => (
              <div
                key={place.place_id}
                className="px-4 py-2 hover:bg-muted cursor-pointer flex items-start gap-2"
                onClick={() => handlePlaceSelect(place, 'to')}
              >
                <MapPin className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">{place.structured_formatting.main_text}</div>
                  <div className="text-sm text-muted-foreground">{place.structured_formatting.secondary_text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={!fromLocation || !destination || isLoading}
        className="w-full"
      >
        {isLoading ? 'Calculating...' : 'Get Directions'}
      </Button>
    </div>
  );

  const renderStationList = () => (
    <div className="space-y-6">
      {processStations(result!.stations).map((line, lineIndex) => {
        const lineId = `${line.lineCode}-${lineIndex}`;
        const isExpanded = expandedLines.includes(lineId);
        const hasIntermediateStops = line.stations.length > 2;
        const lineColor = line.lineCode === 'K' ? '#2563eb' : 
                       line.lineCode === 'S' ? '#16a34a' : 
                       '#6366f1';

        return (
          <div key={lineId} className="relative">
            <div className="mb-2 text-sm font-medium text-muted-foreground">
              Line {line.lineCode}
            </div>
            
            <div className="border-l-4 pl-4" style={{ borderColor: lineColor }}>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center"
                     style={{ borderColor: lineColor }}>
                  {lineIndex === 0 ? (
                    <LocateFixed className="w-4 h-4" style={{ color: lineColor }} />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4" style={{ color: lineColor }} />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium">{line.stations[0].name}</p>
                  <p className="text-sm text-muted-foreground">{line.stations[0].code}</p>
                </div>
              </div>

              {hasIntermediateStops && (
                <div className="ml-4 my-2">
                  <button
                    onClick={() => toggleLineExpansion(lineId)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <span>
                      {line.stations.length - 2} stops
                    </span>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[3000px] opacity-100 mt-2' : 'max-h-0 opacity-0'
                  }`}>
                    {line.stations.slice(1, -1).map((station) => (
                      <div key={station.code} className="flex items-center gap-4 py-2">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-muted-foreground" />
                        <div>
                          <p className="font-medium">{station.name}</p>
                          <p className="text-sm text-muted-foreground">{station.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mt-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center"
                     style={{ borderColor: lineColor }}>
                  {lineIndex === processStations(result!.stations).length - 1 ? (
                    <MapPin className="w-4 h-4" style={{ color: lineColor }} />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4" style={{ color: lineColor }} />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium">{line.stations[line.stations.length - 1].name}</p>
                  <p className="text-sm text-muted-foreground">{line.stations[line.stations.length - 1].code}</p>
                </div>
              </div>
            </div>

            {lineIndex < processStations(result!.stations).length - 1 && (
              <div className="my-4 ml-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              <span className="text-sm font-medium">Change Line</span>
            </div>
          )}
        </div>
      );
    })}

    <div className="mt-6 pt-4 border-t border-border">
      <h4 className="text-sm font-medium text-foreground mb-3">Legend</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-background border-2 border-blue-600 flex items-center justify-center">
            <LocateFixed className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-muted-foreground">Starting Point</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-background border-2 border-blue-600 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-muted-foreground">Destination</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-background border-2 border-blue-600 flex items-center justify-center">
            <ArrowDownCircle className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-muted-foreground">Enter Line</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-background border-2 border-blue-600 flex items-center justify-center">
            <ArrowUpCircle className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-muted-foreground">Exit Line</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded" />
          <span className="text-muted-foreground">Kelana Jaya Line (KJ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span className="text-muted-foreground">Sri Petaling Line (SP)</span>
        </div>
      </div>
    </div>
  </div>
);

const renderDefaultLayout = () => (
  <div className="max-w-2xl mx-auto p-4 space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Plan Your Journey</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSearchForm()}
      </CardContent>
    </Card>
    
    {result && (
      <Card>
        <CardHeader>
          <CardTitle>Journey Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Footprints className="text-blue-600 dark:text-blue-400" size={20} />
                <h3 className="font-semibold">Walking Journey</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">To first station:</p>
                  <p className="font-medium">
                    {result.walk_to_station.kilometers.toFixed(2)} km
                    <span className="mx-2">•</span>
                    {Math.round(result.walk_to_station.minutes)} min
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground">From last station:</p>
                  <p className="font-medium">
                    {result.walk_from_station.kilometers.toFixed(2)} km
                    <span className="mx-2">•</span>
                    {Math.round(result.walk_from_station.minutes)} min
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-muted-foreground">Total walking:</p>
                  <p className="font-medium">
                    {result.total_walking.kilometers.toFixed(2)} km
                    <span className="mx-2">•</span>
                    {Math.round(result.total_walking.minutes)} min
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Train className="text-green-600 dark:text-green-400" size={20} />
                <h3 className="font-semibold">Journey Statistics</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground">Total Stations:</p>
                  <p className="font-medium">{result.total_stops} stops</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Interchanges:</p>
                  <p className="font-medium">{result.total_interchanges} changes</p>
                </div>
              </div>
            </div>
          </div>

          {renderStationList()}
        </CardContent>
      </Card>
    )}
  </div>
);

const renderCompactLayout = () => (
  <div className="max-w-full p-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="md:sticky md:top-20">
        <CardHeader>
          <CardTitle>Plan Your Journey</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderSearchForm()}
        </CardContent>
      </Card>
      
      {result && (
        <div className="space-y-4">
          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Journey Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">To Station</p>
                  <p className="font-medium">
                    {result.walk_to_station.kilometers.toFixed(2)} km • {Math.round(result.walk_to_station.minutes)} min
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">From Station</p>
                  <p className="font-medium">
                    {result.walk_from_station.kilometers.toFixed(2)} km • {Math.round(result.walk_from_station.minutes)} min
                  </p>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Total Walking</p>
                      <p className="font-medium">
                        {result.total_walking.kilometers.toFixed(2)} km • {Math.round(result.total_walking.minutes)} min
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Journey Overview</p>
                      <p className="font-medium">
                        {result.total_stops} stops • {result.total_interchanges} changes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Station Route</CardTitle>
            </CardHeader>
            <CardContent>
              {renderStationList()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  </div>
);

return layout === "default" ? renderDefaultLayout() : renderCompactLayout();
}

export default TravelForm;