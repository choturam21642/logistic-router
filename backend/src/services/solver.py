# import sys
# import json
# from ortools.constraint_solver import routing_enums_pb2
# from ortools.constraint_solver import pywrapcp

# def solve_cvrp(data_input):
#     data = {}
#     data['distance_matrix'] = data_input['distance_matrix']
#     data['demands'] = data_input['demands']  # Demand at each stop (0 for starting depot)
#     data['vehicle_capacities'] = data_input['vehicle_capacities']  # Capacity limits per vehicle
#     data['num_vehicles'] = len(data_input['vehicle_capacities'])
#     data['depot'] = 0  # Starting index for all vehicles

#     # 1. Create Routing Index Manager and Routing Model
#     manager = pywrapcp.RoutingIndexManager(
#         len(data['distance_matrix']), 
#         data['num_vehicles'], 
#         data['depot']
#     )
#     routing = pywrapcp.RoutingModel(manager)

#     # 2. Define Transit Callback (Travel Cost/Distance Engine)
#     def distance_callback(from_index, to_index):
#         from_node = manager.IndexToNode(from_index)
#         to_node = manager.IndexToNode(to_index)
#         return data['distance_matrix'][from_node][to_node]

#     transit_callback_index = routing.RegisterTransitCallback(distance_callback)
#     routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

#     # 3. Define and Add Vehicle Load Capacity Constraints
#     def demand_callback(from_index):
#         from_node = manager.IndexToNode(from_index)
#         return data['demands'][from_node]

#     demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
#     routing.AddDimensionWithVehicleCapacity(
#         demand_callback_index,
#         0,  # No capacity slack/tolerance
#         data['vehicle_capacities'],
#         True,  # Cumulative load starts at 0 at the depot
#         'Capacity'
#     )

#     # 4. Set Intelligent Search Parameters (Guided Local Search prevents local minima)
#     search_parameters = pywrapcp.DefaultRoutingSearchParameters()
#     search_parameters.first_solution_strategy = (
#         routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
#     )
#     search_parameters.local_search_metaheuristic = (
#         routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
#     )
#     search_parameters.time_limit.seconds = 3  # Keep APIs highly responsive

#     # 5. Execute Solver
#     solution = routing.SolveWithParameters(search_parameters)

#     # 6. Parse and Structure the Output
#     if solution:
#         output = {"status": "Success", "routes": []}
#         for vehicle_id in range(data['num_vehicles']):
#             index = routing.Start(vehicle_id)
#             vehicle_route = []
#             route_distance = 0
#             route_load = 0
            
#             while not routing.IsEnd(index):
#                 node_index = manager.IndexToNode(index)
#                 route_load += data['demands'][node_index]
#                 vehicle_route.append({
#                     "node": node_index,
#                     "cumulative_load": route_load
#                 })
#                 previous_index = index
#                 index = solution.Value(routing.NextVar(index))
#                 route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
                
#             vehicle_route.append({
#                 "node": manager.IndexToNode(index),
#                 "cumulative_load": route_load
#             })
            
#             output["routes"].append({
#                 "vehicle_id": vehicle_id,
#                 "route": vehicle_route,
#                 "total_distance_or_time": route_distance,
#                 "total_load": route_load
#             })
#         return output
#     else:
#         return {"status": "Failed", "message": "No feasible routing solution found matching constraints"}

# if __name__ == '__main__':
#     # Stream communication with Node JS process using stdin and stdout pipelines
#     try:
#         input_data = json.loads(sys.stdin.read())
#         result = solve_cvrp(input_data)
#         print(json.dumps(result))
#     except Exception as e:
#         print(json.dumps({"status": "Error", "message": str(e)}))



















# import sys
# import json
# from ortools.constraint_solver import routing_enums_pb2
# from ortools.constraint_solver import pywrapcp

# def solve_multi_depot_vrp(matrix_data):
#     # matrix_data will contain: 'distance_matrix', 'demands', 'vehicle_capacities', and 'starts' / 'ends'
    
#     data = {}
#     data['distance_matrix'] = matrix_data['distance_matrix']
#     data['demands'] = matrix_data['demands']
#     data['vehicle_capacities'] = matrix_data['vehicle_capacities']
    
#     # 'starts' and 'ends' are arrays containing the location index for each vehicle
#     # Example: If Vehicle 0 starts at index 0 (Depot A) and Vehicle 1 starts at index 1 (Depot B)
#     data['starts'] = matrix_data['starts']
#     data['ends'] = matrix_data['ends']
#     data['num_vehicles'] = len(data['vehicle_capacities'])

#     # 1. Create the routing index manager using multiple starts and ends arrays
#     manager = pywrapcp.RoutingIndexManager(
#         len(data['distance_matrix']),
#         data['num_vehicles'],
#         data['starts'],
#         data['ends']
#     )

#     # 2. Create Routing Model
#     routing = pywrapcp.RoutingModel(manager)

#     # 3. Create and register a transit callback (distances)
#     def distance_callback(from_index, to_index):
#         from_node = manager.IndexToNode(from_index)
#         to_node = manager.IndexToNode(to_index)
#         return data['distance_matrix'][from_node][to_node]

#     transit_callback_index = routing.RegisterTransitCallback(distance_callback)

#     # Define cost of each arc.
#     routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

#     # 4. Add Capacity Constraints
#     def demand_callback(from_index):
#         from_node = manager.IndexToNode(from_index)
#         return data['demands'][from_node]

