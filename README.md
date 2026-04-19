# FindMech - Mechanic Finder + Live ETA & Booking

A smart web-based platform that connects bike owners with verified nearby mechanics in real-time. The system enables users to search for available mechanics based on their live location, view estimated time of arrival (ETA), and book either on-site assistance or scheduled repair services.

## 🚀 Features

### For Customers
- 🔍 **Search Nearby Mechanics**: Find available mechanics based on your location
- 📍 **Live Location Tracking**: Track mechanic's real-time location and get accurate ETAs
- ⭐ **Verified Mechanics**: Browse mechanics with ratings, reviews, and vehicle capabilities
- 🏍️ **Bike Specialization**: Find mechanics certified for your specific bike brand
- ⚡ **Instant Booking**: Book on-site assistance or schedule repairs in seconds
- 📱 **Real-time Updates**: Receive live ETA updates via WebSocket

### For Mechanics
- 👤 **Profile Management**: Create and manage your professional profile
- 🏍️ **Vehicle Capabilities**: Specify brands and types of bikes you can repair
- 📊 **Availability Management**: Set your availability and online status
- 📍 **Location Updates**: Update your location in real-time while traveling
- 📋 **Booking Management**: Accept, reject, or manage booking requests
- ⭐ **Reviews & Ratings**: Build your reputation through customer reviews

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **MongoDB** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Nodemailer** - Email service (for OTP verification)

