// import { spawn } from 'child_process';
// import path from 'path';
// import { fileURLToPath } from 'url';

// // Setup __dirname equivalent for ES Modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// class OptimizerService {
//   /**
//    * Spawns the Python solver as a child process and streams input data to it.
//    * @param {Object} matrixData - The payload containing distance matrix, demands, and vehicle capacities.
//    * @returns {Promise<Object>} The optimized routes calculated by Google OR-Tools.
//    */
//   static runSolver(matrixData) {
//     return new Promise((resolve, reject) => {
//       // Direct path to the solver.py script we just created
//       const scriptPath = path.join(__dirname, 'solver.py');
      
//       // Spawn python process (use 'python' instead of 'python3' if on Windows)
//       const pythonProcess = spawn('python', [scriptPath]);

//       let dataBuffer = '';
//       let errorBuffer = '';

//       // Stream input JSON to the Python script's stdin pipeline
//       pythonProcess.stdin.write(JSON.stringify(matrixData));
//       pythonProcess.stdin.end();

//       // Collect data chunks from Python's standard output
//       pythonProcess.stdout.on('data', (data) => {
//         dataBuffer += data.toString();
//       });

//       // Collect error chunks if anything goes wrong inside Python
//       pythonProcess.stderr.on('data', (data) => {
//         errorBuffer += data.toString();
//       });

//       // Handle process completion
//       pythonProcess.on('close', (code) => {
//         if (code !== 0) {
//           return reject(new Error(`Solver process exited with code ${code}. Error: ${errorBuffer}`));
//         }
//         try {
//           const parsedResult = JSON.parse(dataBuffer);
//           resolve(parsedResult);
//         } catch (e) {
//           reject(new Error(`Failed to parse solver output: ${e.message}`));
//         }
//       });
//     });
//   }
// }

// export default OptimizerService;
















// import DistanceService from '../services/distance.service.js';
// import { spawn } from 'child_process';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import axios from 'axios';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const optimizeRoute = async (req, res) => {
//   try {
//     const { coordinates, vehicleCapacities, demands, vehicleDepots } = req.body;

//     // 1. Fetch the distance matrix from the service
//     let distanceMatrix = await DistanceService.getDistanceMatrix(coordinates);

//     // CRITICAL PROTECTION: If the cached matrix size doesn't match the current number of locations, force a bypass
//     if (!distanceMatrix || distanceMatrix.length !== coordinates.length) {
//       console.log('⚠️ Cached matrix size mismatch detected! Bypassing cache to fetch fresh OSRM metrics.');
//       const coordString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
//       const osrmUrl = `https://router.project-osrm.org/table/v1/driving/${coordString}?annotations=duration`;
//       const response = await axios.get(osrmUrl, { timeout: 8000 });
//       distanceMatrix = response.data.durations;
//     }

//     // 2. Prepare payload for Python solver
//     const payload = {
//       distanceMatrix,
//       demands,
//       vehicleCapacities,
//       vehicleDepots: vehicleDepots || Array(vehicleCapacities.length).fill(0)
//     };

//     // 3. Spawn Python process safely
//     const pythonScriptPath = path.join(__dirname, '../services/solver.py');
//     const pythonProcess = spawn('python', [pythonScriptPath]);

//     let outputData = '';
//     let errorData = '';

//     pythonProcess.stdout.on('data', (data) => {
//       outputData += data.toString();
//     });

//     pythonProcess.stderr.on('data', (data) => {
//       errorData += data.toString();
//     });

//     pythonProcess.on('close', (code) => {
//       if (code !== 0) {
//         console.error(`Python process exited with code ${code}. Error: ${errorData}`);
//         return res.status(500).json({ status: 'Error', message: 'Optimization engine execution crashed.' });
//       }

//       try {
//         const result = JSON.parse(outputData.trim() || '{}');
//         if (result.status === 'Success') {
//           return res.json(result);
//         } else {
//           return res.status(400).json({ status: 'Failed', message: result.message || 'Optimization solver failed to resolve a viable matrix path.' });
//         }
//       } catch (parseErr) {
//         console.error('Failed to parse Python script output:', outputData);
//         return res.status(500).json({ status: 'Error', message: 'Failed to parse routing results.' });
//       }
//     });

