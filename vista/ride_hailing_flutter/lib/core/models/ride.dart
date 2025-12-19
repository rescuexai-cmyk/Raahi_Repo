import 'package:equatable/equatable.dart';
import 'location.dart';
import 'driver.dart';

enum RideStatus {
  requested,
  accepted,
  arriving,
  driverArriving,
  inProgress,
  completed,
  cancelled,
}

enum PaymentMethod { cash, card, digitalWallet }

class Ride extends Equatable {
  final String id;
  final String riderId;
  final String? driverId;
  final AddressLocation pickupLocation;
  final AddressLocation destinationLocation;
  final RideStatus status;
  final double fare;
  final double distance;
  final int estimatedDuration;
  final String rideType;
  final PaymentMethod paymentMethod;
  final DateTime createdAt;
  final DateTime? acceptedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final double? rating;
  final String? notes;
  final Driver? driver;

  const Ride({
    required this.id,
    required this.riderId,
    this.driverId,
    required this.pickupLocation,
    required this.destinationLocation,
    required this.status,
    required this.fare,
    required this.distance,
    required this.estimatedDuration,
    required this.rideType,
    required this.paymentMethod,
    required this.createdAt,
    this.acceptedAt,
    this.startedAt,
    this.completedAt,
    this.cancelledAt,
    this.rating,
    this.notes,
    this.driver,
  });

  factory Ride.fromJson(Map<String, dynamic> json) {
    // Handle both camelCase (backend) and snake_case field names
    final pickupLoc = json['pickupLocation'] ?? json['pickup_location'];
    final destLoc = json['destinationLocation'] ?? json['destination_location'];
    final pickupAddr = json['pickupAddress'] ?? json['pickup_address'] ?? 'Pickup';
    final destAddr = json['destinationAddress'] ?? json['destination_address'] ?? 'Destination';
    
    return Ride(
      id: json['id'] as String,
      riderId: (json['riderId'] ?? json['rider_id'] ?? '') as String,
      driverId: (json['driverId'] ?? json['driver_id']) as String?,
      pickupLocation: pickupLoc is Map<String, dynamic> 
          ? AddressLocation.fromJson({...pickupLoc, 'address': pickupAddr})
          : AddressLocation(latitude: 0, longitude: 0, address: pickupAddr),
      destinationLocation: destLoc is Map<String, dynamic>
          ? AddressLocation.fromJson({...destLoc, 'address': destAddr})
          : AddressLocation(latitude: 0, longitude: 0, address: destAddr),
      status: _parseStatus((json['status'] ?? 'requested') as String),
      fare: (json['fare'] as num?)?.toDouble() ?? 0.0,
      distance: (json['distance'] as num?)?.toDouble() ?? 0.0,
      estimatedDuration: (json['estimatedDuration'] ?? json['estimated_duration'] ?? json['duration'] ?? 0) as int,
      rideType: (json['rideType'] ?? json['ride_type'] ?? 'economy') as String,
      paymentMethod: _parsePaymentMethod((json['paymentMethod'] ?? json['payment_method'] ?? 'cash') as String),
      createdAt: _parseDateTime(json['createdAt'] ?? json['created_at']),
      acceptedAt: _parseNullableDateTime(json['acceptedAt'] ?? json['accepted_at']),
      startedAt: _parseNullableDateTime(json['startedAt'] ?? json['started_at']),
      completedAt: _parseNullableDateTime(json['completedAt'] ?? json['completed_at']),
      cancelledAt: _parseNullableDateTime(json['cancelledAt'] ?? json['cancelled_at']),
      rating: (json['rating'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
      driver: json['driver'] != null ? Driver.fromJson(json['driver'] as Map<String, dynamic>) : null,
    );
  }
  
  static DateTime _parseDateTime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is String) return DateTime.parse(value);
    return DateTime.now();
  }
  
