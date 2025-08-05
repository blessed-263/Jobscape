import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Cookie_400Regular } from "@expo-google-fonts/cookie";
import { Redirect } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function Index() {
	const [fontsLoaded] = useFonts({
		Cookie_400Regular,
	});

	const onLayoutRootView = useCallback(async () => {
		if (fontsLoaded) {
			await SplashScreen.hideAsync();
		}
	}, [fontsLoaded]);

	// Optional: you can keep this or rely on onLayout only
	useEffect(() => {
		if (fontsLoaded) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded]);

	if (!fontsLoaded) {
		return null;
	}

	return (
		<View style={{ flex: 1 }} onLayout={onLayoutRootView}>
			<Redirect href="/logo-page" />
		</View>
	);
}
