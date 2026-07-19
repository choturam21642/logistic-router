// import React, { useState, useEffect } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
// import L from 'leaflet';
// import { io } from 'socket.io-client';
// import { Truck, MapPin, Navigation, RefreshCw, Plus, Trash2, Play } from 'lucide-react';

// // IMPORTANT: Leaflet CSS must be imported to prevent a blank/broken map layout
// import 'leaflet/dist/leaflet.css';

// // Fix for default marker icons failing to load in React-Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// // Create a custom delivery truck icon for Leaflet real-time simulation
// const truckIcon = new L.Icon({
//   iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
//   iconSize: [35, 35],
//   iconAnchor: [17, 17],
//   popupAnchor: [0, -15],
// });

// // Initialize socket connection matching your backend address
// const socket = io('http://localhost:5000', { autoConnect: false });

// const CENTER_COORDS = [29.9686, 76.8126];
// const ROUTE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// export default function App() {
//   // --- CORE SYSTEM STATE ---
//   const [locations, setLocations] = useState([
//     { lat: 29.9686, lng: 76.8126, label: "Depot (NIT Kurukshetra)", demand: 0 }
//   ]);
//   const [newDemand, setNewDemand] = useState(10);
//   const [vehicleCapacities, setVehicleCapacities] = useState("50, 50, 50");
//   const [vehicleCapacities, setVehicleCapacities] = useState([15, 15]); // Your existing state
// const [vehicleDepots, setVehicleDepots] = useState([0, 0]); // NEW: Vehicle 0 starts at index 0, Vehicle 1 starts at index 0
//   const [routes, setRoutes] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [summary, setSummary] = useState(null);

//   // --- DRIVER TRACKING STATE ---
//   const [driverPosition, setDriverPosition] = useState(null);
//   const [isSimulating, setIsSimulating] = useState(false);

//   // --- WEBSOCKET CONNECTION LIFECYCLE ---
//   useEffect(() => {
//     socket.connect();

//     // Catch moving stream coordinates transmitted out from backend
//     socket.on('driver-position-update', (data) => {
//       console.log('🚚 Real-time location received:', data.position);
//       setDriverPosition(data.position);
      
//       if (data.isFinished) {
//         setIsSimulating(false);
//         alert('🏁 Driver has successfully reached the final stop!');
//       }
//     });

//     return () => {
//       socket.off('driver-position-update');
//       socket.disconnect();
//     };
//   }, []);

//   // Map click handler to register custom stops
//   function MapClickHandler() {
//     useMapEvents({
//       click(e) {
//         const { lat, lng } = e.latlng;
//         setLocations(prev => [
//           ...prev, 
//           { lat, lng, label: `Stop ${prev.length}`, demand: Number(newDemand) }
//         ]);
//       }
//     });
//     return null;
//   }

//   // Clear workspace out completely
//   const handleReset = () => {
//     setLocations([{ lat: 29.9686, lng: 76.8126, label: "Depot (NIT Kurukshetra)", demand: 0 }]);
//     setRoutes([]);
//     setSummary(null);
//     setDriverPosition(null);
//     setIsSimulating(false);
//   };

//   // Run Route Optimization Handler
//   const handleOptimize = async () => {
//     if (locations.length < 2) {
//       alert("Please click on the map to add at least 1 or more delivery locations.");
//       return;
//     }

//     setLoading(true);
//     setRoutes([]);
//     setDriverPosition(null);

//     const capacities = vehicleCapacities.split(',').map(c => Number(c.trim())).filter(c => !isNaN(c));
//     const demands = locations.map(loc => loc.demand);

//     try {
//       // Adjusted endpoint address configuration layout compatibility
//       const response = await fetch('http://localhost:5000/api/optimize', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           coordinates: locations.map(loc => ({ lat: loc.lat, lng: loc.lng })),
//           vehicleCapacities: capacities,
//           demands: demands
//         })
//       });

//       const data = await response.json();

//       if (response.ok && data.status === 'Success') {
//         setRoutes(data.routes);
        
//         const totalDist = data.routes.reduce((acc, r) => acc + r.total_distance_or_time, 0);
//         const totalLoad = data.routes.reduce((acc, r) => acc + r.total_load, 0);
//         setSummary({ totalDist, totalLoad, activeVehicles: data.routes.filter(r => r.route.length > 2).length });
//       } else {
//         alert(data.message || "Failed to find a viable routing optimization plan.");
//       }
//     } catch (err) {
//       console.error(err);
//       alert("Error contacting the route optimizer backend. Make sure the backend server is running.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // FIXED: Streams actual OSRM paths instead of jumping from pin to pin
//   const handleStartSimulation = () => {
//     if (routes.length === 0) {
//       alert('Please run the route optimizer first to generate a path!');
//       return;
//     }

