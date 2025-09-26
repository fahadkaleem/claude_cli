import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {useTheme} from '../hooks/useTheme.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {themes} from '../themes/config.js';
import type {ThemePreset} from '../types.js';

interface ThemeSelectorProps {
	onThemeSelect: (theme: ThemePreset) => void;
	onCancel: () => void;
}

interface ThemeOption {
	label: string;
	value: ThemePreset;
}

export function ThemeSelector({
	onThemeSelect,
	onCancel,
}: ThemeSelectorProps) {
	const boxWidth = useTerminalWidth();
	const {colors, currentTheme, setCurrentTheme} = useTheme();
	const [originalTheme] = useState(currentTheme);
	const [currentIndex, setCurrentIndex] = useState(0);

	useInput((_, key) => {
		if (key.escape) {
			setCurrentTheme(originalTheme);
			onCancel();
		}
	});

	const themeOptions: ThemeOption[] = Object.values(themes).map(theme => ({
		label:
			theme.displayName + (theme.name === originalTheme ? ' (current)' : ''),
		value: theme.name as ThemePreset,
	}));

	useEffect(() => {
		const index = themeOptions.findIndex(
			option => option.value === originalTheme,
		);
		setCurrentIndex(index >= 0 ? index : 0);
	}, []);

	const handleSelect = (item: ThemeOption) => {
		onThemeSelect(item.value);
	};

	const handleHighlight = (item: ThemeOption) => {
		setCurrentTheme(item.value);
	};

	return (
		<Box
			borderStyle="round"
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
		>
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text color={colors.secondary}>
						Select a theme (current: {themes[currentTheme].displayName})
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text color={colors.secondary}>
						↑/↓ Navigate • Enter Select • Esc Cancel
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text color={colors.info}>
						The entire CLI will change as you navigate. Try it out!
					</Text>
				</Box>

				<SelectInput
					items={themeOptions}
					onSelect={handleSelect}
					onHighlight={handleHighlight}
				/>
			</Box>
		</Box>
	);
}