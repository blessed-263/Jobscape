import React, { useEffect, useState } from "react";
import {
	SafeAreaView,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useRouter } from "expo-router";
import DropDownPicker from "react-native-dropdown-picker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../firebase/supabase";
import * as FileSystem from "expo-file-system";
import { decode as atob } from "base-64";

const EditCompanyProfile = () => {
	const router = useRouter();

	const [companyName, setCompanyName] = useState("");
	const [contactName, setContactName] = useState("");
	const [phone, setPhone] = useState("");
	const [website, setWebsite] = useState("");
	const [about, setAbout] = useState("");
	const [location, setLocation] = useState("");
	const [logoUri, setLogoUri] = useState<string | null>(null);
	const [industry, setIndustry] = useState("");
	const [teamSize, setTeamSize] = useState("");

	const [loading, setLoading] = useState(false);
	const [industryOpen, setIndustryOpen] = useState(false);
	const [teamSizeOpen, setTeamSizeOpen] = useState(false);
	const [showOtherIndustry, setShowOtherIndustry] = useState(false);
	const [otherIndustry, setOtherIndustry] = useState("");

	const industryOptions = [
		{ label: "Tech", value: "Tech" },
		{ label: "Finance", value: "Finance" },
		{ label: "Healthcare", value: "Healthcare" },
		{ label: "Retail", value: "Retail" },
		{ label: "Construction", value: "Construction" },
		{ label: "Education", value: "Education" },
		{ label: "Other", value: "Other" },
	];

	const teamSizeOptions = [
		{ label: "1-10", value: "1-10" },
		{ label: "11-50", value: "11-50" },
		{ label: "51-200", value: "51-200" },
		{ label: "200+", value: "200+" },
	];

	useEffect(() => {
		const loadProfile = async () => {
			setLoading(true);
			try {
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError || !user) {
					router.replace("/sign-in-recruiter");
					return;
				}

				const recruiterId = user.id;

				const { data: recruiter, error: recruiterError } = await supabase
					.from("recruiters")
					.select("*")
					.eq("id", recruiterId)
					.single();

				const { data: profile, error: profileError } = await supabase
					.from("recruiter_profiles")
					.select("*")
					.eq("id", recruiterId)
					.single();

				if (recruiterError || profileError) {
					Alert.alert("Error", "Failed to load profile data");
					return;
				}

				if (recruiter) {
					setCompanyName(recruiter.company_name || "");
					setContactName(recruiter.contact_name || "");
					setPhone(recruiter.phone || "");
					setWebsite(recruiter.website || "");
					setAbout(recruiter.about || "");
					setLocation(recruiter.location || "");
					setLogoUri(recruiter.company_logo || null);
				}
				if (profile) {
					setIndustry(profile.industry || "");
					setTeamSize(profile.team_size || "");
					if (profile.industry === "Other") {
						setShowOtherIndustry(true);
						setOtherIndustry(profile.industry);
					}
				}
			} catch (err: any) {
				Alert.alert("Error", err.message || "Unexpected error");
			} finally {
				setLoading(false);
			}
		};
		loadProfile();
	}, []);

	const pickLogo = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission denied",
				"Please enable photo permissions in your device settings!"
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			quality: 1,
		});

		if (!result.canceled && result.assets?.length > 0) {
			setLogoUri(result.assets[0].uri);
		}
	};

	const uploadLogo = async (): Promise<string | null> => {
		if (!logoUri || logoUri.startsWith("http")) return logoUri;

		setLoading(true);
		try {
			const fileBase64 = await FileSystem.readAsStringAsync(logoUri, {
				encoding: FileSystem.EncodingType.Base64,
			});

			const binaryString = atob(fileBase64);
			const len = binaryString.length;
			const bytes = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			const ext = logoUri.split(".").pop() || "bin";
			const {
				data: { user },
			} = await supabase.auth.getUser();
			const userId = user?.id;
			const fileName = `${userId}/logo-${Date.now()}.${ext}`;

			const contentTypeMap: Record<string, string> = {
				jpg: "image/jpeg",
				jpeg: "image/jpeg",
				png: "image/png",
			};
			const contentType =
				contentTypeMap[ext.toLowerCase()] || "application/octet-stream";

			const { data, error } = await supabase.storage
				.from("company-logos")
				.upload(fileName, bytes, {
					upsert: true,
					cacheControl: "3600",
					contentType,
				});

			if (error) throw error;

			const { data: publicUrlData } = supabase.storage
				.from("company-logos")
				.getPublicUrl(data.path);

			return publicUrlData.publicUrl || null;
		} catch (err: any) {
			Alert.alert("Upload error", err.message);
			return null;
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!companyName.trim() || !contactName.trim()) {
			return Alert.alert("Missing Fields", "Please fill all required fields");
		}

		setLoading(true);
		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) throw userError;
			const userId = user.id;

			const logoUrl = await uploadLogo();

			const finalIndustry =
				industry === "Other" ? otherIndustry.trim() : industry;

			const { error: recruiterError } = await supabase
				.from("recruiters")
				.upsert(
					{
						id: userId,
						company_name: companyName,
						contact_name: contactName,
						phone,
						website,
						about,
						location,
						company_logo: logoUrl || null,
					},
					{ onConflict: "id" }
				);

			const { error: profileError } = await supabase
				.from("recruiter_profiles")
				.upsert(
					{ id: userId, industry: finalIndustry, team_size: teamSize },
					{ onConflict: "id" }
				);

			if (recruiterError || profileError) throw recruiterError || profileError;

			Alert.alert("Success", "Profile updated", [
				{ text: "OK", onPress: () => router.replace("/dashboard-recruiter") },
			]);
		} catch (e: any) {
			Alert.alert("Error", e.message || "Update failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView contentContainerStyle={styles.scrollContainer}>
					<Text style={styles.header}>Edit Company Profile</Text>

					<TouchableOpacity onPress={pickLogo} style={styles.logoPicker}>
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
						value={companyName}
						onChangeText={setCompanyName}
						placeholder="Company Name *"
					/>
					<TextInput
						style={styles.input}
						value={contactName}
						onChangeText={setContactName}
						placeholder="Contact Name *"
					/>
					<TextInput
						style={styles.input}
						value={phone}
						onChangeText={setPhone}
						placeholder="Phone"
						keyboardType="phone-pad"
					/>
					<TextInput
						style={styles.input}
						value={website}
						onChangeText={setWebsite}
						placeholder="Website"
						keyboardType="url"
					/>
					<TextInput
						style={[styles.input, { height: 100 }]}
						value={about}
						onChangeText={setAbout}
						placeholder="About Company"
						multiline
						textAlignVertical="top"
					/>

					<DropDownPicker
						open={industryOpen}
						value={industry}
						items={industryOptions}
						setOpen={setIndustryOpen}
						setValue={setIndustry}
						placeholder="Select Industry"
						style={styles.dropdown}
						onChangeValue={(val) => setShowOtherIndustry(val === "Other")}
						zIndex={3000}
					/>

					{showOtherIndustry && (
						<TextInput
							style={styles.input}
							value={otherIndustry}
							onChangeText={setOtherIndustry}
							placeholder="Specify Industry"
						/>
					)}

					<DropDownPicker
						open={teamSizeOpen}
						value={teamSize}
						items={teamSizeOptions}
						setOpen={setTeamSizeOpen}
						setValue={setTeamSize}
						placeholder="Select Team Size"
						style={styles.dropdown}
						zIndex={2000}
					/>

					<TouchableOpacity
						style={styles.saveBtn}
						onPress={handleSave}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.saveText}>Save</Text>
						)}
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
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

export default EditCompanyProfile;