//     const firstActiveRoute = routes.find(r => r.route.length > 2) || routes[0];
//     if (!firstActiveRoute) {
//       alert('No valid route available for simulation.');
//       return;
//     }

//     // CRITICAL FIX: If your backend supplies full road track geometries, extract them here
//     // Otherwise fall back onto mapping the stop points array securely
//     let pathCoordinates = [];
//     if (firstActiveRoute.geometry_points) {
//       pathCoordinates = firstActiveRoute.geometry_points.map(pt => ({ lat: pt[0], lng: pt[1] }));
//     } else {
//       pathCoordinates = firstActiveRoute.route.map(nodeData => {
//         const loc = locations[nodeData.node];
//         return { lat: loc.lat, lng: loc.lng };
//       });
//     }

//     setIsSimulating(true);
    
//     // Dispatch execution tracking event down socket pipelines
//     socket.emit('start-driver-simulation', {
//       routeId: 'route_1',
//       pathCoordinates: pathCoordinates
//     });
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', fontFamily: 'sans-serif', margin: 0, overflow: 'hidden' }}>
      
//       {/* Top Navigation Bar */}
//       <header style={{ background: '#1e3a8a', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', boxSizing: 'border-box' }}>
//         <h1 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
//           <Navigation size={24} /> Fleet Route Optimizer & Live Tracker
//         </h1>
//         <div style={{ fontSize: '14px', background: '#10b981', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
//           Real-Time Tracking Online
//         </div>
//       </header>

//       {/* Main Workspace Split View */}
//       <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        
//         {/* Sidebar Panel */}
//         <aside style={{ width: '360px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
          
//           {/* Fleet Capacity settings */}
//           <section style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px' }}>
//             <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <Truck size={18} /> Fleet Settings
//             </h3>
//             <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
//               Vehicle Capacities (comma-separated):
//             </label>
//             <input 
//               type="text" 
//               value={vehicleCapacities}
//               onChange={(e) => setVehicleCapacities(e.target.value)}
//               style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
//             />
//           </section>

//           {/* Add Stop details config */}
//           <section style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px' }}>
//             <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <Plus size={18} /> Add New Stops
//             </h3>
//             <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px 0' }}>
//               Click directly on the map to place delivery points.
//             </p>
//             <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
//               Next Stop Weight/Demand:
//             </label>
//             <input 
//               type="number" 
//               value={newDemand}
//               onChange={(e) => setNewDemand(Math.max(1, Number(e.target.value)))}
//               style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
//             />
//           </section>

//           {/* List of stops */}
//           <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
//               <h3 style={{ margin: 0, fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                 <MapPin size={18} /> Delivery Stops ({locations.length})
//               </h3>
//               <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
//                 <Trash2 size={14} /> Clear All
//               </button>
//             </div>
//             <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '5px' }}>
//               {locations.map((loc, idx) => (
//                 <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
//                   <span>{loc.label}</span>
//                   <span style={{ fontWeight: 'bold', color: idx === 0 ? '#1e3a8a' : '#10b981' }}>
//                     {idx === 0 ? 'Depot' : `Load: ${loc.demand}`}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </section>

//           {/* Action Trigger Buttons */}
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//             <button 
//               onClick={handleOptimize} 
//               disabled={loading}
//               style={{ width: '100%', padding: '12px', background: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
//             >
//               {loading ? (
//                 <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
//               ) : (
//                 "Run Route Optimizer"
//               )}
//             </button>
//           </div>
//         </aside>

//         {/* Map Window & Floating Dashboards */}
//         <main style={{ flex: 1, position: 'relative', height: '100%', width: '100%' }}>
          
//           {/* Top-Right Simulation Overlay Trigger */}
//           {routes.length > 0 && (
//             <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }}>
//               <button 
//                 onClick={handleStartSimulation}
//                 disabled={isSimulating}
//                 style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '8px',
//                   padding: '12px 18px',
//                   backgroundColor: isSimulating ? '#6c757d' : '#10b981',
//                   color: 'white',
//                   border: 'none',
//                   borderRadius: '30px',
//                   cursor: isSimulating ? 'not-allowed' : 'pointer',
//                   fontWeight: 'bold',
//                   fontSize: '14px',
//                   boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
//                 }}
//               >
//                 <Play size={16} />
//                 {isSimulating ? '🚚 Tracking Driver Live...' : '🏁 Start Driver Simulation'}
//               </button>
//             </div>
//           )}

