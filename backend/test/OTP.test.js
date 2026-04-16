const OTP = require('../models/OTP');
const { getCollection } = require('../config/database');

jest.mock('../config/database', () => {
  return {
    getCollection: jest.fn()
  };
});

describe('OTP Model', () => {
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      deleteMany: jest.fn(),
      insertOne: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn()
    };

    getCollection.mockReturnValue(mockCollection);
  });

  describe('collection', () => {
    it('should return otps collection', () => {
      OTP.collection();
      expect(getCollection).toHaveBeenCalledWith('otps');
    });
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP string', () => {
      const otp = OTP.generateOTP();

      expect(typeof otp).toBe('string');
      expect(otp.length).toBe(6);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThanOrEqual(999999);
    });
  });

  describe('storeOTP', () => {
    it('should delete old OTP and store new one', async () => {
      mockCollection.deleteMany.mockResolvedValue({});
      mockCollection.insertOne.mockResolvedValue({
        insertedId: 'otp123'
      });

      const result = await OTP.storeOTP('test@email.com', '123456');

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        email: 'test@email.com'
      });

      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];

      expect(insertedDoc).toMatchObject({
        email: 'test@email.com',
        otp: '123456',
        attempts: 0
      });

      expect(insertedDoc.expiresAt).toBeInstanceOf(Date);
      expect(insertedDoc.created_at).toBeInstanceOf(Date);

      expect(result).toBe('otp123');
    });
  });

  describe('verifyOTP', () => {
    it('should return invalid if OTP not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await OTP.verifyOTP('test@email.com', '123456');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('OTP not found or expired');
    });

    it('should return error if too many attempts', async () => {
      mockCollection.findOne.mockResolvedValue({
        email: 'test@email.com',
        otp: '123456',
        attempts: 5
      });

      mockCollection.deleteOne.mockResolvedValue({});

      const result = await OTP.verifyOTP('test@email.com', '123456');

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        email: 'test@email.com'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many failed attempts');
    });

    it('should increment attempts if OTP is incorrect', async () => {
      mockCollection.findOne.mockResolvedValue({
        email: 'test@email.com',
        otp: '123456',
        attempts: 2
      });

      mockCollection.updateOne.mockResolvedValue({});

      const result = await OTP.verifyOTP('test@email.com', '000000');

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { email: 'test@email.com' },
        { $inc: { attempts: 1 } }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid OTP');
    });

    it('should validate OTP and delete record if correct', async () => {
      mockCollection.findOne.mockResolvedValue({
        email: 'test@email.com',
        otp: '123456',
        attempts: 1
      });

      mockCollection.deleteOne.mockResolvedValue({});

      const result = await OTP.verifyOTP('test@email.com', '123456');

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        email: 'test@email.com'
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('cleanExpired', () => {
    it('should delete expired OTPs', async () => {
      mockCollection.deleteMany.mockResolvedValue({
        deletedCount: 3
      });

      const result = await OTP.cleanExpired();

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) }
      });

      expect(result).toBe(3);
    });
  });
});