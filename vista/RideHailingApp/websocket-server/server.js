const WebSocket = require('ws');
const url = require('url');

// Create WebSocket server
const wss = new WebSocket.Server({ 
  port: 8080,
  verifyClient: (info) => {
    // Basic auth verification - in production, verify JWT token
    const query = url.parse(info.req.url, true).query;
    return query.token ? true : false;
  }
});

// Store active connections
const connections = new Map();
const rideRooms = new Map(); // Map of rideId -> Set of client IDs
const driverLocations = new Map(); // Map of driverId -> location data

console.log('WebSocket server started on port 8080');

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const clientId = generateClientId();
  const userToken = query.token;
  
  // Store connection
  connections.set(clientId, {
    ws,
    userId: null, // Will be set after auth
    userType: null,
    joinedRides: new Set()
  });

  console.log(`Client ${clientId} connected`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(clientId, message);
    } catch (error) {
      console.error('Error parsing message:', error);
      sendError(clientId, 'Invalid JSON message');
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    cleanupConnection(clientId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    cleanupConnection(clientId);
  });
});

function generateClientId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function handleMessage(clientId, message) {
  const client = connections.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'auth':
      handleAuth(clientId, message.data);
      break;
    
    case 'join_ride':
      joinRideRoom(clientId, message.data.rideId);
      break;
    
    case 'leave_ride':
      leaveRideRoom(clientId, message.data.rideId);
      break;
    
    case 'driver_location_update':
      handleDriverLocationUpdate(clientId, message.data);
      break;
    
    case 'ride_status_update':
      handleRideStatusUpdate(clientId, message.data);
      break;
    
    case 'driver_availability':
      handleDriverAvailability(clientId, message.data);
      break;
    
    case 'ride_request':
      handleRideRequest(clientId, message.data);
      break;
    
    case 'accept_ride':
      handleAcceptRide(clientId, message.data);
      break;
    
    case 'cancel_ride':
      handleCancelRide(clientId, message.data);
      break;
    
    case 'ride_message':
      handleRideMessage(clientId, message.data);
      break;
    
    default:
      sendError(clientId, `Unknown message type: ${message.type}`);
  }
}

function handleAuth(clientId, data) {
  const client = connections.get(clientId);
  if (!client) return;

  // In a real implementation, verify the JWT token here
  // For now, we'll extract basic info from the token
  try {
    // Mock token verification - in production, use proper JWT verification
    client.userId = `user_${Date.now()}`;
    client.userType = data.userType || 'rider';
    
    sendMessage(clientId, 'auth_success', { 
      clientId,
      message: 'Authentication successful' 
    });
    
    console.log(`Client ${clientId} authenticated as ${client.userType}`);
  } catch (error) {
    sendError(clientId, 'Authentication failed');
  }
}

function joinRideRoom(clientId, rideId) {
  const client = connections.get(clientId);
  if (!client) return;

  if (!rideRooms.has(rideId)) {
    rideRooms.set(rideId, new Set());
  }
  
  rideRooms.get(rideId).add(clientId);
  client.joinedRides.add(rideId);
  
  sendMessage(clientId, 'joined_ride', { rideId });
  console.log(`Client ${clientId} joined ride ${rideId}`);
}

function leaveRideRoom(clientId, rideId) {
  const client = connections.get(clientId);
  if (!client) return;

  if (rideRooms.has(rideId)) {
    rideRooms.get(rideId).delete(clientId);
    if (rideRooms.get(rideId).size === 0) {
      rideRooms.delete(rideId);
    }
  }
  
  client.joinedRides.delete(rideId);
  
  sendMessage(clientId, 'left_ride', { rideId });
  console.log(`Client ${clientId} left ride ${rideId}`);
}

function handleDriverLocationUpdate(clientId, data) {
  const client = connections.get(clientId);
  if (!client || client.userType !== 'driver') return;

  // Store driver location
  driverLocations.set(client.userId, {
    ...data.driverLocation,
    speed: data.speed,
    heading: data.heading,
    timestamp: Date.now()
  });

  // Broadcast to ride room if rideId is provided
  if (data.rideId && rideRooms.has(data.rideId)) {
    broadcastToRideRoom(data.rideId, 'driver_location_update', data, clientId);
  }
}