  static DateTime? _parseNullableDateTime(dynamic value) {
    if (value == null) return null;
    if (value is String) return DateTime.parse(value);
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rider_id': riderId,
      'driver_id': driverId,
      'pickup_location': pickupLocation.toJson(),
      'destination_location': destinationLocation.toJson(),
      'status': status.name,
      'fare': fare,
      'distance': distance,
      'estimated_duration': estimatedDuration,
      'ride_type': rideType,
      'payment_method': paymentMethod.name,
      'created_at': createdAt.toIso8601String(),
      'accepted_at': acceptedAt?.toIso8601String(),
      'started_at': startedAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'cancelled_at': cancelledAt?.toIso8601String(),
      'rating': rating,
      'notes': notes,
    };
  }

  static RideStatus _parseStatus(String status) {
    switch (status) {
      case 'requested':
        return RideStatus.requested;
      case 'accepted':
        return RideStatus.accepted;
      case 'arriving':
        return RideStatus.arriving;
      case 'driver_arriving':
        return RideStatus.driverArriving;
      case 'in_progress':
        return RideStatus.inProgress;
      case 'completed':
        return RideStatus.completed;
      case 'cancelled':
        return RideStatus.cancelled;
      default:
        return RideStatus.requested;
    }
  }

  static PaymentMethod _parsePaymentMethod(String method) {
    switch (method) {
      case 'card':
        return PaymentMethod.card;
      case 'digital_wallet':
        return PaymentMethod.digitalWallet;
      default:
        return PaymentMethod.cash;
    }
  }

  Ride copyWith({
    String? id,
    String? riderId,
    String? driverId,
    AddressLocation? pickupLocation,
    AddressLocation? destinationLocation,
    RideStatus? status,
    double? fare,
    double? distance,
    int? estimatedDuration,
    String? rideType,
    PaymentMethod? paymentMethod,
    DateTime? createdAt,
    DateTime? acceptedAt,
    DateTime? startedAt,
    DateTime? completedAt,
    DateTime? cancelledAt,
    double? rating,
    String? notes,
    Driver? driver,
  }) {
    return Ride(
      id: id ?? this.id,
      riderId: riderId ?? this.riderId,
      driverId: driverId ?? this.driverId,
      pickupLocation: pickupLocation ?? this.pickupLocation,
      destinationLocation: destinationLocation ?? this.destinationLocation,
      status: status ?? this.status,
      fare: fare ?? this.fare,
      distance: distance ?? this.distance,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
      rideType: rideType ?? this.rideType,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      createdAt: createdAt ?? this.createdAt,
      acceptedAt: acceptedAt ?? this.acceptedAt,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      cancelledAt: cancelledAt ?? this.cancelledAt,
      rating: rating ?? this.rating,
      notes: notes ?? this.notes,
      driver: driver ?? this.driver,
    );
  }

  @override
  List<Object?> get props => [id, riderId, driverId, status, fare];
}

class FareEstimate extends Equatable {
  final String rideType;
  final double baseFare;
  final double distanceFare;
  final double timeFare;
  final double subtotal;
  final double taxes;
  final double total;
  final String currency;
  final double estimatedDistance;
  final double estimatedDuration;
  final double? distance;
  final double? estimatedTime;

  const FareEstimate({
    required this.rideType,
    required this.baseFare,
    required this.distanceFare,
    required this.timeFare,
    required this.subtotal,
    required this.taxes,
    required this.total,
    required this.currency,
    required this.estimatedDistance,
    required this.estimatedDuration,
    this.distance,
    this.estimatedTime,
  });

  factory FareEstimate.fromJson(Map<String, dynamic> json) {
    return FareEstimate(
      rideType: json['rideType'] as String,
      baseFare: (json['baseFare'] as num).toDouble(),
      distanceFare: (json['distanceFare'] as num).toDouble(),
      timeFare: (json['timeFare'] as num).toDouble(),
      subtotal: (json['subtotal'] as num).toDouble(),
      taxes: (json['taxes'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'INR',
      estimatedDistance: (json['estimatedDistance'] as num).toDouble(),
      estimatedDuration: (json['estimatedDuration'] as num).toDouble(),
      distance: (json['distance'] as num?)?.toDouble(),
      estimatedTime: (json['estimatedTime'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rideType': rideType,
      'baseFare': baseFare,
      'distanceFare': distanceFare,
      'timeFare': timeFare,
      'subtotal': subtotal,
      'taxes': taxes,
      'total': total,
      'currency': currency,
      'estimatedDistance': estimatedDistance,
      'estimatedDuration': estimatedDuration,
      'distance': distance,
      'estimatedTime': estimatedTime,
    };
  }

  @override
  List<Object?> get props => [rideType, total, estimatedDistance];
}


