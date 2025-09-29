import React from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Box, Text} from 'ink';
import {useTheme} from '../hooks/useTheme.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(
	fs.readFileSync(path.join(__dirname, '../../../../package.json'), 'utf8'),
);

export const AppHeader: React.FC = () => {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();

	return (
		<>
			<Box justifyContent="center">
				<Gradient colors={[colors.primary, colors.tool]}>
					<BigText text="Alfred" font="tiny" />
				</Gradient>
			</Box>

			<TitledBox
				borderStyle="round"
				titles={[`cwd: ${process.cwd()}`]}
				titleStyles={titleStyles.pill}
				titleJustify="flex-start"
				width={boxWidth}
				borderColor={colors.info}
				paddingX={2}
				paddingY={1}
				flexDirection="column"
				marginBottom={1}
			>
				<Box paddingBottom={1}>
					<Text color={colors.white}>Welcome to Alfred, your AI project planning buddy...</Text>
				</Box>
				<Box paddingBottom={1} flexDirection="column">
					<Text color={colors.secondary}>
						1. Break down projects into tasks with natural language.
					</Text>
					<Text color={colors.secondary}>
						2. Get help with file analysis, code reviews, and planning.
					</Text>
					<Text color={colors.secondary}>
						3. Track progress and manage your development workflow.
					</Text>
					<Text color={colors.secondary}>
						4. Type /exit or press Ctrl+C to quit.
					</Text>
				</Box>
				<Text color={colors.white}>/help for help</Text>
			</TitledBox>
		</>
	);
};