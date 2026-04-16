const Booking = require('../models/Booking');
const { getCollection, ObjectId } = require('../config/database');

jest.mock('../config/database', () => {
  const mockObjectId = jest.fn((id) => ({ mockedObjectId: id }));

  return {
    getCollection: jest.fn(),
    ObjectId: mockObjectId
  };
});

describe('Booking Model', () => {
  let mockCollection;

  beforeEach(() => {
    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
    jest.clearAllMocks();
  });

  describe('collection', () => {
    it('should return bookings collection', () => {
      Booking.collection();
      expect(getCollection).toHaveBeenCalledWith('bookings');
    });
  });

  describe('create', () => {
    it('should create a booking with default fields', async () => {
      const bookingData = {
        customer_id: 'customer123',
        mechanic_id: 'mechanic123',
        latitude: 26.67,
        longitude: 87.28,
        issue: 'Engine problem'
      };

      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'newBookingId123'
      });

      const result = await Booking.create(bookingData);

      expect(getCollection).toHaveBeenCalledWith('bookings');
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        customer_id: 'customer123',
        mechanic_id: 'mechanic123',
        latitude: 26.67,
        longitude: 87.28,
        customer_latitude: 26.67,
        customer_longitude: 87.28,
        issue: 'Engine problem',
        status: 'pending'
      });

      expect(insertedDoc.created_at).toBeInstanceOf(Date);
      expect(insertedDoc.updated_at).toBeInstanceOf(Date);

      expect(result).toBe('newBookingId123');
    });
  });

  describe('findById', () => {
    it('should find booking by string id and convert to ObjectId', async () => {
      const mockBooking = { _id: 'abc123', status: 'pending' };
      const convertedId = { mockedObjectId: 'abc123' };

      mockCollection.findOne.mockResolvedValue(mockBooking);

      const result = await Booking.findById('abc123');

      expect(ObjectId).toHaveBeenCalledWith('abc123');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: convertedId });
      expect(result).toEqual(mockBooking);
    });

    it('should find booking by ObjectId without converting', async () => {
      const objectId = { custom: 'objectId' };
      const mockBooking = { _id: objectId, status: 'pending' };

      mockCollection.findOne.mockResolvedValue(mockBooking);

      const result = await Booking.findById(objectId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: objectId });
      expect(result).toEqual(mockBooking);
    });
  });

  describe('findByCustomerId', () => {
    it('should find bookings by customer id and sort by created_at descending', async () => {
      const customerBookings = [
        { _id: '1', customer_id: 'cust1' },
        { _id: '2', customer_id: 'cust1' }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(customerBookings);
      const sortMock = jest.fn().mockReturnValue({ toArray: toArrayMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      const result = await Booking.findByCustomerId('cust1');

      expect(ObjectId).toHaveBeenCalledWith('cust1');
      expect(mockCollection.find).toHaveBeenCalledWith({
        customer_id: { mockedObjectId: 'cust1' }
      });
      expect(sortMock).toHaveBeenCalledWith({ created_at: -1 });
      expect(toArrayMock).toHaveBeenCalled();
      expect(result).toEqual(customerBookings);
    });
  });

  describe('findByMechanicId', () => {
    it('should find bookings by mechanic id and sort by created_at descending', async () => {
      const mechanicBookings = [
        { _id: '1', mechanic_id: 'mech1' },
        { _id: '2', mechanic_id: 'mech1' }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(mechanicBookings);
      const sortMock = jest.fn().mockReturnValue({ toArray: toArrayMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      const result = await Booking.findByMechanicId('mech1');

      expect(ObjectId).toHaveBeenCalledWith('mech1');
      expect(mockCollection.find).toHaveBeenCalledWith({
        mechanic_id: { mockedObjectId: 'mech1' }
      });
      expect(sortMock).toHaveBeenCalledWith({ created_at: -1 });
      expect(toArrayMock).toHaveBeenCalled();
      expect(result).toEqual(mechanicBookings);
    });
  });

  describe('update', () => {
    it('should update booking and set updated_at field', async () => {
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const updateData = {
        status: 'accepted',
        mechanic_id: 'mechanic123'
      };

      const result = await Booking.update('booking123', updateData);

      expect(ObjectId).toHaveBeenCalledWith('booking123');
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);

      const [filter, updateDoc] = mockCollection.updateOne.mock.calls[0];

      expect(filter).toEqual({
        _id: { mockedObjectId: 'booking123' }
      });

      expect(updateDoc.$set).toMatchObject({
        status: 'accepted',
        mechanic_id: 'mechanic123'
      });

      expect(updateDoc.$set.updated_at).toBeInstanceOf(Date);
      expect(result).toEqual({
        matchedCount: 1,
        modifiedCount: 1
      });
    });
  });
});