import { contentWidthStyle } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { Image } from "expo-image";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { primary, neutral, background } = Colors;

const NUM_COLUMNS = 4;

export interface IconGridItem {
  id: number;
  name: string;
  iconUrl: string | null;
}

interface Props {
  items: IconGridItem[];
  /** Ids of highlighted items. Pass one id for single select, many for multi. */
  selectedIds: number[];
  onSelect: (id: number) => void;
}

function IconGridCell({
  item,
  selected,
  onSelect,
}: {
  item: IconGridItem;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.cell]}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconWrapper, selected && styles.iconWrapperSelected]}
      >
        {item.iconUrl && (
          <Image
            source={{ uri: item.iconUrl }}
            style={styles.icon}
            contentFit="contain"
          />
        )}
      </View>
      <Text
        style={[styles.cellLabel, selected && styles.cellLabelSelected]}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Scrollable four-column grid of icon tiles used to pick service categories
 * and subcategories. Cells keep a fixed width so a short last row stays
 * left-aligned instead of stretching to fill the row.
 */
export function IconGrid({ items, selectedIds, onSelect }: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={[styles.grid, contentWidthStyle]}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <IconGridCell
          item={item}
          selected={selectedIds.includes(item.id)}
          onSelect={onSelect}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  row: {
    justifyContent: "flex-start",
  },
  cell: {
    width: `${100 / NUM_COLUMNS}%`,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 2,
    borderRadius: 10,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: background.subtle,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrapperSelected: {
    backgroundColor: primary[50],
  },
  icon: {
    width: 44,
    height: 44,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[600],
    textAlign: "center",
    lineHeight: 14,
  },
  cellLabelSelected: {
    color: primary[500],
    fontWeight: "600",
  },
});
