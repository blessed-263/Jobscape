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
	ActivityIndicator,
	Animated,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import { Card, Button, Avatar, List, Snackbar } from "react-native-paper";

const PRIMARY_BLUE = "#0a2d52";

const JobSeekerDashboard = () => {
	const router = useRouter();
	const isDark = useColorScheme() === "dark";
	const [profile, setProfile] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [jobsAppliedCount, setJobsAppliedCount] = useState(0);
	const [matchesCount, setMatchesCount] = useState(0);
	const [jobsAppliedList, setJobsAppliedList] = useState<any[]>([]);
	const [matchesList, setMatchesList] = useState<any[]>([]);
	const [messagesList, setMessagesList] = useState<any[]>([]);
	const [snackbarMessage, setSnackbarMessage] = useState("");
	const [snackbarVisible, setSnackbarVisible] = useState(false);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const showNotice = (message: string) => {
		setSnackbarMessage(message);
		setSnackbarVisible(true);
	};

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				// Helper to extract relative file path from full public URL
				const getRelativePath = (fullUrl: string, bucketName: string) => {
					const prefix = `/storage/v1/object/public/${bucketName}/`;
					const index = fullUrl.indexOf(prefix);
					if (index === -1) return null;
					return fullUrl.substring(index + prefix.length);
				};

				console.log("🔄 Starting fetchData");

				// Get logged-in user
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError || !user) {
					console.log("⚠️ User not found or error:", userError);
					Alert.alert("Session Error", "Please sign in again.");
					router.replace("/sign-in-jobseeker");
					return;
				}
				console.log("🧑‍💼 Authenticated Job Seeker ID:", user.id);

				// Fetch job seeker profile
				const { data: profileData, error: profileError } = await supabase
					.from("job_seekers")
					.select(
						"id, full_name, profession, avatar_url, resume_url, resume_name"
					)
					.eq("id", user.id)
					.single();

				if (profileError) {
					console.error("❌ Error fetching profile:", profileError);
					throw profileError;
				}
				console.log("✅ Job seeker profile fetched:", profileData);

				// Generate signed URLs for avatar and resume
				let avatarUrl: string | null = null;
				if (profileData.avatar_url) {
					const relativeAvatarPath = getRelativePath(
						profileData.avatar_url,
						"profile-photos"
					);
					if (relativeAvatarPath) {
						const { data: avatarSigned, error: avatarError } =
							await supabase.storage
								.from("profile-photos")
								.createSignedUrl(relativeAvatarPath, 60);
						if (!avatarError) avatarUrl = avatarSigned.signedUrl;
						else console.warn("⚠️ Avatar signed URL error:", avatarError);
					}
				}

				let resumeUrl: string | null = null;
				if (profileData.resume_url) {
					const relativeResumePath = getRelativePath(
						profileData.resume_url,
						"resumes"
					);
					if (relativeResumePath) {
						const { data: resumeSigned, error: resumeError } =
							await supabase.storage
								.from("resumes")
								.createSignedUrl(relativeResumePath, 60);
						if (!resumeError) resumeUrl = resumeSigned.signedUrl;
						else console.warn("⚠️ Resume signed URL error:", resumeError);
					}
				}

				setProfile({
					id: profileData.id,
					name: profileData.full_name,
					role: profileData.profession || "Job Seeker",
					avatar: avatarUrl,
					resume: {
						name: profileData.resume_name || "My_Resume.pdf",
						uri: resumeUrl,
					},
				});

				// Fetch applications
				const {
					data: applications,
					count: appliedCount,
					error: appErr,
				} = await supabase
					.from("applications")
					.select(
						`
          id,
          job_id,
          status,
          applied_at,
          jobs (
            title,
            recruiter_id,
            recruiters (
              company_name
            )
          )
        `,
						{ count: "exact" }
					)
					.eq("job_seeker_id", user.id);

				if (appErr) {
					console.error("❌ Error fetching applications:", appErr);
					throw appErr;
				}
				console.log(`📄 Applications fetched: ${appliedCount}`);
				setJobsAppliedCount(appliedCount || 0);
				setJobsAppliedList(applications || []);

				// Fetch matches WITHOUT messages column
				const {
					data: matches,
					count: matchCount,
					error: matchErr,
				} = await supabase
					.from("matches")
					.select(
						`
          id,
          job_id,
          matched_at,
          jobs (
            title,
            recruiter_id,
            recruiters (
              company_name
            )
          )
        `,
						{ count: "exact" }
					)
					.eq("job_seeker_id", user.id);

				if (matchErr) {
					console.error("❌ Error fetching matches:", matchErr);
					throw matchErr;
				}
				console.log(`🤝 Matches fetched: ${matchCount}`);
				setMatchesCount(matchCount || 0);
				setMatchesList(matches || []);

				// Extract match IDs to fetch messages separately
				const matchIds = matches?.map((m) => m.id) || [];
				console.log("🆔 Match IDs to fetch messages for:", matchIds);

				// Fetch messages for those matches
				const { data: messages, error: messagesErr } = await supabase
					.from("messages")
					.select("*")
					.in("match_id", matchIds);

				if (messagesErr) {
					console.error("❌ Error fetching messages:", messagesErr);
					throw messagesErr;
				}
				console.log(`💬 Messages fetched: ${messages?.length}`);

				// Flatten messages with sender and match info for preview
				const messagesPreview = messages.map((msg) => {
					const match = matches?.find((m) => m.id === msg.match_id);

					// Prefer message sender name, fallback to recruiter company name if missing
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
					};
				});

				setMessagesList(messagesPreview);

				console.log("✅ fetchData complete");
			} catch (error: any) {
				console.error(
					"❌ Error loading dashboard data:",
					error.message ?? error
				);
				Alert.alert("Error", "Failed to load dashboard data.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	useEffect(() => {
		if (!loading) {
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 700,
				useNativeDriver: true,
			}).start();
		}
	}, [loading]);

	const handleResumePress = () => {
		const uri = profile?.resume?.uri;
		if (uri) {
			console.log("Trying to open resume URL:", uri);
			Linking.openURL(uri).catch((error) => {
				console.error("Failed to open resume URL:", error);
				Alert.alert("Error", "Unable to open the resume.");
			});
		} else {
			Alert.alert(
				"No Resume",
				"Please upload your resume in the Edit Profile page."
			);
		}
	};

	if (loading || !profile) {
		return (
			<View
				style={[
					styles.loadingContainer,
					isDark ? styles.darkContainer : styles.lightContainer,
				]}
			>
				<ActivityIndicator size="large" color={PRIMARY_BLUE} />
				<Text style={[styles.loadingText, { color: isDark ? "#ccc" : "#333" }]}>
					Loading your dashboard...
				</Text>
			</View>
		);
	}

	const profileFields = [
		profile.name,
		profile.role,
		profile.avatar,
		profile.resume.uri,
	];
	const filledFields = profileFields.filter((f) => f && f.length > 0).length;
	const profileProgress = Math.round(
		(filledFields / profileFields.length) * 100
	);

	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				style={[
					styles.container,
					isDark ? styles.darkContainer : styles.lightContainer,
				]}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 80 }} // leave space for the floating button
			>
				{/* Profile Card */}
				<Card
					style={[styles.profileCard, isDark && styles.profileCardDark]}
					onPress={() => router.push("/edit-profile")}
				>
					<Card.Content>
						{/* Name & Profession on top */}
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
							{/* Avatar */}
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

						{/* View Resume and Progress Circle side by side 50/50 */}
						<View style={styles.resumeProgressRow}>
							<TouchableOpacity
								onPress={handleResumePress}
								style={[styles.resumeButton, { borderColor: PRIMARY_BLUE }]}
								activeOpacity={0.8}
							>
								<Ionicons
									name="document-text-outline"
									size={20}
									color={PRIMARY_BLUE}
									style={{ marginRight: 6 }}
								/>
								<Text
									style={[styles.resumeText, { color: PRIMARY_BLUE }]}
									numberOfLines={1}
									adjustsFontSizeToFit
									minimumFontScale={0.8}
								>
									View Resume
								</Text>
							</TouchableOpacity>

							<View style={styles.progressCircle}>
								<Text style={[styles.progressPercent, { color: PRIMARY_BLUE }]}>
									{profileProgress}%
								</Text>
								<Text style={styles.progressLabel}>Profile Progress</Text>
							</View>
						</View>
					</Card.Content>
				</Card>

				{/* Animated fade in for summary and lists */}
				<Animated.View style={{ opacity: fadeAnim }}>
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

					{/* Start Swiping button below Profile Summary */}
					<View style={styles.swipeBtnWrapper}>
						<Button
							mode="contained"
							buttonColor="#E3F0FF"
							textColor={PRIMARY_BLUE}
							style={styles.ctaButton}
							onPress={() => router.push("/job-stack-screen")}
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
								<TouchableOpacity onPress={() => router.push("/applications")}>
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
									onPress={() => router.push("/matches-jobseeker")}
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
									onPress={() => router.push("/messages-jobseeker")}
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
										description={
											msg.text?.length > 0 ? msg.text : "(No content)"
										}
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
							<TouchableOpacity onPress={() => router.push("/support")}>
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
			<Animated.View style={[styles.floatingSettingsBtn]}>
				<TouchableOpacity
					onPress={() => router.push("/settings")}
					activeOpacity={0.85}
				>
					<Ionicons name="settings-outline" size={30} color="white" />
				</TouchableOpacity>
			</Animated.View>
			<Snackbar
				visible={snackbarVisible}
				onDismiss={() => setSnackbarVisible(false)}
				duration={3000}
				style={{
					backgroundColor: PRIMARY_BLUE,
					borderRadius: 12,
					marginHorizontal: 20,
					marginBottom: 16,
				}}
			>
				<Text style={{ color: "#fff", fontSize: 14 }}>{snackbarMessage}</Text>
			</Snackbar>
		</View>
	);
};

