export const getSignedInt = (val: number) => {
  // ik val is 8 bit
  return ~val + 255;
};
