
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/button';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shift, Employee, Location, CalendarEvent } from '@/types';

export default function AdminShiftsScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    locationId: '',
    type: 'event' as 'event' | 'meeting' | 'training' | 'maintenance',
    color: colors.primary
  });
  const [newShift, setNewShift] = useState({
    employeeId: '',
    locationId: '',
    startTime: '',
    endTime: '',
    notes: '',
    eventId: ''
  });

  const eventTypes = [
    { value: 'event', label: 'General Event', color: colors.primary },
    { value: 'meeting', label: 'Meeting', color: colors.accent },
    { value: 'training', label: 'Training', color: colors.success },
    { value: 'maintenance', label: 'Maintenance', color: colors.warning }
  ];

  useEffect(() => {
    loadData();
    initializeSampleData();
  }, []);

  const loadData = async () => {
    try {
      const shiftsData = await AsyncStorage.getItem('shifts');
      const eventsData = await AsyncStorage.getItem('events');
      const employeesData = await AsyncStorage.getItem('employees');
      const locationsData = await AsyncStorage.getItem('locations');

      if (shiftsData) setShifts(JSON.parse(shiftsData));
      if (eventsData) setEvents(JSON.parse(eventsData));
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
            isActive: true,
            pin: '12345'
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah@erosecurity.com',
            phone: '+1-555-0102',
            position: 'Senior Security Officer',
            hireDate: new Date('2022-08-20'),
            isActive: true,
            pin: '23456'
          },
          {
            id: '3',
            name: 'Mike Davis',
            email: 'mike@erosecurity.com',
            phone: '+1-555-0103',
            position: 'Security Supervisor',
            hireDate: new Date('2021-03-10'),
            isActive: true,
            pin: '34567'
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

  const saveEvents = async (updatedEvents: CalendarEvent[]) => {
    try {
      await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
    } catch (error) {
      console.log('Error saving events:', error);
    }
  };

  const addEvent = async () => {
    if (!selectedDate || !newEvent.title || !newEvent.startTime || !newEvent.endTime || !newEvent.locationId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const location = locations.find(l => l.id === newEvent.locationId);
    if (!location) {
      Alert.alert('Error', 'Invalid location selected');
      return;
    }

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description,
      date: selectedDate,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      locationId: newEvent.locationId,
      locationName: location.name,
      type: newEvent.type,
      color: newEvent.color,
      shifts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedEvents = [...events, event];
    await saveEvents(updatedEvents);
    
    setShowAddEventModal(false);
    setNewEvent({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      locationId: '',
      type: 'event',
      color: colors.primary
    });
    
    Alert.alert('Success', 'Event added successfully');
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
      eventId: newShift.eventId || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedShifts = [...shifts, shift];
    await saveShifts(updatedShifts);

    // If shift is linked to an event, update the event's shifts array
    if (newShift.eventId) {
      const updatedEvents = events.map(event => {
        if (event.id === newShift.eventId) {
          return {
            ...event,
            shifts: [...(event.shifts || []), shift]
          };
        }
        return event;
      });
      await saveEvents(updatedEvents);
    }
    
    setShowAddShiftModal(false);
    setNewShift({
      employeeId: '',
      locationId: '',
      startTime: '',
      endTime: '',
      notes: '',
      eventId: ''
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

            // Remove shift from associated event
            const shiftToDelete = shifts.find(s => s.id === shiftId);
            if (shiftToDelete?.eventId) {
              const updatedEvents = events.map(event => {
                if (event.id === shiftToDelete.eventId) {
                  return {
                    ...event,
                    shifts: (event.shifts || []).filter(s => s.id !== shiftId)
                  };
                }
                return event;
              });
              await saveEvents(updatedEvents);
            }
          }
        }
      ]
    );
  };

  const deleteEvent = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? All associated shifts will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Delete all shifts associated with this event
            const updatedShifts = shifts.filter(s => s.eventId !== eventId);
            await saveShifts(updatedShifts);

            // Delete the event
            const updatedEvents = events.filter(e => e.id !== eventId);
            await saveEvents(updatedEvents);
          }
        }
      ]
    );
  };

  const getMarkedDates = () => {
    const marked: any = {};
    
    // Mark events
    events.forEach(event => {
      if (!marked[event.date]) {
        marked[event.date] = { dots: [] };
      }
      marked[event.date].dots.push({
        color: event.color
      });
    });

    // Mark shifts
    shifts.forEach(shift => {
      if (!marked[shift.date]) {
        marked[shift.date] = { dots: [] };
      }
      marked[shift.date].dots.push({
        color: shift.status === 'completed' ? colors.success : 
               shift.status === 'in-progress' ? colors.warning : colors.textLight
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

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const getShiftsForDate = (date: string) => {
    return shifts.filter(shift => shift.date === date);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Schedule Management',
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

        {/* Quick Actions */}
        {selectedDate && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>
              Actions for {new Date(selectedDate).toLocaleDateString()}
            </Text>
            <View style={styles.actionButtons}>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAddEventModal(true)}
              >
                <IconSymbol name="calendar.badge.plus" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Add Event</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={() => setShowAddShiftModal(true)}
              >
                <IconSymbol name="person.badge.plus" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Add Shift</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Events for Selected Date */}
        {selectedDate && getEventsForDate(selectedDate).length > 0 && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>Events</Text>
            {getEventsForDate(selectedDate).map(event => (
              <View key={event.id} style={styles.eventItem}>
                <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventLocation}>{event.locationName}</Text>
                  <Text style={styles.eventTime}>
                    {event.startTime} - {event.endTime}
                  </Text>
                  {event.description && (
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}
                  <View style={[styles.typeBadge, { backgroundColor: event.color }]}>
                    <Text style={styles.typeText}>{event.type.toUpperCase()}</Text>
                  </View>
                  
                  {/* Show associated shifts */}
                  {event.shifts && event.shifts.length > 0 && (
                    <View style={styles.eventShifts}>
                      <Text style={styles.shiftsLabel}>Assigned Staff:</Text>
                      {event.shifts.map(shift => (
                        <Text key={shift.id} style={styles.shiftEmployee}>
                          • {shift.employeeName} ({shift.startTime} - {shift.endTime})
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.eventActions}>
                  <Pressable
                    style={styles.actionIcon}
                    onPress={() => {
                      setSelectedEvent(event);
                      setNewShift({ ...newShift, eventId: event.id, locationId: event.locationId });
                      setShowAddShiftModal(true);
                    }}
                  >
                    <IconSymbol name="person.badge.plus" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.actionIcon}
                    onPress={() => deleteEvent(event.id)}
                  >
                    <IconSymbol name="trash" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Shifts for Selected Date */}
        {selectedDate && getShiftsForDate(selectedDate).length > 0 && (
          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>Individual Shifts</Text>
            {getShiftsForDate(selectedDate).filter(shift => !shift.eventId).map(shift => (
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
            ))}
          </View>
        )}

        {/* All Upcoming Events and Shifts */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
          {[...events, ...shifts]
            .filter(item => new Date(item.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 10)
            .map(item => (
              <View key={`${item.id}-${'title' in item ? 'event' : 'shift'}`} style={styles.upcomingItem}>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingTitle}>
                    {'title' in item ? item.title : `${item.employeeName} - ${item.locationName}`}
                  </Text>
                  <Text style={styles.upcomingDate}>
                    {new Date(item.date).toLocaleDateString()} • {item.startTime} - {item.endTime}
                  </Text>
                  <View style={[
                    styles.typeBadge, 
                    { backgroundColor: 'title' in item ? item.color : getStatusColor(item.status) }
                  ]}>
                    <Text style={styles.typeText}>
                      {'title' in item ? item.type.toUpperCase() : item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAddEventModal} animationType="slide" presentationStyle="pageSheet">
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <View style={commonStyles.spaceBetween}>
              <Pressable onPress={() => setShowAddEventModal(false)}>
                <Text style={{ color: colors.white, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Text style={commonStyles.headerTitle}>Add Event</Text>
              <Pressable onPress={addEvent}>
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Save</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={commonStyles.label}>Selected Date</Text>
            <Text style={[commonStyles.text, { marginBottom: 16 }]}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'No date selected'}
            </Text>

            <Text style={commonStyles.label}>Event Title *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              placeholder="Enter event title"
            />

            <Text style={commonStyles.label}>Description</Text>
            <TextInput
              style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
              placeholder="Event description..."
              multiline
            />

            <Text style={commonStyles.label}>Event Type *</Text>
            <View style={styles.pickerContainer}>
              {eventTypes.map(type => (
                <Pressable
                  key={type.value}
                  style={[
                    styles.pickerItem,
                    newEvent.type === type.value && styles.pickerItemSelected,
                    { borderColor: type.color }
                  ]}
                  onPress={() => setNewEvent({ ...newEvent, type: type.value as any, color: type.color })}
                >
                  <View style={[styles.colorDot, { backgroundColor: type.color }]} />
                  <Text style={[
                    styles.pickerText,
                    newEvent.type === type.value && styles.pickerTextSelected
                  ]}>
                    {type.label}
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
                    newEvent.locationId === location.id && styles.pickerItemSelected
                  ]}
                  onPress={() => setNewEvent({ ...newEvent, locationId: location.id })}
                >
                  <Text style={[
                    styles.pickerText,
                    newEvent.locationId === location.id && styles.pickerTextSelected
                  ]}>
                    {location.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={commonStyles.label}>Start Time *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEvent.startTime}
              onChangeText={(text) => setNewEvent({ ...newEvent, startTime: text })}
              placeholder="HH:MM (e.g., 09:00)"
            />

            <Text style={commonStyles.label}>End Time *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEvent.endTime}
              onChangeText={(text) => setNewEvent({ ...newEvent, endTime: text })}
              placeholder="HH:MM (e.g., 17:00)"
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Add Shift Modal */}
      <Modal visible={showAddShiftModal} animationType="slide" presentationStyle="pageSheet">
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <View style={commonStyles.spaceBetween}>
              <Pressable onPress={() => {
                setShowAddShiftModal(false);
                setSelectedEvent(null);
                setNewShift({
                  employeeId: '',
                  locationId: '',
                  startTime: '',
                  endTime: '',
                  notes: '',
                  eventId: ''
                });
              }}>
                <Text style={{ color: colors.white, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Text style={commonStyles.headerTitle}>
                {selectedEvent ? `Add Shift to ${selectedEvent.title}` : 'Add Shift'}
              </Text>
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

            {selectedEvent && (
              <View style={styles.eventPreview}>
                <Text style={styles.eventPreviewTitle}>Event: {selectedEvent.title}</Text>
                <Text style={styles.eventPreviewTime}>
                  {selectedEvent.startTime} - {selectedEvent.endTime} at {selectedEvent.locationName}
                </Text>
              </View>
            )}

            <Text style={commonStyles.label}>Employee *</Text>
            <View style={styles.pickerContainer}>
              {employees.filter(emp => emp.isActive).map(employee => (
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
                    {employee.name} - {employee.position}
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
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  eventItem: {
    flexDirection: 'row' as const,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventColorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start' as const,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.white,
  },
  eventShifts: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 6,
  },
  shiftsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  shiftEmployee: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 2,
  },
  eventActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginLeft: 12,
  },
  actionIcon: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.backgroundLight,
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
  upcomingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  upcomingDate: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  eventPreview: {
    padding: 12,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    marginBottom: 16,
  },
  eventPreviewTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  eventPreviewTime: {
    fontSize: 14,
    color: colors.textLight,
  },
};
