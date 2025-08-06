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
						style={{ marginBottom: 20, alignSelf: "center" }}
					/>
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
						Sign Up
					</Text>
					<Text
						style={[
							styles.subheading,
							isDark ? styles.lightGrayText : styles.darkGrayText,
						]}
					>
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

					<View
						style={[
							styles.phoneRow,
							isDark ? styles.inputDark : styles.inputLight,
						]}
					>
						<CountryPicker
							countryCode={countryCode}
							withFlag
							withCallingCode
							withFilter
							withEmoji
							onSelect={handleCountrySelect}
							containerButtonStyle={styles.countryPicker}
						/>
						<Text
							style={[
								styles.callingCode,
								isDark ? styles.whiteText : styles.darkText,
							]}
						>
							+{callingCode}
						</Text>
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
							<Ionicons
								name="person-add-outline"
								size={24}
								color="#0a2d52"
								style={{ marginRight: 12 }}
							/>
						)}
						<Text style={styles.recruiterText}>
							{loading ? "Signing Up..." : "Sign Up"}
						</Text>
					</TouchableOpacity>

					<Text
						style={[
							styles.signInPrompt,
							isDark ? styles.whiteText : styles.darkText,
						]}
					>
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
		paddingHorizontal: 20,
		paddingVertical: 20,
		paddingBottom: 40,
	},
	darkBackground: {
		backgroundColor: "#1a1a1a",
	},
	lightBackground: {
		backgroundColor: "#ffffff",
	},
	heading: {
		fontSize: 28,
		fontWeight: "700",
		marginBottom: 8,
		textAlign: "center",
		width: "90%",
		maxWidth: 500,
		alignSelf: "center",
	},
	subheading: {
		fontSize: 16,
		marginBottom: 32,
		textAlign: "center",
		width: "90%",
		maxWidth: 500,
		alignSelf: "center",
	},
	input: {
		width: "90%",
		maxWidth: 500,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 16,
		paddingVertical: 18,
		paddingHorizontal: 30,
		fontSize: 16,
		marginBottom: 20,
		backgroundColor: "#f7f7f7",
		color: "#222",
	},
	inputDark: {
		backgroundColor: "#22243a",
		color: "#fff",
		borderColor: "#444",
	},
	inputLight: {
		backgroundColor: "#f7f7f7",
	},
	textArea: {
		minHeight: 80,
		textAlignVertical: "top",
	},
	phoneRow: {
		flexDirection: "row",
		alignItems: "center",
		width: "90%",
		maxWidth: 500,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#ddd",
		paddingVertical: 16,
		paddingHorizontal: 20,
		marginBottom: 20,
		backgroundColor: "#f7f7f7",
	},
	countryPicker: {
		marginRight: 8,
	},
	callingCode: {
		fontSize: 16,
		fontWeight: "600",
		marginRight: 8,
	},
	phoneInput: {
		flex: 1,
		fontSize: 16,
		paddingVertical: 0,
		paddingHorizontal: 0,
		backgroundColor: "transparent",
		color: "#222",
	},
	recruiterBtn: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderWidth: 1.5,
		borderColor: "#0a2d52",
		borderRadius: 16,
		paddingVertical: 18,
		paddingHorizontal: 36,
		width: "90%",
		maxWidth: 500,
		alignSelf: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	recruiterText: {
		color: "#0a2d52",
		fontSize: 18,
		fontWeight: "600",
		marginLeft: 0,
	},
	signInPrompt: {
		fontSize: 14,
		marginTop: 40,
		textAlign: "center",
		width: "90%",
		maxWidth: 500,
		alignSelf: "center",
	},
	signInLink: {
		fontWeight: "700",
		color: "#0a2d52",
	},
	whiteText: {
		color: "#fff",
	},
	darkText: {
		color: "#222",
	},
	lightGrayText: {
		color: "#666",
	},
	darkGrayText: {
		color: "#444",
	},
});

export default RecruiterSignUp;
