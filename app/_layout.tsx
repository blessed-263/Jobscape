import { Stack } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { useColorScheme } from "react-native";

export default function RootLayout() {
	const scheme = useColorScheme();

	return (
		<PaperProvider>
			<Stack
				screenOptions={{
					headerStyle: {
						backgroundColor: scheme === "dark" ? "#121212" : "#fff",
					},
					headerTintColor: "#0a2d52",
				}}
			/>
		</PaperProvider>
	);
}
