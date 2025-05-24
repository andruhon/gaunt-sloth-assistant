/**
 * Checks if the output contains the expected content (case-insensitive)
 * @param output - The output to check
 * @param expectedContent - The content to look for
 * @returns True if the output contains the expected content, false otherwise
 */
export function checkOutputForExpectedContent(output: string, expectedContent: string): boolean {
  // Convert both to lowercase for case-insensitive comparison
  const lowerOutput = output.toLowerCase();
  const lowerExpected = expectedContent.toLowerCase();

  return lowerOutput.includes(lowerExpected);
}