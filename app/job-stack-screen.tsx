import React, { useEffect, useState } from "react";
import {
	StyleSheet,
	View,
	Text,
	ActivityIndicator,
	Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts, Cookie_400Regular } from "@expo-google-fonts/cookie";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import StackCardItem from "./src/JobSeeker/components/JobsStackCard"; // adjust path if needed
import { supabase } from "../firebase/supabase"; // update path as needed
import { Session } from "@supabase/supabase-js";
import LottieView from "lottie-react-native";

SplashScreen.preventAutoHideAsync();

type JobType = {
	id: string;
	title: string;
	description?: string;
	poster?: string | null;
	subtitle?: string;
	badge?: string;
	recruiter_id: string;
	recruiters?: {
		company_name?: string;
		company_logo?: string;
	};
};

export default function AnimationStackCard() {
	const [fontsLoaded] = useFonts({ Cookie_400Regular });
	const [cardData, setCardData] = useState<JobType[]>([]);
	const [actualIndex, setActualIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [jobSeekerId, setJobSeekerId] = useState<string | null>(null);

	const watermarkOpacity = useSharedValue(0);

	useEffect(() => {
		if (fontsLoaded) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded]);

	// Fetch logged-in user's job seeker profile ID
	useEffect(() => {
		const fetchJobSeekerProfile = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) {
				console.warn("User not logged in");
				setJobSeekerId(null);
				return;
			}

			const userId = session.user.id;

			// Query job_seekers table to get job seeker id
			const { data, error } = await supabase
				.from("job_seekers")
				.select("id")
				.eq("id", userId)
				.single();

			if (error) {
				console.error("Error fetching job seeker profile:", error.message);
				setJobSeekerId(null);
			} else {
				setJobSeekerId(data?.id || null);
			}
		};

		fetchJobSeekerProfile();
	}, []);
	// Fetch jobs from Supabase, excluding already-applied ones
	useEffect(() => {
		const fetchJobs = async () => {
			if (!jobSeekerId) return;

			setLoading(true);

			// 1. Get list of job IDs the user has already applied to
			const { data: appliedJobs, error: appliedError } = await supabase
				.from("applications")
				.select("job_id")
				.eq("job_seeker_id", jobSeekerId);

			if (appliedError) {
				console.error("Error fetching applications:", appliedError.message);
				setCardData([]);
				setLoading(false);
				return;
			}

			const appliedJobIds = appliedJobs?.map((app) => app.job_id) || [];

			// 2. Get all jobs that are NOT in the applied list
			let query = supabase
				.from("jobs")
				.select(`*, recruiters:recruiter_id(id, company_name, company_logo)`)
				.order("created_at", { ascending: false })
				.limit(30);

			// Only exclude if there are already applied jobs
			if (appliedJobIds.length > 0) {
				query = query.not("id", "in", `(${appliedJobIds.join(",")})`);
			}

			const { data, error } = await query;

			if (error) {
				console.error("Error fetching jobs:", error.message);
				setCardData([]);
			} else {
				setCardData(data || []);
				setActualIndex((data || []).length - 1);
			}
			setLoading(false);
		};

		fetchJobs();
	}, [jobSeekerId]);

	useEffect(() => {
		if (cardData.length === 0 && !loading) {
			watermarkOpacity.value = withTiming(1, { duration: 500 });
		} else {
			watermarkOpacity.value = withTiming(0, { duration: 300 });
		}
	}, [cardData, loading]);

	const removeCard = (indexToRemove: number) => {
		setCardData((prev) => prev.filter((_, i) => i !== indexToRemove));
		setActualIndex((prev) => prev - 1);
	};

	const animatedWatermarkStyle = useAnimatedStyle(() => ({
		opacity: watermarkOpacity.value,
	}));

	if (!fontsLoaded || loading || jobSeekerId === null) {
		return (
			<View style={styles.loadingContainer}>
				<LottieView
					source={require("../assets/animations/loading.json")} // <-- adjust the path to your Lottie JSON file
					autoPlay
					loop
					style={{ width: 150, height: 150 }}
				/>
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={styles.root}>
			<LinearGradient
				colors={["#c1e8ff", "#ffffff"]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={styles.gradient}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.logoJ}>J</Text>
					<Text style={styles.logoText}>Jobscape</Text>
				</View>

				{/* Cards */}
				<View style={styles.stackContainer}>
					{cardData.map((item, index) => (
						<StackCardItem
							key={item.id}
							item={item}
							index={index}
							actualIndex={actualIndex}
							setActualIndex={setActualIndex}
							onRemove={() => removeCard(index)}
							jobSeekerId={jobSeekerId}
						/>
					))}
				</View>

				{/* Watermark when no cards */}
				<Animated.View
					style={[styles.watermarkOverlay, animatedWatermarkStyle]}
					pointerEvents="none"
				>
					<Text style={styles.watermarkText}>
						You're all caught up!{"\n"}Check back later for more jobs.
					</Text>
				</Animated.View>
			</LinearGradient>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	gradient: {
		flex: 1,
		paddingTop: Platform.OS === "android" ? 40 : 60,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
		gap: 10,
	},
	logoJ: {
		fontSize: 60,
		color: "#0a2d52",
		fontFamily: "Cookie_400Regular",
		transform: [{ rotate: "-10deg" }],
	},
	logoText: {
		fontSize: 28,
		fontWeight: "700",
		color: "#0a2d52",
		letterSpacing: 1,
	},
	stackContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingBottom: 30,
	},
	watermarkOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 30,
		backgroundColor: "rgba(255, 255, 255, 0.9)",
	},
	watermarkText: {
		textAlign: "center",
		fontSize: 18,
		color: "#0a2d52",
		fontWeight: "600",
		fontStyle: "italic",
		lineHeight: 28,
	},
});
