export const AVATARS = [
  { id: "goku", name: "Goku", src: "/avatars/goku.png" },
  { id: "vegeta", name: "Vegeta", src: "/avatars/vegeta.png" },
  { id: "gohan", name: "Gohan", src: "/avatars/gohan.png" },
  { id: "piccolo", name: "Piccolo", src: "/avatars/piccolo.png" },
  { id: "bulma", name: "Bulma", src: "/avatars/bulma.png" },
  { id: "krillin", name: "Krillin", src: "/avatars/krillin.png" },
  { id: "trunks", name: "Trunks", src: "/avatars/trunks.png" },
  { id: "freezer", name: "Freezer", src: "/avatars/freezer.png" },
  { id: "cell", name: "Cell", src: "/avatars/cell.png" },
  { id: "buu", name: "Majin Buu", src: "/avatars/buu.png" },
] as const;

export type Avatar = (typeof AVATARS)[number];
export type AvatarId = Avatar["id"];

export function getAvatar(id: string | null | undefined): Avatar | null {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}
