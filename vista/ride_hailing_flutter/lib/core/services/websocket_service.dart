import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/app_config.dart';

typedef WebSocketListener = void Function(WebSocketMessage message);

class WebSocketMessage {
  final String type;
  final dynamic data;
  final int timestamp;

  const WebSocketMessage({
    required this.type,
    required this.data,
    required this.timestamp,
  });

  factory WebSocketMessage.fromJson(Map<String, dynamic> json) {
    return WebSocketMessage(
      type: json['type'] as String,
      data: json['data'],
      timestamp: json['timestamp'] as int? ?? DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'data': data,
      'timestamp': timestamp,
    };
  }
}

class RideLocationUpdate {
  final String rideId;
  final double latitude;
  final double longitude;
  final double? speed;
  final double? heading;

  const RideLocationUpdate({
    required this.rideId,
    required this.latitude,
    required this.longitude,
    this.speed,
    this.heading,
  });

  Map<String, dynamic> toJson() {
    return {
      'rideId': rideId,
      'driverLocation': {
        'latitude': latitude,
        'longitude': longitude,
      },
      if (speed != null) 'speed': speed,
      if (heading != null) 'heading': heading,
    };
  }
}

class WebSocketService {
  WebSocketChannel? _channel;
  final Map<String, List<WebSocketListener>> _listeners = {};
  int _reconnectAttempts = 0;
  final int _maxReconnectAttempts = 5;
  int _reconnectDelay = 1000;
  bool _isConnecting = false;
  String? _authToken;
  StreamSubscription? _subscription;

  // Connection status stream
  final _connectionStatusController = StreamController<bool>.broadcast();
  Stream<bool> get connectionStatus => _connectionStatusController.stream;

  bool get isConnected => _channel != null;

