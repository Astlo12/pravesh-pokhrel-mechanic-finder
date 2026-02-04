const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/database');
const User = require('./models/User');

async function createAdmin() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findByEmail('findmech@admin.com');
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Updating password...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Update admin user
      await User.update(existingAdmin._id.toString(), {
        password: hashedPassword,
        user_type: 'admin',
        name: 'Admin User',
        phone: '+1234567899'
      });
      
      console.log('✅ Admin user password updated successfully!');
      console.log('📧 Email: findmech@admin.com');
      console.log('🔑 Password: admin123');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create admin user
      const adminData = {
        email: 'findmech@admin.com',
        password: hashedPassword,
        name: 'Admin User',
        phone: '+1234567899',
        user_type: 'admin',
        vehicle_models: [],
        preferred_service_locations: [],
        service_requirements: '',
        is_verified: true
      };
      
      const adminId = await User.create(adminData);
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: findmech@admin.com');
      console.log('🔑 Password: admin123');
      console.log('🆔 Admin ID:', adminId.toString());
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();

