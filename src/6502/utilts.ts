/**
 * Returns the integer representation for 8 bit signed no.
 */
export const getSignedInt = (val: number) => {
  /**
   * This function needs some explaination.
   * JS stores int as 32 bit signed numbers, negative numbers are 2's complement, (which we want)
   * but the thing is, we are dealing with 8bit numbers stored as 32 bit numbers,
   * so , 0b1100_1001 which might be negative in 8bit is positive in 32 bit.
   * Ofc -1 or 0b111...1111 (32 1's). Hence we need to handle 2 different cases,
   * When number is 32 bit negative (JS negative value) and when number is 8 bit negative
   *
   */
  const eightBit = val & 0b1111_1111;
  // Now we can check the MSB for 2s complement and return it
  const msb = (eightBit & 0b1000_0000) >> 7;
  // as 8 bit no, msb is -2^7
  const msbValue = -(2 ** 7) * msb;

  const withoutMsb = eightBit & 0b0111_1111;
  return msbValue + withoutMsb;
};

export const delayHalt = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
