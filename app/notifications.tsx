import React, { useEffect, useState, useCallback } from "react";
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
	TouchableOpacity,
	Alert,
	Linking,
} from "react-native";
import { supabase } from "../firebase/supabase"; // Adjust path if needed
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

const PRIMARY_BLUE = "#0a2d52";
const UNREAD_BG = "#E3F0FF";
const READ_BG = "#fff";

type Notification = {
	id: string;
	title: string;
	description: string | null;
	is_read: boolean;
	created_at: string;
	link: string | null;
};

const NotificationsPage = () => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Fetch notifications from Supabase
	const fetchNotifications = useCallback(async () => {
		setLoading(true);
		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				Alert.alert("Error", "Please log in again.");
				setLoading(false);
				setRefreshing(false);
				return;
			}

			const { data, error } = await supabase
				.from("notifications")
				.select("*")
				.eq("user_id", user.id)
				.order("created_at", { ascending: false });

			if (error) throw error;

			setNotifications(data || []);
		} catch (error) {
			console.error("Failed to fetch notifications:", error);
			Alert.alert("Error", "Failed to load notifications.");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchNotifications();
	}, [fetchNotifications]);

	// Mark a notification as read
	const markAsRead = async (id: string, link: string | null) => {
		try {
			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("id", id);

			if (error) throw error;

			setNotifications((prev) =>
				prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
			);

			if (link) {
				const supported = await Linking.canOpenURL(link);
				if (supported) {
					Linking.openURL(link);
				} else {
					Alert.alert("Link not supported", "Cannot open the link.");
				}
			}
		} catch (error) {
			console.error("Error marking notification read:", error);
			Alert.alert("Error", "Failed to update notification.");
		}
	};

	const onRefresh = () => {
		setRefreshing(true);
		fetchNotifications();
	};

	const renderItem = ({ item }: { item: Notification }) => {
		const containerStyle = item.is_read
			? styles.notificationCardRead
			: styles.notificationCardUnread;

		return (
			<TouchableOpacity
				style={containerStyle}
				onPress={() => markAsRead(item.id, item.link)}
				activeOpacity={0.7}
			>
				<View style={styles.notificationContent}>
					<Text style={styles.title}>{item.title}</Text>
					{item.description ? (
						<Text style={styles.description}>{item.description}</Text>
					) : null}
					<Text style={styles.time}>{dayjs(item.created_at).fromNow()}</Text>
				</View>
			</TouchableOpacity>
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={PRIMARY_BLUE} />
				<Text style={styles.loadingText}>Loading notifications...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.header}>Notifications</Text>
			<FlatList
				data={notifications}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				contentContainerStyle={
					notifications.length === 0 && {
						flexGrow: 1,
						justifyContent: "center",
					}
				}
				ListEmptyComponent={
					<Text style={styles.emptyText}>No notifications available.</Text>
				}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
};

export default NotificationsPage;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		paddingTop: 50,
		paddingHorizontal: 20,
	},
	header: {
		fontSize: 24,
		fontWeight: "700",
		color: PRIMARY_BLUE,
		textAlign: "center",
		marginBottom: 20,
	},
	notificationCardUnread: {
		backgroundColor: UNREAD_BG,
		padding: 16,
		borderRadius: 12,
		marginBottom: 14,
		shadowColor: PRIMARY_BLUE,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 4,
	},
	notificationCardRead: {
		backgroundColor: READ_BG,
		padding: 16,
		borderRadius: 12,
		marginBottom: 14,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	notificationContent: {},
	title: {
		fontSize: 17,
		fontWeight: "700",
		color: PRIMARY_BLUE,
		marginBottom: 6,
	},
	description: {
		fontSize: 15,
		color: "#475569",
		marginBottom: 8,
	},
	time: {
		fontSize: 12,
		color: "#94a3b8",
		textAlign: "right",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: PRIMARY_BLUE,
	},
	emptyText: {
		textAlign: "center",
		fontSize: 16,
		color: "#64748b",
	},
});
