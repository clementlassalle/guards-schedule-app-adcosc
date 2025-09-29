
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/button';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shift, Employee, Location } from '@/types';

export default function AdminShiftsScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShift, setNewShift] = useState({
    employeeId: '',
    locationId: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    initializeSampleData();
  }, []);

  const loadData = async () => {
    try {
      const shiftsData = await AsyncStorage.getItem('shifts');
      const employeesData = await AsyncStorage.getItem('employees');
      const locationsData = await AsyncStorage.getItem('locations');

      if (shiftsData) setShifts(JSON.parse(shiftsData));
      if (employeesData) setEmployees(JSON.parse(employeesData));
      if (locationsData) setLocations(JSON.parse(locationsData));
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const initializeSampleData = async () => {
    try {
      const existingEmployees = await AsyncStorage.getItem('employees');
      const existingLocations = await AsyncStorage.getItem('locations');

      if (!existingEmployees) {
        const sampleEmployees: Employee[] = [
          {
            id: '1',
            name: 'John Smith',
            email: 'john@erosecurity.com',
            phone: '+1-555-0101',
            position: 'Security Officer',
            hireDate: new Date('2023-01-15'),
            isActive: true
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah@erosecurity.com',
            phone: '+1-555-0102',
            position: 'Senior Security Officer',
            hireDate: new Date('2022-08-20'),
            isActive: true
          },
          {
            id: '3',
            name: 'Mike Davis',
            email: 'mike@erosecurity.com',
            phone: '+1-555-0103',
            position: 'Security Supervisor',
            hireDate: new Date('2021-03-10'),
            isActive: true
          }
        ];
        await AsyncStorage.setItem('employees', JSON.stringify(sampleEmployees));
        setEmployees(sampleEmployees);
      }

      if (!existingLocations) {
        const sampleLocations: Location[] = [
          {
            id: '1',
            name: 'Downtown Office Complex',
            address: '123 Business Ave, Downtown',
            description: 'Main office building security'
          },
          {
            id: '2',
            name: 'Shopping Mall West',
            address: '456 Mall Dr, West Side',
            description: 'Shopping center patrol'
          },
          {
            id: '3',
            name: 'Corporate Event Center',
            address: '789 Event Blvd, City Center',
            description: 'Event security services'
          },
          {
            id: '4',
            name: 'Residential Complex',
            address: '321 Residential St, Suburbs',
            description: 'Residential area security'
          }
        ];
        await AsyncStorage.setItem('locations', JSON.stringify(sampleLocations));
        setLocations(sampleLocations);
      }
    } catch (error) {
      console.log('Error initializing sample data:', error);
    }
  };

  const saveShifts = async (updatedShifts: Shift[]) => {
    try {
      await AsyncStorage.setItem('shifts', JSON.stringify(updatedShifts));
      setShifts(updatedShifts);
    } catch (error) {
      console.log('Error saving shifts:', error);
    }
  };

  const addShift = async () => {
    if (!selectedDate || !newShift.employeeId || !newShift.locationId || !newShift.startTime || !newShift.endTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const employee = employees.find(e => e.id === newShift.employeeId);
    const location = locations.find(l => l.id === newShift.locationId);

    if (!employee || !location) {
      Alert.alert('Error', 'Invalid employee or location selected');
      return;
    }

    const shift: Shift = {
      id: Date.now().toString(),
      employeeId: newShift.employeeId,
      employeeName: employee.name,
      locationId: newShift.locationId,
      locationName: location.name,
      date: selectedDate,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      status: 'scheduled',
      notes: newShift.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedShifts = [...shifts, shift];
    await saveShifts(updatedShifts);
    
    setShowAddModal(false);
    setNewShift({
      employeeId: '',
      locationId: '',
      startTime: '',
      endTime: '',
      notes: ''
    });
    
    Alert.alert('Success', 'Shift added successfully');
  };

  const deleteShift = async (shiftId: string) => {
    Alert.alert(
      'Delete Shift',
      'Are you sure you want to delete this shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedShifts = shifts.filter(s => s.id !== shiftId);
            await saveShifts(updatedShifts);
          }
        }
      ]
    );
  };

  const getMarkedDates = () => {
    const marked: any = {};
    shifts.forEach(shift => {
      if (!marked[shift.date]) {
        marked[shift.date] = { dots: [] };
      }
      marked[shift.date].dots.push({
        color: shift.status === 'completed' ? colors.success : 
               shift.status === 'in-progress' ? colors.warning : colors.primary
      });
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

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shift Management',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <IconSymbol name="chevron.left" size={24} color={colors.white} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => setShowAddModal(true)} style={{ padding: 8 }}>
              <IconSymbol name="plus" size={24} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      
      <ScrollView style={commonStyles.container}>
        {/* Calendar */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Schedule Calendar</Text>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={getMarkedDates()}
            markingType="multi-dot"
            theme={{
              selectedDayBackgroundColor: colors.accent,
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
            }}
          />
        </View>

        {/* Shifts for Selected Date */}
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
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftEmployee}>{shift.employeeName}</Text>
                    <Text style={styles.shiftLocation}>{shift.locationName}</Text>
                    <Text style={styles.shiftTime}>
                      {shift.startTime} - {shift.endTime}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status) }]}>
                      <Text style={styles.statusText}>{shift.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => deleteShift(shift.id)} style={styles.deleteButton}>
                    <IconSymbol name="trash" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* All Shifts List */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>All Upcoming Shifts</Text>
          {shifts
            .filter(shift => new Date(shift.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(shift => (
              <View key={shift.id} style={styles.shiftItem}>
                <View style={styles.shiftInfo}>
                  <Text style={styles.shiftEmployee}>{shift.employeeName}</Text>
                  <Text style={styles.shiftLocation}>{shift.locationName}</Text>
                  <Text style={styles.shiftDate}>
                    {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status) }]}>
                    <Text style={styles.statusText}>{shift.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Pressable onPress={() => deleteShift(shift.id)} style={styles.deleteButton}>
                  <IconSymbol name="trash" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
        </View>
      </ScrollView>

      {/* Add Shift Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <View style={commonStyles.spaceBetween}>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Text style={{ color: colors.white, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Text style={commonStyles.headerTitle}>Add Shift</Text>
              <Pressable onPress={addShift}>
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Save</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={commonStyles.label}>Selected Date</Text>
            <Text style={[commonStyles.text, { marginBottom: 16 }]}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'No date selected'}
            </Text>

            <Text style={commonStyles.label}>Employee *</Text>
            <View style={styles.pickerContainer}>
              {employees.map(employee => (
                <Pressable
                  key={employee.id}
                  style={[
                    styles.pickerItem,
                    newShift.employeeId === employee.id && styles.pickerItemSelected
                  ]}
                  onPress={() => setNewShift({ ...newShift, employeeId: employee.id })}
                >
                  <Text style={[
                    styles.pickerText,
                    newShift.employeeId === employee.id && styles.pickerTextSelected
                  ]}>
                    {employee.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={commonStyles.label}>Location *</Text>
            <View style={styles.pickerContainer}>
              {locations.map(location => (
                <Pressable
                  key={location.id}
                  style={[
                    styles.pickerItem,
                    newShift.locationId === location.id && styles.pickerItemSelected
                  ]}
                  onPress={() => setNewShift({ ...newShift, locationId: location.id })}
                >
                  <Text style={[
                    styles.pickerText,
                    newShift.locationId === location.id && styles.pickerTextSelected
                  ]}>
                    {location.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={commonStyles.label}>Start Time *</Text>
            <TextInput
              style={commonStyles.input}
              value={newShift.startTime}
              onChangeText={(text) => setNewShift({ ...newShift, startTime: text })}
              placeholder="HH:MM (e.g., 09:00)"
            />

            <Text style={commonStyles.label}>End Time *</Text>
            <TextInput
              style={commonStyles.input}
              value={newShift.endTime}
              onChangeText={(text) => setNewShift({ ...newShift, endTime: text })}
              placeholder="HH:MM (e.g., 17:00)"
            />

            <Text style={commonStyles.label}>Notes</Text>
            <TextInput
              style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
              value={newShift.notes}
              onChangeText={(text) => setNewShift({ ...newShift, notes: text })}
              placeholder="Additional notes..."
              multiline
            />
          </ScrollView>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 16,
  },
  shiftItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shiftInfo: {
    flex: 1,
  },
  shiftEmployee: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  shiftLocation: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  shiftDate: {
    fontSize: 14,
    color: colors.text,
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
  deleteButton: {
    padding: 8,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerTextSelected: {
    color: colors.white,
  },
};
