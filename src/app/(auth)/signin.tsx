import { useAuth, useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";

type SSOStrategy = "oauth_google" | "oauth_facebook" | "oauth_apple";

export default function SignIn() {
	const router = useRouter();

	const { signIn, setActive, isLoaded } = useSignIn();
	const { startSSOFlow } = useSSO();
	const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

	// Input and UI States
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isEmailFocused, setIsEmailFocused] = useState(false);
	const [isPasswordFocused, setIsPasswordFocused] = useState(false);
	const [isSSOLoading, setIsSSOLoading] = useState(false);
	const [formError, setFormError] = useState("");

	// Warm up the browser on mount for faster OAuth open (especially Android)
	useEffect(() => {
		void WebBrowser.warmUpAsync();
		return () => {
			void WebBrowser.coolDownAsync();
		};
	}, []);

	const handleSignIn = async () => {
		if (!isLoaded) return;
		setFormError("");
		if (!email.trim() || !password.trim()) {
			setFormError("Please enter both your email and password.");
			return;
		}

		try {
			const completeSignIn = await signIn.create({
				identifier: email,
				password,
			});

			if (completeSignIn.status === "complete") {
				if (setActive) {
					await setActive({ session: completeSignIn.createdSessionId });
				}
				router.replace("/");
				return;
			}

			throw new Error("Sign in needs another step before it can finish.");
		} catch (err: any) {
			console.error("SignIn error:", err);
			const clerkError =
				err?.errors?.[0]?.longMessage || err?.message || "Sign in failed. Please try again.";
			setFormError(clerkError);
		}
	};

	const handleSSO = async (strategy: SSOStrategy) => {
		if (isSSOLoading) return;

		setIsSSOLoading(true);

		try {
			const redirectUrl = Linking.createURL("/oauth-callback");
			const {
				createdSessionId,
				setActive: setSSOActive,
				signIn: ssoSignIn,
				signUp: ssoSignUp,
			} = await startSSOFlow({
				strategy,
				redirectUrl,
			});

			// Case 1: Session already created (returning user, direct sign-in)
			if (createdSessionId && setSSOActive) {
				await setSSOActive({ session: createdSessionId });
				router.replace("/");
				return;
			}

			// Case 2: New user — Google identity is "transferable" to a new sign-up.
			// This happens when no existing Clerk account matches the Google email.
			if (ssoSignIn?.firstFactorVerification?.status === "transferable" && ssoSignUp) {
				await ssoSignUp.create({ transfer: true });
				if (ssoSignUp.createdSessionId && setSSOActive) {
					await setSSOActive({ session: ssoSignUp.createdSessionId });
					router.replace("/");
					return;
				}
			}

			// Case 3: Existing user whose session is on signIn or signUp object
			const sessionId = ssoSignIn?.createdSessionId ?? ssoSignUp?.createdSessionId;
			if (sessionId && setSSOActive) {
				await setSSOActive({ session: sessionId });
				router.replace("/");
				return;
			}

			// Cancelled or dismissed — do nothing
			if (!ssoSignIn && !ssoSignUp) return;

			console.warn("SSO completed but no session created", {
				signInStatus: ssoSignIn?.status,
				signUpStatus: ssoSignUp?.status,
				transferStatus: ssoSignIn?.firstFactorVerification?.status,
			});
			alert("We couldn't finish signing in. Please try again.");
		} catch (err: any) {
			console.error("SSO failed:", err);
			const clerkError = err?.errors?.[0]?.longMessage || err?.message || "OAuth login failed";
			alert(clerkError);
		} finally {
			setIsSSOLoading(false);
		}
	};

	if (!isAuthLoaded) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#6C4EF5" />
				</View>
			</SafeAreaView>
		);
	}

	if (isSignedIn) {
		return <Redirect href="/" />;
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardView}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* Header Row */}
					<View className="w-full flex-row items-center pt-2 mb-4">
						<TouchableOpacity
							activeOpacity={0.7}
							onPress={() => router.back()}
							className="w-10 h-10 items-center justify-center rounded-full bg-neutral-surface border border-neutral-border"
						>
							<Ionicons name="chevron-back" size={22} color="#0D132B" />
						</TouchableOpacity>
					</View>

					{/* Title Section */}
					<View className="w-full mb-2">
						<Text className="text-[30px] font-poppins-bold text-neutral-primary leading-[38px]">
							Welcome back
						</Text>
						<Text className="text-[15px] font-poppins-medium text-neutral-secondary mt-1">
							Sign in to continue your journey ⚡
						</Text>
					</View>

					{/* Waving Mascot & Sparkles Section */}
					<View className="w-full items-center justify-center relative h-[150px] my-2">
						{/* Left Sparkle (Orange) */}
						<View className="absolute left-[18%] top-[15%] z-10">
							<Ionicons name="sparkles" size={20} color="#FF8A00" />
						</View>

						{/* Mascot Image */}
						<Image
							source={images.mascotAuth}
							style={{ width: 130, height: 130 }}
							resizeMode="contain"
						/>

						{/* Right Sparkle 1 (Blue) */}
						<View className="absolute right-[20%] top-[10%] z-10">
							<Ionicons name="sparkles" size={18} color="#4D8BFF" />
						</View>

						{/* Right Sparkle 2 (Yellow) */}
						<View className="absolute right-[16%] bottom-[25%] z-10">
							<Ionicons name="sparkles" size={16} color="#FFC800" />
						</View>
					</View>

					{/* Form Fields Section */}
					<View className="w-full gap-4 mt-2">
						{/* Email Field Block */}
						<View
							className={`w-full bg-white border-2 rounded-2xl px-4 py-2.5 flex-col ${
								isEmailFocused ? "border-lingua-purple" : "border-neutral-border"
							}`}
						>
							<Text className="text-[11px] font-poppins-semibold text-neutral-secondary uppercase tracking-wider">
								Email
							</Text>
							<TextInput
								value={email}
								onChangeText={(value) => {
									setEmail(value);
									if (formError) setFormError("");
								}}
								placeholder="alex@gmail.com"
								placeholderTextColor="#9CA3AF"
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								onFocus={() => setIsEmailFocused(true)}
								onBlur={() => setIsEmailFocused(false)}
								style={styles.textInput}
							/>
						</View>

						{/* Password Field Block */}
						<View
							className={`w-full bg-white border-2 rounded-2xl px-4 py-2.5 flex-row items-center justify-between ${
								formError
									? "border-error"
									: isPasswordFocused
										? "border-lingua-purple"
										: "border-neutral-border"
							}`}
						>
							<View className="flex-1">
								<Text className="text-[11px] font-poppins-semibold text-neutral-secondary uppercase tracking-wider">
									Password
								</Text>
								<TextInput
									value={password}
									onChangeText={(value) => {
										setPassword(value);
										if (formError) setFormError("");
									}}
									placeholder="•••••••••"
									placeholderTextColor="#9CA3AF"
									secureTextEntry={!showPassword}
									autoCapitalize="none"
									autoCorrect={false}
									onFocus={() => setIsPasswordFocused(true)}
									onBlur={() => setIsPasswordFocused(false)}
									style={styles.textInput}
								/>
							</View>
							<TouchableOpacity
								activeOpacity={0.7}
								onPress={() => setShowPassword(!showPassword)}
								className="pl-2 py-1"
							>
								<Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#6B7280" />
							</TouchableOpacity>
						</View>

						{formError ? (
							<View className="-mt-2 flex-row items-start gap-1.5 px-1">
								<Ionicons name="alert-circle" size={16} color="#FF4D4D" />
								<Text className="flex-1 text-[12px] leading-[18px] font-poppins-semibold text-error">
									{formError}
								</Text>
							</View>
						) : null}
					</View>

					{/* Primary Sign In Button (Tactile style matching Duolingo) */}
					<TouchableOpacity
						activeOpacity={0.85}
						className="w-full bg-lingua-purple border-b-4 border-lingua-deep-purple rounded-2xl py-4 mt-6 items-center justify-center shadow-sm"
						onPress={handleSignIn}
					>
						<Text className="text-white text-center font-poppins-bold text-[16px] tracking-wider uppercase">
							Sign In
						</Text>
					</TouchableOpacity>

					{/* Divider Row */}
					<View className="w-full flex-row items-center my-6">
						<View className="flex-1 h-[1px] bg-neutral-border" />
						<Text className="mx-4 text-caption text-neutral-secondary font-poppins-semibold tracking-wide lowercase">
							or continue with
						</Text>
						<View className="flex-1 h-[1px] bg-neutral-border" />
					</View>

					{/* Social Logins Section */}
					<View className="w-full gap-3">
						{/* Google Login */}
						<TouchableOpacity
							activeOpacity={0.8}
							disabled={isSSOLoading}
							onPress={() => handleSSO("oauth_google")}
							className={`w-full bg-white border-2 border-b-4 border-neutral-border rounded-2xl py-3.5 flex-row items-center px-5 relative ${
								isSSOLoading ? "opacity-60" : ""
							}`}
						>
							<View className="absolute left-5 justify-center">
								<AntDesign name="google" size={18} color="#EA4335" />
							</View>
							<Text className="w-full text-center font-poppins-bold text-[14px] text-neutral-primary tracking-wide">
								Continue with Google
							</Text>
						</TouchableOpacity>

						{/* Facebook Login */}
						<TouchableOpacity
							activeOpacity={0.8}
							disabled={isSSOLoading}
							onPress={() => handleSSO("oauth_facebook")}
							className={`w-full bg-white border-2 border-b-4 border-neutral-border rounded-2xl py-3.5 flex-row items-center px-5 relative ${
								isSSOLoading ? "opacity-60" : ""
							}`}
						>
							<View className="absolute left-5 justify-center">
								<FontAwesome name="facebook" size={18} color="#1877F2" />
							</View>
							<Text className="w-full text-center font-poppins-bold text-[14px] text-neutral-primary tracking-wide">
								Continue with Facebook
							</Text>
						</TouchableOpacity>

						{/* Apple Login */}
						<TouchableOpacity
							activeOpacity={0.8}
							disabled={isSSOLoading}
							onPress={() => handleSSO("oauth_apple")}
							className={`w-full bg-white border-2 border-b-4 border-neutral-border rounded-2xl py-3.5 flex-row items-center px-5 relative ${
								isSSOLoading ? "opacity-60" : ""
							}`}
						>
							<View className="absolute left-5 justify-center">
								<FontAwesome name="apple" size={18} color="#000000" />
							</View>
							<Text className="w-full text-center font-poppins-bold text-[14px] text-neutral-primary tracking-wide">
								Continue with Apple
							</Text>
						</TouchableOpacity>
					</View>

					{/* Switch Footer Link */}
					<View className="w-full flex-row items-center justify-center mt-12 mb-4">
						<Text className="text-body-medium font-poppins-regular text-neutral-secondary">
							Don{"'"}t have an account?{" "}
						</Text>
						<TouchableOpacity onPress={() => router.push("/signup")}>
							<Text className="text-body-medium font-poppins-bold text-lingua-purple">Sign up</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

// StyleSheet utilized for components covered by React Native exception rules (SafeAreaView, KeyboardAvoidingView, ScrollView, TextInput)
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	keyboardView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 24,
		paddingBottom: 24,
		alignItems: "center",
	},
	textInput: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 15,
		color: "#0D132B",
		marginTop: Platform.OS === "android" ? -2 : 2,
		padding: 0,
		height: 22,
	},
});
