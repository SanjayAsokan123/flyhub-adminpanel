export const normalizeType = (type) => {
  const map = {
    drone: "Drone",
    drones: "Drone",
    part: "Part",
    parts: "Part",
    accessory: "Accessory",
    accessories: "Accessory",
    rental: "Rental",
    service: "Service",
  };

  return map[type?.toLowerCase()];
};
