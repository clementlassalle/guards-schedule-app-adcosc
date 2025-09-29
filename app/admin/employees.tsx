
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { Button } from '@/components/button';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Employee, CheckIn, Shift } from '@/types';

interface EmployeeWithStats extends Employee {
  totalHours?: number;
  totalShifts?: number;
  lastCheckIn?: Date;
}

export default function AdminEmployeesScreen() {
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithStats | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
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
      const shiftsData = await AsyncStorage.getItem('shifts');

      let employeesList: Employee[] = [];
      let checkInsList: CheckIn[] = [];
      let shiftsList: Shift[] = [];

      if (employeesData) {
        employeesList = JSON.parse(employeesData);
      }

      if (checkInsData) {
        checkInsList = JSON.parse(checkInsData);
        setCheckIns(checkInsList);
      }

      if (shiftsData) {
        shiftsList = JSON.parse(shiftsData);
        setShifts(shiftsList);
      }

      // Calculate stats for each employee
      const employeesWithStats: EmployeeWithStats[] = employeesList.map(employee => {
        const employeeCheckIns = checkInsList.filter(checkIn => 
          checkIn.employeeId === employee.id
        );

        const employeeShifts = shiftsList.filter(shift => 
          shift.employeeId === employee.id
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
          totalShifts: employeeShifts.length,
          lastCheckIn
        };
      });

      setEmployees(employeesWithStats);
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const generatePin = () => {
    let pin;
    do {
      pin = Math.floor(10000 + Math.random() * 90000).toString();
    } while (employees.some(emp => emp.pin === pin));
    return pin;
  };

  const saveEmployees = async (updatedEmployees: Employee[]) => {
    try {
      await AsyncStorage.setItem('employees', JSON.stringify(updatedEmployees));
      loadData(); // Reload to recalculate stats
    } catch (error) {
      console.log('Error saving employees:', error);
    }
  };

  const validateEmployee = (employee: any) => {
    if (!employee.name?.trim()) {
      Alert.alert('Error', 'Employee name is required');
      return false;
    }
    if (!employee.email?.trim()) {
      Alert.alert('Error', 'Email address is required');
      return false;
    }
    if (!employee.phone?.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }
    if (!employee.position?.trim()) {
      Alert.alert('Error', 'Position is required');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employee.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    // Validate phone format (basic)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(employee.phone.replace(/[\s\-\(\)]/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }

    // Validate PIN if provided
    if (employee.pin && (employee.pin.length !== 5 || !/^\d{5}$/.test(employee.pin))) {
      Alert.alert('Error', 'PIN must be exactly 5 digits');
      return false;
    }

    return true;
  };

  const addEmployee = async () => {
    if (!validateEmployee(newEmployee)) {
      return;
    }

    // Check if email already exists
    const existingEmployee = employees.find(emp => 
      emp.email.toLowerCase() === newEmployee.email.toLowerCase()
    );
    if (existingEmployee) {
      Alert.alert('Error', 'An employee with this email already exists');
      return;
    }

    // Check if PIN already exists (if provided)
    if (newEmployee.pin) {
      const existingPin = employees.find(emp => emp.pin === newEmployee.pin);
      if (existingPin) {
        Alert.alert('Error', 'This PIN is already in use');
        return;
      }
    }

    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name.trim(),
      email: newEmployee.email.toLowerCase().trim(),
      phone: newEmployee.phone.trim(),
      position: newEmployee.position.trim(),
      hireDate: new Date(),
      isActive: true,
      pin: newEmployee.pin || generatePin()
    };

    const updatedEmployees = [...employees, employee];
    await saveEmployees(updatedEmployees);
    
    setShowAddModal(false);
    setNewEmployee({
      name: '',
      email: '',
      phone: '',
      position: '',
      pin: ''
    });
    
    Alert.alert(
      'Success', 
      `Employee added successfully!\n\nName: ${employee.name}\nPIN: ${employee.pin}\n\nPlease share the PIN with the employee for login.`
    );
  };

  const updateEmployee = async () => {
    if (!selectedEmployee || !validateEmployee(selectedEmployee)) {
      return;
    }

    // Check if email already exists (excluding current employee)
    const existingEmployee = employees.find(emp => 
      emp.id !== selectedEmployee.id && 
      emp.email.toLowerCase() === selectedEmployee.email.toLowerCase()
    );
    if (existingEmployee) {
      Alert.alert('Error', 'An employee with this email already exists');
      return;
    }

    // Check if PIN already exists (excluding current employee)
    if (selectedEmployee.pin) {
      const existingPin = employees.find(emp => 
        emp.id !== selectedEmployee.id && emp.pin === selectedEmployee.pin
      );
      if (existingPin) {
        Alert.alert('Error', 'This PIN is already in use');
        return;
      }
    }

    const updatedEmployees = employees.map(emp => 
      emp.id === selectedEmployee.id ? {
        ...selectedEmployee,
        name: selectedEmployee.name.trim(),
        email: selectedEmployee.email.toLowerCase().trim(),
        phone: selectedEmployee.phone.trim(),
        position: selectedEmployee.position.trim(),
      } : emp
    );
    
    await saveEmployees(updatedEmployees);
    setShowEditModal(false);
    setSelectedEmployee(null);
    Alert.alert('Success', 'Employee updated successfully');
  };

  const confirmDeleteEmployee = (employee: EmployeeWithStats) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirmModal(true);
  };

  const deleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      // Delete employee
      const updatedEmployees = employees.filter(emp => emp.id !== employeeToDelete.id);
      await saveEmployees(updatedEmployees);

      // Delete associated shifts
      const updatedShifts = shifts.filter(shift => shift.employeeId !== employeeToDelete.id);
      await AsyncStorage.setItem('shifts', JSON.stringify(updatedShifts));

      // Delete associated check-ins
      const updatedCheckIns = checkIns.filter(checkIn => checkIn.employeeId !== employeeToDelete.id);
      await AsyncStorage.setItem('checkIns', JSON.stringify(updatedCheckIns));

      setShowDeleteConfirmModal(false);
      setEmployeeToDelete(null);
      
      Alert.alert(
        'Success', 
        `Employee "${employeeToDelete.name}" and all associated data have been permanently deleted.`
      );
    } catch (error) {
      console.log('Error deleting employee:', error);
      Alert.alert('Error', 'Failed to delete employee. Please try again.');
    }
  };

  const toggleEmployeeStatus = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    Alert.alert(
      employee.isActive ? 'Deactivate Employee' : 'Activate Employee',
      `Are you sure you want to ${employee.isActive ? 'deactivate' : 'activate'} ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: employee.isActive ? 'Deactivate' : 'Activate',
          onPress: async () => {
            const updatedEmployees = employees.map(emp => 
              emp.id === employeeId ? { ...emp, isActive: !emp.isActive } : emp
            );
            await saveEmployees(updatedEmployees);
          }
        }
      ]
    );
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getFilteredEmployees = () => {
    let filtered = employees;

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(emp => emp.isActive);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(emp => !emp.isActive);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.position.toLowerCase().includes(query) ||
        emp.phone.includes(query)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  const filteredEmployees = getFilteredEmployees();

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
            <Text style={styles.statLabel}>Active</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="person.3.fill" size={24} color={colors.textLight} />
            <Text style={styles.statNumber}>{employees.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="clock" size={24} color={colors.success} />
            <Text style={styles.statNumber}>
              {formatHours(employees.reduce((total, emp) => total + (emp.totalHours || 0), 0))}
            </Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Search & Filter</Text>
          
          <TextInput
            style={commonStyles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, email, position, or phone..."
            clearButtonMode="while-editing"
          />

          <View style={styles.filterContainer}>
            {(['all', 'active', 'inactive'] as const).map(status => (
              <Pressable
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterStatus === status && styles.filterButtonTextActive
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Employee List */}
        <View style={commonStyles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>
              Employees ({filteredEmployees.length})
            </Text>
            {employees.length === 0 && (
              <Text style={styles.unlimitedText}>No limit on employees</Text>
            )}
          </View>

          {filteredEmployees.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="person.badge.plus" size={48} color={colors.textLight} />
              <Text style={styles.emptyStateText}>
                {employees.length === 0 ? 'No employees found' : 'No employees match your search'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {employees.length === 0 
                  ? 'Add your first employee to get started' 
                  : 'Try adjusting your search or filter criteria'
                }
              </Text>
            </View>
          ) : (
            filteredEmployees.map(employee => (
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
                  {employee.pin && (
                    <Text style={styles.employeePin}>PIN: {employee.pin}</Text>
                  )}
                  
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
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => confirmDeleteEmployee(employee)}
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
              autoCapitalize="words"
            />

            <Text style={commonStyles.label}>Email Address *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEmployee.email}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, email: text })}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
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
              autoCapitalize="words"
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
              If left empty, a unique PIN will be automatically generated
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
                autoCapitalize="words"
              />

              <Text style={commonStyles.label}>Email Address *</Text>
              <TextInput
                style={commonStyles.input}
                value={selectedEmployee.email}
                onChangeText={(text) => setSelectedEmployee({ ...selectedEmployee, email: text })}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
                autoCapitalize="words"
              />

              <Text style={commonStyles.label}>PIN (5 digits)</Text>
              <TextInput
                style={commonStyles.input}
                value={selectedEmployee.pin || ''}
                onChangeText={(text) => setSelectedEmployee({ 
                  ...selectedEmployee, 
                  pin: text.replace(/\D/g, '').slice(0, 5) 
                })}
                placeholder="Enter 5-digit PIN"
                keyboardType="numeric"
                maxLength={5}
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
                <Text style={styles.infoText}>
                  Status: {selectedEmployee.isActive ? 'Active' : 'Inactive'}
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

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirmModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <IconSymbol name="exclamationmark.triangle" size={32} color={colors.danger} />
              <Text style={styles.deleteModalTitle}>Delete Employee</Text>
            </View>
            
            {employeeToDelete && (
              <View style={styles.deleteModalContent}>
                <Text style={styles.deleteModalText}>
                  Are you sure you want to permanently delete:
                </Text>
                <Text style={styles.deleteModalEmployee}>
                  {employeeToDelete.name}
                </Text>
                <Text style={styles.deleteModalWarning}>
                  This will also delete:
                </Text>
                <Text style={styles.deleteModalList}>
                  • All shifts ({employeeToDelete.totalShifts || 0})
                </Text>
                <Text style={styles.deleteModalList}>
                  • All check-in records
                </Text>
                <Text style={styles.deleteModalList}>
                  • All associated data
                </Text>
                <Text style={styles.deleteModalFinal}>
                  This action cannot be undone.
                </Text>
              </View>
            )}

            <View style={styles.deleteModalActions}>
              <Pressable 
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteConfirmModal(false);
                  setEmployeeToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.deleteModalButton, styles.deleteButton]}
                onPress={deleteEmployee}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
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
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  unlimitedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600' as const,
  },
  filterContainer: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
    flex: 1,
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
  employeePin: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600' as const,
    marginBottom: 4,
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
  deleteActionButton: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  deleteModal: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalHeader: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 8,
  },
  deleteModalContent: {
    marginBottom: 24,
  },
  deleteModalText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  deleteModalEmployee: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  deleteModalList: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  deleteModalFinal: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginTop: 12,
  },
  deleteModalActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  cancelButton: {
    backgroundColor: colors.backgroundLight,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600' as const,
  },
  deleteButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600' as const,
  },
};
