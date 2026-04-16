const Review = require('../models/Review');
const { getCollection, ObjectId } = require('../config/database');

jest.mock('../config/database', () => {
  const mockObjectId = jest.fn((id) => ({ mockedObjectId: id }));

  return {
    getCollection: jest.fn(),
    ObjectId: mockObjectId
  };
});

jest.mock('../models/Mechanic', () => ({
  update: jest.fn()
}));

const Mechanic = require('../models/Mechanic');

describe('Review Model', () => {
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
  });

  describe('collection', () => {
    it('should return reviews collection', () => {
      Review.collection();
      expect(getCollection).toHaveBeenCalledWith('reviews');
    });
  });

  describe('create', () => {
    it('should create review with timestamps', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'review123'
      });

      const reviewData = {
        booking_id: 'booking123',
        customer_id: 'customer123',
        mechanic_id: 'mechanic123',
        rating: 5,
        comment: 'Very good service'
      };

      const result = await Review.create(reviewData);

      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        booking_id: 'booking123',
        customer_id: 'customer123',
        mechanic_id: 'mechanic123',
        rating: 5,
        comment: 'Very good service'
      });

      expect(insertedDoc.created_at).toBeInstanceOf(Date);
      expect(insertedDoc.updated_at).toBeInstanceOf(Date);
      expect(result).toBe('review123');
    });
  });

  describe('findByBookingId', () => {
    it('should find review by string booking id', async () => {
      const review = { _id: 'r1', booking_id: { mockedObjectId: 'booking123' } };
      mockCollection.findOne.mockResolvedValue(review);

      const result = await Review.findByBookingId('booking123');

      expect(ObjectId).toHaveBeenCalledWith('booking123');
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        booking_id: { mockedObjectId: 'booking123' }
      });
      expect(result).toEqual(review);
    });

    it('should use object id without converting', async () => {
      const bookingObjId = { custom: 'bookingObjId' };
      const review = { _id: 'r1', booking_id: bookingObjId };
      mockCollection.findOne.mockResolvedValue(review);

      const result = await Review.findByBookingId(bookingObjId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        booking_id: bookingObjId
      });
      expect(result).toEqual(review);
    });
  });

  describe('findByCustomerForBookings', () => {
    it('should return empty array when bookingObjectIds is empty', async () => {
      const result = await Review.findByCustomerForBookings('customer123', []);

      expect(result).toEqual([]);
      expect(mockCollection.find).not.toHaveBeenCalled();
    });

    it('should find reviews for customer and booking ids', async () => {
      const reviews = [
        { _id: '1', customer_id: { mockedObjectId: 'customer123' } },
        { _id: '2', customer_id: { mockedObjectId: 'customer123' } }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(reviews);
      mockCollection.find.mockReturnValue({ toArray: toArrayMock });

      const bookingObjectIds = [
        { mockedObjectId: 'booking1' },
        { mockedObjectId: 'booking2' }
      ];

      const result = await Review.findByCustomerForBookings('customer123', bookingObjectIds);

      expect(ObjectId).toHaveBeenCalledWith('customer123');
      expect(mockCollection.find).toHaveBeenCalledWith({
        customer_id: { mockedObjectId: 'customer123' },
        booking_id: { $in: bookingObjectIds }
      });
      expect(result).toEqual(reviews);
    });
  });

  describe('findByMechanicId', () => {
    it('should find reviews by mechanic id and apply limit', async () => {
      const reviews = [
        { _id: '1', rating: 5 },
        { _id: '2', rating: 4 }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(reviews);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      const result = await Review.findByMechanicId('mechanic123', 10);

      expect(ObjectId).toHaveBeenCalledWith('mechanic123');
      expect(mockCollection.find).toHaveBeenCalledWith({
        mechanic_id: { mockedObjectId: 'mechanic123' }
      });
      expect(sortMock).toHaveBeenCalledWith({ created_at: -1 });
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(result).toEqual(reviews);
    });

    it('should use object id without converting in findByMechanicId', async () => {
      const mechanicObjId = { custom: 'mechanicObjId' };

      const toArrayMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

      mockCollection.find.mockReturnValue({ sort: sortMock });

      await Review.findByMechanicId(mechanicObjId, 5);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.find).toHaveBeenCalledWith({
        mechanic_id: mechanicObjId
      });
      expect(limitMock).toHaveBeenCalledWith(5);
    });
  });

  describe('updateMechanicRating', () => {
    it('should do nothing when mechanic has no reviews', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      mockCollection.find.mockReturnValue({ toArray: toArrayMock });

      await Review.updateMechanicRating('mechanic123');

      expect(ObjectId).toHaveBeenCalledWith('mechanic123');
      expect(mockCollection.find).toHaveBeenCalledWith({
        mechanic_id: { mockedObjectId: 'mechanic123' }
      });
      expect(Mechanic.update).not.toHaveBeenCalled();
    });

    it('should calculate average rating and update mechanic', async () => {
      const reviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 3 }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(reviews);
      mockCollection.find.mockReturnValue({ toArray: toArrayMock });

      await Review.updateMechanicRating('mechanic123');

      expect(ObjectId).toHaveBeenCalledWith('mechanic123');
      expect(Mechanic.update).toHaveBeenCalledWith('mechanic123', {
        rating: 4.0,
        total_reviews: 3
      });
    });

    it('should round average rating to 2 decimal places', async () => {
      const reviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 4 }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(reviews);
      mockCollection.find.mockReturnValue({ toArray: toArrayMock });

      await Review.updateMechanicRating('mechanic123');

      expect(Mechanic.update).toHaveBeenCalledWith('mechanic123', {
        rating: 4.33,
        total_reviews: 3
      });
    });

    it('should use object id without converting in updateMechanicRating', async () => {
      const mechanicObjId = { custom: 'mechanicObjId' };

      const reviews = [
        { rating: 5 },
        { rating: 5 }
      ];

      const toArrayMock = jest.fn().mockResolvedValue(reviews);
      mockCollection.find.mockReturnValue({ toArray: toArrayMock });

      await Review.updateMechanicRating(mechanicObjId);

      expect(ObjectId).not.toHaveBeenCalled();
      expect(mockCollection.find).toHaveBeenCalledWith({
        mechanic_id: mechanicObjId
      });
      expect(Mechanic.update).toHaveBeenCalledWith(mechanicObjId, {
        rating: 5.0,
        total_reviews: 2
      });
    });
  });
});