// import axios from 'axios';
// import { createClient } from 'redis';
// import dotenv from 'dotenv';

// dotenv.config();

// // Connect to Cloud Redis using the URL from your .env file
// const redisClient = createClient({
//   url: process.env.REDIS_URL
// });

// redisClient.on('error', (err) => console.log('Redis Cloud Connection Error:', err));

// (async () => {
//   try {
//     await redisClient.connect();
//     console.log('✨ Connected to Cloud Redis Database successfully!');
//   } catch (err) {
//     console.warn('⚠️ Cloud Redis connection failed. Falling back to live OSRM API direct fetching.');
//   }
// })();

// class DistanceService {
//   static generateCacheKey(coordinates) {
//     return 'matrix:' + coordinates.map(c => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`).join(';');
//   }

//   static async getDistanceMatrix(coordinates) {
//     const cacheKey = this.generateCacheKey(coordinates);
    
//     // 1. Try to fetch from Redis Cache first
//     if (redisClient.isOpen) {
//       try {
//         const cachedData = await redisClient.get(cacheKey);
//         if (cachedData) {
//           console.log('🚀 Cloud Redis Cache Hit! Returning optimized matrix instantly.');
//           return JSON.parse(cachedData);
//         }
//       } catch (err) {
//         console.error('Redis cache retrieval failed:', err.message);
//       }
//     }

//     // 2. Cache Miss: Query the OSRM Routing Engine
//     console.log('🌐 Redis Cache Miss. Fetching road network metrics from OSRM...');
//     const coordString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
//     const osrmUrl = `http://router.project-osrm.org/table/v1/driving/${coordString}?annotations=duration`;

//     try {
//       const response = await axios.get(osrmUrl);
      
//       if (response.data && response.data.durations) {
//         const durations = response.data.durations;

//         // 3. Save the result to Redis with a 24-Hour Expiration (86400 seconds)
//         if (redisClient.isOpen) {
//           await redisClient.setEx(cacheKey, 86400, JSON.stringify(durations));
//           console.log('💾 Successfully cached matrix coordinates in Cloud Redis for 24h.');
//         }

//         return durations;
//       }
      
//       throw new Error('Invalid response structure from OSRM');
//     } catch (error) {
//       console.error('OSRM API Call Failed:', error.message);
//       throw new Error(`Failed to resolve road metrics: ${error.message}`);
//     }
//   }
// }

// export default DistanceService;















import { createClient } from 'redis';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Redis client with an explicit socket timeout configuration
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5000, // Stop waiting after 5 seconds and trigger a fallback
    reconnectStrategy: (retries) => {
      if (retries > 2) return false; // Stop trying to reconnect after 2 failures to avoid blocking
      return 1000;
    }
  }
});

// Connect to Redis and catch errors silently so it doesn't crash the server
redisClient.on('error', (err) => console.error('⚠️ Redis Client Error:', err.message));
redisClient.connect().catch((err) => console.error('⚠️ Redis initial connection failed:', err.message));

class DistanceService {
  /**
   * Retrieves a routing distance matrix either via Cloud Redis Cache or OSRM API fallback
   */
  static async getDistanceMatrix(coordinates) {
    // Generate a unique cache key based on the lat/lng coordinates string
    const cacheKey = `matrix:${coordinates.map(c => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`).join('|')}`;

    // 1. Try to fetch from Redis Cache
    if (redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log('⚡ Redis Cache Hit! Retrieved matrix instantly.');
          return JSON.parse(cachedData);
        }
      } catch (redisError) {
        console.error('⚠️ Redis read failed, falling back to live API:', redisError.message);
      }
    }

    console.log('🌐 Redis Cache Miss or Database Offline. Fetching fresh road network metrics from OSRM...');

    // 2. Fallback to direct OSRM API Call if Redis misses or is timed out
    try {
      const coordString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/table/v1/driving/${coordString}?annotations=duration`;
      
      const response = await axios.get(osrmUrl, { timeout: 8000 }); // 8 seconds limit for OSRM response
      
      if (!response.data || !response.data.durations) {
        throw new Error('Invalid response layout received from OSRM open servers.');
      }

      const distanceMatrix = response.data.durations;

      // 3. Save to Redis Cache for future requests if the connection is active
      if (redisClient.isOpen) {
        try {
          await redisClient.setEx(cacheKey, 86400, JSON.stringify(distanceMatrix)); // Cache for 24 hours
          console.log('💾 Successfully saved fresh OSRM matrix to Redis Cloud Cache.');
        } catch (setCacheError) {
          console.error('⚠️ Failed to save matrix to Redis cache:', setCacheError.message);
        }
      }

      return distanceMatrix;

    } catch (osrmError) {
      console.error('❌ OSRM API Call Failed:', osrmError.message);
      throw new Error(`Failed to resolve road metrics: ${osrmError.message}`);
    }
  }
}

export default DistanceService;