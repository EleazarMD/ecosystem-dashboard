import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDateTime = (dateString: string): string => {
  try {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return 'Invalid date';
    }
    return new Date(dateString).toLocaleString();
  } catch {
    return 'Invalid date';
  }
};
