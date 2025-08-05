import React, { useState, useRef } from "react";
import {
	SafeAreaView,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	useColorScheme,
	StyleSheet,
	Alert,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	View,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";

import CountryPicker, {
	Country,
	CountryCode,
} from "react-native-country-picker-modal";

const JobSeekerSignUp = () => {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [phone, setPhone] = useState("");
	const [countryCode, setCountryCode] = useState<CountryCode>("US"); // Default country
	const [callingCode, setCallingCode] = useState<string>("1"); // Default calling code for US
	const [loading, setLoading] = useState(false);

	const emailInputRef = useRef<TextInput>(null);
	const passwordInputRef = useRef<TextInput>(null);
	const phoneInputRef = useRef<TextInput>(null);

	// Validation functions
	const validateEmail = (email: string) =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
	const validatePassword = (password: string) =>
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
	const validatePhone = (phone: string) => /^\d{7,15}$/.test(phone); // digits only, length 7-15

	const handleSignUp = async () => {
		const trimmedFullName = fullName.trim();
		const trimmedEmail = email.trim();
		// Sanitize phone: remove all non-digit characters
		const sanitizedPhone = phone.replace(/\D/g, "");

		if (!trimmedFullName || !trimmedEmail || !password) {
			Alert.alert("Missing Fields", "Please fill in all required fields.");
			return;
		}
		if (!validateEmail(trimmedEmail)) {
			Alert.alert("Invalid Email", "Enter a valid email address.");
			return;
		}
		if (!validatePassword(password)) {
			Alert.alert(
				"Weak Password",
				"Password must be at least 8 characters long, include uppercase, lowercase, and a number."
			);
			return;
		}
		if (sanitizedPhone && !validatePhone(sanitizedPhone)) {
			Alert.alert("Invalid Phone", "Phone must be 7–15 digits.");
			return;
		}

		const fullPhone = sanitizedPhone
			? `+${callingCode}${sanitizedPhone}`
			: null;

		setLoading(true);

		try {
			const { data, error } = await supabase.auth.signUp({
				email: trimmedEmail,
				password,
				options: {
					data: {
						fullName: trimmedFullName,
						...(fullPhone && { phone: fullPhone }),
					},
				},
			});

			if (error) {
				Alert.alert("Sign Up Error", error.message);
				setLoading(false);
				return;
			}

			Alert.alert(
				"Success!",
				"Account created. Please check your email to confirm before signing in."
			);

			router.push("/sign-in");
		} catch (e: any) {
			console.error("Unexpected error during sign up:", e);
			Alert.alert("Error", e.message || "Something went wrong.");
		} finally {
			setLoading(false);
			Keyboard.dismiss();
		}
	};

	return (
		<SafeAreaView
			style={[styles.container, isDark ? styles.dark : styles.light]}
		>
			<KeyboardAvoidingView
				style={{ flex: 1, width: "100%" }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
			>
				<ScrollView
					contentContainerStyle={{
						alignItems: "center",
						justifyContent: "center",
						flexGrow: 1,
						paddingVertical: 20,
					}}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<Ionicons
						name="person-circle-outline"
						size={58}
						color={isDark ? "#fff" : "#0a2d52"}
						style={{ marginBottom: 12 }}
					/>

					<Text style={styles.heading}>Job Seeker</Text>
					<Text style={styles.heading}>Sign Up</Text>
					<Text style={styles.subheading}>
						Create your account to start applying for jobs
					</Text>

					<TextInput
						style={[
							styles.input,
							{
								color: isDark ? "#fff" : "#222",
								backgroundColor: isDark ? "#22243a" : "#f7f7f7",
							},
						]}
						placeholder="Full Name"
						placeholderTextColor="#aaa"
						value={fullName}
						onChangeText={setFullName}
						returnKeyType="next"
						onSubmitEditing={() => emailInputRef.current?.focus()}
						blurOnSubmit={false}
						importantForAutofill="yes"
					/>
					<TextInput
						ref={emailInputRef}
						style={[
							styles.input,
							{
								color: isDark ? "#fff" : "#222",
								backgroundColor: isDark ? "#22243a" : "#f7f7f7",
							},
						]}
						placeholder="Email"
						placeholderTextColor="#aaa"
						keyboardType="email-address"
						autoCapitalize="none"
						value={email}
						onChangeText={setEmail}
						returnKeyType="next"
						onSubmitEditing={() => passwordInputRef.current?.focus()}
						blurOnSubmit={false}
						textContentType="emailAddress"
						importantForAutofill="yes"
					/>
					<TextInput
						ref={passwordInputRef}
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
						value={password}
						onChangeText={setPassword}
						returnKeyType="next"
						onSubmitEditing={() => phoneInputRef.current?.focus()}
						blurOnSubmit={false}
						textContentType="password"
						importantForAutofill="yes"
					/>
					<Text style={styles.passwordHelper}>
						Must be 8+ chars, with uppercase, lowercase, and a number.
					</Text>

					{/* Phone input with country picker */}
					<View
						style={[
							styles.phoneContainer,
							{ backgroundColor: isDark ? "#22243a" : "#f7f7f7" },
						]}
					>
						<CountryPicker
							countryCode={countryCode}
							withFilter
							withFlag
							withCallingCode
							withEmoji
							onSelect={(country: Country) => {
								setCountryCode(country.cca2);
								setCallingCode(country.callingCode[0]);
							}}
							containerButtonStyle={styles.countryPickerButton}
						/>
						<Text style={styles.callingCodeText}>+{callingCode}</Text>
						<TextInput
							ref={phoneInputRef}
							style={[
								styles.input,
								{ flex: 1, marginLeft: 8, backgroundColor: "transparent" },
							]}
							placeholder="Phone (optional)"
							placeholderTextColor="#aaa"
							keyboardType="phone-pad"
							value={phone}
							onChangeText={setPhone}
							returnKeyType="done"
							onSubmitEditing={handleSignUp}
							maxLength={15}
							textContentType="telephoneNumber"
						/>
					</View>

					<TouchableOpacity
						style={[
							styles.jobSeekerBtn,
							{ marginTop: 12, opacity: loading ? 0.7 : 1 },
						]}
						onPress={handleSignUp}
						disabled={loading}
						activeOpacity={0.85}
						accessible
						accessibilityLabel="Sign Up button"
					>
						{loading && (
							<ActivityIndicator
								color="#fff"
								size="small"
								style={{ marginRight: 10 }}
							/>
						)}
						<Ionicons name="log-in-outline" size={22} color="#fff" />
						<Text style={styles.jobSeekerText}>
							{loading ? "Signing Up..." : "Sign Up"}
						</Text>
					</TouchableOpacity>

					<Text style={styles.signInPrompt}>
						Already have an account?{" "}
						<Text
							style={styles.signInLink}
							onPress={() => router.push("/sign-in")}
							accessible
							accessibilityRole="link"
							accessibilityLabel="Go to Sign In page"
						>
							Sign In
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
	input: {
		width: "90%",
		maxWidth: 500,
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderRadius: 10,
		fontSize: 16,
		marginBottom: 14,
		backgroundColor: "#f7f7f7",
		color: "#222",
	},
	phoneContainer: {
		flexDirection: "row",
		alignItems: "center",
		width: "90%",
		maxWidth: 500,
		paddingHorizontal: 12,
		paddingVertical: 14,
		borderRadius: 10,
		marginBottom: 14,
	},
	countryPickerButton: {
		padding: 0,
	},
	callingCodeText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#222",
		marginLeft: 8,
	},
	passwordHelper: {
		width: "90%",
		maxWidth: 500,
		color: "#666",
		fontSize: 12,
		marginTop: -10,
		marginBottom: 14,
		paddingLeft: 18,
	},
});

export default JobSeekerSignUp;
