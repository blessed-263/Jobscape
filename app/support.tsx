import React from "react";
import {
	SafeAreaView,
	ScrollView,
	Text,
	StyleSheet,
	TouchableOpacity,
	Linking,
	View,
	Alert,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SUPPORT_EMAIL = "wearejobscape@gmail.com";
const SUPPORT_PHONE = "+263771182657";

const faqs = [
	{
		question: "How do I reset my password?",
		answer:
			"Tap “Forgot Password?” on the login screen and follow the instructions to get a reset link by email.",
	},
	{
		question: "How do I update my profile?",
		answer:
			"Go to Profile in your dashboard, tap the edit icon / click on your profile picture, and update your personal details, skills, or resume.",
	},
	{
		question: "How do I post a job as a recruiter?",
		answer:
			"From your Recruiter Dashboard, tap “Create Job Post”, complete the form, and publish your job listing.",
	},
	{
		question: "How do I contact Jobscape support?",
		answer:
			"You can reach out to our team by email or phone using the Contact Us section below. We respond within 1 business day.",
	},
];

const HelpAndSupportPage = () => {
	const handleEmailPress = async () => {
		const url = `mailto:${SUPPORT_EMAIL}?subject=Jobscape%20Support%20Request`;
		try {
			const canOpen = await Linking.canOpenURL(url);
			if (canOpen) Linking.openURL(url);
			else Alert.alert("Unable to open your email app.");
		} catch (err) {
			Alert.alert("Error", "Unable to open email app.");
		}
	};

	const handlePhonePress = async () => {
		const url = `tel:${SUPPORT_PHONE}`;
		try {
			const canOpen = await Linking.canOpenURL(url);
			if (canOpen) Linking.openURL(url);
			else Alert.alert("Unable to open your phone app.");
		} catch (err) {
			Alert.alert("Error", "Unable to initiate phone call.");
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.headerSection}>
					<Ionicons name="help-circle-outline" size={50} color="#0a2d52" />
					<Text style={styles.header}>Help & Support</Text>
					<Text style={styles.subheader}>
						Need assistance? Browse FAQs or reach out to us directly.
					</Text>
				</View>

				<View style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
					{faqs.map((faq, idx) => (
						<View key={idx} style={styles.faqItem}>
							<Text style={styles.faqQuestion}>
								<Ionicons
									name="chevron-forward-outline"
									size={16}
									color="#0a2d52"
								/>{" "}
								{faq.question}
							</Text>
							<Text style={styles.faqAnswer}>{faq.answer}</Text>
						</View>
					))}
				</View>

				<View style={styles.tipCard}>
					<Text style={styles.sectionTitle}>Quick Tip</Text>
					<Text style={styles.tipText}>
						Use your registered Jobscape email for faster assistance.
					</Text>
				</View>

				<View style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>Contact Us</Text>

					<TouchableOpacity
						style={styles.contactButton}
						onPress={handleEmailPress}
					>
						<Ionicons
							name="mail-outline"
							size={20}
							color="#0369a1"
							style={{ marginRight: 8 }}
						/>
						<Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.contactButton}
						onPress={handlePhonePress}
					>
						<Ionicons
							name="call-outline"
							size={20}
							color="#0369a1"
							style={{ marginRight: 8 }}
						/>
						<Text style={styles.contactText}>{SUPPORT_PHONE}</Text>
					</TouchableOpacity>

					<Text style={styles.supportHours}>
						Support hours: Mon–Fri, 9:00–17:00 (SAST)
					</Text>
				</View>

				<Text style={styles.disclaimer}>
					For urgent issues or feature feedback, email us anytime. We're always
					improving Jobscape.
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f4f6f9",
	},
	scrollContainer: {
		padding: 22,
		paddingBottom: 40,
	},
	headerSection: {
		alignItems: "center",
		marginBottom: 24,
	},
	header: {
		fontSize: 30,
		fontWeight: "700",
		color: "#0a2d52",
		marginTop: 10,
	},
	subheader: {
		fontSize: 16,
		color: "#334155",
		textAlign: "center",
		fontWeight: "500",
		marginTop: 6,
	},
	sectionCard: {
		backgroundColor: "#ffffff",
		borderRadius: 16,
		padding: 18,
		marginBottom: 24,
		shadowColor: "#000",
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
		elevation: 3,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#0a2d52",
		marginBottom: 14,
	},
	faqItem: {
		marginBottom: 14,
	},
	faqQuestion: {
		fontSize: 15,
		fontWeight: "600",
		color: "#0a2d52",
		marginBottom: 4,
	},
	faqAnswer: {
		fontSize: 15,
		color: "#475569",
		marginLeft: 8,
	},
	tipCard: {
		backgroundColor: "#fffbe5",
		borderLeftWidth: 4,
		borderLeftColor: "#facc15",
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
	},
	tipText: {
		fontSize: 15,
		color: "#92400e",
		fontWeight: "500",
	},
	contactButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#dbeafe",
		padding: 14,
		borderRadius: 12,
		marginBottom: 12,
	},
	contactText: {
		fontSize: 16,
		color: "#0369a1",
		fontWeight: "600",
	},
	supportHours: {
		fontSize: 13,
		color: "#64748b",
		marginTop: 6,
		marginLeft: 2,
		fontStyle: "italic",
	},
	disclaimer: {
		fontSize: 13,
		color: "#64748b",
		textAlign: "center",
		marginTop: 14,
	},
});

export default HelpAndSupportPage;
