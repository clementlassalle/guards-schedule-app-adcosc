
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/button';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Shift, CheckIn, User } from '@/types';

export default function EmployeeCheckInScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [activeCheckIn, setActiveCheckIn] = useState<CheckIn | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        await findCurrentShift(parsedUser);
        await checkActiveCheckIn(parsedUser);
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    getCurrentLocation();
  }, [loadUserData]);

  const findCurrentShift = async (user: User) => {
    try {
      const shiftsData = await AsyncStorage.getItem('shifts');
      if (shiftsData) {
        const shifts: Shift[] = JSON.parse(shiftsData);
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().slice(0, 5);
        
        // Find shift for today that user can check into
        const todayShift = shifts.find(shift => 
          shift.date === today && 
          (shift.employeeId === user.id || shift.employeeName === user.name) &&
          shift.status !== 'completed'
        );
        
        setCurrentShift(todayShift || null);
      }
    } catch (error) {
      console.log('Error finding current shift:', error);
    }
  };

  const checkActiveCheckIn = async (user: User) => {
    try {
      const checkInsData = await AsyncStorage.getItem('checkIns');
      if (checkInsData) {
        const checkIns: CheckIn[] = JSON.parse(checkInsData);
        const activeCheckIn = checkIns.find(checkIn => 
          checkIn.employeeId === user.id && !checkIn.checkOutTime
        );
        setActiveCheckIn(activeCheckIn || null);
      }
    } catch (error) {
      console.log('Error checking active check-in:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationError('');
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied. Please enable location services to check in.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(currentLocation);

      // Get address from coordinates
      const address = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      console.log('Current location:', currentLocation.coords);
      console.log('Address:', address[0]);
    } catch (error) {
      console.log('Error getting location:', error);
      setLocationError('Failed to get current location. Please try again.');
    }
  };

  const handleCheckIn = async () => {
    if (!currentShift) {
      Alert.alert('No Shift Found', 'You don\'t have a scheduled shift for today.');
      return;
    }

    if (!location) {
      Alert.alert('Location Required', 'Please allow location access to check in.');
      return;
    }

    setIsLoading(true);

    try {
      const checkIn: CheckIn = {
        id: Date.now().toString(),
        shiftId: currentShift.id,
        employeeId: user!.id,
        employeeName: user!.name,
        locationId: currentShift.locationId,
        locationName: currentShift.locationName,
        checkInTime: new Date(),
        actualLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        notes: notes.trim() || undefined,
      };

      // Get address for the location
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (address[0]) {
          checkIn.actualLocation!.address = `${address[0].street || ''} ${address[0].city || ''} ${address[0].region || ''}`.trim();
        }
      } catch (error) {
        console.log('Error getting address:', error);
      }

      // Save check-in
      const existingCheckIns = await AsyncStorage.getItem('checkIns');
      const checkIns: CheckIn[] = existingCheckIns ? JSON.parse(existingCheckIns) : [];
      checkIns.push(checkIn);
      await AsyncStorage.setItem('checkIns', JSON.stringify(checkIns));

      // Update shift status
      const shiftsData = await AsyncStorage.getItem('shifts');
      if (shiftsData) {
        const shifts: Shift[] = JSON.parse(shiftsData);
        const updatedShifts = shifts.map(shift => 
          shift.id === currentShift.id 
            ? { ...shift, status: 'in-progress' as const }
            : shift
        );
        await AsyncStorage.setItem('shifts', JSON.stringify(updatedShifts));
      }

      setActiveCheckIn(checkIn);
      setNotes('');
      
      Alert.alert(
        'Check-In Successful',
        `You have successfully checked in to ${currentShift.locationName} at ${new Date().toLocaleTimeString()}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.log('Error during check-in:', error);
      Alert.alert('Error', 'Failed to check in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeCheckIn) {
      Alert.alert('Error', 'No active check-in found.');
      return;
    }

    setIsLoading(true);

    try {
      // Update check-in with check-out time
      const checkInsData = await AsyncStorage.getItem('checkIns');
      if (checkInsData) {
        const checkIns: CheckIn[] = JSON.parse(checkInsData);
        const updatedCheckIns = checkIns.map(checkIn => 
          checkIn.id === activeCheckIn.id 
            ? { ...checkIn, checkOutTime: new Date() }
            : checkIn
        );
        await AsyncStorage.setItem('checkIns', JSON.stringify(updatedCheckIns));
      }

      // Update shift status to completed
      const shiftsData = await AsyncStorage.getItem('shifts');
      if (shiftsData) {
        const shifts: Shift[] = JSON.parse(shiftsData);
        const updatedShifts = shifts.map(shift => 
          shift.id === activeCheckIn.shiftId 
            ? { ...shift, status: 'completed' as const }
            : shift
        );
        await AsyncStorage.setItem('shifts', JSON.stringify(updatedShifts));
      }

      setActiveCheckIn(null);
      setCurrentShift(null);
      
      Alert.alert(
        'Check-Out Successful',
        `You have successfully checked out at ${new Date().toLocaleTimeString()}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.log('Error during check-out:', error);
      Alert.alert('Error', 'Failed to check out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Check In/Out',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <IconSymbol name="chevron.left" size={24} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      
      <ScrollView style={commonStyles.container}>
        {/* Current Status */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          {activeCheckIn ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.success }]} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusText}>Checked In</Text>
                <Text style={styles.statusDetails}>
                  {activeCheckIn.locationName}
                </Text>
                <Text style={styles.statusTime}>
                  Since {new Date(activeCheckIn.checkInTime).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.textLight }]} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusText}>Not Checked In</Text>
                <Text style={styles.statusDetails}>Ready to check in to your shift</Text>
              </View>
            </View>
          )}
        </View>

        {/* Current Shift Info */}
        {currentShift && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>Today's Shift</Text>
            <View style={styles.shiftInfo}>
              <View style={styles.shiftDetail}>
                <IconSymbol name="location" size={20} color={colors.primary} />
                <Text style={styles.shiftDetailText}>{currentShift.locationName}</Text>
              </View>
              <View style={styles.shiftDetail}>
                <IconSymbol name="clock" size={20} color={colors.primary} />
                <Text style={styles.shiftDetailText}>
                  {currentShift.startTime} - {currentShift.endTime}
                </Text>
              </View>
              <View style={styles.shiftDetail}>
                <IconSymbol name="calendar" size={20} color={colors.primary} />
                <Text style={styles.shiftDetailText}>
                  {new Date(currentShift.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Location Info */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          {locationError ? (
            <View style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle" size={24} color={colors.danger} />
              <Text style={styles.errorText}>{locationError}</Text>
              <Button variant="outline" size="sm" onPress={getCurrentLocation}>
                Retry Location
              </Button>
            </View>
          ) : location ? (
            <View style={styles.locationInfo}>
              <View style={styles.locationDetail}>
                <IconSymbol name="location.fill" size={20} color={colors.success} />
                <Text style={styles.locationText}>Location Acquired</Text>
              </View>
              <Text style={styles.locationCoords}>
                Lat: {location.coords.latitude.toFixed(6)}, 
                Lng: {location.coords.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationAccuracy}>
                Accuracy: ±{location.coords.accuracy?.toFixed(0)}m
              </Text>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <IconSymbol name="location" size={24} color={colors.textLight} />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          )}
        </View>

        {/* Notes Section */}
        {!activeCheckIn && currentShift && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>Check-In Notes (Optional)</Text>
            <TextInput
              style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about your check-in..."
              multiline
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {activeCheckIn ? (
            <Button
              variant="danger"
              onPress={handleCheckOut}
              loading={isLoading}
              disabled={isLoading}
            >
              Check Out
            </Button>
          ) : currentShift ? (
            <Button
              variant="primary"
              onPress={handleCheckIn}
              loading={isLoading}
              disabled={isLoading || !location}
            >
              Check In to Shift
            </Button>
          ) : (
            <View style={styles.noShiftContainer}>
              <IconSymbol name="calendar.badge.exclamationmark" size={48} color={colors.textLight} />
              <Text style={styles.noShiftText}>No shift scheduled for today</Text>
              <Text style={styles.noShiftSubtext}>
                Check your schedule or contact your supervisor
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.instructionItem}>
            <IconSymbol name="1.circle" size={20} color={colors.primary} />
            <Text style={styles.instructionText}>
              Ensure you're at your assigned location before checking in
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <IconSymbol name="2.circle" size={20} color={colors.primary} />
            <Text style={styles.instructionText}>
              Your location will be recorded for security purposes
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <IconSymbol name="3.circle" size={20} color={colors.primary} />
            <Text style={styles.instructionText}>
              Remember to check out when your shift ends
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = {
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  statusDetails: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 12,
    color: colors.textLight,
  },
  shiftInfo: {
    gap: 12,
  },
  shiftDetail: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  shiftDetailText: {
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    alignItems: 'center' as const,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center' as const,
  },
  locationInfo: {
    gap: 8,
  },
  locationDetail: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.success,
  },
  locationCoords: {
    fontSize: 14,
    color: colors.textLight,
    fontFamily: 'monospace' as const,
  },
  locationAccuracy: {
    fontSize: 12,
    color: colors.textLight,
  },
  loadingContainer: {
    alignItems: 'center' as const,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textLight,
  },
  actionContainer: {
    padding: 16,
  },
  noShiftContainer: {
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 32,
  },
  noShiftText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textLight,
    textAlign: 'center' as const,
  },
  noShiftSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center' as const,
  },
  instructionItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    marginBottom: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
};
