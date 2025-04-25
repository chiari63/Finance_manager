import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
}

export const QuickAction = ({ icon, label, onPress }: QuickActionProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <TouchableOpacity 
      style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  quickAction: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: 78,
    height: 78,
    marginRight: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
}); 