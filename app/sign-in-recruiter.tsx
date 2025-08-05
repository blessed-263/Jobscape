import React, { useState } from "react";
import {
	SafeAreaView,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	useColorScheme,
	Alert,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";

const RecruiterSignIn = () => {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

	const handleSignIn = async () => {
		if (!email || !password) {
			Alert.alert("Missing fields", "Please provide an email and password.");
			return;
		}
		if (!validateEmail(email)) {
			Alert.alert("Invalid Email", "Please enter a valid email address.");
			return;
		}

		setLoading(true);
		try {
			const normalizedEmail = email.trim().toLowerCase();

			const { data: signInData, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: normalizedEmail,
					password,
				});

			if (signInError) {
				Alert.alert("Sign In Failed", signInError.message);
				setLoading(false);
				return;
			}

			const user = signInData.user;
			if (!user) {
				Alert.alert("Login Failed", "User not found.");
				setLoading(false);
				return;
			}

			if (!user.email_confirmed_at) {
				Alert.alert(
					"Email Not Verified",
					"Please verify your email before signing in."
				);
				setLoading(false);
				return;
			}

			// Fetch user's role from users table
			const { data: userData, error: userError } = await supabase
				.from("users")
				.select("role")
				.eq("id", user.id)
				.single();

			if (userError || !userData) {
				Alert.alert("Error", "Failed to retrieve user role.");
				setLoading(false);
				return;
			}

			if (userData.role !== "recruiter") {
				Alert.alert(
					"Unauthorized",
					"This account is not registered as a recruiter."
				);
				setLoading(false);
				return;
			}

			// Check if recruiter profile exists
			const { data: recruiterProfile, error: recruiterProfileError } =
				await supabase
					.from("recruiters")
					.select("id")
					.eq("id", user.id)
					.single();

			if (recruiterProfileError) {
				console.error(
					"Error checking recruiter profile:",
					recruiterProfileError
				);
				Alert.alert("Error", "Failed to verify recruiter profile.");
				setLoading(false);
				return;
			}

			if (recruiterProfile) {
				router.replace("/dashboard-recruiter");
			} else {
				router.replace("/create-company-profile");
			}
		} catch (e: any) {
			console.error("Unexpected error:", e);
			Alert.alert("Error", e.message || "Something went wrong.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView
			style={[
				styles.container,
				isDark ? styles.darkBackground : styles.lightBackground,
			]}
		>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContainer}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Center the briefcase icon */}
					<View style={styles.iconWrapper}>
						<Ionicons
							name="briefcase-outline"
							size={54}
							color={isDark ? "#fff" : "#0a2d52"}
							style={styles.icon}
						/>
					</View>

					<Text
						style={[
							styles.heading,
							isDark ? styles.whiteText : styles.darkText,
						]}
					>
						Recruiter
					</Text>
					<Text
						style={[
							styles.heading,
							isDark ? styles.whiteText : styles.darkText,
						]}
					>
						Sign In
					</Text>
					<Text
						style={[
							styles.subheading,
							isDark ? styles.lightGrayText : styles.darkGrayText,
						]}
					>
						Access your employer dashboard and manage applicants.
					</Text>

					<TextInput
						style={[
							styles.input,
							{
								color: isDark ? "#fff" : "#222",
								backgroundColor: isDark ? "#22243a" : "#f7f7f7",
							},
						]}
						placeholder="Email address"
						placeholderTextColor="#aaa"
						keyboardType="email-address"
						autoCapitalize="none"
						autoComplete="email"
						textContentType="emailAddress"
						value={email}
						onChangeText={setEmail}
					/>
					<TextInput
						style={[
							styles.input,
							{
								color: isDark ? "#fff" : "#222",
								backgroundColor: isDark ? "#22243a" : "#f7f7f7",
							},
						]}
						placeholder="Password"
						placeholderTextColor="#aaa"
						secureTextEntry
						autoCapitalize="none"
						autoComplete="password"
						textContentType="password"
						value={password}
						onChangeText={setPassword}
						onSubmitEditing={handleSignIn}
					/>

					<TouchableOpacity
						style={[
							styles.recruiterBtn,
							{ opacity: loading ? 0.7 : 1, marginTop: 14 },
						]}
						onPress={handleSignIn}
						disabled={loading}
					>
						<Ionicons name="log-in-outline" size={21} color="#0a2d52" />
						<Text style={styles.recruiterText}>
							{loading ? "Signing In..." : "Sign In"}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => router.push("/forgot-password")}
						style={{ marginTop: 20 }}
					>
						<Text
							style={[styles.signInPrompt, { fontSize: 15, color: "#1366d6" }]}
						>
							Forgot Password?
						</Text>
					</TouchableOpacity>

					<Text style={styles.signInPrompt}>
						New to Jobscape?{" "}
						<Text
							style={styles.signInLink}
							onPress={() => router.push("/sign-up-recruiter")}
						>
							Sign Up as Recruiter
						</Text>
					</Text>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	darkBackground: { backgroundColor: "#1a1a1a" },
	lightBackground: { backgroundColor: "#ffffff" },
	scrollContainer: {
		padding: 20,
		flexGrow: 1,
	},
	iconWrapper: {
		alignItems: "center",
		marginTop: 60,
		marginBottom: 14,
	},
	icon: {},
	heading: {
		fontSize: 22,
		fontWeight: "600",
		marginBottom: 4,
		fontFamily: "Montserrat-VariableFont_wght",
		textAlign: "center",
	},
	subheading: {
		fontSize: 14,
		marginBottom: 28,
		fontFamily: "Montserrat-VariableFont_wght",
		textAlign: "center",
	},
	lightGrayText: {
		color: "#888",
	},
	darkGrayText: {
		color: "#444",
	},
	whiteText: {
		color: "#ffffff",
	},
	darkText: {
		color: "#0a2d52",
	},
	input: {
		width: "100%",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
		fontSize: 15,
		fontFamily: "Montserrat-VariableFont_wght",
	},
	recruiterBtn: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderWidth: 1.5,
		borderColor: "#0a2d52",
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 36,
		justifyContent: "center",
	},
	recruiterText: {
		color: "#0a2d52",
		fontSize: 16,
		fontWeight: "600",
		fontFamily: "Montserrat-VariableFont_wght",
		marginLeft: 12,
	},
	signInPrompt: {
		fontSize: 14,
		color: "#666",
		marginTop: 40,
		textAlign: "center",
	},
	signInLink: {
		color: "#0a2d52",
		fontSize: 14,
		fontWeight: "600",
	},
});

export default RecruiterSignIn;
