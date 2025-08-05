import React, { useState } from "react";
import {
	SafeAreaView,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	useColorScheme,
	StyleSheet,
	Alert,
	KeyboardAvoidingView,
	Platform,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";

const JobSeekerSignInPage = () => {
	const isDark = useColorScheme() === "dark";
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSignIn = async () => {
		setLoading(true);
		try {
			const normalizedEmail = email.trim().toLowerCase();

			const { data: signInData, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: normalizedEmail,
					password,
				});

			if (signInError) {
				Alert.alert("Login Failed", signInError.message);
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

			// Fetch the user's role from the 'users' table
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

			if (userData.role === "job_seeker") {
				// Check if profile exists in job_seekers table
				const { data: profileData, error: profileError } = await supabase
					.from("job_seekers")
					.select("id")
					.eq("id", user.id)
					.single();

				if (profileError && profileError.code !== "PGRST116") {
					// PGRST116 = "No rows found" (handle gracefully)
					console.error("Error checking profile existence:", profileError);
					Alert.alert("Error", "Failed to check profile.");
					setLoading(false);
					return;
				}

				if (!profileData) {
					// No profile found -> redirect to create profile screen
					router.replace("/create-jobseeker-profile");
					setLoading(false);
					return;
				}

				// Profile exists, upsert in case metadata changed
				const { error: upsertProfileError } = await supabase
					.from("job_seekers")
					.upsert(
						{
							id: user.id,
							full_name: user.user_metadata?.fullName?.trim() || "",
							email: user.email?.trim().toLowerCase() || "",
							phone: user.user_metadata?.phone || null,
						},
						{ onConflict: "id" }
					);

				if (upsertProfileError) {
					console.error("Upsert job_seeker failed:", upsertProfileError);
					Alert.alert("Error", "Failed to create or update profile.");
					setLoading(false);
					return;
				}

				router.replace("/dashboard-jobseeker");
			} else if (userData.role === "recruiter") {
				// Handle recruiter similarly or redirect
				router.replace("/dashboard-recruiter");
			} else {
				Alert.alert("Error", "User role is not recognized.");
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
			style={[styles.container, isDark ? styles.dark : styles.light]}
		>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // adjust if you have header
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					<Ionicons
						name="person-circle-outline"
						size={54}
						color={isDark ? "#fff" : "#0a2d52"}
						style={{ marginBottom: 14 }}
					/>
					<Text style={styles.heading}>Job Seeker</Text>
					<Text style={styles.heading}>Sign In</Text>
					<Text style={styles.subheading}>
						Access your profile and applications.
					</Text>

					<TextInput
						style={[styles.input, isDark && styles.inputDark]}
						placeholder="Email address"
						placeholderTextColor="#aaa"
						autoCapitalize="none"
						keyboardType="email-address"
						value={email}
						onChangeText={setEmail}
						autoComplete="email"
						textContentType="emailAddress"
					/>
					<TextInput
						style={[styles.input, isDark && styles.inputDark]}
						placeholder="Password"
						placeholderTextColor="#aaa"
						secureTextEntry
						autoCapitalize="none"
						value={password}
						onChangeText={setPassword}
						autoComplete="password"
						textContentType="password"
					/>

					<TouchableOpacity
						style={[styles.jobSeekerBtn, loading && { opacity: 0.7 }]}
						onPress={handleSignIn}
						disabled={loading}
						activeOpacity={0.85}
					>
						<Ionicons name="log-in-outline" size={21} color="#fff" />
						<Text style={styles.jobSeekerText}>
							{loading ? "Signing In..." : "Sign In"}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => router.push("/forgot-password")}
						style={{ marginTop: 20 }}
					>
						<Text style={[styles.signInPrompt, styles.forgotPassword]}>
							Forgot Password?
						</Text>
					</TouchableOpacity>

					<Text style={styles.signInPrompt}>
						New to Jobscape?{" "}
						<Text
							style={styles.signInLink}
							onPress={() => router.push("/sign-up-jobseeker")}
						>
							Sign Up as Job Seeker
						</Text>
					</Text>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#ffffff",
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
	scrollContent: {
		alignItems: "center",
		justifyContent: "center",
		flexGrow: 1,
	},
	heading: {
		fontSize: 30,
		fontWeight: "700",
		color: "#0a2d52",
		marginBottom: 8,
		textAlign: "center",
	},
	subheading: {
		fontSize: 16,
		color: "#4a4a4a",
		textAlign: "center",
		marginBottom: 32,
	},
	input: {
		width: "90%",
		maxWidth: 500,
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderRadius: 12,
		fontSize: 16,
		marginBottom: 20,
		backgroundColor: "#f7f7f7",
		color: "#222",
	},
	inputDark: {
		backgroundColor: "#22243a",
		color: "#fff",
	},
	jobSeekerBtn: {
		flexDirection: "row",
		backgroundColor: "#0a2d52",
		width: "90%",
		maxWidth: 500,
		paddingVertical: 15,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		marginBottom: 16,
		paddingHorizontal: 24,
	},
	jobSeekerText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		flexShrink: 1,
		textAlign: "center",
	},
	signInPrompt: {
		marginTop: 40,
		color: "#555",
		fontSize: 14,
		textAlign: "center",
		flexWrap: "wrap",
	},
	signInLink: {
		fontWeight: "700",
		color: "#0a2d52",
	},
	forgotPassword: {
		fontSize: 15,
		color: "#1366d6",
	},
});

export default JobSeekerSignInPage;
