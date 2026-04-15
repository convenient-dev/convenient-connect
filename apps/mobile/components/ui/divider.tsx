import { Colors } from "@/constants/theme";
import React from "react";
import { View } from "react-native";

const Divider = () => {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: Colors.neutral[200],
        marginVertical: 10,
      }}
    />
  );
};

export default Divider;
