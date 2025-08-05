import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import StackCardItem from "./src/Recruiter/components/CandidateStackCard"; // <-- assuming candidate card
import { data as originalData } from "./src/Recruiter/data/Candidates"; // <-- assuming candidates data
import { useFonts, Cookie_400Regular } from "@expo-google-fonts/cookie";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";

// Keep splash until fonts are loaded
SplashScreen.preventAutoHideAsync();

const CandidateScreen = () => {
	const [fontsLoaded] = useFonts({ Cookie_400Regular });
	const [cardData, setCardData] = React.useState(originalData);
	const [actualIndex, setActualIndex] = React.useState(originalData.length - 1);

	const watermarkOpacity = useSharedValue(0);

	useEffect(() => {
		if (fontsLoaded) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded]);

	useEffect(() => {
		// Fade in watermark if stack is empty
		if (cardData.length === 0) {
			watermarkOpacity.value = withTiming(1, { duration: 500 });
		} else {
			watermarkOpacity.value = withTiming(0, { duration: 300 });
		}
	}, [cardData]);

	const removeCard = (indexToRemove: number) => {
		setCardData((prev) => prev.filter((_, i) => i !== indexToRemove));
		setActualIndex((prev) => prev - 1);
	};

	const animatedWatermarkStyle = useAnimatedStyle(() => ({
		opacity: watermarkOpacity.value,
	}));

	if (!fontsLoaded) return null;

	return (
		<GestureHandlerRootView style={styles.gestureHandlerView}>
			<LinearGradient
				colors={["#06496aff", "#b7dafdff"]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={styles.gradientBackground}
			>
				<View style={styles.logoContainer}>
					<Text style={styles.logoJ}>J</Text>
					<Text style={styles.logoText}>Browse Candidates</Text>
				</View>

				<View style={styles.container}>
					{cardData.map((item, index) => (
						<StackCardItem
							key={index}
							item={item}
							index={index}
							actualIndex={actualIndex}
							setActualIndex={setActualIndex}
							onRemove={() => removeCard(index)}
						/>
					))}
				</View>

				{/* ✅ Empty Stack Message */}
				<Animated.View
					style={[styles.watermarkOverlay, animatedWatermarkStyle]}
				>
					<Text style={styles.watermarkText}>
						You've viewed all candidates.{"\n"}Come back later for fresh talent.
					</Text>
				</Animated.View>
			</LinearGradient>
		</GestureHandlerRootView>
	);
};

export default CandidateScreen;

const styles = StyleSheet.create({
	gestureHandlerView: {
		flex: 1,
	},
	gradientBackground: {
		flex: 1,
	},
	logoContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 60,
		gap: 10,
	},
	logoJ: {
		fontSize: 60,
		fontWeight: "400",
		color: "#FFFFFF",
		fontFamily: "Cookie_400Regular",
		transform: [{ rotate: "-10deg" }],
	},
	logoText: {
		fontSize: 26,
		fontWeight: "700",
		color: "#FFFFFF",
		letterSpacing: 1,
	},
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingBottom: 40,
	},
	watermarkOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		pointerEvents: "none",
		paddingHorizontal: 30,
	},
	watermarkText: {
		textAlign: "center",
		fontSize: 18,
		color: "rgba(255, 255, 255, 0.6)",
		fontWeight: "600",
		fontStyle: "italic",
		lineHeight: 26,
	},
});
