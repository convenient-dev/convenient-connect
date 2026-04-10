import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const TAB_CONFIG: Record<string, { label: string; icon: string; badge?: string }> = {
  index: {
    label: 'Home',
    icon: 'https://www.figma.com/api/mcp/asset/b5993281-5a8d-4e59-8707-ae689962e918',
  },
  services: {
    label: 'Services',
    icon: 'https://www.figma.com/api/mcp/asset/e5f99bca-5ebe-422d-a39f-4a908d4b1266',
  },
  calendar: {
    label: 'Calendar',
    icon: 'https://www.figma.com/api/mcp/asset/2ffd7967-612b-486f-a9e4-ef09537a1f93',
  },
  chats: {
    label: 'Chats',
    icon: 'https://www.figma.com/api/mcp/asset/ed119bf2-922d-4200-bf74-be0e15be2b4d',
    badge: '2',
  },
  share: {
    label: 'Share',
    icon: 'https://www.figma.com/api/mcp/asset/a1c97608-db06-44c6-aea2-fee85d62c6fe',
  },
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route, index) => {
        const tab = TAB_CONFIG[route.name];
        if (!tab) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Image source={{ uri: tab.icon }} style={styles.icon} resizeMode="contain" />
              {tab.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 48,
  },
  iconWrapper: {
    width: 24,
    height: 24,
  },
  icon: {
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.brand.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    lineHeight: 10,
  },
  label: {
    fontSize: 11,
    letterSpacing: -0.408,
  },
  labelActive: {
    color: Colors.brand.primary,
    fontWeight: '700',
  },
  labelInactive: {
    color: Colors.text.muted,
    fontWeight: '500',
  },
});
