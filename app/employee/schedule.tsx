
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { IconSymbol } from '@/components/IconSymbol';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shift, User } from '@/types';

export default function EmployeeScheduleScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const shiftsData = await AsyncStorage.getItem('shifts');

      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (shiftsData) {
          const allShifts = JSON.parse(shiftsData);
          // Filter shifts for current employee (in real app, would use actual employee ID)
          const employeeShifts = allShifts.filter((shift: Shift) => 
            shift.employeeName === parsedUser.name || shift.employeeId === parsedUser.id
          );
          setShifts(employeeShifts);
        }
      }
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    shifts.forEach(shift => {
      marked[shift.date] = {
        marked: true,
        dotColor: getStatusColor(shift.status),
        selectedColor: colors.accent
      };
    });
    
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.accent
      };
    }
    
    return marked;
  };

  const getShiftsForDate = (date: string) => {
    return shifts.filter(shift => shift.date === date);
  };

  const getUpcomingShifts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return shifts
      .filter(shift => new Date(shift.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5); // Show next 5 shifts
  };

  const getTotalHoursThisWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    return shifts
      .filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= startOfWeek && shiftDate <= endOfWeek && shift.status === 'completed';
      })
      .reduce((total, shift) => {
        const start = new Date(`2000-01-01 ${shift.startTime}`);
        const end = new Date(`2000-01-01 ${shift.endTime}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Schedule',
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
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="clock" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{getTotalHoursThisWeek().toFixed(1)}</Text>
            <Text style={styles.statLabel}>Hours This Week</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="calendar" size={24} color={colors.accent} />
            <Text style={styles.statNumber}>{getUpcomingShifts().length}</Text>
            <Text style={styles.statLabel}>Upcoming Shifts</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Schedule Calendar</Text>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={getMarkedDates()}
            theme={{
              selectedDayBackgroundColor: colors.accent,
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
            }}
          />
          
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Scheduled</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendText}>In Progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Selected Date Shifts */}
        {selectedDate && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>
              Shifts for {new Date(selectedDate).toLocaleDateString()}
            </Text>
            {getShiftsForDate(selectedDate).length === 0 ? (
              <Text style={commonStyles.textLight}>No shifts scheduled for this date</Text>
            ) : (
              getShiftsForDate(selectedDate).map(shift => (
                <View key={shift.id} style={styles.shiftItem}>
                  <View style={styles.shiftTimeContainer}>
                    <Text style={styles.shiftTime}>{shift.startTime}</Text>
                    <Text style={styles.shiftTimeSeparator}>-</Text>
                    <Text style={styles.shiftTime}>{shift.endTime}</Text>
                  </View>
                  <View style={styles.shiftDetails}>
                    <Text style={styles.shiftLocation}>{shift.locationName}</Text>
                    {shift.notes && (
                      <Text style={styles.shiftNotes}>{shift.notes}</Text>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status) }]}>
                      <Text style={styles.statusText}>{shift.status.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Upcoming Shifts */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
          {getUpcomingShifts().length === 0 ? (
            <Text style={commonStyles.textLight}>No upcoming shifts scheduled</Text>
          ) : (
            getUpcomingShifts().map(shift => (
              <View key={shift.id} style={styles.upcomingShiftItem}>
                <View style={styles.upcomingShiftDate}>
                  <Text style={styles.upcomingShiftDay}>
                    {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.upcomingShiftDateNumber}>
                    {new Date(shift.date).getDate()}
                  </Text>
                </View>
                <View style={styles.upcomingShiftDetails}>
                  <Text style={styles.upcomingShiftLocation}>{shift.locationName}</Text>
                  <Text style={styles.upcomingShiftTime}>
                    {shift.startTime} - {shift.endTime}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status) }]}>
                    <Text style={styles.statusText}>{shift.status.toUpperCase()}</Text>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
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
            <Text style={styles.actionButtonText}>Check In to Shift</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
          </Pressable>
          
          <Pressable 
            style={styles.actionButton} 
            onPress={() => router.push('/employee/history')}
          >
            <IconSymbol name="clock.arrow.circlepath" size={24} color={colors.accent} />
            <Text style={styles.actionButtonText}>View Work History</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textLight} />
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return colors.success;
    case 'in-progress': return colors.warning;
    case 'missed': return colors.danger;
    default: return colors.primary;
  }
};

const styles = {
  statsContainer: {
    flexDirection: 'row' as const,
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 24,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textLight,
  },
  shiftItem: {
    flexDirection: 'row' as const,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shiftTimeContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  shiftTimeSeparator: {
    fontSize: 16,
    color: colors.textLight,
    marginHorizontal: 8,
  },
  shiftDetails: {
    flex: 1,
  },
  shiftLocation: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 4,
  },
  shiftNotes: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start' as const,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.white,
  },
  upcomingShiftItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  upcomingShiftDate: {
    alignItems: 'center' as const,
    marginRight: 16,
    minWidth: 50,
  },
  upcomingShiftDay: {
    fontSize: 12,
    color: colors.textLight,
    textTransform: 'uppercase' as const,
  },
  upcomingShiftDateNumber: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.text,
  },
  upcomingShiftDetails: {
    flex: 1,
  },
  upcomingShiftLocation: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 4,
  },
  upcomingShiftTime: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
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
