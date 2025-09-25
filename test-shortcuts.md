# Testing Keyboard Shortcuts

## Test Plan for 3 Keyboard Shortcuts

### 1. ESC to Interrupt/Abort
- Start Alfred CLI: `npm start`
- Type a message and send it to trigger AI response
- While AI is processing (you'll see loading indicator), press ESC once
- Expected:
  - Should display "Operation aborted by user" in red
  - The loading should stop immediately
  - The partial AI response should NOT be added to the chat history
  - No assistant message should appear

### 2. Double ESC to Clear Input
- Type some text in the input field (don't submit)
- Press ESC once
- Expected: Should show "Press ESC again to clear input" hint
- Press ESC again within 500ms
- Expected: Input field should be cleared, hint should disappear

### 3. CMD+Delete (Mac) to Delete Word Backward
- Type multiple words in the input field (e.g., "hello world test")
- Press CMD+Delete on Mac (or CMD+Backspace)
- Expected: Should delete one word at a time from the end
- Example: "hello world test" → "hello world" → "hello" → ""

### 4. Ctrl+W to Delete Word Backward
- Type multiple words in the input field
- Press Ctrl+W
- Expected: Same as CMD+Delete - deletes one word at a time

## Additional Shortcuts Implemented

### 5. Ctrl+C to Clear Input
- Type some text
- Press Ctrl+C
- Expected: Input field should be cleared

### 6. Ctrl+L to Clear Screen/Chat
- Have some chat messages displayed
- Press Ctrl+L
- Expected: Chat history should be cleared

### 7. Ctrl+U to Clear Line (from cursor to beginning)
- Type some text
- Press Ctrl+U
- Expected: Currently clears entire input (will be improved with TextBuffer)

### 8. Ctrl+K to Clear Line (from cursor to end)
- Type some text
- Press Ctrl+K
- Expected: Currently clears entire input (will be improved with TextBuffer)

## Running the Test
```bash
# Start Alfred
npm start

# Test each shortcut as described above
```