  // Connect to WebSocket server
  Future<void> connect({String? token}) async {
    if (_channel != null) {
      return;
    }

    if (_isConnecting) {
      return;
    }

    _isConnecting = true;
    _authToken = token;

    try {
      final wsUrl = Uri.parse('${AppConfig.wsUrl}${token != null ? '?token=$token' : ''}');
      _channel = WebSocketChannel.connect(wsUrl);

      _subscription = _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDisconnect,
      );

      _isConnecting = false;
      _reconnectAttempts = 0;
      _connectionStatusController.add(true);

      // Send authentication message
      if (token != null) {
        sendMessage('auth', {'token': token});
      }

      print('WebSocket connected');
    } catch (e) {
      print('Failed to connect to WebSocket: $e');
      _isConnecting = false;
      _connectionStatusController.add(false);
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final decoded = json.decode(message as String) as Map<String, dynamic>;
      final wsMessage = WebSocketMessage.fromJson(decoded);
      
      // Notify type-specific listeners
      final listeners = _listeners[wsMessage.type];
      if (listeners != null) {
        for (final listener in listeners) {
          listener(wsMessage);
        }
      }

      // Notify global listeners
      final globalListeners = _listeners['*'];
      if (globalListeners != null) {
        for (final listener in globalListeners) {
          listener(wsMessage);
        }
      }
    } catch (e) {
      print('Error parsing WebSocket message: $e');
    }
  }

  void _handleError(dynamic error) {
    print('WebSocket error: $error');
    _connectionStatusController.add(false);
  }

  void _handleDisconnect() {
    print('WebSocket disconnected');
    _channel = null;
    _subscription?.cancel();
    _connectionStatusController.add(false);

    if (_reconnectAttempts < _maxReconnectAttempts) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectAttempts++;
    print('WebSocket reconnect attempt $_reconnectAttempts');
    
    _reconnectDelay = (_reconnectDelay * 2).clamp(1000, 30000);
    
    Future.delayed(Duration(milliseconds: _reconnectDelay), () {
      connect(token: _authToken);
    });
  }

  // Disconnect from WebSocket
  void disconnect() {
    _reconnectAttempts = _maxReconnectAttempts; // Prevent reconnection
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
    _listeners.clear();
    _connectionStatusController.add(false);
  }

  // Send message to WebSocket server
  void sendMessage(String type, dynamic data) {
    if (_channel == null) {
      print('WebSocket not connected, cannot send message');
      return;
    }

    final message = WebSocketMessage(
      type: type,
      data: data,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
    
    _channel!.sink.add(json.encode(message.toJson()));
  }

  // Subscribe to message type
  VoidCallback subscribe(String messageType, WebSocketListener listener) {
    _listeners.putIfAbsent(messageType, () => []);
    _listeners[messageType]!.add(listener);
    
    return () {
      _listeners[messageType]?.remove(listener);
    };
  }

  // Subscribe to all messages
  VoidCallback subscribeToAll(WebSocketListener listener) {
    return subscribe('*', listener);
  }

  // Real-time tracking methods

  // Join ride tracking room
  void joinRideTracking(String rideId) {
    sendMessage('join_ride', {'rideId': rideId});
  }

  // Leave ride tracking room
  void leaveRideTracking(String rideId) {
    sendMessage('leave_ride', {'rideId': rideId});
  }

  // Send driver location update
  void updateDriverLocation(RideLocationUpdate update) {
    sendMessage('driver_location_update', update.toJson());
  }

  // Send ride status update
  void updateRideStatus(String rideId, String status, {String? driverId, int? estimatedArrival}) {
    sendMessage('ride_status_update', {
      'rideId': rideId,
      'status': status,
      if (driverId != null) 'driverId': driverId,
      if (estimatedArrival != null) 'estimatedArrival': estimatedArrival,
    });
  }

  // Send driver availability status
  void updateDriverAvailability(bool isAvailable) {
    sendMessage('driver_availability', {'isAvailable': isAvailable});
  }

  // Request ride (rider)
  void requestRide(Map<String, dynamic> rideData) {
    sendMessage('ride_request', rideData);
  }

  // Accept ride (driver)
  void acceptRide(String rideId) {
    sendMessage('accept_ride', {'rideId': rideId});
  }

  // Cancel ride
  void cancelRide(String rideId, {String? reason}) {
    sendMessage('cancel_ride', {
      'rideId': rideId,
      if (reason != null) 'reason': reason,
    });
  }

  // Send message to ride participants
  void sendRideMessage(String rideId, String message) {
    sendMessage('ride_message', {'rideId': rideId, 'message': message});
  }

  // Send chat message
  void sendChatMessage({required String rideId, required String message}) {
    sendMessage('chat_message', {
      'rideId': rideId,
      'message': {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'text': message,
        'senderId': 'rider',
        'senderName': 'Rider',
        'timestamp': DateTime.now().toIso8601String(),
      },
    });
  }
  
  // Stream for raw messages (useful for chat)
  Stream<Map<String, dynamic>>? get messageStream {
    if (_channel == null) return null;
    return _channel!.stream.map((data) {
      return json.decode(data as String) as Map<String, dynamic>;
    }).asBroadcastStream();
  }

  // Subscribe to ride-specific events
  VoidCallback subscribeToRideUpdates(String rideId, void Function(Map<String, dynamic> data) callback) {
    final unsubscribers = <VoidCallback>[];

    unsubscribers.add(subscribe('ride_status_update', (message) {
      if (message.data['rideId'] == rideId) {
        callback({'type': 'status_update', ...message.data as Map<String, dynamic>});
      }
    }));

    unsubscribers.add(subscribe('driver_location_update', (message) {
      if (message.data['rideId'] == rideId) {
        callback({'type': 'location_update', ...message.data as Map<String, dynamic>});
      }
    }));

    unsubscribers.add(subscribe('ride_message', (message) {
      if (message.data['rideId'] == rideId) {
        callback({'type': 'message', ...message.data as Map<String, dynamic>});
      }
    }));

    unsubscribers.add(subscribe('ride_cancelled', (message) {
      if (message.data['rideId'] == rideId) {
        callback({'type': 'cancelled', ...message.data as Map<String, dynamic>});
      }
    }));

    return () {
      for (final unsubscribe in unsubscribers) {
        unsubscribe();
      }
    };
  }

  // Subscribe to driver-specific events
  VoidCallback subscribeToDriverEvents(void Function(Map<String, dynamic> data) callback) {
    final unsubscribers = <VoidCallback>[];

    unsubscribers.add(subscribe('ride_request', (message) {
      callback({'type': 'new_ride_request', ...message.data as Map<String, dynamic>});
    }));

    unsubscribers.add(subscribe('ride_cancelled', (message) {
      callback({'type': 'ride_cancelled', ...message.data as Map<String, dynamic>});
    }));

    return () {
      for (final unsubscribe in unsubscribers) {
        unsubscribe();
      }
    };
  }

  void dispose() {
    disconnect();
    _connectionStatusController.close();
  }
}

typedef VoidCallback = void Function();

// Singleton instance
final webSocketService = WebSocketService();


