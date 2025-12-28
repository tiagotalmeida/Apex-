export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

/**
 * Fetches current weather data for a given location using Open-Meteo.
 * This is a free, no-key-required API.
 */
export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
    );
    const data = await response.json();
    
    const temp = data.current.temperature_2m;
    const code = data.current.weather_code;
    
    // Map WMO codes to descriptions and simple icons
    // https://open-meteo.com/en/docs
    let condition = "Clear";
    let icon = "☀️";
    
    if (code >= 1 && code <= 3) { condition = "Partly Cloudy"; icon = "⛅"; }
    else if (code >= 45 && code <= 48) { condition = "Foggy"; icon = "🌫️"; }
    else if (code >= 51 && code <= 67) { condition = "Rainy"; icon = "🌧️"; }
    else if (code >= 71 && code <= 77) { condition = "Snowy"; icon = "❄️"; }
    else if (code >= 80 && code <= 82) { condition = "Showers"; icon = "🌦️"; }
    else if (code >= 95) { condition = "Thunderstorm"; icon = "⛈️"; }

    return { temp, condition, icon };
  } catch (error) {
    console.error("Weather fetch failed", error);
    throw error;
  }
};