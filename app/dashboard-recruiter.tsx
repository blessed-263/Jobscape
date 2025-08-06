import React, { ReactNode, useEffect, useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	FlatList,
	Image,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	Dimensions,
	Animated,
	ViewStyle,
	StyleProp,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../firebase/supabase";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";

import { BarChart } from "react-native-chart-kit";

// 🔹 Job Listing
interface Job {
	id: string;
	title: string;
	location: string;
	recruiter_id: string;
	created_at?: string; // Optional but useful for sorting
}

// 🔹 Job Seeker Basic Info
interface JobSeeker {
	id: string;
	full_name: string;
	avatar_url: string | null;
}

// 🔹 Raw Message Data from Supabase
interface MessageRaw {
	id: string;
	text: string | null;
	timestamp: string;
	sender_id: string;
	match: {
		id: string;
		job: Job;
		job_seeker: JobSeeker;
	};
}

// 🔹 Transformed Message for UI
interface MessageFormatted {
	id: string;
	sender_name: string;
	sender_avatar: string | null;
	preview_text: string;
	job_title: string;
	timestamp: string;
}

// 🔹 Supabase Message Response (alias)
type SupabaseMessageResponse = MessageRaw;

// 🔹 Message Preview for list view
interface MessagePreview {
	id: string;
	sender_name: string;
	sender_avatar?: string | null;
	preview_text: string;
	job_title: string;
	timestamp: string;
}

// 🔹 Glassy Button Props (common UI component)
interface GlassyButtonProps {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	onPress: () => void;
	activeOpacity?: number;
}

// 🔹 Application Record
interface Applicant {
	id: string; // Application ID
	job_id: string;
	job_seeker_id: string;
	message?: string | null; // Optional cover letter
	status: "pending" | "accepted" | "interview" | "rejected";
	applied_at: string;

	job: {
		id: string;
		title: string;
	};

	job_seeker: JobSeeker;
}

// 🔹 Top Job Stat (applications per job)
interface TopJobStat {
	job_id: string;
	title: string;
	count: number;
}

// 🔹 Status Breakdown (e.g. { pending: 10, interview: 3, hired: 1 })
type StatusBreakdown = Record<string, number>;

// 🔹 Application Status
type ApplicationStatus = "pending" | "interview" | "accepted" | "rejected";
type StatusCounts = {
	[key in ApplicationStatus]: number;
};

// 🔹 All supported Ionicons used
type IoniconsName =
	| "mail-open-outline"
	| "chatbubble-ellipses-outline"
	| "checkmark-done-outline"
	| "calendar-outline"
	| "close-circle-outline"
	| "time-outline"
	| "business-outline"
	| "create-outline"
	| "chevron-forward-outline"
	| "trash-outline"
	| "document-text-outline"
	| "person-circle-outline";

const screenWidth = Dimensions.get("window").width;
const AnimatedFlatList = Animated.createAnimatedComponent(
	FlatList as new (...args: any) => FlatList<Job>
);

const RecruiterDashboard = () => {
	const router = useRouter();

	// 🏢 Recruiter Profile Info
	const [recruiterName, setRecruiterName] = useState<string | null>(null);
	const [companyName, setCompanyName] = useState<string | null>(null);
	const [industry, setIndustry] = useState<string | null>(null);
	const [location, setLocation] = useState<string | null>(null);
	const [website, setWebsite] = useState<string | null>(null);
	const [teamSize, setTeamSize] = useState<string | null>(null);
	const [logoUrl, setLogoUrl] = useState<string | null>(null);

	// 📊 Stats Counters
	const [applicationsCount, setApplicationsCount] = useState<number>(0);
	const [interviewsCount, setInterviewsCount] = useState<number>(0);
	const [hiredCount, setHiredCount] = useState<number>(0);

	// 📈 Advanced Stats
	const [topJobs, setTopJobs] = useState<
		{ job_id: string; title: string; count: number }[]
	>([]);
	const [statusBreakdown, setStatusBreakdown] = useState<
		Record<string, number>
	>({});

	// 📋 Data Lists
	const [jobs, setJobs] = useState<Job[]>([]);
	const [applicants, setApplicants] = useState<Applicant[]>([]);
	const [messages, setMessages] = useState<MessagePreview[]>([]);

	// ⏳ Loading Indicator
	const [loading, setLoading] = useState<boolean>(true);

	useFocusEffect(
		useCallback(() => {
			fetchRecruiterData();
		}, [])
	);

	const fetchApplicants = async (recruiterId: string): Promise<Applicant[]> => {
		// Helper to extract relative file path from full public URL
		const getRelativePath = (fullUrl: string, bucketName: string) => {
			const prefix = `/storage/v1/object/public/${bucketName}/`;
			const index = fullUrl.indexOf(prefix);
			if (index === -1) return null;
			return fullUrl.substring(index + prefix.length);
		};

		try {
			const { data, error } = await supabase
				.from<"applications", Applicant>("applications")
				.select(
					`
      id,
      job_id,
      job_seeker_id,
      message,
      status,
      applied_at,
      job:job_id (
        id,
        title,
        recruiter_id
      ),
      job_seeker:job_seeker_id (
        id,
        full_name,
        avatar_url
      )
    `
				)
				.eq("job.recruiter_id", recruiterId)
				.order("applied_at", { ascending: false });

			if (error) {
				console.error("Failed to fetch applicants:", error.message);
				return [];
			}

			// Filter out applicants with null job_seeker or job
			const sanitizedApplicants = (data ?? []).filter(
				(app: any) => app.job_seeker !== null && app.job !== null
			) as Applicant[];

			// Generate signed URLs for avatars for private buckets
			const updatedApplicants = await Promise.all(
				sanitizedApplicants.map(async (applicant) => {
					let signedAvatarUrl = null;
					if (applicant.job_seeker.avatar_url) {
						const relativePath = getRelativePath(
							applicant.job_seeker.avatar_url,
							"profile-photos"
						);
						if (relativePath) {
							const { data: signedData, error: avatarError } =
								await supabase.storage
									.from("profile-photos")
									.createSignedUrl(relativePath, 60);
							if (!avatarError) signedAvatarUrl = signedData.signedUrl;
							else console.warn("⚠️ Avatar signed URL error:", avatarError);
						}
					}
					return {
						...applicant,
						job_seeker: {
							...applicant.job_seeker,
							avatar_url: signedAvatarUrl,
						},
					};
				})
			);

			return updatedApplicants;
		} catch (e: any) {
			console.error("Failed to fetch applicants:", e.message);
			return [];
		}
	};

	const fetchMessages = async () => {
		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				console.warn("User not logged in");
				setMessages([]);
				return;
			}

			// Fetch messages with embedded job + job_seeker
			const { data, error: messagesError } = await supabase
				.from("messages")
				.select(
					`
        id,
        text,
        timestamp,
        sender_id,
        match:match_id (
          id,
          job:job_id (
            id,
            title,
            location,
            recruiter_id
          ),
          job_seeker:job_seeker_id (
            full_name,
            avatar_url
          )
        )
      `
				)
				.order("timestamp", { ascending: false })
				.limit(20); // Get more to allow post-filtering

			if (messagesError) throw messagesError;

			const raw = (data ?? []) as unknown as SupabaseMessageResponse[];

			// Filter messages for current recruiter's jobs
			const filtered = raw.filter(
				(msg) => msg.match?.job?.recruiter_id === user.id
			);

			const formatted: MessageFormatted[] = filtered.map((msg) => ({
				id: msg.id,
				sender_name: msg.match.job_seeker.full_name,
				sender_avatar: msg.match.job_seeker.avatar_url,
				preview_text: msg.text ?? "",
				job_title: msg.match.job.title,
				timestamp: msg.timestamp,
			}));

			setMessages(formatted);
		} catch (error: any) {
			console.error("Fetch messages failed:", error.message);
			setMessages([]);
		}
	};
	const fetchRecruiterData = async () => {
		setLoading(true);
		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				console.warn("⚠️ User not found or error", userError);
				router.replace("/sign-in-recruiter");
				return;
			}

			const recruiterId = user.id;
			console.log("✅ Logged in Recruiter ID:", recruiterId);

			// 🎯 Recruiter Basic Info
			const { data: recruiterProfile } = await supabase
				.from("recruiters")
				.select("contact_name, company_name, location, website, company_logo")
				.eq("id", recruiterId)
				.single();
			console.log("🏢 Recruiter Basic Info:", recruiterProfile);

			// 🧠 Recruiter Extended Profile
			const { data: profileData } = await supabase
				.from("recruiter_profiles")
				.select("industry, team_size")
				.eq("id", recruiterId)
				.single();
			console.log("📂 Recruiter Extended Profile:", profileData);

			// 📋 Job Listings
			const { data: jobsData } = await supabase
				.from("jobs")
				.select("id, title, location, recruiter_id")
				.eq("recruiter_id", recruiterId)
				.order("created_at", { ascending: false });
			console.log("📋 Jobs Data:", jobsData);

			// 👤 Applicants
			const applicantsData = await fetchApplicants(recruiterId);
			console.log("👥 Applicants Data:", applicantsData);

			// ✅ Compute Stats from Applications
			const recruiterJobs = jobsData || [];
			const jobIds = recruiterJobs.map((job) => job.id);
			const recruiterApplications =
				applicantsData?.filter((app) => jobIds.includes(app.job_id)) || [];

			const totalApplications = recruiterApplications.length;
			const interviews = recruiterApplications.filter(
				(app) => app.status === "interview"
			).length;
			const hired = recruiterApplications.filter(
				(app) => app.status === "accepted"
			).length;

			// ✅ Use typed status count
			const initialCounts: StatusCounts = {
				pending: 0,
				interview: 0,
				accepted: 0,
				rejected: 0,
			};

			const applicationsByStatus = recruiterApplications.reduce<StatusCounts>(
				(acc, app) => {
					const status = (app.status || "pending") as ApplicationStatus;
					acc[status] += 1;
					return acc;
				},
				initialCounts
			);

			console.log("📊 Live Stats:", {
				totalApplications,
				interviews,
				hired,
				applicationsByStatus,
			});

			// 🏢 Set Recruiter Company Info
			if (recruiterProfile) {
				setRecruiterName(recruiterProfile.contact_name);
				setCompanyName(recruiterProfile.company_name);
				setLocation(recruiterProfile.location);
				setWebsite(recruiterProfile.website);
				setLogoUrl(recruiterProfile.company_logo || null);
			}

			// 📂 Set Profile Meta
			if (profileData) {
				setIndustry(profileData.industry);
				setTeamSize(profileData.team_size);
			}

			// 📊 Set Computed Stats to State
			setApplicationsCount(totalApplications);
			setInterviewsCount(interviews);
			setHiredCount(hired);
			setStatusBreakdown(applicationsByStatus);

			// ✅ Final State Updates
			setJobs(recruiterJobs);
			setApplicants(recruiterApplications);
			await fetchMessages();
		} catch (error: any) {
			console.error("❌ Error loading recruiter dashboard data:", error);
			Alert.alert("Error loading data", error.message || String(error));
		} finally {
			setLoading(false);
		}
	};

	// Render a statistic card for dashboard numbers (applications, interviews, hires)
	const renderCard = (
		title: string,
		value: string | number,
		color: string,
		icon: React.ReactNode
	) => (
		<View style={[styles.statCard, { backgroundColor: color }]}>
			<View style={styles.statIcon}>{icon}</View>
			<Text style={styles.statValue}>{value}</Text>
			<Text style={styles.statLabel}>{title}</Text>
		</View>
	);

	// Render a job item (title + location)
	const renderJob = ({ item }: { item: Job }) => (
		<View style={styles.jobItem}>
			<MaterialIcons
				name="work-outline"
				size={20}
				color="#0f172a"
				style={{ marginRight: 8 }}
			/>
			<View>
				<Text style={styles.jobTitle}>{item.title}</Text>
				<Text style={styles.jobLocation}>{item.location}</Text>
			</View>
		</View>
	);

	// Render an applicant item (avatar + name)
	// Uses job_seeker info inside applicant
	const renderApplicant = ({ item }: { item: Applicant }) => {
		const { icon, color } = getStatusIcon(item.status);

		const fullName = item.job_seeker?.full_name ?? "Unknown";
		const initial = fullName[0]?.toUpperCase() ?? "?";

		return (
			<View style={styles.applicantItem}>
				{item.job_seeker?.avatar_url ? (
					<Image
						source={{ uri: item.job_seeker.avatar_url }}
						style={styles.avatar}
					/>
				) : (
					<View style={styles.avatarFallback}>
						<Text style={styles.avatarInitial}>{initial}</Text>
					</View>
				)}
				<View style={{ marginLeft: 12, flex: 1 }}>
					<Text style={styles.applicantName}>{fullName}</Text>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Ionicons
							name={icon}
							size={16}
							color={color}
							style={{ marginRight: 6 }}
						/>
						<Text style={{ color, textTransform: "capitalize" }}>
							{item.status}
						</Text>
					</View>
				</View>
			</View>
		);
	};

	// Render a message preview (sender avatar, name, preview text, timestamp)
	const renderMessage = ({ item }: { item: MessagePreview }) => {
		const initial = item.sender_name[0]?.toUpperCase() ?? "?";
		const avatar = item.sender_avatar ?? null;

		return (
			<View style={styles.messageItem}>
				{avatar ? (
					<Image source={{ uri: avatar }} style={styles.avatar} />
				) : (
					<View style={styles.avatarFallback}>
						<Text style={styles.avatarInitial}>{initial}</Text>
					</View>
				)}
				<View style={{ flex: 1, marginLeft: 12 }}>
					<Text style={styles.messageSender}>{item.sender_name}</Text>
					<Text style={styles.messagePreview} numberOfLines={1}>
						{item.preview_text}
					</Text>
				</View>
				<Text style={styles.messageTime}>
					{new Date(item.timestamp).toLocaleTimeString()}
				</Text>
			</View>
		);
	};

	const GlassyButton: React.FC<GlassyButtonProps> = ({
		children,
		style,
		onPress,
		activeOpacity = 0.8,
	}) => (
		<TouchableOpacity
			activeOpacity={activeOpacity}
			onPress={onPress}
			style={[style, { overflow: "hidden", borderRadius: 12 }]}
		>
			<LinearGradient
				colors={["rgba(1, 10, 21, 0.85)", "rgba(2, 23, 49, 0.55)"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					paddingVertical: 14,
				}}
			>
				{children}
			</LinearGradient>
		</TouchableOpacity>
	);

	const handlePostJob = () => {
		router.push("/create-job-post");
	};

	const handleEditProfile = () => {
		router.push("/edit-company-profile");
	};

	const handleDeleteJob = async (jobId: string) => {
		Alert.alert(
			"Confirm Delete",
			"Are you sure you want to delete this job post?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase
								.from("jobs")
								.delete()
								.eq("id", jobId);
							if (error) throw error;
							// Remove the deleted job from local state to update UI immediately
							setJobs((prev) => prev.filter((job) => job.id !== jobId));
							Alert.alert("Deleted", "Job post deleted successfully.");
						} catch (error: any) {
							Alert.alert(
								"Error",
								error.message || "Failed to delete job post."
							);
						}
					},
				},
			]
		);
	};

	const handleEditJob = (jobId: string) => {
		router.push({
			pathname: "/edit-job",
			params: { id: jobId },
		});
	};

	const scrollY = React.useRef(new Animated.Value(0)).current;
	if (loading) {
		return (
			<SafeAreaView style={[styles.container, styles.center]}>
				<LottieView
					source={require("../assets/animations/loading.json")} // your animation JSON path
					autoPlay
					loop
					style={{ width: 160, height: 160 }}
				/>
				{/* Optional loading text */}
				<Text style={{ color: "#0a2d52", marginTop: 12, fontSize: 16 }}>
					Loading your dashboard...
				</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#0a2d52" />
				</View>
			) : (
				<View style={{ flex: 1 }}>
					<ScrollView
						nestedScrollEnabled
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={{ paddingBottom: 40 }}
					>
						{/* 📇 Company Profile Card */}
						<View style={styles.profileCard}>
							{logoUrl ? (
								<Image source={{ uri: logoUrl }} style={styles.logoImage} />
							) : (
								<View style={styles.logoPlaceholder}>
									<Ionicons name="business-outline" size={40} color="#94a3b8" />
								</View>
							)}
							<View style={{ marginLeft: 14, flex: 1 }}>
								<Text style={styles.companyTitle}>{companyName}</Text>
								{industry && (
									<Text style={styles.companyDetail}>Industry: {industry}</Text>
								)}
								{teamSize && (
									<Text style={styles.companyDetail}>
										Team Size: {teamSize}
									</Text>
								)}
								{location && (
									<Text style={styles.companyDetail}>Location: {location}</Text>
								)}
								{website && (
									<Text style={styles.companyDetail}>Website: {website}</Text>
								)}
							</View>
							<TouchableOpacity
								onPress={handleEditProfile}
								style={styles.editBtnOverlay}
								accessibilityLabel="Edit Company Profile"
								accessibilityRole="button"
							>
								<Ionicons name="create-outline" size={24} color="#0a2d52" />
							</TouchableOpacity>
						</View>

						{/* 👋 Welcome Header */}
						<Text style={styles.header}>
							Welcome, {recruiterName ?? "Recruiter"}
						</Text>

						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								marginVertical: 16,
							}}
						>
							<GlassyButton
								onPress={handlePostJob}
								style={{
									flex: 1,
									marginRight: 8,
									borderRadius: 12,
									shadowColor: "#1366d6",
									shadowOffset: { width: 0, height: 6 },
									shadowOpacity: 0.4,
									shadowRadius: 8,
									elevation: 6,
								}}
							>
								<Text
									style={{
										color: "white",
										fontWeight: "700",
										fontSize: 16,
										textShadowColor: "rgba(0,0,0,0.25)",
										textShadowOffset: { width: 0, height: 1 },
										textShadowRadius: 2,
									}}
								>
									+ Post a Job
								</Text>
							</GlassyButton>

							<GlassyButton
								onPress={() => router.push("/candidate-swipe-screen")}
								style={{
									flex: 1,
									marginLeft: 8,
									borderRadius: 12,
									flexDirection: "row",
									justifyContent: "center",
									alignItems: "center",
									shadowColor: "#1366d6",
									shadowOffset: { width: 0, height: 6 },
									shadowOpacity: 0.4,
									shadowRadius: 8,
									elevation: 6,
								}}
							>
								<Ionicons
									name="people-outline"
									size={20}
									color="white"
									style={{
										marginRight: 6,
										textShadowColor: "rgba(0,0,0,0.25)",
										textShadowOffset: { width: 0, height: 1 },
										textShadowRadius: 2,
									}}
								/>
								<Text
									style={{
										color: "white",
										fontWeight: "700",
										fontSize: 16,
										textShadowColor: "rgba(0,0,0,0.25)",
										textShadowOffset: { width: 0, height: 1 },
										textShadowRadius: 2,
									}}
								>
									Swipe Candidates
								</Text>
							</GlassyButton>
						</View>

						<Text style={styles.subHeader}>Here's your dashboard overview</Text>

						{/* 📊 Stats Overview */}
						<View style={styles.statsContainer}>
							{renderCard(
								"Applications",
								applicationsCount,
								"#e0f2fe",
								<Ionicons name="mail-open-outline" size={24} color="#0284c7" />
							)}
							{renderCard(
								"Interviews",
								interviewsCount,
								"#fef9c3",
								<Ionicons
									name="chatbubble-ellipses-outline"
									size={24}
									color="#ca8a04"
								/>
							)}
							{renderCard(
								"Hired",
								hiredCount,
								"#dcfce7",
								<Ionicons
									name="checkmark-done-outline"
									size={24}
									color="#22c55e"
								/>
							)}
						</View>

						<BarChart
							key={`${applicationsCount}-${interviewsCount}-${hiredCount}`}
							data={{
								labels: ["Applications", "Interviews", "Hired"],
								datasets: [
									{ data: [applicationsCount, interviewsCount, hiredCount] },
								],
							}}
							width={screenWidth - 40}
							height={220}
							fromZero
							showValuesOnTopOfBars
							yAxisLabel=""
							yAxisSuffix=""
							chartConfig={{
								backgroundColor: "#ffffff",
								backgroundGradientFrom: "#f8fafc",
								backgroundGradientTo: "#f8fafc",
								decimalPlaces: 0,
								color: (opacity = 1) => `rgba(10, 45, 82, ${opacity})`,
								labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
								fillShadowGradient: "#0a2d52",
								fillShadowGradientOpacity: 1,
								barPercentage: 0.5, // 👈 thinner bars (simulate round look)
								style: { borderRadius: 16 },
								propsForBackgroundLines: {
									stroke: "#e5e7eb",
									strokeDasharray: "",
								},
								propsForLabels: {
									fontSize: 12,
								},
							}}
							style={{
								borderRadius: 16,
								marginBottom: 32,
								overflow: "hidden", // 👈 required to clip bar tops
							}}
						/>

						{/* 👤 Latest Applicants */}
						<TouchableOpacity
							style={styles.sectionTitleRow}
							onPress={() => router.push("/applicant-list")}
							activeOpacity={0.7}
							accessibilityLabel="View all applicants"
							accessibilityRole="button"
						>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<FontAwesome5 name="user-friends" size={18} color="#0f172a" />
								<Text style={styles.sectionTitleText}> Latest Applicants</Text>
							</View>
							<Ionicons
								name="chevron-forward-outline"
								size={20}
								color="#0f172a"
							/>
						</TouchableOpacity>

						<View
							style={
								applicants.length > 3
									? { maxHeight: 250, position: "relative" }
									: undefined
							}
						>
							<FlatList
								data={applicants.slice(0, 5)}
								keyExtractor={(item) => item.id}
								scrollEnabled={false}
								nestedScrollEnabled
								contentContainerStyle={{ paddingBottom: 20 }}
								ListEmptyComponent={
									<Text style={styles.emptyText}>No applicants yet</Text>
								}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={styles.applicantItem}
										onPress={() =>
											router.push({
												pathname: "/applicant-details",
												params: {
													job_seeker_id: item.job_seeker.id, // must match [job_seeker_id]
												},
											})
										}
										activeOpacity={0.7}
										accessibilityLabel={`View applicant ${item.job_seeker.full_name}`}
										accessibilityRole="button"
									>
										<View style={styles.iconContainer}>
											{item.job_seeker.avatar_url ? (
												<Image
													source={{ uri: item.job_seeker.avatar_url }}
													style={styles.avatar}
												/>
											) : (
												<Ionicons
													name="person-circle-outline"
													size={40}
													color="#0f172a"
												/>
											)}
										</View>
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.applicantName}>
												{item.job_seeker.full_name}
											</Text>
											<Text style={styles.applicantJobTitle}>
												{item.job.title}
											</Text>
											{item.message ? (
												<Text
													numberOfLines={2}
													style={styles.applicantMessage}
													ellipsizeMode="tail"
												>
													{item.message}
												</Text>
											) : null}
										</View>
									</TouchableOpacity>
								)}
							/>

							{applicants.length > 3 && (
								<>
									<View
										pointerEvents="none"
										style={[styles.fadeTop, { height: 20, top: 0 }]}
									/>
									<View
										pointerEvents="none"
										style={[styles.fadeBottom, { height: 20, bottom: 0 }]}
									/>
								</>
							)}
						</View>

						{/* 💬 Messages */}
						<TouchableOpacity
							onPress={() => router.push("/messages-recruiter")}
							style={[styles.sectionTitleRow, { marginTop: 32 }]}
							activeOpacity={0.7}
							accessibilityLabel="Go to messages"
							accessibilityRole="button"
						>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<Ionicons name="chatbubble-outline" size={20} color="#0f172a" />
								<Text style={styles.sectionTitleText}> Messages</Text>
							</View>
							<Ionicons
								name="chevron-forward-outline"
								size={20}
								color="#0f172a"
							/>
						</TouchableOpacity>

						<View
							style={
								messages.length > 3
									? { maxHeight: 250, position: "relative" }
									: undefined
							}
						>
							<FlatList
								data={messages.slice(0, 3)}
								keyExtractor={(item) => item.id}
								scrollEnabled={false}
								nestedScrollEnabled
								contentContainerStyle={{ paddingBottom: 40 }}
								ListEmptyComponent={
									<Text style={styles.emptyText}>No messages yet</Text>
								}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={styles.jobItem}
										activeOpacity={0.7}
										onPress={() => router.push("/messages-recruiter")}
										accessibilityLabel={`Open chat with ${item.sender_name}`}
										accessibilityRole="button"
									>
										<Ionicons
											name="person-circle-outline"
											size={22}
											color="#0f172a"
											style={{ marginRight: 8 }}
										/>
										<View style={{ flex: 1 }}>
											<Text style={[styles.jobTitle, { fontStyle: "italic" }]}>
												{item.sender_name}
											</Text>
											<Text
												style={[styles.jobLocation, { fontStyle: "italic" }]}
												numberOfLines={1}
											>
												{item.preview_text}
											</Text>
										</View>
									</TouchableOpacity>
								)}
							/>
							{messages.length > 3 && (
								<>
									<View
										pointerEvents="none"
										style={[styles.fadeTop, { height: 20, top: 0 }]}
									/>
									<View
										pointerEvents="none"
										style={[styles.fadeBottom, { height: 20, bottom: 0 }]}
									/>
								</>
							)}
						</View>

						{/* 📋 Listed Jobs */}
						<TouchableOpacity
							onPress={() => router.push("/listed-jobs")}
							style={[styles.sectionTitleRow, { marginTop: 24 }]}
							activeOpacity={0.7}
							accessibilityLabel="Go to listed jobs"
							accessibilityRole="button"
						>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<MaterialIcons name="work-outline" size={20} color="#0f172a" />
								<Text style={styles.sectionTitleText}> Listed Jobs</Text>
							</View>
							<Ionicons
								name="chevron-forward-outline"
								size={20}
								color="#0f172a"
							/>
						</TouchableOpacity>

						<View
							style={
								jobs.length > 3
									? { maxHeight: 250, position: "relative" }
									: undefined
							}
						>
							<FlatList
								data={jobs}
								keyExtractor={(item: Job) => item.id}
								scrollEnabled={false}
								nestedScrollEnabled
								contentContainerStyle={{ paddingBottom: 40 }}
								ListEmptyComponent={
									<Text style={styles.emptyText}>No jobs listed</Text>
								}
								renderItem={({ item }: { item: Job }) => (
									<TouchableOpacity
										style={styles.jobItem}
										activeOpacity={0.7}
										onPress={() => handleEditJob(item.id)}
										accessibilityLabel={`Edit job ${item.title}`}
										accessibilityRole="button"
									>
										<Ionicons
											name="document-text-outline"
											size={20}
											color="#0f172a"
											style={{ marginRight: 8 }}
										/>
										<View style={{ flex: 1 }}>
											<Text style={[styles.jobTitle, { fontStyle: "italic" }]}>
												{item.title}
											</Text>
											<Text
												style={[styles.jobLocation, { fontStyle: "italic" }]}
											>
												{item.location}
											</Text>
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteJob(item.id)}
											style={{ padding: 8 }}
											accessibilityLabel={`Delete job ${item.title}`}
											accessibilityRole="button"
										>
											<Ionicons
												name="trash-outline"
												size={22}
												color="#dc2626"
											/>
										</TouchableOpacity>
									</TouchableOpacity>
								)}
							/>
							{jobs.length > 3 && (
								<>
									<View
										pointerEvents="none"
										style={[styles.fadeTop, { height: 20, top: 0 }]}
									/>
									<View
										pointerEvents="none"
										style={[styles.fadeBottom, { height: 20, bottom: 0 }]}
									/>
								</>
							)}
						</View>
					</ScrollView>

					{/* Floating Settings Button */}
					<Animated.View style={styles.floatingSettingsBtn}>
						<TouchableOpacity
							onPress={() => router.push("/settings")}
							activeOpacity={0.85}
						>
							<Ionicons name="settings-outline" size={30} color="white" />
						</TouchableOpacity>
					</Animated.View>
				</View>
			)}
		</SafeAreaView>
	);
};

