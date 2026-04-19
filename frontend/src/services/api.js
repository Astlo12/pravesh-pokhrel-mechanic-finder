import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const verifyOTP = (email, otp) => api.post('/auth/verify-otp', { email, otp });
export const resetPassword = (resetToken, password) => api.post('/auth/reset-password', { resetToken, password });

// Mechanics
export const getNearbyMechanics = (params) => api.get('/mechanics/nearby', { params });
export const searchMechanicsEmergency = (params) => api.get('/mechanics/emergency', { params });
export const getMechanicProfile = (id) => api.get(`/mechanics/${id}`);
export const getMyMechanicProfile = () => api.get('/mechanics/me/profile');
export const getMechanicProfileId = () => api.get('/mechanics/me/profile'); // Returns { mechanicId }
export const updateMechanicAvailability = (id, data) => api.put(`/mechanics/${id}/availability`, data);
export const updateMechanicProfile = (id, data) => api.put(`/mechanics/${id}/profile`, data);
export const setMechanicOnline = (id, isOnline) => api.put(`/mechanics/${id}/online`, { is_online: isOnline });

// Bookings
export const createBooking = (data) => api.post('/bookings', data);
export const getCustomerBookings = () => api.get('/bookings/customer');
export const getMechanicBookings = () => api.get('/bookings/mechanic');
export const updateBookingStatus = (id, data) => api.put(`/bookings/${id}/status`, data);
export const getBooking = (id) => api.get(`/bookings/${id}`);

// Booking chat (REST history; live via socket)
export const getBookingMessages = (bookingId) => api.get(`/messages/booking/${bookingId}`);
export const getChatUnreadSummary = () => api.get('/messages/unread-summary');
export const markBookingChatRead = (bookingId) => api.post(`/messages/booking/${bookingId}/read`);

// Reviews
export const createReview = (data) => api.post('/reviews', data);
export const getMechanicReviews = (mechanicId) => api.get(`/reviews/mechanic/${mechanicId}`);

// User Profile
export const getUserProfile = () => api.get('/users/profile');
export const updateUserProfile = (data) => api.put('/users/profile', data);
export const uploadUserProfilePicture = (file) => {
  const formData = new FormData();
  formData.append('profile_picture', file);
  return api.post('/users/profile/picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Mechanic Profile Picture
export const uploadMechanicProfilePicture = (id, file) => {
  const formData = new FormData();
  formData.append('profile_picture', file);
  return api.post(`/mechanics/${id}/profile/picture`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Admin APIs
export const getAdminStats = () => api.get('/admin/dashboard/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const getAdminMechanics = (params) => api.get('/admin/mechanics', { params });
export const getAdminBookings = (params) => api.get('/admin/bookings', { params });
export const verifyMechanic = (id, isVerified) => api.put(`/admin/mechanics/${id}/verify`, { is_verified: isVerified });
export const updateBookingStatusAdmin = (id, status) => api.put(`/admin/bookings/${id}/status`, { status });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// In-app notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const getUnreadNotificationCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

export default api;

