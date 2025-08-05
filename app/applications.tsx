import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Image,
	ActivityIndicator,
	Platform,
} from "react-native";
import { supabase } from "../firebase/supabase";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

interface Recruiter {
	company_name: string;
	company_logo?: string;
}

interface Job {
	title: string;
	location: string;
	type: string;
	recruiters?: Recruiter | null;
}

interface Application {
	id: string;
	job_id: string;
	applied_at: string;
	status: "pending" | "accepted" | "rejected";
	jobs?: Job | null;
}

const STATUS_COLORS: Record<Application["status"], string> = {
	pending: "#FACC15",
	accepted: "#10B981",
	rejected: "#EF4444",
};

export default function MyApplicationsPage() {
	const [applications, setApplications] = useState<Application[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const router = useRouter();
	const insets = useSafeAreaInsets();

	useEffect(() => {
		const fetchApplications = async () => {
			setLoading(true);
			setError("");

			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				setError("User not authenticated.");
				setLoading(false);
				return;
			}

			const { data, error: fetchError } = await supabase
				.from("applications")
				.select(
					`
          id,
          job_id,
          applied_at,
          status,
          jobs:jobs (
            title,
            location,
            type,
            recruiters:recruiter_id (
              company_name,
              company_logo
            )
          )
        `
				)
				.eq("job_seeker_id", user.id)
				.order("applied_at", { ascending: false });

			if (fetchError) {
				console.error("Error fetching applications:", fetchError);
				setError("Something went wrong while fetching applications.");
			} else {
				setApplications(data || []);
			}
			setLoading(false);
		};

		fetchApplications();
	}, []);

	const renderStatusBar = (status: Application["status"]) => {
		const color = STATUS_COLORS[status];
		if (Platform.OS === "ios") {
			return (
				<BlurView
					intensity={50}
					tint="light"
					style={[styles.statusBar, { backgroundColor: color + "44" }]}
				/>
			);
		} else {
			return (
				<View style={[styles.statusBar, { backgroundColor: color + "44" }]} />
			);
		}
	};

	const renderItem = ({ item }: { item: Application }) => {
		if (!item.jobs) return null;

		const job = item.jobs;
		const recruiter = job.recruiters ?? null;
		const logo = recruiter?.company_logo;
		const statusColor = STATUS_COLORS[item.status];

		return (
			<TouchableOpacity
				style={styles.card}
				onPress={() =>
					router.push({
						pathname: "/job-details",
						params: { id: item.job_id },
					})
				}
			>
				{/* Logo */}
				<View style={styles.logoContainer}>
					{logo ? (
						<Image source={{ uri: logo }} style={styles.logoImg} />
					) : (
						<View style={styles.logoFallback}>
							<Text style={styles.logoInitial}>
								{recruiter?.company_name?.charAt(0).toUpperCase() ?? "?"}
							</Text>
						</View>
					)}
				</View>

				{/* Job Info */}
				<View style={styles.textContainer}>
					<Text style={styles.title} numberOfLines={1}>
						{job.title}
					</Text>
					<Text style={styles.company}>
						{recruiter?.company_name ?? "Unknown Company"}
					</Text>
					<Text style={styles.meta}>
						{job.location} • {job.type}
					</Text>
					<Text style={styles.appliedDate}>
						Applied: {new Date(item.applied_at).toLocaleDateString()}
					</Text>

					{renderStatusBar(item.status)}
					<Text style={[styles.statusText, { color: statusColor }]}>
						{item.status.toUpperCase()}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<View
			style={[
				styles.container,
				{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 },
			]}
		>
			<Text style={styles.pageTitle}>Your Applications</Text>

			{loading ? (
				<ActivityIndicator
					size="large"
					color="#0a2d52"
					style={{ marginTop: 30 }}
				/>
			) : error ? (
				<Text style={styles.errorText}>{error}</Text>
			) : applications.length === 0 ? (
				<View style={styles.emptyBox}>
					<Text style={styles.emptyText}>No applications yet.</Text>
					<Text style={styles.emptySubtext}>Start applying now!</Text>
				</View>
			) : (
				<FlatList
					data={applications}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={{ paddingBottom: 60 }}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F9FF",
		paddingHorizontal: 20,
	},
	pageTitle: {
		fontSize: 28,
		fontWeight: "800",
		color: "#0a2d52",
		textAlign: "center",
		marginBottom: 16,
	},
	card: {
		flexDirection: "row",
		backgroundColor: "#fff",
		padding: 16,
		borderRadius: 18,
		marginBottom: 14,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 3,
	},
	logoContainer: {
		marginRight: 14,
	},
	logoImg: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: "#e2e8f0",
	},
	logoFallback: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: "#0a2d52",
		justifyContent: "center",
		alignItems: "center",
	},
	logoInitial: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "bold",
	},
	textContainer: {
		flex: 1,
		position: "relative",
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: "#181A2B",
	},
	company: {
		fontSize: 14,
		color: "#4a5568",
		marginTop: 2,
	},
	meta: {
		fontSize: 13,
		color: "#718096",
		marginTop: 2,
	},
	appliedDate: {
		fontSize: 12,
		color: "#A0AEC0",
		marginTop: 2,
		marginBottom: 8,
	},
	statusBar: {
		height: 6,
		borderRadius: 3,
		marginBottom: 4,
		marginTop: 8,
		width: "100%",
	},
	statusText: {
		fontSize: 13,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	emptyBox: {
		alignItems: "center",
		marginTop: 60,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#444",
		marginBottom: 6,
	},
	emptySubtext: {
		fontSize: 14,
		color: "#888",
	},
	errorText: {
		color: "red",
		textAlign: "center",
		marginTop: 20,
	},
});