//           {/* Leaflet Map Frame */}
//           <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
//             <MapContainer center={CENTER_COORDS} zoom={13} style={{ width: '100%', height: '100%' }}>
//               <TileLayer
//                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//               />
//               <MapClickHandler />

//               {/* Location Pins */}
//               {locations.map((loc, idx) => (
//                 <Marker key={idx} position={[loc.lat, loc.lng]}>
//                   <Popup>
//                     <strong>{loc.label}</strong><br />
//                     {idx === 0 ? "Fleet Starting Depot" : `Required Cargo Weight: ${loc.demand}`}
//                   </Popup>
//                 </Marker>
//               ))}

//               {/* Active Real-time simulated driver marker */}
//               {driverPosition && (
//                 <Marker position={[driverPosition.lat, driverPosition.lng]} icon={truckIcon}>
//                   <Popup>
//                     <strong>Active Carrier Vehicle 1</strong> <br />
//                     Status: En Route / Live Transmitting
//                   </Popup>
//                 </Marker>
//               )}

//               {/* Computed Route Lines */}
//               {routes.map((routeData, rIdx) => {
//                 const color = ROUTE_COLORS[rIdx % ROUTE_COLORS.length];
//                 const routePoints = routeData.route.map(nodeData => {
//                   const loc = locations[nodeData.node];
//                   return [loc.lat, loc.lng];
//                 });

//                 return (
//                   <Polyline 
//                     key={rIdx} 
//                     positions={routePoints} 
//                     color={color} 
//                     weight={5} 
//                     opacity={0.85} 
//                   />
//                 );
//               })}
//             </MapContainer>
//           </div>

//           {/* Bottom-Left Analytics overlay dashboard */}
//           {summary && (
//             <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', gap: '20px', fontSize: '13px' }}>
//               <div>
//                 <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Active Vehicles Used</strong>
//                 <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' }}>{summary.activeVehicles} Vans</span>
//               </div>
//               <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
//                 <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Total Routing Cost</strong>
//                 <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{summary.totalDist}s</span>
//               </div>
//               <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
//                 <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Total Cumulative Cargo</strong>
//                 <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{summary.totalLoad} units</span>
//               </div>
//             </div>
//           )}
//         </main>
//       </div>
      
//       {/* Global CSS Injector for Loader Spin */}
//       <style>{`
//         @keyframes spin {
//           0% { transform: rotate(0deg); }
//           100% { transform: rotate(360deg); }
//         }
//       `}</style>
//     </div>
//   );
// }
























// import React, { useState, useEffect } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
// import L from 'leaflet';
// import { io } from 'socket.io-client';
// import { Truck, MapPin, Navigation, RefreshCw, Plus, Trash2, Play } from 'lucide-react';

// // IMPORTANT: Leaflet CSS must be imported to prevent a blank/broken map layout
// import 'leaflet/dist/leaflet.css';

// // Fix for default marker icons failing to load in React-Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// // Create a custom delivery truck icon for Leaflet real-time simulation
// const truckIcon = new L.Icon({
//   iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
//   iconSize: [35, 35],
//   iconAnchor: [17, 17],
//   popupAnchor: [0, -15],
// });

// // Initialize socket connection matching your backend address
// const socket = io('http://localhost:5000', { autoConnect: false });

// const CENTER_COORDS = [29.9686, 76.8126];
// const ROUTE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// export default function App() {
//   // --- CORE SYSTEM STATE ---
//   const [locations, setLocations] = useState([
//     { lat: 29.9686, lng: 76.8126, label: "Depot (NIT Kurukshetra)", demand: 0 }
//   ]);
//   const [newDemand, setNewDemand] = useState(10);
  
//   // Cleaned capacities state and linked vehicle depots structural map array
//   const [vehicleCapacities, setVehicleCapacities] = useState("50, 50, 50");
//   const [vehicleDepots, setVehicleDepots] = useState([0, 0, 0]); 

//   const [routes, setRoutes] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [summary, setSummary] = useState(null);

//   // --- DRIVER TRACKING STATE ---
//   const [driverPosition, setDriverPosition] = useState(null);
//   const [isSimulating, setIsSimulating] = useState(false);

//   // --- WEBSOCKET CONNECTION LIFECYCLE ---
//   useEffect(() => {
//     socket.connect();

