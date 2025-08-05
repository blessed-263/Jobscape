import React, { useEffect, useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Image,
	Alert,
	ActivityIndicator,
	Platform,
	Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.9;

export default function JobDetails() {
	const { id } = useLocalSearchParams();
	const [job, setJob] = useState<any>(null);
	const [recruiter, setRecruiter] = useState<any>(null);
	const [alreadyApplied, setAlreadyApplied] = useState(false);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const fetchJobDetails = useCallback(async () => {
		if (typeof id !== "string") return;
		setLoading(true);

		try {
			const { data, error } = await supabase
				.from("jobs")
				.select(
					`*, recruiters:recruiter_id(id, company_name, company_logo, contact_name)`
				)
				.eq("id", id)
				.single();

			if (error) throw error;
			setJob(data);
			setRecruiter(data?.recruiters || null);

			const user = (await supabase.auth.getUser()).data.user;
			if (!user) {
				setAlreadyApplied(false);
				setLoading(false);
				return;
			}

			const { data: apps } = await supabase
				.from("applications")
				.select("id")
				.eq("job_id", id)
				.eq("job_seeker_id", user.id)
				.limit(1);

			setAlreadyApplied((apps ?? []).length > 0);
		} catch (error: any) {
			Alert.alert("Error", error.message);
			setJob(null);
			setRecruiter(null);
		}
		setLoading(false);
	}, [id]);

	useEffect(() => {
		fetchJobDetails();
	}, [fetchJobDetails]);

	const applyToJob = async () => {
		if (!job) return;
		setLoading(true);

		try {
			const user = (await supabase.auth.getUser()).data.user;
			if (!user) throw new Error("Please log in.");

			await supabase.from("applications").insert([
				{
					job_id: job.id,
					job_seeker_id: user.id,
					status: "pending",
					applied_at: new Date().toISOString(),
				},
			]);

			await supabase
				.from("saved_jobs")
				.delete()
				.eq("job_id", job.id)
				.eq("job_seeker_id", user.id);

			if (recruiter?.id) {
				await supabase.from("notifications").insert([
					{
						user_id: recruiter.id,
						title: `New application for ${job.title}`,
						description: `${user.email} has applied to your job posting.`,
						type: "application_update",
						is_read: false,
						link: `/job-details/${job.id}`,
						metadata: { job_id: job.id, applicant_id: user.id },
					},
				]);
			}

			setAlreadyApplied(true);
			Alert.alert("Success", "You have applied to this job!");
		} catch (error: any) {
			Alert.alert("Error", error.message);
		}

		setLoading(false);
	};

	if (loading && !job) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0a2d52" />
			</View>
		);
	}

	if (!job) {
		return (
			<View style={styles.loadingContainer}>
				<Text style={styles.errorText}>Job not found.</Text>
			</View>
		);
	}

	return (
		<View style={styles.outerContainer}>
			<View style={styles.card}>
				<ScrollView
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
				>
					{/* Header */}
					<View style={styles.header}>
						{recruiter?.company_logo ? (
							<Image
								source={{ uri: recruiter.company_logo }}
								style={styles.logo}
							/>
						) : (
							<View style={styles.logoPlaceholder}>
								<Text style={styles.logoInitial}>
									{recruiter?.company_name?.charAt(0).toUpperCase() ?? "J"}
								</Text>
							</View>
						)}

						<View style={styles.headerText}>
							<Text style={styles.jobTitle}>{job.title}</Text>
							<Text style={styles.companyName}>{recruiter?.company_name}</Text>
						</View>
					</View>

					{/* Meta */}
					<View style={styles.metaRow}>
						<Text style={styles.metaText}>📍 {job.location}</Text>
						<Text style={styles.metaText}>💼 {job.type}</Text>
					</View>

					<Text style={styles.postedText}>
						🕒 Posted {new Date(job.created_at).toLocaleDateString()}
					</Text>

					{/* Description */}
					<Text style={styles.sectionTitle}>Job Description</Text>
					<Text style={styles.description}>{job.description}</Text>

					{/* Skills */}
					{job.skills?.length > 0 && (
						<>
							<Text style={styles.sectionTitle}>Required Skills</Text>
							<View style={styles.skillsContainer}>
								{job.skills.map((skill: string, idx: number) => (
									<View key={idx} style={styles.skillTag}>
										<Text style={styles.skillText}>{skill}</Text>
									</View>
								))}
							</View>
						</>
					)}

					{/* Apply / Status */}
					{alreadyApplied ? (
						<BlurView intensity={50} tint="light" style={styles.statusBar}>
							<Text style={styles.statusText}>You’ve already applied 🎉</Text>
						</BlurView>
					) : (
						<TouchableOpacity
							style={styles.applyButton}
							onPress={applyToJob}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={styles.applyText}>Apply Now</Text>
							)}
						</TouchableOpacity>
					)}
				</ScrollView>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	outerContainer: {
		flex: 1,
		backgroundColor: "#e6eef7",
		justifyContent: "center",
		alignItems: "center",
		padding: 12,
	},
	card: {
		width: CARD_WIDTH,
		maxHeight: "90%",
		backgroundColor: "#fff",
		borderRadius: 24,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 6,
	},
	content: {
		paddingBottom: 30,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#fff",
	},
	errorText: {
		fontSize: 16,
		color: "#ff4444",
		fontWeight: "600",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
	},
	logo: {
		width: 60,
		height: 60,
		borderRadius: 12,
		backgroundColor: "#f0f0f0",
		marginRight: 14,
	},
	logoPlaceholder: {
		width: 60,
		height: 60,
		borderRadius: 12,
		backgroundColor: "#0a2d52",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 14,
	},
	logoInitial: {
		fontSize: 24,
		color: "#fff",
		fontWeight: "bold",
	},
	headerText: {
		flex: 1,
	},
	jobTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#0a2d52",
		marginBottom: 4,
	},
	companyName: {
		fontSize: 16,
		color: "#4a5568",
	},
	metaRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginVertical: 8,
	},
	metaText: {
		fontSize: 14,
		color: "#444",
	},
	postedText: {
		fontSize: 13,
		color: "#888",
		marginBottom: 18,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
		color: "#0a2d52",
	},
	description: {
		fontSize: 14,
		color: "#333",
		lineHeight: 20,
		marginBottom: 16,
	},
	skillsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 20,
	},
	skillTag: {
		backgroundColor: "#edf2f7",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	skillText: {
		fontSize: 13,
		color: "#2d3748",
	},
	applyButton: {
		backgroundColor: "#0a2d52",
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 10,
	},
	applyText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 16,
	},
	statusBar: {
		backgroundColor: "rgba(10, 45, 82, 0.08)",
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 10,
	},
	statusText: {
		color: "#0a2d52",
		fontWeight: "600",
		fontSize: 15,
	},
});
