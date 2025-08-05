import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	Image,
	TouchableOpacity,
	Alert,
	ScrollView,
	Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../firebase/supabase";
import { Ionicons } from "@expo/vector-icons";

interface JobSeekerProfile {
	id: string;
	full_name: string;
	avatar_url?: string | null;
	resume_url?: string | null;
	phone?: string | null;
	email?: string | null;
}

interface ApplicationDetails {
	id: string;
	message?: string | null;
	status: string;
	applied_at: string;
}

const STATUS_LABELS = {
	pending: "Pending",
	accepted: "Accepted",
	interview: "Interview Scheduled",
	rejected: "Rejected",
};

const ApplicantDetails = () => {
	const { job_seeker_id } = useLocalSearchParams<{ job_seeker_id: string }>();
	const router = useRouter();

	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
	const [application, setApplication] = useState<ApplicationDetails | null>(
		null
	);

	useEffect(() => {
		if (!job_seeker_id) {
			Alert.alert("Error", "No applicant ID provided");
			router.back();
			return;
		}
		fetchApplicantDetails(job_seeker_id);
	}, [job_seeker_id]);

	const fetchApplicantDetails = async (id: string) => {
		setLoading(true);
		try {
			// Helper to extract relative file path from full public URL
			const getRelativePath = (fullUrl: string, bucketName: string) => {
				const prefix = `/storage/v1/object/public/${bucketName}/`;
				const index = fullUrl.indexOf(prefix);
				if (index === -1) return null;
				return fullUrl.substring(index + prefix.length);
			};

			const { data: profileData, error: profileError } = await supabase
				.from("job_seekers")
				.select("id, full_name, avatar_url, resume_url, phone, email")
				.eq("id", id)
				.single();

			if (profileError) {
				console.error("Profile fetch error:", profileError);
				throw profileError;
			}

			// Generate signed URL for avatar if exists
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
					if (!avatarError) profileData.avatar_url = avatarSigned.signedUrl;
					else console.warn("⚠️ Avatar signed URL error:", avatarError);
				}
			}

			// Generate signed URL for resume if exists
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
					if (!resumeError) profileData.resume_url = resumeSigned.signedUrl;
					else console.warn("⚠️ Resume signed URL error:", resumeError);
				}
			}

			setProfile(profileData);

			const { data: applicationData, error: appError } = await supabase
				.from("applications")
				.select("id, message, status, applied_at")
				.eq("job_seeker_id", id)
				.order("applied_at", { ascending: false })
				.limit(1)
				.single();

			if (appError && appError.code !== "PGRST116") {
				console.error("Application fetch error:", appError);
				throw appError;
			}
			setApplication(applicationData || null);
		} catch (error) {
			console.error("Failed to load applicant details:", error);
			Alert.alert("Error", "Failed to load applicant details");
			router.back();
		} finally {
			setLoading(false);
		}
	};

	const openURL = async (url: string | null | undefined) => {
		if (!url) {
			Alert.alert("Not available", "No URL provided");
			return;
		}
		const supported = await Linking.canOpenURL(url);
		if (supported) {
			await Linking.openURL(url);
		} else {
			Alert.alert("Error", "Cannot open the link");
		}
	};

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#0a2d52" />
			</View>
		);
	}

	if (!profile) {
		return (
			<View style={styles.center}>
				<Text style={styles.errorText}>Applicant details not found.</Text>
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			{profile.avatar_url ? (
				<TouchableOpacity onPress={() => openURL(profile.avatar_url)}>
					<Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
					<Text style={styles.linkText}>View Profile Photo</Text>
				</TouchableOpacity>
			) : (
				<View style={styles.avatarPlaceholder}>
					<Ionicons name="person-circle-outline" size={140} color="#64748b" />
					<Text style={styles.noDataText}>No profile photo available</Text>
				</View>
			)}

			<Text style={styles.name}>{profile.full_name}</Text>

			{profile.phone ? (
				<Text style={styles.contact}>Phone: {profile.phone}</Text>
			) : null}

			{profile.email ? (
				<Text style={styles.contact}>Email: {profile.email}</Text>
			) : null}

			{application?.message ? (
				<>
					<Text style={styles.sectionTitle}>Applicant's Message</Text>
					<Text style={styles.message}>"{application.message}"</Text>
				</>
			) : null}

			{application ? (
				<>
					<Text style={styles.sectionTitle}>Application Status</Text>
					<Text style={styles.status}>
						{STATUS_LABELS[application.status as keyof typeof STATUS_LABELS] ||
							application.status}
					</Text>

					<Text style={styles.sectionTitle}>Applied On</Text>
					<Text style={styles.appliedAt}>
						{new Date(application.applied_at).toLocaleDateString()}
					</Text>
				</>
			) : null}

			{profile.resume_url ? (
				<TouchableOpacity
					style={styles.resumeButton}
					onPress={() => openURL(profile.resume_url)}
					activeOpacity={0.7}
				>
					<Ionicons name="document-outline" size={20} color="#fff" />
					<Text style={styles.resumeButtonText}>View Resume</Text>
				</TouchableOpacity>
			) : (
				<Text style={styles.noDataText}>No resume uploaded</Text>
			)}
		</ScrollView>
	);
};

export default ApplicantDetails;

const styles = StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: "#fff",
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#fff",
		padding: 20,
	},
	errorText: {
		fontSize: 16,
		color: "red",
	},
	avatar: {
		width: 140,
		height: 140,
		borderRadius: 70,
		alignSelf: "center",
		marginBottom: 10,
	},
	avatarPlaceholder: {
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 10,
	},
	linkText: {
		color: "#0a2d52",
		textAlign: "center",
		marginBottom: 20,
		textDecorationLine: "underline",
	},
	name: {
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
		color: "#0a2d52",
		marginBottom: 10,
	},
	contact: {
		fontSize: 14,
		color: "#64748b",
		textAlign: "center",
		marginBottom: 4,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#0a2d52",
		marginTop: 20,
		marginBottom: 8,
	},
	message: {
		fontSize: 16,
		fontStyle: "italic",
		color: "#334155",
		textAlign: "center",
		marginHorizontal: 10,
	},
	status: {
		fontSize: 16,
		color: "#059669",
		fontWeight: "bold",
		textTransform: "capitalize",
		textAlign: "center",
	},
	appliedAt: {
		fontSize: 14,
		color: "#64748b",
		textAlign: "center",
	},
	resumeButton: {
		marginTop: 30,
		backgroundColor: "#0a2d52",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	resumeButtonText: {
		color: "#fff",
		fontWeight: "bold",
		marginLeft: 8,
		fontSize: 16,
	},
	noDataText: {
		textAlign: "center",
		color: "#64748b",
		fontStyle: "italic",
		marginTop: 10,
	},
});
