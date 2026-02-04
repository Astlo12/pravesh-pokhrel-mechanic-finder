const { getCollection, ObjectId } = require('../config/database');

class OTP {
  static collection() {
    return getCollection('otps');
  }

  // Generate 6-digit OTP
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database
  static async storeOTP(email, otp) {
    const collection = this.collection();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Delete any existing OTP for this email
    await collection.deleteMany({ email });

    // Insert new OTP
    const result = await collection.insertOne({
      email,
      otp,
      expiresAt,
      attempts: 0,
      created_at: new Date()
    });

    return result.insertedId;
  }

  // Verify OTP
  static async verifyOTP(email, otp) {
    const collection = this.collection();
    
    // Find OTP record
    const otpRecord = await collection.findOne({ 
      email,
      expiresAt: { $gt: new Date() } // Not expired
    });

    if (!otpRecord) {
      return { valid: false, error: 'OTP not found or expired. Please request a new one.' };
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      await collection.deleteOne({ email });
      return { valid: false, error: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await collection.updateOne(
        { email },
        { $inc: { attempts: 1 } }
      );
      return { valid: false, error: 'Invalid OTP. Please try again.' };
    }

    // Valid OTP - delete it
    await collection.deleteOne({ email });
    return { valid: true };
  }

  // Clean expired OTPs (can be called periodically)
  static async cleanExpired() {
    const collection = this.collection();
    const result = await collection.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  }
}

module.exports = OTP;

