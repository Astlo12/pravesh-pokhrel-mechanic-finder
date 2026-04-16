const Mechanic = require('../models/Mechanic');
const { getCollection, ObjectId } = require('../config/database');

jest.mock('../config/database', () => {
  const mockObjectId = jest.fn((id) => ({ mockedObjectId: id }));

  return {
    getCollection: jest.fn(),
    ObjectId: mockObjectId
  };
});

describe('Mechanic Model', () => {
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
  });

  describe('collection', () => {
    it('should return mechanics collection', () => {
      Mechanic.collection();
      expect(getCollection).toHaveBeenCalledWith('mechanics');
    });
  });

  describe('create', () => {
    it('should create mechanic with default values', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'mechanic123'
      });

      const mechanicData = {
        user_id: 'user123',
        name: 'Suraj Mechanic',
        specialty: 'Engine Repair'
      };

      const result = await Mechanic.create(mechanicData);

      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        user_id: 'user123',
        name: 'Suraj Mechanic',
        specialty: 'Engine Repair',
        is_available: true,
        is_online: false,
        rating: 0,
        total_reviews: 0,
        total_customers: 0
      });

      expect(insertedDoc.created_at).toBeInstanceOf(Date);
      expect(insertedDoc.updated_at).toBeInstanceOf(Date);
      expect(result).toBe('mechanic123');
    });
  });

  describe('findByUserId', () => {
    it('should find mechanic by string user id', async () => {
      const mechanic = { _id: 'm1', user_id: { mockedObjectId: 'user123' } };
      mockCollection.findOne.mockResolvedValue(mechanic);

      const result = await Mechanic.findByUserId('user123');

      expect(ObjectId).toHaveBeenCalledWith('user123');
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        user_id: { mockedObjectId: 'user123' }
      });
      expect(result).toEqual(mechanic);
    });

    it('should find mechanic by object id without converting', async () => {
      const userObjId = { custom: 'userObjId' };
      const mechanic = { _id: 'm1', user_id: userObjId };
      mockCollection.findOne.mockResolvedValue(mechanic);

      const result = await Mechanic.findByUserId(userObjId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        user_id: userObjId
      });
      expect(result).toEqual(mechanic);
    });
  });

  describe('findById', () => {
    it('should find mechanic by string id', async () => {
      const mechanic = { _id: { mockedObjectId: 'mech123' }, name: 'Test' };
      mockCollection.findOne.mockResolvedValue(mechanic);

      const result = await Mechanic.findById('mech123');

      expect(ObjectId).toHaveBeenCalledWith('mech123');
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: { mockedObjectId: 'mech123' }
      });
      expect(result).toEqual(mechanic);
    });

    it('should find mechanic by object id without converting', async () => {
      const mechanicId = { custom: 'mechanicObjId' };
      const mechanic = { _id: mechanicId, name: 'Test' };
      mockCollection.findOne.mockResolvedValue(mechanic);

      const result = await Mechanic.findById(mechanicId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: mechanicId
      });
      expect(result).toEqual(mechanic);
    });
  });

  describe('findAllActive', () => {
    it('should return active mechanics sorted by rating when no reference location', async () => {
      const mechanics = [
        {
          _id: '1',
          name: 'Low Rated',
          is_verified: true,
          is_available: true,
          is_online: true,
          latitude: 26.65,
          longitude: 87.27,
          rating: 3.5
        },
        {
          _id: '2',
          name: 'High Rated',
          is_verified: true,
          is_available: true,
          is_online: true,
          latitude: 26.66,
          longitude: 87.28,
          rating: 4.8
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mechanics)
      });

      const result = await Mechanic.findAllActive();

      expect(mockCollection.find).toHaveBeenCalledWith({
        is_verified: true,
        is_available: true,
        is_online: true,
        $or: [
          { latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } },
          { current_latitude: { $exists: true, $ne: null }, current_longitude: { $exists: true, $ne: null } }
        ]
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('High Rated');
      expect(result[1].name).toBe('Low Rated');
    });

    it('should add distance when reference location is provided', async () => {
      const mechanics = [
        {
          _id: '1',
          name: 'Nearby Mechanic',
          is_verified: true,
          is_available: true,
          is_online: true,
          latitude: 26.67,
          longitude: 87.28,
          rating: 4.0
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mechanics)
      });

      const result = await Mechanic.findAllActive({
        referenceLat: 26.68,
        referenceLng: 87.29
      });

      expect(result[0]).toHaveProperty('distance');
      expect(typeof result[0].distance).toBe('number');
    });

    it('should prioritize current location over base location', async () => {
      const mechanics = [
        {
          _id: '1',
          name: 'Realtime Mechanic',
          is_verified: true,
          is_available: true,
          is_online: true,
          latitude: 26.60,
          longitude: 87.20,
          current_latitude: 26.70,
          current_longitude: 87.30,
          rating: 4.2
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mechanics)
      });

      const result = await Mechanic.findAllActive();

      expect(result[0].latitude).toBe(26.70);
      expect(result[0].longitude).toBe(87.30);
      expect(result[0].location_is_current).toBe(true);
    });

    it('should include vehicle filters in query', async () => {
      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      await Mechanic.findAllActive({
        vehicle_type: 'Car',
        vehicle_brand: 'Toyota'
      });

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          is_verified: true,
          is_available: true,
          is_online: true,
          'vehicle_capabilities.type': 'Car',
          'vehicle_capabilities.brand': 'Toyota',
          vehicle_capabilities: {}
        })
      );
    });
  });

  describe('findNearby', () => {
    it('should return nearby mechanics within radius sorted by distance', async () => {
      const mechanics = [
        {
          _id: '1',
          name: 'Near One',
          is_verified: true,
          is_available: true,
          is_online: true,
          latitude: 26.6700,
          longitude: 87.2800,
          rating: 4.0
        },
        {
          _id: '2',
          name: 'Far One',
          is_verified: true,
          is_available: true,
          is_online: true,
          latitude: 27.5000,
          longitude: 88.5000,
          rating: 5.0
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mechanics)
      });

      const result = await Mechanic.findNearby(26.6701, 87.2801, 10);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Near One');
      expect(result[0]).toHaveProperty('distance');
    });

    it('should skip mechanics with no location', async () => {
      const mechanics = [
        {
          _id: '1',
          name: 'No Location',
          is_verified: true,
          is_available: true,
          is_online: true
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mechanics)
      });

      const result = await Mechanic.findNearby(26.67, 87.28, 10);

      expect(result).toEqual([]);
    });

    it('should prioritize current location over base location in nearby search', async () => {
      const mechanics = [
        {
          _id: '1',
          name: 'Moving Mechanic',
          is_verified: true,
          is_available: true,
          is_online: true,
          latitude: 28.0,
          longitude: 88.0,
          current_latitude: 26.6701,
          current_longitude: 87.2801
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mechanics)
      });

      const result = await Mechanic.findNearby(26.67, 87.28, 10);

      expect(result).toHaveLength(1);
      expect(result[0].latitude).toBe(26.6701);
      expect(result[0].longitude).toBe(87.2801);
      expect(result[0].location_is_current).toBe(true);
    });

    it('should limit results to 20 mechanics', async () => {
      const mechanics = Array.from({ length: 25 }, (_, i) => ({
        _id: `${i + 1}`,
        name: `Mechanic ${i + 1}`,
        is_verified: true,
        is_available: true,
        is_online: true,
        latitude: 26.67 + i * 0.00001,
        longitude: 87.28 + i * 0.00001
      }));

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mechanics)
      });

      const result = await Mechanic.findNearby(26.67, 87.28, 100);

      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should include vehicle filters in nearby query', async () => {
      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      await Mechanic.findNearby(26.67, 87.28, 10, {
        vehicle_type: 'Bike',
        vehicle_brand: 'Honda'
      });

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          is_verified: true,
          is_available: true,
          is_online: true,
          'vehicle_capabilities.type': 'Bike',
          'vehicle_capabilities.brand': 'Honda',
          vehicle_capabilities: {}
        })
      );
    });
  });

  describe('update', () => {
    it('should update mechanic and set updated_at', async () => {
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await Mechanic.update('mech123', {
        is_online: true,
        rating: 4.5
      });

      expect(ObjectId).toHaveBeenCalledWith('mech123');
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);

      const [filter, updateDoc] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        _id: { mockedObjectId: 'mech123' }
      });

      expect(updateDoc.$set).toMatchObject({
        is_online: true,
        rating: 4.5
      });

      expect(updateDoc.$set.updated_at).toBeInstanceOf(Date);
      expect(result).toEqual({
        matchedCount: 1,
        modifiedCount: 1
      });
    });
  });

  describe('updateLocation', () => {
    it('should update mechanic location fields', async () => {
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await Mechanic.updateLocation('mech123', 26.67, 87.28);

      expect(ObjectId).toHaveBeenCalledWith('mech123');
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);

      const [filter, updateDoc] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        _id: { mockedObjectId: 'mech123' }
      });

      expect(updateDoc.$set.latitude).toBe(26.67);
      expect(updateDoc.$set.longitude).toBe(87.28);
      expect(updateDoc.$set.current_latitude).toBe(26.67);
      expect(updateDoc.$set.current_longitude).toBe(87.28);
      expect(updateDoc.$set.location_updated_at).toBeInstanceOf(Date);
      expect(updateDoc.$set.updated_at).toBeInstanceOf(Date);

      expect(result).toEqual({
        matchedCount: 1,
        modifiedCount: 1
      });
    });

    it('should throw error for invalid latitude', async () => {
      await expect(
        Mechanic.updateLocation('mech123', 'invalid', 87.28)
      ).rejects.toThrow('Invalid coordinates provided');

      expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });

    it('should throw error for invalid longitude', async () => {
      await expect(
        Mechanic.updateLocation('mech123', 26.67, 'invalid')
      ).rejects.toThrow('Invalid coordinates provided');

      expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });

    it('should throw error for NaN coordinates', async () => {
      await expect(
        Mechanic.updateLocation('mech123', NaN, NaN)
      ).rejects.toThrow('Invalid coordinates provided');

      expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });

    it('should use object id without converting', async () => {
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const mechanicObjId = { custom: 'mechanicObjId' };

      await Mechanic.updateLocation(mechanicObjId, 26.67, 87.28);

      expect(ObjectId).not.toHaveBeenCalled();

      const [filter] = mockCollection.updateOne.mock.calls[0];
      expect(filter).toEqual({
        _id: mechanicObjId
      });
    });
  });
});