import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface TextProps extends RNTextProps {
  style?: RNTextProps['style'];
  children: React.ReactNode;
}

export function Text({ style, children, ...props }: TextProps) {
  const colorScheme = useColorScheme();
  const defaultColor = Colors[colorScheme ?? 'light'].text;

  return (
    <RNText 
      style={[{ color: defaultColor }, styles.text, style]} 
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'System',
  },
}); 