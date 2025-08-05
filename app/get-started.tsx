import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	useColorScheme,
	SafeAreaView,
	StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

const GetStartedPage = () => {
	const isDarkMode = useColorScheme() === "dark";
	const router = useRouter();

	return (
		<SafeAreaView
			style={[
				styles.container,
				isDarkMode ? styles.darkBackground : styles.lightBackground,
			]}
		>
			<Text
				style={[styles.title, isDarkMode ? styles.whiteText : styles.darkText]}
			>
				JOBSCAPE
			</Text>

			<Text
				style={[
					styles.subtitle,
					isDarkMode ? styles.whiteText : styles.darkText,
				]}
			>
				Discover your next opportunity
			</Text>

			<View style={styles.buttonGroup}>
				<TouchableOpacity
					style={styles.primaryButton}
					onPress={() => router.push("/sign-in")}
				>
					<Text style={styles.primaryButtonText}>Sign In</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.secondaryButton}
					onPress={() => router.push("/sign-up")}
				>
					<Text style={styles.secondaryButtonText}>Sign Up</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 32,
		justifyContent: "center",
		alignItems: "center",
	},

	title: {
		fontSize: 34,
		fontWeight: "700",
		letterSpacing: 1,
		marginBottom: 8,
		fontFamily: "Montserrat-VariableFont_wght",
	},

	subtitle: {
		fontSize: 16,
		marginBottom: 48,
		fontFamily: "Montserrat-VariableFont_wght",
		textAlign: "center",
	},

	buttonGroup: {
		alignItems: "center",
		gap: 16,
	},

	primaryButton: {
		backgroundColor: "#0a2d52",
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 48,
		alignItems: "center",
	},

	primaryButtonText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "600",
		fontFamily: "Montserrat-VariableFont_wght",
	},

	secondaryButton: {
		borderColor: "#0a2d52",
		borderWidth: 1.5,
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 48,
		alignItems: "center",
	},

	secondaryButtonText: {
		color: "#0a2d52",
		fontSize: 16,
		fontWeight: "600",
		fontFamily: "Montserrat-VariableFont_wght",
	},

	darkBackground: {
		backgroundColor: "#1a1a1a",
	},

	lightBackground: {
		backgroundColor: "#ffffff",
	},

	whiteText: {
		color: "#ffffff",
	},

	darkText: {
		color: "#0a2d52",
	},
});

export default GetStartedPage;
