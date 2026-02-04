const bcrypt = require('bcryptjs');
const { connectDB, getCollection, ObjectId } = require('./config/database');

// Sample data
const sampleUsers = [
  // Customers
  {
    email: 'john.doe@example.com',
    password: 'password123',
    name: 'John Doe',
    phone: '+1234567890',
    user_type: 'customer',
    vehicle_models: [
      { type: 'bike', brand: 'Honda', model: 'CBR 250' },
      { type: 'car', brand: 'Toyota', model: 'Camry 2020' }
    ],
    preferred_service_locations: [
      { name: 'Home', latitude: 27.7172, longitude: 85.3240 },
      { name: 'Office', latitude: 27.7000, longitude: 85.3000 }
    ],
    service_requirements: 'Prefer mechanics with good ratings and quick response time.'
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    name: 'Jane Smith',
    phone: '+1234567891',
    user_type: 'customer',
    vehicle_models: [
      { type: 'bike', brand: 'Yamaha', model: 'R15' }
    ],
    preferred_service_locations: [
      { name: 'Home', latitude: 27.7200, longitude: 85.3300 }
    ],
    service_requirements: 'Need emergency roadside assistance available 24/7.'
  },
  {
    email: 'mike.johnson@example.com',
    password: 'password123',
    name: 'Mike Johnson',
    phone: '+1234567892',
    user_type: 'customer',
    vehicle_models: [
      { type: 'car', brand: 'Honda', model: 'Civic 2019' },
      { type: 'bike', brand: 'Bajaj', model: 'Pulsar 200' }
    ],
    preferred_service_locations: [
      { name: 'Home', latitude: 27.7100, longitude: 85.3200 }
    ],
    service_requirements: 'Looking for mechanics specialized in Honda vehicles.'
  },
  // Mechanics
  {
    email: 'raj.mechanic@example.com',
    password: 'password123',
    name: 'Raj Kumar',
    phone: '+1234567893',
    user_type: 'mechanic'
  },
  {
    email: 'suresh.workshop@example.com',
    password: 'password123',
    name: 'Suresh Sharma',
    phone: '+1234567894',
    user_type: 'mechanic'
  },
  {
    email: 'bike.expert@example.com',
    password: 'password123',
    name: 'Amit Patel',
    phone: '+1234567895',
    user_type: 'mechanic'
  },
  {
    email: 'car.care@example.com',
    password: 'password123',
    name: 'Vikram Singh',
    phone: '+1234567896',
    user_type: 'mechanic'
  },
  {
    email: 'mobile.mechanic@example.com',
    password: 'password123',
    name: 'Rohit Verma',
    phone: '+1234567897',
    user_type: 'mechanic'
  }
];

