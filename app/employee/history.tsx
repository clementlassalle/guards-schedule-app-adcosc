
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckIn, User, Shift } from '@/types';

export default function EmployeeHistoryScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const checkInsData = await AsyncStorage.getItem('checkIns');
      const shiftsData = await AsyncStorage.getItem('shifts');

      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (checkInsData) {
          const allCheckIns: CheckIn[] = JSON.parse(checkInsData);
          const userCheckIns = allCheckIns.filter(checkIn => 
            checkIn.employeeId === parsedUser.id
          );
          setCheckIns(userCheckIns);
        }

        if (shiftsData) {
          const allShifts: Shift[] = JSON.parse(shiftsData);
          const userShifts = allShifts.filter(shift => 
            shift.employeeId === parsedUser.id || shift.employeeName === parsedUser.name
          );
          setShifts(userShifts);
        }
      }
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const getFilteredCheckIns = () => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return checkIns.sort((a, b) => 
          new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
        );
    }

    return checkIns
      .filter(checkIn => new Date(checkIn.checkInTime) >= startDate)
      .sort((a, b) => 
        new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
      );
  };

  const calculateTotalHours = () => {
    const filteredCheckIns = getFilteredCheckIns();
    return filteredCheckIns.reduce((total, checkIn) => {
      if (checkIn.checkOutTime) {
        const checkInTime = new Date(checkIn.checkInTime);
        const checkOutTime = new Date(checkIn.checkOutTime);
        const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);
  };

  const calculateHoursWorked = (checkIn: CheckIn) => {
    if (!checkIn.checkOutTime) return 0;
    const checkInTime = new Date(checkIn.checkInTime);
    const checkOutTime = new Date(checkIn.checkOutTime);
    return (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
  };

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getLocationStats = () => {
    const filteredCheckIns = getFilteredCheckIns();
    const locationStats: { [key: string]: { hours: number, count: number } } = {};

    filteredCheckIns.forEach(checkIn => {
      if (checkIn.checkOutTime) {
        const hours = calculateHoursWorked(checkIn);
        if (!locationStats[checkIn.locationName]) {
          locationStats[checkIn.locationName] = { hours: 0, count: 0 };
        }
        locationStats[checkIn.locationName].hours += hours;
        locationStats[checkIn.locationName].count += 1;
      }
    });

    return Object.entries(locationStats)
      .sort(([,a], [,b]) => b.hours - a.hours)
      .slice(0, 5);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Work History',
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
        {/* Period Filter */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.filterContainer}>
            {[
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'all', label: 'All Time' }
            ].map(period => (
              <Pressable
                key={period.key}
                style={[
                  styles.filterButton,
                  selectedPeriod === period.key && styles.filterButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedPeriod === period.key && styles.filterButtonTextActive
                ]}>
                  {period.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="clock" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{formatDuration(calculateTotalHours())}</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="checkmark.circle" size={24} color={colors.success} />
            <Text style={styles.statNumber}>{getFilteredCheckIns().length}</Text>
            <Text style={styles.statLabel}>Check-Ins</Text>
          </View>
        </View>

        {/* Location Breakdown */}
        {getLocationStats().length > 0 && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>Hours by Location</Text>
            {getLocationStats().map(([location, stats]) => (
              <View key={location} style={styles.locationStatItem}>
                <View style={styles.locationStatInfo}>
                  <Text style={styles.locationStatName}>{location}</Text>
                  <Text style={styles.locationStatDetails}>
                    {stats.count} shift{stats.count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.locationStatHours}>
                  {formatDuration(stats.hours)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Check-In History */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Recent Check-Ins</Text>
          {getFilteredCheckIns().length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="clock.badge.exclamationmark" size={48} color={colors.textLight} />
              <Text style={styles.emptyStateText}>No check-ins found</Text>
              <Text style={styles.emptyStateSubtext}>
                Your work history will appear here after you check in to shifts
              </Text>
            </View>
          ) : (
            getFilteredCheckIns().map(checkIn => (
              <View key={checkIn.id} style={styles.checkInItem}>
                <View style={styles.checkInHeader}>
                  <View style={styles.checkInInfo}>
                    <Text style={styles.checkInLocation}>{checkIn.locationName}</Text>
                    <Text style={styles.checkInDate}>
                      {new Date(checkIn.checkInTime).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.checkInStatus}>
                    {checkIn.checkOutTime ? (
                      <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.statusText}>COMPLETED</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: colors.warning }]}>
                        <Text style={styles.statusText}>IN PROGRESS</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.checkInDetails}>
                  <View style={styles.timeDetail}>
                    <IconSymbol name="clock" size={16} color={colors.textLight} />
                    <Text style={styles.timeText}>
                      Check-in: {new Date(checkIn.checkInTime).toLocaleTimeString()}
                    </Text>
                  </View>
                  
                  {checkIn.checkOutTime && (
                    <View style={styles.timeDetail}>
                      <IconSymbol name="clock" size={16} color={colors.textLight} />
                      <Text style={styles.timeText}>
                        Check-out: {new Date(checkIn.checkOutTime).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}

                  {checkIn.checkOutTime && (
                    <View style={styles.timeDetail}>
                      <IconSymbol name="timer" size={16} color={colors.primary} />
                      <Text style={[styles.timeText, { fontWeight: '600', color: colors.primary }]}>
                        Duration: {formatDuration(calculateHoursWorked(checkIn))}
                      </Text>
                    </View>
                  )}

                  {checkIn.actualLocation?.address && (
                    <View style={styles.timeDetail}>
                      <IconSymbol name="location" size={16} color={colors.textLight} />
                      <Text style={styles.timeText} numberOfLines={2}>
                        {checkIn.actualLocation.address}
                      </Text>
                    </View>
                  )}

                  {checkIn.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{checkIn.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Pressable 
            style={styles.actionButton} 
            onPress={() => router.push('/employee/checkin')}
          >
            <IconSymbol name="location.circle" size={24} color={colors.success} />
            <Text style={styles.actionButtonText}>Check In to Current Shift</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
          </Pressable>
          
          <Pressable 
            style={styles.actionButton} 
            onPress={() => router.push('/employee/schedule')}
          >
            <IconSymbol name="calendar" size={24} color={colors.primary} />
            <Text style={styles.actionButtonText}>View My Schedule</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
          </Pressable>
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
  filterContainer: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
    fontWeight: '600' as const,
  },
  statsContainer: {
    flexDirection: 'row' as const,
    gap: 16,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  locationStatItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationStatInfo: {
    flex: 1,
  },
  locationStatName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 2,
  },
  locationStatDetails: {
    fontSize: 14,
    color: colors.textLight,
  },
  locationStatHours: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textLight,
    textAlign: 'center' as const,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  checkInItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkInHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  checkInInfo: {
    flex: 1,
  },
  checkInLocation: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  checkInDate: {
    fontSize: 14,
    color: colors.textLight,
  },
  checkInStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.white,
  },
  checkInDetails: {
    gap: 8,
  },
  timeDetail: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textLight,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 16,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
};