export default RecruiterDashboard;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
	},
	center: {
		justifyContent: "center",
		alignItems: "center",
	},
	profileCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 16,
		marginTop: 20,
		marginBottom: 20,
		position: "relative",
	},
	logoImage: {
		width: 60,
		height: 60,
		borderRadius: 12,
		backgroundColor: "#e2e8f0",
	},
	logoPlaceholder: {
		width: 60,
		height: 60,
		borderRadius: 12,
		backgroundColor: "#e2e8f0",
		justifyContent: "center",
		alignItems: "center",
	},
	companyTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#0f172a",
		marginBottom: 4,
	},
	companyDetail: {
		fontSize: 14,
		color: "#475569",
		marginBottom: 2,
	},
	editBtnOverlay: {
		position: "absolute",
		top: 12,
		right: 12,
		backgroundColor: "#e2e8f0",
		padding: 8,
		borderRadius: 24,
	},
	header: {
		fontSize: 26,
		fontWeight: "700",
		color: "#0a2d52",
		marginBottom: 12,
	},
	postJobButton: {
		backgroundColor: "#0a2d52",
		paddingVertical: 12,
		borderRadius: 16,
		marginBottom: 20,
		alignItems: "center",
	},
	postJobButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "700",
	},
	subHeader: {
		fontSize: 16,
		color: "#64748b",
		marginBottom: 20,
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 24,
	},
	statCard: {
		flex: 1,
		padding: 16,
		borderRadius: 16,
		marginRight: 12,
		elevation: 2,
		alignItems: "center",
	},
	statIcon: {
		marginBottom: 8,
	},
	statValue: {
		fontSize: 24,
		fontWeight: "700",
		color: "#1e293b",
	},
	statLabel: {
		fontSize: 14,
		color: "#475569",
		marginTop: 4,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#0f172a",
		marginBottom: 12,
		flexDirection: "row",
		alignItems: "center",
	},
	applicantItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		padding: 12,
		borderRadius: 12,
		marginBottom: 12,
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#e2e8f0",
	},
	avatarFallback: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#0f172a",
		justifyContent: "center",
		alignItems: "center",
	},
	avatarInitial: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "700",
	},
	applicantName: {
		fontSize: 16,
		fontWeight: "600",
		color: "#0f172a",
	},
	applicantRole: {
		fontSize: 14,
		color: "#64748b",
	},
	messageItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
		padding: 12,
		borderRadius: 12,
		marginBottom: 12,
	},
	messageSender: {
		fontSize: 16,
		fontWeight: "600",
		color: "#0f172a",
	},
	messagePreview: {
		fontSize: 14,
		color: "#475569",
		marginTop: 2,
	},
	messageTime: {
		fontSize: 12,
		color: "#94a3b8",
		marginLeft: 8,
	},
	jobItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		padding: 14,
		borderRadius: 12,
		marginBottom: 12,
	},
	jobTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#0f172a",
	},
	jobLocation: {
		fontSize: 14,
		color: "#64748b",
		marginTop: 4,
	},
	emptyText: {
		textAlign: "center",
		color: "#999",
		fontStyle: "italic",
		marginVertical: 16,
	},
	fadeTop: {
		position: "absolute",
		left: 0,
		right: 0,
		backgroundColor: "white", // Or your background color
		opacity: 0.7,
		zIndex: 1,
	},
	fadeBottom: {
		position: "absolute",
		left: 0,
		right: 0,
		backgroundColor: "white",
		opacity: 0.7,
		zIndex: 1,
	},
	sectionTitleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 4,
		marginBottom: 12,
	},
	statusBadge: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		overflow: "hidden",
		backgroundColor: "rgba(255, 255, 255, 0.3)", // fallback
		backdropFilter: "blur(10px)", // for web, ignored on native
	},

	sectionTitleText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#0f172a",
		marginLeft: 6,
	},

	applicantAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
	},

	applicantJobTitle: {
		fontSize: 14,
		color: "#555",
	},
	applicantMessage: {
		fontSize: 13,
		color: "#888",
		marginTop: 4,
	},
	iconContainer: {
		width: 48,
		height: 48,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
		borderRadius: 24,
	},

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
});