//     // Catch moving stream coordinates transmitted out from backend
//     socket.on('driver-position-update', (data) => {
//       console.log('🚚 Real-time location received:', data.position);
//       setDriverPosition(data.position);
      
//       if (data.isFinished) {
//         setIsSimulating(false);
//         alert('🏁 Driver has successfully reached the final stop!');
//       }
//     });

//     return () => {
//       socket.off('driver-position-update');
//       socket.disconnect();
//     };
//   }, []);

//   // Update vehicle depots mapping array length when capacity string configuration layout changes
//   useEffect(() => {
//     const totalVehicles = vehicleCapacities.split(',').length;
//     setVehicleDepots(prev => {
//       const nextDepots = [...prev];
//       while (nextDepots.length < totalVehicles) nextDepots.push(0);
//       return nextDepots.slice(0, totalVehicles);
//     });
//   }, [vehicleCapacities]);

//   // Map click handler to register custom stops
//   function MapClickHandler() {
//     useMapEvents({
//       click(e) {
//         const { lat, lng } = e.latlng;
//         setLocations(prev => [
//           ...prev, 
//           { lat, lng, label: `Stop ${prev.length}`, demand: Number(newDemand) }
//         ]);
//       }
//     });
//     return null;
//   }

//   // Clear workspace out completely
//   const handleReset = () => {
//     setLocations([{ lat: 29.9686, lng: 76.8126, label: "Depot (NIT Kurukshetra)", demand: 0 }]);
//     setRoutes([]);
//     setSummary(null);
//     setDriverPosition(null);
//     setIsSimulating(false);
//     setVehicleDepots([0, 0, 0]);
//   };

//   // Run Route Optimization Handler
//   const handleOptimize = async () => {
//     if (locations.length < 2) {
//       alert("Please click on the map to add at least 1 or more delivery locations.");
//       return;
//     }

//     setLoading(true);
//     setRoutes([]);
//     setDriverPosition(null);

//     const capacities = vehicleCapacities.split(',').map(c => Number(c.trim())).filter(c => !isNaN(c));
//     const demands = locations.map(loc => loc.demand);

//     try {
//       const response = await fetch('http://localhost:5000/api/optimize', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           coordinates: locations.map(loc => ({ lat: loc.lat, lng: loc.lng })),
//           vehicleCapacities: capacities,
//           demands: demands,
//           vehicleDepots: vehicleDepots.slice(0, capacities.length) // Pass specific multi-depot configurations array
//         })
//       });

//       const data = await response.json();

//       if (response.ok && data.status === 'Success') {
//         setRoutes(data.routes);
        
//         const totalDist = data.routes.reduce((acc, r) => acc + r.total_distance_or_time, 0);
//         const totalLoad = data.routes.reduce((acc, r) => acc + r.total_load, 0);
//         setSummary({ totalDist, totalLoad, activeVehicles: data.routes.filter(r => r.route.length > 2).length });
//       } else {
//         alert(data.message || "Failed to find a viable routing optimization plan.");
//       }
//     } catch (err) {
//       console.error(err);
//       alert("Error contacting the route optimizer backend. Make sure the backend server is running.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Streams actual paths instead of jumping from pin to pin
//   const handleStartSimulation = () => {
//     if (routes.length === 0) {
//       alert('Please run the route optimizer first to generate a path!');
//       return;
//     }

//     const firstActiveRoute = routes.find(r => r.route.length > 2) || routes[0];
//     if (!firstActiveRoute) {
//       alert('No valid route available for simulation.');
//       return;
//     }

//     let pathCoordinates = [];
//     if (firstActiveRoute.geometry_points) {
//       pathCoordinates = firstActiveRoute.geometry_points.map(pt => ({ lat: pt[0], lng: pt[1] }));
//     } else {
//       pathCoordinates = firstActiveRoute.route.map(nodeData => {
//         const loc = locations[nodeData.node];
//         return { lat: loc.lat, lng: loc.lng };
//       });
//     }

//     setIsSimulating(true);
    
//     socket.emit('start-driver-simulation', {
//       routeId: 'route_1',
//       pathCoordinates: pathCoordinates
//     });
//   };

//   const handleDepotChange = (vehicleIndex, targetLocationIndex) => {
//     setVehicleDepots(prev => {
//       const nextDepots = [...prev];
//       nextDepots[vehicleIndex] = Number(targetLocationIndex);
//       return nextDepots;
//     });
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', fontFamily: 'sans-serif', margin: 0, overflow: 'hidden' }}>
      
