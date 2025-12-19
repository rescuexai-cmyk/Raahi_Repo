import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/models/user.dart';
import '../../../../core/services/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/app_routes.dart';
import '../../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _openSettings(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Profile header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.inputBackground,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: AppColors.secondary.withOpacity(0.2),
                    backgroundImage: user?.avatarUrl != null
                        ? NetworkImage(user!.avatarUrl!)
                        : null,
                    child: user?.avatarUrl == null
                        ? Text(
                            user?.name.isNotEmpty == true
                                ? user!.name[0].toUpperCase()
                                : 'U',
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: AppColors.secondary,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name ?? 'User',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?.email ?? '',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                        if (user?.phone != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            user!.phone!,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: () => _openEditProfile(context, ref, user),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Stats row
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.directions_car,
                    label: 'Total Rides',
                    value: '24',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.star,
                    label: 'Rating',
                    value: '4.8',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.favorite,
                    label: 'Saved',
                    value: '3',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Menu items
            _MenuItem(
              icon: Icons.history,
              title: 'Ride History',
              subtitle: 'View your past rides',
              onTap: () => context.go(AppRoutes.history),
            ),
            _MenuItem(
              icon: Icons.payment,
              title: 'Payment Methods',
              subtitle: 'Manage your payment options',
              onTap: () => _openPaymentMethods(context),
            ),
            _MenuItem(
              icon: Icons.location_on_outlined,
              title: 'Saved Places',
              subtitle: 'Home, Work, and more',
              onTap: () => _openSavedPlaces(context),
            ),
            _MenuItem(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              subtitle: 'Manage notification preferences',
              onTap: () => _openNotificationPreferences(context),
            ),
            _MenuItem(
              icon: Icons.help_outline,
              title: 'Help & Support',
              subtitle: 'Get help with your rides',
              onTap: () => _openHelpOptions(context),
            ),
            _MenuItem(
              icon: Icons.info_outline,
              title: 'About',
              subtitle: 'App version and info',
              onTap: () {
                showAboutDialog(
                  context: context,
                  applicationName: 'RideApp',
                  applicationVersion: '1.0.0',
                  applicationIcon: const Icon(Icons.directions_car, size: 48, color: AppColors.primary),
                );
              },
            ),
            const SizedBox(height: 24),

            // Logout button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Sign Out'),
                      content: const Text('Are you sure you want to sign out?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancel'),
                        ),
                        ElevatedButton(
                          onPressed: () => Navigator.pop(context, true),
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                          child: const Text('Sign Out'),
                        ),
                      ],
                    ),
                  );

                  if (confirmed == true) {
                    await ref.read(authStateProvider.notifier).signOut();
                    if (context.mounted) {
                      context.go(AppRoutes.login);
                    }
                  }
                },
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: const Text('Sign Out', style: TextStyle(color: AppColors.error)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Future<SharedPreferences> _prefs() => SharedPreferences.getInstance();

  Future<void> _openSettings(BuildContext context) async {
    final prefs = await _prefs();
    bool pushEnabled = prefs.getBool('pref_push_notifications') ?? true;
    bool promoEnabled = prefs.getBool('pref_promo_notifications') ?? false;

    // ignore: use_build_context_synchronously
    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SwitchListTile(
                    title: const Text('Ride updates'),
                    subtitle: const Text('Pickup, arrival, and trip status alerts'),
                    value: pushEnabled,
                    onChanged: (value) {
                      setModalState(() => pushEnabled = value);
                      prefs.setBool('pref_push_notifications', value);
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Promotions'),
                    subtitle: const Text('Discounts and special offers'),
                    value: promoEnabled,
                    onChanged: (value) {
                      setModalState(() => promoEnabled = value);
                      prefs.setBool('pref_promo_notifications', value);
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openEditProfile(BuildContext context, WidgetRef ref, User? user) async {
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to edit profile')),
      );
      return;
    }

    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone ?? '');

    final shouldSave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Profile'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Full name'),
            ),
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(labelText: 'Phone'),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );

    if (shouldSave != true) return;

    try {
      final updatedUserData = {
        'name': nameController.text.trim(),
        'phone': phoneController.text.trim(),
      };
      await apiClient.updateUser(user.id, updatedUserData);
      final updatedUser = user.copyWith(
        name: updatedUserData['name'],
        phone: updatedUserData['phone'],
      );
      await ref.read(authStateProvider.notifier).updateUser(updatedUser);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      debugPrint('Error updating profile: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to update profile'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _openPaymentMethods(BuildContext context) async {
    final prefs = await _prefs();
    List<dynamic> stored = [];
    try {
      stored = jsonDecode(prefs.getString('pref_payment_methods') ?? '[]') as List<dynamic>;
    } catch (_) {}
    List<Map<String, dynamic>> methods = stored
        .map((e) => (e as Map).map((key, value) => MapEntry(key.toString(), value)))
        .toList();

    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            Future<void> saveMethods() async {
              await prefs.setString('pref_payment_methods', jsonEncode(methods));
            }

            Future<void> addMethod() async {
              final brandController = TextEditingController();
              final last4Controller = TextEditingController();
              final added = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Add payment method'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(controller: brandController, decoration: const InputDecoration(labelText: 'Card brand')),
                      TextField(
                        controller: last4Controller,
                        decoration: const InputDecoration(labelText: 'Last 4 digits'),
                        keyboardType: TextInputType.number,
                        maxLength: 4,
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                    ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
                  ],
                ),
              );
              if (added == true) {
                setModalState(() {
                  methods.add({
                    'brand': brandController.text.trim().isEmpty ? 'Card' : brandController.text.trim(),
                    'last4': last4Controller.text.trim(),
                    'isDefault': methods.isEmpty,
                  });
                });
                await saveMethods();
              }
            }

            return Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (int i = 0; i < methods.length; i++)
                    ListTile(
                      leading: const Icon(Icons.credit_card),
                      title: Text('${methods[i]['brand'] ?? 'Card'} •••• ${methods[i]['last4'] ?? ''}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (methods[i]['isDefault'] == true)
                            const Chip(label: Text('Default'))
                          else
                            TextButton(
                              onPressed: () {
                                setModalState(() {
                                  for (int j = 0; j < methods.length; j++) {
                                    methods[j]['isDefault'] = j == i;
                                  }
                                });
                                saveMethods();
                              },
                              child: const Text('Make default'),
                            ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: AppColors.error),
                            onPressed: () {
                              setModalState(() => methods.removeAt(i));
                              saveMethods();
                            },
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: addMethod,
                      icon: const Icon(Icons.add),
                      label: const Text('Add payment method'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openSavedPlaces(BuildContext context) async {
    final prefs = await _prefs();
    List<String> places;
    try {
      places = (jsonDecode(prefs.getString('pref_saved_places') ?? '[]') as List<dynamic>).cast<String>();
    } catch (_) {
      places = [];
    }

    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            Future<void> savePlaces() async {
              await prefs.setString('pref_saved_places', jsonEncode(places));
            }

            Future<void> addPlace() async {
              final placeController = TextEditingController();
              final added = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Add place'),
                  content: TextField(
                    controller: placeController,
                    decoration: const InputDecoration(hintText: 'Home, Work, etc.'),
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                    ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
                  ],
                ),
              );
              if (added == true && placeController.text.trim().isNotEmpty) {
                setModalState(() => places.add(placeController.text.trim()));
                await savePlaces();
              }
            }

            return Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (places.isEmpty)
                    const ListTile(
                      leading: Icon(Icons.location_off_outlined),
                      title: Text('No saved places yet'),
                      subtitle: Text('Add home or work for quick selection'),
                    )
                  else
                    ...places.map((place) => ListTile(
                          leading: const Icon(Icons.place_outlined),
                          title: Text(place),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline, color: AppColors.error),
                            onPressed: () {
                              setModalState(() => places.remove(place));
                              savePlaces();
                            },
                          ),
                        )),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: addPlace,
                      icon: const Icon(Icons.add_location_alt_outlined),
                      label: const Text('Add place'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openNotificationPreferences(BuildContext context) async {
    await _openSettings(context);
  }

  Future<void> _openHelpOptions(BuildContext context) async {
    const supportNumber = '+18001234567';
    const supportEmail = 'support@raahi.app';

    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.call),
              title: const Text('Call support'),
              subtitle: Text(supportNumber),
              onTap: () => _launchUri(Uri(scheme: 'tel', path: supportNumber), context),
            ),
            ListTile(
              leading: const Icon(Icons.email_outlined),
              title: const Text('Email support'),
              subtitle: Text(supportEmail),
              onTap: () => _launchUri(Uri(
                scheme: 'mailto',
                path: supportEmail,
                query: 'subject=Support request',
              ), context),
            ),
            ListTile(
              leading: const Icon(Icons.chat_bubble_outline),
              title: const Text('Message support'),
              subtitle: const Text('We will reply shortly'),
              onTap: () => _launchUri(Uri(scheme: 'sms', path: supportNumber), context),
            ),
          ],
        );
      },
    );
  }

  Future<void> _launchUri(Uri uri, BuildContext context) async {
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot open link'), backgroundColor: AppColors.error),
      );
    }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.inputBackground,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.inputBackground,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppColors.textPrimary, size: 22),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
      onTap: onTap,
    );
  }
}






