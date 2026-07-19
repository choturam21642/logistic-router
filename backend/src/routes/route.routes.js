import express from 'express';
import RouteController from '../controllers/route.controller.js';

const router = express.Router();

// Define the POST endpoint for optimization requests
router.post('/optimize', RouteController.optimizeFleetRoutes);

export default router;