const sampleMechanics = [
  {
    business_name: 'Raj\'s Auto Repair',
    license_number: 'MECH-2024-001',
    years_experience: 8,
    latitude: 27.7172,
    longitude: 85.3240,
    service_radius: 15,
    is_available: true,
    is_online: true,
    is_verified: true,
    vehicle_capabilities: [
      { type_name: 'bike', brand_name: 'Honda' },
      { type_name: 'bike', brand_name: 'Yamaha' },
      { type_name: 'bike', brand_name: 'Bajaj' },
      { type_name: 'car', brand_name: 'Toyota' }
    ],
    services_offered: [
      'On-site repair',
      'Battery jumpstart',
      'Tire puncture repair',
      'Full service',
      'Emergency assistance'
    ],
    certifications: [
      { name: 'Automotive Service Excellence', issuing_authority: 'ASE' },
      { name: 'Motorcycle Mechanic Certification', issuing_authority: 'MMC' }
    ],
    work_history: [
      {
        company: 'City Auto Works',
        position: 'Senior Mechanic',
        start_date: new Date('2016-01-01'),
        end_date: new Date('2020-12-31'),
        description: 'Specialized in bike and car repairs, managed team of 5 mechanics'
      }
    ],
    working_time: '9:00 AM - 7:00 PM',
    rating: 4.5,
    total_reviews: 12,
    total_customers: 45
  },
  {
    business_name: 'Suresh\'s Professional Service',
    license_number: 'MECH-2024-002',
    years_experience: 12,
    latitude: 27.7200,
    longitude: 85.3300,
    service_radius: 20,
    is_available: true,
    is_online: true,
    is_verified: true,
    vehicle_capabilities: [
      { type_name: 'bike', brand_name: 'Honda' },
      { type_name: 'bike', brand_name: 'Suzuki' },
      { type_name: 'bike', brand_name: 'Royal Enfield' },
      { type_name: 'car', brand_name: 'Honda' },
      { type_name: 'car', brand_name: 'Toyota' }
    ],
    services_offered: [
      'On-site repair',
      'Full service',
      'Engine overhaul',
      'Towing assistance',
      '24/7 Emergency service'
    ],
    certifications: [
      { name: 'Master Technician Certification', issuing_authority: 'MTC' },
      { name: 'Advanced Automotive Diagnostics', issuing_authority: 'AAD' }
    ],
    work_history: [
      {
        company: 'Premium Auto Care',
        position: 'Lead Mechanic',
        start_date: new Date('2012-01-01'),
        end_date: new Date('2018-12-31'),
        description: 'Led team of 10 mechanics, specialized in luxury vehicle repairs'
      },
      {
        company: 'Quick Fix Auto',
        position: 'Owner/Operator',
        start_date: new Date('2019-01-01'),
        end_date: null,
        description: 'Running own mobile mechanic service'
      }
    ],
    working_time: '8:00 AM - 8:00 PM',
    rating: 4.8,
    total_reviews: 28,
    total_customers: 120
  },
  {
    business_name: 'Bike Expert Services',
    license_number: 'MECH-2024-003',
    years_experience: 5,
    latitude: 27.7100,
    longitude: 85.3200,
    service_radius: 10,
    is_available: true,
    is_online: true,
    is_verified: false,
    vehicle_capabilities: [
      { type_name: 'bike', brand_name: 'Honda' },
      { type_name: 'bike', brand_name: 'Yamaha' },
      { type_name: 'bike', brand_name: 'TVS' }
    ],
    services_offered: [
      'On-site repair',
      'Battery jumpstart',
      'Tire puncture repair'
    ],
    certifications: [
      { name: 'Bike Mechanic Certification', issuing_authority: 'BMC' }
    ],
    work_history: [
      {
        company: 'Local Bike Shop',
        position: 'Mechanic',
        start_date: new Date('2019-01-01'),
        end_date: new Date('2023-12-31'),
        description: 'Specialized in bike repairs and maintenance'
      }
    ],
    working_time: '10:00 AM - 6:00 PM',
    rating: 4.2,
    total_reviews: 8,
    total_customers: 25
  },
  {
    business_name: 'Car Care Specialists',
    license_number: 'MECH-2024-004',
    years_experience: 15,
    latitude: 27.7150,
    longitude: 85.3250,
    service_radius: 25,
    is_available: true,
    is_online: false,
    is_verified: true,
    vehicle_capabilities: [
      { type_name: 'car', brand_name: 'Toyota' },
      { type_name: 'car', brand_name: 'Honda' },
      { type_name: 'car', brand_name: 'Nissan' }
    ],
    services_offered: [
      'Full service',
      'Engine repair',
      'Transmission service',
      'AC repair'
    ],
    certifications: [
      { name: 'Master Automotive Technician', issuing_authority: 'MAT' },
      { name: 'ASE Certified', issuing_authority: 'ASE' }
    ],
    work_history: [
      {
        company: 'Dealership Service Center',
        position: 'Master Technician',
        start_date: new Date('2009-01-01'),
        end_date: new Date('2022-12-31'),
        description: 'Worked on various car brands, specialized in Toyota and Honda'
      }
    ],
    working_time: '7:00 AM - 9:00 PM',
    rating: 4.9,
    total_reviews: 45,
    total_customers: 200
  },
  {
    business_name: 'Mobile Mechanic Pro',
    license_number: 'MECH-2024-005',
    years_experience: 6,
    latitude: 27.7250,
    longitude: 85.3350,
    service_radius: 12,
    is_available: false,
    is_online: true,
    is_verified: false,
    vehicle_capabilities: [
      { type_name: 'bike', brand_name: 'Bajaj' },
      { type_name: 'bike', brand_name: 'Hero' },
      { type_name: 'car', brand_name: 'Maruti' }
    ],
    services_offered: [
      'On-site repair',
      'Emergency assistance',
      'Battery replacement'
    ],
    certifications: [
      { name: 'Mobile Mechanic License', issuing_authority: 'MML' }
    ],
    work_history: [
      {
        company: 'Freelance',
        position: 'Mobile Mechanic',
        start_date: new Date('2018-01-01'),
        end_date: null,
        description: 'Providing mobile mechanic services'
      }
    ],
    working_time: '24/7',
    rating: 4.0,
    total_reviews: 15,
    total_customers: 60
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to database
    await connectDB();
    const db = require('./config/database').getDB();
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('mechanics').deleteMany({});
    await db.collection('bookings').deleteMany({});
    await db.collection('reviews').deleteMany({});
    console.log('✅ Existing data cleared\n');
    
    // Insert Users
    console.log('👥 Inserting users...');
    const userCollection = db.collection('users');
    const insertedUsers = [];
    
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        phone: userData.phone,
        user_type: userData.user_type,
        vehicle_models: userData.vehicle_models || [],
        preferred_service_locations: userData.preferred_service_locations || [],
        service_requirements: userData.service_requirements || '',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await userCollection.insertOne(user);
      user._id = result.insertedId;
      insertedUsers.push(user);
      console.log(`  ✓ Created user: ${userData.name} (${userData.email})`);
    }
    console.log(`✅ Inserted ${insertedUsers.length} users\n`);
    
    // Insert Mechanics
    console.log('🔧 Inserting mechanics...');
    const mechanicCollection = db.collection('mechanics');
    const insertedMechanics = [];
    
    const mechanicUsers = insertedUsers.filter(u => u.user_type === 'mechanic');
    
    for (let i = 0; i < sampleMechanics.length; i++) {
      const mechanicData = sampleMechanics[i];
      const user = mechanicUsers[i];
      
      if (!user) {
        console.log(`  ⚠️  Skipping mechanic ${i + 1}: No corresponding user found`);
        continue;
      }
      
      const mechanic = {
        user_id: user._id,
        ...mechanicData,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await mechanicCollection.insertOne(mechanic);
      mechanic._id = result.insertedId;
      insertedMechanics.push(mechanic);
      console.log(`  ✓ Created mechanic: ${mechanicData.business_name}`);
    }
    console.log(`✅ Inserted ${insertedMechanics.length} mechanics\n`);
    
    // Insert Bookings
    console.log('📅 Inserting bookings...');
    const bookingCollection = db.collection('bookings');
    const insertedBookings = [];
    const customerUsers = insertedUsers.filter(u => u.user_type === 'customer');
    
    const bookingData = [
      {
        customer: customerUsers[0],
        mechanic: insertedMechanics[0],
        service_type: 'on_site',
        vehicle_type: 'bike',
        vehicle_brand: 'Honda',
        issue_description: 'Engine not starting, needs battery check',
        latitude: 27.7172,
        longitude: 85.3240,
        address: '123 Main Street',
        status: 'completed',
        estimated_eta: 25
      },
      {
        customer: customerUsers[1],
        mechanic: insertedMechanics[1],
        service_type: 'scheduled',
        vehicle_type: 'bike',
        vehicle_brand: 'Yamaha',
        issue_description: 'Regular maintenance service',
        latitude: 27.7200,
        longitude: 85.3300,
        address: '456 Park Avenue',
        scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'accepted',
        estimated_eta: 30
      },
      {
        customer: customerUsers[2],
        mechanic: insertedMechanics[0],
        service_type: 'on_site',
        vehicle_type: 'car',
        vehicle_brand: 'Toyota',
        issue_description: 'Flat tire, need immediate assistance',
        latitude: 27.7100,
        longitude: 85.3200,
        address: '789 Oak Road',
        status: 'in_progress',
        estimated_eta: 15
      },
      {
        customer: customerUsers[0],
        mechanic: insertedMechanics[1],
        service_type: 'on_site',
        vehicle_type: 'bike',
        vehicle_brand: 'Honda',
        issue_description: 'Brake pad replacement needed',
        latitude: 27.7172,
        longitude: 85.3240,
        address: '123 Main Street',
        status: 'pending',
        estimated_eta: null
      },
      {
        customer: customerUsers[2],
        mechanic: insertedMechanics[2],
        service_type: 'scheduled',
        vehicle_type: 'bike',
        vehicle_brand: 'Bajaj',
        issue_description: 'Full service and oil change',
        latitude: 27.7100,
        longitude: 85.3200,
        address: '789 Oak Road',
        scheduled_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: 'accepted',
        estimated_eta: 45
      }
    ];
    
    for (const booking of bookingData) {
      const bookingDoc = {
        customer_id: booking.customer._id,
        mechanic_id: booking.mechanic._id,
        service_type: booking.service_type,
        vehicle_type: booking.vehicle_type,
        vehicle_brand: booking.vehicle_brand,
        issue_description: booking.issue_description,
        latitude: booking.latitude,
        longitude: booking.longitude,
        address: booking.address,
        status: booking.status,
        estimated_eta: booking.estimated_eta,
        scheduled_date: booking.scheduled_date || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await bookingCollection.insertOne(bookingDoc);
      bookingDoc._id = result.insertedId;
      insertedBookings.push(bookingDoc);
      console.log(`  ✓ Created booking: ${booking.customer.name} → ${booking.mechanic.business_name} (${booking.status})`);
    }
    console.log(`✅ Inserted ${insertedBookings.length} bookings\n`);
    
    // Insert Reviews
    console.log('⭐ Inserting reviews...');
    const reviewCollection = db.collection('reviews');
    const insertedReviews = [];
    
    const reviewData = [
      {
        booking: insertedBookings[0],
        customer: customerUsers[0],
        mechanic: insertedMechanics[0],
        rating: 5,
        comment: 'Excellent service! Raj arrived quickly and fixed my bike perfectly. Highly recommended!'
      },
      {
        booking: insertedBookings[0],
        customer: customerUsers[0],
        mechanic: insertedMechanics[0],
        rating: 4,
        comment: 'Good service, professional mechanic. Would use again.'
      },
      {
        booking: insertedBookings[1],
        customer: customerUsers[1],
        mechanic: insertedMechanics[1],
        rating: 5,
        comment: 'Suresh is amazing! Very knowledgeable and friendly. Best mechanic in town!'
      },
      {
        booking: insertedBookings[2],
        customer: customerUsers[2],
        mechanic: insertedMechanics[0],
        rating: 4,
        comment: 'Quick response time, fixed the issue efficiently.'
      },
      {
        booking: insertedBookings[3],
        customer: customerUsers[0],
        mechanic: insertedMechanics[1],
        rating: 5,
        comment: 'Outstanding service! Very professional and the work quality is top-notch.'
      }
    ];
    
    for (const review of reviewData) {
      const reviewDoc = {
        booking_id: review.booking._id,
        customer_id: review.customer._id,
        mechanic_id: review.mechanic._id,
        rating: review.rating,
        comment: review.comment,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await reviewCollection.insertOne(reviewDoc);
      reviewDoc._id = result.insertedId;
      insertedReviews.push(reviewDoc);
      console.log(`  ✓ Created review: ${review.rating} stars by ${review.customer.name}`);
    }
    console.log(`✅ Inserted ${insertedReviews.length} reviews\n`);
    
    // Update mechanic ratings based on reviews
    console.log('📊 Updating mechanic ratings...');
    const Review = require('./models/Review');
    for (const mechanic of insertedMechanics) {
      await Review.updateMechanicRating(mechanic._id.toString());
    }
    console.log('✅ Mechanic ratings updated\n');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${insertedUsers.length}`);
    console.log(`   - Mechanics: ${insertedMechanics.length}`);
    console.log(`   - Bookings: ${insertedBookings.length}`);
    console.log(`   - Reviews: ${insertedReviews.length}`);
    console.log('\n💡 Test credentials:');
    console.log('   Customers:');
    console.log('   - john.doe@example.com / password123');
    console.log('   - jane.smith@example.com / password123');
    console.log('   - mike.johnson@example.com / password123');
    console.log('   Mechanics:');
    console.log('   - raj.mechanic@example.com / password123');
    console.log('   - suresh.workshop@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();

