import React, { useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	useColorScheme,
	SafeAreaView,
	StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
	useSharedValue,
	withTiming,
	useAnimatedStyle,
	Easing,
	withDelay,
} from "react-native-reanimated";

const GetStartedPage = () => {
	const isDarkMode = useColorScheme() === "dark";
	const router = useRouter();

	// Shared values for animations
	const titleOpacity = useSharedValue(0);
	const subtitleTranslateY = useSharedValue(40);
	const subtitleOpacity = useSharedValue(0);
	const buttonsOpacity = useSharedValue(0);
	const buttonsScale = useSharedValue(0.9);

	// Animations on mount
	useEffect(() => {
		titleOpacity.value = withTiming(1, { duration: 600 });
		subtitleTranslateY.value = withTiming(0, {
			duration: 800,
			easing: Easing.out(Easing.exp),
		});
		subtitleOpacity.value = withTiming(1, { duration: 800 });

		buttonsOpacity.value = withDelay(300, withTiming(1, { duration: 900 }));
		buttonsScale.value = withTiming(1, {
			duration: 900,
			easing: Easing.out(Easing.exp),
		});
	}, []);

	const titleStyle = useAnimatedStyle(() => ({
		opacity: titleOpacity.value,
	}));

	const subtitleStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: subtitleTranslateY.value }],
		opacity: subtitleOpacity.value,
	}));

	const buttonGroupStyle = useAnimatedStyle(() => ({
		opacity: buttonsOpacity.value,
		transform: [{ scale: buttonsScale.value }],
	}));

	return (
		<SafeAreaView
			style={[
				styles.container,
				isDarkMode ? styles.darkBackground : styles.lightBackground,
			]}
		>
			<Animated.Text
				style={[
					styles.title,
					isDarkMode ? styles.whiteText : styles.darkText,
					titleStyle,
				]}
			>
				JOBSCAPE
			</Animated.Text>

			<Animated.Text
				style={[
					styles.subtitle,
					isDarkMode ? styles.whiteText : styles.darkText,
					subtitleStyle,
				]}
			>
				Discover your next opportunity
			</Animated.Text>

			<Animated.View style={[styles.buttonGroup, buttonGroupStyle]}>
				<TouchableOpacity
					style={styles.primaryButton}
					onPress={() => router.push("/sign-in")}
					activeOpacity={0.8}
				>
					<Text style={styles.primaryButtonText}>Sign In</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.secondaryButton}
					onPress={() => router.push("/sign-up")}
					activeOpacity={0.8}
				>
					<Text style={styles.secondaryButtonText}>Sign Up</Text>
				</TouchableOpacity>
			</Animated.View>
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
		fontSize: 36,
		fontWeight: "700",
		letterSpacing: 1.2,
		marginBottom: 12,
		fontFamily: "Montserrat-VariableFont_wght",
	},

	subtitle: {
		fontSize: 18,
		marginBottom: 48,
		fontFamily: "Montserrat-VariableFont_wght",
		textAlign: "center",
		lineHeight: 26,
		paddingHorizontal: 8,
	},

	buttonGroup: {
		alignItems: "center",
		gap: 16,
		width: "100%",
	},

	primaryButton: {
		backgroundColor: "#0a2d52",
		borderRadius: 16,
		paddingVertical: 18,
		paddingHorizontal: 48,
		alignItems: "center",
		width: "90%",
	},

	primaryButtonText: {
		color: "#ffffff",
		fontSize: 18,
		fontWeight: "600",
		fontFamily: "Montserrat-VariableFont_wght",
	},

	secondaryButton: {
		borderColor: "#0a2d52",
		borderWidth: 1.5,
		borderRadius: 16,
		paddingVertical: 18,
		paddingHorizontal: 48,
		alignItems: "center",
		width: "90%",
	},

	secondaryButtonText: {
		color: "#0a2d52",
		fontSize: 18,
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
