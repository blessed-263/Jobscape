import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	TextInput,
	Modal,
	Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ActivityIndicator } from "react-native-paper";

interface Applicant {
	id: string;
	job_id: string;
	job_seeker_id: string;
	message?: string | null;
	status: "pending" | "accepted" | "interview" | "rejected";
	applied_at: string;
	job: { id: string; title: string };
	job_seeker: { id: string; full_name: string };
	interview?: { scheduled_date: string } | null;
}

const STATUS_COLORS = {
	pending: "#facc15",
	accepted: "#10b981",
	interview: "#3b82f6",
	rejected: "#ef4444",
};

const STATUS_LABELS = {
	pending: "Pending",
	accepted: "Accepted",
	interview: "Interview",
	rejected: "Rejected",
};

const ApplicantList = () => {
	const [applicants, setApplicants] = useState<Applicant[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | Applicant["status"]>(
		"all"
	);
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
		null
	);

	// Interview form state
	const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
	const [location, setLocation] = useState("");
	const [notes, setNotes] = useState("");
	const [showDatePicker, setShowDatePicker] = useState(false);

	const router = useRouter();

	useEffect(() => {
		fetchApplicants();
	}, []);

	const fetchApplicants = async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("applications")
			.select(
				`
    id, job_id, job_seeker_id, message, status, applied_at,
    job:job_id(id, title),
    job_seeker:job_seeker_id(id, full_name),
    interviews!fk_applicant(scheduled_date)
  `
			)
			.order("applied_at", { ascending: false });

		console.log("Raw fetched data:", data);
		if (error) console.error("Supabase error:", error);

		if (!error && data) {
			const normalized = data.map((a: any) => ({
				...a,
				job: Array.isArray(a.job) ? a.job[0] : a.job,
				job_seeker: Array.isArray(a.job_seeker)
					? a.job_seeker[0]
					: a.job_seeker,
				interview:
					a.interviews && a.interviews.length > 0 ? a.interviews[0] : null,
			}));
			console.log("Normalized applicants:", normalized);
			setApplicants(normalized);
		}
		setLoading(false);
	};

	const filteredApplicants = applicants.filter((a) => {
		if (statusFilter !== "all" && a.status !== statusFilter) return false;
		if (
			search &&
			!a.job_seeker.full_name.toLowerCase().includes(search.toLowerCase())
		)
			return false;
		return true;
	});

	const handleReject = async (id: string) => {
		await supabase
			.from("applications")
			.update({ status: "rejected" })
			.eq("id", id);
		await fetchApplicants();
	};

	const handleAccept = async (id: string) => {
		await supabase
			.from("applications")
			.update({ status: "accepted" })
			.eq("id", id);
		await fetchApplicants();
	};

	const openInterviewModal = (applicant: Applicant) => {
		setSelectedApplicant(applicant);
		setScheduledDate(new Date());
		setLocation("");
		setNotes("");
		setModalVisible(true);
	};

	const submitInterview = async () => {
		if (!selectedApplicant) return;

		const { data: userData } = await supabase.auth.getUser();
		const recruiterId = userData.user?.id;

		if (!recruiterId) {
			console.error("Recruiter not authenticated.");
			return;
		}

		// 1. Schedule the interview
		const { error: interviewError } = await supabase.from("interviews").insert({
			applicant_id: selectedApplicant.id,
			recruiter_id: recruiterId,
			scheduled_date: scheduledDate.toISOString(),
			location,
			notes,
		});

		if (interviewError) {
			console.error("Failed to schedule interview:", interviewError.message);
			return;
		}

		// 2. Update application status
		const { error: updateError } = await supabase
			.from("applications")
			.update({ status: "interview" })
			.eq("id", selectedApplicant.id);

		if (updateError) {
			console.error(
				"Failed to update application status:",
				updateError.message
			);
			return;
		}

		// ✅ 3. Check if match already exists
		const { data: existingMatch, error: matchCheckError } = await supabase
			.from("matches")
			.select("id")
			.eq("job_id", selectedApplicant.job_id)
			.eq("job_seeker_id", selectedApplicant.job_seeker.id)
			.single();

		if (matchCheckError && matchCheckError.code !== "PGRST116") {
			// Ignore 'no rows found' error (code PGRST116)
			console.error("Error checking existing match:", matchCheckError.message);
			return;
		}

		if (!existingMatch) {
			// No match exists — insert new match
			const { error: matchInsertError } = await supabase
				.from("matches")
				.insert({
					job_id: selectedApplicant.job_id,
					job_seeker_id: selectedApplicant.job_seeker.id,
					recruiter_id: recruiterId,
					application_id: selectedApplicant.id,
				});

			if (matchInsertError) {
				console.error("Failed to create match:", matchInsertError.message);
			} else {
				console.log("✅ Match created successfully.");
			}
		} else {
			console.log("⚠️ Match already exists — skipping insert.");
		}

		setModalVisible(false);
		await fetchApplicants();
	};

	const renderItem = ({ item }: { item: Applicant }) => (
		<View style={styles.card}>
			<View style={styles.cardHeader}>
				<Text style={styles.cardName}>{item.job_seeker.full_name}</Text>
				<View
					style={[
						styles.badge,
						{ backgroundColor: STATUS_COLORS[item.status] },
					]}
				>
					<Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
				</View>
			</View>

			<Text style={styles.cardSub}>Applied for: {item.job.title}</Text>

			{item.message && <Text style={styles.cardMessage}>“{item.message}”</Text>}

			<View style={styles.actionRow}>
				<TouchableOpacity
					style={styles.linkButton}
					onPress={() =>
						router.push({
							pathname: "/applicant-details",
							params: { job_seeker_id: item.job_seeker.id },
						})
					}
				>
					<Text style={styles.linkButtonText}>View Profile</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.actionButton}
					onPress={() => openInterviewModal(item)}
					disabled={item.status === "interview" || item.status === "accepted"}
				>
					<Text style={styles.actionButtonText}>Schedule</Text>
				</TouchableOpacity>

				{/* Show Accept button only if interview scheduled */}
				{item.status === "interview" && item.interview && (
					<TouchableOpacity
						style={[styles.actionButton, { backgroundColor: "#10b981" }]}
						onPress={() => handleAccept(item.id)}
					>
						<Text style={styles.actionButtonText}>Accept</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity
					style={[styles.actionButton, { backgroundColor: "#b91c1c" }]}
					onPress={() => handleReject(item.id)}
					disabled={item.status === "rejected" || item.status === "accepted"}
				>
					<Text style={styles.actionButtonText}>Reject</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<View style={styles.container}>
			<TextInput
				style={styles.searchInput}
				placeholder="Search applicants..."
				placeholderTextColor="#9ca3af"
				value={search}
				onChangeText={setSearch}
			/>

			<View style={styles.filterRow}>
				{["all", "pending", "interview", "accepted", "rejected"].map(
					(status) => (
						<TouchableOpacity
							key={status}
							style={[
								styles.chip,
								statusFilter === status && styles.chipSelected,
							]}
							onPress={() => setStatusFilter(status as any)}
						>
							<Text
								style={[
									styles.chipText,
									statusFilter === status && styles.chipTextSelected,
								]}
							>
								{status === "all"
									? "All"
									: STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
							</Text>
						</TouchableOpacity>
					)
				)}
			</View>

			{loading ? (
				<ActivityIndicator
					style={{ marginTop: 40 }}
					size="large"
					color="#0a2d52"
				/>
			) : (
				<FlatList
					data={filteredApplicants}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={{ paddingBottom: 100 }}
					ListEmptyComponent={
						<Text style={styles.emptyText}>No applicants found.</Text>
					}
				/>
			)}

			{/* Interview Modal */}
			<Modal visible={modalVisible} animationType="slide" transparent>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Schedule Interview</Text>

						<TouchableOpacity
							style={styles.dateButton}
							onPress={() => setShowDatePicker(true)}
						>
							<Text style={styles.dateButtonText}>
								{scheduledDate.toLocaleString()}
							</Text>
						</TouchableOpacity>

						{showDatePicker && (
							<DateTimePicker
								value={scheduledDate}
								mode="datetime"
								display={Platform.OS === "ios" ? "inline" : "default"}
								onChange={(event, date) => {
									setShowDatePicker(false);
									if (date) setScheduledDate(date);
								}}
							/>
						)}

						<TextInput
							placeholder="Location"
							style={styles.input}
							value={location}
							onChangeText={setLocation}
						/>

						<TextInput
							placeholder="Notes"
							style={[styles.input, { height: 60 }]}
							value={notes}
							onChangeText={setNotes}
							multiline
						/>

						<View style={styles.modalActions}>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: "#64748b" }]}
								onPress={() => setModalVisible(false)}
							>
								<Text style={styles.modalBtnText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: "#0a2d52" }]}
								onPress={submitInterview}
							>
								<Text style={styles.modalBtnText}>Confirm</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

