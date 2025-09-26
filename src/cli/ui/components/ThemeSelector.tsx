import React, {useState} from 'react';
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

	const initialIndex = themeOptions.findIndex(
		option => option.value === originalTheme,
	);
	const safeInitialIndex = initialIndex >= 0 ? initialIndex : 0;

	const handleSelect = (item: ThemeOption) => {
		onThemeSelect(item.value);
	};

	const handleHighlight = (item: ThemeOption) => {
		setCurrentTheme(item.value);
	};

	const currentlyHighlightedTheme = themes[currentTheme];

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
				<Box marginBottom={1} flexDirection="row">
					<Box width="45%">
						<Text color={colors.secondary}>Select Theme</Text>
					</Box>
					<Box width="55%" paddingLeft={2}>
						<Text color={colors.secondary}>Color Palette</Text>
					</Box>
				</Box>

				<Box marginBottom={1}>
					<Text color={colors.secondary}>
						↑/↓ Navigate • Enter Select • Esc Cancel
					</Text>
				</Box>

				<Box flexDirection="row">
					<Box width="45%" flexDirection="column">
						<SelectInput
							items={themeOptions}
							onSelect={handleSelect}
							onHighlight={handleHighlight}
							initialIndex={safeInitialIndex}
						/>
					</Box>

					<Box width="55%" paddingLeft={2} flexDirection="column" borderStyle="single" borderColor={colors.secondary} paddingX={1} paddingY={1}>
						<Box>
							<Text color={currentlyHighlightedTheme.colors.primary}>██ Primary</Text>
						</Box>
						<Box>
							<Text color={currentlyHighlightedTheme.colors.secondary}>██ Secondary</Text>
						</Box>
						<Box>
							<Text color={currentlyHighlightedTheme.colors.tool}>██ Tool</Text>
						</Box>
						<Box>
							<Text color={currentlyHighlightedTheme.colors.info}>██ Info</Text>
						</Box>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}