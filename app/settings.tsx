import React from "react";
import { SafeAreaView, StyleSheet, Alert } from "react-native";
import { List, Divider } from "react-native-paper";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";

const PRIMARY_BLUE = "#0a2d52";
const DANGER_RED = "#dc2626";

const SettingsPage = () => {
	const router = useRouter();

	const handleSignOut = async () => {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				Alert.alert("Error", error.message);
			} else {
				router.replace("/get-started");
			}
		} catch (err) {
			Alert.alert("Unexpected Error", "Something went wrong during sign out.");
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<List.Section>
				<List.Subheader style={styles.header}>Settings</List.Subheader>

				<List.Item
					title="Edit Profile"
					titleStyle={styles.title}
					left={(props) => (
						<Ionicons
							{...props}
							name="person-outline"
							size={24}
							color={PRIMARY_BLUE}
						/>
					)}
					onPress={() => router.push("/edit-profile")}
				/>
				<Divider />

				<List.Item
					title="Notifications"
					titleStyle={styles.title}
					left={(props) => (
						<Ionicons
							{...props}
							name="notifications-outline"
							size={24}
							color={PRIMARY_BLUE}
						/>
					)}
					onPress={() => router.push("/notifications")}
				/>
				<Divider />

				<List.Item
					title="Help & Support"
					titleStyle={styles.title}
					left={(props) => (
						<Ionicons
							{...props}
							name="help-circle-outline"
							size={24}
							color={PRIMARY_BLUE}
						/>
					)}
					onPress={() => router.push("/support")}
				/>
				<Divider />

				<List.Item
					title="Sign Out"
					titleStyle={styles.signOutText}
					left={(props) => (
						<Ionicons
							{...props}
							name="exit-outline"
							size={24}
							color={DANGER_RED}
						/>
					)}
					onPress={handleSignOut}
				/>
			</List.Section>
		</SafeAreaView>
	);
};

export default SettingsPage;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F9FAFB",
		paddingHorizontal: 20,
		paddingTop: 24,
	},
	header: {
		fontSize: 20,
		fontWeight: "700",
		color: PRIMARY_BLUE,
		marginBottom: 8,
	},
	title: {
		fontSize: 17,
		color: PRIMARY_BLUE,
		fontWeight: "600",
	},
	signOutText: {
		fontSize: 17,
		color: DANGER_RED,
		fontWeight: "700",
	},
});