export default JobSeekerDashboard;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
		paddingVertical: 24,
		backgroundColor: "#f7f7f7",
	},
	darkContainer: {
		backgroundColor: "#121212",
	},
	lightContainer: {
		backgroundColor: "#f7f7f7",
	},
	profileCard: {
		backgroundColor: "#fff",
		borderRadius: 14,
		paddingVertical: 20,
		paddingHorizontal: 20,
		marginBottom: 28,
		elevation: 6,
	},
	profileCardDark: {
		backgroundColor: "#1E1E1E",
	},
	profileHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	nameRoleContainer: {
		flex: 1,
		paddingRight: 12,
	},
	name: {
		fontSize: 22,
		fontWeight: "700",
		fontFamily: "Montserrat-SemiBold",
	},
	role: {
		fontSize: 15,
		fontFamily: "Montserrat-Regular",
		color: "#6b7280",
		marginTop: 3,
	},
	resumeProgressRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	resumeButton: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		paddingVertical: 19,
		paddingHorizontal: 14,
		borderWidth: 2,
		borderRadius: 14,
		borderColor: PRIMARY_BLUE,
		maxWidth: "100%",
	},
	resumeText: {
		fontSize: 16,
		fontWeight: "600",
		fontFamily: "Montserrat-Medium",
		flexShrink: 1,
	},
	progressCircle: {
		flex: 1,
		backgroundColor: "#e6edff",
		borderRadius: 28,
		paddingVertical: 12,
		alignItems: "center",
		minWidth: 70,
	},
	progressPercent: {
		fontSize: 20,
		fontWeight: "700",
		fontFamily: "Montserrat-SemiBold",
	},
	progressLabel: {
		fontSize: 13,
		fontFamily: "Montserrat-Regular",
		color: "#94a3b8",
		marginTop: 2,
	},
	summaryCard: {
		marginBottom: 20,
		borderRadius: 14,
		elevation: 3,
	},
	summaryCardDark: {
		backgroundColor: "#1E1E1E",
		elevation: 6,
	},
	summaryText: {
		fontSize: 15,
		fontFamily: "Montserrat-Regular",
		color: "#444",
	},
	sectionText: {
		fontSize: 14,
		fontFamily: "Montserrat-Regular",
		color: "#666",
	},
	ctaButton: {
		borderRadius: 14,
		paddingVertical: 14,
		marginHorizontal: 0,
		shadowColor: PRIMARY_BLUE,
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.25,
		shadowRadius: 7,
		elevation: 6,
		fontWeight: "700",
	},
	swipeBtnWrapper: {
		marginBottom: 28,
		marginTop: 8,
		paddingHorizontal: 0,
	},
	link: {
		fontSize: 15,
		fontFamily: "Montserrat-Medium",
		marginBottom: 10,
		color: PRIMARY_BLUE,
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		fontFamily: "Montserrat-Regular",
	},

	// Floating Settings Button
	floatingSettingsBtn: {
		position: "absolute",
		bottom: 24,
		right: 20,
		backgroundColor: "#0a2d52", // PRIMARY_BLUE
		padding: 16,
		borderRadius: 100,
		elevation: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 5,
		zIndex: 1000,
	},

	// Section Cards
	sectionCard: {
		marginVertical: 12,
		borderRadius: 16,
		backgroundColor: "#fff",
		elevation: 3,
		shadowColor: "#000",
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 6,
		overflow: "hidden",
	},
	sectionCardDark: {
		backgroundColor: "#1c1c1e",
	},

	// Dashboard List Enhancements
	viewAllText: {
		color: PRIMARY_BLUE,
		fontWeight: "600",
		marginRight: 12,
		fontSize: 13,
		fontFamily: "Montserrat-Medium",
	},
	emptyText: {
		fontSize: 14,
		fontStyle: "italic",
		textAlign: "center",
		paddingVertical: 8,
		fontFamily: "Montserrat-Regular",
	},
	itemTitle: {
		fontSize: 13,
		fontStyle: "italic",
		fontWeight: "500",
		color: "#333",
		fontFamily: "Montserrat-Medium",
	},
	itemDescription: {
		fontSize: 12,
		fontStyle: "italic",
		color: "#666",
		fontFamily: "Montserrat-Regular",
	},
});
