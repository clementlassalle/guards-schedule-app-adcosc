
import React, { useState, useEffect } from "react";
import { Stack, router } from "expo-router";
import { View, Text, ScrollView, Pressable, Image, Alert, TextInput, Modal, ImageBackground } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { Button } from "@/components/button";
import { commonStyles, colors } from "@/styles/commonStyles";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  email: string;
  pin?: string;
}

interface EmployeeData {
  id: string;
  name: string;
  pin: string;
  email: string;
  position: string;
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'employee'>('employee');
  const [pinInput, setPinInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [employees, setEmployees] = useState<EmployeeData[]>([]);

  useEffect(() => {
    checkUserSession();
    initializeEmployees();
  }, []);

  const initializeEmployees = async () => {
    try {
      const storedEmployees = await AsyncStorage.getItem('employees');
      if (!storedEmployees) {
        // Initialize with sample employees
        const sampleEmployees: EmployeeData[] = [
          {
            id: '1',
            name: 'John Smith',
            pin: '12345',
            email: 'john.smith@erosecurity.com',
            position: 'Security Guard'
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            pin: '67890',
            email: 'sarah.johnson@erosecurity.com',
            position: 'Security Supervisor'
          },
          {
            id: '3',
            name: 'Mike Wilson',
            pin: '11111',
            email: 'mike.wilson@erosecurity.com',
            position: 'Security Guard'
          },
          {
            id: '4',
            name: 'Lisa Brown',
            pin: '22222',
            email: 'lisa.brown@erosecurity.com',
            position: 'Security Guard'
          },
          {
            id: '5',
            name: 'David Lee',
            pin: '33333',
            email: 'david.lee@erosecurity.com',
            position: 'Security Guard'
          }
        ];
        await AsyncStorage.setItem('employees', JSON.stringify(sampleEmployees));
        setEmployees(sampleEmployees);
      } else {
        const parsedEmployees = JSON.parse(storedEmployees);
        // Ensure all employees have PINs
        const employeesWithPins = parsedEmployees.map((emp: any) => ({
          ...emp,
          pin: emp.pin || Math.floor(10000 + Math.random() * 90000).toString()
        }));
        setEmployees(employeesWithPins);
        
        // Update storage if PINs were added
        if (employeesWithPins.some((emp: any, index: number) => emp.pin !== parsedEmployees[index]?.pin)) {
          await AsyncStorage.setItem('employees', JSON.stringify(employeesWithPins));
        }
      }
    } catch (error) {
      console.log('Error initializing employees:', error);
    }
  };

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

  const handleLoginPress = (type: 'admin' | 'employee') => {
    setLoginType(type);
    setShowLoginModal(true);
    setPinInput('');
    setPasswordInput('');
  };

  const handlePinInput = (digit: string) => {
    if (pinInput.length < 5) {
      setPinInput(prev => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    try {
      if (loginType === 'admin') {
        // Admin password validation
        if (passwordInput === 'ClementLassalle') {
          const userData: User = {
            id: 'admin',
            name: 'Administrator',
            role: 'admin',
            email: 'admin@erosecurity.com'
          };
          
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          setShowLoginModal(false);
          setPasswordInput('');
        } else {
          Alert.alert('Invalid Password', 'Please enter the correct administrator password.');
        }
      } else {
        // Employee PIN validation
        if (pinInput.length === 5) {
          const employee = employees.find(emp => emp.pin === pinInput);
          if (employee) {
            const userData: User = {
              id: employee.id,
              name: employee.name,
              role: 'employee',
              email: employee.email,
              pin: employee.pin
            };
            
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            setShowLoginModal(false);
            setPinInput('');
          } else {
            Alert.alert('Invalid PIN', 'Please enter a valid 5-digit PIN.');
            setPinInput('');
          }
        } else {
          Alert.alert('Incomplete PIN', 'Please enter a complete 5-digit PIN.');
        }
      }
    } catch (error) {
      console.log('Error during login:', error);
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
      <ImageBackground 
        source={require('@/assets/images/ad8f4d37-cf1e-4dfd-b9a4-99f02abb353f.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.loadingOverlay}>
          <View style={commonStyles.centerContent}>
            <Text style={[commonStyles.text, { color: colors.white }]}>Loading...</Text>
          </View>
        </View>
      </ImageBackground>
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
        <ImageBackground 
          source={require('@/assets/images/ad8f4d37-cf1e-4dfd-b9a4-99f02abb353f.png')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {/* Company Header */}
            <View style={styles.heroSection}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('@/assets/images/d7d222f6-ee66-421b-911e-767afa9b930e.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.companyName}>ERO Security</Text>
              <Text style={styles.companySubtitle}>Executive Response International</Text>
              <Text style={styles.tagline}>Professional Security Services</Text>
            </View>

            {/* Login Options */}
            <View style={styles.loginSection}>
              <Text style={styles.sectionTitle}>Access Portal</Text>
              
              <View style={styles.cardWithBackground}>
                <View style={styles.loginOption}>
                  <IconSymbol name="person.badge.key" size={32} color={colors.primary} />
                  <View style={styles.loginContent}>
                    <Text style={styles.loginTitle}>Administrator</Text>
                    <Text style={styles.loginDescription}>Manage shifts, employees, and schedules</Text>
                  </View>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => handleLoginPress('admin')}
                  >
                    Login
                  </Button>
                </View>
              </View>

              <View style={styles.cardWithBackground}>
                <View style={styles.loginOption}>
                  <IconSymbol name="person.circle" size={32} color={colors.accent} />
                  <View style={styles.loginContent}>
                    <Text style={styles.loginTitle}>Employee</Text>
                    <Text style={styles.loginDescription}>View schedule and check-in to shifts</Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => handleLoginPress('employee')}
                  >
                    Login
                  </Button>
                </View>
              </View>
            </View>

            {/* Company Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>About ERO Security</Text>
              <View style={styles.cardWithBackground}>
                <Text style={styles.infoText}>
                  ERO Security provides comprehensive security solutions with highly trained professionals. 
                  Our team ensures safety and protection across various locations and events.
                </Text>
              </View>
            </View>
          </ScrollView>
        </ImageBackground>

        {/* Login Modal */}
        <Modal
          visible={showLoginModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLoginModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {loginType === 'admin' ? 'Administrator Login' : 'Employee Login'}
                </Text>
                <Pressable onPress={() => setShowLoginModal(false)} style={styles.closeButton}>
                  <IconSymbol name="xmark" size={24} color={colors.textLight} />
                </Pressable>
              </View>

              {loginType === 'admin' ? (
                <View style={styles.passwordSection}>
                  <Text style={styles.inputLabel}>Administrator Password</Text>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    placeholder="Enter administrator password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                  <Button
                    variant="primary"
                    onPress={handleLogin}
                    disabled={passwordInput.length === 0}
                    style={styles.loginButton}
                  >
                    Login as Administrator
                  </Button>
                </View>
              ) : (
                <View style={styles.pinSection}>
                  <Text style={styles.inputLabel}>Enter Your 5-Digit PIN</Text>
                  
                  <View style={styles.pinDisplay}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <View key={index} style={styles.pinDigit}>
                        <Text style={styles.pinDigitText}>
                          {pinInput[index] ? '●' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.keypad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <Pressable
                        key={digit}
                        style={styles.keypadButton}
                        onPress={() => handlePinInput(digit.toString())}
                      >
                        <Text style={styles.keypadButtonText}>{digit}</Text>
                      </Pressable>
                    ))}
                    <View style={styles.keypadButton} />
                    <Pressable
                      style={styles.keypadButton}
                      onPress={() => handlePinInput('0')}
                    >
                      <Text style={styles.keypadButtonText}>0</Text>
                    </Pressable>
                    <Pressable
                      style={styles.keypadButton}
                      onPress={handlePinDelete}
                    >
                      <IconSymbol name="delete.left" size={24} color={colors.text} />
                    </Pressable>
                  </View>

                  <Button
                    variant="primary"
                    onPress={handleLogin}
                    disabled={pinInput.length !== 5}
                    style={styles.loginButton}
                  >
                    Login as Employee
                  </Button>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
      <ImageBackground 
        source={require('@/assets/images/ad8f4d37-cf1e-4dfd-b9a4-99f02abb353f.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Dashboard Header */}
          <View style={styles.dashboardHeader}>
            <Image 
              source={require('@/assets/images/d7d222f6-ee66-421b-911e-767afa9b930e.png')} 
              style={styles.dashboardLogo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.roleText}>{user.role === 'admin' ? 'Administrator' : 'Employee'}</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            {user.role === 'admin' ? (
              <>
                <Pressable style={styles.cardWithBackground} onPress={() => navigateToFeature('/admin/shifts')}>
                  <View style={styles.actionItem}>
                    <IconSymbol name="calendar.badge.plus" size={32} color={colors.primary} />
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>Manage Shifts</Text>
                      <Text style={styles.actionDescription}>Create and assign employee shifts</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                  </View>
                </Pressable>

                <Pressable style={styles.cardWithBackground} onPress={() => navigateToFeature('/admin/employees')}>
                  <View style={styles.actionItem}>
                    <IconSymbol name="person.3" size={32} color={colors.accent} />
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>Employee Management</Text>
                      <Text style={styles.actionDescription}>View and manage employee records</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                  </View>
                </Pressable>

                <Pressable style={styles.cardWithBackground} onPress={() => navigateToFeature('/admin/reports')}>
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
                <Pressable style={styles.cardWithBackground} onPress={() => navigateToFeature('/employee/schedule')}>
                  <View style={styles.actionItem}>
                    <IconSymbol name="calendar" size={32} color={colors.primary} />
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>My Schedule</Text>
                      <Text style={styles.actionDescription}>View your assigned shifts</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                  </View>
                </Pressable>

                <Pressable style={styles.cardWithBackground} onPress={() => navigateToFeature('/employee/checkin')}>
                  <View style={styles.actionItem}>
                    <IconSymbol name="location.circle" size={32} color={colors.success} />
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>Check In</Text>
                      <Text style={styles.actionDescription}>Check in to your current shift</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
                  </View>
                </Pressable>

                <Pressable style={styles.cardWithBackground} onPress={() => navigateToFeature('/employee/history')}>
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
      </ImageBackground>
    </>
  );
}

const styles = {
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    padding: 10,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  dashboardLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: colors.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  companySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  loginSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.white,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  cardWithBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  dashboardHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    alignItems: 'center' as const,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  roleText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  // Password input styles
  passwordSection: {
    alignItems: 'center' as const,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.white,
    marginBottom: 24,
  },
  // PIN input styles
  pinSection: {
    alignItems: 'center' as const,
  },
  pinDisplay: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 32,
  },
  pinDigit: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.backgroundLight,
  },
  pinDigitText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.text,
  },
  keypad: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: 12,
    marginBottom: 32,
    width: 240,
  },
  keypadButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.text,
  },
  loginButton: {
    width: '100%',
  },
};
