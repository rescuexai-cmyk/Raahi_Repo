import 'package:equatable/equatable.dart';

enum UserType { rider, driver, both, admin }

class User extends Equatable {
  final String id;
  final String? email;
  final String? phone;
  final String name;
  final String? avatarUrl;
  final UserType userType;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, dynamic>? userMetadata;
  final double? rating;
  final int totalRides;

  const User({
    required this.id,
    this.email,
    this.phone,
    required this.name,
    this.avatarUrl,
    required this.userType,
    required this.createdAt,
    required this.updatedAt,
    this.userMetadata,
    this.rating,
    this.totalRides = 0,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      name: json['name'] as String? ?? json['phone'] as String? ?? 'User',
      avatarUrl: json['avatar_url'] as String? ?? json['avatarUrl'] as String?,
      userType: _parseUserType(json['user_type'] as String? ?? json['userType'] as String?),
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updated_at'] as String? ?? json['updatedAt'] as String? ?? '') ?? DateTime.now(),
      userMetadata: json['user_metadata'] as Map<String, dynamic>?,
      rating: (json['rating'] as num?)?.toDouble(),
      totalRides: json['totalRides'] as int? ?? json['total_rides'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'name': name,
      'avatar_url': avatarUrl,
      'user_type': userType.name,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'user_metadata': userMetadata,
      'rating': rating,
      'totalRides': totalRides,
    };
  }

  static UserType _parseUserType(String? type) {
    switch (type?.toLowerCase()) {
      case 'driver':
        return UserType.driver;
      case 'both':
        return UserType.both;
      case 'admin':
        return UserType.admin;
      default:
        return UserType.rider;
    }
  }

  User copyWith({
    String? id,
    String? email,
    String? phone,
    String? name,
    String? avatarUrl,
    UserType? userType,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? userMetadata,
    double? rating,
    int? totalRides,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      userType: userType ?? this.userType,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      userMetadata: userMetadata ?? this.userMetadata,
      rating: rating ?? this.rating,
      totalRides: totalRides ?? this.totalRides,
    );
  }

  @override
  List<Object?> get props => [id, email, phone, name, avatarUrl, userType, createdAt, updatedAt, rating, totalRides];
}