export default ApplicantList;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		padding: 16,
	},
	searchInput: {
		height: 48,
		borderColor: "#d1d5db",
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 16,
		marginBottom: 12,
		color: "#0a2d52",
	},
	filterRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 16,
	},
	chip: {
		paddingVertical: 6,
		paddingHorizontal: 14,
		borderRadius: 16,
		backgroundColor: "#e5e7eb",
	},
	chipSelected: {
		backgroundColor: "#0a2d52",
	},
	chipText: {
		fontSize: 14,
		color: "#0a2d52",
	},
	chipTextSelected: {
		color: "#fff",
	},
	card: {
		backgroundColor: "#f9fafb",
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	cardName: {
		fontSize: 16,
		fontWeight: "600",
		color: "#0a2d52",
	},
	cardSub: {
		color: "#475569",
		marginTop: 4,
	},
	cardMessage: {
		fontStyle: "italic",
		color: "#334155",
		marginTop: 8,
	},
	badge: {
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 12,
	},
	badgeText: {
		color: "#fff",
		fontSize: 12,
	},
	actionRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 12,
	},
	linkButton: {
		padding: 8,
		backgroundColor: "#e2e8f0",
		borderRadius: 8,
	},
	linkButtonText: {
		color: "#0a2d52",
	},
	actionButton: {
		padding: 8,
		backgroundColor: "#0a2d52",
		borderRadius: 8,
		marginLeft: 8,
	},
	actionButtonText: {
		color: "#fff",
	},
	emptyText: {
		textAlign: "center",
		color: "#64748b",
		marginTop: 40,
	},
	modalContainer: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		backgroundColor: "#fff",
		width: "90%",
		padding: 20,
		borderRadius: 12,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 12,
		color: "#0a2d52",
	},
	input: {
		borderWidth: 1,
		borderColor: "#cbd5e1",
		borderRadius: 8,
		padding: 10,
		marginBottom: 12,
		color: "#0a2d52",
	},
	dateButton: {
		padding: 10,
		backgroundColor: "#e2e8f0",
		borderRadius: 8,
		marginBottom: 12,
	},
	dateButtonText: {
		color: "#0a2d52",
	},
	modalActions: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	modalBtn: {
		flex: 1,
		padding: 10,
		borderRadius: 8,
		alignItems: "center",
		marginHorizontal: 4,
	},
	modalBtnText: {
		color: "#fff",
		fontWeight: "bold",
	},
});
