
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/button';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Employee, CheckIn } from '@/types';

interface EmployeeWithStats extends Employee {
  totalHours?: number;
  totalShifts?: number;
  lastCheckIn?: Date;
}

export default function AdminEmployeesScreen() {
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithStats | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    pin: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const employeesData = await AsyncStorage.getItem('employees');
      const checkInsData = await AsyncStorage.getItem('checkIns');

      let employeesList: Employee[] = [];
      let checkInsList: CheckIn[] = [];

      if (employeesData) {
        employeesList = JSON.parse(employeesData);
      }

      if (checkInsData) {
        checkInsList = JSON.parse(checkInsData);
        setCheckIns(checkInsList);
      }

      // Calculate stats for each employee
      const employeesWithStats: EmployeeWithStats[] = employeesList.map(employee => {
        const employeeCheckIns = checkInsList.filter(checkIn => 
          checkIn.employeeId === employee.id
        );

        const totalHours = employeeCheckIns.reduce((total, checkIn) => {
          if (checkIn.checkOutTime) {
            const checkInTime = new Date(checkIn.checkInTime);
            const checkOutTime = new Date(checkIn.checkOutTime);
            const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            return total + hours;
          }
          return total;
        }, 0);

        const lastCheckIn = employeeCheckIns.length > 0 
          ? new Date(Math.max(...employeeCheckIns.map(c => new Date(c.checkInTime).getTime())))
          : undefined;

        return {
          ...employee,
          totalHours,
          totalShifts: employeeCheckIns.length,
          lastCheckIn
        };
      });

      setEmployees(employeesWithStats);
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const generatePin = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const saveEmployees = async (updatedEmployees: Employee[]) => {
    try {
      await AsyncStorage.setItem('employees', JSON.stringify(updatedEmployees));
      loadData(); // Reload to recalculate stats
    } catch (error) {
      console.log('Error saving employees:', error);
    }
  };

  const addEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.phone || !newEmployee.position) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check if email already exists
    const existingEmployee = employees.find(emp => emp.email === newEmployee.email);
    if (existingEmployee) {
      Alert.alert('Error', 'An employee with this email already exists');
      return;
    }

    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name,
      email: newEmployee.email,
      phone: newEmployee.phone,
      position: newEmployee.position,
      hireDate: new Date(),
      isActive: true
    };

    // Add PIN to the employee data for login purposes
    const employeeWithPin = {
      ...employee,
      pin: newEmployee.pin || generatePin()
    };

    const updatedEmployees = [...employees.map(e => ({ ...e, pin: e.pin || generatePin() })), employeeWithPin];
    await saveEmployees(updatedEmployees);
    
    setShowAddModal(false);
    setNewEmployee({
      name: '',
      email: '',
      phone: '',
      position: '',
      pin: ''
    });
    
    Alert.alert('Success', `Employee added successfully. PIN: ${employeeWithPin.pin}`);
  };

  const updateEmployee = async () => {
    if (!selectedEmployee || !selectedEmployee.name || !selectedEmployee.email || !selectedEmployee.phone || !selectedEmployee.position) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const updatedEmployees = employees.map(emp => 
      emp.id === selectedEmployee.id ? selectedEmployee : emp
    );
    
    await saveEmployees(updatedEmployees);
    setShowEditModal(false);
    setSelectedEmployee(null);
    Alert.alert('Success', 'Employee updated successfully');
  };

  const deleteEmployee = async (employeeId: string) => {
    Alert.alert(
      'Delete Employee',
      'Are you sure you want to delete this employee? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedEmployees = employees.filter(emp => emp.id !== employeeId);
            await saveEmployees(updatedEmployees);
          }
        }
      ]
    );
  };

  const toggleEmployeeStatus = async (employeeId: string) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId ? { ...emp, isActive: !emp.isActive } : emp
    );
    await saveEmployees(updatedEmployees);
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Employee Management',
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
        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="person.3" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{employees.filter(e => e.isActive).length}</Text>
            <Text style={styles.statLabel}>Active Employees</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="clock" size={24} color={colors.success} />
            <Text style={styles.statNumber}>
              {formatHours(employees.reduce((total, emp) => total + (emp.totalHours || 0), 0))}
            </Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
        </View>

        {/* Employee List */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>All Employees</Text>
          {employees.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="person.badge.plus" size={48} color={colors.textLight} />
              <Text style={styles.emptyStateText}>No employees found</Text>
              <Text style={styles.emptyStateSubtext}>
                Add your first employee to get started
              </Text>
            </View>
          ) : (
            employees.map(employee => (
              <View key={employee.id} style={styles.employeeItem}>
                <View style={styles.employeeInfo}>
                  <View style={styles.employeeHeader}>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: employee.isActive ? colors.success : colors.textLight }
                    ]}>
                      <Text style={styles.statusText}>
                        {employee.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.employeePosition}>{employee.position}</Text>
                  <Text style={styles.employeeContact}>{employee.email}</Text>
                  <Text style={styles.employeeContact}>{employee.phone}</Text>
                  
                  <View style={styles.employeeStats}>
                    <View style={styles.statItem}>
                      <IconSymbol name="clock" size={16} color={colors.textLight} />
                      <Text style={styles.statText}>
                        {formatHours(employee.totalHours || 0)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <IconSymbol name="calendar" size={16} color={colors.textLight} />
                      <Text style={styles.statText}>
                        {employee.totalShifts || 0} shifts
                      </Text>
                    </View>
                    {employee.lastCheckIn && (
                      <View style={styles.statItem}>
                        <IconSymbol name="location" size={16} color={colors.textLight} />
                        <Text style={styles.statText}>
                          Last: {employee.lastCheckIn.toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.employeeActions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedEmployee(employee);
                      setShowEditModal(true);
                    }}
                  >
                    <IconSymbol name="pencil" size={20} color={colors.primary} />
                  </Pressable>
                  
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => toggleEmployeeStatus(employee.id)}
                  >
                    <IconSymbol 
                      name={employee.isActive ? "pause.circle" : "play.circle"} 
                      size={20} 
                      color={employee.isActive ? colors.warning : colors.success} 
                    />
                  </Pressable>
                  
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => deleteEmployee(employee.id)}
                  >
                    <IconSymbol name="trash" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Employee Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <View style={commonStyles.spaceBetween}>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Text style={{ color: colors.white, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Text style={commonStyles.headerTitle}>Add Employee</Text>
              <Pressable onPress={addEmployee}>
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Save</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={commonStyles.label}>Full Name *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEmployee.name}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, name: text })}
              placeholder="Enter full name"
            />

            <Text style={commonStyles.label}>Email Address *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEmployee.email}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, email: text })}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={commonStyles.label}>Phone Number *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEmployee.phone}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, phone: text })}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            <Text style={commonStyles.label}>Position *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEmployee.position}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, position: text })}
              placeholder="Enter job position"
            />

            <Text style={commonStyles.label}>PIN (5 digits)</Text>
            <TextInput
              style={commonStyles.input}
              value={newEmployee.pin}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, pin: text.replace(/\D/g, '').slice(0, 5) })}
              placeholder="Leave empty to auto-generate"
              keyboardType="numeric"
              maxLength={5}
            />
            <Text style={styles.helperText}>
              If left empty, a PIN will be automatically generated
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={commonStyles.container}>
          <View style={commonStyles.header}>
            <View style={commonStyles.spaceBetween}>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Text style={{ color: colors.white, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Text style={commonStyles.headerTitle}>Edit Employee</Text>
              <Pressable onPress={updateEmployee}>
                <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Save</Text>
              </Pressable>
            </View>
          </View>

          {selectedEmployee && (
            <ScrollView style={{ padding: 20 }}>
              <Text style={commonStyles.label}>Full Name *</Text>
              <TextInput
                style={commonStyles.input}
                value={selectedEmployee.name}
                onChangeText={(text) => setSelectedEmployee({ ...selectedEmployee, name: text })}
                placeholder="Enter full name"
              />

              <Text style={commonStyles.label}>Email Address *</Text>
              <TextInput
                style={commonStyles.input}
                value={selectedEmployee.email}
                onChangeText={(text) => setSelectedEmployee({ ...selectedEmployee, email: text })}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={commonStyles.label}>Phone Number *</Text>
              <TextInput
                style={commonStyles.input}
                value={selectedEmployee.phone}
                onChangeText={(text) => setSelectedEmployee({ ...selectedEmployee, phone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />

              <Text style={commonStyles.label}>Position *</Text>
              <TextInput
                style={commonStyles.input}
                value={selectedEmployee.position}
                onChangeText={(text) => setSelectedEmployee({ ...selectedEmployee, position: text })}
                placeholder="Enter job position"
              />

              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Employee Statistics</Text>
                <Text style={styles.infoText}>
                  Total Hours: {formatHours(selectedEmployee.totalHours || 0)}
                </Text>
                <Text style={styles.infoText}>
                  Total Shifts: {selectedEmployee.totalShifts || 0}
                </Text>
                <Text style={styles.infoText}>
                  Hire Date: {selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : 'N/A'}
                </Text>
                {selectedEmployee.lastCheckIn && (
                  <Text style={styles.infoText}>
                    Last Check-in: {selectedEmployee.lastCheckIn.toLocaleDateString()}
                  </Text>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 16,
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
  },
  employeeItem: {
    flexDirection: 'row' as const,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
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
  employeePosition: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 4,
  },
  employeeContact: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 2,
  },
  employeeStats: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.textLight,
  },
  employeeActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginLeft: 16,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
  },
  helperText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
    marginBottom: 16,
  },
  infoSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
};