function handleRideStatusUpdate(clientId, data) {
  const client = connections.get(clientId);
  if (!client) return;

  // Broadcast status update to ride room
  if (data.rideId && rideRooms.has(data.rideId)) {
    broadcastToRideRoom(data.rideId, 'ride_status_update', data, clientId);
  }
}

function handleDriverAvailability(clientId, data) {
  const client = connections.get(clientId);
  if (!client || client.userType !== 'driver') return;

  // In a real implementation, this would update the database
  console.log(`Driver ${client.userId} availability: ${data.isAvailable}`);
  
  sendMessage(clientId, 'availability_updated', data);
}

function handleRideRequest(clientId, data) {
  const client = connections.get(clientId);
  if (!client || client.userType !== 'rider') return;

  // Broadcast to nearby available drivers
  // In a real implementation, this would query the database for nearby drivers
  broadcastToDrivers('ride_request', {
    ...data,
    requesterId: client.userId
  });
  
  console.log(`Ride request from ${client.userId}`);
}

function handleAcceptRide(clientId, data) {
  const client = connections.get(clientId);
  if (!client || client.userType !== 'driver') return;

  // Broadcast to ride room
  if (data.rideId && rideRooms.has(data.rideId)) {
    broadcastToRideRoom(data.rideId, 'ride_accepted', {
      rideId: data.rideId,
      driverId: client.userId
    }, clientId);
  }
  
  console.log(`Ride ${data.rideId} accepted by driver ${client.userId}`);
}

function handleCancelRide(clientId, data) {
  const client = connections.get(clientId);
  if (!client) return;

  // Broadcast to ride room
  if (data.rideId && rideRooms.has(data.rideId)) {
    broadcastToRideRoom(data.rideId, 'ride_cancelled', {
      rideId: data.rideId,
      reason: data.reason,
      cancelledBy: client.userId
    }, clientId);
  }
  
  console.log(`Ride ${data.rideId} cancelled by ${client.userId}`);
}

function handleRideMessage(clientId, data) {
  const client = connections.get(clientId);
  if (!client) return;

  // Broadcast message to ride room
  if (data.rideId && rideRooms.has(data.rideId)) {
    broadcastToRideRoom(data.rideId, 'ride_message', {
      rideId: data.rideId,
      message: data.message,
      senderId: client.userId,
      timestamp: Date.now()
    }, clientId);
  }
}

function broadcastToRideRoom(rideId, messageType, data, excludeClientId = null) {
  if (!rideRooms.has(rideId)) return;

  const clients = rideRooms.get(rideId);
  clients.forEach(clientId => {
    if (clientId !== excludeClientId) {
      sendMessage(clientId, messageType, data);
    }
  });
}

function broadcastToDrivers(messageType, data) {
  connections.forEach((client, clientId) => {
    if (client.userType === 'driver') {
      sendMessage(clientId, messageType, data);
    }
  });
}

function sendMessage(clientId, type, data) {
  const client = connections.get(clientId);
  if (!client || client.ws.readyState !== WebSocket.OPEN) return;

  const message = {
    type,
    data,
    timestamp: Date.now()
  };

  try {
    client.ws.send(JSON.stringify(message));
  } catch (error) {
    console.error(`Error sending message to client ${clientId}:`, error);
    cleanupConnection(clientId);
  }
}

function sendError(clientId, error) {
  sendMessage(clientId, 'error', { error });
}

function cleanupConnection(clientId) {
  const client = connections.get(clientId);
  if (client) {
    // Remove from all ride rooms
    client.joinedRides.forEach(rideId => {
      if (rideRooms.has(rideId)) {
        rideRooms.get(rideId).delete(clientId);
        if (rideRooms.get(rideId).size === 0) {
          rideRooms.delete(rideId);
        }
      }
    });
    
    // Remove driver location if it's a driver
    if (client.userType === 'driver' && client.userId) {
      driverLocations.delete(client.userId);
    }
    
    connections.delete(clientId);
  }
}

// Health check endpoint info
console.log('WebSocket server is running on ws://localhost:8080');
console.log('Connect with: ws://localhost:8080?token=your_jwt_token');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});