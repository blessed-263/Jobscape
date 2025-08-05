import React, { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
	id: string;
	text: string;
	sender: "me" | "them";
	timestamp: number;
}

interface ChatPageProps {
	route: {
		params: {
			chatWithName: string;
		};
	};
}

const ChatPage: React.FC<ChatPageProps> = ({ route }) => {
	const { chatWithName } = route.params;
	const insets = useSafeAreaInsets();
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "1",
			text: `Hi! This is a welcome message from ${chatWithName}.`,
			sender: "them",
			timestamp: Date.now() - 60000,
		},
	]);
	const [inputText, setInputText] = useState("");
	const flatListRef = useRef<FlatList>(null);

	useEffect(() => {
		flatListRef.current?.scrollToEnd({ animated: true });
	}, [messages]);

	const sendMessage = () => {
		if (!inputText.trim()) return;

		const newMessage: Message = {
			id: Math.random().toString(),
			text: inputText.trim(),
			sender: "me",
			timestamp: Date.now(),
		};

		setMessages((prev) => [...prev, newMessage]);
		setInputText("");
	};

	const renderMessage = ({ item }: { item: Message }) => {
		const isMe = item.sender === "me";
		return (
			<View
				style={[
					styles.messageBubble,
					isMe ? styles.messageRight : styles.messageLeft,
				]}
			>
				<Text
					style={[
						styles.messageText,
						isMe ? styles.textRight : styles.textLeft,
					]}
				>
					{item.text}
				</Text>
			</View>
		);
	};

	return (
		<KeyboardAvoidingView
			style={[styles.container, { paddingTop: insets.top }]}
			behavior={Platform.select({ ios: "padding", android: undefined })}
			keyboardVerticalOffset={90}
		>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>{chatWithName}</Text>
			</View>

			<FlatList
				ref={flatListRef}
				data={messages}
				renderItem={renderMessage}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.messagesContainer}
				showsVerticalScrollIndicator={false}
			/>

			<View style={styles.inputContainer}>
				<TextInput
					style={styles.textInput}
					value={inputText}
					onChangeText={setInputText}
					placeholder="Type a message..."
					placeholderTextColor="#999"
					multiline
				/>
				<TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
					<Text style={styles.sendButtonText}>Send</Text>
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		backgroundColor: "#0a2d52",
		paddingVertical: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "700",
	},
	messagesContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	messageBubble: {
		maxWidth: "75%",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		marginVertical: 6,
	},
	messageLeft: {
		backgroundColor: "#f1f1f1",
		alignSelf: "flex-start",
	},
	messageRight: {
		backgroundColor: "#0a2d52",
		alignSelf: "flex-end",
	},
	messageText: {
		fontSize: 16,
		lineHeight: 22,
	},
	textLeft: {
		color: "#000",
	},
	textRight: {
		color: "#fff",
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderTopWidth: 1,
		borderColor: "#eee",
		backgroundColor: "#fff",
	},
	textInput: {
		flex: 1,
		minHeight: 40,
		maxHeight: 100,
		backgroundColor: "#f4f4f4",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 8,
		fontSize: 16,
	},
	sendButton: {
		marginLeft: 10,
		backgroundColor: "#0a2d52",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	sendButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 16,
	},
});

export default ChatPage;
