import React, { useEffect, useState, useRef, useCallback } from "react";
import {
	View,
	Text,
	FlatList,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Image,
	Alert,
	ActivityIndicator,
	Pressable,
} from "react-native";
import Animated, {
	FadeOut,
	SlideInRight,
	SlideInLeft,
	Layout,
} from "react-native-reanimated";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../firebase/supabase";
import { useLocalSearchParams } from "expo-router";

dayjs.extend(relativeTime);

const PAGE_SIZE = 20;

interface Message {
	id: string;
	sender_id: string;
	sender_name: string;
	sender_avatar?: string | null;
	text: string;
	timestamp: string;
	status?: "sending" | "sent" | "delivered" | "read" | "failed";
}

type ProfileCache = {
	[userId: string]: {
		name: string;
		avatar: string | null;
	};
};
interface Recruiter {
	contact_name: string;
}

interface Job {
	recruiter_id: string;
	recruiters: Recruiter;
}

interface JobSeeker {
	full_name: string;
}

interface MatchData {
	job_seeker_id: string;
	job_id: string;
	job_seekers: JobSeeker;
	jobs: Job;
}

const Chat: React.FC = () => {
	// Get matchId from route params inside the component
	const params = useLocalSearchParams();
	const matchId = params.id as string | undefined;

	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [typing, setTyping] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [currentUserId, setCurrentUserId] = useState<string>("");
	const [profileCache, setProfileCache] = useState<ProfileCache>({});
	const [recipientName, setRecipientName] = useState<string>("");
	const flatListRef = useRef<FlatList>(null);
	const typingTimeout = useRef<number | null>(null);
	const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	// --- Fetch logged-in user ID ---
	useEffect(() => {
		(async () => {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (error || !user) {
				console.warn("User not logged in or error fetching user", error);
				return;
			}
			setCurrentUserId(user.id);
		})();
	}, []);

	// --- Fetch recipient info for header ---
	useEffect(() => {
		if (!matchId || !currentUserId) return;

		const fetchRecipient = async () => {
			try {
				const { data: matchData, error: matchError } = await supabase
					.from("matches")
					.select(
						`
          job_seeker_id,
          job_id,
          job_seekers!job_seeker_id (
            full_name
          ),
          jobs!job_id (
            recruiter_id,
            recruiters!recruiter_id (
              contact_name
            )
          )
        `
					)
					.eq("id", matchId)
					.single();

				if (matchError) throw matchError;
				if (!matchData) return;

				const isJobSeeker = currentUserId === matchData.job_seeker_id;

				const recruiterName =
					matchData.jobs?.recruiters?.contact_name ?? "Recruiter";
				const jobSeekerName = matchData.job_seekers?.full_name ?? "Job Seeker";

				if (isJobSeeker) {
					setRecipientName(recruiterName);
				} else {
					setRecipientName(jobSeekerName);
				}
			} catch (error) {
				console.error("Error fetching recipient info:", error);
			}
		};

		fetchRecipient();
	}, [matchId, currentUserId]);

	// --- Initial fetch messages ---
	useEffect(() => {
		if (matchId) {
			fetchMessages();
		}
	}, [matchId]);

	// --- Real-time subscriptions for messages & typing ---
	useEffect(() => {
		if (!matchId || !currentUserId) return;

		const messageSub = supabase
			.channel(`public:messages:match_id=eq.${matchId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `match_id=eq.${matchId}`,
				},
				(payload) => {
					handleReceivedMessages([payload.new]);
				}
			)
			.subscribe();

		const typingSub = supabase
			.channel("public:typing_status")
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "typing_status" },
				(payload) => {
					if (payload.new.user_id !== currentUserId) {
						setTyping(payload.new.is_typing);
					}
				}
			)
			.subscribe();

		return () => {
			messageSub.unsubscribe();
			typingSub.unsubscribe();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [matchId, currentUserId, profileCache]);

	// --- Send typing status with debounce ---
	const sendTypingStatus = useCallback(async () => {
		if (!currentUserId) return;
		try {
			await supabase
				.from("typing_status")
				.upsert({ user_id: currentUserId, is_typing: true });
			if (typingTimeout.current) clearTimeout(typingTimeout.current);
			typingTimeout.current = window.setTimeout(async () => {
				try {
					await supabase
						.from("typing_status")
						.upsert({ user_id: currentUserId, is_typing: false });
				} catch (error) {
					console.error("Failed to reset typing status:", error);
				}
			}, 2000);
		} catch (error) {
			console.error("Failed to set typing status:", error);
		}
	}, [currentUserId]);

	// --- Input change handler ---
	const onInputChange = (text: string) => {
		setInput(text);
		sendTypingStatus();
	};

	// --- Fetch messages (pagination, older first) ---
	const fetchMessages = async (beforeTimestamp?: string) => {
		if (!matchId) return;
		if (!hasMore && beforeTimestamp) return;
		if (loadingOlder) return;

		try {
			if (beforeTimestamp) setLoadingOlder(true);

			let query = supabase
				.from("messages")
				.select(`id, text, timestamp, sender_id`)
				.eq("match_id", matchId)
				.order("timestamp", { ascending: false })
				.limit(PAGE_SIZE);

			if (beforeTimestamp) {
				query = query.lt("timestamp", beforeTimestamp);
			}

			const { data, error } = await query;
			if (error) throw error;

			if (data) {
				handleReceivedMessages(data, true);
				if (data.length < PAGE_SIZE) setHasMore(false);
			}
		} catch (error) {
			console.error("Error fetching messages:", error);
		} finally {
			setLoadingOlder(false);
		}
	};

	// --- Enrich messages with sender profile info ---
	const handleReceivedMessages = async (
		msgs: any[],
		prepend: boolean = false
	) => {
		// Find unknown sender IDs
		const unknownUserIds = Array.from(
			new Set(
				msgs.map((msg) => msg.sender_id).filter((uid) => !(uid in profileCache))
			)
		);

		let cacheUpdate: ProfileCache = {};
		if (unknownUserIds.length > 0) {
			try {
				const { data: usersInfo, error: usersError } = await supabase
					.from("users")
					.select("id,role")
					.in("id", unknownUserIds);
				if (usersError) {
					console.warn("Could not load user roles", usersError);
				} else {
					const seekers = usersInfo
						.filter((u) => u.role === "job_seeker")
						.map((u) => u.id);
					const recruiters = usersInfo
						.filter((u) => u.role === "recruiter")
						.map((u) => u.id);
					if (seekers.length > 0) {
						const { data: seekersData } = await supabase
							.from("job_seekers")
							.select("id,full_name,avatar_url")
							.in("id", seekers);
						seekersData?.forEach((s) => {
							cacheUpdate[s.id] = { name: s.full_name, avatar: s.avatar_url };
						});
					}
					if (recruiters.length > 0) {
						const { data: recruitersData } = await supabase
							.from("recruiters")
							.select("id,contact_name,company_logo")
							.in("id", recruiters);
						recruitersData?.forEach((r) => {
							cacheUpdate[r.id] = {
								name: r.contact_name,
								avatar: r.company_logo,
							};
						});
					}
				}
			} catch (error) {
				console.error("Error fetching profiles", error);
			}
			setProfileCache((prev) => ({ ...prev, ...cacheUpdate }));
		}

		const combinedCache = { ...profileCache, ...cacheUpdate };

		// Format messages ascending
		const formatted: Message[] = msgs
			.map((msg) => {
				const prof = combinedCache[msg.sender_id];
				return {
					id: msg.id,
					text: msg.text,
					timestamp: msg.timestamp,
					sender_id: msg.sender_id,
					status: msg.status || "sent",
					sender_name: prof?.name ?? "Unknown",
					sender_avatar: prof?.avatar ?? null,
				};
			})
			.reverse();

		setMessages((prev) => {
			const all = prepend ? [...formatted, ...prev] : [...prev, ...formatted];
			const uniq = Array.from(new Map(all.map((m) => [m.id, m])).values());
			return uniq;
		});
		scrollToBottomDebounced();
	};

	// --- Scroll to bottom with debounce ---
	const scrollToBottomDebounced = () => {
		if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
		scrollTimeout.current = setTimeout(() => {
			flatListRef.current?.scrollToEnd({ animated: true });
		}, 100);
	};

	// --- Send message ---
	const sendMessage = async () => {
		if (!input.trim() || !currentUserId) return;
		if (!matchId) {
			console.error("No matchId provided for message.");
			return;
		}
		const tempId = `temp-${Date.now()}`;
		const senderMeta = profileCache[currentUserId] ?? {
			name: "You",
			avatar: null,
		};
		const optimisticMsg: Message = {
			id: tempId,
			text: input,
			timestamp: new Date().toISOString(),
			status: "sending",
			sender_id: currentUserId,
			sender_name: senderMeta.name,
			sender_avatar: senderMeta.avatar,
		};

		setMessages((prev) => [...prev, optimisticMsg]);
		setInput("");
		scrollToBottomDebounced();

		try {
			const { data, error } = await supabase
				.from("messages")
				.insert([
					{
						text: optimisticMsg.text,
						sender_id: currentUserId,
						match_id: matchId,
						timestamp: optimisticMsg.timestamp,
					},
				])
				.select()
				.single();
			if (error) throw error;
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === tempId
						? {
								...data,
								status: "sent",
								sender_name: senderMeta.name,
								sender_avatar: senderMeta.avatar,
						  }
						: msg
				)
			);
		} catch (error) {
			console.error("Error sending message:", error);
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === tempId ? { ...msg, status: "failed" } : msg
				)
			);
		}
	};

	// --- Retry failed message ---
	const retrySend = async (msg: Message) => {
		if (msg.status !== "failed") return;
		setMessages((prev) =>
			prev.map((m) => (m.id === msg.id ? { ...m, status: "sending" } : m))
		);
		try {
			const { data, error } = await supabase
				.from("messages")
				.insert([
					{
						text: msg.text,
						sender_id: currentUserId,
						match_id: matchId,
						timestamp: new Date().toISOString(),
					},
				])
				.select()
				.single();
			if (error) throw error;
			setMessages((prev) =>
				prev.map((m) =>
					m.id === msg.id
						? {
								...data,
								status: "sent",
								sender_name: msg.sender_name,
								sender_avatar: msg.sender_avatar,
						  }
						: m
				)
			);
		} catch (error) {
			console.error("Retry sending message failed:", error);
			setMessages((prev) =>
				prev.map((m) => (m.id === msg.id ? { ...m, status: "failed" } : m))
			);
		}
	};

	// --- Long press options ---
	const onLongPressMessage = (msg: Message) => {
		Alert.alert(
			"Message Options",
			"What do you want to do?",
			[
				{
					text: "Delete",
					style: "destructive",
					onPress: () => deleteMessage(msg),
				},
				{ text: "React ❤️", onPress: () => reactToMessage(msg, "❤️") },
				{ text: "Cancel", style: "cancel" },
			],
			{ cancelable: true }
		);
	};

	// --- Delete message ---
	const deleteMessage = async (msg: Message) => {
		try {
			await supabase.from("messages").delete().eq("id", msg.id);
			setMessages((prev) => prev.filter((m) => m.id !== msg.id));
		} catch (error) {
			console.error("Delete message failed:", error);
		}
	};

	// --- React to message (placeholder) ---
	const reactToMessage = (msg: Message, reaction: string) => {
		Alert.alert("Reacted", `You reacted ${reaction} to: "${msg.text}"`);
	};

	// --- Message bubble component ---
	const MessageBubble = ({ message }: { message: Message }) => {
		const isCurrentUser = message.sender_id === currentUserId;
		const tailStyle = isCurrentUser
			? styles.bubbleTailRight
			: styles.bubbleTailLeft;
		const renderTick = () => {
			if (!isCurrentUser) return null;
			switch (message.status) {
				case "sending":
					return <Ionicons name="time-outline" size={16} color="#999" />;
				case "sent":
					return <Ionicons name="checkmark" size={16} color="#999" />;
				case "delivered":
					return <Ionicons name="checkmark-done" size={16} color="#999" />;
				case "read":
					return <Ionicons name="checkmark-done" size={16} color="#0a2d52" />;
				case "failed":
					return (
						<TouchableOpacity onPress={() => retrySend(message)}>
							<Ionicons name="refresh" size={16} color="red" />
						</TouchableOpacity>
					);
				default:
					return null;
			}
		};
		return (
			<Animated.View
				layout={Layout.springify()}
				style={[
					styles.bubble,
					isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
				]}
			>
				<Text
					style={[
						styles.messageText,
						isCurrentUser ? { color: "#fff" } : { color: "#0a2d52" },
					]}
				>
					{message.text}
				</Text>
				<View style={tailStyle} />
				{renderTick()}
				<Text style={styles.timestamp}>
					{dayjs(message.timestamp).format("h:mm A")}
				</Text>
			</Animated.View>
		);
	};

	// --- Render each message row ---
	const renderItem = ({ item }: { item: Message }) => {
		const isCurrentUser = item.sender_id === currentUserId;
		return (
			<Pressable onLongPress={() => onLongPressMessage(item)}>
				<View
					style={[
						styles.messageRow,
						isCurrentUser
							? { justifyContent: "flex-end" }
							: { justifyContent: "flex-start" },
					]}
				>
					{!isCurrentUser && item.sender_avatar && (
						<Image source={{ uri: item.sender_avatar }} style={styles.avatar} />
					)}
					{!isCurrentUser && !item.sender_avatar && (
						<View style={styles.avatarFallback}>
							<Text style={styles.avatarInitial}>
								{item.sender_name.charAt(0).toUpperCase() || "?"}
							</Text>
						</View>
					)}
					<MessageBubble message={item} />
				</View>
			</Pressable>
		);
	};

	const onScroll = ({ nativeEvent }: any) => {
		if (
			nativeEvent.contentOffset.y <= 20 &&
			hasMore &&
			!loadingOlder &&
			messages.length > 0
		) {
			const oldestTimestamp = messages[0].timestamp;
			fetchMessages(oldestTimestamp);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.select({ ios: "padding", android: undefined })}
			style={styles.container}
			keyboardVerticalOffset={100}
		>
			{/* Recipient name header */}
			{recipientName ? (
				<View style={styles.recipientHeader}>
					<Text style={styles.recipientName}>{recipientName}</Text>
				</View>
			) : null}

			<FlatList
				ref={flatListRef}
				data={messages}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
				onContentSizeChange={scrollToBottomDebounced}
				onScroll={onScroll}
				scrollEventThrottle={100}
				inverted={false}
				showsVerticalScrollIndicator={false}
				ListHeaderComponent={
					loadingOlder ? (
						<ActivityIndicator
							size="small"
							color="#0a2d52"
							style={{ marginBottom: 12 }}
						/>
					) : null
				}
			/>

			{typing && (
				<View style={styles.typingIndicator}>
					<Text style={styles.typingText}>Typing...</Text>
					<Ionicons name="ellipsis-horizontal" size={24} color="#0a2d52" />
				</View>
			)}

			<View style={styles.inputContainer}>
				<TextInput
					style={styles.textInput}
					placeholder="Type a message..."
					value={input}
					onChangeText={onInputChange}
					multiline
					placeholderTextColor="#94a3b8"
				/>
				<TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
					<Ionicons name="send" size={24} color="#fff" />
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#f7fafd" },
	recipientHeader: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#ddd",
		alignItems: "center",
		backgroundColor: "#f0f0f0",
	},
	recipientName: {
		fontSize: 18,
		fontWeight: "600",
		color: "#0a2d52",
	},
	messageRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		marginBottom: 12,
	},
	avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
	avatarFallback: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: 8,
		backgroundColor: "#d5dbe5",
		alignItems: "center",
		justifyContent: "center",
	},
	avatarInitial: { fontSize: 18, color: "#555", fontWeight: "bold" },
	bubble: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 18,
		maxWidth: "77%",
		marginBottom: 2,
		position: "relative",
	},
	bubbleRight: { backgroundColor: "#0a2d52", alignSelf: "flex-end" },
	bubbleLeft: { backgroundColor: "#e9eef7", alignSelf: "flex-start" },
	messageText: { fontSize: 16, fontWeight: "400" },
	timestamp: {
		fontSize: 12,
		color: "#888",
		marginTop: 2,
		alignSelf: "flex-end",
	},
	bubbleTailRight: {
		position: "absolute",
		right: 0,
		bottom: 0,
		width: 10,
		height: 20,
		backgroundColor: "#0a2d52",
		borderTopLeftRadius: 10,
		borderBottomLeftRadius: 10,
	},
	bubbleTailLeft: {
		position: "absolute",
		left: 0,
		bottom: 0,
		width: 10,
		height: 20,
		backgroundColor: "#e9eef7",
		borderTopRightRadius: 10,
		borderBottomRightRadius: 10,
	},
	typingIndicator: {
		flexDirection: "row",
		alignItems: "center",
		marginLeft: 10,
		marginBottom: 5,
	},
	typingText: { fontSize: 14, color: "#0a2d52", marginRight: 4 },
	inputContainer: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 12,
		paddingBottom: Platform.OS === "ios" ? 28 : 8,
		paddingTop: 10,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#e4e6ea",
	},
	textInput: {
		flex: 1,
		fontSize: 16,
		backgroundColor: "#f2f4f8",
		borderRadius: 16,
		minHeight: 36,
		maxHeight: 100,
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 8,
		marginRight: 8,
		color: "#15213b",
	},
	sendButton: {
		backgroundColor: "#0a2d52",
		borderRadius: 18,
		padding: 8,
		alignItems: "center",
		justifyContent: "center",
	},
});

export default Chat;
