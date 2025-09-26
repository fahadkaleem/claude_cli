# Theme System Guide

## Overview

The Alfred CLI uses a comprehensive theme system that allows users to customize all UI colors. Themes are defined in TypeScript and instantly applied across the entire application.

## Theme Structure

Each theme consists of:
- **name**: Internal identifier (kebab-case)
- **displayName**: User-facing name shown in the theme selector
- **colors**: 14 semantic color properties

## How to Add a New Theme

### Step 1: Update Theme Type

Edit `src/cli/ui/types.ts` and add your theme to the `ThemePreset` union type:

```typescript
export type ThemePreset =
	| 'tokyo-night'
	| 'synthwave-84'
	| 'forest-night'
	// ... existing themes ...
	| 'your-new-theme';  // Add this line
```

### Step 2: Add Theme Configuration

Edit `src/cli/ui/themes/config.ts` and add your theme to the `themes` object:

```typescript
export const themes: Record<ThemePreset, Theme> = {
	// ... existing themes ...

	'your-new-theme': {
		name: 'your-new-theme',
		displayName: 'Your New Theme',
		colors: {
			white: '#ffffff',
			black: '#000000',
			primary: '#00ff00',
			tool: '#00ffff',
			secondary: '#808080',
			success: '#00ff00',
			error: '#ff0000',
			info: '#0000ff',
			warning: '#ffff00',
			diffAdded: '#1e4d1e',
			diffRemoved: '#4d1e1e',
			diffAddedText: '#00ff00',
			diffRemovedText: '#ff0000',
		},
	},
};
```

### Step 3: Done!

- Run `npm run build`
- Your theme will automatically appear in the `/theme` selector
- No additional registration or configuration needed

## Color Properties Explained

### Core Colors
- **white**: Main content text color
- **black**: Background color (rarely used directly, terminal controls background)
- **primary**: Brand color, main highlights, selected items, important headings
- **tool**: Tool-related elements, special actions, secondary highlights

### Text Colors
- **secondary**: Dimmed text, labels, helper text, borders, disabled states

### Semantic State Colors
- **success**: Success messages, completed states (green variants)
- **error**: Error messages, failed states (red variants)
- **warning**: Warning messages, pending states (yellow/orange variants)
- **info**: Informational messages, hints (blue/cyan variants)

### Diff Colors (for code changes)
- **diffAdded**: Background color for added lines
- **diffRemoved**: Background color for removed lines
- **diffAddedText**: Text color for added content
- **diffRemovedText**: Text color for removed content

## Color Usage Guidelines