//       {/* Top Navigation Bar */}
//       <header style={{ background: '#1e3a8a', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', boxSizing: 'border-box' }}>
//         <h1 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
//           <Navigation size={24} /> Fleet Route Optimizer & Multi-Depot Tracker
//         </h1>
//         <div style={{ fontSize: '14px', background: '#10b981', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
//           Real-Time Tracking Online
//         </div>
//       </header>

//       {/* Main Workspace Split View */}
//       <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        
//         {/* Sidebar Panel */}
//         <aside style={{ width: '360px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
          
//           {/* Fleet Capacity and Depot Assignments Settings */}
//           <section style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px' }}>
//             <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <Truck size={18} /> Fleet Settings
//             </h3>
//             <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
//               Vehicle Capacities (comma-separated):
//             </label>
//             <input 
//               type="text" 
//               value={vehicleCapacities}
//               onChange={(e) => setVehicleCapacities(e.target.value)}
//               style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '12px' }}
//             />

//             <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
//               Assign Starting Depot for Each Fleet Van:
//             </label>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//               {vehicleCapacities.split(',').map((cap, vIdx) => (
//                 <div key={vIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
//                   <span>Van #{vIdx + 1} (Cap: {cap.trim() || 0}):</span>
//                   <select 
//                     value={vehicleDepots[vIdx] || 0} 
//                     onChange={(e) => handleDepotChange(vIdx, e.target.value)}
//                     style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
//                   >
//                     {locations.map((loc, lIdx) => (
//                       <option key={lIdx} value={lIdx}>
//                         {lIdx === 0 ? "Default Depot" : `Stop ${lIdx}`}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               ))}
//             </div>
//           </section>

//           {/* Add Stop details config */}
//           <section style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px' }}>
//             <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <Plus size={18} /> Add New Stops
//             </h3>
//             <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px 0' }}>
//               Click directly on the map to place delivery hubs / points.
//             </p>
//             <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
//               Next Stop Weight/Demand:
//             </label>
//             <input 
//               type="number" 
//               value={newDemand}
//               onChange={(e) => setNewDemand(Math.max(1, Number(e.target.value)))}
//               style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
//             />
//           </section>

//           {/* List of stops */}
//           <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
//               <h3 style={{ margin: 0, fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                 <MapPin size={18} /> Registered Locations ({locations.length})
//               </h3>
//               <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
//                 <Trash2 size={14} /> Clear All
//               </button>
//             </div>
//             <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '5px' }}>
//               {locations.map((loc, idx) => {
//                 const isAssignedAsDepot = vehicleDepots.includes(idx);
//                 return (
//                   <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
//                     <span>{loc.label} {isAssignedAsDepot && <small style={{ color: '#2563eb', fontWeight: 'bold' }}>(Depot)</small>}</span>
//                     <span style={{ fontWeight: 'bold', color: idx === 0 ? '#1e3a8a' : '#10b981' }}>
//                       {idx === 0 ? 'Base Depot' : `Load: ${loc.demand}`}
//                     </span>
//                   </div>
//                 );
//               })}
//             </div>
//           </section>

//           {/* Action Trigger Buttons */}
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//             <button 
//               onClick={handleOptimize} 
//               disabled={loading}
//               style={{ width: '100%', padding: '12px', background: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
//             >
//               {loading ? (
//                 <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
//               ) : (
//                 "Run Route Optimizer"
//               )}
//             </button>
//           </div>
//         </aside>

//         {/* Map Window & Floating Dashboards */}
//         <main style={{ flex: 1, position: 'relative', height: '100%', width: '100%' }}>
          
//           {/* Top-Right Simulation Overlay Trigger */}
//           {routes.length > 0 && (
//             <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }}>
//               <button 
//                 onClick={handleStartSimulation}
//                 disabled={isSimulating}
//                 style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '8px',
//                   padding: '12px 18px',
//                   backgroundColor: isSimulating ? '#6c757d' : '#10b981',
//                   color: 'white',
//                   border: 'none',
//                   borderRadius: '30px',
//                   cursor: isSimulating ? 'not-allowed' : 'pointer',
//                   fontWeight: 'bold',
//                   fontSize: '14px',
//                   boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
//                 }}
//               >
//                 <Play size={16} />
//                 {isSimulating ? '🚚 Tracking Driver Live...' : '🏁 Start Driver Simulation'}
//               </button>
//             </div>
//           )}

//           {/* Leaflet Map Frame */}
//           <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
//             <MapContainer center={CENTER_COORDS} zoom={13} style={{ width: '100%', height: '100%' }}>
//               <TileLayer
//                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//               />
//               <MapClickHandler />

