
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router, Stack } from "expo-router";
import { Button } from "@/components/button";

export default function TransparentModalDemo() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Transparent Modal",
          presentation: "transparentModal",
          headerShown: false,
        }}
      />
      <Pressable style={styles.backdrop} onPress={() => router.back()}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Transparent Modal</Text>
              <Button variant="ghost" onPress={() => router.back()}>
                ✕
              </Button>
            </View>
            <Text style={styles.description}>
              Peekaboo 👻
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    color: '#666',
  },
  content: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
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
