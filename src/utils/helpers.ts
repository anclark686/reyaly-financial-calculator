export const formatDate = (dateString: string) => {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

export const findNextDueDate = (
  dueDate: string,
  frequency: "monthly" | "bi-weekly" | "every 30 days" | "one-time",
  baseDate: Date | undefined,
): string | null => {
  const date = new Date(dueDate + "T00:00:00");
  if (!baseDate) {
    baseDate = new Date();
  }
  baseDate.setHours(0, 0, 0, 0); // Set to midnight for accurate comparison
  console.log("baseDate:", baseDate);
  // If it's a one-time expense, return the original date
  if (frequency === "one-time") {
    return dueDate;
  }
  
  const nextDate = new Date(date);
  console.log("Starting with date:", nextDate.toISOString());
  console.log("Base date:", baseDate.toISOString());

  // Find the next occurrence after today
  while (nextDate <= baseDate) {
    console.log("Checking if", nextDate.toISOString(), "is before or equal to", baseDate.toISOString());
    console.log("Current nextDate:", nextDate.toDateString(), "Base date:", baseDate.toDateString());
        if (nextDate.toDateString() === baseDate.toDateString()) {
      break;
    }
    switch (frequency) {
      case "monthly":
        // Add 1 month (handles month rollover automatically)
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;

      case "bi-weekly":
        // Add 14 days
        nextDate.setDate(nextDate.getDate() + 14);
        break;

      case "every 30 days":
        // Add 30 days
        nextDate.setDate(nextDate.getDate() + 30);
        break;
    }
    console.log("After incrementing, date is:", nextDate.toISOString());

  }
  // Convert back to YYYY-MM-DD format
  console.log("Final date:", nextDate.toISOString().split("T")[0]);
  return nextDate.toISOString().split("T")[0];
};

export const getContrastColor = (hexColor: string): string => {
  // Remove the hash if it exists
  const color = hexColor.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate luminance using the formula: (0.299 * R + 0.587 * G + 0.114 * B)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white text for dark colors, black text for light colors
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
};
