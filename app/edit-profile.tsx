import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	Image,
	StyleSheet,
	ActivityIndicator,
	Platform,
	KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../firebase/supabase";
import * as FileSystem from "expo-file-system";
import { decode as atob } from "base-64";

interface ResumeFile {
	name: string;
	uri: string;
	blob?: Blob;
}

interface ExperienceItem {
	id: string;
	role: string;
	company: string;
	startDate: string; // ISO string date "YYYY-MM-DD"
	endDate: string; // ISO string date or empty string for Present
	description: string;
}

export default function EditProfileScreen({
	navigation,
}: {
	navigation?: any;
}) {
	const [loading, setLoading] = useState(false);

	const [profile, setProfile] = useState({
		name: "",
		email: "",
		phone: "",
		photo: null as string | null,
		resume: null as ResumeFile | null,
		professionalTitle: "",

		about: "",

		skills: [] as string[],
		qualifications: [] as string[],

		experience: [] as ExperienceItem[],
	});

	// Date picker state for experience editing
	const [showDatePicker, setShowDatePicker] = useState<{
		visible: boolean;
		mode: "startDate" | "endDate" | null;
		index: number | null;
	}>({ visible: false, mode: null, index: null });

	// Load profile data on mount
	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError || !user) {
					Alert.alert("Error", "Could not get user info.");
					setLoading(false);
					return;
				}

				const { data: jobSeeker, error: jsError } = await supabase
					.from("job_seekers")
					.select(
						`full_name, email, phone, avatar_url, resume_url, resume_name, profession`
					)
					.eq("id", user.id)
					.single();

				const { data: seekerProfile, error: profileError } = await supabase
					.from("job_seeker_profiles")
					.select(`summary, skills, qualifications, experience`)
					.eq("id", user.id)
					.single();

				if (jsError && jsError.code !== "PGRST116") throw jsError;
				if (profileError && profileError.code !== "PGRST116")
					throw profileError;

				setProfile({
					name: jobSeeker?.full_name || "",
					email: jobSeeker?.email || "",
					phone: jobSeeker?.phone || "",
					photo: jobSeeker?.avatar_url || null,
					resume: jobSeeker?.resume_url
						? {
								name: jobSeeker.resume_name || "Resume",
								uri: jobSeeker.resume_url,
						  }
						: null,
					professionalTitle: jobSeeker?.profession || "",

					about: seekerProfile?.summary || "",
					skills: seekerProfile?.skills || [],
					qualifications: seekerProfile?.qualifications || [],
					experience: seekerProfile?.experience || [],
				});
			} catch (error) {
				console.error("Failed to load profile:", error);
				Alert.alert("Error", "Failed to load profile data.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	// Add/remove items for skills or qualifications
	const addItem = (field: "skills" | "qualifications", value: string) => {
		if (!value.trim()) return;
		setProfile((prev) => ({
			...prev,
			[field]: [...prev[field], value.trim()],
		}));
	};

	const removeItem = (field: "skills" | "qualifications", index: number) => {
		setProfile((prev) => {
			const copy = [...prev[field]];
			copy.splice(index, 1);
			return { ...prev, [field]: copy };
		});
	};

	// Experience handlers
	const addExperience = () => {
		setProfile((prev) => ({
			...prev,
			experience: [
				...prev.experience,
				{
					id: Date.now().toString(),
					role: "",
					company: "",
					startDate: "",
					endDate: "",
					description: "",
				},
			],
		}));
	};

	const updateExperienceField = (
		index: number,
		field: keyof ExperienceItem,
		value: string
	) => {
		setProfile((prev) => {
			const copy = [...prev.experience];
			copy[index] = { ...copy[index], [field]: value };
			return { ...prev, experience: copy };
		});
	};

	const removeExperience = (index: number) => {
		setProfile((prev) => {
			const copy = [...prev.experience];
			copy.splice(index, 1);
			return { ...prev, experience: copy };
		});
	};

	// Show date picker
	const onShowDatePicker = (mode: "startDate" | "endDate", index: number) => {
		setShowDatePicker({ visible: true, mode, index });
	};

	// Date picker change
	const onDateChange = (event: any, selectedDate?: Date) => {
		if (
			!showDatePicker.visible ||
			showDatePicker.index === null ||
			!showDatePicker.mode
		) {
			setShowDatePicker({ visible: false, mode: null, index: null });
			return;
		}
		setShowDatePicker({ visible: false, mode: null, index: null });

		if (selectedDate) {
			updateExperienceField(
				showDatePicker.index,
				showDatePicker.mode,
				selectedDate.toISOString().split("T")[0]
			);
		}
	};

	// Handle single input changes
	const handleChange = (field: string, value: string) => {
		setProfile((prev) => ({ ...prev, [field]: value }));
	};

	// Upload file helper
	const uploadFile = async (
		uri: string,
		bucket: "profile-photos" | "resumes" | "company-logos"
	): Promise<string | null> => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) throw new Error("User not authenticated");

			// Extract file extension safely
			const ext = uri.split(".").pop() || "bin";
			const fileName = `${user.id}/${Date.now()}.${ext}`;

			// Read file as base64 using expo-file-system
			const fileBase64 = await FileSystem.readAsStringAsync(uri, {
				encoding: FileSystem.EncodingType.Base64,
			});

			// Convert base64 to Uint8Array buffer
			const binaryString = atob(fileBase64);
			const len = binaryString.length;
			const bytes = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			// Derive content type roughly from extension (improve this map as needed)
			const contentTypeMap: Record<string, string> = {
				jpg: "image/jpeg",
				jpeg: "image/jpeg",
				png: "image/png",
				pdf: "application/pdf",
				doc: "application/msword",
				docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			};
			const contentType =
				contentTypeMap[ext.toLowerCase()] || "application/octet-stream";

			const { data, error } = await supabase.storage
				.from(bucket)
				.upload(fileName, bytes, {
					upsert: true,
					cacheControl: "3600",
					contentType,
				});

			if (error) {
				console.error("[UPLOAD ERROR]", error);
				throw error;
			}

			const { data: publicData } = supabase.storage
				.from(bucket)
				.getPublicUrl(data.path);

			console.log("[UPLOAD SUCCESS]", publicData.publicUrl);

			return publicData.publicUrl;
		} catch (err) {
			console.error("[UPLOAD EXCEPTION]", err);
			Alert.alert("Upload Error", "Failed to upload file.");
			return null;
		}
	};

	// Pick profile photo
	const handleImagePick = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 1,
			allowsEditing: true,
		});
		if (!result.canceled && result.assets?.[0]) {
			setProfile((prev) => ({ ...prev, photo: result.assets[0].uri }));
		}
	};

	// Pick resume document
	const handleResumePick = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: [
					"application/pdf",
					"application/msword",
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				],
				copyToCacheDirectory: true,
			});

			if (!result.canceled && result.assets?.[0]) {
				const file = result.assets[0];

				if (!file.uri.startsWith("file://")) {
					Alert.alert("Invalid File", "File URI is not valid.");
					return;
				}

				const response = await fetch(file.uri);
				const blob = await response.blob();

				setProfile((prev) => ({
					...prev,
					resume: {
						name: file.name,
						uri: file.uri,
						blob,
					},
				}));
			}
		} catch (err) {
			console.error("Resume pick error:", err);
			Alert.alert("Error", "Failed to pick resume document.");
		}
	};

	// Save profile data
	const handleSave = async () => {
		setLoading(true);

		if (
			!profile.name ||
			!profile.professionalTitle ||
			profile.skills.length === 0
		) {
			Alert.alert(
				"Incomplete",
				"Please fill in all required fields: Name, Title, Skills."
			);
			setLoading(false);
			return;
		}

		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				Alert.alert("Error", "User not authenticated.");
				setLoading(false);
				return;
			}

			let photo_url = profile.photo;
			let resume_url = profile.resume?.uri || null;

			if (photo_url && !photo_url.startsWith("http")) {
				const uploaded = await uploadFile(photo_url, "profile-photos");
				if (uploaded) photo_url = uploaded;
			}

			if (resume_url && !resume_url.startsWith("http")) {
				const uploaded = await uploadFile(resume_url, "resumes");
				if (uploaded) resume_url = uploaded;
			}

			// Upsert main job_seekers table
			const { error: jsError } = await supabase.from("job_seekers").upsert(
				{
					id: user.id,
					full_name: profile.name,
					email: profile.email,
					phone: profile.phone,
					avatar_url: photo_url,
					resume_url,
					resume_name: profile.resume?.name || null,
					profession: profile.professionalTitle,
				},
				{ onConflict: "id" }
			);

			if (jsError) throw jsError;

			// Upsert job_seeker_profiles table with skills, qualifications, experience
			const { error: profileError } = await supabase
				.from("job_seeker_profiles")
				.upsert(
					{
						id: user.id,
						summary: profile.about,
						skills: profile.skills,
						qualifications: profile.qualifications,
						experience: profile.experience,
					},
					{ onConflict: "id" }
				);

			if (profileError) throw profileError;

			Alert.alert("Success", "Your profile has been successfully updated.", [
				{ text: "OK", onPress: () => navigation?.goBack() },
			]);
		} catch (error) {
			console.error("Save error:", error);
			Alert.alert("Error", "Failed to save profile.");
		} finally {
			setLoading(false);
		}
	};

	// Input state for adding new skill/qualification
	const [newSkill, setNewSkill] = useState("");
	const [newQualification, setNewQualification] = useState("");

	if (loading) {
		return (
			<View style={[styles.container, { justifyContent: "center" }]}>
				<ActivityIndicator size="large" color="#1E88E5" />
				<Text style={{ textAlign: "center", marginTop: 10 }}>Loading...</Text>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // adjust offset if you have header
		>
			<ScrollView
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={styles.header}>Edit Resume</Text>
				<Text style={styles.subtext}>Craft your professional identity</Text>

				<TouchableOpacity
					style={styles.imageContainer}
					onPress={handleImagePick}
				>
					{profile.photo ? (
						<Image source={{ uri: profile.photo }} style={styles.image} />
					) : (
						<View style={styles.placeholderImage}>
							<Text style={styles.placeholderText}>Add Photo</Text>
						</View>
					)}
				</TouchableOpacity>

				<View style={styles.section}>
					<Text style={styles.label}>Full Name *</Text>
					<TextInput
						style={styles.input}
						value={profile.name}
						onChangeText={(t) => handleChange("name", t)}
						placeholder="Your full name"
						autoCapitalize="words"
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.label}>Email</Text>
					<TextInput
						style={styles.input}
						value={profile.email}
						onChangeText={(t) => handleChange("email", t)}
						keyboardType="email-address"
						autoCapitalize="none"
						placeholder="Your email"
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.label}>Phone</Text>
					<TextInput
						style={styles.input}
						value={profile.phone}
						onChangeText={(t) => handleChange("phone", t)}
						keyboardType="phone-pad"
						placeholder="+1234567890"
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.label}>Professional Title *</Text>
					<TextInput
						style={styles.input}
						value={profile.professionalTitle}
						onChangeText={(t) => handleChange("professionalTitle", t)}
						placeholder="e.g., UX Designer"
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>About Me</Text>
					<TextInput
						style={styles.textArea}
						multiline
						value={profile.about}
						onChangeText={(t) => handleChange("about", t)}
						placeholder="Tell us about yourself"
					/>
				</View>

				{/* Skills input */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Skills *</Text>
					<View style={styles.tagContainer}>
						{profile.skills.map((skill, i) => (
							<View key={i} style={styles.tag}>
								<Text style={styles.tagText}>{skill}</Text>
								<TouchableOpacity onPress={() => removeItem("skills", i)}>
									<Text style={styles.tagRemove}>×</Text>
								</TouchableOpacity>
							</View>
						))}
					</View>
					<View style={styles.tagInputRow}>
						<TextInput
							style={[styles.input, { flex: 1, marginBottom: 0 }]}
							placeholder="Add skill"
							value={newSkill}
							onChangeText={setNewSkill}
							onSubmitEditing={() => {
								addItem("skills", newSkill);
								setNewSkill("");
							}}
							returnKeyType="done"
						/>
						<TouchableOpacity
							style={styles.addButton}
							onPress={() => {
								addItem("skills", newSkill);
								setNewSkill("");
							}}
						>
							<Text style={styles.addButtonText}>+</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Qualifications input */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Qualifications</Text>
					<View style={styles.tagContainer}>
						{profile.qualifications.map((qual, i) => (
							<View key={i} style={styles.tag}>
								<Text style={styles.tagText}>{qual}</Text>
								<TouchableOpacity
									onPress={() => removeItem("qualifications", i)}
								>
									<Text style={styles.tagRemove}>×</Text>
								</TouchableOpacity>
							</View>
						))}
					</View>
					<View style={styles.tagInputRow}>
						<TextInput
							style={[styles.input, { flex: 1, marginBottom: 0 }]}
							placeholder="Add qualification"
							value={newQualification}
							onChangeText={setNewQualification}
							onSubmitEditing={() => {
								addItem("qualifications", newQualification);
								setNewQualification("");
							}}
							returnKeyType="done"
						/>
						<TouchableOpacity
							style={styles.addButton}
							onPress={() => {
								addItem("qualifications", newQualification);
								setNewQualification("");
							}}
						>
							<Text style={styles.addButtonText}>+</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Experience section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Work Experience</Text>
					{profile.experience.map((exp, i) => (
						<View key={exp.id} style={styles.experienceItem}>
							<View style={styles.expRow}>
								<TextInput
									style={[styles.input, { flex: 1, marginBottom: 0 }]}
									placeholder="Role"
									value={exp.role}
									onChangeText={(text) =>
										updateExperienceField(i, "role", text)
									}
								/>
								<TouchableOpacity
									style={styles.removeExpBtn}
									onPress={() => removeExperience(i)}
								>
									<Text style={styles.removeExpBtnText}>×</Text>
								</TouchableOpacity>
							</View>

							<TextInput
								style={[styles.input, { marginBottom: 8 }]}
								placeholder="Company"
								value={exp.company}
								onChangeText={(text) =>
									updateExperienceField(i, "company", text)
								}
							/>

							<View style={{ flexDirection: "row", marginBottom: 8 }}>
								<TouchableOpacity
									style={styles.datePickerButton}
									onPress={() => onShowDatePicker("startDate", i)}
								>
									<Text style={styles.datePickerText}>
										{exp.startDate || "Start Date"}
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.datePickerButton}
									onPress={() => onShowDatePicker("endDate", i)}
								>
									<Text style={styles.datePickerText}>
										{exp.endDate || "End Date / Present"}
									</Text>
								</TouchableOpacity>
							</View>

							<TextInput
								style={[styles.textArea, { height: 80 }]}
								multiline
								placeholder="Description"
								value={exp.description}
								onChangeText={(text) =>
									updateExperienceField(i, "description", text)
								}
							/>
						</View>
					))}

					<TouchableOpacity style={styles.addExpButton} onPress={addExperience}>
						<Text style={styles.addExpButtonText}>+ Add Experience</Text>
					</TouchableOpacity>
				</View>

				{/* Resume Upload */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Resume / CV</Text>
					<TouchableOpacity
						style={styles.uploadButton}
						onPress={handleResumePick}
					>
						<Text style={styles.uploadButtonText}>
							{profile.resume ? profile.resume.name : "Upload Resume"}
						</Text>
					</TouchableOpacity>
				</View>

				<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
					<Text style={styles.saveButtonText}>Save Resume</Text>
				</TouchableOpacity>

				<TouchableOpacity onPress={() => navigation?.goBack()}>
					<Text style={styles.backLink}>← Back to Profile</Text>
				</TouchableOpacity>

				{/* Date Picker Modal */}
				{showDatePicker.visible && (
					<DateTimePicker
						value={
							profile.experience[showDatePicker.index!]?.[showDatePicker.mode!]
								? new Date(
										profile.experience[showDatePicker.index!][
											showDatePicker.mode!
										]
								  )
								: new Date()
						}
						mode="date"
						display={Platform.OS === "ios" ? "spinner" : "default"}
						onChange={onDateChange}
						maximumDate={new Date()}
					/>
				)}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 20, backgroundColor: "#FAFAFA", paddingBottom: 40 },
	header: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#222",
		marginBottom: 4,
		textAlign: "center",
	},
	subtext: {
		fontSize: 14,
		color: "#666",
		marginBottom: 20,
		textAlign: "center",
	},
	imageContainer: { alignSelf: "center", marginBottom: 20 },
	image: {
		width: 110,
		height: 110,
		borderRadius: 55,
		borderWidth: 2,
		borderColor: "#1E88E5",
	},
	placeholderImage: {
		width: 110,
		height: 110,
		borderRadius: 55,
		backgroundColor: "#E0E0E0",
		alignItems: "center",
		justifyContent: "center",
	},
	placeholderText: { color: "#888", fontWeight: "600" },
	section: { marginBottom: 18 },
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#333",
		marginBottom: 8,
	},
	label: { fontSize: 14, color: "#444", marginBottom: 4 },
	input: {
		backgroundColor: "#fff",
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: "#CCC",
		fontSize: 15,
		marginBottom: 12,
	},
	textArea: {
		backgroundColor: "#fff",
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: "#CCC",
		fontSize: 15,
		height: 100,
		textAlignVertical: "top",
		marginBottom: 12,
	},
	tagContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginBottom: 8,
	},
	tag: {
		backgroundColor: "#1E88E5",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		flexDirection: "row",
		alignItems: "center",
		marginRight: 8,
		marginBottom: 8,
	},
	tagText: { color: "#fff", fontWeight: "600" },
	tagRemove: {
		color: "#fff",
		marginLeft: 6,
		fontWeight: "700",
		fontSize: 18,
		lineHeight: 18,
	},
	tagInputRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	addButton: {
		marginLeft: 8,
		backgroundColor: "#1E88E5",
		borderRadius: 20,
		padding: 10,
		paddingHorizontal: 14,
	},
	addButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 18,
		lineHeight: 18,
	},

	experienceItem: {
		backgroundColor: "#fff",
		padding: 12,
		borderRadius: 10,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#CCC",
	},
	expRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	removeExpBtn: {
		marginLeft: 12,
		backgroundColor: "#FF5252",
		borderRadius: 16,
		width: 30,
		height: 30,
		alignItems: "center",
		justifyContent: "center",
	},
	removeExpBtnText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 20,
		lineHeight: 20,
	},
	datePickerButton: {
		flex: 1,
		backgroundColor: "#E0E0E0",
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 8,
		marginRight: 8,
	},
	datePickerText: {
		color: "#444",
		textAlign: "center",
	},
	addExpButton: {
		backgroundColor: "#1E88E5",
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: "center",
	},
	addExpButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 16,
	},

	uploadButton: {
		backgroundColor: "#E0E0E0",
		borderRadius: 8,
		padding: 12,
		alignItems: "center",
	},
	uploadButtonText: { color: "#333", fontWeight: "600" },

	saveButton: {
		backgroundColor: "#1E88E5",
		padding: 14,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 10,
	},
	saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
	backLink: {
		marginTop: 20,
		textAlign: "center",
		color: "#1E88E5",
		fontWeight: "600",
	},
});
