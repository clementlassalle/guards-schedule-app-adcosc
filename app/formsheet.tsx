
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { router, Stack } from "expo-router";
import { Button } from "@/components/button";

export default function FormSheetDemo() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Form Sheet Modal",
          headerLeft: () => (
            <Button variant="ghost" onPress={() => router.back()}>
              Close
            </Button>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Form Sheet Modal</Text>
        <Text style={styles.description}>
          Up and down!
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
  },
  content: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  property: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#007AFF',
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  feature: {
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});