#     demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
#     routing.AddDimensionWithVehicleCapacity(
#         demand_callback_index,
#         0,  # null capacity slack
#         data['vehicle_capacities'],  # vehicle maximum capacities
#         True,  # start cumul to zero
#         'Capacity'
#     )

#     # 5. Setting first solution heuristics.
#     search_parameters = pywrapcp.DefaultRoutingSearchParameters()
#     search_parameters.first_solution_strategy = (
#         routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
#     )

#     # Solve the problem.
#     solution = routing.SolveWithParameters(search_parameters)

#     # 6. Format and return the output paths
#     if solution:
#         output_routes = []
#         for vehicle_id in range(data['num_vehicles']):
#             index = routing.Start(vehicle_id)
#             route_for_vehicle = []
#             while not routing.IsEnd(index):
#                 node_index = manager.IndexToNode(index)
#                 route_for_vehicle.append(node_index)
#                 index = solution.Value(routing.NextVar(index))
#             # Add the final landing depot index
#             route_for_vehicle.append(manager.IndexToNode(index))
            
#             output_routes.append({
#                 "vehicle": vehicle_id,
#                 "route": route_for_vehicle
#             })
#         return {"success": True, "routes": output_routes}
#     else:
#         return {"success": False, "message": "No solution found"}

# if __name__ == '__main__':
#     # Expecting json payload from Node.js child_process script
#     input_data = json.loads(sys.stdin.read())
#     result = solve_multi_depot_vrp(input_data)
#     print(json.dumps(result))

















import sys
import json
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def solve_vrp():
    # Read problem data passed from Node.js backend via stdin
    lines = sys.stdin.read()
    if not lines.strip():
        print(json.dumps({"status": "Error", "message": "No data received via stdin"}))
        return

    try:
        input_data = json.loads(lines)
    except Exception as e:
        print(json.dumps({"status": "Error", "message": f"Invalid JSON input: {str(e)}"}))
        return
    
    # Flexible lookup to prevent KeyError regardless of camelCase or snake_case conventions
    distance_matrix = input_data.get('distanceMatrix') or input_data.get('distance_matrix')
    demands = input_data.get('demands')
    vehicle_capacities = input_data.get('vehicleCapacities') or input_data.get('vehicle_capacities')
    vehicle_depots = input_data.get('vehicleDepots') or input_data.get('vehicle_depots')

    # Validating mandatory parameters
    if not distance_matrix:
        print(json.dumps({"status": "Error", "message": "Key 'distanceMatrix' or 'distance_matrix' missing from input data."}))
        return
    if demands is None:
        print(json.dumps({"status": "Error", "message": "Key 'demands' missing from input data."}))
        return
    if not vehicle_capacities:
        print(json.dumps({"status": "Error", "message": "Key 'vehicleCapacities' or 'vehicle_capacities' missing from input data."}))
        return

    # Fallback to single depot [0, 0, ...] if no specific vehicle depots are provided
    if not vehicle_depots:
        vehicle_depots = [0] * len(vehicle_capacities)

    # Define unique starts and ends arrays for EACH separate vehicle to enable true Multi-Depot routing
    starts = [int(d) for d in vehicle_depots]
    ends = [int(d) for d in vehicle_depots]
    
    num_vehicles = len(vehicle_capacities)

    # Sanity Check: Ensure assigned depots themselves don't force a delivery demand constraint
    for depot_idx in set(starts):
        if depot_idx < len(demands):
            demands[depot_idx] = 0

    # Initialize the Routing Index Manager with multi-depot configuration vectors
    manager = pywrapcp.RoutingIndexManager(
        len(distance_matrix),
        num_vehicles,
        starts,
        ends
    )

    routing = pywrapcp.RoutingModel(manager)

    # Create and register a transit callback (Distance/Time evaluator)
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(distance_matrix[from_node][to_node])

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Capacity Constraints
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return int(demands[from_node])

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,                    # null capacity slack
        vehicle_capacities,   # vehicle maximum capacities list
        True,                 # start counting capacity from zero at each separate depot
        'Capacity'
    )

    # Set Search Parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 2

    # Solve the optimization problem
    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        output_routes = []
        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route_nodes = []
            route_load = 0
            route_distance = 0
            
            while not routing.IsEnd(index):
                node_idx = manager.IndexToNode(index)
                route_nodes.append(node_idx)
                route_load += demands[node_idx]
                
                # Calculate transit cost to the next index correctly using the routing system
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
                
            # Append final closing node connection back to its original depot
            route_nodes.append(manager.IndexToNode(index))
            
            # Check if the vehicle actually left its assigned base to serve locations
            if len(route_nodes) > 2:
                output_routes.append({
                    "vehicle": vehicle_id,
                    "route": route_nodes,
                    "total_load": route_load,
                    "total_distance_or_time": int(route_distance)
                })
            else:
                # Still include empty routes to prevent frontend array index mapping crashes
                output_routes.append({
                    "vehicle": vehicle_id,
                    "route": [starts[vehicle_id], ends[vehicle_id]],
                    "total_load": 0,
                    "total_distance_or_time": 0
                })

        print(json.dumps({"status": "Success", "routes": output_routes}))
    else:
        print(json.dumps({"status": "Failed", "message": "No viable multi-depot path combinations found."}))

if __name__ == '__main__':
    solve_vrp()