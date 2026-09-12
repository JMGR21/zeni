export const SPHERE_COUNT = 7;

export function getSphereProgress(currentAmount: number, targetAmount: number): boolean[] {
  if (targetAmount <= 0) return Array(SPHERE_COUNT).fill(false);

  return Array.from({ length: SPHERE_COUNT }, (_, index) => {
    const sphereNumber = index + 1;
    return currentAmount >= (sphereNumber / SPHERE_COUNT) * targetAmount;
  });
}