### Choose Colors That:
1. **Have good contrast** - Ensure text is readable against terminal backgrounds
2. **Work together** - Colors should complement each other
3. **Follow semantic meaning** - Green for success, red for errors, etc.
4. **Are accessible** - Consider color blindness (don't rely solely on red/green)

### Color Combinations

**Light themes** (light background terminals):
- Use darker colors for text
- white: dark gray/black (#2d2d2d)
- black: white/off-white (#fafafa)

**Dark themes** (dark background terminals):
- Use lighter colors for text
- white: light gray/white (#e0e0e0)
- black: dark gray/black (#1a1a1a)

## Updating Existing Themes

Simply edit the colors in `config.ts`:

```typescript
'tokyo-night': {
	name: 'tokyo-night',
	displayName: 'Tokyo Night',
	colors: {
		primary: '#bb9af7',  // Change this
		success: '#7AF778',  // Or this
		// ... update any colors
	},
},
```

Run `npm run build` and the changes take effect immediately.

## Where Colors Are Used

### UI Components
- **AppHeader**: primary (border, title), secondary (tips text)
- **Status**: info (border), success (provider/model), primary (theme name)
- **InputPrompt**: secondary (border, prompt), warning (hints)
- **SuggestionsDisplay**: primary (active item), secondary (inactive)
- **LoadingIndicator**: primary (spinner), secondary (text)
- **StatusBar**: error/success/warning (connection state)
- **MessageContent**: error (error messages)
- **ThemeSelector**: primary (border), secondary (instructions), info (help text)

### Tool Components
- **ToolMessage**: secondary/success/error (status colors)
- **TaskDisplay**: secondary (pending), warning (in-progress), success (completed), error (failed)

### How Themes Are Applied

All components use the `useTheme()` hook:

```typescript
import { useTheme } from '../hooks/useTheme.js';

export const MyComponent = () => {
  const { colors } = useTheme();

  return (
    <Text color={colors.primary}>Hello World</Text>
  );
};
```

The theme context automatically re-renders all components when the theme changes, providing instant visual feedback.

## Example Themes

### Dark Theme (High Contrast)
```typescript
'high-contrast-dark': {
	name: 'high-contrast-dark',
	displayName: 'High Contrast Dark',
	colors: {
		white: '#ffffff',
		black: '#000000',
		primary: '#00ffff',
		tool: '#ff00ff',
		secondary: '#808080',
		success: '#00ff00',
		error: '#ff0000',
		info: '#00ffff',
		warning: '#ffff00',
		diffAdded: '#003300',
		diffRemoved: '#330000',
		diffAddedText: '#00ff00',
		diffRemovedText: '#ff0000',
	},
},
```

### Light Theme (Soft Colors)
```typescript
'soft-light': {
	name: 'soft-light',
	displayName: 'Soft Light',
	colors: {
		white: '#2d2d2d',
		black: '#fafafa',
		primary: '#5c7cfa',
		tool: '#748ffc',
		secondary: '#868e96',
		success: '#51cf66',
		error: '#ff6b6b',
		info: '#339af0',
		warning: '#ffa94d',
		diffAdded: '#d3f9d8',
		diffRemoved: '#ffe3e3',
		diffAddedText: '#2b8a3e',
		diffRemovedText: '#c92a2a',
	},
},
```

### Monochrome Theme
```typescript
'monochrome': {
	name: 'monochrome',
	displayName: 'Monochrome',
	colors: {
		white: '#ffffff',
		black: '#000000',
		primary: '#ffffff',
		tool: '#cccccc',
		secondary: '#666666',
		success: '#aaaaaa',
		error: '#888888',
		info: '#999999',
		warning: '#bbbbbb',
		diffAdded: '#333333',
		diffRemoved: '#222222',
		diffAddedText: '#cccccc',
		diffRemovedText: '#777777',
	},
},
```

## Testing Your Theme

1. Build the project: `npm run build`
2. Run Alfred: `npm start`
3. Type `/theme` to open the theme selector
4. Navigate to your theme with arrow keys
5. See instant preview as you navigate
6. Press Enter to confirm or Esc to cancel

## Theme Best Practices

1. **Start with an existing theme** - Copy a similar theme and modify colors
2. **Test in both light and dark terminals** - Ensure readability
3. **Use consistent color brightness** - All colors should have similar contrast
4. **Name themes descriptively** - Users should understand the theme style from the name
5. **Follow color theory** - Use complementary or analogous colors
6. **Test with colorblind simulators** - Ensure accessibility

## Current Available Themes

1. Tokyo Night - Purple/blue dark theme
2. Synthwave '84 - Retro neon theme
3. Forest Night - Green/brown earthy theme
4. Material Ocean - Blue ocean theme
5. Sunset Glow - Orange/warm theme
6. Nord Frost - Cool blue/gray theme
7. Rosé Pine Dawn - Light pink theme
8. Neon Jungle - Bright green theme
9. Midnight Amethyst - Purple dark theme
10. Desert Mirage - Gold/warm theme
11. Cherry Blossom - Pink/soft theme
12. Electric Storm - Yellow/blue theme
13. Deep Sea - Dark blue theme
14. Volcanic Ash - Red/gray theme
15. Cyberpunk Mint - Green/mint theme

## Troubleshooting

**Theme not appearing in selector:**
- Check that you added it to the `ThemePreset` type in `types.ts`
- Verify the theme name matches exactly between `types.ts` and `config.ts`
- Run `npm run build` to compile changes

**Colors not applying:**
- Ensure all 14 color properties are defined
- Check hex color format is correct (#rrggbb)
- Verify components are using `useTheme()` hook

**Theme looks bad in terminal:**
- Test in different terminal emulators
- Adjust color brightness/contrast
- Consider terminal's default color scheme interference

## File Locations

- Theme types: `src/cli/ui/types.ts`
- Theme configurations: `src/cli/ui/themes/config.ts`
- Theme hook: `src/cli/ui/hooks/useTheme.ts`
- Theme selector: `src/cli/ui/components/ThemeSelector.tsx`

## Need Help?

- Look at existing themes in `config.ts` for examples
- Test theme changes immediately with `/theme` command
- Use a color picker tool to find complementary colors
- Check terminal compatibility with different color values