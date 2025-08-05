import React, { useState, useRef } from "react";
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
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import CountryPicker, {
	Country,
	CountryCode,
} from "react-native-country-picker-modal";

const RecruiterSignUp = () => {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";

	const [contactName, setContactName] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [phone, setPhone] = useState("");
	const [website, setWebsite] = useState("");
	const [about, setAbout] = useState("");
	const [loading, setLoading] = useState(false);

	const [countryCode, setCountryCode] = useState<CountryCode>("ZW");
	const [callingCode, setCallingCode] = useState("263");

	const companyNameRef = useRef<TextInput>(null);
	const emailRef = useRef<TextInput>(null);
	const passwordRef = useRef<TextInput>(null);
	const phoneRef = useRef<TextInput>(null);
	const websiteRef = useRef<TextInput>(null);
	const aboutRef = useRef<TextInput>(null);

	const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
	const validatePassword = (password: string) =>
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
	const validatePhone = (phone: string) => /^\d{7,15}$/.test(phone);

	const handleCountrySelect = (country: Country) => {
		setCountryCode(country.cca2);
		setCallingCode(country.callingCode[0]);
	};

	const handleSignUp = async () => {
		const trimmedContactName = contactName.trim();
		const trimmedCompanyName = companyName.trim();
		const trimmedEmail = email.trim();
		const trimmedWebsite = website.trim();
		const trimmedAbout = about.trim();
		const sanitizedPhone = phone.replace(/\D/g, "");

		if (
			!trimmedContactName ||
			!trimmedCompanyName ||
			!trimmedEmail ||
			!password
		) {
			Alert.alert("Missing Fields", "Please fill in all required fields.");
			return;
		}

		if (!validateEmail(trimmedEmail)) {
			Alert.alert("Invalid Email", "Please enter a valid email address.");
			return;
		}

		if (!validatePassword(password)) {
			Alert.alert(
				"Weak Password",
				"Password must be at least 8 characters, include uppercase, lowercase, and a number."
			);
			return;
		}

		if (sanitizedPhone && !validatePhone(sanitizedPhone)) {
			Alert.alert("Invalid Phone", "Phone must be 7 to 15 digits.");
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
						contactName: trimmedContactName,
						companyName: trimmedCompanyName,
						phone: fullPhone,
						website: trimmedWebsite || null,
						about: trimmedAbout || null,
						role: "recruiter",
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

			router.push("/sign-in-recruiter");
		} catch (e: any) {
			console.error("Signup error:", e.message);
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
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					<Ionicons
						name="briefcase-outline"
						size={54}
						color={isDark ? "#fff" : "#0a2d52"}
						style={{ marginBottom: 12 }}
					/>
					<Text style={styles.heading}>Recruiter</Text>
					<Text style={styles.heading}>Sign Up</Text>
					<Text style={styles.subheading}>
						Create your company account to find and hire top talent.
					</Text>

					<TextInput
						style={[styles.input, isDark && styles.inputDark]}
						placeholder="Contact Person's Name"
						placeholderTextColor="#aaa"
						value={contactName}
						onChangeText={setContactName}
						returnKeyType="next"
						onSubmitEditing={() => companyNameRef.current?.focus()}
					/>
					<TextInput
						ref={companyNameRef}
						style={[styles.input, isDark && styles.inputDark]}
						placeholder="Company Name"
						placeholderTextColor="#aaa"
						value={companyName}
						onChangeText={setCompanyName}
						returnKeyType="next"
						onSubmitEditing={() => emailRef.current?.focus()}
					/>
					<TextInput
						ref={emailRef}
						style={[styles.input, isDark && styles.inputDark]}
						placeholder="Company Email"
						placeholderTextColor="#aaa"
						keyboardType="email-address"
						autoCapitalize="none"
						value={email}
						onChangeText={setEmail}
						returnKeyType="next"
						onSubmitEditing={() => passwordRef.current?.focus()}
					/>
					<TextInput
						ref={passwordRef}
						style={[styles.input, isDark && styles.inputDark]}
						placeholder="Password"
						placeholderTextColor="#aaa"
						secureTextEntry
						value={password}
						onChangeText={setPassword}
						returnKeyType="next"
						onSubmitEditing={() => phoneRef.current?.focus()}
					/>

					<View style={styles.phoneRow}>
						<CountryPicker
							countryCode={countryCode}
							withFlag
							withCallingCode
							withFilter
							withEmoji
							onSelect={handleCountrySelect}
							containerButtonStyle={styles.countryPicker}
						/>
						<Text style={styles.callingCode}>+{callingCode}</Text>
						<TextInput
							ref={phoneRef}
							style={[styles.phoneInput, isDark && styles.inputDark]}
							placeholder="Phone Number (optional)"
							placeholderTextColor="#aaa"
							keyboardType="phone-pad"
							value={phone}
							onChangeText={setPhone}
							returnKeyType="next"
							onSubmitEditing={() => websiteRef.current?.focus()}
						/>
					</View>

					<TextInput
						ref={websiteRef}
						style={[styles.input, isDark && styles.inputDark]}
						placeholder="Company Website (optional)"
						placeholderTextColor="#aaa"
						value={website}
						onChangeText={setWebsite}
						returnKeyType="next"
						onSubmitEditing={() => aboutRef.current?.focus()}
					/>
					<TextInput
						ref={aboutRef}
						style={[styles.input, styles.textArea, isDark && styles.inputDark]}
						placeholder="Company Description (optional)"
						placeholderTextColor="#aaa"
						multiline
						numberOfLines={4}
						value={about}
						onChangeText={setAbout}
						returnKeyType="done"
						onSubmitEditing={handleSignUp}
					/>

					<TouchableOpacity
						style={[styles.recruiterBtn, { opacity: loading ? 0.7 : 1 }]}
						onPress={handleSignUp}
						disabled={loading}
						activeOpacity={0.85}
					>
						{loading ? (
							<ActivityIndicator
								size="small"
								color="#0a2d52"
								style={{ marginRight: 12 }}
							/>
						) : (
							<Ionicons name="person-add-outline" size={22} color="#0a2d52" />
						)}
						<Text style={styles.recruiterText}>
							{loading ? "Signing Up..." : "Sign Up"}
						</Text>
					</TouchableOpacity>

					<Text style={styles.signInPrompt}>
						Already have an account?{" "}
						<Text
							style={styles.signInLink}
							onPress={() => router.push("/sign-in-recruiter")}
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
	},
	scrollContent: {
		alignItems: "center",
		padding: 20,
		paddingBottom: 40,
	},
	darkBackground: {
		backgroundColor: "#1a1a1a",
	},
	lightBackground: {
		backgroundColor: "#ffffff",
	},
	heading: {
		fontSize: 22,
		fontWeight: "600",
		fontFamily: "Montserrat-VariableFont_wght",
		marginBottom: 4,
		textAlign: "center",
	},
	subheading: {
		fontSize: 14,
		color: "#888",
		fontFamily: "Montserrat-VariableFont_wght",
		marginBottom: 28,
		textAlign: "center",
	},
	input: {
		width: "100%",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
		fontSize: 15,
		backgroundColor: "#f9f9f9",
		fontFamily: "Montserrat-VariableFont_wght",
	},
	inputDark: {
		backgroundColor: "#22243a",
		color: "#fff",
	},
	textArea: {
		minHeight: 80,
		textAlignVertical: "top",
	},
	phoneRow: {
		flexDirection: "row",
		alignItems: "center",
		width: "100%",
		marginBottom: 16,
	},
	countryPicker: {
		marginRight: 8,
	},
	callingCode: {
		fontSize: 16,
		marginRight: 8,
		color: "#222",
	},
	phoneInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 12,
		padding: 14,
		fontSize: 15,
		backgroundColor: "#f9f9f9",
		fontFamily: "Montserrat-VariableFont_wght",
		color: "#222",
	},
	recruiterBtn: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderWidth: 1.5,
		borderColor: "#0a2d52",
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 24,
		width: "100%",
		justifyContent: "center",
		marginTop: 12,
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
		fontWeight: "700",
		color: "#0a2d52",
	},
});

export default RecruiterSignUp;
