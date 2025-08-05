import React, { useEffect } from "react";
import {
	Image,
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

import { supabase } from "../../../../firebase/supabase"; // adjust your import path

type JobType = {
	id: string;
	title: string;
	description?: string;
	poster?: string | null;
	subtitle?: string;
	badge?: string;
	recruiter_id: string; // added recruiter_id to track recruiter for swipe_actions
	recruiters?: {
		company_name?: string;
		company_logo?: string;
	};
};

type Props = {
	item: JobType;
	index: number;
	actualIndex: number;
	setActualIndex: React.Dispatch<React.SetStateAction<number>>;
	onRemove: () => void;
	jobSeekerId: string; // pass logged-in user's job_seeker.id here
};

const StackCardItem = ({
	item,
	index,
	actualIndex,
	onRemove,
	jobSeekerId,
}: Props) => {
	const position = useSharedValue({ x: 0, y: 0 });
	const lastOffset = useSharedValue({ x: 0, y: 0 });
	const value = useSharedValue(0);
	const opacity = useSharedValue(1);
	const scaleDown = useSharedValue(1);
	const glowOpacity = useSharedValue(0);
	const glowScale = useSharedValue(1);
	const glowColor = useSharedValue<"red" | "green">("red");

	// DB call: Apply to job (insert into applications)
	const applyToJob = async () => {
		if (!jobSeekerId) {
			console.warn("No jobSeekerId available");
			return;
		}

		// ✅ Check if application already exists
		const { data: existing, error: checkError } = await supabase
			.from("applications")
			.select("id")
			.eq("job_id", item.id)
			.eq("job_seeker_id", jobSeekerId)
			.single();

		if (checkError && checkError.code !== "PGRST116") {
			console.error("Error checking existing application:", checkError.message);
			return;
		}

		if (existing) {
			console.log("Already applied to this job.");
			return;
		}

		// 🟢 Proceed to apply if no record found
		const { error } = await supabase.from("applications").insert({
			job_id: item.id,
			job_seeker_id: jobSeekerId,
			status: "pending",
		});

		if (error) {
			console.error("Error applying to job:", error.message);
		} else {
			console.log("Applied to job:", item.title);
		}
	};

	// DB call: Pass job (insert into swipe_actions with direction left)
	const passJob = async () => {
		if (!jobSeekerId) {
			console.warn("No jobSeekerId available");
			return;
		}
		const { error } = await supabase.from("swipe_actions").insert({
			recruiter_id: item.recruiter_id,
			job_seeker_id: jobSeekerId,
			direction: "left",
		});
		if (error) {
			console.error("Error passing job:", error.message);
		} else {
			console.log("Passed job:", item.title);
		}
	};

	const onInfoPress = () => {
		router.push(`/job-details?id=${item.id}`);
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
				position.value = withTiming(
					{ x: position.value.x * 12, y: position.value.y * 12 },
					{ duration: 450 },
					(finished) => {
						if (finished) {
							runOnJS(passJob)();
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
				runOnJS(applyToJob)();
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
								: require("../images/jobscape.png") // fallback image
						}
						style={styles.imageStyle}
						imageStyle={{ borderRadius: 28 }}
					>
						<LinearGradient
							colors={["transparent", "rgba(0, 0, 0, 0.25)"]}
							style={[styles.gradientOverlay, { height: "40%" }]}
						/>

						<Text style={styles.jCursive}>J</Text>

						<View style={styles.imageView}>
							<View style={styles.imageTextView}>
								<Text numberOfLines={2} style={styles.titleText}>
									{item.title}
								</Text>

								{item.recruiters?.company_name && (
									<View style={styles.companyContainer}>
										{item.recruiters.company_logo && (
											<Image
												source={{ uri: item.recruiters.company_logo }}
												style={styles.companyLogo}
												resizeMode="contain"
											/>
										)}
										<Text numberOfLines={1} style={styles.companyText}>
											{item.recruiters.company_name}
										</Text>
									</View>
								)}

								{item.subtitle && (
									<Text numberOfLines={1} style={styles.subtitleText}>
										{item.subtitle}
									</Text>
								)}

								{item.badge && (
									<View style={styles.badge}>
										<Text style={styles.badgeText}>{item.badge}</Text>
									</View>
								)}

								{item.description && (
									<Text numberOfLines={3} style={styles.descriptionText}>
										{item.description}
									</Text>
								)}
							</View>
						</View>

						<TouchableOpacity
							style={styles.infoButton}
							onPress={onInfoPress}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
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
	badge: {
		backgroundColor: "#1a84e0",
		alignSelf: "flex-start",
		borderRadius: 16,
		paddingVertical: 4,
		paddingHorizontal: 10,
		marginTop: 4,
	},
	badgeText: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "600",
	},
	companyContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 6,
	},
	companyLogo: {
		width: 20,
		height: 20,
		marginRight: 6,
		borderRadius: 4,
	},
	companyText: {
		color: "#AAAAAA",
		fontSize: 14,
		fontWeight: "500",
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
		zIndex: 10,
	},
	infoButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 18,
		lineHeight: 18,
	},
});

export default StackCardItem;
