import React, { useEffect, useState, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	Linking,
	useColorScheme,
	RefreshControl,
	Animated,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import { Card, Button, Avatar, List, Snackbar } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Profile = {
	id: string;
	name: string;
	role: string;
	avatar: string | null;
	resume: { name: string; uri: string | null };
};

// Utility function to compute relative path for Supabase Storage
const getRelativePath = (fullUrl: string, bucketName: string) => {
	const prefix = `/storage/v1/object/public/${bucketName}/`;
	const index = fullUrl.indexOf(prefix);
	if (index === -1) return null;
	return fullUrl.substring(index + prefix.length);
};

// Throttle value in ms
const REFRESH_THROTTLE_MS = 5000;
const MINIMUM_FETCH_INTERVAL = 30000; // 30 seconds
const PRIMARY_BLUE = "#0a2d52";
const CACHE_KEY = "jobSeekerDashboardCache";

const JobSeekerDashboard = () => {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const [isExiting, setIsExiting] = useState(false);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true); // Set initial loading to true
	const [refreshing, setRefreshing] = useState(false);
	const [jobsAppliedCount, setJobsAppliedCount] = useState(0);
	const [matchesCount, setMatchesCount] = useState(0);
	const [jobsAppliedList, setJobsAppliedList] = useState<any[]>([]);
	const [matchesList, setMatchesList] = useState<any[]>([]);
	const [messagesList, setMessagesList] = useState<any[]>([]);
	const [snackbarMessage, setSnackbarMessage] = useState("");
	const [snackbarVisible, setSnackbarVisible] = useState(false);
	const lastRefreshRef = useRef<number>(0);
	const isFetchingRef = useRef(false);

	const showNotice = (message: string) => {
		setSnackbarMessage(message);
		setSnackbarVisible(true);
	};

	const fetchData = async () => {
		if (isFetchingRef.current) {
			console.log("Fetch already in progress, skipping.");
			return;
		}
		isFetchingRef.current = true;
		setLoading(true);

		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				Alert.alert("Session Error", "Please sign in again.");
				router.replace("/sign-in-jobseeker");
				return;
			}

			const [
				{ data: profileData, error: profileError },
				{ data: applications, count: appliedCount, error: appErr },
				{ data: matches, count: matchCount, error: matchErr },
			] = await Promise.all([
				supabase
					.from("job_seekers")
					.select(
						"id, full_name, profession, avatar_url, resume_url, resume_name"
					)
					.eq("id", user.id)
					.single(),
				supabase
					.from("applications")
					.select(
						"id, job_id, status, applied_at, jobs (title, recruiter_id, recruiters (company_name))",
						{ count: "exact" }
					)
					.eq("job_seeker_id", user.id)
					.limit(25),
				supabase
					.from("matches")
					.select(
						"id, job_id, matched_at, jobs (title, recruiter_id, recruiters (company_name))",
						{ count: "exact" }
					)
					.eq("job_seeker_id", user.id)
					.limit(25),
			]);

			if (profileError) throw profileError;
			if (appErr) throw appErr;
			if (matchErr) throw matchErr;

			const [avatarUrl, resumeUrl] = await Promise.all([
				(async () => {
					if (profileData.avatar_url) {
						const relativeAvatarPath = getRelativePath(
							profileData.avatar_url,
							"profile-photos"
						);
						if (relativeAvatarPath) {
							const { data: avatarSigned, error: avatarError } =
								await supabase.storage
									.from("profile-photos")
									.createSignedUrl(relativeAvatarPath, 300);
							if (!avatarError) return avatarSigned.signedUrl;
						}
					}
					return null;
				})(),
				(async () => {
					if (profileData.resume_url) {
						const relativeResumePath = getRelativePath(
							profileData.resume_url,
							"resumes"
						);
						if (relativeResumePath) {
							const { data: resumeSigned, error: resumeError } =
								await supabase.storage
									.from("resumes")
									.createSignedUrl(relativeResumePath, 300);
							if (!resumeError) return resumeSigned.signedUrl;
						}
					}
					return null;
				})(),
			]);

			const profileToSet = {
				id: profileData.id,
				name: profileData.full_name,
				role: profileData.profession || "Job Seeker",
				avatar: avatarUrl,
				resume: {
					name: profileData.resume_name || "My_Resume.pdf",
					uri: resumeUrl,
				},
			};

			const matchIds = (matches || []).map((m: any) => m.id);
			let messagesPreview: any[] = [];
			if (matchIds.length) {
				const { data: messages, error: messagesErr } = await supabase
					.from("messages")
					.select("*")
					.in("match_id", matchIds)
					.order("timestamp", { ascending: false })
					.limit(50);
				if (messagesErr) throw messagesErr;
				messagesPreview = (messages || []).map((msg: any) => {
					const match = matches.find((m: any) => m.id === msg.match_id);
					const senderName =
						msg.sender_name ||
						match?.jobs?.recruiters?.company_name ||
						"Unknown";
					return {
						id: msg.id,
						match_id: msg.match_id,
						preview_text: msg.preview_text || msg.text || "",
						sender_avatar: msg.sender_avatar || null,
						sender_id: msg.sender_id,
						sender_name: senderName,
						timestamp: msg.timestamp,
						unread: msg.unread || false,
						text: msg.text || "",
					};
				});
			}

			setProfile(profileToSet);
			setJobsAppliedCount(appliedCount || 0);
			setJobsAppliedList(applications || []);
			setMatchesCount(matchCount || 0);
			setMatchesList(matches || []);
			setMessagesList(messagesPreview);

			const cacheData = {
				profile: profileToSet,
				applications,
				matches,
				messages: messagesPreview,
				timestamp: Date.now(),
			};

			await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

			console.log("Data fetched and cached successfully.");
		} catch (error: any) {
			console.error("Fetch data error:", error);
			Alert.alert("Error", error?.message || "Failed to load dashboard data.");
		} finally {
			setLoading(false);
			setRefreshing(false);
			isFetchingRef.current = false;
		}
	};

	const loadCachedData = async () => {
		try {
			const cached = await AsyncStorage.getItem(CACHE_KEY);
			if (cached) {
				const parsed = JSON.parse(cached);
				setProfile(parsed.profile);
				setJobsAppliedList(parsed.applications);
				setMatchesList(parsed.matches);
				setMessagesList(parsed.messages);
				console.log("Loaded data from cache.");
				return parsed.timestamp;
			}
		} catch (error) {
			console.error("Failed to load cached data:", error);
		}
		return null;
	};

	// Use a single, unified effect for loading and refreshing data
	useFocusEffect(
		React.useCallback(() => {
			const loadAndFetch = async () => {
				setLoading(true);
				const lastFetchedTimestamp = await loadCachedData();
				const now = Date.now();

				// Check if cache exists and is not stale
				if (
					lastFetchedTimestamp &&
					now - lastFetchedTimestamp < MINIMUM_FETCH_INTERVAL
				) {
					console.log("Cache is fresh, skipping network fetch.");
					setLoading(false);
					return;
				}

				// If cache is stale or doesn't exist, fetch new data
				console.log("Cache is stale or not present, fetching new data.");
				await fetchData();
			};

			loadAndFetch();

			// Cleanup function for useFocusEffect
			return () => {
				// Any cleanup logic here if needed
				console.log("Leaving dashboard screen.");
			};
		}, [])
	);

	// Fade in on loading complete
	useEffect(() => {
		if (!loading && !isExiting) {
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 700,
				useNativeDriver: true,
			}).start();
		}
	}, [loading, isExiting]);

	const handleNavigateWithExit = (path: string) => {
		setIsExiting(true);
		Animated.timing(fadeAnim, {
			toValue: 0,
			duration: 500,
			useNativeDriver: true,
		}).start(() => {
			setIsExiting(false);
			router.push(path);
		});
	};

	const onRefresh = async () => {
		const now = Date.now();
		if (now - lastRefreshRef.current < REFRESH_THROTTLE_MS) {
			showNotice("Please wait a moment before refreshing again.");
			setRefreshing(false);
			return;
		}
		lastRefreshRef.current = now;
		setRefreshing(true);
		await fetchData();
	};

	// Keep resume open UX
	const handleResumePress = () => {
		const uri = profile?.resume?.uri;
		if (uri) {
			Linking.openURL(uri).catch(() => {
				Alert.alert("Error", "Unable to open the resume.");
			});
		} else {
			Alert.alert(
				"No Resume",
				"Please upload your resume in the Edit Profile page."
			);
		}
	};

	// Profile progress
	const profileFields = [
		profile?.name,
		profile?.role,
		profile?.avatar,
		profile?.resume?.uri,
	];
	const filledFields = profileFields.filter(
		(f) => typeof f === "string" && f.length > 0
	).length;

	const profileProgress = Math.round(
		(filledFields / profileFields.length) * 100
	);

	// Fallback: loading UI
	if (loading || !profile) {
		return (
			<View
				style={[
					styles.loadingContainer,
					isDark ? styles.darkContainer : styles.lightContainer,
				]}
			>
				<LottieView
					source={require("../assets/animations/loading.json")}
					autoPlay
					loop
					style={{ width: 160, height: 160 }}
				/>
				<Text style={[styles.loadingText, { color: isDark ? "#ccc" : "#333" }]}>
					Loading your dashboard...
				</Text>
			</View>
		);
	}

	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				style={[
					styles.container,
					isDark ? styles.darkContainer : styles.lightContainer,
				]}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 80 }}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={PRIMARY_BLUE}
						colors={[PRIMARY_BLUE]}
					/>
				}
			>
				<Animated.View style={{ opacity: fadeAnim }}>
					{/* Profile Card */}
					<Card
						style={[styles.profileCard, isDark && styles.profileCardDark]}
						onPress={() => handleNavigateWithExit("/edit-profile")}
					>
						<Card.Content>
							<View style={styles.profileHeader}>
								<View style={styles.nameRoleContainer}>
									<Text
										style={[styles.name, { color: PRIMARY_BLUE }]}
										numberOfLines={1}
									>
										{profile.name}
									</Text>
									<Text
										style={[
											styles.role,
											{ color: isDark ? "#9CA3AF" : "#6b7280" },
										]}
										numberOfLines={1}
									>
										{profile.role}
									</Text>
								</View>

								{profile.avatar ? (
									<Avatar.Image size={80} source={{ uri: profile.avatar }} />
								) : (
									<Avatar.Icon
										size={80}
										icon="account-circle-outline"
										color={PRIMARY_BLUE}
										style={{ backgroundColor: isDark ? "#222" : "#eee" }}
									/>
								)}
							</View>

							{/* Reverted resume button and progress indicator */}
							<View style={styles.resumeAndProgressContainer}>
								<Button
									mode="outlined"
									icon="file-document-outline"
									onPress={handleResumePress}
									style={styles.resumeButton}
									labelStyle={styles.resumeButtonLabel}
								>
									View Resume
								</Button>
								<Text
									style={[
										styles.progressText,
										{ color: isDark ? "#ddd" : "#444" },
									]}
								>
									Profile Progress:{" "}
									<Text style={{ fontWeight: "700" }}>{profileProgress}%</Text>
								</Text>
							</View>
						</Card.Content>
					</Card>

					{/* Profile Summary */}
					<Card style={[styles.summaryCard, isDark && styles.summaryCardDark]}>
						<Card.Title
							title="Profile Summary"
							titleStyle={{ color: PRIMARY_BLUE, fontWeight: "700" }}
							left={(props) => (
								<MaterialIcons
									{...props}
									name="person-outline"
									color={PRIMARY_BLUE}
								/>
							)}
						/>
						<Card.Content>
							<Text
								style={[
									styles.summaryText,
									{ color: isDark ? "#ddd" : "#444" },
								]}
							>
								Welcome back,{" "}
								<Text style={{ fontWeight: "700" }}>{profile.name}</Text>. Your
								professional title is{" "}
								<Text style={{ fontWeight: "700" }}>{profile.role}</Text>.
							</Text>
							<Text
								style={[
									styles.summaryText,
									{ color: isDark ? "#aaa" : "#666", marginTop: 8 },
								]}
							>
								You have applied to{" "}
								<Text style={{ fontWeight: "700" }}>{jobsAppliedCount}</Text>{" "}
								jobs and have{" "}
								<Text style={{ fontWeight: "700" }}>{matchesCount}</Text>{" "}
								matches.
							</Text>
						</Card.Content>
					</Card>

					{/* Start Swiping button */}
					<View style={styles.swipeBtnWrapper}>
						<Button
							mode="contained"
							buttonColor="#E3F0FF"
							textColor={PRIMARY_BLUE}
							style={styles.ctaButton}
							onPress={() => handleNavigateWithExit("/job-stack-screen")}
							icon="briefcase-search"
							contentStyle={{ flexDirection: "row-reverse" }}
						>
							Start Swiping Jobs
						</Button>
					</View>

					{/* Jobs Applied List Preview */}
					<Card style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
						<Card.Title
							title={`Jobs Applied (${jobsAppliedCount})`}
							titleStyle={{
								color: PRIMARY_BLUE,
								fontWeight: "700",
								fontSize: 16,
							}}
							left={(props) => (
								<MaterialIcons
									{...props}
									name="work-outline"
									color={PRIMARY_BLUE}
								/>
							)}
							right={() => (
								<TouchableOpacity
									onPress={() => handleNavigateWithExit("/applications")}
								>
									<Text style={styles.viewAllText}>View All</Text>
								</TouchableOpacity>
							)}
						/>

						{jobsAppliedList.length === 0 ? (
							<Card.Content>
								<Text
									style={[
										styles.emptyText,
										{ color: isDark ? "#777" : "#999" },
									]}
								>
									No applications yet.
								</Text>
							</Card.Content>
						) : (
							<List.Section>
								{jobsAppliedList.slice(0, 3).map((app) => (
									<List.Item
										key={app.id}
										title={app.jobs.title}
										titleStyle={styles.itemTitle}
										description={`Status: ${app.status}`}
										descriptionStyle={styles.itemDescription}
										left={(props) => (
											<MaterialIcons
												{...props}
												name="business-center"
												color={PRIMARY_BLUE}
												style={{ marginTop: 6 }}
											/>
										)}
										onPress={() =>
											showNotice("To view more details, tap 'View All'")
										}
									/>
								))}
							</List.Section>
						)}
					</Card>

					{/* Matches Preview */}
					<Card style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
						<Card.Title
							title={`Matches (${matchesCount})`}
							titleStyle={{
								color: PRIMARY_BLUE,
								fontWeight: "700",
								fontSize: 16,
							}}
							left={(props) => (
								<Ionicons
									{...props}
									name="heart-outline"
									color={PRIMARY_BLUE}
								/>
							)}
							right={() => (
								<TouchableOpacity
									onPress={() => handleNavigateWithExit("/matches-jobseeker")}
								>
									<Text style={styles.viewAllText}>View All</Text>
								</TouchableOpacity>
							)}
						/>

						{matchesList.length === 0 ? (
							<Card.Content>
								<Text
									style={[
										styles.emptyText,
										{ color: isDark ? "#777" : "#999" },
									]}
								>
									No matches yet.
								</Text>
							</Card.Content>
						) : (
							<List.Section>
								{matchesList.slice(0, 3).map((match) => (
									<List.Item
										key={match.id}
										title={match.jobs.title}
										titleStyle={styles.itemTitle}
										description={`Company: ${match.jobs.recruiters.company_name}`}
										descriptionStyle={styles.itemDescription}
										left={(props) => (
											<Ionicons
												{...props}
												name="heart"
												color={PRIMARY_BLUE}
												size={16}
												style={{ marginTop: 6 }}
											/>
										)}
										onPress={() =>
											showNotice("Open 'View All' to chat with matches")
										}
									/>
								))}
							</List.Section>
						)}
					</Card>

					{/* Messages Preview */}
					<Card style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
						<Card.Title
							title="Messages"
							titleStyle={{
								color: PRIMARY_BLUE,
								fontWeight: "700",
								fontSize: 16,
							}}
							left={(props) => (
								<Ionicons
									{...props}
									name="chatbubble-ellipses-outline"
									color={PRIMARY_BLUE}
								/>
							)}
							right={() => (
								<TouchableOpacity
									onPress={() => handleNavigateWithExit("/messages-jobseeker")}
								>
									<Text style={styles.viewAllText}>View All</Text>
								</TouchableOpacity>
							)}
						/>

						{messagesList.length === 0 ? (
							<Card.Content>
								<Text
									style={[
										styles.emptyText,
										{ color: isDark ? "#777" : "#999" },
									]}
								>
									No messages yet.
								</Text>
							</Card.Content>
						) : (
							<List.Section>
								{messagesList.slice(0, 3).map((msg) => (
									<List.Item
										key={msg.id}
										title={`From: ${msg.sender_name}`}
										titleStyle={styles.itemTitle}
										description={msg.text?.length > 0 ? msg.text : "(Hidden)"}
										descriptionNumberOfLines={1}
										descriptionStyle={styles.itemDescription}
										left={(props) => (
											<Avatar.Icon
												{...props}
												icon="chat"
												color={PRIMARY_BLUE}
												style={{
													backgroundColor: isDark ? "#222" : "#eee",
													marginTop: 6,
												}}
												size={20}
											/>
										)}
										onPress={() =>
											showNotice("Tap 'View All' to read your messages")
										}
									/>
								))}
							</List.Section>
						)}
					</Card>

					{/* Support Section */}
					<Card style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
						<Card.Title
							title="Support"
							titleStyle={{ color: PRIMARY_BLUE, fontWeight: "700" }}
							left={(props) => (
								<Ionicons
									{...props}
									name="help-circle-outline"
									color={PRIMARY_BLUE}
								/>
							)}
						/>
						<Card.Content>
							<TouchableOpacity
								onPress={() => handleNavigateWithExit("/support")}
							>
								<Text style={[styles.link, { color: PRIMARY_BLUE }]}>
									❓ Help Center
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() =>
									Linking.openURL(
										"mailto:wearejobscape@gmail.com?subject=Jobscape Support&body=Hello Jobscape Team,"
									)
								}
							>
								<Text style={[styles.link, { color: PRIMARY_BLUE }]}>
									✉️ Contact Us
								</Text>
							</TouchableOpacity>
						</Card.Content>
					</Card>
				</Animated.View>
			</ScrollView>

			{/* Floating Settings Button */}
			<Animated.View
				style={[styles.floatingSettingsBtn, { opacity: fadeAnim }]}
			>
				<TouchableOpacity
					onPress={() => handleNavigateWithExit("/settings")}
					activeOpacity={0.85}
				>
					<Ionicons name="settings-outline" size={30} color="#fff" />
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f4f7f9",
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	darkContainer: {
		backgroundColor: "#121212",
	},
	lightContainer: {
		backgroundColor: "#f4f7f9",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 20,
		fontSize: 16,
		fontWeight: "600",
	},
	profileCard: {
		marginBottom: 20,
		borderRadius: 15,
		backgroundColor: "#fff",
		elevation: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	profileCardDark: {
		backgroundColor: "#1e1e1e",
	},
	profileHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	nameRoleContainer: {
		flex: 1,
		marginRight: 16,
	},
	name: {
		fontSize: 24,
		fontWeight: "800",
		marginBottom: 4,
	},
	role: {
		fontSize: 16,
	},
	// Reverted styles for resume and progress
	resumeAndProgressContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 10,
	},
	resumeButton: {
		borderColor: PRIMARY_BLUE,
		borderWidth: 1,
	},
	resumeButtonLabel: {
		color: PRIMARY_BLUE,
	},
	progressText: {
		fontSize: 14,
	},
	summaryCard: {
		marginBottom: 20,
		borderRadius: 15,
		backgroundColor: "#E3F0FF",
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	summaryCardDark: {
		backgroundColor: "#222",
	},
	summaryText: {
		fontSize: 16,
		lineHeight: 24,
	},
	swipeBtnWrapper: {
		marginBottom: 20,
	},
	ctaButton: {
		borderRadius: 25,
		paddingVertical: 8,
		elevation: 3,
	},
	sectionCard: {
		marginBottom: 20,
		borderRadius: 15,
		backgroundColor: "#fff",
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	sectionCardDark: {
		backgroundColor: "#1e1e1e",
	},
	viewAllText: {
		color: PRIMARY_BLUE,
		fontWeight: "600",
		fontSize: 14,
		marginRight: 16,
	},
	itemTitle: {
		fontWeight: "600",
		fontSize: 15,
	},
	itemDescription: {
		fontSize: 13,
		color: "#6b7280",
	},
	emptyText: {
		textAlign: "center",
		paddingVertical: 20,
		fontStyle: "italic",
	},
	link: {
		fontSize: 16,
		marginVertical: 8,
		fontWeight: "600",
	},
	floatingSettingsBtn: {
		position: "absolute",
		bottom: 25,
		right: 25,
		backgroundColor: PRIMARY_BLUE,
		borderRadius: 30,
		width: 60,
		height: 60,
		justifyContent: "center",
		alignItems: "center",
		elevation: 8,
		shadowColor: PRIMARY_BLUE,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
	},
});

export default JobSeekerDashboard;
