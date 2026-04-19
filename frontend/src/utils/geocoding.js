/**
 * Reverse geocoding utility to convert coordinates to location name
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

export const reverseGeocode = async (latitude, longitude) => {
  try {
    // Use OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'MechanicFinder App' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Extract location name from address components
    const address = data.address || {};
    
    // Try to get a meaningful location name
    let locationName = '';
    
    if (address.city || address.town || address.village) {
      locationName = address.city || address.town || address.village;
      if (address.state || address.region) {
        locationName += `, ${address.state || address.region}`;
      }
    } else if (address.suburb || address.neighbourhood) {
      locationName = address.suburb || address.neighbourhood;
      if (address.city || address.town) {
        locationName += `, ${address.city || address.town}`;
      }
    } else if (address.road) {
      locationName = address.road;
      if (address.city || address.town) {
        locationName += `, ${address.city || address.town}`;
      }
    } else if (address.county) {
      locationName = address.county;
      if (address.state || address.region) {
        locationName += `, ${address.state || address.region}`;
      }
    } else if (address.state || address.region) {
      locationName = address.state || address.region;
    } else if (address.country) {
      locationName = address.country;
    } else {
      // Fallback to display name if available
      locationName = data.display_name ? data.display_name.split(',')[0] : 'Unknown Location';
    }

    return locationName || 'Unknown Location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null; // Return null on error, component will handle gracefully
  }
};