//               {/* Location Pins */}
//               {locations.map((loc, idx) => {
//                 const isDepot = vehicleDepots.includes(idx) || idx === 0;
//                 return (
//                   <Marker key={idx} position={[loc.lat, loc.lng]}>
//                     <Popup>
//                       <strong>{loc.label}</strong><br />
//                       {isDepot ? "Active Fleet Depot Station" : `Required Cargo Weight: ${loc.demand}`}
//                     </Popup>
//                   </Marker>
//                 );
//               })}

//               {/* Active Real-time simulated driver marker */}
//               {driverPosition && (
//                 <Marker position={[driverPosition.lat, driverPosition.lng]} icon={truckIcon}>
//                   <Popup>
//                     <strong>Active Carrier Vehicle 1</strong> <br />
//                     Status: En Route / Live Transmitting
//                   </Popup>
//                 </Marker>
//               )}

//               {/* Computed Route Lines */}
//               {routes.map((routeData, rIdx) => {
//                 const color = ROUTE_COLORS[rIdx % ROUTE_COLORS.length];
//                 const routePoints = routeData.route.map(nodeData => {
//                   const loc = locations[nodeData.node];
//                   return [loc.lat, loc.lng];
//                 });

//                 return (
//                   <Polyline 
//                     key={rIdx} 
//                     positions={routePoints} 
//                     color={color} 
//                     weight={5} 
//                     opacity={0.85} 
//                   />
//                 );
//               })}
//             </MapContainer>
//           </div>

//           {/* Bottom-Left Analytics overlay dashboard */}
//           {summary && (
//             <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', gap: '20px', fontSize: '13px' }}>
//               <div>
//                 <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Active Vehicles Used</strong>
//                 <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' }}>{summary.activeVehicles} Vans</span>
//               </div>
//               <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
//                 <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Total Routing Cost</strong>
//                 <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{summary.totalDist}s</span>
//               </div>
//               <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
//                 <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Total Cumulative Cargo</strong>
//                 <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{summary.totalLoad} units</span>
//               </div>
//             </div>
//           )}
//         </main>
//       </div>
      
//       {/* Global CSS Injector for Loader Spin */}
//       <style>{`
//         @keyframes spin {
//           0% { transform: rotate(0deg); }
//           100% { transform: rotate(360deg); }
//         }
//       `}</style>
//     </div>
//   );
// }










import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { Truck, MapPin, Navigation, RefreshCw, Plus, Trash2, Play } from 'lucide-react';

// IMPORTANT: Leaflet CSS must be imported to prevent a blank/broken map layout
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons failing to load in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a custom delivery truck icon for Leaflet real-time simulation
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048313.png',
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -15],
});

// Initialize socket connection matching your backend address
const socket = io('https://logistic-router-backend.onrender.com', { autoConnect: false });

