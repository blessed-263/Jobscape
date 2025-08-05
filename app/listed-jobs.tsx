import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";

interface Job {
	id: string;
	title: string;
	location: string;
	applicants_count: number;
}

const ListedJobsPage = () => {
	const router = useRouter();
	const [jobs, setJobs] = useState<Job[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	const fetchListedJobs = async () => {
		setLoading(true);
		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (error || !user) {
				router.replace("/sign-in-recruiter");
				return;
			}

			const { data: jobList, error: jobsError } = await supabase
				.from("jobs")
				.select("id, title, location")
				.eq("recruiter_id", user.id)
				.order("created_at", { ascending: false });

			if (jobsError) throw jobsError;

			const jobIds = jobList?.map((job) => job.id) || [];

			let applicationCounts: Record<string, number> = {};

			if (jobIds.length > 0) {
				const { data: applications, error: countError } = await supabase
					.from("applications")
					.select("job_id", { count: "exact", head: false });

				if (countError) throw countError;

				applicationCounts = applications?.reduce((acc, app) => {
					acc[app.job_id] = (acc[app.job_id] || 0) + 1;
					return acc;
				}, {} as Record<string, number>);
			}

			const jobsWithCounts =
				jobList?.map((job) => ({
					...job,
					applicants_count: applicationCounts[job.id] || 0,
				})) || [];

			setJobs(jobsWithCounts);
		} catch (e: any) {
			Alert.alert("Error", e.message || "Failed to fetch jobs");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteJob = async (jobId: string) => {
		Alert.alert("Delete Job", "Are you sure you want to delete this job?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					const { error } = await supabase
						.from("jobs")
						.delete()
						.eq("id", jobId);
					if (!error) {
						setJobs((prev) => prev.filter((job) => job.id !== jobId));
					} else {
						Alert.alert("Error", error.message);
					}
				},
			},
		]);
	};

	const handleEditJob = (jobId: string) => {
		router.push({ pathname: "/edit-job", params: { id: jobId } });
	};

	useEffect(() => {
		fetchListedJobs();
	}, []);

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#0a2d52" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.header}>Your Listed Jobs</Text>
			{jobs.length === 0 ? (
				<Text style={styles.emptyText}>You have not posted any jobs yet.</Text>
			) : (
				<FlatList
					data={jobs}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<View style={styles.jobCard}>
							<View style={{ flex: 1 }}>
								<Text style={styles.jobTitle}>{item.title}</Text>
								<Text style={styles.jobLocation}>{item.location}</Text>
								<View style={styles.applicantCountContainer}>
									<Ionicons
										name="people-outline"
										size={16}
										color="#475569"
										style={{ marginRight: 6 }}
									/>
									<Text style={styles.applicantCountText}>
										{item.applicants_count}{" "}
										{item.applicants_count === 1 ? "Applicant" : "Applicants"}
									</Text>
								</View>
							</View>
							<View style={styles.actions}>
								<TouchableOpacity
									onPress={() => handleEditJob(item.id)}
									style={styles.iconButton}
								>
									<Ionicons name="create-outline" size={20} color="#0284c7" />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => handleDeleteJob(item.id)}
									style={styles.iconButton}
								>
									<Ionicons name="trash-outline" size={20} color="#dc2626" />
								</TouchableOpacity>
							</View>
						</View>
					)}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: "#fff",
	},
	header: {
		fontSize: 28,
		fontWeight: "800",
		color: "#0a2d52",
		marginBottom: 24,
		letterSpacing: 0.5,
		lineHeight: 34,
	},
	jobCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: "#f8fafc",
		padding: 16,
		borderRadius: 16,
		marginBottom: 16,
	},
	jobTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#0f172a",
	},
	jobLocation: {
		fontSize: 14,
		color: "#64748b",
		marginVertical: 4,
	},
	applicantCountContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 6,
	},
	applicantCountText: {
		fontSize: 13,
		color: "#475569",
	},
	actions: {
		flexDirection: "row",
		marginLeft: 12,
	},
	iconButton: {
		padding: 8,
		marginLeft: 4,
	},
	emptyText: {
		textAlign: "center",
		marginTop: 50,
		color: "#64748b",
		fontStyle: "italic",
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});

export default ListedJobsPage;
