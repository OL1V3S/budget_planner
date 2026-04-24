export function normalizeText(value) {
    return (value || "").trim().toLowerCase();
  }
  
  export function displayText(value) {
    if (!value) return "";
  
    return value
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  
  export function isDefaultCategory(category, defaultCategories) {
    const normalized = (category || "").trim().toLowerCase();
    return defaultCategories.some(
      (c) => c.trim().toLowerCase() === normalized
    );
  }