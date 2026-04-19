import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getMechanicProfileId } from '../services/api';

/**
 * Custom hook to automatically track mechanic location in real-time
 * This hook:
 * 1. Detects when a mechanic is logged in
 * 2. Gets the mechanic's ID
 * 3. Connects to Socket.io
 * 4. Starts watching location using browser Geolocation API
 * 5. Sends location updates to the backend every time location changes
 */
const useMechanicLocationTracking = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const watchIdRef = useRef(null);
  const mechanicIdRef = useRef(null);
  const lastLocationRef = useRef(null);
  const isConnectedRef = useRef(false);
  const lastUpdateTimeRef = useRef(null);
  const periodicUpdateIntervalRef = useRef(null);

  useEffect(() => {
    // Only track location for mechanics
    if (!user || user.user_type !== 'mechanic') {
      // Clean up if user is not a mechanic
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (socket && isConnectedRef.current) {
        socket.emit('mechanic:disconnect');
        isConnectedRef.current = false;
      }
      return;
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return;
    }

    // Initialize mechanic connection
    const initializeMechanicTracking = async () => {
      try {
        // Wait for socket to be ready
        if (!socket) {
          console.log('Waiting for socket connection...');
          return;
        }

        // Get mechanic ID
        const response = await getMechanicProfileId();
        const mechanicId = response.data.mechanicId;
        
        if (!mechanicId) {
          console.error('Mechanic ID not found');
          return;
        }

        mechanicIdRef.current = mechanicId;

        // Connect to Socket.io as mechanic when socket is ready
        const connectToSocket = () => {
          if (socket && socket.connected && !isConnectedRef.current) {
            socket.emit('mechanic:connect', {
              mechanicId: mechanicId,
              userId: user._id || user.id
            });
            isConnectedRef.current = true;
            console.log('Mechanic connected to Socket.io:', mechanicId);
            return true;
          }
          return false;
        };

        // Try to connect immediately
        if (!connectToSocket()) {
          // If socket is not ready, wait for it to connect
          const onConnect = () => {
            if (connectToSocket()) {
              socket.off('connect', onConnect);
              
              // Once connected, send current location if we have it
              if (lastLocationRef.current) {
                setTimeout(() => {
                  const location = lastLocationRef.current;
                  socket.emit('mechanic:location-update', {
                    latitude: location.latitude,
                    longitude: location.longitude
                  });
                  lastUpdateTimeRef.current = Date.now();
                  console.log('Sent initial location after socket connection');
                }, 500);
              }
            }
          };
          socket.on('connect', onConnect);
        } else {
          // If already connected, send location after a short delay
          setTimeout(() => {
            if (lastLocationRef.current && socket && isConnectedRef.current) {
              const location = lastLocationRef.current;
              socket.emit('mechanic:location-update', {
                latitude: location.latitude,
                longitude: location.longitude
              });
              lastUpdateTimeRef.current = Date.now();
              console.log('Sent initial location after immediate connection');
            }
          }, 500);
        }

        // Function to send location update to backend
        const sendLocationUpdate = (location, retryCount = 0) => {
          if (!socket || !isConnectedRef.current || !mechanicIdRef.current) {
            console.warn('Cannot send location update: socket not ready');
            return;
          }

          try {
            socket.emit('mechanic:location-update', {
              latitude: location.latitude,
              longitude: location.longitude
            });

            lastLocationRef.current = location;
            lastUpdateTimeRef.current = Date.now();
            console.log('✓ Mechanic location sent to database:', {
              latitude: location.latitude.toFixed(6),
              longitude: location.longitude.toFixed(6),
              accuracy: location.accuracy ? `${location.accuracy.toFixed(0)}m` : 'N/A',
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error sending location update:', error);
            // Retry up to 3 times
            if (retryCount < 3) {
              setTimeout(() => {
                sendLocationUpdate(location, retryCount + 1);
              }, 1000 * (retryCount + 1)); // Exponential backoff
            }
          }
        };

        // Listen for location update errors from backend
        if (socket) {
          socket.on('mechanic:location-update-error', (error) => {
            console.error('Backend location update error:', error);
            // Retry sending the last known location
            if (lastLocationRef.current) {
              setTimeout(() => {
                sendLocationUpdate(lastLocationRef.current);
              }, 2000);
            }
          });
        }

        // Get initial location immediately
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            
            // Send initial location immediately
            if (socket && isConnectedRef.current) {
              sendLocationUpdate(location);
            } else {
              // Store it to send when connected
              lastLocationRef.current = location;
            }
          },
          (error) => {
            console.error('Error getting initial mechanic location:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0 // Get fresh location
          }
        );

        // Start watching location
        if (watchIdRef.current === null) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              };

              // Update if location changed significantly (more than 20 meters)
              // or if it's the first location
              const shouldUpdate = !lastLocationRef.current || 
                calculateDistance(
                  lastLocationRef.current.latitude,
                  lastLocationRef.current.longitude,
                  location.latitude,
                  location.longitude
                ) > 0.02; // 20 meters in kilometers (reduced threshold for more frequent updates)

              if (shouldUpdate && socket && isConnectedRef.current) {
                sendLocationUpdate(location);
              }
            },
            (error) => {
              console.error('Error getting mechanic location:', error);
              // Don't stop tracking on error, just log it
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000 // Accept cached position up to 5 seconds old
            }
          );
          console.log('Started tracking mechanic location');
        }

        // Set up periodic updates (every 30 seconds) to ensure database stays fresh
        // even if mechanic isn't moving
        if (periodicUpdateIntervalRef.current === null) {
          periodicUpdateIntervalRef.current = setInterval(() => {
            if (lastLocationRef.current && socket && isConnectedRef.current) {
              // Send periodic update to keep database current
              sendLocationUpdate(lastLocationRef.current);
            }
          }, 30000); // Update every 30 seconds
        }
      } catch (error) {
        console.error('Error initializing mechanic tracking:', error);
      }
    };

    // Small delay to ensure socket is connected
    const timer = setTimeout(() => {
      initializeMechanicTracking();
    }, 500);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      
      // Clear periodic update interval
      if (periodicUpdateIntervalRef.current !== null) {
        clearInterval(periodicUpdateIntervalRef.current);
        periodicUpdateIntervalRef.current = null;
      }
      
      // Stop watching location
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('Stopped tracking mechanic location');
      }

      // Disconnect from Socket.io
      if (socket && isConnectedRef.current) {
        socket.emit('mechanic:disconnect');
        isConnectedRef.current = false;
        console.log('Mechanic disconnected from Socket.io');
      }

      // Remove socket listeners
      if (socket) {
        socket.off('connect');
        socket.off('mechanic:location-update-error');
      }

      lastLocationRef.current = null;
      mechanicIdRef.current = null;
      lastUpdateTimeRef.current = null;
    };
  }, [user, socket]);

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
};

export default useMechanicLocationTracking;

