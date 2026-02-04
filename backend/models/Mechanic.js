const { getCollection, ObjectId } = require('../config/database');

class Mechanic {
  static collection() {
    return getCollection('mechanics');
  }

  static async create(mechanicData) {
    const collection = this.collection();
    const result = await collection.insertOne({
      ...mechanicData,
      is_available: true,
      is_online: false,
      rating: 0,
      total_reviews: 0,
      total_customers: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
    return result.insertedId;
  }

  static async findByUserId(userId) {
    const collection = this.collection();
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return await collection.findOne({ user_id: objectId });
  }

  static async findById(id) {
    const collection = this.collection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await collection.findOne({ _id: objectId });
  }

  static async findAllActive(filters = {}) {
    const collection = this.collection();
    
    // Query for all active mechanics
    const query = {
      is_available: true,
      is_online: true,
      $or: [
        { latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } },
        { current_latitude: { $exists: true, $ne: null }, current_longitude: { $exists: true, $ne: null } }
      ]
    };

    // Add vehicle type/brand filters if provided
    if (filters.vehicle_type || filters.vehicle_brand) {
      query['vehicle_capabilities'] = {};
      if (filters.vehicle_type) {
        query['vehicle_capabilities.type'] = filters.vehicle_type;
      }
      if (filters.vehicle_brand) {
        query['vehicle_capabilities.brand'] = filters.vehicle_brand;
      }
    }

    const mechanics = await collection.find(query).toArray();
    
    // Process mechanics and calculate distance if reference location provided
    const processedMechanics = mechanics.map(mechanic => {
      // Prioritize current location (real-time) over base location
      const mechanicLat = mechanic.current_latitude || mechanic.latitude;
      const mechanicLng = mechanic.current_longitude || mechanic.longitude;
      
      const result = { 
        ...mechanic, 
        latitude: mechanicLat,
        longitude: mechanicLng,
        location_is_current: !!(mechanic.current_latitude && mechanic.current_longitude)
      };
      
      // Calculate distance if reference location is provided
      if (filters.referenceLat && filters.referenceLng && mechanicLat && mechanicLng) {
        const R = 6371; // Earth's radius in km
        const dLat = (filters.referenceLat - mechanicLat) * Math.PI / 180;
        const dLng = (filters.referenceLng - mechanicLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(mechanicLat * Math.PI / 180) *
                  Math.cos(filters.referenceLat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        result.distance = parseFloat(distance.toFixed(2));
      }
      
      return result;
    });
    
    // Sort by distance if available, otherwise by rating
    if (filters.referenceLat && filters.referenceLng) {
      processedMechanics.sort((a, b) => {
        // Prioritize online and available
        if (a.is_online && a.is_available && !(b.is_online && b.is_available)) return -1;
        if (!(a.is_online && a.is_available) && b.is_online && b.is_available) return 1;
        // Then sort by distance
        return (a.distance || 999) - (b.distance || 999);
      });
    } else {
      // Sort by rating if no reference location
      processedMechanics.sort((a, b) => {
        if (a.is_online && a.is_available && !(b.is_online && b.is_available)) return -1;
        if (!(a.is_online && a.is_available) && b.is_online && b.is_available) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    return processedMechanics;
  }

  static async findNearby(latitude, longitude, radius = 10, filters = {}) {
    const collection = this.collection();
    
    // MongoDB geospatial query
    // Include mechanics with either base location or current location
    const query = {
      is_available: true,
      is_online: true,
      $or: [
        { latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } },
        { current_latitude: { $exists: true, $ne: null }, current_longitude: { $exists: true, $ne: null } }
      ]
    };

    // Add vehicle type/brand filters if provided
    if (filters.vehicle_type || filters.vehicle_brand) {
      query['vehicle_capabilities'] = {};
      if (filters.vehicle_type) {
        query['vehicle_capabilities.type'] = filters.vehicle_type;
      }
      if (filters.vehicle_brand) {
        query['vehicle_capabilities.brand'] = filters.vehicle_brand;
      }
    }

    const mechanics = await collection.find(query).toArray();

    // Calculate distance and filter by radius
    const R = 6371; // Earth's radius in km
    const nearbyMechanics = mechanics
      .map(mechanic => {
        // Prioritize current location (real-time) over base location
        const mechanicLat = mechanic.current_latitude || mechanic.latitude;
        const mechanicLng = mechanic.current_longitude || mechanic.longitude;
        
        // Skip if no location available
        if (!mechanicLat || !mechanicLng) {
          return null;
        }

        const dLat = (latitude - mechanicLat) * Math.PI / 180;
        const dLng = (longitude - mechanicLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(mechanicLat * Math.PI / 180) *
                  Math.cos(latitude * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance <= radius) {
          // Use current location for display if available
          const result = { 
            ...mechanic, 
            latitude: mechanicLat, // Use current location for display
            longitude: mechanicLng, // Use current location for display
            distance: parseFloat(distance.toFixed(2)),
            location_is_current: !!(mechanic.current_latitude && mechanic.current_longitude)
          };
          return result;
        }
        return null;
      })
      .filter(m => m !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    return nearbyMechanics;
  }

  static async update(id, updateData) {
    const collection = this.collection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await collection.updateOne(
      { _id: objectId },
      { $set: { ...updateData, updated_at: new Date() } }
    );
  }

  static async updateLocation(id, latitude, longitude) {
    const collection = this.collection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    const result = await collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          latitude: latitude, // Main location field
          longitude: longitude, // Main location field
          current_latitude: latitude, // Real-time current location
          current_longitude: longitude, // Real-time current location
          location_updated_at: new Date(), // Track when location was last updated
          updated_at: new Date() 
        } 
      }
    );

    return result;
  }
}

module.exports = Mechanic;

