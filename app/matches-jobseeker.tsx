import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	Image,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	StatusBar,
	ActivityIndicator,
	useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import { LinearGradient } from "expo-linear-gradient";

const PRIMARY = "#0A2D52";
const DARK_BG = "#121212";
const LIGHT_BG = "#F9FAFB";

interface Match {
	id: string;
	job_id: string;
	recruiter: {
		id: string;
		company_name: string;
		company_logo: string | null;
	};
}

export default function MatchesPage() {
	const isDark = useColorScheme() === "dark";
	const router = useRouter();
	const [matches, setMatches] = useState<Match[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchMatches = async () => {
			setLoading(true);

			try {
				// Get current user
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError || !user) {
					console.error("User fetch error:", userError?.message);
					setLoading(false);
					return;
				}

				// Fetch matches for logged-in job seeker
				const { data, error } = await supabase
					.from("matches")
					.select(
						`
					id,
					job_id,
					jobs (
						id,
						recruiters (
							id,
							company_name,
							company_logo
						)
					)
				`
					)
					.eq("job_seeker_id", user.id)
					.order("matched_at", { ascending: false });

				if (error) {
					console.error("Error fetching matches:", error.message);
					setMatches([]);
				} else {
					const flattened = (data || []).map((match: any) => {
						const recruiter = match.jobs?.recruiters;
						if (!recruiter) return null;

						return {
							id: match.id,
							job_id: match.job_id,
							recruiter: {
								id: recruiter.id,
								company_name: recruiter.company_name,
								company_logo: recruiter.company_logo,
							},
						};
					});

					setMatches(flattened.filter((item): item is Match => item !== null));
				}
			} catch (err) {
				console.error("Unexpected error fetching matches:", err);
				setMatches([]);
			} finally {
				setLoading(false);
			}
		};

		fetchMatches();
	}, []);

	return (
		<SafeAreaView
			style={[
				styles.container,
				{ backgroundColor: isDark ? DARK_BG : LIGHT_BG },
			]}
		>
			<StatusBar
				barStyle={isDark ? "light-content" : "dark-content"}
				backgroundColor={isDark ? DARK_BG : LIGHT_BG}
			/>

			<View style={styles.header}>
				<Text style={[styles.title, { color: isDark ? "#fff" : PRIMARY }]}>
					Your Matches
				</Text>
			</View>

			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={PRIMARY} />
				</View>
			) : matches.length === 0 ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>No matches yet</Text>
				</View>
			) : (
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{matches.map((match) => (
						<TouchableOpacity
							key={match.id}
							activeOpacity={0.85}
							onPress={() =>
								router.push({
									pathname: "/company-public-view",
									params: { companyId: match.recruiter.id },
								})
							}
							style={[
								styles.cardWrapper,
								{
									backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
									shadowColor: isDark ? "#000" : "#CBD5E1",
								},
							]}
						>
							<LinearGradient
								colors={
									isDark ? ["#0F172A", "#1E293B"] : ["#E0E7FF", "#FFFFFF"]
								}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={styles.cardInner}
							>
								{match.recruiter.company_logo ? (
									<Image
										source={{ uri: match.recruiter.company_logo }}
										style={[styles.logo, { borderColor: PRIMARY }]}
									/>
								) : (
									<View
										style={[styles.logoFallback, { backgroundColor: PRIMARY }]}
									>
										<Text style={styles.logoInitial}>
											{match.recruiter.company_name?.charAt(0).toUpperCase() ??
												"?"}
										</Text>
									</View>
								)}

								<View style={{ flex: 1 }}>
									<Text
										style={[
											styles.companyName,
											{ color: isDark ? "#F1F5F9" : "#0F172A" },
										]}
									>
										{match.recruiter.company_name}
									</Text>
									<Text
										style={[
											styles.matchNote,
											{ color: isDark ? "#94A3B8" : "#6B7280" },
										]}
									>
										Matched recruiter
									</Text>
								</View>
							</LinearGradient>
						</TouchableOpacity>
					))}
				</ScrollView>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		paddingTop: 28,
		paddingBottom: 16,
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 28,
		fontWeight: "800",
		letterSpacing: 0.4,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	cardWrapper: {
		borderRadius: 22,
		marginVertical: 10,
		shadowOpacity: 0.18,
		shadowOffset: { width: 0, height: 6 },
		shadowRadius: 14,
		elevation: 5,
	},
	cardInner: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 18,
		paddingHorizontal: 20,
		borderRadius: 22,
	},
	logo: {
		width: 60,
		height: 60,
		borderRadius: 16,
		marginRight: 18,
		borderWidth: 2,
		backgroundColor: "#fff",
	},
	logoFallback: {
		width: 60,
		height: 60,
		borderRadius: 16,
		marginRight: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	logoInitial: {
		color: "#fff",
		fontSize: 26,
		fontWeight: "800",
	},
	companyName: {
		fontSize: 18,
		fontWeight: "700",
	},
	matchNote: {
		fontSize: 14,
		marginTop: 4,
		fontWeight: "500",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyText: {
		color: "#9CA3AF",
		fontSize: 16,
		fontWeight: "500",
	},
});
