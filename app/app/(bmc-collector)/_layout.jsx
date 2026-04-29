import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text } from "react-native";

export default function BMCCollectorLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
        tabBarStyle: {
          backgroundColor: "#0d47a1",
          borderTopWidth: 0,
          elevation: 10,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="view-dashboard"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="collection-entry"
        options={{
          title: "Log Collection",
          tabBarIcon: ({ color }) => (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: 8,
                borderRadius: 20,
                marginBottom: 4,
              }}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={24}
                color="#fff"
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: "Route",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="map-marker-path"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="history" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cog" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
