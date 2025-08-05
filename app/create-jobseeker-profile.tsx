import React, { useState } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../firebase/supabase";
import * as FileSystem from "expo-file-system";
import { decode as atob } from "base-64";

interface ResumeFile {
	name: string;
	uri: string;
	blob?: Blob;
}

export default function CreateJobSeekerProfileScreen({
	navigation,
}: {
	navigation?: any;
}) {
	const [loading, setLoading] = useState(false);

	const [profile, setProfile] = useState({
		fullName: "",
		professionalTitle: "",
		location: "",
		skills: "",
		about: "",
		photo: null as string | null,
		resume: null as ResumeFile | null,
	});

	const handleChange = (field: keyof typeof profile, value: string) => {
		setProfile((prev) => ({ ...prev, [field]: value }));
	};

	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 1,
			allowsEditing: true,
		});
		if (!result.canceled && result.assets?.[0]) {
			setProfile((prev) => ({ ...prev, photo: result.assets[0].uri }));
		}
	};

	const pickResume = async () => {
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
		} catch (error) {
			console.error("Resume pick error:", error);
			Alert.alert("Error", "Failed to pick resume document.");
		}
	};

	const uploadFile = async (
		uri: string,
		bucket: "profile-photos" | "resumes"
	): Promise<string | null> => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("User not authenticated");

			// Read file as base64 using expo-file-system
			const fileBase64 = await FileSystem.readAsStringAsync(uri, {
				encoding: FileSystem.EncodingType.Base64,
			});

			// Convert base64 to Uint8Array
			const binaryString = atob(fileBase64);
			const len = binaryString.length;
			const bytes = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			const ext = uri.split(".").pop() || "bin";
			const fileName = `${user.id}/${Date.now()}.${ext}`;

			const { data, error } = await supabase.storage
				.from(bucket)
				.upload(fileName, bytes, {
					cacheControl: "3600",
					upsert: true,
					contentType: `application/${ext}`,
				});

			if (error) throw error;

			const { data: publicUrlData } = supabase.storage
				.from(bucket)
				.getPublicUrl(data.path);

			return publicUrlData.publicUrl || null;
		} catch (error) {
			console.error("[UPLOAD ERROR]", error);
			Alert.alert("Upload Error", "Failed to upload file.");
			return null;
		}
	};

	const handleSave = async () => {
		if (
			!profile.fullName.trim() ||
			!profile.professionalTitle.trim() ||
			!profile.location.trim() ||
			!profile.skills.trim()
		) {
			Alert.alert(
				"Required Fields",
				"Please fill in all required fields marked with *."
			);
			return;
		}

		setLoading(true);

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

			// Upload profile photo if it's a local file path (not a URL)
			if (photo_url && !photo_url.startsWith("http")) {
				const uploadedPhoto = await uploadFile(photo_url, "profile-photos");
				if (uploadedPhoto) photo_url = uploadedPhoto;
			}

			// Upload resume if it's a local file path (not a URL)
			if (resume_url && !resume_url.startsWith("http")) {
				const uploadedResume = await uploadFile(resume_url, "resumes");
				if (uploadedResume) resume_url = uploadedResume;
			}

			// Upsert profile data including uploaded URLs
			const { error } = await supabase.from("job_seekers").upsert(
				{
					id: user.id,
					full_name: profile.fullName.trim(),
					professional_title: profile.professionalTitle.trim(),
					location: profile.location.trim(),
					skills: profile.skills.trim(),
					about: profile.about.trim() || null,
					photo_url,
					resume_url,
				},
				{ onConflict: "id" }
			);

			if (error) throw error;

			Alert.alert("Success", "Profile created successfully.", [
				{ text: "OK", onPress: () => navigation?.goBack() },
			]);
		} catch (error) {
			console.error("Save error:", error);
			Alert.alert("Error", "Failed to save profile.");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<View style={[styles.container, { justifyContent: "center" }]}>
				<ActivityIndicator size="large" color="#1E88E5" />
				<Text style={{ textAlign: "center", marginTop: 10 }}>Saving...</Text>
			</View>
		);
	}

	return (
		<ScrollView
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={styles.header}>Create Your Profile</Text>
			<Text style={styles.subtext}>Complete your job seeker profile</Text>

			<TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
				{profile.photo ? (
					<Image source={{ uri: profile.photo }} style={styles.image} />
				) : (
					<View style={styles.imagePlaceholder}>
						<Text style={styles.imagePlaceholderText}>Add Photo</Text>
					</View>
				)}
			</TouchableOpacity>

			<View style={styles.section}>
				<Text style={styles.label}>Full Name *</Text>
				<TextInput
					style={styles.input}
					placeholder="John Doe"
					value={profile.fullName}
					onChangeText={(t) => handleChange("fullName", t)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Professional Title *</Text>
				<TextInput
					style={styles.input}
					placeholder="Software Engineer"
					value={profile.professionalTitle}
					onChangeText={(t) => handleChange("professionalTitle", t)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Location *</Text>
				<TextInput
					style={styles.input}
					placeholder="City, Country"
					value={profile.location}
					onChangeText={(t) => handleChange("location", t)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Skills *</Text>
				<TextInput
					style={styles.input}
					placeholder="e.g. React, Node.js, SQL"
					value={profile.skills}
					onChangeText={(t) => handleChange("skills", t)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>About Me</Text>
				<TextInput
					style={[styles.input, { height: 80, textAlignVertical: "top" }]}
					placeholder="Briefly describe yourself"
					multiline
					value={profile.about}
					onChangeText={(t) => handleChange("about", t)}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Upload Resume</Text>
				<TouchableOpacity style={styles.uploadBtn} onPress={pickResume}>
					<Text style={styles.uploadBtnText}>
						{profile.resume ? profile.resume.name : "Select Resume (PDF, DOC)"}
					</Text>
				</TouchableOpacity>
			</View>

			<TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
				<Text style={styles.saveBtnText}>Save Profile</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: "#fff",
		paddingBottom: 40,
		flexGrow: 1,
	},
	header: {
		fontSize: 28,
		fontWeight: "700",
		color: "#0a2d52",
		textAlign: "center",
		marginBottom: 8,
	},
	subtext: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginBottom: 24,
	},
	imagePicker: {
		alignSelf: "center",
		marginBottom: 25,
	},
	image: {
		width: 110,
		height: 110,
		borderRadius: 55,
		borderWidth: 2,
		borderColor: "#0a2d52",
	},
	imagePlaceholder: {
		width: 110,
		height: 110,
		borderRadius: 55,
		backgroundColor: "#e0e0e0",
		justifyContent: "center",
		alignItems: "center",
	},
	imagePlaceholderText: {
		color: "#666",
		fontWeight: "600",
	},
	section: {
		marginBottom: 18,
	},
	label: {
		fontSize: 15,
		fontWeight: "600",
		color: "#0a2d52",
		marginBottom: 6,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 10,
		padding: 12,
		fontSize: 16,
		backgroundColor: "#f9f9f9",
	},
	uploadBtn: {
		backgroundColor: "#0a2d52",
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: "center",
	},
	uploadBtnText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 16,
	},
	saveBtn: {
		backgroundColor: "#1366d6",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 10,
	},
	saveBtnText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 18,
	},
});