### Frontend
- **React** - UI library
- **React Router** - Routing
- **Socket.io Client** - Real-time updates
- **Leaflet** - Map integration
- **Axios** - HTTP client
- **Font Awesome** - Icons

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your computer:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **MongoDB Atlas account** (free tier works) - [Sign up here](https://www.mongodb.com/cloud/atlas/register)
- **Git** (optional, for cloning) - [Download here](https://git-scm.com/)
- **Code Editor** (VS Code recommended)

## 📦 Installation & Setup

Follow these steps to set up the project on your computer:

### Step 1: Clone or Download the Project

If you have the project in a Git repository:
```bash
git clone <repository-url>
cd MechanicFinder
```

If you have the project as a ZIP file:
1. Extract the ZIP file to your desired location
2. Open terminal/command prompt in the extracted folder

### Step 2: Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   This will install all required packages (Express, MongoDB, Socket.io, etc.)

3. **Create environment variables file:**
   - Create a new file named `.env` in the `backend` folder
   - Copy the following template and fill in your values:

   ```env
   # MongoDB Connection
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/?appName=FindMech
   DB_NAME=findmech

   # JWT Secret (generate a long random string)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # Server Configuration
   PORT=5000
   FRONTEND_URL=http://localhost:3000

   # Email Configuration (for password reset OTP)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

   **How to get MongoDB URI:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster (if you don't have one)
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `<dbname>` with `findmech` or your preferred database name

   **How to generate JWT Secret:**
   - You can use any long random string (at least 32 characters)
   - Online generator: [https://randomkeygen.com/](https://randomkeygen.com/)
   - Or use: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

   **How to get Gmail App Password (for email):**
   - Go to your Google Account settings
   - Enable 2-Step Verification
   - Go to "App passwords" section
   - Generate a new app password for "Mail"
   - Use that password in `EMAIL_PASSWORD`

   **Note:** If you don't want to set up email (password reset won't work), you can skip the email variables, but the forgot password feature won't function.

### Step 3: Frontend Setup

1. **Open a new terminal/command prompt** (keep the backend terminal running)

2. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```
   This will install all required packages (React, React Router, Axios, etc.)

4. **Create environment variables file (Optional):**
   - Create a new file named `.env` in the `frontend` folder
   - Add the following (if your backend runs on a different URL):

   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

   **Note:** If your backend runs on `http://localhost:5000`, you can skip this step as these are the default values.

## 🚀 Running the Application

### Start the Backend Server

1. **Open terminal/command prompt in the `backend` folder**

2. **For development (with auto-reload):**
   ```bash
   npm run dev
   ```

   **Or for production:**
   ```bash
   npm start
   ```

3. **You should see:**
   ```
   ✅ MongoDB connected successfully
   ✅ Email service is configured and ready. (or warning if not configured)
   🚀 Server running on port 5000
   📡 Socket.io server ready
   ```

   The backend server is now running on `http://localhost:5000`

### Start the Frontend Development Server

1. **Open a NEW terminal/command prompt** (keep backend running)

2. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

3. **Start the React development server:**
   ```bash
   npm start
   ```

4. **The browser should automatically open** to `http://localhost:3000`

   If it doesn't, manually open your browser and go to: `http://localhost:3000`

5. **You should see the FindMech landing page**

## 📁 Project Structure

```
MechanicFinder/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection configuration
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Mechanic.js         # Mechanic model
│   │   ├── Booking.js           # Booking model
│   │   ├── Review.js           # Review model
│   │   └── OTP.js               # OTP model (for password reset)
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── mechanics.js         # Mechanic routes
│   │   ├── bookings.js           # Booking routes
│   │   └── reviews.js           # Review routes
│   ├── utils/
│   │   └── emailService.js      # Email service (Nodemailer)
│   ├── server.js                # Main server file
│   ├── package.json
│   └── .env                     # Environment variables (create this)
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── Login.js
│   │   │   │   ├── Register.js
│   │   │   │   ├── ForgotPassword.js
│   │   │   │   ├── OTPVerification.js
│   │   │   │   ├── ResetPassword.js
│   │   │   │   └── MechanicProfileSetup.js
│   │   │   ├── landing/
│   │   │   │   └── Home.js
│   │   │   ├── css/
│   │   │   │   ├── Auth.css
│   │   │   │   ├── Home.css
│   │   │   │   ├── Navbar.css
│   │   │   │   └── ...
│   │   │   ├── Navbar.js
│   │   │   ├── MechanicList.js
│   │   │   ├── MechanicProfile.js
│   │   │   ├── Booking.js
│   │   │   ├── Dashboard.js
│   │   │   └── MapComponent.js
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── SocketContext.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── images/
│   │   │   ├── logooffindmech.png
│   │   │   └── ...
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .env                     # Environment variables (optional)
│
└── README.md                    # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset OTP
- `POST /api/auth/verify-otp` - Verify OTP for password reset
- `POST /api/auth/reset-password` - Reset password with token

### Mechanics
- `GET /api/mechanics/nearby` - Get nearby mechanics
- `GET /api/mechanics/:id` - Get mechanic profile
- `PUT /api/mechanics/:id/availability` - Update availability
- `PUT /api/mechanics/:id/profile` - Update profile
- `PUT /api/mechanics/:id/online` - Set online status

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/customer` - Get customer bookings
- `GET /api/bookings/mechanic` - Get mechanic bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/status` - Update booking status

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/mechanic/:mechanic_id` - Get mechanic reviews

## 🔧 Troubleshooting

### Backend Issues

**Problem: MongoDB connection error**
- ✅ Check your `MONGODB_URI` in `.env` file
- ✅ Ensure your MongoDB Atlas cluster is running
- ✅ Check if your IP address is whitelisted in MongoDB Atlas (Network Access)
- ✅ Verify your database username and password are correct

**Problem: Port 5000 already in use**
- ✅ Change `PORT=5000` to another port (e.g., `PORT=5001`) in `.env`
- ✅ Or stop the process using port 5000

**Problem: Email service not working**
- ✅ Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- ✅ For Gmail, use an App Password (not your regular password)
- ✅ Ensure 2-Step Verification is enabled on your Google Account
- ✅ The forgot password feature will not work if email is not configured

**Problem: JWT_SECRET error**
- ✅ Make sure `JWT_SECRET` is set in `.env` file
- ✅ Use a long random string (at least 32 characters)

### Frontend Issues

**Problem: Cannot connect to backend**
- ✅ Ensure backend server is running on port 5000
- ✅ Check `REACT_APP_API_URL` in frontend `.env` (if created)
- ✅ Check browser console for CORS errors
- ✅ Verify `FRONTEND_URL` in backend `.env` matches frontend URL

**Problem: Page not loading**
- ✅ Check if all dependencies are installed: `npm install`
- ✅ Clear browser cache
- ✅ Check browser console for errors

**Problem: Socket.io connection failed**
- ✅ Ensure backend server is running
- ✅ Check `REACT_APP_SOCKET_URL` in frontend `.env`
- ✅ Verify CORS settings in backend `server.js`

### General Issues

**Problem: Dependencies installation fails**
- ✅ Delete `node_modules` folder and `package-lock.json`
- ✅ Run `npm install` again
- ✅ Check Node.js version: `node --version` (should be v14+)

**Problem: Module not found errors**
- ✅ Make sure you're in the correct directory (backend or frontend)
- ✅ Run `npm install` again
- ✅ Check if the file path is correct

## 📝 Usage Guide

### For Customers

1. **Register/Login**: Create an account or login
2. **Find Mechanics**: Go to "Find Mechanics" to see nearby mechanics
3. **Filter**: Filter by bike brand and availability
4. **View Profile**: Click on a mechanic to see their profile, reviews, and capabilities
5. **Book Service**: Click "Book Service" to create a booking
6. **Track ETA**: View live ETA updates in your dashboard

### For Mechanics

1. **Register**: Create a mechanic account
2. **Complete Profile**: Add business name, experience, and bike brand capabilities
3. **Go Online**: Set your status to online and available
4. **Update Location**: Your location will be tracked automatically
5. **Manage Bookings**: Accept or reject booking requests from your dashboard
6. **Update Status**: Mark bookings as in-progress or completed

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Input validation and sanitization
- MongoDB injection prevention
- CORS configuration
- Secure password reset with OTP

## 🚀 Deploy on Render

This repository now includes a ready-to-use Render blueprint at `render.yaml` for:
- `mechanic-finder-backend` (Node web service)
- `mechanic-finder-frontend` (React static site)

### 1) Prepare environment values

1. Copy `backend/.env.example` and `frontend/.env.example` locally for reference.
2. Keep real secrets out of source code and set them in Render dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET` (auto-generated by blueprint, can be replaced manually)
   - `EMAIL_USER` / `EMAIL_PASSWORD` (if using forgot-password OTP)
   - `CLOUDINARY_URL` (if using image upload)
3. Update frontend/backend public URLs in Render env vars after first deploy:
   - `CORS_ORIGIN`
   - `FRONTEND_URL`
   - `REACT_APP_API_URL`
   - `REACT_APP_SOCKET_URL`

### 2) Create services from blueprint

1. Push this project to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Select the repository and deploy.
4. Render reads `render.yaml` and creates both services.

### 3) Final post-deploy checks

1. Open backend health URL:
   - `https://<your-backend>.onrender.com/api/health`
2. Open frontend URL and test:
   - Login/register
   - Nearby mechanic search
   - Socket features (ETA + notifications)

### 4) If frontend cannot reach backend

- Confirm `REACT_APP_API_URL` ends with `/api`
- Confirm `REACT_APP_SOCKET_URL` has no `/api` suffix
- Confirm backend `CORS_ORIGIN` includes the exact frontend URL (or comma-separated multiple URLs)
- Re-deploy frontend after changing frontend env vars

## 📄 License

This project is created for educational purposes as a final-year project.

## 📞 Support

For questions or issues, please contact the project maintainer or create an issue in the repository.

---

**Happy Coding! 🎉**

