import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Image,
	Animated,
	Dimensions,
	TouchableOpacity,
	AccessibilityInfo,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ConfettiCannon from "react-native-confetti-cannon";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

export default function MatchedScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();

	const companyName = (params.company_name as string) || "Company";
	const contactName = (params.contact_name as string) || "";
	const companyLogo = (params.company_logo as string) || null;
	const recruiterId = (params.recruiter_id as string) || "";

	// Animation refs
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.8)).current;
	const confettiRef = useRef<ConfettiCannon | null>(null);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(scaleAnim, {
				toValue: 1,
				friction: 6,
				useNativeDriver: true,
			}),
		]).start();

		AccessibilityInfo.announceForAccessibility(`Matched with ${companyName}`);

		const timer = setTimeout(() => {
			router.back();
		}, 5000);

		return () => {
			clearTimeout(timer);
			confettiRef.current?.stop();
		};
	}, [fadeAnim, scaleAnim, router, companyName]);

	const handleViewMatch = () => {
		if (recruiterId) {
			router.push(`/company-profile-public/${recruiterId}`);
		}
	};

	return (
		<View style={styles.container} accessibilityRole="alert" accessible>
			<ConfettiCannon
				count={80}
				origin={{ x: width / 2, y: 0 }}
				autoStart
				fadeOut
				fallSpeed={3000}
				ref={confettiRef}
			/>
			<BlurView intensity={40} tint="light" style={styles.blurCard}>
				<Animated.View
					style={[
						styles.card,
						{
							opacity: fadeAnim,
							transform: [{ scale: scaleAnim }],
						},
					]}
				>
					{companyLogo ? (
						<Image
							source={{ uri: companyLogo }}
							style={styles.logo}
							accessibilityLabel={`${companyName} logo`}
						/>
					) : (
						<View style={styles.logoFallback}>
							<Text style={styles.logoInitial}>
								{companyName.charAt(0).toUpperCase()}
							</Text>
						</View>
					)}

					<Text style={styles.matchText}>🎉 It's a Match! 🎉</Text>
					<Text style={styles.companyName}>{companyName}</Text>

					{contactName ? (
						<Text style={styles.contactName}>Recruiter: {contactName}</Text>
					) : null}

					<Text style={styles.note}>
						You and the recruiter liked each other.
					</Text>

					{recruiterId ? (
						<TouchableOpacity style={styles.button} onPress={handleViewMatch}>
							<Text style={styles.buttonText}>View Match</Text>
						</TouchableOpacity>
					) : null}
				</Animated.View>
			</BlurView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
		padding: 24,
	},
	blurCard: {
		borderRadius: 24,
		overflow: "hidden",
	},
	card: {
		backgroundColor: "#ffffffcc",
		borderRadius: 24,
		paddingVertical: 48,
		paddingHorizontal: 32,
		width: "90%",
		maxWidth: 400,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 12,
	},
	logo: {
		width: 100,
		height: 100,
		borderRadius: 20,
		marginBottom: 28,
	},
	logoFallback: {
		width: 100,
		height: 100,
		borderRadius: 20,
		backgroundColor: "#0a2d52",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 28,
	},
	logoInitial: {
		color: "#fff",
		fontWeight: "900",
		fontSize: 48,
		letterSpacing: 2,
	},
	matchText: {
		fontSize: 32,
		fontWeight: "900",
		color: "#0a2d52",
		marginBottom: 20,
		textAlign: "center",
	},
	companyName: {
		fontSize: 24,
		fontWeight: "700",
		color: "#0a2d52",
		marginBottom: 12,
		textAlign: "center",
	},
	contactName: {
		fontSize: 18,
		fontWeight: "600",
		color: "#4b5563",
		marginBottom: 24,
		textAlign: "center",
	},
	note: {
		fontSize: 17,
		color: "#6b7280",
		textAlign: "center",
		lineHeight: 24,
		marginBottom: 24,
	},
	button: {
		backgroundColor: "#0a2d52",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 10,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});
