import { z } from "zod";
import { reportWarning } from "./errorReporter";

/**
 * Reads a strongly-typed value from localStorage with runtime validation via Zod.
 * Returns the fallback value if the key does not exist, JSON parsing fails,
 * or validation against the schema fails.
 */
export function readLocalStorageWithSchema<DataType>(
  storageKey: string,
  schema: z.ZodType<DataType>,
  fallbackValue: DataType
): DataType {
  try {
    if (typeof localStorage === "undefined") {
      return fallbackValue;
    }

    const storedRawString = localStorage.getItem(storageKey);
    if (storedRawString === null) {
      return fallbackValue;
    }

    const parsedJsonData = JSON.parse(storedRawString);
    const validationResult = schema.safeParse(parsedJsonData);

    if (!validationResult.success) {
      reportWarning(
        `Failed schema validation for localStorage key "${storageKey}". Using fallback value.`,
        { storageKey },
        validationResult.error
      );
      return fallbackValue;
    }

    return validationResult.data;
  } catch (error) {
    reportWarning(
      `Error reading or parsing localStorage key "${storageKey}". Using fallback value.`,
      { storageKey },
      error
    );
    return fallbackValue;
  }
}

/**
 * Serializes and stores a value into localStorage safely.
 * Returns true on success or false if an error occurred (e.g. storage quota exceeded).
 */
export function writeLocalStorage<DataType>(storageKey: string, valueToStore: DataType): boolean {
  try {
    if (typeof localStorage === "undefined") {
      return false;
    }

    const serializedData = JSON.stringify(valueToStore);
    localStorage.setItem(storageKey, serializedData);
    return true;
  } catch (error) {
    reportWarning(
      `Failed to write value into localStorage key "${storageKey}".`,
      { storageKey },
      error
    );
    return false;
  }
}

/**
 * Removes a key from localStorage safely.
 */
export function removeLocalStorageItem(storageKey: string): boolean {
  try {
    if (typeof localStorage === "undefined") {
      return false;
    }

    localStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    reportWarning(`Failed to remove key "${storageKey}" from localStorage.`, { storageKey }, error);
    return false;
  }
}
