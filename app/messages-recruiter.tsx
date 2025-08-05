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
	match_id: string; // <--- Added match_id field
	sender_id: string;
	sender_name: string;
	sender_avatar?: string | null;
	preview_text: string;
	timestamp: string;
	unread: boolean;
}

const MessagesRecruiter = () => {
	const router = useRouter();
	const [messages, setMessages] = useState<MessageItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchMessages();
	}, []);

	const fetchMessages = async () => {
		setLoading(true);

		const getRelativePath = (fullUrl: string, bucketName: string) => {
			const prefix = `/storage/v1/object/public/${bucketName}/`;
			const index = fullUrl.indexOf(prefix);
			if (index === -1) return null;
			return fullUrl.substring(index + prefix.length);
		};

		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) throw new Error("User not logged in");

			const { data: matchesData, error: matchesError } = await supabase
				.from("matches")
				.select(
					`
      id,
      matched_at,
      job_seeker:job_seeker_id (
        id,
        full_name,
        avatar_url
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
				.eq("recruiter_id", user.id)
				.order("matched_at", { ascending: false });

			if (matchesError) throw matchesError;
			if (!matchesData) throw new Error("No matches returned");

			const messageItems: MessageItem[] = [];

			for (const match of matchesData) {
				const jobSeeker = Array.isArray(match.job_seeker)
					? match.job_seeker[0]
					: match.job_seeker;

				if (!jobSeeker) {
					console.warn(`No job_seeker found for match id ${match.id}`);
					continue;
				}

				// Generate signed URL for avatar if exists
				let signedAvatarUrl = null;
				if (jobSeeker.avatar_url) {
					const relativePath = getRelativePath(
						jobSeeker.avatar_url,
						"profile-photos"
					);
					if (relativePath) {
						const { data: signedData, error: avatarError } =
							await supabase.storage
								.from("profile-photos")
								.createSignedUrl(relativePath, 60);
						if (!avatarError) signedAvatarUrl = signedData.signedUrl;
						else console.warn("⚠️ Avatar signed URL error:", avatarError);
					}
				}

				if (match.messages && match.messages.length > 0) {
					const latestMessage = match.messages.reduce(
						(latest, current) =>
							new Date(current.timestamp) > new Date(latest.timestamp)
								? current
								: latest,
						match.messages[0]
					);

					messageItems.push({
						id: latestMessage.id,
						match_id: match.id,
						sender_id: latestMessage.sender_id,
						sender_name: jobSeeker.full_name,
						sender_avatar: signedAvatarUrl,
						preview_text: latestMessage.text ?? "",
						timestamp: latestMessage.timestamp,
						unread: latestMessage.unread ?? false,
					});
				} else {
					messageItems.push({
						id: `match-${match.id}`,
						match_id: match.id,
						sender_id: jobSeeker.id,
						sender_name: jobSeeker.full_name,
						sender_avatar: signedAvatarUrl,
						preview_text: "Say hi to your new match!",
						timestamp: match.matched_at,
						unread: false,
					});
				}
			}

			messageItems.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);

			setMessages(messageItems);
		} catch (error: any) {
			console.error("Failed to fetch messages:", error.message);
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

	const renderItem = ({ item }: { item: MessageItem }) => {
		return (
			<Swipeable renderRightActions={() => renderRightActions(item.id)}>
				<TouchableOpacity
					style={styles.messageItem}
					onPress={() =>
						router.push({
							pathname: `/chat`,
							params: { id: item.match_id }, // <-- Pass match_id here!
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
	};

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

	unreadBadgeText: {
		color: "#fff",
		fontSize: 12,
		lineHeight: 14,
		textAlign: "center",
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

export default MessagesRecruiter;
