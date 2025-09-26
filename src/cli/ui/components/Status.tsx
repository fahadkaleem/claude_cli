import React, {memo, useEffect, useState} from 'react';
import {Text} from 'ink';
import {existsSync} from 'fs';

import {useTheme} from '../hooks/useTheme.js';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {themes} from '../themes/config.js';

const cwd = process.cwd();

export default memo(function Status({
	provider,
	model,
}: {
	provider: string;
	model: string;
}) {
	const boxWidth = useTerminalWidth();
	const {colors, currentTheme} = useTheme();
	const [agentsMdLoaded, setAgentsMdLoaded] = useState(false);

	useEffect(() => {
		setAgentsMdLoaded(existsSync(`${cwd}/AGENTS.md`));
	}, []);

	return (
		<TitledBox
			key={colors.primary}
			borderStyle="round"
			titles={['Status']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.info}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Text color={colors.info}>
				<Text bold={true}>CWD: </Text>
				{cwd}
			</Text>
			<Text color={colors.success}>
				<Text bold={true}>Provider: </Text>
				{provider}, <Text bold={true}>Model: </Text>
				{model}
			</Text>
			<Text color={colors.primary}>
				<Text bold={true}>Theme: </Text>
				{themes[currentTheme].displayName}
			</Text>
			{agentsMdLoaded ? (
				<Text color={colors.secondary} italic>
					<Text>↳ Using AGENTS.md. Project initialized</Text>
				</Text>
			) : (
				<Text color={colors.secondary} italic>
					↳ No AGENTS.md file found
				</Text>
			)}
		</TitledBox>
	);
});