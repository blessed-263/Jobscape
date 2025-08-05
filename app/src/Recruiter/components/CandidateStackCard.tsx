import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	Extrapolate,
	interpolate,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withSpring,
	withTiming,
	withDelay,
	runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { data } from "../data/Candidates";

type Props = {
	item: (typeof data)[0];
	index: number;
	actualIndex: number;
	setActualIndex: React.Dispatch<React.SetStateAction<number>>;
	onRemove: () => void;
};

const StackCardItem = ({ item, index, actualIndex, onRemove }: Props) => {
	const position = useSharedValue({ x: 0, y: 0 });
	const lastOffset = useSharedValue({ x: 0, y: 0 });
	const value = useSharedValue(data.length || 0);
	const opacity = useSharedValue(1);
	const scaleDown = useSharedValue(1);

	const glowOpacity = useSharedValue(0);
	const glowScale = useSharedValue(1);

	const panGestureHandler = Gesture.Pan()
		.runOnJS(true)
		.onUpdate(({ translationX, translationY }) => {
			if (actualIndex !== index) return;
			position.value = {
				x: translationX + lastOffset.value.x,
				y: translationY + lastOffset.value.y,
			};
		})
		.onEnd(() => {
			if (
				Math.abs(position.value.x) < 100 &&
				Math.abs(position.value.y) < 100
			) {
				lastOffset.value = { x: 0, y: 0 };
				position.value = withSpring({ x: 0, y: 0 });
			} else {
				lastOffset.value = { x: 0, y: 0 };
				position.value = withTiming(
					{ x: position.value.x * 12, y: position.value.y * 12 },
					{ duration: 450 },
					(finished) => finished && runOnJS(onRemove)()
				);
			}
		});

	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd(() => {
			if (actualIndex !== index) return;
			glowOpacity.value = withTiming(1, { duration: 600 });
			glowScale.value = withTiming(1.2, { duration: 800 }, () => {
				glowOpacity.value = withDelay(600, withTiming(0, { duration: 1000 }));
				glowScale.value = withDelay(600, withTiming(1, { duration: 800 }));
			});
			scaleDown.value = withTiming(0.5, { duration: 800 });
			opacity.value = withTiming(0, { duration: 800 }, () =>
				runOnJS(onRemove)()
			);
		});

	const composedGesture = Gesture.Simultaneous(panGestureHandler, doubleTap);

	const rotate = useDerivedValue(() => {
		return interpolate(
			index,
			[value.value - 3, value.value - 2, value.value - 1, value.value],
			[0, 8, -8, 0],
			Extrapolate.CLAMP
		);
	});

	const additionalTranslate = useDerivedValue(() => {
		return interpolate(
			index,
			[value.value - 3, value.value - 2, value.value - 1, value.value],
			[0, 30, -30, 0],
			Extrapolate.CLAMP
		);
	});

	const scale = useDerivedValue(() => {
		return interpolate(
			index,
			[value.value - 3, value.value - 2, value.value - 1, value.value],
			[0.2, 0.9, 0.9, 1],
			Extrapolate.CLAMP
		);
	});

	const cardStyle = useAnimatedStyle(() => ({
		transform: [
			{ rotateZ: `${rotate.value}deg` },
			{ translateX: position.value.x + additionalTranslate.value },
			{ translateY: position.value.y },
			{ scale: scale.value * scaleDown.value },
		],
		opacity: opacity.value,
	}));

	const glowStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value,
		transform: [{ scale: glowScale.value }],
	}));

	useEffect(() => {
		value.value = withSpring(actualIndex);
	}, [actualIndex]);

	return (
		<GestureDetector gesture={composedGesture}>
			<Animated.View
				style={[{ zIndex: actualIndex + 1 }, styles.animatedView, cardStyle]}
			>
				<Animated.View style={[styles.glowCircle, glowStyle]} />
				<Image source={item.poster} style={styles.poster} />
				<LinearGradient
					colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.8)"]}
					style={styles.gradientOverlay}
				/>
				<Text style={styles.jCursive}>J</Text>

				<View style={styles.contentWrapper}>
					<Image source={item.profile} style={styles.avatar} />
					<Text style={styles.name}>{item.title}</Text>
					<Text style={styles.subtitle}>{item.subtitle}</Text>

					{item.badge && (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{item.badge}</Text>
						</View>
					)}

					{item.description && (
						<Text numberOfLines={3} style={styles.description}>
							{item.description}
						</Text>
					)}

					{item.skills?.length > 0 && (
						<View style={styles.skillsContainer}>
							{item.skills.slice(0, 4).map((skill, idx) => (
								<View style={styles.skillBadge} key={idx}>
									<Text style={styles.skillText}>{skill}</Text>
								</View>
							))}
						</View>
					)}

					{item.qualifications?.length > 0 && (
						<View style={styles.qualificationsContainer}>
							<Text style={styles.qualificationsTitle}>Top Qualifications</Text>
							{item.qualifications.slice(0, 3).map((q, idx) => (
								<Text key={idx} style={styles.qualificationItem}>
									• {q}
								</Text>
							))}
						</View>
					)}
				</View>
			</Animated.View>
		</GestureDetector>
	);
};

const styles = StyleSheet.create({
	animatedView: {
		position: "absolute",
		width: 320,
		height: 530,
		borderRadius: 28,
		overflow: "hidden",
		backgroundColor: "#222",
		elevation: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
	},
	poster: {
		position: "absolute",
		width: "100%",
		height: "100%",
		resizeMode: "cover",
	},
	gradientOverlay: {
		...StyleSheet.absoluteFillObject,
	},
	jCursive: {
		position: "absolute",
		top: 16,
		left: 16,
		fontSize: 120,
		color: "rgba(255, 255, 255, 0.55)",
		transform: [{ rotate: "10deg" }],
		fontFamily: "Cookie_400Regular",
	},
	glowCircle: {
		position: "absolute",
		top: -10,
		left: -10,
		right: -10,
		bottom: -10,
		borderRadius: 34,
		borderWidth: 3,
		borderColor: "#00FF6A",
		backgroundColor: "rgba(0, 255, 106, 0.1)", // stronger glow background
		shadowColor: "#00FF6A",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 1, // increased opacity
		shadowRadius: 40, // increased radius for softer glow
		elevation: 20, // Android shadow
		zIndex: 99999, // very high zIndex
	},
	contentWrapper: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	avatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 2,
		borderColor: "#fff",
		marginBottom: 16,
		shadowColor: "#00FF6A",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.9,
		shadowRadius: 10,
		elevation: 10,
	},
	name: {
		fontSize: 22,
		fontWeight: "700",
		color: "#fff",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 15,
		color: "#ddd",
		marginBottom: 10,
	},
	badge: {
		backgroundColor: "#1a84e0",
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginBottom: 10,
	},
	badgeText: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "600",
	},
	description: {
		color: "#eee",
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
		paddingHorizontal: 10,
		marginBottom: 10,
	},
	skillsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		marginBottom: 10,
	},
	skillBadge: {
		backgroundColor: "#444",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		margin: 4,
	},
	skillText: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "500",
	},
	qualificationsContainer: {
		alignItems: "center",
	},
	qualificationsTitle: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 14,
		marginBottom: 4,
	},
	qualificationItem: {
		color: "#ccc",
		fontSize: 13,
		textAlign: "center",
		lineHeight: 18,
	},
});

export default StackCardItem;
