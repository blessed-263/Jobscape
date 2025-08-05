import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Alert,
	Image,
	ActivityIndicator,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DropDownPicker from "react-native-dropdown-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const CreateCompanyProfilePage = () => {
	const router = useRouter();

	const [contactName, setContactName] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [location, setLocation] = useState("");
	const [about, setAbout] = useState("");
	const [website, setWebsite] = useState("");
	const [logoUri, setLogoUri] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);

	const [industryOpen, setIndustryOpen] = useState(false);
	const [industry, setIndustry] = useState<string | null>(null);
	const [customIndustry, setCustomIndustry] = useState("");

	const [teamSizeOpen, setTeamSizeOpen] = useState(false);
	const [teamSize, setTeamSize] = useState<string | null>(null);

	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		const fetchUserAndProfile = async () => {
			const { data, error } = await supabase.auth.getUser();
			if (error || !data.user) {
				Alert.alert("Error", "Not logged in");
				return;
			}
			setUserId(data.user.id);

			const { data: existingRecruiter, error: errorRecruiter } = await supabase
				.from("recruiters")
				.select("*")
				.eq("id", data.user.id)
				.single();

			if (existingRecruiter) {
				router.replace("/dashboard-recruiter");
				return;
			}

			if (existingRecruiter) {
				setContactName(existingRecruiter.contact_name || "");
				setCompanyName(existingRecruiter.company_name || "");
				setLocation(existingRecruiter.location || "");
				setAbout(existingRecruiter.about || "");
				setWebsite(existingRecruiter.website || "");
				setLogoUri(existingRecruiter.company_logo || null);
			}
		};

		fetchUserAndProfile();
	}, []);

	const pickLogo = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			quality: 1,
		});

		if (!result.canceled && result.assets?.length > 0) {
			setLogoUri(result.assets[0].uri);
		}
	};

	// Upload logo to Supabase Storage
	const uploadLogo = async (): Promise<string | null> => {
		if (!logoUri) return null;

		setUploading(true);
		try {
			const res = await fetch(logoUri);
			const blob = await res.blob();

			// Create unique file name with user ID and timestamp
			const fileName = `${userId}/logo-${Date.now()}`;

			const { error } = await supabase.storage
				.from("company-logos")
				.upload(fileName, blob, { upsert: true });

			if (error) throw error;

			const { data } = supabase.storage
				.from("company-logos")
				.getPublicUrl(fileName);

			return data.publicUrl;
		} catch (err: any) {
			Alert.alert("Upload error", err.message);
			return null;
		} finally {
			setUploading(false);
		}
	};

	const handleSave = async () => {
		if (
			!contactName.trim() ||
			!companyName.trim() ||
			!location.trim() ||
			!about.trim() ||
			(!industry && !customIndustry.trim()) ||
			!teamSize
		) {
			Alert.alert("Missing fields", "Please fill all required fields");
			return;
		}
		if (!userId) {
			Alert.alert("Error", "User ID not found");
			return;
		}

		try {
			const logoUrl = await uploadLogo();

			const industryToSave =
				industry === "Other" ? customIndustry.trim() : industry;

			const { error: recruiterError } = await supabase
				.from("recruiters")
				.upsert(
					{
						id: userId,
						contact_name: contactName.trim(),
						company_name: companyName.trim(),
						email: (await supabase.auth.getUser()).data.user?.email ?? null,
						location: location.trim(),
						about: about.trim(),
						website: website.trim() || null,
						company_logo: logoUrl || null,
					},
					{ onConflict: "id" }
				);

			if (recruiterError) throw recruiterError;

			const { error: profileError } = await supabase
				.from("recruiter_profiles")
				.upsert(
					{
						id: userId,
						industry: industryToSave,
						team_size: teamSize,
						mission: "", // Add mission if needed
					},
					{ onConflict: "id" }
				);

			if (profileError) throw profileError;

			Alert.alert("Success", "Profile created successfully");
			router.replace("/dashboard-recruiter");
		} catch (e: any) {
			Alert.alert("Error", e.message || "Something went wrong");
		}
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: "#fff" }}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
		>
			<KeyboardAwareScrollView
				contentContainerStyle={styles.scrollContainer}
				enableOnAndroid={true}
				keyboardShouldPersistTaps="handled"
				extraScrollHeight={20}
			>
				<View style={styles.container}>
					<Text style={styles.header}>Create Company Profile</Text>

					<TouchableOpacity
						onPress={pickLogo}
						style={styles.logoPicker}
						disabled={uploading}
						activeOpacity={0.7}
					>
						{logoUri ? (
							<Image source={{ uri: logoUri }} style={styles.logoImage} />
						) : (
							<Ionicons name="image-outline" size={40} color="#555" />
						)}
						<Text style={styles.logoText}>
							{logoUri ? "Change Logo" : "Upload Logo"}
						</Text>
					</TouchableOpacity>

					<TextInput
						style={styles.input}
						placeholder="Your Name"
						value={contactName}
						onChangeText={setContactName}
						editable={!uploading}
					/>
					<TextInput
						style={styles.input}
						placeholder="Company Name"
						value={companyName}
						onChangeText={setCompanyName}
						editable={!uploading}
					/>
					<TextInput
						style={styles.input}
						placeholder="Location"
						value={location}
						onChangeText={setLocation}
						editable={!uploading}
					/>
					<TextInput
						style={styles.input}
						placeholder="About Company"
						multiline
						numberOfLines={4}
						value={about}
						onChangeText={setAbout}
						editable={!uploading}
					/>
					<TextInput
						style={styles.input}
						placeholder="Website (optional)"
						value={website}
						onChangeText={setWebsite}
						editable={!uploading}
					/>

					<DropDownPicker
						open={industryOpen}
						value={industry}
						items={[
							{ label: "Tech", value: "Tech" },
							{ label: "Finance", value: "Finance" },
							{ label: "Healthcare", value: "Healthcare" },
							{ label: "Education", value: "Education" },
							{ label: "Manufacturing", value: "Manufacturing" },
							{ label: "Retail", value: "Retail" },
							{ label: "Marketing", value: "Marketing" },
							{ label: "Other", value: "Other" },
						]}
						setOpen={setIndustryOpen}
						setValue={setIndustry}
						placeholder="Select Industry"
						style={styles.dropdown}
						dropDownContainerStyle={{ maxHeight: 150 }}
						disabled={uploading}
						zIndex={3000}
						zIndexInverse={1000}
					/>

					{industry === "Other" && (
						<TextInput
							style={styles.input}
							placeholder="Please specify your industry"
							value={customIndustry}
							onChangeText={setCustomIndustry}
							editable={!uploading}
						/>
					)}

					<DropDownPicker
						open={teamSizeOpen}
						value={teamSize}
						items={[
							{ label: "1-10", value: "1-10" },
							{ label: "11-50", value: "11-50" },
							{ label: "51-200", value: "51-200" },
							{ label: "200+", value: "200+" },
						]}
						setOpen={setTeamSizeOpen}
						setValue={setTeamSize}
						placeholder="Select Team Size"
						style={styles.dropdown}
						dropDownContainerStyle={{ maxHeight: 150 }}
						disabled={uploading}
						zIndex={2000}
						zIndexInverse={2000}
					/>

					<TouchableOpacity
						style={[styles.saveBtn, uploading && { opacity: 0.6 }]}
						onPress={handleSave}
						disabled={uploading}
					>
						{uploading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.saveText}>Save Profile</Text>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAwareScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	scrollContainer: {
		flexGrow: 1,
		justifyContent: "center",
		padding: 20,
		backgroundColor: "#fff",
	},
	container: {
		flex: 1,
	},
	header: {
		fontSize: 24,
		fontWeight: "700",
		marginBottom: 20,
		textAlign: "center",
	},
	logoPicker: {
		alignItems: "center",
		marginBottom: 20,
	},
	logoImage: {
		width: 100,
		height: 100,
		borderRadius: 20,
	},
	logoText: {
		color: "#555",
		marginTop: 6,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		backgroundColor: "white",
	},
	dropdown: {
		marginBottom: 14,
		zIndex: 1000,
	},
	saveBtn: {
		backgroundColor: "#0a2d52",
		padding: 14,
		borderRadius: 10,
		alignItems: "center",
		marginTop: 20,
	},
	saveText: {
		color: "white",
		fontWeight: "600",
		fontSize: 16,
	},
});

export default CreateCompanyProfilePage;
