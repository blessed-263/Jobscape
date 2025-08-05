import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../firebase/supabase";

const ResetPasswordScreen = () => {
	const router = useRouter();
	const { access_token, refresh_token } = useLocalSearchParams();

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [validToken, setValidToken] = useState(false);

	useEffect(() => {
		if (
			access_token &&
			refresh_token &&
			typeof access_token === "string" &&
			typeof refresh_token === "string"
		) {
			supabase.auth
				.setSession({
					access_token,
					refresh_token,
				})
				.then(({ error }) => {
					if (error) {
						console.error("Session error:", error);
						Alert.alert(
							"Invalid Link",
							"This reset link is invalid or expired."
						);
					} else {
						setValidToken(true);
					}
				});
		}
	}, [access_token, refresh_token]);

	const handleReset = async () => {
		if (!newPassword || !confirmPassword) {
			Alert.alert("Error", "Please fill in both password fields.");
			return;
		}

		if (newPassword !== confirmPassword) {
			Alert.alert("Error", "Passwords do not match.");
			return;
		}

		if (newPassword.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters.");
			return;
		}

		setLoading(true);

		const { error } = await supabase.auth.updateUser({
			password: newPassword,
		});

		setLoading(false);

		if (error) {
			Alert.alert("Reset Error", error.message);
		} else {
			Alert.alert("Success", "Password has been reset. Please sign in.");
			router.replace("/sign-in-recruiter");
		}
	};

	if (!access_token || !refresh_token) {
		return (
			<View style={styles.center}>
				<Text style={styles.errorText}>Invalid reset link.</Text>
			</View>
		);
	}

	if (!validToken) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#0a2d52" />
				<Text style={styles.loadingText}>Verifying reset link...</Text>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<Text style={styles.heading}>Reset Password</Text>

			<TextInput
				style={styles.input}
				placeholder="New Password"
				secureTextEntry
				value={newPassword}
				onChangeText={setNewPassword}
			/>

			<TextInput
				style={styles.input}
				placeholder="Confirm Password"
				secureTextEntry
				value={confirmPassword}
				onChangeText={setConfirmPassword}
			/>

			<TouchableOpacity
				style={styles.button}
				onPress={handleReset}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Resetting..." : "Reset Password"}
				</Text>
			</TouchableOpacity>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		justifyContent: "center",
	},
	heading: {
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 32,
		color: "#0a2d52",
		fontFamily: "Montserrat-VariableFont_wght",
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 10,
		padding: 14,
		marginBottom: 16,
		backgroundColor: "#f7f7f7",
		fontFamily: "Montserrat-VariableFont_wght",
	},
	button: {
		backgroundColor: "#0a2d52",
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	errorText: {
		fontSize: 16,
		color: "red",
	},
	loadingText: {
		fontSize: 14,
		marginTop: 10,
		color: "#0a2d52",
	},
});

export default ResetPasswordScreen;