const CENTER_COORDS = [29.9686, 76.8126];
const ROUTE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function App() {
  // --- CORE SYSTEM STATE ---
  const [locations, setLocations] = useState([
    { lat: 29.9686, lng: 76.8126, label: "Depot (NIT Kurukshetra)", demand: 0 }
  ]);
  const [newDemand, setNewDemand] = useState(10);
  
  // Cleaned capacities state and linked vehicle depots structural map array
  const [vehicleCapacities, setVehicleCapacities] = useState("50, 50, 50");
  const [vehicleDepots, setVehicleDepots] = useState([0, 0, 0]); 

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  // --- DRIVER TRACKING STATE ---
  const [driverPosition, setDriverPosition] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // --- WEBSOCKET CONNECTION LIFECYCLE ---
  useEffect(() => {
    socket.connect();

    // Catch moving stream coordinates transmitted out from backend
    socket.on('driver-position-update', (data) => {
      console.log('🚚 Real-time location received:', data.position);
      setDriverPosition(data.position);
      
      if (data.isFinished) {
        setIsSimulating(false);
        alert('🏁 Driver has successfully reached the final stop!');
      }
    });

    return () => {
      socket.off('driver-position-update');
      socket.disconnect();
    };
  }, []);

  // Update vehicle depots mapping array length when capacity string configuration layout changes
  useEffect(() => {
    const totalVehicles = vehicleCapacities.split(',').length;
    setVehicleDepots(prev => {
      const nextDepots = [...prev];
      while (nextDepots.length < totalVehicles) nextDepots.push(0);
      return nextDepots.slice(0, totalVehicles);
    });
  }, [vehicleCapacities]);

  // Map click handler to register custom stops
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setLocations(prev => [
          ...prev, 
          { lat, lng, label: `Stop ${prev.length}`, demand: Number(newDemand) }
        ]);
      }
    });
    return null;
  }

  // Clear workspace out completely
  const handleReset = () => {
    setLocations([{ lat: 29.9686, lng: 76.8126, label: "Depot (NIT Kurukshetra)", demand: 0 }]);
    setRoutes([]);
    setSummary(null);
    setDriverPosition(null);
    setIsSimulating(false);
    setVehicleDepots([0, 0, 0]);
  };

  // Run Route Optimization Handler
  const handleOptimize = async () => {
    if (locations.length < 2) {
      alert("Please click on the map to add at least 1 or more delivery locations.");
      return;
    }

    setLoading(true);
    setRoutes([]);
    setDriverPosition(null);

    const capacities = vehicleCapacities.split(',').map(c => Number(c.trim())).filter(c => !isNaN(c));
    const demands = locations.map(loc => loc.demand);

    try {
      const response = await fetch('https://logistic-router-backend.onrender.com/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: locations.map(loc => ({ lat: loc.lat, lng: loc.lng })),
          vehicleCapacities: capacities,
          demands: demands,
          vehicleDepots: vehicleDepots.slice(0, capacities.length) // Pass specific multi-depot configurations array
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'Success') {
        setRoutes(data.routes);
        
        const totalDist = data.routes.reduce((acc, r) => acc + (r.total_distance_or_time || 0), 0);
        const totalLoad = data.routes.reduce((acc, r) => acc + (r.total_load || 0), 0);
        setSummary({ totalDist, totalLoad, activeVehicles: data.routes.filter(r => r.route && r.route.length > 2).length });
      } else {
        alert(data.message || "Failed to find a viable routing optimization plan.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting the route optimizer backend. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Streams actual paths instead of jumping from pin to pin
  const handleStartSimulation = () => {
    if (routes.length === 0) {
      alert('Please run the route optimizer first to generate a path!');
      return;
    }

    const firstActiveRoute = routes.find(r => r.route && r.route.length > 2) || routes[0];
    if (!firstActiveRoute || !firstActiveRoute.route) {
      alert('No valid route available for simulation.');
      return;
    }

    let pathCoordinates = [];
    if (firstActiveRoute.geometry_points) {
      pathCoordinates = firstActiveRoute.geometry_points.map(pt => ({ lat: pt[0], lng: pt[1] }));
    } else {
      pathCoordinates = firstActiveRoute.route.map(nodeData => {
        // Safe tracking parser fallback 
        const nodeIndex = (nodeData && typeof nodeData === 'object' && 'node' in nodeData) 
          ? nodeData.node 
          : nodeData;

        const loc = locations[nodeIndex];
        return loc ? { lat: loc.lat, lng: loc.lng } : null;
      }).filter(pt => pt !== null);
    }

    if (pathCoordinates.length === 0) {
      alert('No path coordinates could be mapped for tracking.');
      return;
    }

    setIsSimulating(true);
    
    socket.emit('start-driver-simulation', {
      routeId: 'route_1',
      pathCoordinates: pathCoordinates
    });
  };

  const handleDepotChange = (vehicleIndex, targetLocationIndex) => {
    setVehicleDepots(prev => {
      const nextDepots = [...prev];
      nextDepots[vehicleIndex] = Number(targetLocationIndex);
      return nextDepots;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', fontFamily: 'sans-serif', margin: 0, overflow: 'hidden' }}>
      
      {/* Top Navigation Bar */}
      <header style={{ background: '#1e3a8a', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', boxSizing: 'border-box' }}>
        <h1 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Navigation size={24} /> Fleet Route Optimizer & Multi-Depot Tracker
        </h1>
        <div style={{ fontSize: '14px', background: '#10b981', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
          Real-Time Tracking Online
        </div>
      </header>

      {/* Main Workspace Split View */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        
        {/* Sidebar Panel */}
        <aside style={{ width: '360px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
          
          {/* Fleet Capacity and Depot Assignments Settings */}
          <section style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} /> Fleet Settings
            </h3>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
              Vehicle Capacities (comma-separated):
            </label>
            <input 
              type="text" 
              value={vehicleCapacities}
              onChange={(e) => setVehicleCapacities(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '12px' }}
            />

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
              Assign Starting Depot for Each Fleet Van:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {vehicleCapacities.split(',').map((cap, vIdx) => (
                <div key={vIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Van #{vIdx + 1} (Cap: {cap.trim() || 0}):</span>
                  <select 
                    value={vehicleDepots[vIdx] || 0} 
                    onChange={(e) => handleDepotChange(vIdx, e.target.value)}
                    style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
                  >
                    {locations.map((loc, lIdx) => (
                      <option key={lIdx} value={lIdx}>
                        {lIdx === 0 ? "Default Depot" : `Stop ${lIdx}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* Add Stop details config */}
          <section style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Add New Stops
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px 0' }}>
              Click directly on the map to place delivery hubs / points.
            </p>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
              Next Stop Weight/Demand:
            </label>
            <input 
              type="number" 
              value={newDemand}
              onChange={(e) => setNewDemand(Math.max(1, Number(e.target.value)))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </section>

          {/* List of stops */}
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} /> Registered Locations ({locations.length})
              </h3>
              <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                <Trash2 size={14} /> Clear All
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '5px' }}>
              {locations.map((loc, idx) => {
                const isAssignedAsDepot = vehicleDepots.includes(idx);
                return (
                  <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{loc.label} {isAssignedAsDepot && <small style={{ color: '#2563eb', fontWeight: 'bold' }}>(Depot)</small>}</span>
                    <span style={{ fontWeight: 'bold', color: idx === 0 ? '#1e3a8a' : '#10b981' }}>
                      {idx === 0 ? 'Base Depot' : `Load: ${loc.demand}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Action Trigger Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={handleOptimize} 
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? (
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                "Run Route Optimizer"
              )}
            </button>
          </div>
        </aside>

        {/* Map Window & Floating Dashboards */}
        <main style={{ flex: 1, position: 'relative', height: '100%', width: '100%' }}>
          
          {/* Top-Right Simulation Overlay Trigger */}
          {routes.length > 0 && (
            <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }}>
              <button 
                onClick={handleStartSimulation}
                disabled={isSimulating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  backgroundColor: isSimulating ? '#6c757d' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                }}
              >
                <Play size={16} />
                {isSimulating ? '🚚 Tracking Driver Live...' : '🏁 Start Driver Simulation'}
              </button>
            </div>
          )}

          {/* Leaflet Map Frame */}
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <MapContainer center={CENTER_COORDS} zoom={13} style={{ width: '100%', height: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler />

              {/* Location Pins */}
              {locations.map((loc, idx) => {
                const isDepot = vehicleDepots.includes(idx) || idx === 0;
                return (
                  <Marker key={idx} position={[loc.lat, loc.lng]}>
                    <Popup>
                      <strong>{loc.label}</strong><br />
                      {isDepot ? "Active Fleet Depot Station" : `Required Cargo Weight: ${loc.demand}`}
                    </Popup>
                  </Marker>
                );
              })}

              {/* Active Real-time simulated driver marker */}
              {driverPosition && (
                <Marker position={[driverPosition.lat, driverPosition.lng]} icon={truckIcon}>
                  <Popup>
                    <strong>Active Carrier Vehicle 1</strong> <br />
                    Status: En Route / Live Transmitting
                  </Popup>
                </Marker>
              )}

              {/* Computed Route Lines with Safe Multi-format Checking */}
              {routes.map((routeData, rIdx) => {
                if (!routeData || !routeData.route) return null;
                
                const color = ROUTE_COLORS[rIdx % ROUTE_COLORS.length];
                
                const routePoints = routeData.route.map(nodeData => {
                  // Mocks parsing check whether nodeData is an object or standard array integer
                  const nodeIndex = (nodeData && typeof nodeData === 'object' && 'node' in nodeData) 
                    ? nodeData.node 
                    : nodeData;

                  const loc = locations[nodeIndex];
                  return loc ? [loc.lat, loc.lng] : null;
                }).filter(point => point !== null);

                return (
                  <Polyline 
                    key={rIdx} 
                    positions={routePoints} 
                    color={color} 
                    weight={5} 
                    opacity={0.85} 
                  />
                );
              })}
            </MapContainer>
          </div>

          {/* Bottom-Left Analytics overlay dashboard */}
          {summary && (
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', gap: '20px', fontSize: '13px' }}>
              <div>
                <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Active Vehicles Used</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' }}>{summary.activeVehicles} Vans</span>
              </div>
              <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
                <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Total Routing Cost</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{summary.totalDist}s</span>
              </div>
              <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
                <strong style={{ color: '#4b5563', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Total Cumulative Cargo</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{summary.totalLoad} units</span>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Global CSS Injector for Loader Spin */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}