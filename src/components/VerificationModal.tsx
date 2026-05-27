import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface VerificationModalProps {
	visible: boolean;
	onClose: () => void;
	onVerifySuccess: () => void;
	email: string;
}

export default function VerificationModal({
	visible,
	onClose,
	onVerifySuccess,
	email,
}: VerificationModalProps) {
	const [code, setCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [resendTimer, setResendTimer] = useState(59);
	const inputRef = useRef<TextInput>(null);

	// Reset code and auto-focus input when modal opens
	useEffect(() => {
		if (visible) {
			// Asynchronous setup to satisfy strict React Hooks linter
			const timer = setTimeout(() => {
				setCode("");
				setIsVerifying(false);
				setResendTimer(59);
				inputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [visible]);

	// Countdown timer for Resend code
	useEffect(() => {
		if (!visible || resendTimer === 0) return;

		const interval = setInterval(() => {
			setResendTimer((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [visible, resendTimer]);

	const handleResend = () => {
		if (resendTimer === 0) {
			setResendTimer(59);
			setCode("");
			inputRef.current?.focus();
		}
	};

	const renderDigitBox = (index: number) => {
		const isFilled = code.length > index;
		const isActive = code.length === index;
		const digit = code[index] || "";

		let borderClass = "border-neutral-border bg-neutral-surface";
		if (isActive) {
			borderClass = "border-lingua-purple bg-lingua-purple/5";
		} else if (isFilled) {
			borderClass = "border-neutral-primary bg-white";
		}

		if (code.length === 6) {
			borderClass = "border-success bg-success/5";
		}

		return (
			<View
				key={index}
				className={`w-12 h-14 border-2 rounded-2xl items-center justify-center relative ${borderClass}`}
			>
				<Text className="text-[22px] font-poppins-bold text-neutral-primary">{digit}</Text>
				{isActive && <View className="absolute bottom-3 w-4 h-1 bg-lingua-purple rounded-full" />}
			</View>
		);
	};

	return (
		<Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
			{/* Backdrop Overlay */}
			<TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop}>
				{/* Modal Container */}
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.keyboardContainer}
					pointerEvents="box-none"
				>
					{/* Modal Content Card */}
					<TouchableOpacity
						activeOpacity={1}
						onPress={(e) => e.stopPropagation()}
						className="w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 border-t border-neutral-border shadow-lg flex-col items-center justify-between"
						style={{
							maxHeight: Platform.OS === "ios" ? "60%" : "70%",
						}}
					>
						{/* Drag Indicator Bar */}
						<View className="w-12 h-1.5 bg-neutral-border rounded-full mb-4" />

						{/* Top Row with Close Button */}
						<View className="w-full flex-row justify-end absolute right-4 top-4 z-20">
							<TouchableOpacity
								onPress={onClose}
								className="p-1 rounded-full bg-neutral-surface border border-neutral-border"
							>
								<Ionicons name="close" size={20} color="#0D132B" />
							</TouchableOpacity>
						</View>

						{/* Icon / Mascot */}
						<View className="w-14 h-14 rounded-2xl bg-neutral-surface border border-neutral-border items-center justify-center mb-4">
							<Ionicons name="mail-open-outline" size={28} color="#6C4EF5" />
						</View>

						{/* Title & Subtitle */}
						<Text className="text-h2 text-neutral-primary font-poppins-bold text-center mb-2 px-2">
							Verify your email
						</Text>
						<Text className="text-body-medium text-neutral-secondary text-center px-4 leading-[22px] mb-6">
							We{"'"}ve sent a 6-digit verification code to{"\n"}
							<Text className="font-poppins-semibold text-neutral-primary">
								{email || "your email"}
							</Text>
						</Text>

						{/* Interactive Digit Boxes */}
						<TouchableOpacity
							activeOpacity={1}
							onPress={() => inputRef.current?.focus()}
							className="w-full flex-row justify-between px-2 mb-6"
						>
							{[0, 1, 2, 3, 4, 5].map((idx) => renderDigitBox(idx))}
						</TouchableOpacity>

						{/* Hidden Numeric TextInput */}
						<TextInput
							ref={inputRef}
							value={code}
							onChangeText={(text) => {
								// Keep only digits and up to 6 characters
								const sanitized = text.replace(/[^0-9]/g, "").slice(0, 6);
								setCode(sanitized);

								if (sanitized.length === 6) {
									setIsVerifying(true);
									Keyboard.dismiss();

									// Simulate network latency for verifying the OTP code
									setTimeout(() => {
										setIsVerifying(false);
										onVerifySuccess();
									}, 1200);
								}
							}}
							keyboardType="number-pad"
							maxLength={6}
							style={styles.hiddenInput}
							caretHidden={true}
						/>

						{/* Action Indicators / Status */}
						<View className="h-10 items-center justify-center mb-4">
							{isVerifying ? (
								<View className="flex-row items-center gap-2">
									<ActivityIndicator size="small" color="#6C4EF5" />
									<Text className="text-body-small font-poppins-medium text-neutral-secondary">
										Verifying code...
									</Text>
								</View>
							) : code.length === 6 ? (
								<View className="flex-row items-center gap-1.5">
									<Ionicons name="checkmark-circle" size={18} color="#21C16B" />
									<Text className="text-body-small font-poppins-semibold text-success">
										Code matched! Redirecting...
									</Text>
								</View>
							) : null}
						</View>

						{/* Resend Code Section */}
						<View className="flex-row items-center justify-center">
							<Text className="text-body-small font-poppins-regular text-neutral-secondary">
								Didn{"'"}t receive the code?{" "}
							</Text>
							<TouchableOpacity disabled={resendTimer > 0} onPress={handleResend}>
								<Text
									className={`text-body-small font-poppins-bold ${
										resendTimer > 0 ? "text-neutral-secondary" : "text-lingua-purple"
									}`}
								>
									{resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
								</Text>
							</TouchableOpacity>
						</View>
					</TouchableOpacity>
				</KeyboardAvoidingView>
			</TouchableOpacity>
		</Modal>
	);
}

// StyleSheet used for React Native exception components (SafeAreaView, KeyboardAvoidingView, Modal)
const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(13, 19, 43, 0.6)",
		justifyContent: "flex-end",
	},
	keyboardContainer: {
		width: "100%",
		justifyContent: "flex-end",
	},
	hiddenInput: {
		position: "absolute",
		width: 1,
		height: 1,
		opacity: 0,
	},
});
