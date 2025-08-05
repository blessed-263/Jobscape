import React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const SignUpPage = () => {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";

	return (
		<View style={[styles.container, isDark ? styles.dark : styles.light]}>
			<Text style={[styles.logo, { color: isDark ? "#88b0e0" : "#0a2d52" }]}>
				JOBSCAPE
			</Text>
			<Text style={[styles.heading, { color: isDark ? "#a0c4ff" : "#0a2d52" }]}>
				Sign Up
			</Text>
			<Text
				style={[styles.subheading, { color: isDark ? "#cbd5e1" : "#4a4a4a" }]}
			>
				Find your next role{"\n"}or discover top talent
			</Text>

			{/* Job Seeker Button */}
			<TouchableOpacity
				style={[styles.jobSeekerBtn, { marginBottom: 24 }]}
				onPress={() => router.push("/sign-up-jobseeker")}
				activeOpacity={0.85}
				accessible
				accessibilityRole="button"
				accessibilityLabel="Sign up as Job Seeker"
			>
				<Ionicons name="person-circle-outline" size={32} color="#fff" />
				<Text style={styles.jobSeekerText}>Job Seeker</Text>
			</TouchableOpacity>

			{/* Recruiter Button */}
			<TouchableOpacity
				style={styles.recruiterBtn}
				onPress={() => router.push("/sign-up-recruiter")}
				activeOpacity={0.85}
				accessible
				accessibilityRole="button"
				accessibilityLabel="Sign up as Recruiter"
			>
				<Ionicons name="briefcase-outline" size={32} color="#0a2d52" />
				<Text style={styles.recruiterText}>Recruiter</Text>
			</TouchableOpacity>

			{/* Sign In Prompt */}
			<View style={styles.signInRow}>
				<Text
					style={[styles.signInPrompt, { color: isDark ? "#bbb" : "#555" }]}
				>
					Already have an account?
				</Text>
				<TouchableOpacity onPress={() => router.push("/sign-in")}>
					<Text
						style={[
							styles.signInLink,
							{ color: isDark ? "#a0c4ff" : "#0a2d52" },
						]}
					>
						Sign In
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 20,
		backgroundColor: "#fff",
	},
	dark: {
		backgroundColor: "#121212",
	},
	light: {
		backgroundColor: "#fff",
	},
	logo: {
		fontSize: 18,
		letterSpacing: 2,
		fontWeight: "600",
		marginBottom: 12,
		fontFamily: "Montserrat-VariableFont_wght",
	},
	heading: {
		fontSize: 30,
		fontWeight: "700",
		marginBottom: 8,
		textAlign: "center",
		fontFamily: "Montserrat-VariableFont_wght",
	},
	subheading: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 32,
		fontFamily: "Montserrat-VariableFont_wght",
		lineHeight: 22,
	},
	jobSeekerBtn: {
		flexDirection: "row",
		backgroundColor: "#0a2d52",
		width: "90%",
		maxWidth: 500,
		padding: 15,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		marginBottom: 16,
	},
	jobSeekerText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		flexShrink: 1,
		textAlign: "center",
		fontFamily: "Montserrat-VariableFont_wght",
	},
	recruiterBtn: {
		flexDirection: "row",
		width: "90%",
		maxWidth: 500,
		borderWidth: 1.4,
		borderColor: "#0a2d52",
		padding: 15,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
	},
	recruiterText: {
		color: "#0a2d52",
		fontSize: 16,
		fontWeight: "600",
		flexShrink: 1,
		textAlign: "center",
		fontFamily: "Montserrat-VariableFont_wght",
	},
	signInRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 40,
	},
	signInPrompt: {
		fontSize: 14,
		textAlign: "center",
	},
	signInLink: {
		fontWeight: "700",
		fontSize: 14,
		marginLeft: 6,
	},
});

export default SignUpPage;
