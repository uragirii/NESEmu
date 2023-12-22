
export const readFileAsBinary = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      const result = e.target?.result as ArrayBuffer;
      resolve(result);
    };

    fileReader.onerror = (e) => {
      console.log("error while reading file", e);
      reject(e.target?.error);
    };

    fileReader.readAsArrayBuffer(file);
  });
};
