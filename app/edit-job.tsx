import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	Alert,
	StyleSheet,
	Platform,
	ActivityIndicator,
	KeyboardAvoidingView,
	useColorScheme,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import DraggableFlatList, {
	RenderItemParams,
} from "react-native-draggable-flatlist";
import { supabase } from "../firebase/supabase";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const experienceOptions = ["Entry", "Mid-Level", "Senior", "Internship"];
const perkOptions = ["Remote work", "Health insurance", "Flexible hours"];

type Item = { key: string; label: string };

const EditJobPostPage = () => {
	const isDark = useColorScheme() === "dark";
	const router = useRouter();
	const { id } = useLocalSearchParams(); // get job id from route params

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Job fields
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [type, setType] = useState("");
	const [description, setDescription] = useState("");

	const [requirements, setRequirements] = useState<Item[]>([]);
	const [newRequirement, setNewRequirement] = useState("");

	const [experienceLevel, setExperienceLevel] = useState("");
	const [applicationDeadline, setApplicationDeadline] = useState<Date | null>(
		null
	);

	const [skills, setSkills] = useState<Item[]>([]);
	const [newSkill, setNewSkill] = useState("");

	const [perks, setPerks] = useState<string[]>([]);
	const [howToApply, setHowToApply] = useState("");

	// Recruiter info
	const [companyId, setCompanyId] = useState<string | null>(null);
	const [companyName, setCompanyName] = useState<string | null>(null);
	const [companyLogo, setCompanyLogo] = useState<string | null>(null);
	const [companyDescription, setCompanyDescription] = useState<string | null>(
		null
	);

	const [loadingRecruiter, setLoadingRecruiter] = useState(true);
	const [showDatePicker, setShowDatePicker] = useState(false);

	useEffect(() => {
		if (!id) {
			Alert.alert("Invalid Job ID", "No job ID was provided.");
			router.back();
			return;
		}

		const fetchData = async () => {
			try {
				// Get authenticated user
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();
				if (userError || !user) {
					Alert.alert(
						"Authentication error",
						"You must be logged in to edit a job."
					);
					router.back();
					return;
				}

				// Fetch recruiter info
				const { data: recruiterData, error: recruiterError } = await supabase
					.from("recruiters")
					.select(`id, company_name, company_logo, about`)
					.eq("id", user.id)
					.single();

				if (recruiterError || !recruiterData) {
					Alert.alert(
						"Profile Missing",
						"You need to complete your recruiter profile before editing jobs."
					);
					router.back();
					return;
				}

				setCompanyId(recruiterData.id);
				setCompanyName(recruiterData.company_name ?? null);
				setCompanyLogo(recruiterData.company_logo ?? null);
				setCompanyDescription(recruiterData.about ?? null);
				setLoadingRecruiter(false);

				// Fetch job data by id
				const { data: jobData, error: jobError } = await supabase
					.from("jobs")
					.select(
						`id, title, location, type, description, requirements, experience_level, application_deadline, skills, perks, how_to_apply, recruiter_id`
					)
					.eq("id", id)
					.single();

				if (jobError || !jobData) {
					Alert.alert("Job Not Found", "Could not find the job post to edit.");
					router.back();
					return;
				}

				// Verify recruiter owns the job
				if (jobData.recruiter_id !== user.id) {
					Alert.alert("Unauthorized", "You can only edit your own job posts.");
					router.back();
					return;
				}

				// Prefill form
				setTitle(jobData.title);
				setLocation(jobData.location);
				setType(jobData.type);
				setDescription(jobData.description);
				setRequirements(
					(jobData.requirements || []).map((req: string) => ({
						key: generateKey(req),
						label: req,
					}))
				);
				setExperienceLevel(jobData.experience_level);
				setApplicationDeadline(
					jobData.application_deadline
						? new Date(jobData.application_deadline)
						: null
				);
				setSkills(
					(jobData.skills || []).map((skill: string) => ({
						key: generateKey(skill),
						label: skill,
					}))
				);
				setPerks(jobData.perks || []);
				setHowToApply(jobData.how_to_apply || "");
			} catch (e: any) {
				Alert.alert(
					"Error",
					e.message || "Failed to load job or recruiter info."
				);
				router.back();
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [id]);

	const generateKey = (text: string) =>
		text + "-" + Math.random().toString(36).slice(2);

	const handleAddSkill = () => {
		const trimmed = newSkill.trim();
		if (trimmed && !skills.some((s) => s.label === trimmed)) {
			setSkills((prev) => [
				...prev,
				{ key: generateKey(trimmed), label: trimmed },
			]);
			setNewSkill("");
		}
	};

	const handleAddRequirement = () => {
		const trimmed = newRequirement.trim();
		if (trimmed && !requirements.some((r) => r.label === trimmed)) {
			setRequirements((prev) => [
				...prev,
				{ key: generateKey(trimmed), label: trimmed },
			]);
			setNewRequirement("");
		}
	};

	const togglePerk = (perk: string) => {
		setPerks((prev) =>
			prev.includes(perk) ? prev.filter((p) => p !== perk) : [...prev, perk]
		);
	};

	const handleDeleteSkill = (key: string) => {
		setSkills((prev) => prev.filter((item) => item.key !== key));
	};

	const handleDeleteRequirement = (key: string) => {
		setRequirements((prev) => prev.filter((item) => item.key !== key));
	};

	const handleSubmit = async () => {
		if (
			!title.trim() ||
			!location.trim() ||
			!type.trim() ||
			!description.trim() ||
			!experienceLevel ||
			!applicationDeadline ||
			!companyId ||
			!companyName
		) {
			Alert.alert(
				"Missing Fields",
				"Please fill out all required fields and ensure your profile is complete."
			);
			return;
		}

		setSaving(true);

		const jobData = {
			recruiter_id: companyId, // FK to recruiters.id
			title: title.trim(),
			location: location.trim(),
			type: type.trim(),
			description: description.trim(),
			requirements: requirements.map((r) => r.label), // text[]
			experience_level: experienceLevel,
			application_deadline: applicationDeadline.toISOString(),
			skills: skills.map((s) => s.label), // text[]
			perks,
			how_to_apply: howToApply.trim() || null,
		};

		try {
			const { error } = await supabase
				.from("jobs")
				.update(jobData)
				.eq("id", id);

			if (error) throw error;

			Alert.alert("Success", "Job post updated successfully!");
			router.back();
		} catch (error: any) {
			Alert.alert("Error", error.message || "Failed to update job post.");
		} finally {
			setSaving(false);
		}
	};

	if (loading || loadingRecruiter) {
		return (
			<SafeAreaView
				style={[styles.container, isDark ? styles.dark : styles.light]}
			>
				<View
					style={[
						styles.container,
						{ justifyContent: "center", alignItems: "center" },
					]}
				>
					<ActivityIndicator size="large" color="#0a2d52" />
					<Text style={{ marginTop: 10 }}>Loading job data...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!companyId) {
		return (
			<SafeAreaView
				style={[
					styles.container,
					isDark ? styles.dark : styles.light,
					{ justifyContent: "center", padding: 20 },
				]}
			>
				<Text
					style={{
						fontSize: 18,
						textAlign: "center",
						color: isDark ? "#fff" : "#000",
					}}
				>
					You must complete your recruiter profile before editing jobs.
				</Text>
			</SafeAreaView>
		);
	}

	const renderItem =
		(onDelete: (key: string) => void) =>
		({ item, drag, isActive }: RenderItemParams<Item>) =>
			(
				<TouchableOpacity
					style={[styles.chip, isActive && { backgroundColor: "#075985" }]}
					onLongPress={drag}
					delayLongPress={200}
					activeOpacity={0.9}
				>
					<Text style={[styles.chipText, isActive && { color: "#fff" }]}>
						{item.label}
					</Text>
					<TouchableOpacity
						onPress={() => onDelete(item.key)}
						style={styles.deleteButton}
					>
						<Ionicons
							name="close-circle"
							size={20}
							color={isActive ? "#fff" : "#333"}
						/>
					</TouchableOpacity>
				</TouchableOpacity>
			);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaView
				style={[styles.container, isDark ? styles.dark : styles.light]}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={styles.heading}>Edit Job Post</Text>

						<TextInput
							style={styles.input}
							placeholder="Job Title"
							value={title}
							onChangeText={setTitle}
						/>
						<TextInput
							style={styles.input}
							placeholder="Location"
							value={location}
							onChangeText={setLocation}
						/>
						<TextInput
							style={styles.input}
							placeholder="Job Type (e.g. Full-Time)"
							value={type}
							onChangeText={setType}
						/>
						<TextInput
							style={[styles.input, styles.textArea]}
							placeholder="Job Description"
							value={description}
							onChangeText={setDescription}
							multiline
						/>

						{/* Requirements Section */}
						<Text style={styles.label}>Requirements</Text>
						<View style={styles.skillInputRow}>
							<TextInput
								style={[styles.input, { flex: 1, marginRight: 10 }]}
								placeholder="Add Requirement"
								value={newRequirement}
								onChangeText={setNewRequirement}
							/>
							<TouchableOpacity onPress={handleAddRequirement}>
								<Ionicons name="add-circle" size={28} color="#0a2d52" />
							</TouchableOpacity>
						</View>
						<DraggableFlatList<Item>
							data={requirements}
							onDragEnd={({ data }) => setRequirements(data)}
							keyExtractor={(item) => item.key}
							renderItem={renderItem(handleDeleteRequirement)}
							horizontal
							contentContainerStyle={{ paddingVertical: 8 }}
							showsHorizontalScrollIndicator={false}
						/>

						{/* Experience Level */}
						<Text style={styles.label}>Experience Level</Text>
						{experienceOptions.map((level) => (
							<TouchableOpacity
								key={level}
								onPress={() => setExperienceLevel(level)}
								style={[
									styles.option,
									experienceLevel === level && styles.optionSelected,
								]}
							>
								<Text
									style={
										experienceLevel === level
											? styles.optionTextSelected
											: styles.optionText
									}
								>
									{level}
								</Text>
							</TouchableOpacity>
						))}

						{/* Application Deadline */}
						<Text style={styles.label}>Application Deadline</Text>
						<TouchableOpacity
							onPress={() => setShowDatePicker(true)}
							style={styles.input}
						>
							<Text>
								{applicationDeadline
									? applicationDeadline.toDateString()
									: "Select Deadline"}
							</Text>
						</TouchableOpacity>
						{showDatePicker && (
							<DateTimePicker
								value={applicationDeadline || new Date()}
								mode="date"
								display="default"
								onChange={(e, date) => {
									setShowDatePicker(false);
									if (date) setApplicationDeadline(date);
								}}
							/>
						)}

						{/* Skills Section */}
						<Text style={styles.label}>Skills</Text>
						<View style={styles.skillInputRow}>
							<TextInput
								style={[styles.input, { flex: 1, marginRight: 10 }]}
								placeholder="Add Skill"
								value={newSkill}
								onChangeText={setNewSkill}
							/>
							<TouchableOpacity onPress={handleAddSkill}>
								<Ionicons name="add-circle" size={28} color="#0a2d52" />
							</TouchableOpacity>
						</View>
						<DraggableFlatList<Item>
							data={skills}
							onDragEnd={({ data }) => setSkills(data)}
							keyExtractor={(item) => item.key}
							renderItem={renderItem(handleDeleteSkill)}
							horizontal
							contentContainerStyle={{ paddingVertical: 8 }}
							showsHorizontalScrollIndicator={false}
						/>

						{/* Perks Section */}
						<Text style={styles.label}>Perks</Text>
						<View style={styles.chipContainer}>
							{perkOptions.map((perk) => (
								<TouchableOpacity
									key={perk}
									onPress={() => togglePerk(perk)}
									style={[
										styles.chip,
										perks.includes(perk) && styles.chipSelected,
									]}
								>
									<Text
										style={[
											styles.chipText,
											perks.includes(perk) && styles.chipTextSelected,
										]}
									>
										{perk}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<TextInput
							style={[styles.input, styles.textArea]}
							placeholder="How to Apply (email, link, instructions)"
							value={howToApply}
							onChangeText={setHowToApply}
							multiline
						/>

						<TouchableOpacity
							onPress={handleSubmit}
							style={styles.submitButton}
							disabled={saving}
						>
							{saving ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={styles.submitText}>Save Changes</Text>
							)}
						</TouchableOpacity>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
};

export default EditJobPostPage;

const styles = StyleSheet.create({
	container: { flex: 1 },
	scroll: { padding: 20 },
	heading: {
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 20,
		color: "#0a2d52",
	},
	input: {
		backgroundColor: "#f0f0f0",
		padding: 14,
		borderRadius: 10,
		fontSize: 16,
		marginBottom: 12,
	},
	textArea: {
		height: 100,
		textAlignVertical: "top",
	},
	label: {
		fontWeight: "600",
		fontSize: 16,
		marginVertical: 8,
	},
	option: {
		padding: 10,
		borderWidth: 1,
		borderColor: "#aaa",
		borderRadius: 8,
		marginBottom: 8,
	},
	optionSelected: {
		backgroundColor: "#0a2d52",
		borderColor: "#0a2d52",
	},
	optionText: { color: "#333" },
	optionTextSelected: { color: "#fff" },
	chipContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginBottom: 12,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#ddd",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		marginRight: 8,
		marginBottom: 8,
	},
	chipSelected: {
		backgroundColor: "#0a2d52",
	},
	chipText: {
		fontSize: 14,
		marginRight: 6,
	},
	chipTextSelected: {
		color: "#fff",
	},
	skillInputRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	deleteButton: {
		paddingLeft: 4,
	},
	submitButton: {
		backgroundColor: "#0a2d52",
		paddingVertical: 16,
		borderRadius: 10,
		alignItems: "center",
		marginTop: 20,
	},
	submitText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 18,
	},
	dark: {
		backgroundColor: "#121212",
	},
	light: {
		backgroundColor: "#ffffff",
	},
});
