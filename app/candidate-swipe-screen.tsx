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
import StackCardItem from "./src/Recruiter/components/CandidateStackCard";
import { supabase } from "../firebase/supabase";
import LottieView from "lottie-react-native";

SplashScreen.preventAutoHideAsync();

type JobSeekerProfileType = {
	id: string;
	full_name: string;
	avatar_url?: string;
	profession?: string;
	summary?: string;
	skills?: string[];
	qualifications?: string[];
	experience?: any;
	applicationId?: string;
	appliedJobId?: string;
	appliedJobTitle?: string;
	applicationStatus?: string;
	profile?: {
		summary?: string;
		skills?: string[];
		qualifications?: string[];
		experience?: any;
	};
};

export default function RecruiterSwipeStackCard() {
	const [fontsLoaded] = useFonts({ Cookie_400Regular });
	const [cardData, setCardData] = useState<JobSeekerProfileType[]>([]);
	const [actualIndex, setActualIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [recruiterId, setRecruiterId] = useState<string | null>(null);
	const watermarkOpacity = useSharedValue(0);

	useEffect(() => {
		if (fontsLoaded) SplashScreen.hideAsync();
	}, [fontsLoaded]);

	useEffect(() => {
		const fetchRecruiterProfile = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session) return;
			setRecruiterId(session.user.id);
		};
		fetchRecruiterProfile();
	}, []);

	useEffect(() => {
		const fetchCandidatesWithPendingApplications = async () => {
			if (!recruiterId) return;
			setLoading(true);

			try {
				const { data: jobs, error: jobsError } = await supabase
					.from("jobs")
					.select("id, title")
					.eq("recruiter_id", recruiterId);

				if (jobsError) throw jobsError;

				const jobIds = jobs?.map((job) => job.id) || [];
				if (jobIds.length === 0) {
					setCardData([]);
					setLoading(false);
					return;
				}

				const { data: applications, error: applicationsError } = await supabase
					.from("applications")
					.select("id, job_seeker_id, job_id, status")
					.in("job_id", jobIds)
					.eq("status", "pending");

				if (applicationsError) throw applicationsError;
				if (!applications || applications.length === 0) {
					setCardData([]);
					setLoading(false);
					return;
				}

				const jobSeekerIds = Array.from(
					new Set(applications.map((app) => app.job_seeker_id))
				);

				const { data: jobSeekerData, error: jobSeekersError } = await supabase
					.from("job_seekers_with_profiles")
					.select("*")
					.in("id", jobSeekerIds)
					.limit(100);

				if (jobSeekersError) throw jobSeekersError;

				const jobMap = new Map(jobs.map((job) => [job.id, job.title]));
				const jobSeekerMap = new Map(jobSeekerData.map((js) => [js.id, js]));

				const cards = applications
					.map((app) => {
						const candidate = jobSeekerMap.get(app.job_seeker_id);
						if (!candidate) return null;

						const profile = {
							summary: candidate.summary || "No summary available",
							skills: candidate.skills || [],
							qualifications: candidate.qualifications || [],
							experience: candidate.experience || [],
						};

						return {
							...candidate,
							profile,
							applicationId: app.id,
							appliedJobId: app.job_id,
							appliedJobTitle: jobMap.get(app.job_id) || "Unknown Job",
							applicationStatus: app.status,
							skills: profile.skills,
							qualifications: profile.qualifications,
							summary: profile.summary,
						};
					})
					.filter(Boolean) as JobSeekerProfileType[];

				setCardData(cards);
				setActualIndex(cards.length - 1);
				setLoading(false);
			} catch (error) {
				console.error("Error fetching candidates:", error);
				setCardData([]);
				setLoading(false);
			}
		};

		fetchCandidatesWithPendingApplications();
	}, [recruiterId]);

	useEffect(() => {
		watermarkOpacity.value = withTiming(
			cardData.length === 0 && !loading ? 1 : 0,
			{ duration: 500 }
		);
	}, [cardData, loading]);

	const removeCard = (indexToRemove: number) => {
		setCardData((prev) => prev.filter((_, i) => i !== indexToRemove));
		setActualIndex((prev) => prev - 1);
	};

	const animatedWatermarkStyle = useAnimatedStyle(() => ({
		opacity: watermarkOpacity.value,
	}));

	if (!fontsLoaded || loading || recruiterId === null) {
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
				<View style={styles.header}>
					<Text style={styles.logoJ}>J</Text>
					<Text style={styles.logoText}>Jobscape</Text>
				</View>

				<View style={styles.stackContainer}>
					{cardData.map((item, index) => (
						<StackCardItem
							key={item.applicationId || item.id}
							item={item}
							index={index}
							actualIndex={actualIndex}
							setActualIndex={setActualIndex}
							onRemove={() => removeCard(index)}
							recruiterId={recruiterId}
						/>
					))}
				</View>

				<Animated.View
					style={[styles.watermarkOverlay, animatedWatermarkStyle]}
					pointerEvents="none"
				>
					<Text style={styles.watermarkText}>
						You're all caught up!{"\n"}Check back later for more candidates.
					</Text>
				</Animated.View>
			</LinearGradient>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
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
