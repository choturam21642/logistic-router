// import DistanceService from '../services/distance.service.js';
// import OptimizerService from '../services/optimizer.service.js';

// class RouteController {
//   /**
//    * Main orchestrator for fleet route optimization
//    */
//   static async optimizeFleetRoutes(req, res) {
//     try {
//       const { coordinates, vehicleCapacities, demands } = req.body;

//       // 1. Basic Request Validation
//       if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
//         return res.status(400).json({ 
//           error: 'Invalid input. Provide an array of at least 2 coordinate objects ({lat, lng}).' 
//         });
//       }
//       if (!vehicleCapacities || !Array.isArray(vehicleCapacities)) {
//         return res.status(400).json({ error: 'Provide a valid array for vehicleCapacities.' });
//       }
//       if (!demands || !Array.isArray(demands) || demands.length !== coordinates.length) {
//         return res.status(400).json({ 
//           error: 'Demands array must match the length of the coordinates array.' 
//         });
//       }

//       // 2. Fetch the travel time matrix (OSRM / Redis Cache)
//       const distanceMatrix = await DistanceService.getDistanceMatrix(coordinates);

//       // 3. Construct payload for the Google OR-Tools Python solver
//       const solverPayload = {
//         distance_matrix: distanceMatrix,
//         demands: demands,
//         vehicle_capacities: vehicleCapacities
//       };

//       // 4. Run the optimization engine as a child process
//       const optimizationResult = await OptimizerService.runSolver(solverPayload);

//       // 5. Send back the results
//       if (optimizationResult.status === 'Success') {
//         return res.status(200).json(optimizationResult);
//       } else {
//         return res.status(422).json(optimizationResult);
//       }

//     } catch (error) {
//       console.error('Routing Controller Error:', error.message);
//       return res.status(500).json({ 
//         error: 'Internal Server Error occurred during route optimization planning.',
//         details: error.message 
//       });
//     }
//   }
// }

// export default RouteController;
















// import DistanceService from '../services/distance.service.js';
// import { OptimizerService } from '../services/optimizer.service.js';

// class RouteController {
//   /**
//    * Main orchestrator for fleet route optimization supporting Multi-Depots
//    */
//   static async optimizeFleetRoutes(req, res) {
//     try {
//       const { coordinates, vehicleCapacities, demands, vehicleDepots } = req.body;

//       // 1. Basic Request Validation
//       if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
//         return res.status(400).json({ 
//           error: 'Invalid input. Provide an array of at least 2 coordinate objects ({lat, lng}).' 
//         });
//       }
//       if (!vehicleCapacities || !Array.isArray(vehicleCapacities)) {
//         return res.status(400).json({ error: 'Provide a valid array for vehicleCapacities.' });
//       }
//       if (!demands || !Array.isArray(demands) || demands.length !== coordinates.length) {
//         return res.status(400).json({ 
//           error: 'Demands array must match the length of the coordinates array.' 
//         });
//       }

//       // Handle Multi-Depot matching: 
//       // Each vehicle needs an explicitly defined starting index.
//       const starts = vehicleDepots && Array.isArray(vehicleDepots) 
//         ? vehicleDepots 
//         : new Array(vehicleCapacities.length).fill(0);
        
//       const ends = [...starts]; // Assumes vehicles return back to their respective starting depots

//       // 2. Fetch the travel time matrix (OSRM / Redis Cache)
//       const distanceMatrix = await DistanceService.getDistanceMatrix(coordinates);

//       // 3. Construct payload using matching camelCase fields expected by OptimizerService
//       const solverPayload = {
//         distanceMatrix,
//         coordinates,       // Pass this through so the service can cross-verify lengths
//         demands,
//         vehicleCapacities,
//         vehicleDepots: starts,
//         starts,            // Included for complete backward/forward compatibility
//         ends
//       };

//       // 4. Run the optimization engine as a child process
//       const optimizationResult = await OptimizerService.runSolver(solverPayload);

//       // 5. Send back the results
//       if (optimizationResult.status === 'Success') {
//         return res.status(200).json(optimizationResult);
//       } else {
//         return res.status(422).json(optimizationResult);
//       }

//     } catch (error) {
//       console.error('Routing Controller Error:', error.message);
//       return res.status(500).json({ 
//         error: 'Internal Server Error occurred during route optimization planning.',
//         details: error.message 
//       });
//     }
//   }
// }

// export default RouteController;

















import DistanceService from '../services/distance.service.js';
import { OptimizerService } from '../services/optimizer.service.js';

class RouteController {
  /**
   * Main orchestrator for fleet route optimization supporting Multi-Depots
   */
  static async optimizeFleetRoutes(req, res) {
    try {
      const { coordinates, vehicleCapacities, demands, vehicleDepots } = req.body;

      // 1. Basic Request Validation
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
        return res.status(400).json({ 
          error: 'Invalid input. Provide an array of at least 2 coordinate objects ({lat, lng}).' 
        });
      }
      if (!vehicleCapacities || !Array.isArray(vehicleCapacities)) {
        return res.status(400).json({ error: 'Provide a valid array for vehicleCapacities.' });
      }
      if (!demands || !Array.isArray(demands) || demands.length !== coordinates.length) {
        return res.status(400).json({ 
          error: 'Demands array must match the length of the coordinates array.' 
        });
      }

      // Handle Multi-Depot matching: 
      const starts = vehicleDepots && Array.isArray(vehicleDepots) 
        ? vehicleDepots 
        : new Array(vehicleCapacities.length).fill(0);
        
      const ends = [...starts]; 

      // 🔥 AUTO-FIX FOR FRONTEND MINIMUM WEIGHT LIMITATION:
      // Make a shallow copy of demands and force all assigned depot indices to be exactly 0
      const sanitizedDemands = [...demands];
      starts.forEach(depotIndex => {
        if (depotIndex < sanitizedDemands.length) {
          sanitizedDemands[depotIndex] = 0;
        }
      });

      // 2. Fetch the travel time matrix (OSRM / Redis Cache)
      const distanceMatrix = await DistanceService.getDistanceMatrix(coordinates);

      // 3. Construct payload using matching camelCase fields and sanitized demands
      const solverPayload = {
        distanceMatrix,
        coordinates,       
        demands: sanitizedDemands, // <-- Uses the cleaned demands where depots are forced to 0
        vehicleCapacities,
        vehicleDepots: starts,
        starts,            
        ends
      };

      // 4. Run the optimization engine as a child process
      const optimizationResult = await OptimizerService.runSolver(solverPayload);

      // 5. Send back the results
      if (optimizationResult.status === 'Success') {
        return res.status(200).json(optimizationResult);
      } else {
        return res.status(422).json(optimizationResult);
      }

    } catch (error) {
      console.error('Routing Controller Error:', error.message);
      return res.status(500).json({ 
        error: 'Internal Server Error occurred during route optimization planning.',
        details: error.message 
      });
    }
  }
}

export default RouteController;