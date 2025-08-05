import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	Image,
	Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../firebase/supabase";
import { Ionicons } from "@expo/vector-icons";
import {
	Swipeable,
	GestureHandlerRootView,
} from "react-native-gesture-handler";

interface MessageItem {
	id: string;
	match_id: string;
	sender_id: string;
	sender_name: string;
	sender_avatar?: string | null;
	preview_text: string;
	timestamp: string;
	unread: boolean;
}

const MessagesJobSeeker = () => {
	const router = useRouter();
	const [messages, setMessages] = useState<MessageItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchMessages();
	}, []);

	const fetchMessages = async () => {
		setLoading(true);
		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) throw new Error("User not logged in");

			console.log("🧑‍💼 Authenticated Job Seeker ID:", user.id);

			const { data: matchesData, error: matchesError } = await supabase
				.from("matches")
				.select(
					`
        id,
        matched_at,
        recruiter:job_id (
          recruiter_id,
          recruiter_details:recruiters (
            id,
            company_name,
            company_logo
          )
        ),
        messages:messages (
          id,
          text,
          timestamp,
          unread,
          sender_id
        )
      `
				)
				.eq("job_seeker_id", user.id)
				.order("matched_at", { ascending: false });

			if (matchesError) throw matchesError;

			console.log("📦 Matches Fetched:", matchesData?.length);
			console.log("🔍 Raw Matches Data:", matchesData);

			if (!matchesData || matchesData.length === 0) {
				console.warn("⚠️ No matches found for this job seeker.");
				setMessages([]);
				return;
			}

			const messageItems: MessageItem[] = [];

			for (const match of matchesData) {
				console.log("➡️ Processing match:", match.id);

				const recruiter = match.recruiter?.recruiter_details;

				if (!recruiter) {
					console.warn(
						`❌ No recruiter found for match ${match.id}`,
						match.recruiter
					);
					continue;
				}

				console.log("🏢 Recruiter:", recruiter.company_name);

				if (match.messages && match.messages.length > 0) {
					// Find latest message by timestamp
					const latestMessage = match.messages.reduce((latest, current) => {
						return new Date(current.timestamp) > new Date(latest.timestamp)
							? current
							: latest;
					}, match.messages[0]);

					messageItems.push({
						id: latestMessage.id,
						match_id: match.id,
						sender_id: latestMessage.sender_id,
						sender_name: recruiter.company_name,
						sender_avatar: recruiter.company_logo,
						preview_text: latestMessage.text ?? "",
						timestamp: latestMessage.timestamp,
						unread: latestMessage.unread ?? false,
					});
				} else {
					console.log(`🆕 No messages yet for match ${match.id}`);
					messageItems.push({
						id: `match-${match.id}`,
						match_id: match.id,
						sender_id: recruiter.id,
						sender_name: recruiter.company_name,
						sender_avatar: recruiter.company_logo,
						preview_text: "Say hi to your new match!",
						timestamp: match.matched_at,
						unread: false,
					});
				}
			}

			// Sort messages descending by timestamp
			messageItems.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);

			console.log("✅ Final message items:", messageItems);
			setMessages(messageItems);
		} catch (error: any) {
			console.error("❌ Failed to fetch messages:", error.message);
			setMessages([]);
		} finally {
			setLoading(false);
		}
	};

	const onDeleteMessage = async (messageId: string) => {
		Alert.alert(
			"Delete Message",
			"Are you sure you want to delete this message?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						const { error } = await supabase
							.from("messages")
							.delete()
							.eq("id", messageId);
						if (error) {
							Alert.alert("Error", "Failed to delete message");
						} else {
							setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
						}
					},
				},
			]
		);
	};

	const renderRightActions = (messageId: string) => (
		<TouchableOpacity
			style={styles.deleteButton}
			onPress={() => onDeleteMessage(messageId)}
		>
			<Text style={styles.deleteButtonText}>Delete</Text>
		</TouchableOpacity>
	);

	const renderItem = ({ item }: { item: MessageItem }) => (
		<Swipeable renderRightActions={() => renderRightActions(item.id)}>
			<TouchableOpacity
				style={styles.messageItem}
				onPress={() =>
					router.push({
						pathname: `/chat`,
						params: { id: item.match_id },
					})
				}
			>
				{item.sender_avatar ? (
					<Image source={{ uri: item.sender_avatar }} style={styles.avatar} />
				) : (
					<View style={styles.avatarFallback}>
						<Text style={styles.avatarInitial}>
							{item.sender_name.charAt(0).toUpperCase() || "?"}
						</Text>
					</View>
				)}
				<View style={styles.messageContent}>
					<Text style={styles.senderName}>{item.sender_name}</Text>
					<Text style={styles.messagePreview} numberOfLines={1}>
						{item.preview_text}
					</Text>
				</View>
			</TouchableOpacity>
		</Swipeable>
	);

	if (loading) {
		return (
			<GestureHandlerRootView style={{ flex: 1 }}>
				<SafeAreaView style={[styles.container, styles.center]}>
					<ActivityIndicator size="large" color="#0a2d52" />
				</SafeAreaView>
			</GestureHandlerRootView>
		);
	}

	if (messages.length === 0) {
		return (
			<GestureHandlerRootView style={{ flex: 1 }}>
				<SafeAreaView style={[styles.container, styles.center]}>
					<Ionicons
						name="chatbubble-ellipses-outline"
						size={64}
						color="#94a3b8"
					/>
					<Text style={styles.emptyText}>No messages yet</Text>
				</SafeAreaView>
			</GestureHandlerRootView>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaView style={styles.container}>
				<FlatList
					data={messages}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={{ paddingVertical: 16 }}
					showsVerticalScrollIndicator={false}
				/>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20 },
	center: { justifyContent: "center", alignItems: "center" },
	messageItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		borderBottomColor: "#e2e8f0",
		borderBottomWidth: 1,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: "#e2e8f0",
	},
	avatarFallback: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: "#0a2d52",
		justifyContent: "center",
		alignItems: "center",
	},
	avatarInitial: {
		color: "#fff",
		fontSize: 22,
		fontWeight: "700",
	},
	messageContent: {
		flex: 1,
		marginLeft: 16,
		justifyContent: "center",
	},
	senderName: {
		fontSize: 16,
		fontWeight: "600",
		color: "#0f172a",
	},
	messagePreview: {
		fontSize: 14,
		color: "#475569",
	},

	deleteButton: {
		backgroundColor: "#ef4444",
		justifyContent: "center",
		alignItems: "center",
		width: 80,
		borderRadius: 8,
		marginVertical: 4,
	},
	deleteButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	emptyText: {
		marginTop: 12,
		fontSize: 18,
		color: "#64748b",
	},
});

export default MessagesJobSeeker;
