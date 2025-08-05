import React, { useState } from "react";
import {
	SafeAreaView,
	Text,
	TextInput,
	TouchableOpacity,
	Alert,
	useColorScheme,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";

const ForgotPasswordPage: React.FC = () => {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";
	const [email, setEmail] = useState("");

	const handleSubmit = async () => {
		if (!email.trim()) {
			Alert.alert("Error", "Please enter your email address.");
			return;
		}

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: "jobscape://reset-password",
			});

			if (error) {
				console.error("Reset error:", error.message);
				Alert.alert("Reset Failed", error.message);
				return;
			}

			Alert.alert(
				"Success",
				"If this email is registered, you will receive password reset instructions shortly."
			);
			router.back();
		} catch (err: any) {
			console.error("Unexpected Error:", err.message);
			Alert.alert("Error", "Something went wrong. Please try again.");
		}
	};

	return (
		<SafeAreaView
			style={[styles.container, isDark ? styles.dark : styles.light]}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={styles.innerContainer}
			>
				<Text style={styles.heading}>Forgot Password</Text>

				<Text style={styles.subheading}>
					Enter your email address below to receive password reset instructions.
				</Text>

				<TextInput
					style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
					placeholder="Email address"
					placeholderTextColor={isDark ? "#888" : "#aaa"}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					value={email}
					onChangeText={setEmail}
				/>

				<TouchableOpacity
					style={styles.submitBtn}
					onPress={handleSubmit}
					activeOpacity={0.85}
				>
					<Text style={styles.submitBtnText}>Send Reset Link</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.backBtn}
					onPress={() => router.back()}
					activeOpacity={0.85}
				>
					<Text style={styles.backBtnText}>Back to Sign In</Text>
				</TouchableOpacity>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
		paddingVertical: 30,
	},
	dark: {
		backgroundColor: "#121212",
	},
	light: {
		backgroundColor: "#ffffff",
	},
	innerContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	heading: {
		fontSize: 25,
		fontWeight: "500",
		fontFamily: "Montserrat-VariableFont_wght",
		color: "#0a2d52",
		marginBottom: 12,
		textAlign: "center",
	},
	subheading: {
		fontSize: 13,
		fontFamily: "Montserrat-VariableFont_wght",
		color: "#4a4a4a",
		marginBottom: 32,
		textAlign: "center",
		paddingHorizontal: 10,
	},
	input: {
		width: "90%",
		maxWidth: 500,
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderRadius: 10,
		fontSize: 16,
		marginBottom: 20,
		fontFamily: "Montserrat-VariableFont_wght",
	},
	inputLight: {
		backgroundColor: "#f7f7f7",
		color: "#222",
	},
	inputDark: {
		backgroundColor: "#22243a",
		color: "#fff",
	},
	submitBtn: {
		backgroundColor: "#0a2d52",
		borderRadius: 12,
		paddingVertical: 15,
		paddingHorizontal: 24,
		alignItems: "center",
		marginBottom: 16,
		alignSelf: "center",
	},
	submitBtnText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		fontFamily: "Montserrat-VariableFont_wght",
		textAlign: "center",
	},
	backBtn: {
		marginTop: 8,
	},
	backBtnText: {
		color: "#0a2d52",
		fontSize: 12,
		fontWeight: "600",
		fontFamily: "Montserrat-VariableFont_wght",
		textDecorationLine: "underline",
	},
});

export default ForgotPasswordPage;
