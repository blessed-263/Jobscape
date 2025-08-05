import React, { useEffect, useState } from "react";
import {
	ScrollView,
	View,
	Text,
	Image,
	StyleSheet,
	Linking,
	TouchableOpacity,
	ActivityIndicator,
	useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";

const openUrl = (url: string) => {
	Linking.openURL(url).catch(() => {});
};

interface CompanyProfile {
	id: string;
	company_name: string;
	company_logo: string | null;
	about: string | null;
	email: string | null;
	phone: string | null;
	website: string | null;
}

interface Job {
	id: string;
	title: string;
	location: string | null;
	created_at: string | null;
}

const CompanyProfilePublicViewPage: React.FC = () => {
	const { companyId } = useLocalSearchParams<{ companyId: string }>();
	const router = useRouter();
	const isDark = useColorScheme() === "dark";

	const [company, setCompany] = useState<CompanyProfile | null>(null);
	const [jobsForCompany, setJobsForCompany] = useState<Job[]>([]);
	const [loadingCompany, setLoadingCompany] = useState(true);
	const [loadingJobs, setLoadingJobs] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!companyId) {
			setError("No company ID provided.");
			setLoadingCompany(false);
			setLoadingJobs(false);
			return;
		}

		console.log("Fetching company and jobs for recruiter_id:", companyId);

		const fetchCompany = async () => {
			console.log("Fetching company profile from recruiters...");
			setLoadingCompany(true);

			const { data, error } = await supabase
				.from("recruiters")
				.select(`id, company_name, company_logo, about, email, phone, website`)
				.eq("id", companyId)
				.single();

			console.log("Company query response:", { data, error });

			if (error) {
				console.error("Error fetching company:", error.message);
				setError("Failed to load company information.");
				setCompany(null);
			} else {
				setCompany(data);
			}
			setLoadingCompany(false);
		};

		const fetchJobs = async () => {
			console.log("Fetching jobs for recruiter_id:", companyId);
			setLoadingJobs(true);

			const { data, error } = await supabase
				.from("jobs")
				.select(`id, title, location, created_at`)
				.eq("recruiter_id", companyId)
				.order("created_at", { ascending: false });

			console.log("Jobs query response:", { data, error });

			if (error) {
				console.error("Error fetching jobs:", error.message);
				setError("Failed to load jobs.");
				setJobsForCompany([]);
			} else if (data) {
				setJobsForCompany(data);
			}
			setLoadingJobs(false);
		};

		fetchCompany();
		fetchJobs();
	}, [companyId]);

	if (loadingCompany) {
		return (
			<View
				style={[
					styles.loadingContainer,
					{ backgroundColor: isDark ? "#121212" : "#fff" },
				]}
			>
				<ActivityIndicator size="large" color="#3B82F6" />
			</View>
		);
	}

	if (error) {
		return (
			<View
				style={[
					styles.notFoundContainer,
					{ backgroundColor: isDark ? "#121212" : "#f8fbff" },
				]}
			>
				<Text
					style={[styles.notFoundText, { color: isDark ? "#fff" : "#444" }]}
				>
					{error}
				</Text>
			</View>
		);
	}

	if (!company) {
		return (
			<View
				style={[
					styles.notFoundContainer,
					{ backgroundColor: isDark ? "#121212" : "#f8fbff" },
				]}
			>
				<Text
					style={[styles.notFoundText, { color: isDark ? "#fff" : "#444" }]}
				>
					Company not found.
				</Text>
			</View>
		);
	}

	return (
		<ScrollView
			style={[
				styles.container,
				{ backgroundColor: isDark ? "#121212" : "#f8fbff" },
			]}
			contentContainerStyle={{ paddingBottom: 40 }}
		>
			<View style={styles.header}>
				{company.company_logo ? (
					<Image source={{ uri: company.company_logo }} style={styles.logo} />
				) : (
					<View style={styles.placeholderLogo}>
						<Text style={styles.logoInitial}>
							{company.company_name?.[0].toUpperCase() ?? "?"}
						</Text>
					</View>
				)}

				<View style={styles.headerInfo}>
					<Text
						style={[styles.companyName, { color: isDark ? "#fff" : "#1D3F8B" }]}
					>
						{company.company_name}
					</Text>
				</View>
			</View>

			{/* About Section */}
			<View
				style={[
					styles.sectionCard,
					{ backgroundColor: isDark ? "#1E293B" : "#fff" },
				]}
			>
				<Text
					style={[styles.sectionTitle, { color: isDark ? "#fff" : "#1D3F8B" }]}
				>
					About Us
				</Text>
				<Text
					style={[styles.sectionText, { color: isDark ? "#ddd" : "#222f43" }]}
				>
					{company.about || "No description available."}
				</Text>
			</View>

			{/* Contact Info */}
			<View style={styles.sectionCard}>
				<Text
					style={[styles.sectionTitle, { color: isDark ? "#fff" : "#1D3F8B" }]}
				>
					Contact Information
				</Text>

				{company.email && (
					<View style={styles.contactRow}>
						<Ionicons name="mail-outline" size={20} color="#1D3F8B" />
						<TouchableOpacity
							onPress={() => openUrl(`mailto:${company.email}`)}
						>
							<Text style={styles.contactText}>{company.email}</Text>
						</TouchableOpacity>
					</View>
				)}

				{company.phone && (
					<View style={styles.contactRow}>
						<Ionicons name="call-outline" size={20} color="#1D3F8B" />
						<Text style={styles.contactText}>{company.phone}</Text>
					</View>
				)}

				{company.website && (
					<View style={styles.contactRow}>
						<Ionicons name="globe-outline" size={20} color="#1D3F8B" />
						<TouchableOpacity onPress={() => openUrl(company.website!)}>
							<Text style={styles.contactLink}>{company.website}</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>

			{/* Jobs Posted */}
			<View
				style={[
					styles.sectionCard,
					{ backgroundColor: isDark ? "#1E293B" : "#fff" },
				]}
			>
				<Text
					style={[styles.sectionTitle, { color: isDark ? "#fff" : "#1D3F8B" }]}
				>
					Jobs Posted
				</Text>
				{loadingJobs ? (
					<ActivityIndicator size="small" color="#3B82F6" />
				) : jobsForCompany.length === 0 ? (
					<Text
						style={[styles.noJobsText, { color: isDark ? "#ccc" : "#5c6d91" }]}
					>
						No jobs posted currently.
					</Text>
				) : (
					jobsForCompany.map((job) => (
						<TouchableOpacity
							key={job.id}
							style={styles.jobItem}
							activeOpacity={0.7}
							onPress={() =>
								router.push({
									pathname: "/job-details",
									params: { id: job.id },
								})
							}
						>
							<Text
								style={[
									styles.jobTitle,
									{ color: isDark ? "#fff" : "#22415e" },
								]}
							>
								{job.title}
							</Text>
							<View style={styles.jobMetaRow}>
								<Ionicons name="location-outline" size={14} color="#5c6d91" />
								<Text
									style={[
										styles.jobLocation,
										{ color: isDark ? "#bbb" : "#5c6d91" },
									]}
								>
									{job.location || "Location not specified"}
								</Text>
								{job.created_at && (
									<Text
										style={[
											styles.jobDate,
											{ color: isDark ? "#bbb" : "#5c6d91" },
										]}
									>
										{" "}
										• {new Date(job.created_at).toLocaleDateString()}
									</Text>
								)}
							</View>
						</TouchableOpacity>
					))
				)}
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 24,
	},
	notFoundContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	notFoundText: {
		fontSize: 18,
	},
	header: {
		flexDirection: "row",
		marginBottom: 32,
		alignItems: "center",
	},
	logo: {
		width: 90,
		height: 90,
		borderRadius: 16,
		marginRight: 20,
		borderWidth: 1,
		borderColor: "#1D3F8B",
	},
	placeholderLogo: {
		width: 90,
		height: 90,
		borderRadius: 16,
		backgroundColor: "#1D3F8B",
		marginRight: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	logoInitial: {
		color: "#fff",
		fontSize: 40,
		fontWeight: "900",
	},
	headerInfo: { flexShrink: 1 },
	companyName: {
		fontSize: 30,
		fontWeight: "900",
	},
	sectionCard: {
		borderRadius: 16,
		padding: 20,
		marginBottom: 24,
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 6,
	},
	sectionTitle: {
		fontSize: 22,
		fontWeight: "800",
		marginBottom: 14,
	},
	sectionText: {
		fontSize: 16,
		lineHeight: 24,
	},
	contactRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	contactText: {
		marginLeft: 10,
		fontSize: 16,
		textDecorationLine: "underline",
	},
	contactLink: {
		marginLeft: 10,
		fontSize: 16,
		textDecorationLine: "underline",
	},
	noJobsText: {
		fontSize: 16,
		fontStyle: "italic",
	},
	jobItem: {
		marginBottom: 20,
	},
	jobTitle: {
		fontWeight: "700",
		fontSize: 18,
	},
	jobMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 4,
	},
	jobLocation: {
		marginLeft: 4,
		fontSize: 14,
	},
	jobDate: {
		fontSize: 14,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});

export default CompanyProfilePublicViewPage;