//     // Write data to python stdin
//     pythonProcess.stdin.write(JSON.stringify(payload));
//     pythonProcess.stdin.end();

//   } catch (error) {
//     console.error('Routing Controller Error:', error.message);
//     return res.status(500).json({ status: 'Error', message: error.message });
//   }
// };









// import { spawn } from 'child_process';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export class OptimizerService {
//   static async runSolver(payload) {
//     return new Promise((resolve, reject) => {
//       // Points exactly to the solver.py script in the same directory
//       const pythonScriptPath = path.join(__dirname, './solver.py');
//       const pythonProcess = spawn('python', [pythonScriptPath]);

//       let outputData = '';
//       let errorData = '';

//       pythonProcess.stdout.on('data', (data) => {
//         outputData += data.toString();
//       });

//       pythonProcess.stderr.on('data', (data) => {
//         errorData += data.toString();
//       });

//       pythonProcess.on('close', (code) => {
//         if (code !== 0) {
//           return reject(new Error(`Python solver exited with code ${code}. Error: ${errorData}`));
//         }
//         try {
//           const result = JSON.parse(outputData.trim());
//           resolve(result);
//         } catch (parseErr) {
//           reject(new Error(`Failed to parse solver output: ${outputData}`));
//         }
//       });

//       // Write parameters to standard input
//       pythonProcess.stdin.write(JSON.stringify(payload));
//       pythonProcess.stdin.end();
//     });
//   }
// }

// // Export both named and default to satisfy any controller import style instantly
// export default OptimizerService;









import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchOSRMMatrixWithRetry(coordinates, retries = 2) {
  const coordString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
  const osrmUrl = `https://router.project-osrm.org/table/v1/driving/${coordString}?annotations=duration`;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(osrmUrl, { timeout: 15000 });
      if (response.data && response.data.durations) {
        return response.data.durations;
      }
    } catch (err) {
      if (i === retries) throw err;
      console.log(`⚠️ OSRM timed out. Retrying attempt ${i + 1}/${retries}...`);
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}
export class OptimizerService {
  static async runSolver(payloadData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Safe extraction with default empty object fallback
        const data = payloadData || {};
        let distanceMatrix = data.distanceMatrix;
        let coordinates = data.coordinates || [];
        let demands = data.demands || [];
        let vehicleCapacities = data.vehicleCapacities || [];
        let vehicleDepots = data.vehicleDepots;

        // 🔥 CRITICAL SAFETY CHECK: If coordinates are completely missing, don't try to map over them
        if (!coordinates || coordinates.length === 0) {
          console.log('⚠️ Warning: No coordinates provided in payload. Attempting to deduce matrix length from distanceMatrix.');
        } else if (!distanceMatrix || distanceMatrix.length !== coordinates.length) {
          console.log('⚠️ Matrix size mismatch or cache outdated. Fetching fresh metrics from OSRM...');
          distanceMatrix = await fetchOSRMMatrixWithRetry(coordinates);
        }

        // Final payload reconstruction for Python solver
        const payload = {
          distanceMatrix: distanceMatrix || [],
          demands,
          vehicleCapacities,
          vehicleDepots: vehicleDepots || Array(vehicleCapacities.length).fill(0)
        };

        const pythonScriptPath = path.join(__dirname, './solver.py');
        const pythonProcess = spawn('python', [pythonScriptPath]);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => { outputData += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error(`Python process exited with code ${code}. Error: ${errorData}`));
          }
          try {
            const result = JSON.parse(outputData.trim());
            resolve(result);
          } catch (parseErr) {
            reject(new Error(`Failed to parse routing results: ${outputData}`));
          }
        });

        pythonProcess.stdin.write(JSON.stringify(payload));
        pythonProcess.stdin.end();

      } catch (err) {
        reject(err);
      }
    });
  }
}

export default OptimizerService;