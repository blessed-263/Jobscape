import React, { useEffect, useRef } from "react";
import {
	View,
	useColorScheme,
	Animated,
	StyleSheet,
	Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useFonts, Cookie_400Regular } from "@expo-google-fonts/cookie";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat";

const { width } = Dimensions.get("window");

const JobscapeLogoPage = () => {
	const isDarkMode = useColorScheme() === "dark";
	const router = useRouter();

	const fadeAnim = useRef(new Animated.Value(0)).current;

	const [fontsLoaded] = useFonts({
		Cookie_400Regular,
		Montserrat_600SemiBold,
	});

	// Always call hooks before any return
	useEffect(() => {
		if (!fontsLoaded) return;

		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 2500,
			useNativeDriver: true,
		}).start();

		const timer = setTimeout(() => {
			router.replace("/get-started");
		}, 4000);

		return () => clearTimeout(timer);
	}, [fontsLoaded, fadeAnim, router]);

	if (!fontsLoaded) {
		return null;
	}

	const containerStyle = isDarkMode
		? styles.darkContainer
		: styles.lightContainer;
	const textStyle = isDarkMode ? styles.darkText : styles.lightText;

	return (
		<View style={[styles.container, containerStyle]}>
			<Animated.Text style={[styles.logoJ, textStyle, { opacity: fadeAnim }]}>
				J
			</Animated.Text>
			<Animated.Text style={[styles.title, textStyle, { opacity: fadeAnim }]}>
				JOBSCAPE
			</Animated.Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	logoJ: {
		fontSize: 140,
		fontFamily: "Cookie_400Regular",
		width: width * 0.9,
		textAlign: "center",
		paddingHorizontal: 20,
		marginBottom: 10,
		lineHeight: 180,
		backgroundColor: "transparent",
	},
	title: {
		fontSize: 28,
		fontFamily: "Montserrat_600SemiBold",
		fontWeight: "600",
		letterSpacing: 6,
		textTransform: "uppercase",
		textAlign: "center",
	},
	lightContainer: {
		backgroundColor: "#ffffff",
	},
	darkContainer: {
		backgroundColor: "#1a1a1a",
	},
	lightText: {
		color: "#0a2d52",
	},
	darkText: {
		color: "#ffffff",
	},
});

export default JobscapeLogoPage;
