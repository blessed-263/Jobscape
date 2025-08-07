import React, { useEffect } from "react";
import {
	ImageBackground,
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	interpolate,
	interpolateColor,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withSpring,
	withTiming,
	withDelay,
	runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { supabase } from "../../../../firebase/supabase";

type CandidateType = {
	id: string;
	full_name: string;
	avatar_url?: string | null; // still here in type but unused
	poster?: string | null;
	profession?: string;
	location?: string;
	summary?: string;
	skills?: string[];
	qualifications?: string[];
	experience?: any;
	appliedJobTitle?: string;
	applicationStatus?: string;
};

type Props = {
	item: CandidateType;
	index: number;
	actualIndex: number;
	setActualIndex: React.Dispatch<React.SetStateAction<number>>;
	onRemove: () => void;
	recruiterId: string;
};

const CandidateCardItem = ({
	item,
	index,
	actualIndex,
	onRemove,
	recruiterId,
}: Props) => {
	useEffect(() => {
		console.log(`CandidateCardItem rendering for id: ${item.id}`);
		console.log("Item data:", item);
		console.log("Avatar URL (unused):", item.avatar_url);
	}, [item]);

	const position = useSharedValue({ x: 0, y: 0 });
	const lastOffset = useSharedValue({ x: 0, y: 0 });
	const value = useSharedValue(0);

	const opacity = useSharedValue(1);
	const scaleDown = useSharedValue(1);
	const glowOpacity = useSharedValue(0);
	const glowScale = useSharedValue(1);
	const glowColor = useSharedValue<"red" | "green">("red");

	const passCandidate = async () => {
		if (!recruiterId) return;
		const { error } = await supabase.from("swipe_actions").insert({
			recruiter_id: recruiterId,
			job_seeker_id: item.id,
			direction: "left",
		});
		if (error) console.error("passCandidate error:", error.message);
	};

	const likeCandidate = async () => {
		if (!recruiterId) return;
		const { error } = await supabase.from("swipe_actions").insert({
			recruiter_id: recruiterId,
			job_seeker_id: item.id,
			direction: "right",
		});
		if (error) console.error("likeCandidate error:", error.message);
	};

	const onInfoPress = () => {
		router.push(`../candidate-details?id=${item.id}`);
	};

	const panGestureHandler = Gesture.Pan()
		.onUpdate(({ translationX, translationY }) => {
			if (actualIndex !== index) return;
			position.value = {
				x: translationX + lastOffset.value.x,
				y: translationY + lastOffset.value.y,
			};
			if (glowOpacity.value === 0) {
				glowColor.value = "red";
				glowOpacity.value = withTiming(1, { duration: 200 });
			}
		})
		.onEnd(() => {
			if (
				Math.abs(position.value.x) < 100 &&
				Math.abs(position.value.y) < 100
			) {
				lastOffset.value = { x: 0, y: 0 };
				position.value = withSpring({ x: 0, y: 0 });
				glowOpacity.value = withTiming(0, { duration: 200 });
			} else {
				lastOffset.value = { x: 0, y: 0 };
				const direction = position.value.x > 0 ? "right" : "left";
				position.value = withTiming(
					{ x: position.value.x * 12, y: position.value.y * 12 },
					{ duration: 450 },
					(finished) => {
						if (finished) {
							if (direction === "right") runOnJS(likeCandidate)();
							else runOnJS(passCandidate)();
							runOnJS(onRemove)();
						}
					}
				);
				glowOpacity.value = withTiming(0, { duration: 200 });
			}
		});

	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd(() => {
			if (actualIndex !== index) return;
			glowColor.value = "green";
			glowOpacity.value = withTiming(1, { duration: 600 });
			glowScale.value = withTiming(1.2, { duration: 800 }, () => {
				glowOpacity.value = withDelay(600, withTiming(0, { duration: 1000 }));
				glowScale.value = withDelay(600, withTiming(1, { duration: 800 }));
			});
			scaleDown.value = withTiming(0.5, { duration: 800 });
			opacity.value = withTiming(0, { duration: 800 }, () => {
				runOnJS(likeCandidate)();
				runOnJS(onRemove)();
			});
		});

	const composedGesture = Gesture.Simultaneous(panGestureHandler, doubleTap);

	const rotate = useDerivedValue(() =>
		interpolate(
			index,
			[value.value - 3, value.value - 2, value.value - 1, value.value],
			[0, 8, -8, 0]
		)
	);

	const additionalTranslate = useDerivedValue(() =>
		interpolate(
			index,
			[value.value - 3, value.value - 2, value.value - 1, value.value],
			[0, 30, -30, 0]
		)
	);

	const scale = useDerivedValue(() =>
		interpolate(
			index,
			[value.value - 3, value.value - 2, value.value - 1, value.value],
			[0.2, 0.9, 0.9, 1]
		)
	);

	const cardStyle = useAnimatedStyle(() => ({
		transform: [
			{ rotateZ: `${rotate.value}deg` },
			{ translateX: position.value.x + additionalTranslate.value },
			{ translateY: position.value.y },
			{ scale: scale.value * scaleDown.value },
		],
		opacity: opacity.value,
	}));

	const glowStyle = useAnimatedStyle(() => {
		const borderColor = interpolateColor(
			glowColor.value === "red" ? 0 : 1,
			[0, 1],
			["#FF3300", "#00FF6A"]
		);
		const backgroundColor = interpolateColor(
			glowColor.value === "red" ? 0 : 1,
			[0, 1],
			["rgba(255, 51, 0, 0.05)", "rgba(0, 255, 106, 0.05)"]
		);

		return {
			opacity: glowOpacity.value,
			borderColor,
			backgroundColor,
			shadowColor: glowColor.value === "red" ? "#FF3300" : "#00FF6A",
			shadowRadius: 30,
			shadowOpacity: 0.9,
			shadowOffset: { width: 0, height: 0 },
		};
	});

	useEffect(() => {
		value.value = withSpring(actualIndex);
	}, [actualIndex]);

	return (
		<>
			<Animated.View
				pointerEvents="none"
				style={[styles.glowCircle, glowStyle]}
			/>

			<GestureDetector gesture={composedGesture}>
				<Animated.View
					style={[{ zIndex: actualIndex + 1 }, styles.animatedView, cardStyle]}
				>
					<ImageBackground
						source={
							item.poster
								? { uri: item.poster }
								: require("../images/jobscape.png")
						}
						style={styles.imageStyle}
						imageStyle={{ borderRadius: 28 }}
					>
						{/* Profile photo removed */}

						<LinearGradient
							colors={["transparent", "rgba(0, 0, 0, 0.25)"]}
							style={[styles.gradientOverlay, { height: "40%" }]}
						/>

						<Text style={styles.jCursive}>J</Text>

						<View style={styles.imageView}>
							<View style={styles.imageTextView}>
								<Text numberOfLines={2} style={styles.titleText}>
									{item.full_name || "Name not available"}
								</Text>

								{item.profession && (
									<Text numberOfLines={1} style={styles.companyText}>
										Profession: {item.profession}
									</Text>
								)}

								{item.appliedJobTitle && (
									<Text numberOfLines={1} style={styles.appliedJobText}>
										Applied for: {item.appliedJobTitle} (
										{item.applicationStatus})
									</Text>
								)}

								{item.skills && item.skills.length > 0 && (
									<Text numberOfLines={2} style={styles.skillsText}>
										Skills: {item.skills.join(", ")}
									</Text>
								)}

								{item.qualifications && item.qualifications.length > 0 && (
									<Text numberOfLines={2} style={styles.qualificationsText}>
										Qualifications: {item.qualifications.join(", ")}
									</Text>
								)}

								{item.summary && (
									<Text numberOfLines={3} style={styles.descriptionText}>
										Summary: {item.summary}
									</Text>
								)}
							</View>
						</View>

						<TouchableOpacity style={styles.infoButton} onPress={onInfoPress}>
							<Text style={styles.infoButtonText}>i</Text>
						</TouchableOpacity>
					</ImageBackground>
				</Animated.View>
			</GestureDetector>
		</>
	);
};

const styles = StyleSheet.create({
	animatedView: {
		position: "absolute",
		width: 320,
		height: 530,
		borderRadius: 28,
		backgroundColor: "#FFF",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 16,
		overflow: "hidden",
	},
	glowCircle: {
		position: "absolute",
		top: -6,
		left: -6,
		right: -6,
		bottom: -6,
		borderRadius: 34,
		borderWidth: 3,
	},
	imageStyle: {
		width: "100%",
		height: "100%",
		overflow: "hidden",
	},
	gradientOverlay: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		borderRadius: 28,
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
	imageView: {
		flex: 1,
		justifyContent: "flex-end",
	},
	imageTextView: {
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: "rgba(0, 0, 0, 0.4)",
		borderBottomLeftRadius: 28,
		borderBottomRightRadius: 28,
		zIndex: 10,
	},
	titleText: {
		color: "#FFFFFF",
		fontSize: 22,
		fontWeight: "800",
		marginBottom: 4,
	},
	subtitleText: {
		color: "#CCCCCC",
		fontSize: 15,
		fontWeight: "600",
		marginBottom: 6,
	},
	descriptionText: {
		color: "#DDDDDD",
		fontSize: 14,
		fontWeight: "400",
		lineHeight: 20,
		marginTop: 10,
	},
	companyText: {
		color: "#AAAAAA",
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 6,
	},
	skillsText: {
		color: "#99ccff",
		fontSize: 14,
		fontWeight: "600",
		marginTop: 4,
	},
	qualificationsText: {
		color: "#a1caff",
		fontSize: 14,
		fontWeight: "600",
		marginTop: 4,
	},
	appliedJobText: {
		color: "#a0d8ff",
		fontSize: 14,
		fontWeight: "700",
		marginTop: 6,
	},
	infoButton: {
		position: "absolute",
		top: 16,
		right: 16,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 14,
		width: 28,
		height: 28,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 20,
	},
	infoButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 18,
		lineHeight: 18,
	},
	fallbackText: {
		color: "#888",
		fontSize: 14,
		fontStyle: "italic",
		marginTop: 4,
	},
});

export default CandidateCardItem;
