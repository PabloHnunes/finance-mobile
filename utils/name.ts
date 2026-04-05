export function abbreviateName(firstName: string, lastName: string): string {
  const parts = lastName.trim().split(/\s+/);
  const abbreviated = parts
    .map((part, i) => (i === parts.length - 1 ? part : `${part[0]}.`))
    .join(' ');
  return `${firstName} ${abbreviated}`;
}

export function getInitials(firstName: string, lastName: string): string {
  const lastParts = lastName.trim().split(/\s+/);
  const lastInitial = lastParts[lastParts.length - 1]?.[0] ?? '';
  return `${firstName[0]}${lastInitial}`.toUpperCase();
}
