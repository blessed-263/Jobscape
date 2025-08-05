import React from "react";
import {
	SafeAreaView,
	Text,
	TouchableOpacity,
	useColorScheme,
	View,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const SignInSelectionPage = () => {
	const isDark = useColorScheme() === "dark";
	const router = useRouter();

	return (
		<SafeAreaView
			style={[styles.container, isDark ? styles.dark : styles.light]}
		>
			<Text style={[styles.logo, { color: isDark ? "#88b0e0" : "#0a2d52" }]}>
				JOBSCAPE
			</Text>

			<Text style={[styles.heading, { color: isDark ? "#a0c4ff" : "#0a2d52" }]}>
				Sign In As
			</Text>
			<Text
				style={[
					styles.subheading,
					{ marginBottom: 36, color: isDark ? "#cbd5e1" : "#4a4a4a" },
				]}
			>
				Choose your role to continue
			</Text>

			{/* Job Seeker Sign-In */}
			<TouchableOpacity
				style={styles.jobSeekerBtn}
				onPress={() => router.push("/sign-in-jobseeker")}
				activeOpacity={0.8}
				accessible
				accessibilityRole="button"
				accessibilityLabel="Sign in as Job Seeker"
			>
				<Ionicons name="person-circle-outline" size={32} color="#fff" />
				<Text style={styles.jobSeekerText}>Job Seeker</Text>
			</TouchableOpacity>

			{/* Recruiter Sign-In */}
			<TouchableOpacity
				style={styles.recruiterBtn}
				onPress={() => router.push("/sign-in-recruiter")}
				activeOpacity={0.8}
				accessible
				accessibilityRole="button"
				accessibilityLabel="Sign in as Recruiter"
			>
				<Ionicons name="briefcase-outline" size={32} color="#0a2d52" />
				<Text style={styles.recruiterText}>Recruiter</Text>
			</TouchableOpacity>

			{/* Sign Up Link */}
			<View style={styles.signUpRow}>
				<Text
					style={[styles.signInPrompt, { color: isDark ? "#bbb" : "#555" }]}
				>
					Don't have an account?
				</Text>
				<TouchableOpacity
					onPress={() => router.push("/sign-up")}
					accessible
					accessibilityRole="link"
					accessibilityLabel="Go to Sign Up page"
				>
					<Text style={styles.signInLink}>Sign Up</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 30,
	},
	dark: {
		backgroundColor: "#121212",
	},
	light: {
		backgroundColor: "#ffffff",
	},
	logo: {
		fontSize: 18,
		letterSpacing: 2,
		fontWeight: "600",
		marginBottom: 12,
	},
	heading: {
		fontSize: 30,
		fontWeight: "700",
		marginBottom: 8,
		textAlign: "center",
	},
	subheading: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 32,
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
		marginBottom: 24,
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
	jobSeekerText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		flexShrink: 1,
		textAlign: "center",
	},
	recruiterText: {
		color: "#0a2d52",
		fontSize: 16,
		fontWeight: "600",
		flexShrink: 1,
		textAlign: "center",
	},
	signInPrompt: {
		fontSize: 14,
		textAlign: "center",
		flexWrap: "wrap",
	},
	signInLink: {
		fontWeight: "700",
		color: "#0a2d52",
		marginLeft: 6,
	},
	signUpRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 40,
	},
});

export default SignInSelectionPage;
