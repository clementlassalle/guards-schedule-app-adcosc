
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { commonStyles, colors } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckIn, Employee, Location, TimeReport } from '@/types';

export default function AdminReportsScreen() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [timeReports, setTimeReports] = useState<TimeReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  const loadData = useCallback(async () => {
    try {
      const checkInsData = await AsyncStorage.getItem('checkIns');
      const employeesData = await AsyncStorage.getItem('employees');
      const locationsData = await AsyncStorage.getItem('locations');

      let checkInsList: CheckIn[] = [];
      let employeesList: Employee[] = [];
      let locationsList: Location[] = [];

      if (checkInsData) {
        checkInsList = JSON.parse(checkInsData);
        setCheckIns(checkInsList);
      }

      if (employeesData) {
        employeesList = JSON.parse(employeesData);
        setEmployees(employeesList);
      }

      if (locationsData) {
        locationsList = JSON.parse(locationsData);
        setLocations(locationsList);
      }

      generateTimeReports(checkInsList, employeesList, locationsList);
    } catch (error) {
      console.log('Error loading data:', error);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getFilteredCheckIns = (checkIns: CheckIn[]) => {
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
        return checkIns;
    }

    return checkIns.filter(checkIn => new Date(checkIn.checkInTime) >= startDate);
  };

  const generateTimeReports = (checkIns: CheckIn[], employees: Employee[], locations: Location[]) => {
    const filteredCheckIns = getFilteredCheckIns(checkIns);
    const reports: TimeReport[] = [];

    employees.forEach(employee => {
      locations.forEach(location => {
        const employeeLocationCheckIns = filteredCheckIns.filter(checkIn => 
          checkIn.employeeId === employee.id && checkIn.locationId === location.id
        );

        if (employeeLocationCheckIns.length > 0) {
          const totalHours = employeeLocationCheckIns.reduce((total, checkIn) => {
            if (checkIn.checkOutTime) {
              const checkInTime = new Date(checkIn.checkInTime);
              const checkOutTime = new Date(checkIn.checkOutTime);
              const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
              return total + hours;
            }
            return total;
          }, 0);

          // Calculate overtime (assuming 8 hours is standard)
          const regularHours = Math.min(totalHours, 8 * employeeLocationCheckIns.length);
          const overtime = Math.max(0, totalHours - regularHours);

          reports.push({
            employeeId: employee.id,
            employeeName: employee.name,
            locationId: location.id,
            locationName: location.name,
            date: selectedPeriod,
            hoursWorked: totalHours,
            overtime: overtime > 0 ? overtime : undefined,
            checkIns: employeeLocationCheckIns
          });
        }
      });
    });

    // Sort by total hours worked (descending)
    reports.sort((a, b) => b.hoursWorked - a.hoursWorked);
    setTimeReports(reports);
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getTotalStats = () => {
    const totalHours = timeReports.reduce((sum, report) => sum + report.hoursWorked, 0);
    const totalOvertime = timeReports.reduce((sum, report) => sum + (report.overtime || 0), 0);
    const totalEmployees = new Set(timeReports.map(report => report.employeeId)).size;
    const totalLocations = new Set(timeReports.map(report => report.locationId)).size;

    return { totalHours, totalOvertime, totalEmployees, totalLocations };
  };

  const getTopPerformers = () => {
    const employeeStats: { [key: string]: { name: string, hours: number, locations: Set<string> } } = {};

    timeReports.forEach(report => {
      if (!employeeStats[report.employeeId]) {
        employeeStats[report.employeeId] = {
          name: report.employeeName,
          hours: 0,
          locations: new Set()
        };
      }
      employeeStats[report.employeeId].hours += report.hoursWorked;
      employeeStats[report.employeeId].locations.add(report.locationName);
    });

    return Object.entries(employeeStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        hours: stats.hours,
        locationCount: stats.locations.size
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  };

  const getLocationStats = () => {
    const locationStats: { [key: string]: { name: string, hours: number, employees: Set<string> } } = {};

    timeReports.forEach(report => {
      if (!locationStats[report.locationId]) {
        locationStats[report.locationId] = {
          name: report.locationName,
          hours: 0,
          employees: new Set()
        };
      }
      locationStats[report.locationId].hours += report.hoursWorked;
      locationStats[report.locationId].employees.add(report.employeeName);
    });

    return Object.entries(locationStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        hours: stats.hours,
        employeeCount: stats.employees.size
      }))
      .sort((a, b) => b.hours - a.hours);
  };

  const stats = getTotalStats();
  const topPerformers = getTopPerformers();
  const locationStats = getLocationStats();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Time Reports',
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
          <Text style={styles.sectionTitle}>Report Period</Text>
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
        <View style={styles.statsGrid}>
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="clock" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{formatHours(stats.totalHours)}</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="clock.badge.plus" size={24} color={colors.warning} />
            <Text style={styles.statNumber}>{formatHours(stats.totalOvertime)}</Text>
            <Text style={styles.statLabel}>Overtime</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="person.3" size={24} color={colors.success} />
            <Text style={styles.statNumber}>{stats.totalEmployees}</Text>
            <Text style={styles.statLabel}>Active Employees</Text>
          </View>
          
          <View style={[commonStyles.card, styles.statCard]}>
            <IconSymbol name="location" size={24} color={colors.accent} />
            <Text style={styles.statNumber}>{stats.totalLocations}</Text>
            <Text style={styles.statLabel}>Locations</Text>
          </View>
        </View>

        {/* Top Performers */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Top Performers</Text>
          {topPerformers.length === 0 ? (
            <Text style={commonStyles.textLight}>No data available for selected period</Text>
          ) : (
            topPerformers.map((performer, index) => (
              <View key={performer.id} style={styles.performerItem}>
                <View style={styles.performerRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{performer.name}</Text>
                  <Text style={styles.performerDetails}>
                    {performer.locationCount} location{performer.locationCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.performerHours}>
                  {formatHours(performer.hours)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Location Breakdown */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Hours by Location</Text>
          {locationStats.length === 0 ? (
            <Text style={commonStyles.textLight}>No data available for selected period</Text>
          ) : (
            locationStats.map(location => (
              <View key={location.id} style={styles.locationItem}>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationDetails}>
                    {location.employeeCount} employee{location.employeeCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.locationHours}>
                  {formatHours(location.hours)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Detailed Time Reports */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Detailed Reports</Text>
          {timeReports.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="chart.bar.doc.horizontal" size={48} color={colors.textLight} />
              <Text style={styles.emptyStateText}>No reports available</Text>
              <Text style={styles.emptyStateSubtext}>
                Reports will appear here once employees start checking in
              </Text>
            </View>
          ) : (
            timeReports.map((report, index) => (
              <View key={`${report.employeeId}-${report.locationId}`} style={styles.reportItem}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportEmployee}>{report.employeeName}</Text>
                    <Text style={styles.reportLocation}>{report.locationName}</Text>
                  </View>
                  <View style={styles.reportStats}>
                    <Text style={styles.reportHours}>{formatHours(report.hoursWorked)}</Text>
                    {report.overtime && report.overtime > 0 && (
                      <Text style={styles.reportOvertime}>
                        +{formatHours(report.overtime)} OT
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.reportDetails}>
                  <View style={styles.reportDetail}>
                    <IconSymbol name="calendar" size={16} color={colors.textLight} />
                    <Text style={styles.reportDetailText}>
                      {report.checkIns.length} shift{report.checkIns.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.reportDetail}>
                    <IconSymbol name="clock" size={16} color={colors.textLight} />
                    <Text style={styles.reportDetailText}>
                      Avg: {formatHours(report.hoursWorked / report.checkIns.length)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Export Options */}
        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Export Options</Text>
          <Text style={styles.exportNote}>
            Export functionality would be available in a production version of this app. 
            Reports can be exported as PDF or CSV files for payroll and record-keeping purposes.
          </Text>
          
          <View style={styles.exportButtons}>
            <Pressable style={styles.exportButton} disabled>
              <IconSymbol name="doc.text" size={20} color={colors.textLight} />
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </Pressable>
            
            <Pressable style={styles.exportButton} disabled>
              <IconSymbol name="tablecells" size={20} color={colors.textLight} />
              <Text style={styles.exportButtonText}>Export CSV</Text>
            </Pressable>
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
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 16,
    paddingHorizontal: 16,
  },
  statCard: {
    width: '47%',
    alignItems: 'center' as const,
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 18,
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
  performerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  performerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: colors.white,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  performerDetails: {
    fontSize: 14,
    color: colors.textLight,
  },
  performerHours: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  locationItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 2,
  },
  locationDetails: {
    fontSize: 14,
    color: colors.textLight,
  },
  locationHours: {
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
  reportItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reportHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  reportInfo: {
    flex: 1,
  },
  reportEmployee: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  reportLocation: {
    fontSize: 14,
    color: colors.textLight,
  },
  reportStats: {
    alignItems: 'flex-end' as const,
  },
  reportHours: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  reportOvertime: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 2,
  },
  reportDetails: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  reportDetail: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  reportDetailText: {
    fontSize: 12,
    color: colors.textLight,
  },
  exportNote: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  exportButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 14,
    color: colors.textLight,
  },
};
