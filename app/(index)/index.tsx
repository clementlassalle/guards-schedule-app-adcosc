
import React, { useState, useEffect } from "react";
import { Stack, router } from "expo-router";
import { View, Text, ScrollView, Pressable, Image, Alert } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { Button } from "@/components/button";
import { commonStyles, colors } from "@/styles/commonStyles";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  email: string;
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.log('Error checking user session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (role: 'admin' | 'employee') => {
    const userData: User = {
      id: Date.now().toString(),
      name: role === 'admin' ? 'Admin User' : 'Employee User',
      role,
      email: role === 'admin' ? 'admin@erosecurity.com' : 'employee@erosecurity.com'
    };
    
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.log('Error saving user data:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  const navigateToFeature = (route: string) => {
    router.push(route as any);
  };

  if (isLoading) {
    return (
      <View style={commonStyles.centerContent}>
        <Text style={commonStyles.text}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "ERO Security",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.white,
          }}
        />
        <ScrollView style={commonStyles.container}>
          {/* Company Header */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <IconSymbol name="shield.checkered" size={60} color={colors.white} />
            </View>
            <Text style={styles.companyName}>ERO Security</Text>
            <Text style={styles.companySubtitle}>Executive Response International</Text>
            <Text style={styles.tagline}>Professional Security Services</Text>
          </View>

          {/* Login Options */}
          <View style={styles.loginSection}>
            <Text style={styles.sectionTitle}>Access Portal</Text>
            
            <View style={commonStyles.card}>
              <View style={styles.loginOption}>
                <IconSymbol name="person.badge.key" size={32} color={colors.primary} />
                <View style={styles.loginContent}>
                  <Text style={styles.loginTitle}>Administrator</Text>
                  <Text style={styles.loginDescription}>Manage shifts, employees, and schedules</Text>
                </View>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => handleLogin('admin')}
                >
                  Login
                </Button>
              </View>
            </View>

            <View style={commonStyles.card}>
              <View style={styles.loginOption}>
                <IconSymbol name="person.circle" size={32} color={colors.accent} />
                <View style={styles.loginContent}>
                  <Text style={styles.loginTitle}>Employee</Text>
                  <Text style={styles.loginDescription}>View schedule and check-in to shifts</Text>
                </View>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => handleLogin('employee')}
                >
                  Login
                </Button>
              </View>
            </View>
          </View>

          {/* Company Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>About ERO Security</Text>
            <View style={commonStyles.card}>
              <Text style={commonStyles.text}>
                ERO Security provides comprehensive security solutions with highly trained professionals. 
                Our team ensures safety and protection across various locations and events.
              </Text>
            </View>
          </View>
        </ScrollView>
      </>
    );
  }

  // User is logged in - show dashboard
  return (
    <>
      <Stack.Screen
        options={{
          title: `Welcome, ${user.name}`,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={commonStyles.container}>
        {/* Dashboard Header */}
        <View style={styles.dashboardHeader}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.roleText}>{user.role === 'admin' ? 'Administrator' : 'Employee'}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {user.role === 'admin' ? (
            <>
              <Pressable style={commonStyles.card} onPress={() => navigateToFeature('/admin/shifts')}>
                <View style={styles.actionItem}>
                  <IconSymbol name="calendar.badge.plus" size={32} color={colors.primary} />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Manage Shifts</Text>
                    <Text style={styles.actionDescription}>Create and assign employee shifts</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                </View>
              </Pressable>

              <Pressable style={commonStyles.card} onPress={() => navigateToFeature('/admin/employees')}>
                <View style={styles.actionItem}>
                  <IconSymbol name="person.3" size={32} color={colors.accent} />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Employee Management</Text>
                    <Text style={styles.actionDescription}>View and manage employee records</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                </View>
              </Pressable>

              <Pressable style={commonStyles.card} onPress={() => navigateToFeature('/admin/reports')}>
                <View style={styles.actionItem}>
                  <IconSymbol name="chart.bar" size={32} color={colors.success} />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Time Reports</Text>
                    <Text style={styles.actionDescription}>View comprehensive timetables</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                </View>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={commonStyles.card} onPress={() => navigateToFeature('/employee/schedule')}>
                <View style={styles.actionItem}>
                  <IconSymbol name="calendar" size={32} color={colors.primary} />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>My Schedule</Text>
                    <Text style={styles.actionDescription}>View your assigned shifts</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                </View>
              </Pressable>

              <Pressable style={commonStyles.card} onPress={() => navigateToFeature('/employee/checkin')}>
                <View style={styles.actionItem}>
                  <IconSymbol name="location.circle" size={32} color={colors.success} />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Check In</Text>
                    <Text style={styles.actionDescription}>Check in to your current shift</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                </View>
              </Pressable>

              <Pressable style={commonStyles.card} onPress={() => navigateToFeature('/employee/history')}>
                <View style={styles.actionItem}>
                  <IconSymbol name="clock" size={32} color={colors.accent} />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Work History</Text>
                    <Text style={styles.actionDescription}>View your work hours and history</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                </View>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = {
  heroSection: {
    backgroundColor: colors.primary,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: colors.white,
    marginBottom: 4,
  },
  companySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
  },
  loginSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 16,
  },
  loginOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  loginContent: {
    flex: 1,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  loginDescription: {
    fontSize: 14,
    color: colors.textLight,
  },
  infoSection: {
    padding: 20,
    paddingTop: 0,
  },
  dashboardHeader: {
    backgroundColor: colors.backgroundLight,
    padding: 20,
    alignItems: 'center' as const,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.text,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: colors.textLight,
  },
  actionsSection: {
    padding: 20,
  },
  actionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: colors.textLight,
  },
  logoutButton: {
    padding: 8,
  },
};
